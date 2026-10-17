# Elyra Step 29 — Native Q Mother Mesh

This step abandons the MPFB/adult-body-to-chibi deformation route.

It builds `ELYRA_CHIBI_V1` as a native Q/chibi mother mesh from scratch, with one continuous remeshed body surface, separate style-locked eyes/iris/nose/mouth, and the existing 12 identity Shape Keys. It does not call OpenAI and does not use a photo.

Outputs:
- `assets/character/elyra-chibi-v1.blend`
- `apps/admin/public/models/generated/elyra-chibi-v1-default.glb`

The setup script also points the local Admin character record at the default GLB so the mother mesh can be visually accepted/rejected before photo generation is re-enabled.
