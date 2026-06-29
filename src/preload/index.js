import { contextBridge, ipcRenderer } from 'electron'

// Helper: register a one-way push listener and return a cleanup function.
// Using a named reference (not an anonymous arrow) ensures removeListener
// can correctly identify and remove the exact handler added.
function onPush(channel, cb) {
  const handler = (_, payload) => cb(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Window controls ──────────────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    hide: () => ipcRenderer.invoke('window:hide'),
    quit: () => ipcRenderer.invoke('window:quit'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
    setOpacity: (opacity) => ipcRenderer.invoke('window:set-opacity', opacity),
    getState: () => ipcRenderer.invoke('window:get-state'),
  },

  // ── App info ─────────────────────────────────────────────────────────────
  app: {
    getPlatform: () => ipcRenderer.invoke('app:get-platform'),
    openUrl: (url) => ipcRenderer.invoke('app:open-url', url),
  },

  // ── OBS WebSocket v5 ─────────────────────────────────────────────────────
  obs: {
    connect: (host, port, password) =>
      ipcRenderer.invoke('obs:connect', { host, port, password }),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getScenes: () => ipcRenderer.invoke('obs:get-scenes'),
    setCurrentScene: (sceneName) => ipcRenderer.invoke('obs:set-scene', sceneName),
    getCurrentScene: () => ipcRenderer.invoke('obs:get-current-scene'),
    getInputList: () => ipcRenderer.invoke('obs:get-inputs'),
    toggleInputMute: (inputName) => ipcRenderer.invoke('obs:toggle-mute', inputName),
    startStream: () => ipcRenderer.invoke('obs:start-stream'),
    stopStream: () => ipcRenderer.invoke('obs:stop-stream'),
    startRecording: () => ipcRenderer.invoke('obs:start-recording'),
    stopRecording: () => ipcRenderer.invoke('obs:stop-recording'),
    getStreamStatus: () => ipcRenderer.invoke('obs:get-stream-status'),
    getRecordStatus: () => ipcRenderer.invoke('obs:get-record-status'),
    onConnectionChange: (cb) => onPush('obs:connection-change', cb),
    onSceneChange: (cb) => onPush('obs:scene-change', cb),
    onStreamStatusChange: (cb) => onPush('obs:stream-status-change', cb),
  },

  // ── Macro execution ───────────────────────────────────────────────────────
  // Supported action types:
  //   { type: 'obs_scene',           sceneName: string }
  //   { type: 'obs_toggle_mute',     inputName: string }
  //   { type: 'obs_start_stream' }
  //   { type: 'obs_stop_stream' }
  //   { type: 'obs_start_recording' }
  //   { type: 'obs_stop_recording' }
  //   { type: 'command',             win: string, mac: string, linux: string }
  //   { type: 'open_program',        win: string, mac: string, linux: string }
  //   { type: 'open_folder',         win: string, mac: string, linux: string }
  //   { type: 'open_url',            url: string }
  macro: {
    execute: (action) => ipcRenderer.invoke('macro:execute', action),
  },

  // ── Config / persistence ─────────────────────────────────────────────────
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config) => ipcRenderer.invoke('config:set', config),
    exportConfig: () => ipcRenderer.invoke('config:export'),
    // importConfig returns { success } | { requiresReview, commands, config } | { success: false, error }
    importConfig: () => ipcRenderer.invoke('config:import'),
    getDataPath: () => ipcRenderer.invoke('config:get-data-path'),
    // Opens the userData folder via shell.openPath — avoids file:// URL construction
    openDataFolder: () => ipcRenderer.invoke('config:open-data-folder'),
  },

  // ── Auto-updater ──────────────────────────────────────────────────────────
  updater: {
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onChecking: (cb) => onPush('updater:checking', cb),
    onAvailable: (cb) => onPush('updater:available', cb),
    onNotAvailable: (cb) => onPush('updater:not-available', cb),
    onProgress: (cb) => onPush('updater:progress', cb),
    onDownloaded: (cb) => onPush('updater:downloaded', cb),
    onError: (cb) => onPush('updater:error', cb),
  },
})
