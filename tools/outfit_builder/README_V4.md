# Elyra Outfit Builder V4

Validate the 1.40 MB compact outfit and analyze the real Stanley skeleton for
body-mask candidates. This stage does not touch Web.

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\validate_outfit_v4.py `
  "apps\web\public\models\outfits\elyra-stanley-outfit-01.compact.glb" `
  --base "apps\web\public\models\templates\elyra-stanley.vrm" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.validation.json"
```

Return the complete output. Do not wire the compact GLB into Web yet.
