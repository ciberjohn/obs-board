import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Slider from '@mui/material/Slider'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import LinkIcon from '@mui/icons-material/Link'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useStore } from '../store'

function TabPanel({ children, value, index }) {
  return (
    <Box
      hidden={value !== index}
      sx={{ px: 2, py: 2, display: value === index ? 'block' : 'none' }}
    >
      {children}
    </Box>
  )
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1.5 }}
    >
      {children}
    </Typography>
  )
}

export default function Settings() {
  const config = useStore((s) => s.config)
  const obsState = useStore((s) => s.obs)
  const updater = useStore((s) => s.updater)
  const setUI = useStore((s) => s.setUI)
  const saveConfig = useStore((s) => s.saveConfig)
  const setOBSState = useStore((s) => s.setOBSState)
  const updatePage = useStore((s) => s.updatePage)
  const settingsTab = useStore((s) => s.ui.settingsTab) ?? 0
  const activePage = useStore((s) => s.ui.activePage)

  const [tab, setTab] = useState(settingsTab)
  const [obsFields, setObsFields] = useState({
    host: config?.obs?.host ?? 'localhost',
    port: String(config?.obs?.port ?? 4455),
    password: config?.obs?.password ?? '',
  })
  const [obsStatus, setObsStatus] = useState(null) // null | 'connecting' | 'success' | 'error'
  const [obsError, setObsError] = useState('')
  const [dataPath, setDataPath] = useState('')

  useEffect(() => {
    window.electronAPI.config.getDataPath().then(setDataPath).catch(() => {})
  }, [])

  useEffect(() => {
    setTab(settingsTab)
  }, [settingsTab])

  const handleClose = () => setUI({ settingsOpen: false, settingsTab: 0 })

  // ── OBS ────────────────────────────────────────────────────────────────────

  const handleOBSConnect = async () => {
    setObsStatus('connecting')
    setObsError('')
    try {
      const result = await window.electronAPI.obs.connect(
        obsFields.host,
        Number(obsFields.port),
        obsFields.password
      )
      if (result?.success) {
        setObsStatus('success')
        setOBSState({ connected: true })
        saveConfig({
          obs: {
            host: obsFields.host,
            port: Number(obsFields.port),
            password: obsFields.password,
          },
        })
        const [scenesResult, inputsResult] = await Promise.all([
          window.electronAPI.obs.getScenes(),
          window.electronAPI.obs.getInputList(),
        ])
        setOBSState({
          scenes: scenesResult?.scenes ?? [],
          currentScene: scenesResult?.currentProgramSceneName ?? null,
          inputs: inputsResult?.inputs ?? [],
        })
      } else {
        setObsStatus('error')
        setObsError(result?.error ?? 'Connection failed')
      }
    } catch (err) {
      setObsStatus('error')
      setObsError(err?.message ?? 'Connection failed')
    }
  }

  const handleOBSDisconnect = async () => {
    await window.electronAPI.obs.disconnect().catch(() => {})
    setOBSState({
      connected: false,
      currentScene: null,
      scenes: [],
      inputs: [],
      streaming: false,
      recording: false,
    })
    setObsStatus(null)
  }

  // ── Appearance ─────────────────────────────────────────────────────────────

  const handleAccentColor = (e) => {
    saveConfig({ appearance: { accentColor: e.target.value } })
  }

  const handleButtonRadius = (_, val) => {
    saveConfig({ appearance: { buttonRadius: val } })
  }

  const handleShowLabels = (e) => {
    saveConfig({ appearance: { showLabels: e.target.checked } })
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

  const activePg = config?.pages?.find((p) => p.id === activePage)

  const handleGridCols = (_, val) => {
    if (!activePg) return
    updatePage(activePg.id, { grid: { ...activePg.grid, cols: val } })
  }

  const handleGridRows = (_, val) => {
    if (!activePg) return
    updatePage(activePg.id, { grid: { ...activePg.grid, rows: val } })
  }

  // ── Window ─────────────────────────────────────────────────────────────────

  const handleAlwaysOnTop = async (e) => {
    const val = e.target.checked
    saveConfig({ window: { alwaysOnTop: val } })
    await window.electronAPI.window.toggleAlwaysOnTop().catch(() => {})
  }

  const handleOpacity = async (_, val) => {
    saveConfig({ window: { opacity: val } })
    await window.electronAPI.window.setOpacity(val).catch(() => {})
  }

  // ── Backup ─────────────────────────────────────────────────────────────────

  const handleExport = () => window.electronAPI.config.exportConfig()
  const handleImport = () => window.electronAPI.config.importConfig()

  const handleOpenDataFolder = () => {
    if (dataPath) window.electronAPI.app.openUrl(`file://${dataPath}`)
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        bgcolor: 'background.paper',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1200,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.45)',
        animation: 'slideInSettings 0.2s ease-out',
        '@keyframes slideInSettings': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} fontSize={15}>
          Settings
        </Typography>
        <IconButton size="small" onClick={handleClose} title="Close settings">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontSize: 12, minWidth: 56, px: 1, minHeight: 40 } }}
        >
          <Tab label="OBS" />
          <Tab label="Look" />
          <Tab label="Grid" />
          <Tab label="Window" />
          <Tab label="Backup" />
          <Tab
            label="Updates"
            iconPosition="end"
            icon={
              (updater.status === 'available' || updater.status === 'downloaded') ? (
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: updater.status === 'downloaded' ? 'success.main' : 'warning.main',
                    flexShrink: 0,
                  }}
                />
              ) : null
            }
          />
        </Tabs>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>

        {/* ── Tab 0: OBS Connection ── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <SectionLabel>OBS WebSocket</SectionLabel>

            <TextField
              size="small"
              fullWidth
              label="Host"
              value={obsFields.host}
              onChange={(e) =>
                setObsFields((f) => ({ ...f, host: e.target.value }))
              }
              disabled={obsState.connected}
            />
            <TextField
              size="small"
              fullWidth
              label="Port"
              type="number"
              value={obsFields.port}
              onChange={(e) =>
                setObsFields((f) => ({ ...f, port: e.target.value }))
              }
              disabled={obsState.connected}
            />
            <TextField
              size="small"
              fullWidth
              label="Password"
              type="password"
              value={obsFields.password}
              onChange={(e) =>
                setObsFields((f) => ({ ...f, password: e.target.value }))
              }
              disabled={obsState.connected}
              autoComplete="new-password"
            />

            {obsStatus === 'error' && (
              <Alert severity="error" sx={{ fontSize: 12, py: 0.5 }}>
                {obsError}
              </Alert>
            )}
            {obsStatus === 'success' && (
              <Alert severity="success" sx={{ fontSize: 12, py: 0.5 }}>
                Connected successfully
              </Alert>
            )}

            {!obsState.connected ? (
              <Button
                variant="contained"
                fullWidth
                startIcon={<LinkIcon />}
                onClick={handleOBSConnect}
                disabled={obsStatus === 'connecting'}
              >
                {obsStatus === 'connecting' ? 'Connecting…' : 'Connect'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<LinkOffIcon />}
                onClick={handleOBSDisconnect}
              >
                Disconnect
              </Button>
            )}

            <Divider sx={{ my: 0.5 }} />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config?.obs?.autoConnect ?? false}
                  onChange={(e) =>
                    saveConfig({ obs: { autoConnect: e.target.checked } })
                  }
                />
              }
              label={
                <Typography variant="body2">Auto-connect on launch</Typography>
              }
            />
          </Box>
        </TabPanel>

        {/* ── Tab 1: Appearance ── */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <SectionLabel>Colours</SectionLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="label"
                  sx={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 28,
                      borderRadius: 1,
                      bgcolor: config?.appearance?.accentColor ?? '#BB86FC',
                      border: '2px solid rgba(255,255,255,0.2)',
                    }}
                  />
                  <input
                    type="color"
                    value={config?.appearance?.accentColor ?? '#BB86FC'}
                    onChange={handleAccentColor}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '1px',
                      height: '1px',
                      overflow: 'hidden',
                      clip: 'rect(0 0 0 0)',
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2">Accent colour</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {config?.appearance?.accentColor ?? '#BB86FC'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider />

            <Box>
              <SectionLabel>Buttons</SectionLabel>
              <Typography variant="caption" color="text.secondary">
                Corner radius: {config?.appearance?.buttonRadius ?? 12}px
              </Typography>
              <Slider
                size="small"
                min={8}
                max={24}
                value={config?.appearance?.buttonRadius ?? 12}
                onChange={handleButtonRadius}
                sx={{ mt: 1, mb: 0.5 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config?.appearance?.showLabels ?? true}
                    onChange={handleShowLabels}
                  />
                }
                label={
                  <Typography variant="body2">Show labels</Typography>
                }
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab 2: Grid ── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>
              Applies to: <strong>{activePg?.name ?? '—'}</strong>
            </Alert>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Columns: {activePg?.grid?.cols ?? 4}
              </Typography>
              <Slider
                size="small"
                min={2}
                max={6}
                marks
                value={activePg?.grid?.cols ?? 4}
                onChange={handleGridCols}
                sx={{ mt: 1 }}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Rows: {activePg?.grid?.rows ?? 2}
              </Typography>
              <Slider
                size="small"
                min={1}
                max={5}
                marks
                value={activePg?.grid?.rows ?? 2}
                onChange={handleGridRows}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab 3: Window ── */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config?.window?.alwaysOnTop ?? true}
                  onChange={handleAlwaysOnTop}
                />
              }
              label={<Typography variant="body2">Always on top</Typography>}
            />

            <Box>
              <Typography variant="caption" color="text.secondary">
                Opacity: {Math.round((config?.window?.opacity ?? 1) * 100)}%
              </Typography>
              <Slider
                size="small"
                min={0.2}
                max={1}
                step={0.05}
                value={config?.window?.opacity ?? 1}
                onChange={handleOpacity}
                sx={{ mt: 1 }}
              />
            </Box>

            <Divider />

            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.04)',
                borderRadius: 1,
                px: 1.5,
                py: 1.25,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Window size
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                {config?.window?.width ?? 480} × {config?.window?.height ?? 340} px
              </Typography>
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab 4: Backup ── */}
        <TabPanel value={tab} index={4}>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
            >
              Export config
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FileUploadIcon />}
              onClick={handleImport}
            >
              Import config
            </Button>

            <Divider sx={{ my: 0.5 }} />

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75 }}
              >
                Data folder
              </Typography>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.04)',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    flex: 1,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    color: 'text.secondary',
                    lineHeight: 1.5,
                  }}
                >
                  {dataPath || 'Loading…'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleOpenDataFolder}
                  disabled={!dataPath}
                  title="Open folder"
                  sx={{ flexShrink: 0, mt: -0.25 }}
                >
                  <FolderOpenIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab 5: Updates ── */}
        <TabPanel value={tab} index={5}>
          <UpdatesTab updater={updater} />
        </TabPanel>
      </Box>
    </Box>
  )
}

// ── Updates tab (isolated component to keep Settings readable) ──────────────

function UpdatesTab({ updater }) {
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleCheck = async () => {
    setChecking(true)
    try {
      await window.electronAPI.updater.check()
    } finally {
      setChecking(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await window.electronAPI.updater.download()
    } catch {
      setDownloading(false)
    }
  }

  const handleInstall = () => {
    window.electronAPI.updater.install()
  }

  const statusLabel = {
    idle: null,
    checking: 'Checking for updates…',
    'not-available': 'You are on the latest version.',
    available: null,
    downloading: null,
    downloaded: null,
    error: null,
  }[updater.status]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Current version */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'rgba(255,255,255,0.04)',
          borderRadius: 1,
          px: 1.5,
          py: 1.25,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Current version
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.25 }}>
            v{updater.currentVersion ?? '—'}
          </Typography>
        </Box>
        {updater.status === 'not-available' && (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
            label="Up to date"
            color="success"
            variant="outlined"
            sx={{ fontSize: 11 }}
          />
        )}
      </Box>

      {/* Status messages */}
      {statusLabel && (
        <Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>
          {statusLabel}
        </Alert>
      )}

      {updater.status === 'error' && (
        <Alert severity="error" sx={{ fontSize: 12, py: 0.5 }}>
          {updater.error ?? 'Update check failed'}
        </Alert>
      )}

      {/* New version available */}
      {(updater.status === 'available' || updater.status === 'downloading' || updater.status === 'downloaded') && updater.info && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: updater.status === 'downloaded' ? 'success.main' : 'primary.main',
            borderRadius: 1.5,
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SystemUpdateAltIcon
              sx={{
                fontSize: 18,
                color: updater.status === 'downloaded' ? 'success.main' : 'primary.main',
              }}
            />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                v{updater.info.version} available
              </Typography>
              {updater.info.releaseDate && (
                <Typography variant="caption" color="text.secondary">
                  Released {new Date(updater.info.releaseDate).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Box>

          {updater.info.releaseNotes && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                maxHeight: 80,
                overflowY: 'auto',
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 1,
                p: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                scrollbarWidth: 'thin',
              }}
            >
              {updater.info.releaseNotes}
            </Typography>
          )}
        </Box>
      )}

      {/* Download progress */}
      {updater.status === 'downloading' && updater.progress && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Downloading…
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {updater.progress.percent}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={updater.progress.percent ?? 0}
            sx={{ borderRadius: 4, height: 6 }}
          />
          <Typography variant="caption" color="text.secondary">
            {formatBytes(updater.progress.transferred)} / {formatBytes(updater.progress.total)}
          </Typography>
        </Box>
      )}

      {/* Action buttons */}
      {updater.status === 'downloaded' ? (
        <Button
          variant="contained"
          color="success"
          fullWidth
          startIcon={<SystemUpdateAltIcon />}
          onClick={handleInstall}
        >
          Restart &amp; Install v{updater.info?.version}
        </Button>
      ) : updater.status === 'available' ? (
        <Button
          variant="contained"
          fullWidth
          startIcon={<SystemUpdateAltIcon />}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Starting download…' : 'Download update'}
        </Button>
      ) : (
        <Button
          variant="outlined"
          fullWidth
          onClick={handleCheck}
          disabled={checking || updater.status === 'checking' || updater.status === 'downloading'}
        >
          {checking || updater.status === 'checking' ? 'Checking…' : 'Check for updates'}
        </Button>
      )}

    </Box>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
