# Elyra Step 32 — Reference → real GLB bridge

This patch does **not** create another procedural body. It freezes the approved Elyra Q visual direction as an input reference and adds a provider-neutral bridge for a Hunyuan3D-compatible `/generate` API.

Run:

```powershell
cd "C:\flutter project\elyra"
powershell -ExecutionPolicy Bypass -File .\scripts\setup_step32_image_to_3d.ps1
```

Without `ELYRA_IMAGE_TO_3D_URL`, the script only verifies that the bridge/reference are installed and exits safely. It never overwrites `ELYRA_CHIBI_V1`.

When a GPU endpoint exists:

```powershell
$env:ELYRA_IMAGE_TO_3D_URL="https://YOUR-ENDPOINT/generate"
powershell -ExecutionPolicy Bypass -File .\scripts\setup_step32_image_to_3d.ps1
```

Successful output is copied to `apps/admin/public/models/elyra-q-v1-generated.glb` for the next Admin preview step.
