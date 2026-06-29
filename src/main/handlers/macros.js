import { ipcMain, shell } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getOBS } from './obs.js'

const execAsync = promisify(exec)

// Schemes that shell.openExternal is permitted to open.
const ALLOWED_URL_SCHEMES = /^https?:\/\//i

// Pick the platform-appropriate value from an action that carries
// win / mac / linux fields.
function platformValue(action) {
  if (process.platform === 'win32') return action.win
  if (process.platform === 'darwin') return action.mac
  return action.linux
}

// Reject paths that contain null bytes or are non-strings.
function isValidPath(p) {
  return typeof p === 'string' && p.length > 0 && !p.includes('\0')
}

export function setupMacroHandlers() {
  ipcMain.handle('macro:execute', async (_, action) => {
    // Validate that action is a plain object with a string type.
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
      return { success: false, error: 'Invalid action payload' }
    }

    try {
      const obs = getOBS()

      switch (action.type) {
        case 'obs_scene': {
          if (typeof action.sceneName !== 'string' || !action.sceneName) {
            return { success: false, error: 'sceneName must be a non-empty string' }
          }
          await obs.call('SetCurrentProgramScene', { sceneName: action.sceneName })
          break
        }

        case 'obs_toggle_mute': {
          if (typeof action.inputName !== 'string' || !action.inputName) {
            return { success: false, error: 'inputName must be a non-empty string' }
          }
          await obs.call('ToggleInputMute', { inputName: action.inputName })
          break
        }

        case 'obs_start_stream':
          await obs.call('StartStream')
          break

        case 'obs_stop_stream':
          await obs.call('StopStream')
          break

        case 'obs_start_recording':
          await obs.call('StartRecord')
          break

        case 'obs_stop_recording':
          await obs.call('StopRecord')
          break

        case 'command': {
          // shell: true is intentional — this action type is a user-configured
          // shell macro. The risk is acknowledged: only user-authored configs
          // reach this point. Imported configs are validated in config.js before
          // being accepted.
          const cmd = platformValue(action)
          if (typeof cmd !== 'string' || !cmd.trim()) break
          await execAsync(cmd, { shell: true, timeout: 30_000 })
          break
        }

        case 'open_program': {
          const programPath = platformValue(action)
          if (!isValidPath(programPath)) {
            return { success: false, error: 'Invalid program path' }
          }
          const err = await shell.openPath(programPath)
          if (err) return { success: false, error: err }
          break
        }

        case 'open_folder': {
          const folderPath = platformValue(action)
          if (!isValidPath(folderPath)) {
            return { success: false, error: 'Invalid folder path' }
          }
          const err = await shell.openPath(folderPath)
          if (err) return { success: false, error: err }
          break
        }

        case 'open_url': {
          const url = action.url
          if (typeof url !== 'string' || !ALLOWED_URL_SCHEMES.test(url)) {
            return {
              success: false,
              error: 'Only http:// and https:// URLs are permitted',
            }
          }
          await shell.openExternal(url)
          break
        }

        default:
          return { success: false, error: `Unknown action type: ${action.type}` }
      }

      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}
