$ErrorActionPreference="Stop"
$Root=Split-Path -Parent $PSScriptRoot
$Project="holysht"; $Region="asia-southeast1"; $Repo="elyra-ai"; $Service="elyra-image-to-3d"; $Tag="step33-5"
$Image="$Region-docker.pkg.dev/$Project/$Repo/${Service}:$Tag"
Write-Host "[1/2] Build + smoke tests..."
& gcloud.cmd builds submit (Join-Path $Root "cloud\image-to-3d") --project $Project --tag $Image
if($LASTEXITCODE -ne 0){throw "STEP33_5_BUILD_FAILED - NOT DEPLOYED"}
Write-Host "ELYRA_STEP33_5_BUILD_OK True"
Write-Host "[2/2] Deploying verified image..."
& gcloud.cmd run deploy $Service --image $Image --project $Project --region $Region --execution-environment gen2 --gpu 1 --gpu-type nvidia-l4 --no-gpu-zonal-redundancy --cpu 4 --memory 16Gi --no-cpu-throttling --concurrency 1 --min 0 --max 1 --timeout 3600 --no-allow-unauthenticated --set-env-vars "ELYRA_HUNYUAN_MODEL=tencent/Hunyuan3D-2mini,ELYRA_HUNYUAN_SUBFOLDER=hunyuan3d-dit-v2-mini-turbo"
if($LASTEXITCODE -ne 0){throw "STEP33_5_DEPLOY_FAILED"}
Write-Host "ELYRA_STEP33_5_DEPLOYED True"
