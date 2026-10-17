# Elyra Step 25 — ELYRA_CHIBI_V1 real-topology bootstrap

This replaces the old sphere/cylinder prototype route.

- Source topology: MPFB / MakeHuman real basemesh (MPFB assets are CC0).
- Style is locked once into `ELYRA_CHIBI_V1`; photos never choose topology/head-body ratio/art style.
- 12 identity morph keys are created on the same mother mesh.
- Existing Step 24 V2 generation pipeline can then open this `.blend` headlessly and apply only bounded identity differences.

## One-time setup (Terminal 4)

```powershell
cd "C:\flutter project\elyra"
powershell -ExecutionPolicy Bypass -File .\scripts\setup_step25_chibi_base.ps1
```

Expected final line:

`ELYRA_CHIBI_V1_OK: C:\flutter project\elyra\assets\character\elyra-chibi-v1.blend`

After that, restart API and use Admin -> AI Character -> Upload Photo -> Generate Character.

This package intentionally does not redistribute MPFB program code. The setup installs MPFB through Blender's extension mechanism and then creates Elyra's local `.blend` mother mesh.
