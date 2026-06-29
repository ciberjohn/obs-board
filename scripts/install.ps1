# OBS Board installer — Windows
# Usage (PowerShell, run as Administrator):
#   irm https://raw.githubusercontent.com/ciberjohn/obs-board/master/scripts/install.ps1 | iex
#
# Environment variables:
#   $env:GITHUB_TOKEN   Set this to access the releases if the repo is private.

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$Repo    = 'ciberjohn/obs-board'
$ApiUrl  = "https://api.github.com/repos/$Repo/releases/latest"

# ── Colour helpers ─────────────────────────────────────────────────────────────
function Write-Info    { param($m) Write-Host "  > $m" -ForegroundColor Cyan }
function Write-Success { param($m) Write-Host "  ✔ $m" -ForegroundColor Green }
function Write-Warn    { param($m) Write-Host "  ⚠ $m" -ForegroundColor Yellow }
function Write-Fail    { param($m) Write-Host "  ✘ ERROR: $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  OBS Board Installer" -ForegroundColor Magenta
Write-Host "  ───────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Architecture check ─────────────────────────────────────────────────────────
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -notmatch 'AMD64|x86_64') {
    Write-Fail "Only x64 Windows is supported (detected: $arch)."
}

# ── GitHub API request ─────────────────────────────────────────────────────────
Write-Info "Fetching latest release information…"

$headers = @{ 'Accept' = 'application/vnd.github+json' }
if ($env:GITHUB_TOKEN) {
    $headers['Authorization'] = "Bearer $env:GITHUB_TOKEN"
}

try {
    $release = Invoke-RestMethod -Uri $ApiUrl -Headers $headers -UseBasicParsing
} catch {
    Write-Fail "Could not reach the GitHub API. If the repo is private, set `$env:GITHUB_TOKEN before running."
}

$version = $release.tag_name
if (-not $version) {
    Write-Fail "Could not determine the latest version. Has a release been published yet?"
}

Write-Info "Latest version: $version"

# ── Find the Windows installer asset ──────────────────────────────────────────
$asset = $release.assets | Where-Object { $_.name -match '(?i)setup.*\.exe$|\.exe$' } | Select-Object -First 1
if (-not $asset) {
    Write-Fail "No Windows installer (.exe) found in release $version. Check https://github.com/$Repo/releases/latest"
}

$downloadUrl = $asset.browser_download_url
$fileName    = $asset.name

Write-Info "Downloading $fileName…"

$tmpDir      = $env:TEMP
$installerPath = Join-Path $tmpDir $fileName

# Download with progress
try {
    $dlHeaders = @{ 'Accept' = 'application/octet-stream' }
    if ($env:GITHUB_TOKEN) {
        $dlHeaders['Authorization'] = "Bearer $env:GITHUB_TOKEN"
    }
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -Headers $dlHeaders -UseBasicParsing
} catch {
    Write-Fail "Download failed: $_"
}

Write-Success "Download complete."

# ── Run the installer ──────────────────────────────────────────────────────────
Write-Info "Running installer (silent mode)…"
Write-Warn "If Windows SmartScreen appears, click 'More info' then 'Run anyway'."

try {
    $process = Start-Process -FilePath $installerPath -ArgumentList '/S' -PassThru -Wait
    if ($process.ExitCode -ne 0) {
        Write-Fail "Installer exited with code $($process.ExitCode)."
    }
} catch {
    # If /S (NSIS silent) is not supported, fall back to interactive mode
    Write-Warn "Silent install failed; launching interactive installer…"
    Start-Process -FilePath $installerPath -Wait
}

# ── Cleanup ────────────────────────────────────────────────────────────────────
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Success "OBS Board $version installed successfully!"
Write-Host ""
Write-Host "  Launch from the Start Menu or your Desktop shortcut." -ForegroundColor Gray
Write-Host ""
