import bpy, sys, math
from pathlib import Path
from mathutils import Vector

STYLE_ID='ELYRA_CHIBI_V1'
MORPHS=('faceWidth','faceLength','jawWidth','chinLength','cheekFullness','eyeSize','eyeSpacing','eyeHeight','noseWidth','noseLength','mouthWidth','lipFullness')

def cli(name):
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if name not in args: raise RuntimeError(f'Missing {name}')
    return args[args.index(name)+1]

def mat(name, rgba, rough=.62):
    m=bpy.data.materials.new(name); m.diffuse_color=rgba; m.roughness=rough; return m

def meta_obj(name):
    mb=bpy.data.metaballs.new(name+'Data'); mb.resolution=.075; mb.render_resolution=.045; mb.threshold=.60
    ob=bpy.data.objects.new(name,mb); bpy.context.collection.objects.link(ob); return ob

def ellipsoid(ob, loc, scale, stiffness=2.0):
    e=ob.data.elements.new(); e.type='ELLIPSOID'; e.co=loc; e.radius=1.0; e.size_x=scale[0]; e.size_y=scale[1]; e.size_z=scale[2]; e.stiffness=stiffness

def build_body():
    q=meta_obj('ELYRA_Q_VOLUME')
    # Head / cheeks / jaw: authored as chibi from the start, never transformed from adult anatomy.
    ellipsoid(q,(0,0,2.82),(.69,.59,.72))
    ellipsoid(q,(0,-.055,2.56),(.58,.53,.47))
    ellipsoid(q,(-.34,-.035,2.60),(.30,.35,.31)); ellipsoid(q,(.34,-.035,2.60),(.30,.35,.31))
    # Neck + compact torso + pelvis.
    ellipsoid(q,(0,.02,2.12),(.25,.24,.34))
    ellipsoid(q,(0,.03,1.78),(.54,.34,.48))
    ellipsoid(q,(0,.02,1.40),(.43,.31,.43))
    ellipsoid(q,(0,.02,1.10),(.50,.36,.36))
    # Arms: soft, short, slightly tapered; overlapping volumes create a continuous shoulder seam.
    for s in (-1,1):
        ellipsoid(q,(s*.48,.02,1.78),(.30,.29,.30))
        ellipsoid(q,(s*.72,.01,1.57),(.28,.23,.38))
        ellipsoid(q,(s*.86,-.01,1.27),(.22,.20,.34))
        ellipsoid(q,(s*.91,-.035,1.03),(.22,.18,.22))
        # Legs + feet: short and sturdy, clearly separated by keeping volumes away from centerline.
        ellipsoid(q,(s*.27,.02,.82),(.30,.31,.46))
        ellipsoid(q,(s*.28,.02,.46),(.24,.25,.39))
        ellipsoid(q,(s*.28,-.10,.16),(.25,.39,.18))
    bpy.context.view_layer.objects.active=q; q.select_set(True)
    bpy.ops.object.convert(target='MESH'); body=bpy.context.object; body.name='ELYRA_CHIBI_BODY'
    # Voxel remesh makes the construction one real continuous mother mesh rather than visible primitives.
    rem=body.modifiers.new('ELYRA_ContinuousSurface','REMESH'); rem.mode='VOXEL'; rem.voxel_size=.055; rem.use_smooth_shade=True
    bpy.context.view_layer.objects.active=body; bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=body.modifiers.new('ELYRA_SculptRelax','SMOOTH'); sm.factor=.48; sm.iterations=5; bpy.ops.object.modifier_apply(modifier=sm.name)
    for p in body.data.polygons:p.use_smooth=True
    return body

def add_face_parts(body):
    skin=mat('ELYRA_Skin',(0.76,0.53,0.40,1)); body.data.materials.append(skin)
    white=mat('ELYRA_EyeWhite',(0.96,0.97,0.98,1),.38); iris=mat('ELYRA_Iris',(0.16,0.09,0.055,1),.35); dark=mat('ELYRA_Mouth',(0.27,0.08,0.065,1),.55)
    # Blender world front is -Y, matching existing viewer orientation.
    for s in (-1,1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=(s*.245,-.555,2.78))
        eye=bpy.context.object; eye.name=f'ELYRA_EYE_{"L" if s<0 else "R"}'; eye.scale=(.235,.105,.275); eye.data.materials.append(white); eye['elyraRole']='style_eye'
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=(s*.245,-.650,2.78))
        ir=bpy.context.object; ir.name=f'ELYRA_IRIS_{"L" if s<0 else "R"}'; ir.scale=(.105,.030,.135); ir.data.materials.append(iris); ir['elyraRole']='style_iris'
    # Tiny soft nose; intentionally minimal so identity morphs later have room.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=(0,-.575,2.55)); nose=bpy.context.object; nose.name='ELYRA_NOSE'; nose.scale=(.095,.075,.085); nose.data.materials.append(skin)
    # Small curved mouth line, separate style geometry.
    curve=bpy.data.curves.new('ELYRA_MouthCurve','CURVE'); curve.dimensions='3D'; curve.bevel_depth=.018; curve.bevel_resolution=4
    spl=curve.splines.new('BEZIER'); spl.bezier_points.add(2)
    for bp,co in zip(spl.bezier_points,[(-.13,-.642,2.39),(0,-.657,2.37),(.13,-.642,2.39)]): bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    mouth=bpy.data.objects.new('ELYRA_MOUTH',curve); bpy.context.collection.objects.link(mouth); mouth.data.materials.append(dark)

def add_key(obj,name,fn):
    k=obj.shape_key_add(name=name,from_mix=False); basis=obj.data.shape_keys.key_blocks['Basis']
    for i,v in enumerate(k.data):v.co=fn(basis.data[i].co.copy())
    k.slider_min=-.30;k.slider_max=.30;k.value=0

def add_morphs(body):
    body.shape_key_add(name='Basis',from_mix=False)
    def g(z,c,w):return math.exp(-((z-c)/w)**2)
    def face(p):return g(p.z,2.62,.50)
    def lower(p):return g(p.z,2.45,.23)
    def eyes(p):return g(p.z,2.78,.20)
    def nose(p):return g(p.z,2.55,.13)
    def mouth(p):return g(p.z,2.38,.12)
    add_key(body,'faceWidth',lambda p:Vector((p.x*(1+.10*face(p)),p.y,p.z)))
    add_key(body,'faceLength',lambda p:Vector((p.x,p.y,2.62+(p.z-2.62)*(1+.08*face(p)))))
    add_key(body,'jawWidth',lambda p:Vector((p.x*(1+.11*lower(p)),p.y,p.z)))
    add_key(body,'chinLength',lambda p:Vector((p.x,p.y,p.z-.055*lower(p))))
    add_key(body,'cheekFullness',lambda p:Vector((p.x,p.y-.045*lower(p),p.z)))
    add_key(body,'eyeSize',lambda p:Vector((p.x*(1+.035*eyes(p)),p.y-.025*eyes(p),p.z)))
    add_key(body,'eyeSpacing',lambda p:Vector((p.x+(.035 if p.x>=0 else -.035)*eyes(p),p.y,p.z)))
    add_key(body,'eyeHeight',lambda p:Vector((p.x,p.y,p.z+.035*eyes(p))))
    add_key(body,'noseWidth',lambda p:Vector((p.x*(1+.05*nose(p)),p.y,p.z)))
    add_key(body,'noseLength',lambda p:Vector((p.x,p.y-.035*nose(p),p.z)))
    add_key(body,'mouthWidth',lambda p:Vector((p.x*(1+.055*mouth(p)),p.y,p.z)))
    add_key(body,'lipFullness',lambda p:Vector((p.x,p.y-.025*mouth(p),p.z)))

def export_glb(path):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_morph=True,export_morph_normal=True,export_apply=False)

def main():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    body=build_body(); add_face_parts(body); add_morphs(body)
    body['elyraRole']='native_q_mother_mesh'; body['elyraStyleLocked']=True
    sc=bpy.context.scene;sc['elyraProductionBase']=True;sc['elyraStyleId']=STYLE_ID;sc['elyraStyleVersion']=5;sc['elyraNativeQMotherMesh']=True;sc['elyraIdentityVariationLimit']=.24
    out=Path(cli('--output'));out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out))
    default_glb=cli('--default-glb'); export_glb(default_glb)
    missing=[m for m in MORPHS if m not in body.data.shape_keys.key_blocks]
    if missing:raise RuntimeError('Missing morphs: '+','.join(missing))
    print('ELYRA_CHIBI_V1_BASE_OK',out);print('ELYRA_STYLE_VERSION',5);print('ELYRA_NATIVE_Q_MOTHER_MESH',True);print('ELYRA_DEFAULT_GLB_OK',default_glb);print('ELYRA_FACE_MORPHS',len(MORPHS))
if __name__=='__main__':main()
