<div align="center">

# 🎛 OBS Board

**A floating macro pad for streamers — open source, cross-platform, no subscription.**

Run shell commands · Switch OBS scenes · Open programs and folders · All from a draggable window that sits above everything else on your screen.

[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-purple.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#installation)
[![Electron](https://img.shields.io/badge/Electron-42-47848F.svg)](https://electronjs.org)
[![OBS WebSocket](https://img.shields.io/badge/OBS%20WebSocket-v5-FF6B35.svg)](https://obsproject.com)

<!--
  TODO: Add a screenshot here (800×500px, dark background).
  Path: docs/assets/screenshot.png
-->

</div>

---

## Why OBS Board?

Most streaming control tools are either subscription-locked, Windows-only, or require dedicated hardware. OBS Board is a free, open-source alternative that runs entirely on your own machine — no cloud, no accounts, no monthly fee.

| | OBS Board | Stream Deck | Touch Portal |
|---|---|---|---|
| Price | Free | £149+ hardware | £13/yr |
| Platform | Win · Mac · Linux | Win · Mac | Win · Mac · iOS |
| Open source | ✅ | ❌ | ❌ |
| No hardware needed | ✅ | ❌ | ❌ |
| Shell command macros | ✅ | ✅ | ✅ |
| Always on top | ✅ | Hardware | ✅ |

---

## Features

- **Multi-page grid** — organise macros into pages (Gaming, Music, Work…); configurable grid size from 2×1 up to 6×5
- **OBS integration** — switch scenes, toggle mute, start/stop stream and recording via OBS WebSocket v5 (built into OBS 28+; no plugin required)
- **Shell commands** — run any command on Windows, macOS, or Linux, with per-platform overrides
- **Open programs and folders** — launch apps and directories with one click
- **Open URLs** — open any `http://` or `https://` link in the default browser
- **Floating window** — frameless, always-on-top, resizable, with adjustable opacity
- **System tray** — minimises to tray; one click to restore
- **Material Design** — dark theme, customisable accent colour and button corner radius
- **Config backup** — export/import your full setup as a JSON file; auto-saves on every change
- **Auto-updates** — checks for new releases on GitHub in the background; one-click install

---

## Requirements

- **OBS Studio 28 or later** — the built-in WebSocket server must be enabled (see [OBS Setup](#obs-setup))
- **Windows 10+ / macOS 12+ / Ubuntu 20.04+** (other Linux distros supported via AppImage)
- **Node.js 20 LTS or 22 LTS** — only required when installing from source

---

## Installation

### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/ciberjohn/obs-board/master/scripts/install.sh | bash
```

Auto-detects your distro — installs the `.deb` package on Debian/Ubuntu/Mint, AppImage on everything else.

**Manual download:** [Releases page](https://github.com/ciberjohn/obs-board/releases/latest)

---

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/ciberjohn/obs-board/master/scripts/install.sh | bash
```

Detects Apple Silicon or Intel and installs the correct build to `/Applications`.

**Manual download:** [Releases page](https://github.com/ciberjohn/obs-board/releases/latest)

---

### Windows

**PowerShell (run as Administrator):**

```powershell
irm https://raw.githubusercontent.com/ciberjohn/obs-board/master/scripts/install.ps1 | iex
```

Or download `obs-board-Setup-x.x.x.exe` from the [Releases page](https://github.com/ciberjohn/obs-board/releases/latest) and run it directly.

> **Note:** Windows may show a SmartScreen warning because the binary is not yet code-signed. Click **More info → Run anyway**. See [SECURITY.md](SECURITY.md) for details.

---

## OBS Setup

OBS Board connects to OBS via the built-in WebSocket server (OBS 28+).

1. Open OBS Studio
2. Go to **Tools → WebSocket Server Settings**
3. Tick **Enable WebSocket server**
4. Note the **Server Port** (default: `4455`)
5. Set a **Server Password** (recommended)
6. Click **OK**

In OBS Board, click the **OBS Offline** chip in the title bar (or go to **Settings → OBS**) and enter:

- **Host:** `localhost` (or the IP of your OBS machine if it's on a separate PC)
- **Port:** `4455`
- **Password:** your WebSocket password

Click **Connect**. The chip turns green when connected.

---

## Usage

### Adding a macro button

1. Click the **`+`** cell in the grid
2. Configure the button:
   - **Appearance tab** — set label, emoji icon, background and text colour
   - **Action tab** — choose what the button does (see action types below)
   - **Position tab** — change the grid position if needed
3. Click **Save**

### Action types

| Action | What it does |
|---|---|
| **OBS: Switch Scene** | Switches to a named OBS scene immediately |
| **OBS: Toggle Mute** | Toggles mute on a specific audio input |
| **OBS: Start/Stop Stream** | Starts or stops your OBS stream |
| **OBS: Start/Stop Recording** | Starts or stops OBS recording |
| **Run Command** | Executes a shell command (supports per-OS overrides) |
| **Open Program** | Opens an application by path |
| **Open Folder** | Opens a folder in the system file manager |
| **Open URL** | Opens a `http://` or `https://` URL in the default browser |

### Right-click a button → Edit or Delete

### Pages

- Click **`+`** next to the page tabs to add a new page
- Right-click a page tab to **rename** or **delete** it
- Grid size per page is configured in **Settings → Grid**

### Settings panel

Click the **⚙️ gear** icon in the title bar.

| Tab | What's here |
|---|---|
| OBS | Connection settings, auto-connect toggle |
| Look | Accent colour, button corner radius, label toggle |
| Grid | Columns and rows for the active page |
| Window | Always-on-top toggle, opacity slider |
| Backup | Export/import config, open data folder |
| Updates | Check for updates, download and install |

---

## Config & Backup

Your config is stored at:

| Platform | Path |
|---|---|
| Linux | `~/.config/obs-board/config.json` |
| macOS | `~/Library/Application Support/obs-board/config.json` |
| Windows | `%APPDATA%\obs-board\config.json` |

Open the folder directly from **Settings → Backup → Open data folder**.

**Export:** Settings → Backup → Export config — saves a `.json` file you can keep in Dropbox, Git, etc.

**Import:** Settings → Backup → Import config — if the file contains shell-command macros, a review dialog will list every command before anything is written.

---

## Building from Source

See [docs/BUILDING.md](docs/BUILDING.md) for full instructions, including how to package platform installers and publish a release.

---

## Packaging a Release

Requires the repository to be public and a `GH_TOKEN` environment variable with `repo` scope.

```bash
# Linux (must be run on Linux)
GH_TOKEN=your_token npm run package:linux

# macOS (must be run on macOS, code signing optional)
GH_TOKEN=your_token npm run package:mac

# Windows (must be run on Windows)
GH_TOKEN=your_token npm run package:win
```

Built artefacts land in `dist/`. electron-builder publishes them to GitHub Releases automatically when `GH_TOKEN` is set.

Tag the release before packaging:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Security

OBS Board runs shell commands on your machine by design. The following mitigations are in place:

- **Config imports with shell-command buttons require explicit user review** before they are written to disk
- `shell.openExternal` only accepts `http://` and `https://` URLs
- The OBS WebSocket hostname is validated to prevent URL injection
- The renderer runs in a sandboxed context (`sandbox: true`) — no direct Node.js access
- All IPC inputs are type-validated in the main process before use

See [SECURITY.md](SECURITY.md) for the full security policy and how to report vulnerabilities.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large pull request so we can discuss the approach.

```bash
# Fork the repo, then:
git clone https://github.com/your-username/obs-board.git
cd obs-board
npm install
npm run dev
```

Code style: ES modules, functional React components, no TypeScript (for now), British English in comments and strings.

---

## Licence

[MIT](LICENSE) — free to use, modify, and distribute.

---

## Built with Claude

OBS Board was designed and built in collaboration with [Claude](https://claude.ai) by Anthropic — used as an AI pair-programmer throughout the entire project, from architecture decisions and security hardening to the React UI and installer scripts.

If you're curious about the process, the full conversation that produced this codebase is the kind of session Claude Code was built for: iterative, security-conscious, and treating the AI as a senior collaborator rather than a code generator.

---

<div align="center">
Made for streamers, by a streamer. No hardware required.
</div>
