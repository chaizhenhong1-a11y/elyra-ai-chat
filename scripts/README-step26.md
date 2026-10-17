# Step 26 — ELYRA_CHIBI_V1 topology repair

Rebuilds the mother mesh from MPFB while physically removing helper/joint geometry before GLB export. This fixes the hood/skirt monster caused by hidden helper geometry being serialized. It also replaces the aggressive body warp with conservative locked chibi proportions and recreates all 12 face morphs.
