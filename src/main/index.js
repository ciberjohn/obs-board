import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupOBSHandlers } from './handlers/obs.js'
import { setupMacroHandlers } from './handlers/macros.js'
import { setupConfigHandlers, loadWindowState, saveWindowState } from './handlers/config.js'
import { setupUpdater } from './handlers/updater.js'

let mainWindow = null
let tray = null
let saveStateTimer = null

// ── Window state persistence ───────────────────────────────────────────────────

/**
 * Debounce window-state writes so rapid resize/move events don't hammer disk.
 */
function debouncedSaveState(partial) {
  clearTimeout(saveStateTimer)
  saveStateTimer = setTimeout(() => saveWindowState(partial), 500)
}

// ── BrowserWindow ──────────────────────────────────────────────────────────────

async function createWindow() {
  const state = await loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(state.x !== undefined && state.y !== undefined
      ? { x: state.x, y: state.y }
      : {}),
    minWidth: 280,
    minHeight: 220,
    frame: false,
    transparent: false,
    backgroundColor: '#1C1B1F',
    alwaysOnTop: state.alwaysOnTop,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: true is safe here — preload only uses contextBridge + ipcRenderer,
      // both of which are available in the sandboxed context.
      sandbox: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  mainWindow.setOpacity(state.opacity)

  // Show only once the renderer is ready to avoid a blank-frame flash.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('resize', () => {
    debouncedSaveState(mainWindow.getBounds())
  })

  mainWindow.on('move', () => {
    debouncedSaveState(mainWindow.getBounds())
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── System tray ────────────────────────────────────────────────────────────────

function createTray() {
  // No icon asset required — nativeImage.createEmpty() satisfies the API.
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('OBS Board')
  refreshTrayMenu()

  // Single-click toggles window visibility on all platforms.
  tray.on('click', () => {
    if (!mainWindow) return
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

/**
 * Rebuilds the tray context menu to reflect current always-on-top state.
 * Must be called whenever that state changes.
 */
function refreshTrayMenu() {
  if (!tray) return
  const alwaysOnTop = mainWindow ? mainWindow.isAlwaysOnTop() : true

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) mainWindow.show()
      }
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: alwaysOnTop,
      click: (item) => {
        if (!mainWindow) return
        mainWindow.setAlwaysOnTop(item.checked)
        saveWindowState({ alwaysOnTop: item.checked })
        // No need to call refreshTrayMenu — the checkbox item updates itself.
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(menu)
}

// ── IPC handles ────────────────────────────────────────────────────────────────

function registerWindowHandlers() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:hide', () => {
    mainWindow?.hide()
  })

  ipcMain.handle('window:quit', () => {
    app.quit()
  })

  ipcMain.handle('window:toggle-always-on-top', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(next)
    saveWindowState({ alwaysOnTop: next })
    refreshTrayMenu()
    return next
  })

  ipcMain.handle('window:set-opacity', (_, opacity) => {
    const clamped = Math.min(1.0, Math.max(0.3, Number(opacity)))
    if (mainWindow) mainWindow.setOpacity(clamped)
    saveWindowState({ opacity: clamped })
  })

  ipcMain.handle('window:get-state', () => {
    if (!mainWindow) return { alwaysOnTop: true, opacity: 1.0 }
    return {
      alwaysOnTop: mainWindow.isAlwaysOnTop(),
      opacity: mainWindow.getOpacity()
    }
  })

  ipcMain.handle('app:get-platform', () => process.platform)

  // Only http/https is permitted. file://, javascript:, and custom protocol
  // handlers can trigger code execution or credential leakage (NTLM via smb://).
  ipcMain.handle('app:open-url', (_, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return { success: false, error: 'Only http and https URLs are permitted' }
    }
    return shell.openExternal(url)
  })
}

// ── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Window handles first — they must be registered before createWindow()
  // because the renderer may invoke them during its initial load.
  registerWindowHandlers()

  // Config store must be ready before the window attempts to read state.
  await setupConfigHandlers()

  await createWindow()
  createTray()

  // OBS and macro handlers are registered after the window exists so that
  // setupOBSHandlers can capture the getWindow closure.
  setupOBSHandlers(() => mainWindow)
  setupMacroHandlers()
  setupUpdater(() => mainWindow)

  // macOS: re-create the window when the dock icon is clicked and no windows
  // are open.
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS the app conventionally remains active in the tray until the
  // user explicitly quits via the tray menu.
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
