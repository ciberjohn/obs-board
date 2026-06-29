import { create } from 'zustand'

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const srcVal = source[key]
    const tgtVal = target[key]
    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal)
    } else {
      result[key] = srcVal
    }
  }
  return result
}

export const useStore = create((set, get) => ({
  // ── Config ─────────────────────────────────────────────────────────────────
  config: null,
  configLoaded: false,

  // ── OBS runtime state ──────────────────────────────────────────────────────
  obs: {
    connected: false,
    currentScene: null,
    scenes: [],
    inputs: [],
    streaming: false,
    recording: false,
  },

  // ── UI state ───────────────────────────────────────────────────────────────
  ui: {
    settingsOpen: false,
    settingsTab: 0,
    editorOpen: false,
    editorButton: null,
    editorPageId: null,
    editorPosition: null,
    activePage: 'default',
    platform: null,
  },

  // ── Actions ────────────────────────────────────────────────────────────────

  loadConfig: async () => {
    const config = await window.electronAPI.config.get()
    set((state) => ({
      config,
      configLoaded: true,
      ui: {
        ...state.ui,
        activePage: config.activePage || 'default',
      },
    }))
  },

  saveConfig: async (partial) => {
    const current = get().config
    const newConfig = deepMerge(current, partial)
    set({ config: newConfig })
    await window.electronAPI.config.set(newConfig)
  },

  setOBSState: (partial) => {
    set((state) => ({ obs: { ...state.obs, ...partial } }))
  },

  setUI: (partial) => {
    set((state) => ({ ui: { ...state.ui, ...partial } }))
  },

  addButton: (pageId, button) => {
    const config = get().config
    const pages = config.pages.map((p) => {
      if (p.id !== pageId) return p
      return { ...p, buttons: [...p.buttons, button] }
    })
    const newConfig = { ...config, pages }
    set({ config: newConfig })
    window.electronAPI.config.set(newConfig)
  },

  updateButton: (pageId, buttonId, partial) => {
    const config = get().config
    const pages = config.pages.map((p) => {
      if (p.id !== pageId) return p
      return {
        ...p,
        buttons: p.buttons.map((b) =>
          b.id === buttonId ? { ...b, ...partial } : b
        ),
      }
    })
    const newConfig = { ...config, pages }
    set({ config: newConfig })
    window.electronAPI.config.set(newConfig)
  },

  removeButton: (pageId, buttonId) => {
    const config = get().config
    const pages = config.pages.map((p) => {
      if (p.id !== pageId) return p
      return { ...p, buttons: p.buttons.filter((b) => b.id !== buttonId) }
    })
    const newConfig = { ...config, pages }
    set({ config: newConfig })
    window.electronAPI.config.set(newConfig)
  },

  addPage: () => {
    const config = get().config
    const id = crypto.randomUUID()
    const newPage = {
      id,
      name: `Page ${config.pages.length + 1}`,
      icon: '📄',
      grid: { cols: 4, rows: 2 },
      buttons: [],
    }
    const pages = [...config.pages, newPage]
    const newConfig = { ...config, pages, activePage: id }
    set((state) => ({
      config: newConfig,
      ui: { ...state.ui, activePage: id },
    }))
    window.electronAPI.config.set(newConfig)
  },

  updatePage: (pageId, partial) => {
    const config = get().config
    const pages = config.pages.map((p) =>
      p.id === pageId ? { ...p, ...partial } : p
    )
    const newConfig = { ...config, pages }
    set({ config: newConfig })
    window.electronAPI.config.set(newConfig)
  },

  removePage: (pageId) => {
    const config = get().config
    if (config.pages.length <= 1) return
    const pages = config.pages.filter((p) => p.id !== pageId)
    const currentActive = get().ui.activePage
    const activePage = currentActive === pageId ? pages[0].id : currentActive
    const newConfig = { ...config, pages, activePage }
    set((state) => ({
      config: newConfig,
      ui: { ...state.ui, activePage },
    }))
    window.electronAPI.config.set(newConfig)
  },
}))
