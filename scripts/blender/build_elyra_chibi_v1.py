import bpy, importlib, math, sys
from pathlib import Path
from mathutils import Vector

STYLE_ID='ELYRA_CHIBI_V1'
MORPHS=('faceWidth','faceLength','jawWidth','chinLength','cheekFullness','eyeSize','eyeSpacing','eyeHeight','noseWidth','noseLength','mouthWidth','lipFullness')

def cli(name):
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if name not in args: raise RuntimeError(f'Missing {name}')
    return args[args.index(name)+1]

def dynamic_import(suffix,key):
    for mod_name in list(sys.modules):
        if mod_name.endswith(suffix):
            mod=importlib.import_module(mod_name)
            if hasattr(mod,key): return getattr(mod,key)
    raise RuntimeError('MPFB_NOT_ENABLED')

def bounds(obj):
    pts=[v.co.copy() for v in obj.data.vertices]
    return Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts))),Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))

def clamp(x,a=0.0,b=1.0): return max(a,min(b,x))
def smoothstep(a,b,x):
    if abs(b-a)<1e-9:return 0.0
    t=clamp((x-a)/(b-a)); return t*t*(3-2*t)
def gauss(x,c,w): return math.exp(-((x-c)/w)**2)

def strip_helpers(obj):
    if obj.data.shape_keys:
        while obj.data.shape_keys and obj.data.shape_keys.key_blocks:
            obj.shape_key_remove(obj.data.shape_keys.key_blocks[-1])
    body=obj.vertex_groups.get('body')
    if body is None: raise RuntimeError('MPFB_BODY_GROUP_MISSING')
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.vertex_group_set_active(group='body'); bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.select_all(action='INVERT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
    for m in list(obj.modifiers):
        if m.type=='MASK': obj.modifiers.remove(m)

def q_rebuild(obj):
    """Rebuild the silhouette with continuous anatomical influence fields.
    No hard XYZ bands are used for shoulder/torso width, so arms cannot become fins.
    Topology remains the canonical MPFB body topology.
    """
    mn,mx=bounds(obj); h=mx.z-mn.z; cx=(mn.x+mx.x)*.5; cy=(mn.y+mx.y)*.5
    # Neutral-body landmarks expressed as fractions of original body height.
    head_c=Vector((cx,cy-.012*h,mn.z+.895*h))
    for v in obj.data.vertices:
        p=v.co.copy(); zn=(p.z-mn.z)/h
        lateral=abs(p.x-cx)/h
        # Continuous masks. Torso mask quickly fades before upper arms/hands.
        head=smoothstep(.785,.855,zn)
        torso_x=math.exp(-((lateral/.155)**4))
        core=torso_x*(1.0-head)
        pelvis=gauss(zn,.50,.09)*torso_x
        chest=gauss(zn,.68,.10)*torso_x
        waist=gauss(zn,.585,.075)*torso_x
        # Limb mask catches vertices outside the core without creating a hard seam.
        limb=clamp((1.0-torso_x)*(1.0-head))

        # Chibi vertical proportions: compact legs + torso, enlarged head zone.
        # Smooth polynomial compression rather than piecewise hard cuts.
        leg_compress=.18*smoothstep(.08,.52,zn)*(1.0-smoothstep(.50,.62,zn))
        torso_compress=.10*smoothstep(.45,.78,zn)*(1.0-head)
        zbase=p.z-h*(leg_compress+torso_compress)

        # Head is rebuilt around its own centre: wider, deeper, slightly shorter/rounder.
        if head>0:
            rel=Vector((p.x-head_c.x,p.y-head_c.y,zbase-head_c.z))
            sx=1.0+.48*head; sy=1.0+.30*head; sz=1.0+.10*head
            # Round lower face and soften adult-long face silhouette.
            lower=gauss(zn,.835,.055)*head
            sx+=.10*lower; sz-=.08*lower
            p.x=head_c.x+rel.x*sx
            p.y=head_c.y+rel.y*sy
            p.z=head_c.z+rel.z*sz
        else:
            p.z=zbase

        # Core body becomes compact and soft; influence fades before arms.
        # Crucially: shoulder narrowing only affects central torso, never outer arm vertices.
        xscale=1.0 - .13*chest*core - .08*waist*core + .035*pelvis*core
        p.x=cx+(p.x-cx)*xscale
        yscale=1.0-.07*(chest+waist)*core
        p.y=cy+(p.y-cy)*yscale

        # Slightly thicken arms/legs instead of making stick limbs.
        if limb>0:
            # radial thickness around body centreline, deliberately subtle
            thick=1.0+.035*limb
            p.x=cx+(p.x-cx)*thick

        v.co=p

    # Bake a gentle corrective smooth before shape keys exist. This removes the visible
    # ring/banding artifacts without destroying the MPFB topology or later morph targets.
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    sm=obj.modifiers.new('ELYRA_BaseRelax','SMOOTH'); sm.factor=.32; sm.iterations=3
    bpy.ops.object.modifier_apply(modifier=sm.name)

def add_key(obj,name,fn):
    key=obj.shape_key_add(name=name,from_mix=False); basis=obj.data.shape_keys.key_blocks['Basis']
    for i,v in enumerate(key.data): v.co=fn(basis.data[i].co.copy(),i)
    key.slider_min=-.36; key.slider_max=.36; key.value=0.0

def add_morphs(obj):
    if not obj.data.shape_keys: obj.shape_key_add(name='Basis',from_mix=False)
    mn,mx=bounds(obj); h=mx.z-mn.z; cx=(mn.x+mx.x)*.5; cy=(mn.y+mx.y)*.5
    z0=mn.z+h*.76; z1=mx.z
    def head(p): return smoothstep(z0,z0+h*.08,p.z)
    def front(p): return smoothstep(cy,mn.y,p.y) if mn.y<cy else 1.0
    def fw(p): return head(p)*(.35+.65*front(p))
    def band(p,c,w):
        zn=(p.z-z0)/max(1e-6,z1-z0); return fw(p)*math.exp(-((zn-c)/w)**2)
    eye=lambda p:band(p,.57,.105); nose=lambda p:band(p,.39,.085); mouth=lambda p:band(p,.26,.075)
    add_key(obj,'faceWidth',lambda p,i:Vector((cx+(p.x-cx)*(1+.085*fw(p)),p.y,p.z)))
    add_key(obj,'faceLength',lambda p,i:Vector((p.x,p.y,z0+(p.z-z0)*(1+.06*fw(p)) if p.z>z0 else p.z)))
    add_key(obj,'jawWidth',lambda p,i:Vector((cx+(p.x-cx)*(1+.085*band(p,.20,.13)),p.y,p.z)))
    add_key(obj,'chinLength',lambda p,i:Vector((p.x,p.y,p.z-.012*h*band(p,.13,.07))))
    add_key(obj,'cheekFullness',lambda p,i:Vector((p.x,p.y-.016*h*band(p,.38,.12),p.z)))
    add_key(obj,'eyeSize',lambda p,i:Vector((cx+(p.x-cx)*(1+.045*eye(p)),p.y-.008*h*eye(p),p.z)))
    add_key(obj,'eyeSpacing',lambda p,i:Vector((p.x+(.009*h if p.x>=cx else -.009*h)*eye(p),p.y,p.z)))
    add_key(obj,'eyeHeight',lambda p,i:Vector((p.x,p.y,p.z+.009*h*eye(p))))
    add_key(obj,'noseWidth',lambda p,i:Vector((cx+(p.x-cx)*(1+.055*nose(p)),p.y,p.z)))
    add_key(obj,'noseLength',lambda p,i:Vector((p.x,p.y-.010*h*nose(p),p.z)))
    add_key(obj,'mouthWidth',lambda p,i:Vector((cx+(p.x-cx)*(1+.060*mouth(p)),p.y,p.z)))
    add_key(obj,'lipFullness',lambda p,i:Vector((p.x,p.y-.007*h*mouth(p),p.z)))

def make_material(name,color):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name); mat.diffuse_color=color; return mat

def add_stylized_eyes(obj):
    # Separate clean eye geometry gives the mother mesh an actual stylized/Q read instead
    # of merely enlarging an adult MakeHuman head. These are style-locked, not AI-controlled.
    mn,mx=bounds(obj); h=mx.z-mn.z; cx=(mn.x+mx.x)*.5; cy=(mn.y+mx.y)*.5
    skin_front=mn.y  # MakeHuman neutral body faces -Y
    eye_z=mn.z+.865*h
    eye_dx=.047*h
    white=make_material('ELYRA_EyeWhite',(0.96,0.96,0.94,1)); iris=make_material('ELYRA_Iris',(0.12,0.075,0.045,1))
    for side in (-1,1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=(cx+side*eye_dx, skin_front-.004*h, eye_z))
        eye=bpy.context.object; eye.name=f'ELYRA_EYE_{"L" if side<0 else "R"}'
        eye.scale=(.034*h,.020*h,.041*h); eye.data.materials.append(white); eye['elyraRole']='style_eye'
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=(cx+side*eye_dx, skin_front-.023*h, eye_z))
        pupil=bpy.context.object; pupil.name=f'ELYRA_IRIS_{"L" if side<0 else "R"}'
        pupil.scale=(.015*h,.006*h,.019*h); pupil.data.materials.append(iris); pupil['elyraRole']='style_iris'

def material(obj):
    mat=make_material('ELYRA_Skin',(0.72,0.47,0.34,1)); obj.data.materials.clear(); obj.data.materials.append(mat)

def main():
    HumanService=dynamic_import('mpfb.services.humanservice','HumanService')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    human=HumanService.create_human(mask_helpers=True,detailed_helpers=True,extra_vertex_groups=True,feet_on_ground=True,scale=.1)
    if human is None or human.type!='MESH': raise RuntimeError('MPFB did not create a basemesh')
    human.name='ELYRA_CHIBI_BODY'; strip_helpers(human); q_rebuild(human); add_morphs(human); material(human)
    for poly in human.data.polygons: poly.use_smooth=True
    sub=human.modifiers.new('ELYRA_Subdivision','SUBSURF'); sub.levels=1; sub.render_levels=1
    add_stylized_eyes(human)
    scene=bpy.context.scene
    scene['elyraProductionBase']=True; scene['elyraStyleId']=STYLE_ID; scene['elyraStyleVersion']=4; scene['elyraIdentityVariationLimit']=.30
    scene['elyraMotherMeshRebuilt']=True
    human['elyraRole']='mother_mesh'; human['elyraStyleLocked']=True; human['elyraHelpersPhysicallyRemoved']=True
    out=Path(cli('--output')); out.parent.mkdir(parents=True,exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=str(out))
    missing=[m for m in MORPHS if m not in human.data.shape_keys.key_blocks]
    if missing: raise RuntimeError('Missing morphs: '+','.join(missing))
    print('ELYRA_CHIBI_V1_BASE_OK',out); print('ELYRA_STYLE_VERSION',scene['elyraStyleVersion']); print('ELYRA_MOTHER_MESH_REBUILT',scene['elyraMotherMeshRebuilt']); print('ELYRA_HELPERS_REMOVED',human['elyraHelpersPhysicallyRemoved'])

if __name__=='__main__': main()
