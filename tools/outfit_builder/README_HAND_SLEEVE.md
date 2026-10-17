# Elyra Outfit 01 — Hand/Sleeve Clearance V1

This only extends the accepted body mask around the lower-arm/wrist seam.
Hand/finger/thumb influenced triangles are explicitly protected.

Run:

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\fix_hand_sleeve_clearance.py `
  "apps\web\public\models\templates\elyra-stanley.vrm" `
  --mask "apps\web\public\models\outfits\elyra-stanley-outfit-01.body-mask.json" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.body-mask.json"
```

No TypeScript or outfit GLB changes are required. Refresh Web after generation.
