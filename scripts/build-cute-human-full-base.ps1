$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

if (-not (Test-Path $blender)) {
  $blender = Get-ChildItem "C:\Program Files\Blender Foundation" -Recurse -Filter blender.exe -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $blender) { throw "Blender not found." }

$script = Join-Path $PSScriptRoot "build-cute-human-full-base.py"
& $blender --background --factory-startup --python $script -- "$projectRoot"
if ($LASTEXITCODE -ne 0) { throw "Blender build failed: $LASTEXITCODE" }

$out = Join-Path $projectRoot "assets\character\elyra-cute-human-v2.blend"
if (-not (Test-Path $out)) { throw "Missing output: $out" }

Write-Host ""
Write-Host "ELYRA_FULL_BASE_BUILD_OK"
Write-Host $out
