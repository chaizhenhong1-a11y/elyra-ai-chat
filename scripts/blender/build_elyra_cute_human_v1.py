import bpy, math, os
from mathutils import Vector

# Elyra Cute Human V1 - procedural Blender asset builder
# Produces a stylized 4-head-height base mesh, rig, simple materials and starter shape keys.

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'admin', 'public', 'models', 'elyra-cute-human-v1.glb'))
os.makedirs(os.path.dirname(OUT), exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# ---------- materials ----------
def mat(name, color, rough=.55):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    return m
skin=mat('Skin',(0.72,0.43,0.30),.62)
eye_white=mat('EyeWhite',(0.96,0.97,1.0),.32)
iris=mat('Iris',(0.10,0.055,0.035),.28)
hair=mat('Hair',(0.055,0.025,0.018),.7)
shirt=mat('Outfit',(0.22,0.24,0.30),.72)

# ---------- helper primitives used only as sculpt volumes, then voxel-unioned ----------
def uv(name, loc, scale, material=skin, seg=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o

def capsule(name,a,b,r,material=skin):
    mid=(Vector(a)+Vector(b))*0.5
    vec=Vector(b)-Vector(a); length=vec.length
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=length, location=mid)
    o=bpy.context.object; o.name=name
    o.data.materials.append(material)
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector((0,0,1)).rotation_difference(vec.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # rounded ends
    uv(name+'A',a,(r,r,r),material,32,20); uv(name+'B',b,(r,r,r),material,32,20)
    return o

# proportions: feet z=0, top ~4.0; head roughly 1.15 high
parts=[]
parts += [uv('Head',(0,0,3.34),(0.68,0.57,0.72))]
parts += [uv('Cheeks',(0,-0.03,3.20),(0.70,0.59,0.55))]
parts += [uv('Neck',(0,0,2.73),(0.23,0.22,0.27))]
parts += [uv('Torso',(0,0,2.15),(0.53,0.34,0.67))]
parts += [uv('Pelvis',(0,0,1.58),(0.48,0.34,0.42))]
# arms, slightly away from torso
for side in (-1,1):
    x=.55*side
    parts += [capsule('UpperArm', (x,0,2.45),(0.72*side,0,1.98),.18)]
    parts += [capsule('ForeArm',(0.72*side,0,1.98),(0.72*side,-.01,1.56),.16)]
    parts += [uv('Hand',(0.72*side,-.01,1.40),(.20,.16,.25))]
    parts += [capsule('Thigh',(0.27*side,0,1.48),(0.29*side,0,.88),.22)]
    parts += [capsule('Shin',(0.29*side,0,.88),(0.30*side,0,.34),.18)]
    parts += [uv('Foot',(0.30*side,-.10,.12),(.25,.38,.16))]

# join sculpt volumes and voxel remesh into one continuous body
bpy.ops.object.select_all(action='DESELECT')
for o in [x for x in bpy.context.scene.objects if x.type=='MESH' and x.data.materials and x.data.materials[0]==skin]: o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
body=bpy.context.object; body.name='ElyraCuteHuman_Body'
rem=body.modifiers.new('ContinuousBody','REMESH'); rem.mode='VOXEL'; rem.voxel_size=.045; rem.use_smooth_shade=True
bpy.context.view_layer.objects.active=body
bpy.ops.object.modifier_apply(modifier=rem.name)
# smooth + subtle subdivision
bpy.ops.object.shade_smooth()
sub=body.modifiers.new('SurfaceSmooth','SUBSURF'); sub.levels=1; sub.render_levels=1
bpy.ops.object.modifier_apply(modifier=sub.name)
body.data.materials.clear(); body.data.materials.append(skin)

# ---------- face ----------
def sphere_obj(name,loc,scale,material): return uv(name,loc,scale,material,40,24)
for side in (-1,1):
    sphere_obj('Eye_L' if side<0 else 'Eye_R',(0.27*side,-.515,3.43),(.19,.095,.24),eye_white)
    sphere_obj('Iris_L' if side<0 else 'Iris_R',(0.27*side,-.603,3.43),(.095,.035,.125),iris)
# small cute nose + mouth curve
sphere_obj('Nose',(0,-.59,3.18),(.075,.065,.075),skin)
bpy.ops.curve.primitive_bezier_curve_add(location=(0,-.64,3.02))
mouth=bpy.context.object; mouth.name='Mouth'; mouth.data.bevel_depth=.018; mouth.data.bevel_resolution=4
p=mouth.data.splines[0].bezier_points
p[0].co=(-.13,0,.015); p[1].co=(.13,0,.015)
for q in p: q.handle_left_type=q.handle_right_type='AUTO'
mouth.data.materials.append(iris)
# ears
for side in (-1,1): sphere_obj('Ear',(.67*side,0,3.28),(.12,.10,.18),skin)

# stylized hair cap + side locks (separate modular object)
hcap=sphere_obj('Hair_Cap',(0,.02,3.67),(.72,.58,.48),hair)
# hide lower half visually with position/scale; add locks
for side in (-1,1):
    sphere_obj('HairLock',(.47*side,-.03,3.28),(.20,.18,.48),hair)
# fringe
for x in (-.30,-.10,.10,.30): sphere_obj('Fringe',(x,-.49,3.62),(.17,.10,.24),hair)

# simple outfit overlay
shirt_obj=uv('Shirt',(0,-.005,2.18),(.55,.355,.55),shirt)
# trim top so neck remains visible via scale only; cute shorts
shorts=uv('Shorts',(0,0,1.62),(.50,.35,.28),shirt)

# ---------- starter identity shape keys on continuous body ----------
body.shape_key_add(name='Basis')
base=[v.co.copy() for v in body.data.vertices]

def key(name, fn):
    k=body.shape_key_add(name=name)
    for i,v in enumerate(k.data): v.co=fn(base[i].copy())
    k.value=0.0

def head_region(v): return v.z>2.72
key('faceWidth', lambda v: Vector((v.x*1.12 if head_region(v) else v.x, v.y, v.z)))
key('faceLength', lambda v: Vector((v.x, v.y, 3.32+(v.z-3.32)*1.10 if head_region(v) else v.z)))
key('cheekFullness', lambda v: Vector((v.x*1.10 if 3.05<v.z<3.38 else v.x, v.y*1.05 if 3.05<v.z<3.38 else v.y, v.z)))
key('jawWidth', lambda v: Vector((v.x*1.10 if 2.92<v.z<3.18 else v.x, v.y, v.z)))
key('headScale', lambda v: Vector((v.x*1.10 if head_region(v) else v.x, v.y*1.10 if head_region(v) else v.y, 2.72+(v.z-2.72)*1.10 if head_region(v) else v.z)))
key('bodyWidth', lambda v: Vector((v.x*1.10 if 1.35<v.z<2.75 else v.x, v.y, v.z)))

# ---------- armature ----------
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm=bpy.context.object; arm.name='ElyraCuteHuman_Rig'; arm.data.name='ElyraCuteHuman_Rig'
eb=arm.data.edit_bones; root=eb[0]; root.name='Root'; root.head=(0,0,0); root.tail=(0,0,.35)
def bone(name,h,t,parent=None):
    b=eb.new(name); b.head=h; b.tail=t; b.parent=parent; return b
pelvis=bone('Pelvis',(0,0,1.35),(0,0,1.72),root)
spine=bone('Spine',(0,0,1.72),(0,0,2.45),pelvis)
neck=bone('Neck',(0,0,2.45),(0,0,2.82),spine)
head=bone('Head',(0,0,2.82),(0,0,3.55),neck)
for side,label in [(-1,'L'),(1,'R')]:
    ua=bone('UpperArm_'+label,(.42*side,0,2.42),(.70*side,0,2.02),spine)
    fa=bone('ForeArm_'+label,(.70*side,0,2.02),(.72*side,0,1.58),ua)
    bone('Hand_'+label,(.72*side,0,1.58),(.72*side,0,1.35),fa)
    th=bone('Thigh_'+label,(.25*side,0,1.48),(.29*side,0,.88),pelvis)
    sh=bone('Shin_'+label,(.29*side,0,.88),(.30*side,0,.34),th)
    bone('Foot_'+label,(.30*side,0,.34),(.30*side,-.28,.10),sh)
bpy.ops.object.mode_set(mode='OBJECT')

# auto-weight only body; modular pieces can follow head/spine later in app pipeline
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active=arm
try: bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except Exception as e: print('Auto-weight warning:',e)

# parent face/hair pieces to head bone, clothes to torso/rig for V1
for o in list(bpy.context.scene.objects):
    if o==body or o==arm: continue
    if o.type in {'MESH','CURVE'}:
        o.parent=arm; o.parent_type='BONE'; o.parent_bone='Head' if (o.location.z>2.75 or 'Eye' in o.name or 'Iris' in o.name or 'Hair' in o.name or o.name in {'Nose','Mouth','Ear'}) else 'Spine'

# ---------- lighting-independent export cleanup ----------
# custom metadata
body['elyra_character']='cute_human_v1'
body['art_direction']='cute_stylized_4_head_height'
body['identity_morphs']='faceWidth,faceLength,cheekFullness,jawWidth,headScale,bodyWidth'

# export
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_morph=True, export_skins=True, export_animations=False)
print('\nELYRA_CUTE_HUMAN_V1_OK')
print('Saved:',OUT)
