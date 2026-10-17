import bpy, os, sys

def fail(msg):
    print("ELYRA_SCULPT_SETUP_FAILED:", msg)
    raise RuntimeError(msg)

if "--" not in sys.argv:
    fail("Missing project root")
args = sys.argv[sys.argv.index("--")+1:]
if not args:
    fail("Missing project root")

ROOT = os.path.abspath(args[0])
SRC = os.path.join(ROOT, "assets", "character", "elyra-cute-human-v2.blend")
OUT = os.path.join(ROOT, "assets", "character", "elyra-cute-human-sculpt-v1.blend")

if not os.path.exists(SRC):
    fail("Missing source file: " + SRC)

bpy.ops.wm.open_mainfile(filepath=SRC)

# Keep V2 only as proportion/reference material. It is NOT the final character.
ref = bpy.data.collections.get("ELYRA_V2_REFERENCE")
if ref is None:
    ref = bpy.data.collections.new("ELYRA_V2_REFERENCE")
    bpy.context.scene.collection.children.link(ref)

for obj in list(bpy.context.scene.objects):
    if obj.type in {"MESH", "CURVE"}:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        ref.objects.link(obj)
        obj.hide_render = True
        obj.hide_set(True)

# Create a dedicated collection for the hand-authored sculpt/model.
sculpt = bpy.data.collections.get("ELYRA_SCULPT")
if sculpt is None:
    sculpt = bpy.data.collections.new("ELYRA_SCULPT")
    bpy.context.scene.collection.children.link(sculpt)

# Empty anchor objects define proportions without pretending to generate the art.
landmarks = {
    "LM_FLOOR": (0,0,0),
    "LM_ANKLE": (0,0,.28),
    "LM_KNEE": (0,0,.82),
    "LM_HIP": (0,0,1.34),
    "LM_WAIST": (0,0,1.66),
    "LM_CHEST": (0,0,2.08),
    "LM_SHOULDER": (0,0,2.42),
    "LM_CHIN": (0,0,2.86),
    "LM_EYES": (0,0,3.39),
    "LM_HEAD_TOP": (0,0,3.88),
}
for name, loc in landmarks.items():
    o = bpy.data.objects.new(name, None)
    o.empty_display_type = 'PLAIN_AXES'
    o.empty_display_size = .10
    o.location = loc
    sculpt.objects.link(o)

# Symmetry plane/reference.
bpy.ops.mesh.primitive_plane_add(size=5, location=(0,.34,1.95), rotation=(1.57079632679,0,0))
plane = bpy.context.object
plane.name = "REFERENCE_SYMMETRY_PLANE"
for c in list(plane.users_collection):
    c.objects.unlink(plane)
sculpt.objects.link(plane)
plane.display_type = 'WIRE'
plane.hide_render = True

# Scene metadata / guardrails.
scene = bpy.context.scene
scene["elyra.characterSpec"] = "cute-human-sculpt-v1"
scene["elyra.status"] = "MANUAL_SCULPT_AUTHORING"
scene["elyra.rule"] = "Do not export to Admin until art approval."
scene["elyra.referenceOnly"] = "elyra-cute-human-v2"

# Useful sculpt defaults.
scene.tool_settings.use_mesh_automerge = True
scene.tool_settings.use_mesh_automerge_and_split = True

bpy.ops.wm.save_as_mainfile(filepath=OUT, check_existing=False)
print("ELYRA_MANUAL_SCULPT_WORKSPACE_OK")
print("OUTPUT:", OUT)
