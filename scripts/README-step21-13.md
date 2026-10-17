# Elyra Step 21.13 — Sculpt Workspace

This patch deliberately does NOT generate another fake finished character.

It:
- opens the existing V2 only as a hidden reference;
- creates a clean ELYRA_SCULPT collection;
- creates proportion landmarks;
- creates a symmetry reference plane;
- saves a dedicated sculpt authoring file;
- does not export/overwrite the Admin GLB.

Output:
assets\character\elyra-cute-human-sculpt-v1.blend

The actual character silhouette/face must now be modeled/sculpted in Blender.
Python will return later for rigging, shape keys, validation and GLB export.
