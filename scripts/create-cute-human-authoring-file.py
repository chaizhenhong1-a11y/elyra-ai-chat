import bpy
import math
import os
import sys

def fail(msg):
    print("ELYRA_AUTHORING_BUILD_FAILED:", msg)
    raise RuntimeError(msg)

def get_root():
    if "--" not in sys.argv:
        fail("Missing project root argument.")
    args = sys.argv[sys.argv.index("--") + 1:]
    if not args:
        fail("Missing project root argument.")
    return os.path.abspath(args[0])

ROOT = get_root()
OUT_DIR = os.path.join(ROOT, "assets", "character")
OUT = os.path.join(OUT_DIR, "elyra-cute-human-v1.blend")
os.makedirs(OUT_DIR, exist_ok=True)

# Hard reset. We also explicitly verify Cube/Camera/Light are gone.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
    # Don't aggressively remove meshes after objects are made; this runs before creation only.
    for block in list(datablocks):
        if block.users == 0:
            datablocks.remove(block)

def material(name, rgba):
    m = bpy.data.materials.new(name=name)
    m.diffuse_color = rgba
    return m

skin = material("ELYRA_Skin", (0.80, 0.58, 0.47, 1.0))

def loft(name, rings, segments=32):
    verts = []
    faces = []
    for z, rx, ry, cx, cy in rings:
        for i in range(segments):
            a = 2.0 * math.pi * i / segments
            verts.append((cx + rx * math.cos(a), cy + ry * math.sin(a), z))

    for r in range(len(rings)-1):
        row = r * segments
        nxt = (r+1) * segments
        for i in range(segments):
            j = (i+1) % segments
            faces.append((row+i, row+j, nxt+j, nxt+i))

    # quad-friendly surface with triangle caps only at poles
    bottom_center = len(verts)
    verts.append((rings[0][3], rings[0][4], rings[0][0]))
    top_center = len(verts)
    verts.append((rings[-1][3], rings[-1][4], rings[-1][0]))
    last = (len(rings)-1) * segments
    for i in range(segments):
        j=(i+1)%segments
        faces.append((bottom_center, j, i))
        faces.append((top_center, last+i, last+j))

    mesh=bpy.data.meshes.new(name+"_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.validate(verbose=True)
    mesh.update()
    obj=bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(skin)
    for p in obj.data.polygons:
        p.use_smooth=True
    sub=obj.modifiers.new("ELYRA_Subdivision","SUBSURF")
    sub.levels=2
    sub.render_levels=2
    return obj

# Editable stylized authoring cages — no Blender primitive body parts.
head = loft("ELYRA_Head", [
    (2.80,.20,.18,0,0),
    (2.90,.36,.31,0,-.01),
    (3.02,.50,.42,0,-.025),
    (3.18,.61,.49,0,-.035),
    (3.36,.67,.52,0,-.02),
    (3.54,.65,.50,0,.00),
    (3.70,.54,.43,0,.02),
    (3.82,.34,.29,0,.025),
    (3.88,.15,.13,0,.02),
], 48)

body = loft("ELYRA_Body", [
    (.42,.16,.14,0,0),
    (.58,.22,.17,0,0),
    (.82,.25,.19,0,0),
    (1.08,.28,.21,0,0),
    (1.34,.32,.23,0,0),
    (1.58,.35,.25,0,0),
    (1.82,.34,.24,0,0),
    (2.04,.38,.25,0,0),
    (2.26,.45,.27,0,0),
    (2.46,.49,.28,0,0),
    (2.62,.35,.23,0,0),
    (2.75,.16,.14,0,0),
], 40)

head["elyra.role"]="head_base"
body["elyra.role"]="body_base"

def guide(name, pts):
    curve=bpy.data.curves.new(name+"_Curve","CURVE")
    curve.dimensions='3D'
    curve.bevel_depth=.008
    spline=curve.splines.new('POLY')
    spline.points.add(len(pts)-1)
    for p, co in zip(spline.points, pts):
        p.co=(*co,1.0)
    obj=bpy.data.objects.new(name,curve)
    bpy.context.scene.collection.objects.link(obj)
    return obj

guide("ELYRA_GUIDE_Eyes",[(-.48,-.54,3.42),(.48,-.54,3.42)])
guide("ELYRA_GUIDE_Nose",[(0,-.55,3.37),(0,-.57,3.18)])
guide("ELYRA_GUIDE_Mouth",[(-.21,-.54,3.04),(.21,-.54,3.04)])
guide("ELYRA_GUIDE_Shoulders",[(-.49,-.28,2.44),(.49,-.28,2.44)])
guide("ELYRA_GUIDE_Hips",[(-.34,-.25,1.55),(.34,-.25,1.55)])

bpy.context.scene["elyra.characterSpec"]="cute-human-v1"
bpy.context.scene["elyra.status"]="AUTHORING_NOT_PRODUCTION"

# Critical validation BEFORE save.
required = {
    "ELYRA_Head",
    "ELYRA_Body",
    "ELYRA_GUIDE_Eyes",
    "ELYRA_GUIDE_Nose",
    "ELYRA_GUIDE_Mouth",
    "ELYRA_GUIDE_Shoulders",
    "ELYRA_GUIDE_Hips",
}
actual=set(bpy.data.objects.keys())
missing=sorted(required-actual)
if missing:
    fail("Missing required objects: " + ", ".join(missing))

for forbidden in ("Cube","Camera","Light"):
    if forbidden in actual:
        fail("Default Blender object still exists: "+forbidden)

if len(head.data.vertices) < 100 or len(body.data.vertices) < 100:
    fail("Generated base mesh has unexpectedly few vertices.")

# Save, then verify Blender reports the exact filepath.
bpy.ops.wm.save_as_mainfile(filepath=OUT, check_existing=False)
saved=os.path.abspath(bpy.data.filepath)
expected=os.path.abspath(OUT)
if os.path.normcase(saved) != os.path.normcase(expected):
    fail(f"Saved to wrong path: {saved}")

print("ELYRA_REQUIRED_OBJECTS_OK")
print("ELYRA_NO_DEFAULT_CUBE_OK")
print("ELYRA_BLEND_SAVE_OK")
print("ELYRA_CUTE_AUTHORING_FILE_OK")
print("OUTPUT:", OUT)
