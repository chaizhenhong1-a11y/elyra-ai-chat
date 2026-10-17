$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$py=Join-Path $PSScriptRoot "build-cute-human.py"
$exe="C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
if(-not (Test-Path $exe)){
  $exe=Get-ChildItem "C:\Program Files\Blender Foundation" -Recurse -Filter blender.exe -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if(-not $exe){throw "Blender not found."}
Write-Host "Using Blender: $exe"
& $exe --background --python $py -- $root
if($LASTEXITCODE -ne 0){throw "Blender exited with code $LASTEXITCODE"}
Write-Host "Elyra Cute Human V2 generated."
