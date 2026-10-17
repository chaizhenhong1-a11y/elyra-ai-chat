import bpy, math, os, sys
from mathutils import Vector

def fail(msg):
    print("ELYRA_FULL_BASE_FAILED:", msg)
    raise RuntimeError(msg)

if "--" not in sys.argv:
    fail("Missing project root")
args=sys.argv[sys.argv.index("--")+1:]
if not args: fail("Missing project root")
ROOT=os.path.abspath(args[0])
OUTDIR=os.path.join(ROOT,"assets","character")
OUT=os.path.join(OUTDIR,"elyra-cute-human-v2.blend")
os.makedirs(OUTDIR,exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, rgba):
    m=bpy.data.materials.new(name)
    m.diffuse_color=rgba
    return m

skin=mat("ELYRA_Skin",(0.82,0.61,0.50,1))
eye_white=mat("ELYRA_EyeWhite",(0.96,0.96,0.94,1))
iris=mat("ELYRA_Iris",(0.12,0.075,0.045,1))
hair=mat("ELYRA_Hair",(0.075,0.035,0.020,1))
lip=mat("ELYRA_Lip",(0.55,0.20,0.20,1))

def loft(name,rings,segments=32,material=skin):
    verts=[]; faces=[]
    for z,rx,ry,cx,cy in rings:
        for i in range(segments):
            a=2*math.pi*i/segments
            verts.append((cx+rx*math.cos(a),cy+ry*math.sin(a),z))
    for r in range(len(rings)-1):
        for i in range(segments):
            j=(i+1)%segments
            a=r*segments+i; b=r*segments+j
            c=(r+1)*segments+j; d=(r+1)*segments+i
            faces.append((a,b,c,d))
    verts += [(rings[0][3],rings[0][4],rings[0][0]),
              (rings[-1][3],rings[-1][4],rings[-1][0])]
    bot=len(verts)-2; top=len(verts)-1; last=(len(rings)-1)*segments
    for i in range(segments):
        j=(i+1)%segments
        faces.append((bot,j,i))
        faces.append((top,last+i,last+j))
    me=bpy.data.meshes.new(name+"_Mesh")
    me.from_pydata(verts,[],faces); me.validate(); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    sub=ob.modifiers.new("ELYRA_Subdivision","SUBSURF"); sub.levels=2; sub.render_levels=2
    return ob

# Loft along arbitrary path. Local ring plane is approximately perpendicular to path.
def tube(name, centers, radii, segments=20, material=skin):
    verts=[]; faces=[]
    for idx,c in enumerate(centers):
        c=Vector(c)
        if idx==0: tangent=Vector(centers[1])-c
        elif idx==len(centers)-1: tangent=c-Vector(centers[idx-1])
        else: tangent=Vector(centers[idx+1])-Vector(centers[idx-1])
        tangent.normalize()
        ref=Vector((0,0,1))
        if abs(tangent.dot(ref))>.92: ref=Vector((0,1,0))
        u=tangent.cross(ref).normalized()
        v=tangent.cross(u).normalized()
        rx,ry=radii[idx]
        for i in range(segments):
            a=2*math.pi*i/segments
            p=c+u*(math.cos(a)*rx)+v*(math.sin(a)*ry)
            verts.append(tuple(p))
    for r in range(len(centers)-1):
        for i in range(segments):
            j=(i+1)%segments
            faces.append((r*segments+i,r*segments+j,(r+1)*segments+j,(r+1)*segments+i))
    me=bpy.data.meshes.new(name+"_Mesh"); me.from_pydata(verts,[],faces); me.validate(); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    sub=ob.modifiers.new("ELYRA_Subdivision","SUBSURF"); sub.levels=2; sub.render_levels=2
    return ob

# 4-head-ish cute proportions, deliberately slimmer and less toy-like than the rejected builds.
head=loft("ELYRA_Head",[
 (2.82,.17,.15,0,0),(2.91,.34,.29,0,-.005),(3.04,.49,.40,0,-.025),
 (3.19,.59,.47,0,-.035),(3.36,.63,.49,0,-.02),(3.54,.60,.46,0,.005),
 (3.69,.49,.38,0,.018),(3.80,.31,.25,0,.02),(3.86,.13,.11,0,.015)
],48)

neck=loft("ELYRA_Neck",[
 (2.58,.14,.12,0,0),(2.67,.15,.13,0,0),(2.76,.17,.14,0,0),(2.83,.18,.15,0,0)
],28)

torso=loft("ELYRA_Torso",[
 (1.40,.30,.21,0,0),(1.53,.35,.23,0,0),(1.70,.36,.24,0,0),
 (1.90,.34,.23,0,0),(2.10,.38,.24,0,0),(2.29,.45,.25,0,0),
 (2.44,.49,.26,0,0),(2.56,.39,.23,0,0)
],40)

pelvis=loft("ELYRA_Pelvis",[
 (1.13,.29,.22,0,0),(1.24,.35,.24,0,0),(1.38,.37,.24,0,0),(1.48,.32,.22,0,0)
],36)

# Arms: relaxed A-pose, with forearm taper.
left_arm=tube("ELYRA_Arm_L",
 [(-.43,0,2.43),(-.58,0,2.30),(-.68,0,2.08),(-.72,0,1.86),(-.70,0,1.66)],
 [(.15,.14),(.14,.13),(.12,.115),(.105,.10),(.09,.085)],22)
right_arm=tube("ELYRA_Arm_R",
 [( .43,0,2.43),( .58,0,2.30),( .68,0,2.08),( .72,0,1.86),( .70,0,1.66)],
 [(.15,.14),(.14,.13),(.12,.115),(.105,.10),(.09,.085)],22)

# Hands have palm + short thumb silhouette, not giant sphere hands.
left_hand=tube("ELYRA_Hand_L",
 [(-.70,0,1.68),(-.70,-.005,1.56),(-.69,-.01,1.43)],
 [(.095,.075),(.105,.075),(.065,.055)],18)
right_hand=tube("ELYRA_Hand_R",
 [( .70,0,1.68),( .70,-.005,1.56),( .69,-.01,1.43)],
 [(.095,.075),(.105,.075),(.065,.055)],18)

# Legs with thigh/knee/calf/ankle shaping.
left_leg=tube("ELYRA_Leg_L",
 [(-.18,0,1.22),(-.20,0,.99),(-.20,0,.77),(-.19,0,.57),(-.18,0,.34)],
 [(.18,.16),(.17,.15),(.13,.12),(.145,.13),(.09,.085)],24)
right_leg=tube("ELYRA_Leg_R",
 [( .18,0,1.22),( .20,0,.99),( .20,0,.77),( .19,0,.57),( .18,0,.34)],
 [(.18,.16),(.17,.15),(.13,.12),(.145,.13),(.09,.085)],24)

# Feet extend forward (negative Y is face/front in this authoring file).
left_foot=tube("ELYRA_Foot_L",
 [(-.18,0,.34),(-.18,-.10,.23),(-.18,-.25,.18),(-.18,-.36,.17)],
 [(.10,.09),(.12,.09),(.14,.085),(.11,.07)],20)
right_foot=tube("ELYRA_Foot_R",
 [( .18,0,.34),( .18,-.10,.23),( .18,-.25,.18),( .18,-.36,.17)],
 [(.10,.09),(.12,.09),(.14,.085),(.11,.07)],20)

# Face authoring geometry. These are separate on purpose; next stage will create eyelids/socket topology.
def ellipsoid(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o

eyeL=ellipsoid("ELYRA_Eye_L",(-.235,-.455,3.40),(.145,.075,.17),eye_white)
eyeR=ellipsoid("ELYRA_Eye_R",(.235,-.455,3.40),(.145,.075,.17),eye_white)
irisL=ellipsoid("ELYRA_Iris_L",(-.235,-.526,3.40),(.065,.022,.078),iris)
irisR=ellipsoid("ELYRA_Iris_R",(.235,-.526,3.40),(.065,.022,.078),iris)

nose=tube("ELYRA_Nose",[(0,-.44,3.31),(0,-.505,3.22),(0,-.535,3.17)],
          [(.055,.045),(.065,.05),(.075,.055)],18)
mouth=tube("ELYRA_Mouth",[(-.13,-.492,3.06),(0,-.515,3.045),(.13,-.492,3.06)],
           [(.025,.018),(.032,.022),(.025,.018)],16,lip)

# Ear forms.
earL=ellipsoid("ELYRA_Ear_L",(-.61,-.005,3.30),(.075,.055,.13),skin)
earR=ellipsoid("ELYRA_Ear_R",(.61,-.005,3.30),(.075,.055,.13),skin)

# Hair cap is preview/authoring geometry only; no primitive body assembly.
haircap=loft("ELYRA_HairCap",[
 (3.49,.57,.44,0,.035),(3.62,.55,.43,0,.04),(3.74,.46,.36,0,.045),
 (3.84,.29,.23,0,.04),(3.90,.10,.09,0,.03)
],40,hair)

# Organize collections.
names = {
 "01_BASE_BODY":["ELYRA_Head","ELYRA_Neck","ELYRA_Torso","ELYRA_Pelvis",
                 "ELYRA_Arm_L","ELYRA_Arm_R","ELYRA_Hand_L","ELYRA_Hand_R",
                 "ELYRA_Leg_L","ELYRA_Leg_R","ELYRA_Foot_L","ELYRA_Foot_R"],
 "02_FACE":["ELYRA_Eye_L","ELYRA_Eye_R","ELYRA_Iris_L","ELYRA_Iris_R",
            "ELYRA_Nose","ELYRA_Mouth","ELYRA_Ear_L","ELYRA_Ear_R"],
 "03_HAIR":["ELYRA_HairCap"],
}
for cname, objs in names.items():
    c=bpy.data.collections.new(cname); bpy.context.scene.collection.children.link(c)
    for n in objs:
        o=bpy.data.objects.get(n)
        if not o: fail("Missing "+n)
        for old in list(o.users_collection): old.objects.unlink(o)
        c.objects.link(o)

# Front/side proportion guides.
def guide(name, pts):
    cu=bpy.data.curves.new(name+"_Curve","CURVE"); cu.dimensions="3D"; cu.bevel_depth=.006
    sp=cu.splines.new("POLY"); sp.points.add(len(pts)-1)
    for p,co in zip(sp.points,pts):p.co=(*co,1)
    ob=bpy.data.objects.new(name,cu); bpy.context.scene.collection.objects.link(ob)
    return ob
guide("ELYRA_GUIDE_Center",[(0,-.57,.12),(0,-.57,3.92)])
guide("ELYRA_GUIDE_EyeLine",[(-.52,-.56,3.40),(.52,-.56,3.40)])
guide("ELYRA_GUIDE_Shoulder",[(-.52,-.30,2.44),(.52,-.30,2.44)])
guide("ELYRA_GUIDE_Hip",[(-.38,-.28,1.32),(.38,-.28,1.32)])

bpy.context.scene["elyra.characterSpec"]="cute-human-v2-full-base"
bpy.context.scene["elyra.status"]="AUTHORING_FULL_BASE_NOT_PRODUCTION"
bpy.context.scene["elyra.frontAxis"]="-Y"

required=[
 "ELYRA_Head","ELYRA_Neck","ELYRA_Torso","ELYRA_Pelvis",
 "ELYRA_Arm_L","ELYRA_Arm_R","ELYRA_Hand_L","ELYRA_Hand_R",
 "ELYRA_Leg_L","ELYRA_Leg_R","ELYRA_Foot_L","ELYRA_Foot_R",
 "ELYRA_Eye_L","ELYRA_Eye_R","ELYRA_Nose","ELYRA_Mouth","ELYRA_HairCap"
]
missing=[n for n in required if bpy.data.objects.get(n) is None]
if missing: fail("Missing required objects: "+", ".join(missing))
for bad in ("Cube","Camera","Light"):
    if bpy.data.objects.get(bad): fail("Default object survived: "+bad)

bpy.ops.wm.save_as_mainfile(filepath=OUT,check_existing=False)
if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(os.path.abspath(OUT)):
    fail("Wrong save path")

print("ELYRA_FULL_BODY_PARTS_OK")
print("ELYRA_FACE_AUTHORING_PARTS_OK")
print("ELYRA_NO_DEFAULT_CUBE_OK")
print("ELYRA_CUTE_HUMAN_V2_BLEND_OK")
print("OUTPUT:",OUT)
