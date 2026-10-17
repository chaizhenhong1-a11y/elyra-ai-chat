import bpy,sys

REQUIRED=("faceWidth","faceLength","jawWidth","chinLength","cheekFullness","eyeSize","eyeSpacing","eyeHeight","noseWidth","noseLength","mouthWidth","lipFullness")
scene=bpy.context.scene
keys=set()
mesh_count=0
for obj in scene.objects:
    if obj.type=="MESH":
        mesh_count+=1
        sk=getattr(obj.data,"shape_keys",None)
        if sk: keys.update(k.name for k in sk.key_blocks)
missing=[x for x in REQUIRED if x not in keys]
errors=[]
if not bool(scene.get("elyraProductionBase",False)): errors.append("scene custom property elyraProductionBase=true is missing")
if mesh_count<1: errors.append("no mesh objects")
if missing: errors.append("missing shape keys: "+", ".join(missing))
if errors:
    print("ELYRA_BASE_INVALID")
    for e in errors: print(" -",e)
    sys.exit(2)
print("ELYRA_BASE_VALID")
print("mesh objects:",mesh_count)
print("required morphs:",len(REQUIRED))
