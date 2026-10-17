$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
if (-not (Test-Path $blender)) {
  $blender = Get-ChildItem "C:\Program Files\Blender Foundation" -Recurse -Filter blender.exe -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $blender) { throw "Blender not found." }

$script = Join-Path $PSScriptRoot "prepare-cute-human-sculpt-workspace.py"
& $blender --background --python $script -- "$projectRoot"
if ($LASTEXITCODE -ne 0) { throw "Sculpt workspace setup failed." }

$out = Join-Path $projectRoot "assets\character\elyra-cute-human-sculpt-v1.blend"
if (-not (Test-Path $out)) { throw "Missing output: $out" }

Write-Host "ELYRA_SCULPT_WORKSPACE_OK"
Write-Host $out
