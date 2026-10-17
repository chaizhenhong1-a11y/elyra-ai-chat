# Elyra Cute Human V1 — authoring step

This patch intentionally does NOT overwrite the Admin GLB.

It creates an editable Blender authoring file from explicit quad loft topology.
No UV Sphere/Cylinder/Capsule/Metaball character assembly is used.

Run:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\create-cute-human-authoring-file.ps1"

Output:
assets\character\elyra-cute-human-v1.blend

Status:
AUTHORING_NOT_PRODUCTION

The next step is to refine the base mesh in Blender before rigging/exporting it.
