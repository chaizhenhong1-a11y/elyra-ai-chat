# Elyra Outfit Builder V3 — compact stage

Run after V2:

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\build_outfit_v3.py `
  "apps\web\public\models\outfits\elyra-stanley-outfit-01.glb" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.compact.glb"
```

Do not wire this into Web yet. Return the complete console output first.
The next stage validates the compact GLB and creates the body-mask metadata.
