# Elyra Outfit Builder V1

This is the clean-baseline start of the real outfit pipeline.

It does not use the failed dual-full-VRM runtime approach.

Run from the Elyra root:

```powershell
python tools\outfit_builder\build_outfit.py `
  "apps\web\public\models\outfits\elyra-stanley-outfit-01.vrm" `
  --id outfit-01 `
  --name "套装 1" `
  --output "apps\web\public\models\outfits\elyra-stanley-outfit-01.manifest.json"
```

V1 produces a deterministic manifest of the actual VRoid `_CLOTH` primitives.
The next builder stage will compact those primitives + required skin/bones/textures
into a standalone lightweight GLB and generate its body-mask data.
