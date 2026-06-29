# Building OBS Board from Source

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS or 22 LTS | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 10+ | Bundled with Node.js |
| Git | Any recent version | |
| OBS Studio | 28+ | For testing WebSocket integration |

> **Linux:** `libsecret-1-dev` may be required on some distros for the Electron build to complete.  
> **macOS:** Xcode Command Line Tools must be installed (`xcode-select --install`).  
> **Windows:** No additional tooling required beyond Node.js.

---

## Clone and install

```bash
git clone https://github.com/ciberjohn/obs-board.git
cd obs-board
npm install
```

---

## Development mode

```bash
npm run dev
```

This starts the app with Vite's hot-module replacement. Changes to renderer files reload instantly; changes to the main process require a restart (Ctrl-C → `npm run dev`).

The dev build enables Electron DevTools — press **F12** or **Ctrl+Shift+I** to open them.

---

## Building the production bundle

```bash
npm run build
```

Compiled output lands in `out/`:

```
out/
├── main/index.js        # Electron main process
├── preload/index.js     # Context bridge
└── renderer/
    ├── index.html
    └── assets/index-*.js
```

The build is production-minified but not yet packaged as an installer.

---

## Packaging installers

Each platform must be packaged **on that platform** — cross-compilation of native Electron builds is not supported.

```bash
# Linux (run on Linux)
npm run package:linux
# Produces: dist/obs-board-x.x.x.AppImage
#           dist/obs-board_x.x.x_amd64.deb

# macOS (run on macOS)
npm run package:mac
# Produces: dist/obs-board-x.x.x.dmg        (x64)
#           dist/obs-board-x.x.x-arm64.dmg   (Apple Silicon)

# Windows (run on Windows)
npm run package:win
# Produces: dist/obs-board Setup x.x.x.exe
```

All artefacts land in `dist/`.

### Publishing a release to GitHub

Set `GH_TOKEN` to a GitHub personal access token with the `repo` scope, then tag the release before packaging:

```bash
git tag v1.0.1
git push origin v1.0.1
GH_TOKEN=ghp_... npm run package:linux   # repeat per platform
```

electron-builder publishes the artefacts to the GitHub release automatically. The app's built-in updater will detect the new version within 30 seconds of the next user launch.

---

## Project structure

```
obs-board/
├── src/
│   ├── main/                 # Electron main process (Node.js)
│   │   ├── index.js          # App entry: BrowserWindow, tray, IPC handlers
│   │   └── handlers/
│   │       ├── obs.js        # OBS WebSocket v5 integration
│   │       ├── macros.js     # Cross-platform command execution
│   │       ├── config.js     # electron-store persistence + import/export
│   │       └── updater.js    # electron-updater auto-update
│   ├── preload/
│   │   └── index.js          # contextBridge IPC contract
│   └── renderer/             # React 18 frontend
│       ├── index.html
│       └── src/
│           ├── App.jsx
│           ├── theme.js      # MUI Material 3 dark theme
│           ├── store/        # Zustand global state
│           └── components/
│               ├── TitleBar.jsx
│               ├── PageTabs.jsx
│               ├── MacroGrid.jsx
│               ├── MacroButton.jsx
│               ├── MacroEditor.jsx   # Button config dialog
│               └── Settings.jsx      # Settings panel
├── scripts/
│   ├── install.sh            # Linux + macOS one-liner installer
│   └── install.ps1           # Windows PowerShell installer
├── build/
│   └── entitlements.mac.plist
├── electron.vite.config.mjs
├── electron-builder.json5
└── package.json
```

---

## Key architectural decisions

### IPC security model

The renderer has no direct Node.js access (`nodeIntegration: false`, `sandbox: true`). All communication with the OS goes through the preload's `contextBridge` API (`window.electronAPI`). Every IPC handler in the main process validates its inputs independently — it does not trust renderer-supplied data.

### Config import — two-stage flow

Importing a JSON config that contains `command`-type button actions triggers a mandatory review dialog in the renderer before the config is written to disk. This prevents a "starter pack" social-engineering attack where a malicious JSON executes shell commands when a button is clicked.

### electron-store (ESM compatibility)

`electron-store` v8 is ESM-only. Because electron-vite compiles the main process to CJS, the package is loaded via `await import('electron-store')` (a dynamic import preserved by esbuild when the package is marked as external). This is intentional and correct.

---

## Troubleshooting

### `npm install` fails with `node-gyp` errors on Linux

```bash
sudo apt install build-essential python3
npm install
```

### App launches but shows a blank window

Open DevTools (F12) and check the console. A common cause is a missing environment variable or a config file that is not valid JSON. Delete `~/.config/obs-board/config.json` to reset.

### OBS WebSocket won't connect

- Confirm OBS 28+ is running
- Confirm **Tools → WebSocket Server Settings → Enable WebSocket server** is ticked
- Try connecting with the [obs-websocket tester](https://github.com/obsproject/obs-websocket) to rule out a network issue
- Check that no firewall blocks port 4455 (or whichever port you configured)
