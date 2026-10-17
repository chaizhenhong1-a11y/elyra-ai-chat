import bpy, sys, json
from pathlib import Path

def args_after_dash():
    return sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def arg(name):
    a=args_after_dash()
    if name not in a: raise RuntimeError('Missing '+name)
    return a[a.index(name)+1]

root=Path(arg('--root')); report=Path(arg('--report')); preview=Path(arg('--preview')); selection=Path(arg('--selection'))
files=sorted(root.rglob('*.blend'))
if not files: raise RuntimeError('No .blend files found under '+str(root))

# v1.4.1 can package assets into generic blend filenames. Inspect datablock names instead.
candidates=[]
for f in files:
    try:
        with bpy.data.libraries.load(str(f), link=False) as (src, dst):
            cols=list(src.collections); objs=list(src.objects)
        names=cols+objs
        low=[n.lower() for n in names]
        stylized=sum('stylized' in n for n in low)
        body=sum(('body' in n and 'stylized' in n) for n in low)
        female=sum(('female' in n and 'stylized' in n) for n in low)
        male=sum(('male' in n and 'stylized' in n and 'female' not in n) for n in low)
        primitive=sum('primitive' in n for n in low)
        # Prefer a complete stylized body, then female as neutral starting point; avoid primitive-only packs.
        score=body*100 + stylized*10 + female*4 + male*2 - primitive*8
        if stylized:
            candidates.append((score,f,cols,objs))
    except Exception as e:
        print('ELYRA_SCAN_SKIP', f, repr(e))
if not candidates:
    # Diagnostic list makes future package changes visible instead of guessing filenames.
    diag=[]
    for f in files:
        try:
            with bpy.data.libraries.load(str(f), link=False) as (src,dst):
                diag.append({'file':str(f),'collections':list(src.collections)[:80],'objects':list(src.objects)[:80]})
        except Exception: pass
    selection.parent.mkdir(parents=True,exist_ok=True)
    selection.write_text(json.dumps({'error':'No internal asset names containing Stylized','files':diag},indent=2),encoding='utf-8')
    raise RuntimeError('No Stylized asset found inside official .blend files. Diagnostic written to '+str(selection))

candidates.sort(key=lambda x:(-x[0],str(x[1]).lower()))
score,source,collection_names,object_names=candidates[0]
print('ELYRA_SELECTED_LIBRARY', source)
print('ELYRA_SELECTED_SCORE', score)

# Determine the most useful complete stylized body collection by its INTERNAL name.
stylized_body_cols=[n for n in collection_names if 'stylized' in n.lower() and 'body' in n.lower() and 'primitive' not in n.lower()]
if not stylized_body_cols:
    stylized_body_cols=[n for n in collection_names if 'stylized' in n.lower() and 'primitive' not in n.lower()]
# Prefer female neutral body when both are present, then any complete stylized body.
stylized_body_cols.sort(key=lambda n:(0 if ('female' in n.lower()) else 1, 0 if 'body' in n.lower() else 1, n.lower()))

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
loaded_collections=[]
if stylized_body_cols:
    chosen=stylized_body_cols[0]
    with bpy.data.libraries.load(str(source), link=False) as (src,dst):
        dst.collections=[chosen]
    for c in dst.collections:
        if c:
            bpy.context.scene.collection.children.link(c); loaded_collections.append(c.name)
else:
    stylized_objs=[n for n in object_names if 'stylized' in n.lower() and 'primitive' not in n.lower()]
    if not stylized_objs: raise RuntimeError('Stylized names found, but no usable non-primitive Collection/Object was found')
    with bpy.data.libraries.load(str(source), link=False) as (src,dst):
        dst.objects=stylized_objs
    for o in dst.objects:
        if o and o.name not in bpy.context.scene.objects: bpy.context.collection.objects.link(o)

meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError('Selected Stylized body contains no mesh objects')
# Exclude helper/rig-like meshes from preview without modifying the source library.
visible=[]
for o in meshes:
    n=o.name.lower()
    helper=any(k in n for k in ('helper','joint','skeleton','rig','guide'))
    o.hide_render=helper
    o.hide_viewport=helper
    if not helper: visible.append(o)
if not visible: visible=meshes
for o in bpy.context.scene.objects: o.select_set(False)
for o in visible: o.select_set(True)
bpy.context.view_layer.objects.active=visible[0]

info=[]
for o in visible:
    me=o.data
    info.append({'name':o.name,'vertices':len(me.vertices),'edges':len(me.edges),'polygons':len(me.polygons),'shapeKeys':list(me.shape_keys.key_blocks.keys()) if me.shape_keys else []})
report.parent.mkdir(parents=True,exist_ok=True)
report.write_text(json.dumps({'source':str(source),'license':'CC0-1.0','provider':'Blender Studio','selectedCollections':loaded_collections,'meshCount':len(visible),'meshes':info},indent=2),encoding='utf-8')
selection.write_text(json.dumps({'source':str(source),'score':score,'selectedCollections':loaded_collections,'availableStylizedCollections':stylized_body_cols,'meshNames':[o.name for o in visible]},indent=2),encoding='utf-8')
preview.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(preview),export_format='GLB',use_selection=True,export_apply=False)
print('ELYRA_NEUTRAL_TOPOLOGY_OK', source)
print('ELYRA_NEUTRAL_MESH_COUNT', len(visible))
print('ELYRA_NEUTRAL_PREVIEW_OK', preview)
