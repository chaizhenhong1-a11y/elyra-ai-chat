#!/usr/bin/env python3
"""
Elyra Outfit 01 — Coat Body Fit V1

Lightly pulls ONLY the coat torso/body vertices inward in local X.
Sleeves/arms, hands, trousers, shoes and vertical length are not changed.

Selection is skin-weight based:
- only Tops clothing primitives
- exclude vertices meaningfully influenced by UpperArm/LowerArm/Hand
- torso vertices are influenced by Hips/Spine/Chest/UpperChest
- X is scaled toward the center by 4% (default)
"""
from __future__ import annotations
import argparse,json,struct
from pathlib import Path

J=0x4E4F534A; B=0x004E4942
FMT={5120:"b",5121:"B",5122:"h",5123:"H",5125:"I",5126:"f"}
SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
N={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}

def read_glb(p):
    raw=bytearray(Path(p).read_bytes())
    magic,ver,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or ver!=2: raise SystemExit("Expected GLB 2.0")
    off=12; doc=None; blob=None; blob_file_offset=None
    while off<total:
        n,t=struct.unpack_from("<II",raw,off); off+=8
        if t==J: doc=json.loads(bytes(raw[off:off+n]).decode("utf-8").rstrip("\x00 "))
        elif t==B:
            blob=raw[off:off+n]
            blob_file_offset=off
        off+=n
    if doc is None or blob is None: raise SystemExit("Missing GLB chunks")
    return raw,doc,blob,blob_file_offset

def read_acc(doc,blob,i):
    a=doc["accessors"][i]; v=doc["bufferViews"][a["bufferView"]]
    n=N[a["type"]]; ct=a["componentType"]; stride=v.get("byteStride",n*SIZE[ct])
    start=v.get("byteOffset",0)+a.get("byteOffset",0); fmt="<"+FMT[ct]*n
    return [struct.unpack_from(fmt,blob,start+x*stride) for x in range(a["count"])]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--output",required=True)
    ap.add_argument("--inset",type=float,default=0.04)
    ap.add_argument("--torso-threshold",type=float,default=0.45)
    ap.add_argument("--arm-protect-threshold",type=float,default=0.12)
    a=ap.parse_args()
    if not (0<a.inset<0.15): raise SystemExit("--inset must be between 0 and 0.15")

    raw,doc,blob,blob_file_offset=read_glb(a.source)
    mats=doc.get("materials",[]); nodes=doc.get("nodes",[]); skins=doc.get("skins",[])
    changed_vertices=0; touched_prims=0

    # map mesh -> skin from scene nodes
    mesh_skin={}
    for node in nodes:
        if isinstance(node.get("mesh"),int) and isinstance(node.get("skin"),int):
            mesh_skin[node["mesh"]]=node["skin"]

    for mi,mesh in enumerate(doc.get("meshes",[])):
        skin_i=mesh_skin.get(mi)
        if skin_i is None or skin_i>=len(skins): continue
        joint_nodes=skins[skin_i].get("joints",[])
        names=[nodes[j].get("name","") if j<len(nodes) else "" for j in joint_nodes]
        torso_slots={i for i,n in enumerate(names) if any(k in n.lower() for k in ("hips","spine","chest"))}
        arm_slots={i for i,n in enumerate(names) if any(k in n.lower() for k in ("upperarm","lowerarm","hand","finger","thumb"))}

        for p in mesh.get("primitives",[]):
            mid=p.get("material")
            matname=mats[mid].get("name","") if isinstance(mid,int) and mid<len(mats) else ""
            if "TOPS" not in matname.upper() or "_CLOTH" not in matname.upper(): continue
            attrs=p.get("attributes",{})
            if not all(k in attrs for k in ("POSITION","JOINTS_0","WEIGHTS_0")): continue

            pos_i=attrs["POSITION"]; pos_a=doc["accessors"][pos_i]
            if pos_a["componentType"]!=5126 or pos_a["type"]!="VEC3": raise SystemExit("POSITION must be float VEC3")
            joints=read_acc(doc,blob,attrs["JOINTS_0"]); weights=read_acc(doc,blob,attrs["WEIGHTS_0"])
            view=doc["bufferViews"][pos_a["bufferView"]]
            stride=view.get("byteStride",12)
            start=view.get("byteOffset",0)+pos_a.get("byteOffset",0)
            count=pos_a["count"]; local_changed=0

            for vi in range(count):
                torso=sum(float(w) for j,w in zip(joints[vi],weights[vi]) if int(j) in torso_slots)
                arm=sum(float(w) for j,w in zip(joints[vi],weights[vi]) if int(j) in arm_slots)
                if torso<a.torso_threshold or arm>=a.arm_protect_threshold: continue
                off=start+vi*stride
                x,y,z=struct.unpack_from("<fff",blob,off)
                # only horizontal fit: preserve Y (length) and Z (front/back silhouette)
                struct.pack_into("<f",blob,off,x*(1.0-a.inset))
                local_changed+=1

            if local_changed:
                touched_prims+=1; changed_vertices+=local_changed
                print(f" FIT: {matname} -> {local_changed} vertices")

    # replace BIN bytes in original GLB container; JSON/index layout remains unchanged
    raw[blob_file_offset:blob_file_offset+len(blob)]=blob
    Path(a.output).write_bytes(raw)

    print(f"Wrote {a.output}")
    print(f"Horizontal inset: {a.inset*100:.1f}%")
    print(f"Tops primitives changed: {touched_prims}")
    print(f"Coat torso vertices changed: {changed_vertices}")
    print("Sleeve/arm weighted vertices protected: yes")
    print("Vertical length changed: no")
    print("Pants/shoes changed: no")

if __name__=="__main__": main()
