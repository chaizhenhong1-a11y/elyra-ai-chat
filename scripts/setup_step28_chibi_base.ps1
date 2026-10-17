$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Blender = $env:BLENDER_PATH
if (-not $Blender) { $Blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' }
if (-not (Test-Path $Blender)) { throw "Blender not found: $Blender" }

$MpfbCandidates = @(
  (Join-Path $env:APPDATA 'Blender Foundation\Blender\5.2\extensions\.user\blender_org\mpfb'),
  (Join-Path $env:APPDATA 'Blender Foundation\Blender\5.2\extensions\blender_org\mpfb')
)
$MpfbInstalled = $false
foreach ($candidate in $MpfbCandidates) {
  if (Test-Path $candidate) {
    $MpfbInstalled = $true
    Write-Host "[1/3] MPFB already installed: $candidate"
    break
  }
}

if (-not $MpfbInstalled) {
  Write-Host '[1/3] Installing/enabling MPFB from Blender Extensions...'
  & $Blender --command extension install -s -e mpfb
  if ($LASTEXITCODE -ne 0) { throw 'MPFB extension installation failed.' }
} else {
  Write-Host '[1/3] Skipping extension install.'
}

Write-Host '[2/3] Building ELYRA_CHIBI_V1 v4 rebuilt Q-body mother mesh...'
$Builder = Join-Path $PSScriptRoot 'blender\build_elyra_chibi_v1.py'
$Output = Join-Path $Root 'assets\character\elyra-chibi-v1.blend'
& $Blender --background --python-exit-code 1 --python $Builder -- --output $Output
if ($LASTEXITCODE -ne 0) { throw 'ELYRA_CHIBI_V1 build failed.' }
if (-not (Test-Path $Output)) { throw 'Builder finished without producing elyra-chibi-v1.blend.' }
Write-Host '[3/3] Base created and verified.'
Write-Host "ELYRA_CHIBI_V1_OK: $Output"
