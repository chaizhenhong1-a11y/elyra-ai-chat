$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "apps\admin\public\animations"
$OutFile = Join-Path $OutDir "standing_idle.vrma"
$Url = "https://raw.githubusercontent.com/SkyeShark/claudes-body/main/assets/animations/Standing%20Idle.vrma"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Write-Host "Downloading standing idle VRMA..."
Invoke-WebRequest -Uri $Url -OutFile $OutFile
if (!(Test-Path $OutFile)) { throw "standing_idle.vrma download failed" }
$bytes = (Get-Item $OutFile).Length
if ($bytes -lt 1024) { throw "standing_idle.vrma looks invalid ($bytes bytes)" }
Write-Host "ELYRA_STEP46_STANDING_IDLE_READY True"
Write-Host "ELYRA_STANDING_IDLE $OutFile"
Write-Host "ELYRA_STANDING_IDLE_BYTES $bytes"
