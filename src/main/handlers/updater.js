import { ipcMain, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

let startupCheckTimer = null

export function setupUpdater(getWindow) {
  // Disable built-in logger — avoids writing update metadata to log files
  // that could be read by other processes.
  autoUpdater.logger = null
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const send = (channel, payload) => {
    getWindow()?.webContents.send(channel, payload)
  }

  autoUpdater.on('checking-for-update', () => send('updater:checking'))

  autoUpdater.on('update-available', (info) => {
    send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      // Emit only the text portion of release notes to prevent injecting
      // arbitrary HTML into the renderer.
      releaseNotes:
        typeof info.releaseNotes === 'string'
          ? info.releaseNotes.replace(/<[^>]*>/g, '').slice(0, 2000)
          : null,
    })
  })

  autoUpdater.on('update-not-available', () => send('updater:not-available'))

  autoUpdater.on('download-progress', (p) => {
    send('updater:progress', {
      percent: Math.round(p.percent),
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send('updater:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    send('updater:error', err.message)
  })

  // ── IPC handles ────────────────────────────────────────────────────────────

  ipcMain.handle('updater:get-version', () => app.getVersion())

  ipcMain.handle('updater:check', async () => {
    if (is.dev) {
      // In development there is no packaged update feed; notify renderer
      // immediately so the UI doesn't hang waiting.
      send('updater:not-available')
      return { dev: true }
    }
    try {
      return await autoUpdater.checkForUpdates()
    } catch (e) {
      send('updater:error', e.message)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // quitAndInstall(isSilent, isForceRunAfter)
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // ── Startup background check (30 s after launch) ───────────────────────────
  if (!is.dev) {
    startupCheckTimer = setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 30_000)
  }
}

export function teardownUpdater() {
  if (startupCheckTimer) {
    clearTimeout(startupCheckTimer)
    startupCheckTimer = null
  }
}
