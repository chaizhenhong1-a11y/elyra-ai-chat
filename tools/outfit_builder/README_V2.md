# Elyra Outfit Builder V2

Run:

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\build_outfit_v2.py `
  "apps\web\public\models\outfits\elyra-stanley-outfit-01.vrm" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.glb"
```

V2 creates a clothing-only render asset: only `_CLOTH` primitives are drawable.
It keeps source skin/bone data losslessly for this first extraction stage and removes
the avatar-level VRM extension.

Send the complete console output back before wiring the GLB into Web.
