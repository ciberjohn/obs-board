import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import MacroButton from './MacroButton'
import { useStore } from '../store'

export default function MacroGrid() {
  const config = useStore((s) => s.config)
  const activePage = useStore((s) => s.ui.activePage)
  const setUI = useStore((s) => s.setUI)

  if (!config) return null

  const page =
    config.pages.find((p) => p.id === activePage) ?? config.pages[0]
  if (!page) return null

  const { cols, rows } = page.grid
  const radius = config.appearance?.buttonRadius ?? 12

  const getButton = (col, row) =>
    page.buttons.find((b) => b.col === col && b.row === row) ?? null

  const handleAddClick = (col, row) => {
    setUI({
      editorOpen: true,
      editorButton: null,
      editorPageId: page.id,
      editorPosition: { col, row },
    })
  }

  return (
    <Box
      sx={{
        flex: 1,
        p: 1,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '6px',
      }}
    >
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const btn = getButton(col, row)
          return (
            <Box key={`${col}-${row}`} sx={{ minWidth: 0, minHeight: 0 }}>
              {btn ? (
                <MacroButton button={btn} pageId={page.id} />
              ) : (
                <Box
                  onClick={() => handleAddClick(col, row)}
                  sx={{
                    width: '100%',
                    height: '100%',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    borderRadius: `${radius}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(187,134,252,0.06)',
                      '& .add-icon': { opacity: 0.7 },
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    tabIndex={-1}
                    sx={{ pointerEvents: 'none' }}
                    className="add-icon"
                  >
                    <AddIcon sx={{ fontSize: 18, opacity: 0.25, transition: 'opacity 0.15s' }} />
                  </IconButton>
                </Box>
              )}
            </Box>
          )
        })
      )}
    </Box>
  )
}
