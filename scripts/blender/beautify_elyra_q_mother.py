import bpy, sys, math
from pathlib import Path
from mathutils import Vector

STYLE_ID='ELYRA_CHIBI_V1'
MORPHS=('faceWidth','faceLength','jawWidth','chinLength','cheekFullness','eyeSize','eyeSpacing','eyeHeight','noseWidth','noseLength','mouthWidth','lipFullness')

def cli(name):
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if name not in args: raise RuntimeError(f'Missing {name}')
    return args[args.index(name)+1]

def material(name, rgba, rough=.62):
    m=bpy.data.materials.new(name); m.diffuse_color=rgba; m.roughness=rough; return m

def meta(name, resolution=.052):
    mb=bpy.data.metaballs.new(name+'Data'); mb.resolution=resolution; mb.render_resolution=.032; mb.threshold=.61
    ob=bpy.data.objects.new(name,mb); bpy.context.collection.objects.link(ob); return ob

def ell(ob, loc, scale, stiff=2.0):
    e=ob.data.elements.new(); e.type='ELLIPSOID'; e.co=loc; e.radius=1.0
    e.size_x,e.size_y,e.size_z=scale; e.stiffness=stiff

def build_body():
    q=meta('ELYRA_Q_VOLUME')
    # Native cute head: broad cranium, soft cheeks, short lower face.
    ell(q,(0,.015,2.77),(.62,.53,.60))
    ell(q,(0,-.035,2.55),(.57,.50,.42))
    ell(q,(-.28,-.075,2.53),(.31,.31,.29)); ell(q,(.28,-.075,2.53),(.31,.31,.29))
    ell(q,(0,-.005,2.37),(.38,.37,.25))
    # Short neck, compact pear-shaped stylized torso. No adult shoulder shelf.
    ell(q,(0,.02,2.10),(.24,.23,.28))
    ell(q,(0,.025,1.86),(.45,.31,.36))
    ell(q,(0,.025,1.57),(.40,.29,.36))
    ell(q,(0,.02,1.30),(.46,.34,.34))
    # Rounded shoulders + tapered arms + mitten-like hands integrated in mother mesh.
    for s in (-1,1):
        ell(q,(s*.43,.02,1.86),(.25,.25,.24))
        ell(q,(s*.61,.015,1.68),(.22,.20,.31))
        ell(q,(s*.72,.005,1.43),(.18,.17,.29))
        ell(q,(s*.76,-.015,1.21),(.18,.15,.20))
        ell(q,(s*.80,-.035,1.13),(.20,.16,.17))
        # thumb silhouette
        ell(q,(s*.89,-.055,1.16),(.10,.10,.13))
        # Short sturdy legs, gentle knee taper, rounded feet.
        ell(q,(s*.245,.02,1.03),(.27,.28,.36))
        ell(q,(s*.245,.02,.76),(.24,.25,.33))
        ell(q,(s*.245,.01,.49),(.20,.21,.30))
        ell(q,(s*.245,-.09,.23),(.22,.33,.17))
    bpy.context.view_layer.objects.active=q; q.select_set(True); bpy.ops.object.convert(target='MESH')
    body=bpy.context.object; body.name='ELYRA_CHIBI_BODY'
    rem=body.modifiers.new('ELYRA_ContinuousSurface','REMESH'); rem.mode='VOXEL'; rem.voxel_size=.042; rem.use_smooth_shade=True
    bpy.context.view_layer.objects.active=body; bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=body.modifiers.new('ELYRA_SurfaceRelax','SMOOTH'); sm.factor=.34; sm.iterations=8; bpy.ops.object.modifier_apply(modifier=sm.name)
    for p in body.data.polygons: p.use_smooth=True
    return body

def uv(name, loc, scale, mat, seg=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth=True
    return o

def add_face(body):
    skin=material('ELYRA_Skin',(0.78,0.57,0.45,1),.68); body.data.materials.append(skin)
    white=material('ELYRA_EyeWhite',(0.975,0.975,0.97,1),.33)
    iris=material('ELYRA_Iris',(0.18,0.10,0.07,1),.28)
    pupil=material('ELYRA_Pupil',(0.025,0.018,0.015,1),.24)
    mouthmat=material('ELYRA_Mouth',(0.34,0.11,0.10,1),.52)
    # Eyes are deliberately smaller and partly embedded into the face, not floating discs.
    for s in (-1,1):
        eye=uv(f'ELYRA_EYE_{"L" if s<0 else "R"}',(s*.205,-.493,2.69),(.165,.090,.190),white); eye['elyraRole']='style_eye'
        ir=uv(f'ELYRA_IRIS_{"L" if s<0 else "R"}',(s*.205,-.574,2.69),(.072,.022,.090),iris,40,24); ir['elyraRole']='style_iris'
        pu=uv(f'ELYRA_PUPIL_{"L" if s<0 else "R"}',(s*.205,-.593,2.69),(.031,.010,.044),pupil,32,20); pu['elyraRole']='style_pupil'
    # Small integrated-looking nose; much less protrusion than Step 29.
    nose=uv('ELYRA_NOSE',(0,-.510,2.51),(.070,.050,.065),skin,32,20); nose['elyraRole']='style_nose'
    # Soft smile curve, narrow enough to stay inside the lower face.
    curve=bpy.data.curves.new('ELYRA_MouthCurve','CURVE'); curve.dimensions='3D'; curve.bevel_depth=.012; curve.bevel_resolution=5
    spl=curve.splines.new('BEZIER'); spl.bezier_points.add(2)
    for bp,co in zip(spl.bezier_points,[(-.105,-.526,2.405),(0,-.540,2.392),(.105,-.526,2.405)]):
        bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    mouth=bpy.data.objects.new('ELYRA_MOUTH',curve); bpy.context.collection.objects.link(mouth); mouth.data.materials.append(mouthmat); mouth['elyraRole']='style_mouth'

def add_key(obj,name,fn):
    k=obj.shape_key_add(name=name,from_mix=False); basis=obj.data.shape_keys.key_blocks['Basis']
    for i,v in enumerate(k.data): v.co=fn(basis.data[i].co.copy())
    k.slider_min=-.30; k.slider_max=.30; k.value=0

def add_morphs(body):
    body.shape_key_add(name='Basis',from_mix=False)
    def g(z,c,w): return math.exp(-((z-c)/w)**2)
    def face(p): return g(p.z,2.57,.43)
    def lower(p): return g(p.z,2.40,.20)
    def eyes(p): return g(p.z,2.69,.17)
    def nose(p): return g(p.z,2.51,.11)
    def mouth(p): return g(p.z,2.40,.10)
    add_key(body,'faceWidth',lambda p:Vector((p.x*(1+.085*face(p)),p.y,p.z)))
    add_key(body,'faceLength',lambda p:Vector((p.x,p.y,2.57+(p.z-2.57)*(1+.065*face(p)))))
    add_key(body,'jawWidth',lambda p:Vector((p.x*(1+.09*lower(p)),p.y,p.z)))
    add_key(body,'chinLength',lambda p:Vector((p.x,p.y,p.z-.040*lower(p))))
    add_key(body,'cheekFullness',lambda p:Vector((p.x,p.y-.032*lower(p),p.z)))
    add_key(body,'eyeSize',lambda p:Vector((p.x*(1+.025*eyes(p)),p.y-.018*eyes(p),p.z)))
    add_key(body,'eyeSpacing',lambda p:Vector((p.x+(.026 if p.x>=0 else -.026)*eyes(p),p.y,p.z)))
    add_key(body,'eyeHeight',lambda p:Vector((p.x,p.y,p.z+.026*eyes(p))))
    add_key(body,'noseWidth',lambda p:Vector((p.x*(1+.038*nose(p)),p.y,p.z)))
    add_key(body,'noseLength',lambda p:Vector((p.x,p.y-.022*nose(p),p.z)))
    add_key(body,'mouthWidth',lambda p:Vector((p.x*(1+.042*mouth(p)),p.y,p.z)))
    add_key(body,'lipFullness',lambda p:Vector((p.x,p.y-.018*mouth(p),p.z)))

def export_glb(path):
    Path(path).parent.mkdir(parents=True,exist_ok=True); bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_morph=True,export_morph_normal=True,export_apply=False)

def main():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    body=build_body(); add_face(body); add_morphs(body)
    body['elyraRole']='native_q_mother_mesh'; body['elyraStyleLocked']=True
    sc=bpy.context.scene; sc['elyraProductionBase']=True; sc['elyraStyleId']=STYLE_ID; sc['elyraStyleVersion']=6
    sc['elyraNativeQMotherMesh']=True; sc['elyraMotherMeshBeautified']=True; sc['elyraIdentityVariationLimit']=.22
    out=Path(cli('--output')); out.parent.mkdir(parents=True,exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=str(out))
    default_glb=cli('--default-glb'); export_glb(default_glb)
    missing=[m for m in MORPHS if m not in body.data.shape_keys.key_blocks]
    if missing: raise RuntimeError('Missing morphs: '+','.join(missing))
    print('ELYRA_CHIBI_V1_BASE_OK',out); print('ELYRA_STYLE_VERSION',6); print('ELYRA_Q_MOTHER_BEAUTIFIED',True)
    print('ELYRA_DEFAULT_GLB_OK',default_glb); print('ELYRA_FACE_MORPHS',len(MORPHS)); print('ELYRA_STEP30_OK')
if __name__=='__main__': main()
