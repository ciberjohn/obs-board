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

// Module-level singleton — lazily initialised on first call to getStore().
let store = null

/**
 * electron-store v8 is ESM-only. Dynamic import() is preserved by esbuild
 * when the package is externalized, allowing it to be loaded from CJS output.
 */
async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store')
    store = new Store({ defaults: DEFAULT_CONFIG })
  }
  return store
}

/**
 * Returns the saved window state. Called during app startup before the
 * BrowserWindow is constructed.
 */
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

/**
 * Persists a partial window-state update.
 * Accepts any subset of { x, y, width, height, alwaysOnTop, opacity }.
 */
export async function saveWindowState(partial) {
  const s = await getStore()
  s.set('window', { ...s.get('window'), ...partial })
}

/**
 * Registers all config-related ipcMain handles and eagerly initialises the
 * store so the first renderer call never has to wait for the dynamic import.
 */
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

  // Accepts a partial object; electron-store.set(object) merges at the
  // top-level key granularity, leaving unmentioned keys untouched.
  ipcMain.handle('config:set', async (_, config) => {
    try {
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
      const imported = JSON.parse(raw)
      if (!imported.version) {
        return { success: false, error: 'Invalid config: missing version field' }
      }

      const s = await getStore()
      s.set(imported)
      return { success: true, config: s.store }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('config:get-data-path', () => {
    return app.getPath('userData')
  })
}
