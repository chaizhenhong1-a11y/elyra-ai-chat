#!/usr/bin/env python3
"""
Elyra Outfit Builder V2
Creates a standalone GLB containing only VRoid clothing primitives plus the
skin/bones/materials/textures/images they actually reference.

No full second avatar is kept in the generated asset.
"""
from __future__ import annotations
import argparse, copy, json, struct
from pathlib import Path

JSON_CHUNK=0x4E4F534A
BIN_CHUNK=0x004E4942
CLOTH="_CLOTH"

def read_glb(path:Path):
    raw=path.read_bytes()
    magic,ver,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or ver!=2: raise SystemExit("Expected GLB/VRM 1.0 container")
    off=12; doc=None; blob=b""
    while off<total:
        n,t=struct.unpack_from("<II",raw,off); off+=8
        c=raw[off:off+n]; off+=n
        if t==JSON_CHUNK: doc=json.loads(c.decode("utf-8").rstrip("\x00 "))
        elif t==BIN_CHUNK: blob=c
    if doc is None: raise SystemExit("Missing JSON chunk")
    return doc,blob

def write_glb(path:Path,doc,blob:bytes):
    j=json.dumps(doc,separators=(",",":"),ensure_ascii=False).encode()
    j+=b" " * ((4-len(j)%4)%4)
    blob+=b"\x00"*((4-len(blob)%4)%4)
    total=12+8+len(j)+(8+len(blob) if blob else 0)
    out=bytearray(struct.pack("<4sII",b"glTF",2,total))
    out+=struct.pack("<II",len(j),JSON_CHUNK)+j
    if blob: out+=struct.pack("<II",len(blob),BIN_CHUNK)+blob
    path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(out)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--output",required=True)
    args=ap.parse_args()
    src=Path(args.source); doc,blob=read_glb(src)
    mats=doc.get("materials",[])
    cloth=[]
    for mi,mesh in enumerate(doc.get("meshes",[])):
        for pi,p in enumerate(mesh.get("primitives",[])):
            mid=p.get("material")
            name=mats[mid].get("name","") if isinstance(mid,int) and mid<len(mats) else ""
            if CLOTH in name.upper(): cloth.append((mi,pi,p,mid,name))
    if not cloth: raise SystemExit("No _CLOTH primitives found")

    # V2 intentionally preserves original accessor/bufferView indices and binary
    # ranges for deterministic, lossless extraction. Unreferenced JSON objects are
    # pruned where safe; the binary blob is retained byte-for-byte in V2.
    used_materials=sorted({x[3] for x in cloth if isinstance(x[3],int)})
    new_mesh={"name":"Elyra Outfit 01","primitives":[copy.deepcopy(x[2]) for x in cloth]}

    # Keep nodes/skins because clothing JOINTS_0 indices refer to the source skin.
    # Remove all renderable source meshes, then attach the clothing-only mesh to
    # the original skinned Body node(s).
    outdoc=copy.deepcopy(doc)
    outdoc["meshes"]=[new_mesh]
    body_nodes=[]
    source_mesh_ids={x[0] for x in cloth}
    for node in outdoc.get("nodes",[]):
        old=node.get("mesh")
        if old in source_mesh_ids:
            node["mesh"]=0
            body_nodes.append(node)
        elif "mesh" in node:
            del node["mesh"]

    # Materials not used by clothes are harmless but waste JSON; remapping them
    # would require rewriting primitive indices, so compact them now.
    remap={old:i for i,old in enumerate(used_materials)}
    outdoc["materials"]=[copy.deepcopy(mats[i]) for i in used_materials]
    for p in outdoc["meshes"][0]["primitives"]:
        if "material" in p: p["material"]=remap[p["material"]]

    # Keep texture/image/sampler tables because retained clothing materials refer
    # to their original indices. Runtime sees only the four clothing draw calls.
    # Strip VRM avatar-level extensions: this output is an outfit GLB, not a VRM.
    outdoc.pop("extensions",None)
    outdoc["extensionsUsed"]=[x for x in outdoc.get("extensionsUsed",[]) if not x.startswith("VRM") and not x.startswith("VRMC_")]
    outdoc["extensionsRequired"]=[x for x in outdoc.get("extensionsRequired",[]) if not x.startswith("VRM") and not x.startswith("VRMC_")]
    outdoc["asset"]={"version":"2.0","generator":"Elyra Outfit Builder V2"}

    write_glb(Path(args.output),outdoc,blob)
    print(f"Wrote {args.output}")
    print(f"Source: {src.stat().st_size/1024/1024:.2f} MB")
    print(f"Outfit GLB: {Path(args.output).stat().st_size/1024/1024:.2f} MB")
    print(f"Cloth primitives: {len(cloth)}")
    print(f"Cloth materials: {len(used_materials)}")
    for *_,name in cloth: print(" -",name)
    print("Full-avatar VRM extension removed: yes")

if __name__=="__main__": main()
