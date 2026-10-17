# Step 31 Fix 1

Fixes the v1.4.1 Blender Studio Human Base Meshes discovery bug.

The asset bundle does not guarantee that filenames contain `stylized`. This version scans internal Blender Collection/Object names and selects a non-primitive Stylized human body candidate. It reuses the existing cached ZIP/extraction and does not replace `ELYRA_CHIBI_V1`.
