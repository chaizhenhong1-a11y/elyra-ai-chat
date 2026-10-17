# Elyra Outfit Builder V5 — triangle body mask

This stage generates mask metadata only. It does **not** change Web.

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\build_body_mask_v5.py `
  "apps\web\public\models\templates\elyra-stanley.vrm" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.body-mask.json"
```

The default threshold is 0.60 and the rule is conservative: a triangle is hidden
only when all three of its vertices are predominantly weighted to body regions
covered by Outfit 01. Head, neck and hands are not mask candidates.

Return the complete console output before runtime integration.
