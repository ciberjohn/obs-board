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
  const setUI = useStore((s) => s.setUI)
  const settingsOpen = useStore((s) => s.ui.settingsOpen)
  const editorOpen = useStore((s) => s.ui.editorOpen)

  // Initial load: config + platform
  useEffect(() => {
    const init = async () => {
      await loadConfig()
      const platform = await window.electronAPI.app.getPlatform()
      setUI({ platform })
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
