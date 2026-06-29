import { useState } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import { useStore } from '../store'

export default function PageTabs() {
  const config = useStore((s) => s.config)
  const activePage = useStore((s) => s.ui.activePage)
  const setUI = useStore((s) => s.setUI)
  const saveConfig = useStore((s) => s.saveConfig)
  const addPage = useStore((s) => s.addPage)
  const updatePage = useStore((s) => s.updatePage)
  const removePage = useStore((s) => s.removePage)

  const [contextMenu, setContextMenu] = useState(null) // { anchorEl, pageId }
  const [renameDialog, setRenameDialog] = useState(null) // { pageId, name }

  if (!config) return null
  const { pages } = config

  const handleTabClick = (pageId) => {
    setUI({ activePage: pageId })
    saveConfig({ activePage: pageId })
  }

  const handleContextMenu = (e, pageId) => {
    e.preventDefault()
    setContextMenu({ anchorEl: e.currentTarget, pageId })
  }

  const handleCloseContext = () => setContextMenu(null)

  const handleRename = () => {
    const page = pages.find((p) => p.id === contextMenu.pageId)
    setRenameDialog({ pageId: contextMenu.pageId, name: page?.name ?? '' })
    handleCloseContext()
  }

  const handleDelete = () => {
    removePage(contextMenu.pageId)
    handleCloseContext()
  }

  const handleRenameConfirm = () => {
    const trimmed = renameDialog?.name?.trim()
    if (trimmed) {
      updatePage(renameDialog.pageId, { name: trimmed })
    }
    setRenameDialog(null)
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {pages.map((page) => {
          const isActive = page.id === activePage
          return (
            <ButtonBase
              key={page.id}
              onClick={() => handleTabClick(page.id)}
              onContextMenu={(e) => handleContextMenu(e, page.id)}
              sx={{
                px: 1.5,
                height: 36,
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? 'primary.main' : 'text.secondary',
                whiteSpace: 'nowrap',
                borderBottom: '2px solid',
                borderColor: isActive ? 'primary.main' : 'transparent',
                borderRadius: 0,
                transition: 'color 0.15s, border-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexShrink: 0,
                '&:hover': { color: isActive ? 'primary.main' : 'text.primary' },
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{page.icon}</span>
              <span>{page.name}</span>
            </ButtonBase>
          )
        })}

        <IconButton
          size="small"
          onClick={addPage}
          title="Add page"
          sx={{ ml: 0.25, p: '5px', flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <AddIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>

      {/* Right-click context menu */}
      <Popover
        open={Boolean(contextMenu)}
        anchorEl={contextMenu?.anchorEl}
        onClose={handleCloseContext}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: 140 } }}
      >
        <MenuItem onClick={handleRename} dense sx={{ fontSize: 13 }}>
          Rename
        </MenuItem>
        <MenuItem
          onClick={handleDelete}
          dense
          disabled={pages.length <= 1}
          sx={{ fontSize: 13, color: pages.length > 1 ? 'error.main' : undefined }}
        >
          Delete
        </MenuItem>
      </Popover>

      {/* Rename dialog */}
      <Dialog
        open={Boolean(renameDialog)}
        onClose={() => setRenameDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 16 }}>Rename Page</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Page name"
            value={renameDialog?.name ?? ''}
            onChange={(e) =>
              setRenameDialog((d) => ({ ...d, name: e.target.value }))
            }
            onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setRenameDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleRenameConfirm}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
