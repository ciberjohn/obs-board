#!/usr/bin/env bash
# OBS Board installer — Linux and macOS
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ciberjohn/obs-board/master/scripts/install.sh | bash
#
# Environment variables:
#   GITHUB_TOKEN   Set this to access the releases if the repo is private.
#   INSTALL_DIR    Override the installation directory (Linux AppImage only).
#                  Default: $HOME/.local/bin

set -euo pipefail

REPO="ciberjohn/obs-board"
API="https://api.github.com/repos/${REPO}/releases/latest"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/master"

# ── Colour output ──────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; RESET=''
fi

info()    { echo -e "${CYAN}▶${RESET} $*"; }
success() { echo -e "${GREEN}✔${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
die()     { echo -e "${RED}✘ ERROR:${RESET} $*" >&2; exit 1; }

# ── Dependency checks ──────────────────────────────────────────────────────────
require() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed. Install it and retry."
}

require curl

# ── GitHub API helper ──────────────────────────────────────────────────────────
api_get() {
  local url="$1"
  local args=(-fsSL "$url" -H "Accept: application/vnd.github+json")
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    args+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
  fi
  curl "${args[@]}"
}

# ── Get latest release info ────────────────────────────────────────────────────
info "Fetching latest release information…"
RELEASE_JSON=$(api_get "$API") || die "Could not reach GitHub API. If the repo is private, set GITHUB_TOKEN."
VERSION=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
[ -n "$VERSION" ] || die "Could not determine the latest version. No releases published yet?"

info "Latest version: ${BOLD}${VERSION}${RESET}"

# ── OS detection ───────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)  install_linux  ;;
  Darwin) install_macos  ;;
  *)      die "Unsupported OS: $OS. Download manually from https://github.com/${REPO}/releases/latest" ;;
esac

# ── Helper: download an asset by name pattern ──────────────────────────────────
download_asset() {
  local pattern="$1"
  local dest="$2"

  local url
  url=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep -i "$pattern" | head -1 \
        | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')

  [ -n "$url" ] || die "Could not find a release asset matching '${pattern}'. Check https://github.com/${REPO}/releases/latest"

  info "Downloading ${BOLD}$(basename "$url")${RESET}…"
  local dl_args=(-fL "$url" -o "$dest" --progress-bar)
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    dl_args+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
  fi
  curl "${dl_args[@]}"
}

# ── Linux installer ────────────────────────────────────────────────────────────
install_linux() {
  [ "$ARCH" = "x86_64" ] || die "Only x86_64 is supported on Linux (got: $ARCH)."

  # Prefer .deb on Debian/Ubuntu/Mint; fall back to AppImage
  if command -v dpkg >/dev/null 2>&1; then
    install_linux_deb
  else
    install_linux_appimage
  fi
}

install_linux_deb() {
  local tmp
  tmp="$(mktemp --suffix=.deb)"
  trap "rm -f '${tmp}'" EXIT

  download_asset "amd64.deb" "$tmp"

  info "Installing .deb package (requires sudo)…"
  if command -v apt >/dev/null 2>&1; then
    sudo apt install -y "$tmp"
  else
    sudo dpkg -i "$tmp"
  fi

  success "OBS Board ${VERSION} installed."
  echo ""
  echo -e "  Launch with: ${BOLD}obs-board${RESET}"
  echo -e "  Or find it in your application menu."
}

install_linux_appimage() {
  local install_dir="${INSTALL_DIR:-$HOME/.local/bin}"
  local dest="${install_dir}/obs-board"
  local tmp
  tmp="$(mktemp --suffix=.AppImage)"
  trap "rm -f '${tmp}'" EXIT

  download_asset ".AppImage" "$tmp"

  mkdir -p "$install_dir"
  mv "$tmp" "$dest"
  chmod +x "$dest"
  trap - EXIT

  # Optional: create a .desktop entry
  local desktop_dir="$HOME/.local/share/applications"
  mkdir -p "$desktop_dir"
  cat > "${desktop_dir}/obs-board.desktop" <<DESKTOP
[Desktop Entry]
Name=OBS Board
Comment=Floating macro pad for OBS streaming control
Exec=${dest}
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=AudioVideo;Utility;
DESKTOP

  success "OBS Board ${VERSION} installed to ${dest}"
  echo ""
  echo -e "  Launch with: ${BOLD}obs-board${RESET}"
  echo -e "  Or find it in your application menu."
  echo ""
  warn "If '${install_dir}' is not in your PATH, add this to ~/.bashrc or ~/.zshrc:"
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
}

# ── macOS installer ────────────────────────────────────────────────────────────
install_macos() {
  require hdiutil

  # Detect architecture
  local pattern
  if [ "$ARCH" = "arm64" ]; then
    pattern="arm64.dmg"
    info "Detected Apple Silicon (arm64)"
  else
    # x86_64 or Rosetta — grab the x64 build
    # electron-builder names x64 DMGs without an arch suffix
    pattern="(?<!arm64)\.dmg"
    # Simpler grep: exclude arm64
    pattern=".dmg"
    info "Detected Intel (x86_64)"
  fi

  local tmp_dmg
  tmp_dmg="$(mktemp /tmp/obs-board-XXXXXX.dmg)"
  trap "rm -f '${tmp_dmg}'" EXIT

  # On Apple Silicon, prefer the arm64 DMG; on Intel, prefer the x64 one
  if [ "$ARCH" = "arm64" ]; then
    download_asset "arm64.dmg" "$tmp_dmg"
  else
    # Download the x64 DMG (does not contain "arm64" in the name)
    local url
    url=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep '\.dmg"' | grep -v 'arm64' | head -1 \
          | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')
    [ -n "$url" ] || die "No x64 .dmg found in the latest release."
    info "Downloading $(basename "$url")…"
    local dl_args=(-fL "$url" -o "$tmp_dmg" --progress-bar)
    [ -n "${GITHUB_TOKEN:-}" ] && dl_args+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
    curl "${dl_args[@]}"
  fi

  info "Mounting disk image…"
  local mount_point
  mount_point="$(hdiutil attach "$tmp_dmg" -nobrowse -noautoopen 2>/dev/null \
                 | grep '/Volumes/' | tail -1 | awk '{print $NF}')"
  [ -n "$mount_point" ] || die "Failed to mount the disk image."

  trap "hdiutil detach '${mount_point}' -quiet 2>/dev/null; rm -f '${tmp_dmg}'" EXIT

  local app_src
  app_src="$(find "$mount_point" -maxdepth 1 -name '*.app' | head -1)"
  [ -n "$app_src" ] || die "Could not find .app bundle in the disk image."

  info "Installing to /Applications…"
  if [ -d "/Applications/OBS Board.app" ]; then
    warn "Removing existing installation…"
    rm -rf "/Applications/OBS Board.app"
  fi
  cp -R "$app_src" /Applications/

  hdiutil detach "$mount_point" -quiet 2>/dev/null
  trap "rm -f '${tmp_dmg}'" EXIT

  success "OBS Board ${VERSION} installed to /Applications."
  echo ""
  echo "  Launch from Spotlight (⌘ Space → 'OBS Board') or your Applications folder."
  echo ""
  warn "If macOS blocks the app on first launch (Gatekeeper), right-click the app"
  echo "  → Open → Open. This is only needed once for unsigned binaries."
}

# ── Entry point ────────────────────────────────────────────────────────────────
# Functions are defined above; the case statement calls the right one.
# Re-invoke correctly if sourced rather than piped to bash.
case "$(uname -s)" in
  Linux)  install_linux  ;;
  Darwin) install_macos  ;;
  *)      die "Unsupported OS: $(uname -s)" ;;
esac
