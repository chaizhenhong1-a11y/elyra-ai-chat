$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Input = Join-Path $Root "assets\character\reference\elyra-q-v1-front-reference.png"
$Output = Join-Path $Root "assets\character\reference\elyra-q-v1-generated.glb"
$AdminModel = Join-Path $Root "apps\admin\public\models\elyra-q-v1-generated.glb"

Write-Host "[1/3] Elyra Q reference ready: $Input"
if (-not (Test-Path $Input)) { throw "Reference image missing: $Input" }
if (-not $env:ELYRA_IMAGE_TO_3D_URL) {
  Write-Host "[2/3] Image-to-3D endpoint is not configured yet."
  Write-Host "ELYRA_STEP32_BRIDGE_READY True"
  Write-Host "ELYRA_REFERENCE_READY $Input"
  Write-Host "Set ELYRA_IMAGE_TO_3D_URL to the cloud Hunyuan3D-compatible /generate endpoint, then rerun this script."
  exit 0
}
Write-Host "[2/3] Generating real GLB through $env:ELYRA_IMAGE_TO_3D_URL ..."
python (Join-Path $PSScriptRoot "elyra_image_to_3d.py") --image $Input --out $Output --url $env:ELYRA_IMAGE_TO_3D_URL
if ($LASTEXITCODE -ne 0) { throw "Image-to-3D generation failed." }
Write-Host "[3/3] Publishing generated GLB to Admin..."
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $AdminModel) | Out-Null
Copy-Item $Output $AdminModel -Force
Write-Host "ELYRA_STEP32_OK"
Write-Host "ELYRA_GENERATED_GLB $Output"
Write-Host "ELYRA_ADMIN_GLB $AdminModel"
