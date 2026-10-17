# Step 23 — Elyra Cute Base Mesh contract

This patch intentionally disables the old procedural `elyra-cute-human-v1.glb` fallback.
Admin only previews a model when the photo pipeline has produced a real generated `modelUrl`.

The approved authoring file must be placed at:

`assets/character/elyra-cute-base.blend`

It is accepted by the automatic pipeline only when:

- Blender scene custom property `elyraProductionBase` is `true`.
- It contains the 12 required Shape Keys:
  `faceWidth`, `faceLength`, `jawWidth`, `chinLength`, `cheekFullness`,
  `eyeSize`, `eyeSpacing`, `eyeHeight`, `noseWidth`, `noseLength`,
  `mouthWidth`, `lipFullness`.
- Skin materials include `skin` in their material name.

Validation command (PowerShell):

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  --background "C:\flutter project\elyra\assets\character\elyra-cute-base.blend" `
  --python "C:\flutter project\elyra\scripts\blender\validate_elyra_cute_base.py"
```

Expected final line: `ELYRA_BASE_VALID`.

Important: Step 23 defines and enforces the production morph contract. It does not promote the old sausage/procedural mesh into the production base.
