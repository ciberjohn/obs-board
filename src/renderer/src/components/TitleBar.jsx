import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Badge from '@mui/material/Badge'
import SettingsIcon from '@mui/icons-material/Settings'
import RemoveIcon from '@mui/icons-material/Remove'
import CloseIcon from '@mui/icons-material/Close'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { useStore } from '../store'

const noDrag = { WebkitAppRegion: 'no-drag' }
const dragRegion = { WebkitAppRegion: 'drag' }

export default function TitleBar() {
  const connected = useStore((s) => s.obs.connected)
  const updaterStatus = useStore((s) => s.updater.status)
  const setUI = useStore((s) => s.setUI)

  const handleMinimise = () => window.electronAPI.window.minimize()
  const handleHide = () => window.electronAPI.window.hide()
  const handleSettings = (tab) =>
    setUI({ settingsOpen: true, settingsTab: tab ?? 0 })

  // Show the update icon whenever a new version is available or ready to install.
  const updateReady = updaterStatus === 'available' || updaterStatus === 'downloading' || updaterStatus === 'downloaded'
  const updateInstallable = updaterStatus === 'downloaded'

  return (
    <Box
      sx={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        px: 1,
        gap: 1,
        overflow: 'hidden',
      }}
    >
      {/* Drag region — app title */}
      <Box
        style={dragRegion}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          height: '100%',
          cursor: 'default',
          userSelect: 'none',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            flexShrink: 0,
          }}
        />
        <Box
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          OBS Board
        </Box>
      </Box>

      {/* OBS connection status chip */}
      <Box style={noDrag} sx={{ flexShrink: 0 }}>
        <Chip
          size="small"
          onClick={() => handleSettings(0)}
          icon={
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: connected ? 'success.main' : 'error.main',
                ml: '6px !important',
                flexShrink: 0,
              }}
            />
          }
          label={connected ? 'OBS Connected' : 'OBS Offline'}
          sx={{
            height: 22,
            fontSize: 11,
            bgcolor: 'rgba(255,255,255,0.06)',
            cursor: 'pointer',
            '& .MuiChip-label': { px: 0.75 },
            '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
          }}
        />
      </Box>

      {/* Window controls */}
      <Box style={noDrag} sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>

        {/* Update badge — visible when a new version is detected */}
        {updateReady && (
          <Tooltip
            title={
              updateInstallable
                ? 'Update downloaded — click to restart and install'
                : 'Update available — click to view'
            }
          >
            <IconButton
              size="small"
              onClick={() => handleSettings(5)}
              sx={{
                p: '5px',
                color: updateInstallable ? 'success.main' : 'warning.main',
                animation: updateInstallable ? 'pulse 2s ease-in-out infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.55 },
                },
              }}
            >
              <Badge
                variant="dot"
                color={updateInstallable ? 'success' : 'warning'}
                overlap="circular"
              >
                <SystemUpdateAltIcon sx={{ fontSize: 15 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Settings">
          <IconButton
            size="small"
            onClick={() => handleSettings()}
            sx={{ p: '5px', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <SettingsIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Minimise">
          <IconButton
            size="small"
            onClick={handleMinimise}
            sx={{ p: '5px', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <RemoveIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Hide to tray">
          <IconButton
            size="small"
            onClick={handleHide}
            sx={{
              p: '5px',
              color: 'text.secondary',
              '&:hover': { color: 'error.main' },
            }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
