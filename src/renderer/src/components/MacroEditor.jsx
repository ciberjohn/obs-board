import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useStore } from '../store'

const ACTION_TYPES = [
  { value: 'obs_scene',           label: 'OBS: Switch Scene' },
  { value: 'obs_toggle_mute',     label: 'OBS: Toggle Mute' },
  { value: 'obs_start_stream',    label: 'OBS: Start Stream' },
  { value: 'obs_stop_stream',     label: 'OBS: Stop Stream' },
  { value: 'obs_start_recording', label: 'OBS: Start Recording' },
  { value: 'obs_stop_recording',  label: 'OBS: Stop Recording' },
  { value: 'command',             label: 'Run Command' },
  { value: 'open_program',        label: 'Open Program' },
  { value: 'open_folder',         label: 'Open Folder' },
  { value: 'open_url',            label: 'Open URL' },
]

const OBS_TRANSPORT_TYPES = new Set([
  'obs_start_stream',
  'obs_stop_stream',
  'obs_start_recording',
  'obs_stop_recording',
])

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          border: '1px solid rgba(255,255,255,0.23)',
          borderRadius: 1,
          px: 1.5,
          py: 0.75,
          position: 'relative',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          '&:hover': { borderColor: 'primary.main' },
        }}
        component="label"
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '4px',
            bgcolor: value,
            border: '1px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        />
        <Typography
          variant="body2"
          sx={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          Change
        </Typography>
        <input
          type="color"
          value={value}
          onChange={onChange}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        />
      </Box>
    </Box>
  )
}

export default function MacroEditor() {
  const config = useStore((s) => s.config)
  const editorButton = useStore((s) => s.ui.editorButton)
  const editorPageId = useStore((s) => s.ui.editorPageId)
  const editorPosition = useStore((s) => s.ui.editorPosition)
  const setUI = useStore((s) => s.setUI)
  const addButton = useStore((s) => s.addButton)
  const updateButton = useStore((s) => s.updateButton)
  const removeButton = useStore((s) => s.removeButton)
  const obsScenes = useStore((s) => s.obs.scenes)
  const obsInputs = useStore((s) => s.obs.inputs)

  const isNew = !editorButton
  const page = config?.pages.find((p) => p.id === editorPageId)
  const gridCols = page?.grid?.cols ?? 4
  const gridRows = page?.grid?.rows ?? 2

  const buildInitialForm = () => {
    if (editorButton) {
      return {
        label: editorButton.label ?? '',
        icon: editorButton.icon ?? '▶',
        backgroundColor: editorButton.backgroundColor ?? '#6750A4',
        textColor: editorButton.textColor ?? '#FFFFFF',
        col: editorButton.col ?? 0,
        row: editorButton.row ?? 0,
        action: editorButton.action ?? { type: 'obs_scene', sceneName: '' },
      }
    }
    return {
      label: '',
      icon: '▶',
      backgroundColor: '#6750A4',
      textColor: '#FFFFFF',
      col: editorPosition?.col ?? 0,
      row: editorPosition?.row ?? 0,
      action: { type: 'obs_scene', sceneName: '' },
    }
  }

  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(buildInitialForm)

  // Re-initialise when the button being edited changes
  useEffect(() => {
    setForm(buildInitialForm())
    setTab(0)
  }, [editorButton, editorPageId, editorPosition])

  const setField = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }))

  const setAction = (partial) =>
    setForm((f) => ({ ...f, action: { ...f.action, ...partial } }))

  const handleActionTypeChange = (type) =>
    setForm((f) => ({ ...f, action: { type } }))

  const handleClose = () =>
    setUI({ editorOpen: false, editorButton: null, editorPageId: null, editorPosition: null })

  const handleDelete = () => {
    removeButton(editorPageId, editorButton.id)
    handleClose()
  }

  const handleSave = () => {
    const col = Math.max(0, Math.min(gridCols - 1, Number(form.col) || 0))
    const row = Math.max(0, Math.min(gridRows - 1, Number(form.row) || 0))

    const buttonData = {
      label: form.label,
      icon: form.icon || '▶',
      iconType: 'emoji',
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      col,
      row,
      action: form.action,
    }

    if (isNew) {
      addButton(editorPageId, { id: crypto.randomUUID(), ...buttonData })
    } else {
      updateButton(editorPageId, editorButton.id, buttonData)
    }
    handleClose()
  }

  const renderActionFields = () => {
    const { type } = form.action

    if (OBS_TRANSPORT_TYPES.has(type)) {
      return (
        <Alert severity="info" sx={{ mt: 1.5, fontSize: 13 }}>
          No additional configuration needed for this action.
        </Alert>
      )
    }

    if (type === 'obs_scene') {
      return obsScenes.length > 0 ? (
        <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
          <InputLabel>Scene</InputLabel>
          <Select
            label="Scene"
            value={form.action.sceneName ?? ''}
            onChange={(e) => setAction({ sceneName: e.target.value })}
          >
            {obsScenes.map((s) => (
              <MenuItem key={s.sceneName} value={s.sceneName}>
                {s.sceneName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField
          fullWidth
          size="small"
          label="Scene name"
          value={form.action.sceneName ?? ''}
          onChange={(e) => setAction({ sceneName: e.target.value })}
          helperText="OBS not connected — enter scene name manually"
          sx={{ mt: 1.5 }}
        />
      )
    }

    if (type === 'obs_toggle_mute') {
      return obsInputs.length > 0 ? (
        <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
          <InputLabel>Audio Input</InputLabel>
          <Select
            label="Audio Input"
            value={form.action.inputName ?? ''}
            onChange={(e) => setAction({ inputName: e.target.value })}
          >
            {obsInputs.map((inp) => (
              <MenuItem key={inp.inputName} value={inp.inputName}>
                {inp.inputName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField
          fullWidth
          size="small"
          label="Input name"
          value={form.action.inputName ?? ''}
          onChange={(e) => setAction({ inputName: e.target.value })}
          helperText="OBS not connected — enter input name manually"
          sx={{ mt: 1.5 }}
        />
      )
    }

    if (type === 'command' || type === 'open_program' || type === 'open_folder') {
      const isCmd = type === 'command'
      const labels = isCmd
        ? { win: 'Windows command', mac: 'macOS command', linux: 'Linux command' }
        : type === 'open_program'
        ? { win: 'Windows path', mac: 'macOS path', linux: 'Linux path' }
        : { win: 'Windows folder', mac: 'macOS folder', linux: 'Linux folder' }

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label={labels.win}
            multiline={isCmd}
            rows={isCmd ? 2 : 1}
            value={form.action.win ?? ''}
            onChange={(e) => setAction({ win: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label={labels.mac}
            multiline={isCmd}
            rows={isCmd ? 2 : 1}
            value={form.action.mac ?? ''}
            onChange={(e) => setAction({ mac: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label={labels.linux}
            multiline={isCmd}
            rows={isCmd ? 2 : 1}
            value={form.action.linux ?? ''}
            onChange={(e) => setAction({ linux: e.target.value })}
          />
        </Box>
      )
    }

    if (type === 'open_url') {
      return (
        <TextField
          fullWidth
          size="small"
          label="URL"
          value={form.action.url ?? ''}
          onChange={(e) => setAction({ url: e.target.value })}
          placeholder="https://..."
          sx={{ mt: 1.5 }}
        />
      )
    }

    return null
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { maxHeight: '92vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 0,
          pr: 1.5,
        }}
      >
        <span style={{ fontSize: 16 }}>{isNew ? 'Add Button' : 'Edit Button'}</span>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ '& .MuiTab-root': { fontSize: 13, minHeight: 44 } }}
        >
          <Tab label="Appearance" />
          <Tab label="Action" />
          <Tab label="Position" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 0 }}>
        {/* ── Tab 0: Appearance ── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Label"
              value={form.label}
              onChange={(e) => setField('label', e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="Icon (emoji)"
              value={form.icon}
              onChange={(e) => setField('icon', e.target.value)}
              helperText="Enter an emoji e.g. 🎬"
            />
            <ColorField
              label="Background colour"
              value={form.backgroundColor}
              onChange={(e) => setField('backgroundColor', e.target.value)}
            />
            <ColorField
              label="Text colour"
              value={form.textColor}
              onChange={(e) => setField('textColor', e.target.value)}
            />

            {/* Live preview */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1 }}
              >
                Preview
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: `${config?.appearance?.buttonRadius ?? 12}px`,
                    backgroundColor: form.backgroundColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.5,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  }}
                >
                  <Box sx={{ fontSize: '1.8rem', lineHeight: 1 }}>
                    {form.icon || '▶'}
                  </Box>
                  <Box
                    sx={{
                      fontSize: 10,
                      color: form.textColor,
                      textAlign: 'center',
                      mt: 0.5,
                      overflow: 'hidden',
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      px: 0.5,
                    }}
                  >
                    {form.label || 'Label'}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab 1: Action ── */}
        <TabPanel value={tab} index={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Action type</InputLabel>
            <Select
              label="Action type"
              value={form.action.type ?? 'obs_scene'}
              onChange={(e) => handleActionTypeChange(e.target.value)}
            >
              {ACTION_TYPES.map((a) => (
                <MenuItem key={a.value} value={a.value} sx={{ fontSize: 14 }}>
                  {a.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {renderActionFields()}
        </TabPanel>

        {/* ── Tab 2: Position ── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Columns and rows are 0-indexed. Grid is {gridCols} × {gridRows}.
            </Alert>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                label="Column"
                type="number"
                value={form.col}
                onChange={(e) => setField('col', e.target.value)}
                inputProps={{ min: 0, max: gridCols - 1 }}
                sx={{ flex: 1 }}
                helperText={`0 – ${gridCols - 1}`}
              />
              <TextField
                size="small"
                label="Row"
                type="number"
                value={form.row}
                onChange={(e) => setField('row', e.target.value)}
                inputProps={{ min: 0, max: gridRows - 1 }}
                sx={{ flex: 1 }}
                helperText={`0 – ${gridRows - 1}`}
              />
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        {!isNew && (
          <Button
            color="error"
            onClick={handleDelete}
            sx={{ mr: 'auto' }}
          >
            Delete
          </Button>
        )}
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          {isNew ? 'Add' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
