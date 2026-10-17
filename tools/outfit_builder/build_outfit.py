#!/usr/bin/env python3
"""
Elyra Outfit Builder V1
Audits a VRoid outfit VRM and writes a manifest used by the Web runtime.
It deliberately does NOT mutate the source VRM.
"""
from __future__ import annotations
import argparse, json, struct
from pathlib import Path

CLOTH_TOKEN="_CLOTH"

def read_glb(path: Path):
    raw=path.read_bytes()
    magic,version,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or version!=2:
        raise SystemExit(f"Unsupported VRM/GLB: {path}")
    off=12; doc=None
    while off<total:
        length,kind=struct.unpack_from("<II",raw,off); off+=8
        chunk=raw[off:off+length]; off+=length
        if kind==0x4E4F534A:
            doc=json.loads(chunk.decode("utf-8").rstrip("\x00 "))
    if doc is None: raise SystemExit("JSON chunk missing")
    return doc

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--id",default="outfit-01")
    ap.add_argument("--name",default="套装 1")
    ap.add_argument("--output",default="elyra-outfit-01.manifest.json")
    args=ap.parse_args()
    source=Path(args.source)
    doc=read_glb(source)
    materials=doc.get("materials",[])
    cloth_materials=[]
    cloth_primitives=[]
    for mesh_index,mesh in enumerate(doc.get("meshes",[])):
        for primitive_index,primitive in enumerate(mesh.get("primitives",[])):
            mi=primitive.get("material")
            name=materials[mi].get("name","") if isinstance(mi,int) and mi<len(materials) else ""
            if CLOTH_TOKEN in name.upper():
                cloth_materials.append({"index":mi,"name":name})
                cloth_primitives.append({
                    "meshIndex":mesh_index,
                    "meshName":mesh.get("name",""),
                    "primitiveIndex":primitive_index,
                    "materialIndex":mi,
                    "materialName":name,
                })
    joints=max((len(s.get("joints",[])) for s in doc.get("skins",[])),default=0)
    manifest={
        "schema":"elyra.outfit.v1",
        "id":args.id,
        "name":args.name,
        "sourceFile":source.name,
        "sourceBytes":source.stat().st_size,
        "clothToken":CLOTH_TOKEN,
        "clothMaterials":cloth_materials,
        "clothPrimitives":cloth_primitives,
        "skinJointCount":joints,
        "strategy":{
            "loadMode":"outfit-asset-only",
            "atomicSwap":True,
            "keepCurrentUntilReady":True,
            "allowFullAvatarRuntimeFallback":False
        }
    }
    Path(args.output).write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Wrote {args.output}")
    print(f"Cloth primitives: {len(cloth_primitives)}")
    for x in cloth_primitives: print(" -",x["materialName"])

if __name__=="__main__": main()
