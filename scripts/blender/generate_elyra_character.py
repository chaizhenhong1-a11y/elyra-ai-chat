import bpy,json,sys
from pathlib import Path

REQUIRED_MORPHS=(
    "faceWidth","faceLength","jawWidth","chinLength","cheekFullness",
    "eyeSize","eyeSpacing","eyeHeight","noseWidth","noseLength",
    "mouthWidth","lipFullness",
)

def arg(name):
    args=sys.argv[sys.argv.index("--")+1:]
    return args[args.index(name)+1]

def all_shape_keys():
    found={}
    for obj in bpy.data.objects:
        keys=getattr(getattr(obj,"data",None),"shape_keys",None)
        if not keys: continue
        for key in keys.key_blocks:
            found.setdefault(key.name,[]).append((obj,key))
    return found

def require_production_base():
    # A production Elyra base must opt in explicitly. This prevents an old
    # prototype .blend from silently becoming the generated character.
    scene=bpy.context.scene
    if not bool(scene.get("elyraProductionBase",False)) or scene.get("elyraStyleId") != "ELYRA_CHIBI_V1":
        raise RuntimeError("ELYRA_BASE_NOT_APPROVED: requires approved ELYRA_CHIBI_V1 mother mesh")
    keys=all_shape_keys()
    missing=[name for name in REQUIRED_MORPHS if name not in keys]
    if missing:
        raise RuntimeError("ELYRA_MISSING_MORPHS: "+", ".join(missing))
    return keys

def srgb(hex_color):
    h=hex_color.lstrip("#")
    return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,)

job=json.loads(Path(arg("--profile")).read_text(encoding="utf-8"))
p=job["profile"]
out=job["output"]
keys=require_production_base()
values={
    "faceWidth":p["face"]["faceWidth"],
    "faceLength":p["face"]["faceLength"],
    "jawWidth":p["face"]["jawWidth"],
    "chinLength":p["face"]["chinSize"],
    "cheekFullness":p["face"]["cheekFullness"],
    "eyeSize":p["face"]["eyeSize"],
    "eyeSpacing":p["face"]["eyeSpacing"],
    "eyeHeight":p["face"]["eyeHeight"],
    "noseWidth":p["face"]["noseWidth"],
    "noseLength":p["face"]["noseLength"],
    "mouthWidth":p["face"]["mouthWidth"],
    "lipFullness":p["face"]["lipFullness"],
}
for name,value in values.items():
    # API already compresses identity variation; Blender adds a second hard safety clamp.
    influence=max(-0.36,min(0.36,(float(value)-0.5)*2.0))
    for _,key in keys[name]:
        key.value=influence

for mat in bpy.data.materials:
    if "skin" in mat.name.lower():
        mat.diffuse_color=srgb(p["skin"]["tone"])

# Export only renderable objects; cameras/lights from the authoring file stay out.
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.context.scene.objects:
    if obj.type in {"MESH","ARMATURE","EMPTY"} and not obj.hide_render:
        obj.select_set(True)
Path(out).parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    use_selection=True,
    export_apply=False,
    export_morph=True,
    export_skins=True,
)
print("ELYRA_CHARACTER_GLB_OK",out)
