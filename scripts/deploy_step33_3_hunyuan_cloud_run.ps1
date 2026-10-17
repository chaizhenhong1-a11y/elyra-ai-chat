# Windows PowerShell 5.1 converts stderr from native commands into NativeCommandError
# records when ErrorActionPreference=Stop. gcloud writes harmless progress text to
# stderr, so native commands must be allowed to finish and are judged by exit code.
$ErrorActionPreference = "Continue"

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)." }
}
$Root = Split-Path -Parent $PSScriptRoot
$Project = "holysht"
$Region = "asia-southeast1"
$Repo = "elyra-ai"
$Service = "elyra-image-to-3d"
$Image = "$Region-docker.pkg.dev/$Project/$Repo/$Service`:step33-3"
$Source = Join-Path $Root "cloud\image-to-3d"

Write-Host "[1/6] Checking Google Cloud project..."
$activeProject = (& gcloud.cmd config get-value project 2>$null).Trim()
if ($activeProject -ne $Project) { throw "Expected project '$Project', got '$activeProject'." }

Write-Host "[2/6] Ensuring Artifact Registry repository exists..."
# gcloud prints a harmless "Listing items..." status line to stderr. Under
# Windows PowerShell 5.1 this may appear as NativeCommandError, but it is not
# a failure. We let the process finish and trust only $LASTEXITCODE.
$repoRows = @(& gcloud.cmd artifacts repositories list `
  --location=$Region `
  --project=$Project `
  --filter="name~'/repositories/$Repo$'" `
  --format="value(name)" 2>$null)
Assert-NativeSuccess "Artifact Registry repository lookup"
$repoName = ($repoRows | Where-Object { $_ -match "/repositories/$([regex]::Escape($Repo))$" } | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($repoName)) {
  Write-Host "Artifact Registry repository '$Repo' not found; creating it..."
  & gcloud.cmd artifacts repositories create $Repo `
    --repository-format=docker `
    --location=$Region `
    --project=$Project `
    --description="Elyra AI GPU images"
  Assert-NativeSuccess "Artifact Registry repository creation"
  Write-Host "Artifact Registry repository '$Repo' created."
} else {
  Write-Host "Artifact Registry repository '$Repo' already exists."
}

Write-Host "[3/6] Building Hunyuan3D container (first build can take a while)..."
& gcloud.cmd builds submit $Source --tag $Image --project=$Project --machine-type=e2-highcpu-8 --disk-size=100
Assert-NativeSuccess "Cloud Build"

Write-Host "[4/6] Deploying isolated Cloud Run L4 service..."
& gcloud.cmd run deploy $Service `
  --image $Image `
  --project $Project `
  --region $Region `
  --execution-environment gen2 `
  --gpu 1 `
  --gpu-type nvidia-l4 `
  --no-gpu-zonal-redundancy `
  --cpu 4 `
  --memory 16Gi `
  --no-cpu-throttling `
  --concurrency 1 `
  --min 0 `
  --max 1 `
  --timeout 3600 `
  --no-allow-unauthenticated `
  --set-env-vars "ELYRA_HUNYUAN_MODEL=tencent/Hunyuan3D-2mini,ELYRA_HUNYUAN_SUBFOLDER=hunyuan3d-dit-v2-mini-turbo"
Assert-NativeSuccess "Cloud Run deployment"

Write-Host "[5/6] Granting the active Google account permission to invoke this private service..."
$Account = (& gcloud.cmd config get-value account 2>$null).Trim()
& gcloud.cmd run services add-iam-policy-binding $Service --region=$Region --project=$Project --member="user:$Account" --role="roles/run.invoker" | Out-Null
Assert-NativeSuccess "Grant Cloud Run Invoker to $Account"

Write-Host "[6/6] Resolving endpoint..."
$BaseUrl = (& gcloud.cmd run services describe $Service --region=$Region --project=$Project --format="value(status.url)").Trim()
if (-not $BaseUrl) { throw "Could not resolve Cloud Run service URL." }
$GenerateUrl = "$BaseUrl/generate"

Write-Host "ELYRA_STEP33_3_DEPLOYED True"
Write-Host "ELYRA_IMAGE_TO_3D_BASE $BaseUrl"
Write-Host "ELYRA_IMAGE_TO_3D_URL $GenerateUrl"
Write-Host "ELYRA_IMAGE_TO_3D_AUTH google"
Write-Host ""
Write-Host "Next (same Terminal 4):"
Write-Host "`$env:ELYRA_IMAGE_TO_3D_URL='$GenerateUrl'"
Write-Host "`$env:ELYRA_IMAGE_TO_3D_AUTH='google'"
Write-Host "powershell -ExecutionPolicy Bypass -File .\scripts\setup_step32_image_to_3d.ps1"
