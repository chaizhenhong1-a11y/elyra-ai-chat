$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Blender = $env:BLENDER_PATH
if (-not $Blender) { $Blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' }
if (-not (Test-Path $Blender)) { throw "Blender not found: $Blender" }

$Builder = Join-Path $PSScriptRoot 'blender\beautify_elyra_q_mother.py'
$Blend = Join-Path $Root 'assets\character\elyra-chibi-v1.blend'
$DefaultGlb = Join-Path $Root 'apps\admin\public\models\generated\elyra-chibi-v1-default.glb'

Write-Host '[1/3] Rebuilding ELYRA_CHIBI_V1 as a native Q mother mesh (no MPFB, no photo, no OpenAI)...'
& $Blender --background --python-exit-code 1 --python $Builder -- --output $Blend --default-glb $DefaultGlb
if ($LASTEXITCODE -ne 0) { throw 'Native Q mother mesh build failed.' }
if (-not (Test-Path $Blend)) { throw 'Missing elyra-chibi-v1.blend.' }
if (-not (Test-Path $DefaultGlb)) { throw 'Missing default Q mother GLB.' }

Write-Host '[2/3] Native Q mother mesh and default validation GLB created.'
Write-Host "BLEND: $Blend"
Write-Host "GLB:   $DefaultGlb"

Write-Host '[3/3] Pointing local Admin preview to the default mother mesh (no photo generation)...'
try {
  $api = 'http://localhost:4000/api/v1/character'
  $character = Invoke-RestMethod -Method Get -Uri $api
  if (-not $character.characterConfig) { $character | Add-Member -NotePropertyName characterConfig -NotePropertyValue ([pscustomobject]@{}) }
  if ($character.characterConfig.PSObject.Properties.Name -contains 'generation') {
    $character.characterConfig.generation = [pscustomobject]@{
      status = 'mother_mesh_validation'
      modelUrl = '/models/generated/elyra-chibi-v1-default.glb'
      message = 'Native ELYRA_CHIBI_V1 default mother mesh validation'
    }
  } else {
    $character.characterConfig | Add-Member -NotePropertyName generation -NotePropertyValue ([pscustomobject]@{
      status = 'mother_mesh_validation'
      modelUrl = '/models/generated/elyra-chibi-v1-default.glb'
      message = 'Native ELYRA_CHIBI_V1 default mother mesh validation'
    })
  }
  $json = $character | ConvertTo-Json -Depth 20
  Invoke-RestMethod -Method Put -Uri $api -ContentType 'application/json' -Body $json | Out-Null
  Write-Host 'ELYRA_ADMIN_DEFAULT_PREVIEW_OK'
} catch {
  Write-Warning 'Base was built successfully, but local API preview could not be switched. Keep API running and rerun this script.'
  Write-Warning $_.Exception.Message
}

Write-Host 'ELYRA_STEP30_OK'
