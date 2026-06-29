import { contextBridge, ipcRenderer } from 'electron'

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

    // Renderer-side event subscriptions — return cleanup functions
    onConnectionChange: (cb) => {
      const handler = (_, status) => cb(status)
      ipcRenderer.on('obs:connection-change', handler)
      return () => ipcRenderer.removeListener('obs:connection-change', handler)
    },
    onSceneChange: (cb) => {
      const handler = (_, name) => cb(name)
      ipcRenderer.on('obs:scene-change', handler)
      return () => ipcRenderer.removeListener('obs:scene-change', handler)
    },
    onStreamStatusChange: (cb) => {
      const handler = (_, status) => cb(status)
      ipcRenderer.on('obs:stream-status-change', handler)
      return () => ipcRenderer.removeListener('obs:stream-status-change', handler)
    },
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
    importConfig: () => ipcRenderer.invoke('config:import'),
    getDataPath: () => ipcRenderer.invoke('config:get-data-path'),
  },
})
