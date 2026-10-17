import bpy, os, sys, math
from mathutils import Vector

# Elyra Cute Human V2
# Procedural continuous sculpt-style base. No third-party asset.
# Blender 5.2 target.

def root_path():
    if "--" in sys.argv:
        a=sys.argv[sys.argv.index("--")+1:]
        if a: return os.path.abspath(a[0])
    return os.path.abspath(os.path.join(os.path.dirname(__file__),".."))

ROOT=root_path()
OUT=os.path.join(ROOT,"apps","admin","public","models","elyra-cute-human-v1.glb")
os.makedirs(os.path.dirname(OUT),exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, color, rough=.55):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    if p:
        p.inputs["Base Color"].default_value=(*color,1)
        p.inputs["Roughness"].default_value=rough
    return m

SKIN=material("Skin",(0.78,0.53,0.40),.62)
HAIR=material("Hair",(0.075,0.035,0.022),.68)
EYE=material("EyeWhite",(0.97,0.965,0.94),.3)
IRIS=material("Iris",(0.10,0.055,0.035),.25)
LIP=material("Lip",(0.48,0.16,0.15),.48)
CLOTH=material("Outfit",(0.27,0.37,0.58),.72)
SHOE=material("Shoes",(0.07,0.075,0.10),.7)

def metabody():
    data=bpy.data.metaballs.new("ElyraBodyField")
    data.resolution=.055
    data.render_resolution=.04
    obj=bpy.data.objects.new("ElyraBodyField",data)
    bpy.context.collection.objects.link(obj)
    def ball(co,r,scale=(1,1,1)):
        e=data.elements.new()
        e.co=co
        e.radius=r
        # metaballs are isotropic; overlapping placement creates silhouette
        return e
    # head: layered volumes produce cheeks/chin instead of one sphere
    ball((0,0,3.34),.67)
    ball((-0.28,-.02,3.22),.46); ball((.28,-.02,3.22),.46)
    ball((0,-.015,3.08),.42)
    # neck / shoulders / torso / pelvis
    ball((0,0,2.69),.20)
    for x in (-.35,0,.35): ball((x,0,2.46),.35)
    ball((0,0,2.20),.49); ball((0,0,1.92),.43); ball((0,0,1.69),.43)
    # arms: enough overlapping points to create continuous curved limbs
    for s in (-1,1):
        for co,r in [
            ((s*.48,0,2.42),.25),((s*.65,0,2.24),.22),
            ((s*.76,-.01,2.02),.20),((s*.80,-.015,1.79),.18),
            ((s*.80,-.035,1.61),.19)
        ]: ball(co,r)
        # legs connected into pelvis
        for co,r in [
            ((s*.22,0,1.53),.28),((s*.23,0,1.28),.25),
            ((s*.23,0,1.02),.22),((s*.23,-.01,.76),.19),
            ((s*.23,-.03,.52),.18)
        ]: ball(co,r)
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj=bpy.context.object
    obj.name="CuteHumanBody"
    obj.data.materials.append(SKIN)
    # Smooth/remesh/subdivision for an actual continuous sculpted surface.
    for p in obj.data.polygons: p.use_smooth=True
    rem=obj.modifiers.new("CleanContinuousSurface","REMESH")
    rem.mode="VOXEL"; rem.voxel_size=.045; rem.use_smooth_shade=True
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=obj.modifiers.new("SoftSurface","SMOOTH"); sm.factor=.65; sm.iterations=5
    bpy.ops.object.modifier_apply(modifier=sm.name)
    sub=obj.modifiers.new("Subdivision","SUBSURF"); sub.levels=1; sub.render_levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    return obj

body=metabody()

def uv(name,loc,scale,mat,seg=48,rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

# Eyes are embedded into face, with soft proportions rather than bug-eye disks.
for s in (-1,1):
    uv("Eye.L" if s<0 else "Eye.R",(s*.245,-.565,3.39),(.185,.075,.205),EYE)
    uv("Iris.L" if s<0 else "Iris.R",(s*.245,-.632,3.385),(.083,.027,.098),IRIS)
# nose + lips
uv("Nose",(0,-.615,3.20),(.075,.055,.085),SKIN,40,24)
uv("Mouth",(0,-.621,3.035),(.145,.025,.040),LIP,40,20)

# Hair cap uses smooth overlapping sculpt pieces, not browser geometry.
uv("HairCap",(0,.04,3.67),(.66,.59,.39),HAIR,64,40)
for x,z,rx in [(-.40,3.53,.28),(-.16,3.59,.31),(.14,3.59,.31),(.40,3.52,.27)]:
    uv("HairFringe",(x,-.505,z),(rx,.095,.24),HAIR,40,24)

# Simple fitted outfit overlay, visually separates torso from skin.
uv("Top",(0,.015,2.19),(.46,.315,.48),CLOTH,56,32)
uv("Shorts",(0,.01,1.69),(.43,.31,.28),CLOTH,56,32)
for s in (-1,1):
    uv("Shoe.L" if s<0 else "Shoe.R",(s*.23,-.12,.34),(.23,.34,.16),SHOE,40,24)

# Real morph targets on continuous body mesh.
body.shape_key_add(name="Basis")
coords=[v.co.copy() for v in body.data.vertices]
def shape(name,fn):
    k=body.shape_key_add(name=name)
    for i,co in enumerate(coords): k.data[i].co=fn(co.copy())
    return k

def face_width(co):
    if co.z>2.78: co.x*=1.10
    return co
def face_length(co):
    if co.z>2.78:
        center=3.30; co.z=center+(co.z-center)*1.10
    return co
def cheek(co):
    if 3.05<co.z<3.38 and co.y<.05:
        co.x*=1.07; co.y-=.025
    return co
def body_width(co):
    if 1.55<co.z<2.62: co.x*=1.10
    return co
shape("faceWidth",face_width)
shape("faceLength",face_length)
shape("cheekFullness",cheek)
shape("bodyWidth",body_width)

# Armature metadata / future animation rig. Keep independent of identity morphs.
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
rig=bpy.context.object;rig.name="ElyraCuteRig"
eb=rig.data.edit_bones
root=eb[0];root.name="root";root.head=(0,0,.1);root.tail=(0,0,.45)
def bone(n,h,t,p=None):
    b=eb.new(n);b.head=h;b.tail=t;b.parent=p;return b
pel=bone("pelvis",(0,0,1.25),(0,0,1.75),root)
sp=bone("spine",(0,0,1.75),(0,0,2.48),pel)
ne=bone("neck",(0,0,2.48),(0,0,2.82),sp)
bone("head",(0,0,2.82),(0,0,3.62),ne)
for s,n in [(-1,"L"),(1,"R")]:
    ua=bone("upper_arm."+n,(s*.30,0,2.43),(s*.69,0,2.05),sp)
    bone("lower_arm."+n,(s*.69,0,2.05),(s*.80,0,1.62),ua)
    ul=bone("upper_leg."+n,(s*.20,0,1.58),(s*.23,0,1.04),pel)
    bone("lower_leg."+n,(s*.23,0,1.04),(s*.23,0,.40),ul)
bpy.ops.object.mode_set(mode="OBJECT")
rig["elyraAssetVersion"]="cute-human-v2-continuous"

bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=OUT,export_format="GLB",use_selection=False,export_apply=True,export_yup=True)
print("ELYRA_CUTE_HUMAN_V2_OK")
print(OUT)
