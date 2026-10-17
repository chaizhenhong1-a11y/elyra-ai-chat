$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

if (-not (Test-Path $blender)) {
  $blender = Get-ChildItem "C:\Program Files\Blender Foundation" -Recurse -Filter blender.exe -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $blender) { throw "Blender not found." }

$script = Join-Path $PSScriptRoot "create-cute-human-authoring-file.py"

Write-Host "Using Blender: $blender"
Write-Host "Project root: $projectRoot"

& $blender --background --factory-startup --python $script -- "$projectRoot"
if ($LASTEXITCODE -ne 0) {
  throw "Character generation failed. Blender exit code: $LASTEXITCODE"
}

$out = Join-Path $projectRoot "assets\character\elyra-cute-human-v1.blend"
if (-not (Test-Path $out)) { throw "Expected .blend was not created: $out" }

Write-Host ""
Write-Host "ELYRA_AUTHORING_BUILD_OK"
Write-Host "Open this exact file:"
Write-Host $out
