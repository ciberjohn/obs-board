import { ipcMain, shell } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getOBS } from './obs.js'

const execAsync = promisify(exec)

/**
 * Pick the platform-appropriate value from an action that carries
 * win / mac / linux fields.
 */
function platformValue(action) {
  if (process.platform === 'win32') return action.win
  if (process.platform === 'darwin') return action.mac
  return action.linux
}

export function setupMacroHandlers() {
  ipcMain.handle('macro:execute', async (_, action) => {
    try {
      const obs = getOBS()

      switch (action.type) {
        case 'obs_scene':
          await obs.call('SetCurrentProgramScene', { sceneName: action.sceneName })
          break

        case 'obs_toggle_mute':
          await obs.call('ToggleInputMute', { inputName: action.inputName })
          break

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
          const cmd = platformValue(action)
          if (cmd) await execAsync(cmd, { shell: true })
          break
        }

        case 'open_program': {
          const programPath = platformValue(action)
          if (programPath) await shell.openPath(programPath)
          break
        }

        case 'open_folder': {
          const folderPath = platformValue(action)
          if (folderPath) await shell.openPath(folderPath)
          break
        }

        case 'open_url':
          await shell.openExternal(action.url)
          break

        default:
          return { success: false, error: `Unknown action type: ${action.type}` }
      }

      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}
