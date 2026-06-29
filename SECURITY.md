# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| Latest stable | ✅ |
| Older releases | ❌ — update to the latest release |

---

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Send a private report via GitHub's built-in tool:  
**Security → Report a vulnerability** (top-right of the repository page on GitHub).

Include:

- A concise description of the vulnerability
- Steps to reproduce (or a proof-of-concept)
- The version of OBS Board affected
- Your assessment of severity/impact

You will receive an acknowledgement within **48 hours** and a full response within **7 days**. Patches for confirmed vulnerabilities are released as soon as they are ready.

---

## Threat model

OBS Board is a local Electron application. It is **not** a web service and has no server component. Its attack surface is:

1. **Malicious config files** — a crafted `.json` import could attempt to inject shell commands
2. **OBS WebSocket credentials** — a malicious config could try to redirect the connection to a rogue host
3. **URL/path injection** — user-supplied strings passed to the shell, `shell.openPath`, or `shell.openExternal`
4. **Electron renderer escape** — the renderer process gaining access to Node.js APIs it should not have

---

## Security controls

### Sandboxed renderer

The renderer process runs with `sandbox: true`, `nodeIntegration: false`, and `contextIsolation: true`. It has no direct access to Node.js or Electron APIs. All OS interactions go through the `contextBridge` IPC surface.

### IPC input validation

Every IPC handler in the main process validates its inputs **before use**, regardless of what the renderer claims. The main process does not trust the renderer.

- `config:set` accepts only keys in an explicit allowlist (`ALLOWED_CONFIG_KEYS`)
- `macro:execute` validates the action type against `VALID_ACTION_TYPES` and rejects null bytes in paths
- `obs:connect` validates the host against an RFC-1123 hostname regex and checks port is 1–65535
- `app:open-url` enforces an `^https?://` scheme — no `file://`, `javascript:`, or other schemes

### Config import — mandatory command review

If an imported config JSON contains any button with a `command` action type, the import is held in memory and a review dialog is shown to the user, listing every command string across all platforms (Windows, macOS, Linux). The config is only written to disk after the user explicitly confirms. This prevents social-engineering attacks via "starter pack" config files.

Additionally, `obs.autoConnect` is **force-set to `false`** on every import, preventing a malicious config from silently establishing an OBS connection on next launch.

### Prototype pollution guard

`deepMerge` (in the Zustand store) explicitly skips `__proto__`, `constructor`, and `prototype` keys. `sanitiseConfig()` additionally passes all config data through `JSON.parse(JSON.stringify())` before writing to the store, stripping any prototype-chain pollution.

### Shell command execution

Shell commands are **only** executed for the `command` action type, via `exec()` with `shell: true` and a 30-second timeout. `open_program` and `open_folder` use Electron's `shell.openPath()` (no shell involved). `open_url` uses `shell.openExternal()` with the `^https?://` guard above.

### macOS hardened runtime

The macOS build is produced with `hardenedRuntime: true` and a minimal entitlements plist:
- `com.apple.security.cs.allow-unsigned-executable-memory` — required for V8 JIT
- `com.apple.security.network.client` — required for OBS WebSocket and update checks

No other entitlements are granted.

---

## Windows SmartScreen warning

Because OBS Board is not currently code-signed with an EV certificate, Windows Defender SmartScreen will show a warning on first run ("Windows protected your PC"). This is expected behaviour for any unsigned application distributed outside the Microsoft Store.

To proceed: click **More info → Run anyway**.

Code signing is on the roadmap. Once the app has sufficient download history, SmartScreen warnings will reduce automatically (reputation-based trust), even without a certificate.

---

## Dependencies

OBS Board uses `npm audit` to track known vulnerabilities in its dependency tree. The target is **zero high/critical findings** at every release. Run:

```bash
npm audit
```

to check the current state. If you discover a vulnerability in a dependency that affects OBS Board, please report it as described above so it can be prioritised.

---

## Responsible disclosure

I follow a **90-day disclosure timeline**: if a reported vulnerability has not been patched within 90 days, the reporter is free to publish their findings. I will acknowledge public credit to reporters unless they prefer to remain anonymous.
