#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, struct
from pathlib import Path

JSON_CHUNK=0x4E4F534A
BIN_CHUNK=0x004E4942
COMP_FMT={5121:"B",5123:"H",5125:"I",5126:"f"}
COMP_SIZE={5121:1,5123:2,5125:4,5126:4}
COMP_N={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}

def load_glb(path):
    raw=bytearray(Path(path).read_bytes())
    magic,version,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or version!=2:
        raise SystemExit("Expected GLB 2.0")
    off=12; doc=None; blob=None; bin_file_off=None
    while off<total:
        size,kind=struct.unpack_from("<II",raw,off); off+=8
        if kind==JSON_CHUNK:
            doc=json.loads(bytes(raw[off:off+size]).decode("utf-8").rstrip("\x00 "))
        elif kind==BIN_CHUNK:
            blob=bytearray(raw[off:off+size]); bin_file_off=off
        off+=size
    if doc is None or blob is None:
        raise SystemExit("Missing GLB JSON/BIN")
    return raw,doc,blob,bin_file_off

def accessor(doc,blob,index):
    a=doc["accessors"][index]; v=doc["bufferViews"][a["bufferView"]]
    n=COMP_N[a["type"]]; ct=a["componentType"]
    fmt="<"+COMP_FMT[ct]*n
    stride=v.get("byteStride",COMP_SIZE[ct]*n)
    start=v.get("byteOffset",0)+a.get("byteOffset",0)
    return [struct.unpack_from(fmt,blob,start+i*stride) for i in range(a["count"])]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--output",required=True)
    ap.add_argument("--clearance-mm",type=float,default=12.0)
    args=ap.parse_args()

    raw,doc,blob,bin_file_off=load_glb(args.source)
    meshes=doc.get("meshes",[]); mats=doc.get("materials",[])
    nodes=doc.get("nodes",[]); skins=doc.get("skins",[])
    if not meshes or not skins:
        raise SystemExit("No skinned outfit mesh found")

    # Locate the outfit mesh/skin.
    mesh_index=0
    skin_index=None
    for node in nodes:
        if node.get("mesh")==mesh_index and isinstance(node.get("skin"),int):
            skin_index=node["skin"]; break
    if skin_index is None:
        raise SystemExit("Could not locate outfit skin")

    joint_nodes=skins[skin_index]["joints"]
    joint_names=[nodes[n].get("name","") for n in joint_nodes]
    torso={i for i,n in enumerate(joint_names)
           if any(k in n.lower() for k in ("hips","spine","chest"))}
    arm={i for i,n in enumerate(joint_names)
         if any(k in n.lower() for k in
                ("upperarm","lowerarm","hand","finger","thumb"))}

    mesh=meshes[mesh_index]
    top_prims=[]
    for prim in mesh.get("primitives",[]):
        mi=prim.get("material")
        name=mats[mi].get("name","") if isinstance(mi,int) and mi<len(mats) else ""
        if "TOPS" in name.upper() and "_CLOTH" in name.upper():
            top_prims.append((prim,name))
    if not top_prims:
        raise SystemExit("No Tops clothing primitives found")

    attrs=top_prims[0][0]["attributes"]
    pos_i=attrs["POSITION"]; joints_i=attrs["JOINTS_0"]; weights_i=attrs["WEIGHTS_0"]
    positions=accessor(doc,blob,pos_i)
    joints=accessor(doc,blob,joints_i)
    weights=accessor(doc,blob,weights_i)

    # CRITICAL: only vertices actually referenced by the Tops primitives.
    # V1 modified a shared POSITION accessor, so it could touch non-coat vertices.
    top_vertices=set()
    for prim,_ in top_prims:
        for row in accessor(doc,blob,prim["indices"]):
            top_vertices.add(int(row[0]))

    pa=doc["accessors"][pos_i]; pv=doc["bufferViews"][pa["bufferView"]]
    pstart=pv.get("byteOffset",0)+pa.get("byteOffset",0)
    pstride=pv.get("byteStride",12)

    clearance=args.clearance_mm/1000.0
    changed=0
    left=right=0
    for vi in sorted(top_vertices):
        js=joints[vi]; ws=weights[vi]
        torso_w=sum(float(w) for j,w in zip(js,ws) if int(j) in torso)
        arm_w=sum(float(w) for j,w in zip(js,ws) if int(j) in arm)
        x,y,z=positions[vi]

        # Coat body only: reject sleeve/hand-weighted vertices.
        if torso_w < 0.45 or arm_w >= 0.12:
            continue

        ax=abs(float(x))
        # Only the visible side silhouette, not front-center coat panels.
        # Smooth ramp: no change inside 9 cm; full clearance by 15 cm.
        if ax <= 0.09:
            continue
        ramp=min(1.0,max(0.0,(ax-0.09)/0.06))
        # Keep the very top shoulder transition gentle.
        if y > 1.48:
            ramp *= max(0.0,(1.58-y)/0.10)
        if ramp <= 0:
            continue

        delta=clearance*ramp
        nx=(ax-delta)
        # Never cross the protected inner boundary.
        nx=max(nx,0.085)
        nx=nx if x>=0 else -nx

        struct.pack_into("<f",blob,pstart+vi*pstride,float(nx))
        changed+=1
        if x<0: left+=1
        else: right+=1

    raw[bin_file_off:bin_file_off+len(blob)]=blob
    Path(args.output).write_bytes(raw)

    print(f"Wrote: {args.output}")
    print(f"Tops primitives: {len(top_prims)}")
    print(f"Unique Tops vertices: {len(top_vertices)}")
    print(f"Side coat vertices moved: {changed} (left {left}, right {right})")
    print(f"Maximum inward clearance: {args.clearance_mm:.1f} mm")
    print("Sleeve/hand-weighted vertices moved: no")
    print("Pants/shoes vertices moved: no")
    print("Coat Y/length changed: no")

if __name__=="__main__":
    main()
