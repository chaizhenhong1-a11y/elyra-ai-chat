$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "apps\admin\public\animations"
$OutFile = Join-Path $OutDir "idle_loop.vrma"
$Url = "https://raw.githubusercontent.com/pixiv/ChatVRM/main/public/idle_loop.vrma"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Write-Host "Downloading pixiv ChatVRM MIT idle_loop.vrma..."
Invoke-WebRequest -Uri $Url -OutFile $OutFile

$item = Get-Item $OutFile
if ($item.Length -lt 100000) { throw "Downloaded VRMA is unexpectedly small: $($item.Length) bytes" }
$magic = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($OutFile)[0..3])
if ($magic -ne "glTF") { throw "Downloaded file is not a binary glTF/VRMA (magic=$magic)" }

Write-Host "ELYRA_STEP43_VRMA_READY True"
Write-Host "ELYRA_IDLE_VRMA $OutFile"
Write-Host "ELYRA_IDLE_VRMA_BYTES $($item.Length)"
