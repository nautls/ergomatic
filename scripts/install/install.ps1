#!/usr/bin/env pwsh
# Inspired by https://github.com/denoland/deno_install

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "v${v}"
}
if ($Args.Length -eq 1) {
  $Version = $Args.Get(0)
}

$ErgomaticInstall = $env:ERGOMATIC_INSTALL
$BinDir = if ($ErgomaticInstall) {
  "${ErgomaticInstall}\bin"
} else {
  "${Home}\.ergomatic\bin"
}

$ErgomaticExe = "$BinDir\ergomatic.exe"
$Target = 'x86_64-pc-windows-msvc'

$DownloadUrl = if (!$Version) {
  "https://github.com/nautls/ergomatic/releases/latest/download/ergomatic-${Target}.exe"
} else {
  "https://github.com/nautls/ergomatic/releases/download/${Version}/ergomatic-${Target}.exe"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe -Lo $ErgomaticExe $DownloadUrl

$User = [System.EnvironmentVariableTarget]::User
$Path = [System.Environment]::GetEnvironmentVariable('Path', $User)
if (!(";${Path};".ToLower() -like "*;${BinDir};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable('Path', "${Path};${BinDir}", $User)
  $Env:Path += ";${BinDir}"
}

Write-Output "Ergomatic was installed successfully to ${ErgomaticExe}"
Write-Output "Run 'ergomatic --help' to get started"
echo "Stuck? Join the Ergo Platform discord https://discord.gg/ergo-platform-668903786361651200"
