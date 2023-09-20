#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

# Test that we can install the latest version at the default location.
Remove-Item "~\.ergomatic" -Recurse -Force -ErrorAction SilentlyContinue
$env:ERGOMATIC_INSTALL = ""
$v = $null; .\scripts\install\install.ps1
~\.ergomatic\bin\ergomatic.exe --version

# Test that we can install a specific version at a custom location.
Remove-Item "~\ergomatic-0.0.1" -Recurse -Force -ErrorAction SilentlyContinue
$env:ERGOMATIC_INSTALL = "$Home\ergomatic-0.0.1"
$v = "0.0.1"; .\scripts\install\install.ps1
$ErgomaticVersion = ~\ergomatic-0.0.1\bin\ergomatic.exe --version
if (!($ErgomaticVersion -like '*0.0.1*')) {
  throw $ErgomaticVersion
}

# Test that we can install at a relative custom location.
Remove-Item "bin" -Recurse -Force -ErrorAction SilentlyContinue
$env:ERGOMATIC_INSTALL = "."
$v = "0.0.1"; .\scripts\install\install.ps1
$ErgomaticVersion = bin\ergomatic.exe --version
if (!($ErgomaticVersion -like '*0.0.1*')) {
  throw $ErgomaticVersion
}
