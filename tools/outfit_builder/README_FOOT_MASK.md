# Elyra Outfit 01 Foot/Toe Mask Fix V1

Only the shoe/foot mask is strengthened. Existing accepted body masking is preserved.

Run:

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\fix_foot_toe_mask.py `
  "apps\web\public\models\templates\elyra-stanley.vrm" `
  --mask "apps\web\public\models\outfits\elyra-stanley-outfit-01.body-mask.json" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.body-mask.json"
```

Then refresh Web. No TypeScript/runtime file changes are required because the existing
integration already fetches this body-mask JSON.
