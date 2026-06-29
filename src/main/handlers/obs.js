import { ipcMain } from 'electron'
import OBSWebSocket from 'obs-websocket-js'

const obs = new OBSWebSocket()

// RFC-1123 hostname + bare IPv4 + IPv6-in-brackets. Prevents URL injection
// (e.g. host = "localhost:4455/evil") which would corrupt the ws:// URL.
const VALID_HOST = /^(\[[\da-fA-F:]+\]|[\da-zA-Z0-9][\da-zA-Z0-9\-\.]{0,251}[\da-zA-Z0-9]|[\da-zA-Z0-9])$/

/**
 * Returns the shared OBSWebSocket singleton so other modules (e.g. macros)
 * can call obs.call() without re-importing the connection state.
 */
export function getOBS() {
  return obs
}

/**
 * Register all OBS-related ipcMain handles and wire up OBS event subscriptions
 * that push state changes to the renderer.
 *
 * @param {() => Electron.BrowserWindow | null} getWindow
 */
export function setupOBSHandlers(getWindow) {
  // ── Push events → renderer ─────────────────────────────────────────────────

  obs.on('CurrentProgramSceneChanged', (data) => {
    getWindow()?.webContents.send('obs:scene-change', data.sceneName)
  })

  obs.on('ConnectionClosed', () => {
    getWindow()?.webContents.send('obs:connection-change', { connected: false })
  })

  obs.on('ConnectionOpened', () => {
    getWindow()?.webContents.send('obs:connection-change', { connected: true })
  })

  obs.on('StreamStateChanged', (data) => {
    getWindow()?.webContents.send('obs:stream-status-change', {
      active: data.outputActive,
      state: data.outputState
    })
  })

  // ── IPC handles ────────────────────────────────────────────────────────────

  ipcMain.handle('obs:connect', async (_, { host, port, password }) => {
    try {
      // Validate host format to prevent WebSocket URL injection. A malicious
      // imported config could set obs.host to "localhost:4455/evil" or an
      // attacker-controlled server to steal the OBS password.
      const safeHost = String(host ?? 'localhost').slice(0, 253)
      if (!VALID_HOST.test(safeHost)) {
        return { success: false, error: 'Invalid host format' }
      }

      const safePort = Math.trunc(Number(port ?? 4455))
      if (!Number.isFinite(safePort) || safePort < 1 || safePort > 65535) {
        return { success: false, error: 'Invalid port — must be 1–65535' }
      }

      if (typeof password !== 'string') {
        return { success: false, error: 'Password must be a string' }
      }

      await obs.connect(`ws://${safeHost}:${safePort}`, password)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:disconnect', async () => {
    try {
      await obs.disconnect()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:get-scenes', async () => {
    try {
      const { scenes, currentProgramSceneName } = await obs.call('GetSceneList')
      return { scenes, currentProgramSceneName }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:set-scene', async (_, sceneName) => {
    try {
      await obs.call('SetCurrentProgramScene', { sceneName })
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:get-current-scene', async () => {
    try {
      return await obs.call('GetCurrentProgramScene')
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:get-inputs', async () => {
    try {
      const { inputs } = await obs.call('GetInputList')
      return { inputs }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:toggle-mute', async (_, inputName) => {
    try {
      return await obs.call('ToggleInputMute', { inputName })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:start-stream', async () => {
    try {
      await obs.call('StartStream')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:stop-stream', async () => {
    try {
      await obs.call('StopStream')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:start-recording', async () => {
    try {
      await obs.call('StartRecord')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:stop-recording', async () => {
    try {
      await obs.call('StopRecord')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:get-stream-status', async () => {
    try {
      return await obs.call('GetStreamStatus')
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('obs:get-record-status', async () => {
    try {
      return await obs.call('GetRecordStatus')
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}
