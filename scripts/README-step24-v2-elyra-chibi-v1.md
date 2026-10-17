# Step 24 V2 — ELYRA_CHIBI_V1

This patch replaces the abandoned generic-human Step 24 direction.

## Locked rule
Every generated human starts from ONE approved mother mesh:
`assets/character/elyra-chibi-v1.blend`

OpenAI may extract visible identity differences only. It cannot select art style, head/body ratio, limb proportions, realism, or topology.

## Identity variation
The API compresses every facial measurement to a narrow range around neutral (0.32..0.68). Blender then clamps morph influence again to +/-0.36. This prevents different photos from producing radically different character proportions.

## Mother-mesh contract
The Blender scene must contain:
- `scene['elyraProductionBase'] = True`
- `scene['elyraStyleId'] = 'ELYRA_CHIBI_V1'`
- Shape keys: faceWidth, faceLength, jawWidth, chinLength, cheekFullness, eyeSize, eyeSpacing, eyeHeight, noseWidth, noseLength, mouthWidth, lipFullness

The mother mesh itself owns the Q/chibi proportions. Those proportions are never inferred from the photo.

## Important
This patch intentionally does NOT procedurally create another sphere/cylinder/metaball character. A polished mother mesh is an authored 3D asset; generation remains `awaiting_base_mesh` until that approved asset exists.
