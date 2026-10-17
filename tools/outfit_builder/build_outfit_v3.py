#!/usr/bin/env python3
"""
Elyra Outfit Builder V3
Compacts a V2 clothing-only GLB by retaining only bufferViews/accessors used by
the four clothing primitives, their skin inverse-bind matrices, and referenced images.
"""
from __future__ import annotations
import argparse, copy, json, struct
from pathlib import Path

J=0x4E4F534A; B=0x004E4942

def read_glb(path):
    raw=Path(path).read_bytes(); magic,ver,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or ver!=2: raise SystemExit("Expected GLB 2.0")
    off=12; doc=None; blob=b""
    while off<total:
        n,t=struct.unpack_from("<II",raw,off);off+=8;c=raw[off:off+n];off+=n
        if t==J: doc=json.loads(c.decode("utf-8").rstrip("\x00 "))
        elif t==B: blob=c
    return doc,blob

def write_glb(path,doc,blob):
    js=json.dumps(doc,separators=(",",":"),ensure_ascii=False).encode()
    js+=b" "*((-len(js))%4); blob+=b"\0"*((-len(blob))%4)
    total=12+8+len(js)+(8+len(blob) if blob else 0)
    raw=bytearray(struct.pack("<4sII",b"glTF",2,total))+struct.pack("<II",len(js),J)+js
    if blob: raw+=struct.pack("<II",len(blob),B)+blob
    Path(path).write_bytes(raw)

def tex_indices(value,out):
    if isinstance(value,dict):
        if isinstance(value.get("index"),int) and any(k in value for k in ("texCoord","extensions")):
            out.add(value["index"])
        for v in value.values(): tex_indices(v,out)
    elif isinstance(value,list):
        for v in value: tex_indices(v,out)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("--output",required=True)
    a=ap.parse_args(); doc,blob=read_glb(a.source)
    mesh=doc["meshes"][0]; primitives=mesh["primitives"]

    used_acc=set()
    for p in primitives:
        if isinstance(p.get("indices"),int): used_acc.add(p["indices"])
        used_acc.update(v for v in p.get("attributes",{}).values() if isinstance(v,int))
        for target in p.get("targets",[]): used_acc.update(v for v in target.values() if isinstance(v,int))
    for skin in doc.get("skins",[]):
        if isinstance(skin.get("inverseBindMatrices"),int): used_acc.add(skin["inverseBindMatrices"])

    accessors=doc.get("accessors",[])
    used_views={accessors[i]["bufferView"] for i in used_acc if "bufferView" in accessors[i]}

    # referenced textures from retained clothing materials
    used_tex=set()
    for m in doc.get("materials",[]): tex_indices(m,used_tex)
    textures=doc.get("textures",[])
    used_images={textures[i]["source"] for i in used_tex if i<len(textures) and isinstance(textures[i].get("source"),int)}
    images=doc.get("images",[])
    for i in used_images:
        if i<len(images) and isinstance(images[i].get("bufferView"),int): used_views.add(images[i]["bufferView"])

    # copy only needed bufferView byte ranges
    old_views=doc.get("bufferViews",[]); newblob=bytearray(); viewmap={}
    for old in sorted(used_views):
        v=old_views[old]; start=v.get("byteOffset",0); length=v["byteLength"]
        while len(newblob)%4:newblob.append(0)
        nv=copy.deepcopy(v); nv["buffer"]=0; nv["byteOffset"]=len(newblob)
        newblob+=blob[start:start+length]; viewmap[old]=len(viewmap)
    newviews=[None]*len(viewmap)
    for old,new in viewmap.items():
        v=copy.deepcopy(old_views[old]); v["buffer"]=0
        start=v.get("byteOffset",0); length=v["byteLength"]
        # offset was calculated above in sorted order; recalc deterministic:
        pass
    # rebuild again to store exact offsets
    newblob=bytearray(); newviews=[]; viewmap={}
    for old in sorted(used_views):
        v=old_views[old]; start=v.get("byteOffset",0); length=v["byteLength"]
        while len(newblob)%4:newblob.append(0)
        nv=copy.deepcopy(v); nv["buffer"]=0; nv["byteOffset"]=len(newblob)
        viewmap[old]=len(newviews); newviews.append(nv); newblob+=blob[start:start+length]

    # retain accessor indices for simplicity, but strip unused accessor payloads
    newacc=[]
    for i,acc in enumerate(accessors):
        if i in used_acc:
            na=copy.deepcopy(acc)
            if "bufferView" in na: na["bufferView"]=viewmap[na["bufferView"]]
            newacc.append(na)
        else:
            # legal placeholder accessor; no binary payload
            newacc.append({"componentType":5126,"count":0,"type":"SCALAR"})

    newimages=copy.deepcopy(images)
    for i,img in enumerate(newimages):
        if i in used_images and "bufferView" in img: img["bufferView"]=viewmap[img["bufferView"]]
        elif i not in used_images:
            newimages[i]={"uri":"data:image/png;base64,iVBORw0KGgo=","mimeType":"image/png"}

    doc["bufferViews"]=newviews; doc["accessors"]=newacc; doc["images"]=newimages
    doc["buffers"]=[{"byteLength":len(newblob)}]
    write_glb(a.output,doc,bytes(newblob))
    src=Path(a.source); dst=Path(a.output)
    print(f"Wrote {a.output}")
    print(f"V2 GLB: {src.stat().st_size/1024/1024:.2f} MB")
    print(f"V3 compact GLB: {dst.stat().st_size/1024/1024:.2f} MB")
    print(f"Retained accessors: {len(used_acc)} / {len(accessors)}")
    print(f"Retained bufferViews: {len(used_views)} / {len(old_views)}")
    print(f"Retained images: {len(used_images)} / {len(images)}")
    print(f"Cloth primitives: {len(primitives)}")

if __name__=="__main__": main()
