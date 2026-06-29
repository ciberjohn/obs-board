import { ipcMain, dialog, app } from 'electron'
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

const VALID_ACTION_TYPES = new Set([
  'obs_scene', 'obs_toggle_mute', 'obs_start_stream', 'obs_stop_stream',
  'obs_start_recording', 'obs_stop_recording', 'command', 'open_program',
  'open_folder', 'open_url'
])

// Validates the structure of an imported config to prevent a crafted JSON
// from injecting arbitrary action payloads that would later be executed.
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
        if (page.grid.cols !== undefined &&
            (typeof page.grid.cols !== 'number' || page.grid.cols < 1 || page.grid.cols > 10)) {
          return 'page.grid.cols must be a number between 1 and 10'
        }
        if (page.grid.rows !== undefined &&
            (typeof page.grid.rows !== 'number' || page.grid.rows < 1 || page.grid.rows > 10)) {
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

  return null // null = valid
}

// Module-level singleton — lazily initialised on first call to getStore().
let store = null

// electron-store v8 is ESM-only. Dynamic import() is preserved by esbuild
// when the package is externalized, allowing it to be loaded from CJS output.
async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store')
    store = new Store({ defaults: DEFAULT_CONFIG })
  }
  return store
}

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

// Persists a partial window-state update.
export async function saveWindowState(partial) {
  const s = await getStore()
  s.set('window', { ...s.get('window'), ...partial })
}

export async function setupConfigHandlers() {
  // Warm up the store before any IPC arrives.
  await getStore()

  ipcMain.handle('config:get', async () => {
    try {
      const s = await getStore()
      return s.store
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('config:set', async (_, config) => {
    try {
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { success: false, error: 'Config must be an object' }
      }
      const s = await getStore()
      s.set(config)
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
      // Serialise through JSON to strip any non-serialisable values before writing.
      writeFileSync(filePath, JSON.stringify(s.store, null, 2), 'utf8')
      return { success: true, path: filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

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

      // Re-serialise through JSON.stringify/parse to strip prototype-polluting
      // keys (__proto__, constructor) that JSON.parse can sometimes retain on
      // certain engine builds.
      const sanitised = JSON.parse(JSON.stringify(imported))

      const s = await getStore()
      s.set(sanitised)
      return { success: true, config: s.store }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('config:get-data-path', () => app.getPath('userData'))
}
