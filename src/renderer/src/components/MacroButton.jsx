import { useState } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import { useStore } from '../store'

export default function MacroButton({ button, pageId }) {
  const config = useStore((s) => s.config)
  const setUI = useStore((s) => s.setUI)
  const activePage = useStore((s) => s.ui.activePage)

  const [loading, setLoading] = useState(false)
  const [flash, setFlash] = useState(null) // null | 'success' | 'error'

  const radius = config?.appearance?.buttonRadius ?? 12
  const showLabels = config?.appearance?.showLabels ?? true

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    setFlash(null)
    try {
      const result = await window.electronAPI.macro.execute(button.action)
      setFlash(result?.success === false ? 'error' : 'success')
    } catch {
      setFlash('error')
    } finally {
      setLoading(false)
      setTimeout(() => setFlash(null), 600)
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    setUI({
      editorOpen: true,
      editorButton: button,
      editorPageId: pageId ?? activePage,
      editorPosition: null,
    })
  }

  const boxShadow =
    flash === 'error'
      ? '0 0 0 2px #CF6679'
      : flash === 'success'
      ? '0 0 0 2px rgba(105,240,174,0.55)'
      : 'none'

  return (
    <ButtonBase
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      disableRipple={false}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: `${radius}px`,
        backgroundColor: button.backgroundColor || 'primary.main',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow,
        transition: 'box-shadow 0.15s, filter 0.15s',
        filter: flash === 'success' ? 'brightness(1.18)' : 'brightness(1)',
        '&:hover': { filter: 'brightness(1.12)' },
        '&:active': { filter: 'brightness(0.82)' },
        p: 0.5,
        // Ensure ripple is clipped to border radius
        '& .MuiTouchRipple-root': { borderRadius: `${radius}px` },
      }}
    >
      {/* Icon area */}
      <Box
        sx={{
          flex: showLabels ? '0 0 58%' : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: 'clamp(1rem, 2.8vw, 2rem)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {button.icon || '▶'}
        </Box>
      </Box>

      {/* Label area */}
      {showLabels && (
        <Box
          sx={{
            flex: '0 0 42%',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            px: 0.5,
            overflow: 'hidden',
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: 'clamp(9px, 1.4vw, 11px)',
              color: button.textColor || '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.2,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            {button.label}
          </Box>
        </Box>
      )}

      {/* Loading overlay */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.5)',
            borderRadius: `${radius}px`,
          }}
        >
          <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.9)' }} />
        </Box>
      )}
    </ButtonBase>
  )
}
