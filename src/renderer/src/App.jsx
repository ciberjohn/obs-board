import { useEffect } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TitleBar from './components/TitleBar'
import PageTabs from './components/PageTabs'
import MacroGrid from './components/MacroGrid'
import Settings from './components/Settings'
import MacroEditor from './components/MacroEditor'
import { useStore } from './store'

export default function App() {
  const loadConfig = useStore((s) => s.loadConfig)
  const configLoaded = useStore((s) => s.configLoaded)
  const config = useStore((s) => s.config)
  const setOBSState = useStore((s) => s.setOBSState)
  const setUpdaterState = useStore((s) => s.setUpdaterState)
  const setUI = useStore((s) => s.setUI)
  const settingsOpen = useStore((s) => s.ui.settingsOpen)
  const editorOpen = useStore((s) => s.ui.editorOpen)

  // Initial load: config + platform + current app version
  useEffect(() => {
    const init = async () => {
      await loadConfig()
      const [platform, currentVersion] = await Promise.all([
        window.electronAPI.app.getPlatform(),
        window.electronAPI.updater.getVersion(),
      ])
      setUI({ platform })
      setUpdaterState({ currentVersion })

      // On first launch, open Settings → OBS tab so the user knows to configure
      // the WebSocket connection before anything else.
      const freshConfig = useStore.getState().config
      if (freshConfig?.firstRun !== false) {
        setUI({ settingsOpen: true, settingsTab: 0 })
        await window.electronAPI.config.set({ firstRun: false })
      }
    }
    init()
  }, [])

  // OBS event subscriptions + optional auto-connect (runs after config is loaded)
  useEffect(() => {
    if (!configLoaded || !config) return

    const cleanupConnection = window.electronAPI.obs.onConnectionChange((status) => {
      setOBSState({ connected: status.connected ?? false })
      if (!status.connected) {
        setOBSState({
          currentScene: null,
          scenes: [],
          inputs: [],
          streaming: false,
          recording: false,
        })
      }
    })

    const cleanupScene = window.electronAPI.obs.onSceneChange((sceneName) => {
      setOBSState({ currentScene: sceneName })
    })

    const cleanupStream = window.electronAPI.obs.onStreamStatusChange((status) => {
      if (status?.outputActive !== undefined) {
        setOBSState({ streaming: status.outputActive })
      }
      if (status?.recording !== undefined) {
        setOBSState({ recording: status.recording })
      }
    })

    if (config.obs.autoConnect) {
      window.electronAPI.obs
        .connect(config.obs.host, config.obs.port, config.obs.password)
        .then((result) => {
          if (result?.success) {
            setOBSState({ connected: true })
            return Promise.all([
              window.electronAPI.obs.getScenes(),
              window.electronAPI.obs.getInputList(),
            ])
          }
          return null
        })
        .then((results) => {
          if (!results) return
          const [scenesResult, inputsResult] = results
          setOBSState({
            scenes: scenesResult?.scenes ?? [],
            currentScene: scenesResult?.currentProgramSceneName ?? null,
            inputs: inputsResult?.inputs ?? [],
          })
        })
        .catch(() => {})
    }

    return () => {
      cleanupConnection()
      cleanupScene()
      cleanupStream()
    }
  }, [configLoaded])

  // Auto-updater event subscriptions
  useEffect(() => {
    const cleanups = [
      window.electronAPI.updater.onChecking(() => {
        setUpdaterState({ status: 'checking', error: null })
      }),
      window.electronAPI.updater.onAvailable((info) => {
        setUpdaterState({ status: 'available', info })
      }),
      window.electronAPI.updater.onNotAvailable(() => {
        setUpdaterState({ status: 'not-available' })
      }),
      window.electronAPI.updater.onProgress((progress) => {
        setUpdaterState({ status: 'downloading', progress })
      }),
      window.electronAPI.updater.onDownloaded((info) => {
        setUpdaterState({ status: 'downloaded', info, progress: null })
      }),
      window.electronAPI.updater.onError((msg) => {
        setUpdaterState({ status: 'error', error: msg })
      }),
    ]
    return () => cleanups.forEach((fn) => fn())
  }, [])

  if (!configLoaded) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" size={32} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <TitleBar />
      <PageTabs />
      <MacroGrid />
      {settingsOpen && <Settings />}
      {editorOpen && <MacroEditor />}
    </Box>
  )
}
