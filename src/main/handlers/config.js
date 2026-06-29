import { ipcMain, dialog, app, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'

const DEFAULT_CONFIG = {
  version: '1.0.0',
  obs: {
    host: 'localhost',
    port: 4455,
    password: '',
    autoConnect: false
  },
  window: {
    alwaysOnTop: true,
    opacity: 1.0,
    x: undefined,
    y: undefined,
    width: 480,
    height: 340
  },
  appearance: {
    accentColor: '#BB86FC',
    buttonRadius: 12,
    showLabels: true
  },
  pages: [
    {
      id: 'default',
      name: 'Main',
      icon: '🎮',
      grid: { cols: 4, rows: 2 },
      buttons: []
    }
  ],
  activePage: 'default'
}

// Only these top-level keys are accepted in config:set and config:import.
// Unknown keys written by a renderer-compromise or malicious import are silently dropped.
const ALLOWED_CONFIG_KEYS = new Set([
  'version', 'obs', 'window', 'appearance', 'pages', 'activePage'
])

const VALID_ACTION_TYPES = new Set([
  'obs_scene', 'obs_toggle_mute', 'obs_start_stream', 'obs_stop_stream',
  'obs_start_recording', 'obs_stop_recording', 'command', 'open_program',
  'open_folder', 'open_url'
])

// ── Schema validator ───────────────────────────────────────────────────────────

// Returns null if valid, or an error string.
function validateImportedConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return 'Config must be a JSON object'
  if (typeof cfg.version !== 'string') return 'Missing or invalid version field'

  if (cfg.pages !== undefined) {
    if (!Array.isArray(cfg.pages)) return 'pages must be an array'
    for (const page of cfg.pages) {
      if (!page || typeof page !== 'object') return 'Each page must be an object'
      if (typeof page.id !== 'string' || !page.id) return 'Each page must have a string id'
      if (page.grid !== undefined) {
        if (typeof page.grid !== 'object') return 'page.grid must be an object'
        const cols = page.grid.cols
        const rows = page.grid.rows
        if (cols !== undefined && (typeof cols !== 'number' || cols < 1 || cols > 10)) {
          return 'page.grid.cols must be a number between 1 and 10'
        }
        if (rows !== undefined && (typeof rows !== 'number' || rows < 1 || rows > 10)) {
          return 'page.grid.rows must be a number between 1 and 10'
        }
      }
      if (page.buttons !== undefined) {
        if (!Array.isArray(page.buttons)) return 'page.buttons must be an array'
        for (const btn of page.buttons) {
          if (!btn || typeof btn !== 'object') return 'Each button must be an object'
          if (!btn.action || typeof btn.action !== 'object') return 'Each button must have an action object'
          if (!VALID_ACTION_TYPES.has(btn.action.type)) {
            return `Unknown action type: ${btn.action.type}`
          }
        }
      }
    }
  }

  return null
}

// Strip top-level keys not in the allowlist and re-serialise through JSON to
// eliminate prototype-polluting keys (__proto__, constructor, prototype).
function sanitiseConfig(cfg) {
  const clean = {}
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (key in cfg) clean[key] = cfg[key]
  }
  return JSON.parse(JSON.stringify(clean))
}

// ── electron-store (ESM-only, lazy init) ──────────────────────────────────────

let store = null

async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store')
    store = new Store({ defaults: DEFAULT_CONFIG })
  }
  return store
}

// ── Exported helpers (called from main/index.js) ───────────────────────────────

export async function loadWindowState() {
  const s = await getStore()
  const w = s.get('window')
  return {
    x: w.x,
    y: w.y,
    width: w.width ?? 480,
    height: w.height ?? 340,
    alwaysOnTop: w.alwaysOnTop ?? true,
    opacity: w.opacity ?? 1.0
  }
}

export async function saveWindowState(partial) {
  const s = await getStore()
  s.set('window', { ...s.get('window'), ...partial })
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

export async function setupConfigHandlers() {
  await getStore()

  ipcMain.handle('config:get', async () => {
    try {
      const s = await getStore()
      return s.store
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Accepts a full or partial config; only allowed top-level keys are stored.
  ipcMain.handle('config:set', async (_, config) => {
    try {
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { success: false, error: 'Config must be an object' }
      }
      const s = await getStore()
      const sanitised = sanitiseConfig(config)
      s.set(sanitised)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('config:export', async () => {
    try {
      const s = await getStore()
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export OBS Board Config',
        defaultPath: 'obs-board-config.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      if (canceled || !filePath) return { success: false, error: 'Cancelled' }
      writeFileSync(filePath, JSON.stringify(s.store, null, 2), 'utf8')
      return { success: true, path: filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Two-stage import for configs containing 'command' type actions.
  //
  // Stage 1 (this handler): validate schema, collect shell commands for review.
  //   Returns { requiresReview: true, commands, config } — does NOT write to store.
  //   Returns { success: true }                          — safe config, already stored.
  //   Returns { success: false, error }                  — parse/validation failure.
  //
  // Stage 2 (renderer): show the commands to the user. If they confirm, call
  //   config:set with the returned config (already sanitised).
  ipcMain.handle('config:import', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import OBS Board Config',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (canceled || !filePaths.length) return { success: false, error: 'Cancelled' }

      const raw = readFileSync(filePaths[0], 'utf8')
      let imported
      try {
        imported = JSON.parse(raw)
      } catch {
        return { success: false, error: 'File is not valid JSON' }
      }

      const validationError = validateImportedConfig(imported)
      if (validationError) {
        return { success: false, error: `Invalid config: ${validationError}` }
      }

      const sanitised = sanitiseConfig(imported)

      // Force autoConnect off: a malicious config could set obs.host to an
      // attacker-controlled server and autoConnect:true to silently steal the
      // OBS password on next launch before the user reviews the import.
      if (sanitised.obs && typeof sanitised.obs === 'object') {
        sanitised.obs.autoConnect = false
      }

      // Collect shell command strings for mandatory user review.
      const commandActions = []
      for (const page of sanitised.pages ?? []) {
        for (const btn of page.buttons ?? []) {
          if (btn?.action?.type === 'command') {
            commandActions.push({
              label: String(btn.label ?? 'Unnamed').slice(0, 100),
              win:   String(btn.action.win   ?? '').slice(0, 500),
              mac:   String(btn.action.mac   ?? '').slice(0, 500),
              linux: String(btn.action.linux ?? '').slice(0, 500),
            })
          }
        }
      }

      if (commandActions.length > 0) {
        // Return to renderer WITHOUT writing to store.
        // The renderer must show the commands and confirm before calling config:set.
        return { requiresReview: true, commands: commandActions, config: sanitised }
      }

      // No shell commands — safe to store immediately.
      const s = await getStore()
      s.set(sanitised)
      return { success: true, config: s.store }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('config:get-data-path', () => app.getPath('userData'))

  // Dedicated handler for opening the data folder so Settings.jsx does not
  // need to construct a file:// URL (which would be blocked by the scheme
  // whitelist on app:open-url).
  ipcMain.handle('config:open-data-folder', async () => {
    try {
      const err = await shell.openPath(app.getPath('userData'))
      if (err) return { success: false, error: err }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}
