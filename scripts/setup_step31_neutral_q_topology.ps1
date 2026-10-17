$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
if (!(Test-Path $Blender)) { throw "Blender 5.2 not found: $Blender" }

$Cache = Join-Path $Root '.elyra_cache\blender-human-base-meshes'
$Zip = Join-Path $Cache 'human-base-meshes-v1.4.1.zip'
$Extract = Join-Path $Cache 'v1.4.1'
$Url = 'https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip'
$OutDir = Join-Path $Root 'assets\character\reference'
$Report = Join-Path $OutDir 'elyra-neutral-topology-report.json'
$Preview = Join-Path $OutDir 'elyra-neutral-topology-preview.glb'
$Selection = Join-Path $OutDir 'elyra-neutral-topology-selection.json'
$Script = Join-Path $Root 'scripts\blender\inspect_elyra_neutral_topology.py'

New-Item -ItemType Directory -Force -Path $Cache,$OutDir | Out-Null
Write-Host '[1/4] Reusing Blender Studio Human Base Meshes v1.4.1 (CC0)...'
if (!(Test-Path $Zip)) {
  Write-Host '[1/4] Cache missing; downloading bundle...'
  Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing
} else { Write-Host '[1/4] Cached bundle found; skipping download.' }

Write-Host '[2/4] Checking extracted asset bundle...'
if (!(Test-Path $Extract)) {
  New-Item -ItemType Directory -Force -Path $Extract | Out-Null
  Expand-Archive -LiteralPath $Zip -DestinationPath $Extract -Force
}
$BlendFiles = @(Get-ChildItem -Path $Extract -Recurse -Filter '*.blend' -File)
if ($BlendFiles.Count -eq 0) { throw 'Official bundle extracted, but no .blend files were found.' }
Write-Host "[2/4] Found $($BlendFiles.Count) Blender asset file(s). Selection will use internal asset names, not filenames."

Write-Host '[3/4] Scanning internal Collections/Objects for the Stylized human body...'
& $Blender --background --python $Script -- --root $Extract --report $Report --preview $Preview --selection $Selection
if ($LASTEXITCODE -ne 0) { throw "Blender inspection failed with exit code $LASTEXITCODE" }
if (!(Test-Path $Preview)) { throw "Neutral preview was not created: $Preview" }
if (!(Test-Path $Report)) { throw "Topology report was not created: $Report" }

Write-Host '[4/4] Neutral stylized candidate prepared. Existing ELYRA_CHIBI_V1 was NOT replaced.'
Write-Host "ELYRA_NEUTRAL_REPORT $Report"
Write-Host "ELYRA_NEUTRAL_PREVIEW $Preview"
Write-Host "ELYRA_NEUTRAL_SELECTION $Selection"
Write-Host 'ELYRA_EXISTING_MOTHER_UNTOUCHED True'
Write-Host 'ELYRA_STEP31_FIX1_OK'
