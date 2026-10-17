# Elyra Outfit 01 — Coat Body Fit V1

Light adjustment only: coat torso/body is pulled inward by **4% horizontally**.
Sleeve/arm-weighted vertices, coat length, trousers and shoes are untouched.

Run:

```powershell
cd "C:\flutter project\elyra"

python tools\outfit_builder\fit_coat_body.py `
  "apps\web\public\models\outfits\elyra-stanley-outfit-01.compact.glb" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.compact.fit.glb"
```

First return the console output. If the selection count is sensible, replace the
current compact asset with the `.fit.glb` for visual testing.
