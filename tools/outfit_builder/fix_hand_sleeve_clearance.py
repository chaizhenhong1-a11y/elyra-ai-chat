#!/usr/bin/env python3
"""
Elyra Outfit 01 — Hand/Sleeve Clearance V1

Extends the accepted Body Mask ONLY at the wrist seam.
It does not hide hand/finger triangles and does not change outfit geometry,
animations, camera, pants, shoes, or existing mask regions.

A triangle is added only when:
- all 3 vertices have meaningful LowerArm influence, AND
- none of the 3 vertices has meaningful Hand influence.
"""
from __future__ import annotations
import argparse,json,struct
from pathlib import Path

J=0x4E4F534A; B=0x004E4942
FMT={5120:"b",5121:"B",5122:"h",5123:"H",5125:"I",5126:"f"}
SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
N={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}

def read_glb(p):
    raw=Path(p).read_bytes(); magic,ver,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or ver!=2: raise SystemExit("Expected GLB/VRM 2.0")
    off=12; doc=None; blob=b""
    while off<total:
        n,t=struct.unpack_from("<II",raw,off);off+=8;c=raw[off:off+n];off+=n
        if t==J: doc=json.loads(c.decode("utf-8").rstrip("\x00 "))
        elif t==B: blob=c
    return doc,blob

def acc(doc,blob,i):
    a=doc["accessors"][i]; v=doc["bufferViews"][a["bufferView"]]
    n=N[a["type"]]; ct=a["componentType"]; stride=v.get("byteStride",n*SIZE[ct])
    start=v.get("byteOffset",0)+a.get("byteOffset",0); fmt="<"+FMT[ct]*n
    return [struct.unpack_from(fmt,blob,start+x*stride) for x in range(a["count"])]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("--mask",required=True)
    ap.add_argument("--output",required=True)
    ap.add_argument("--arm-threshold",type=float,default=0.12)
    ap.add_argument("--hand-protect-threshold",type=float,default=0.05)
    a=ap.parse_args()

    doc,blob=read_glb(a.base)
    old=json.loads(Path(a.mask).read_text(encoding="utf-8"))
    mats=doc.get("materials",[]); nodes=doc.get("nodes",[]); skins=doc.get("skins",[])

    target=None
    for mi,m in enumerate(doc.get("meshes",[])):
        for pi,p in enumerate(m.get("primitives",[])):
            mid=p.get("material")
            name=mats[mid].get("name","") if isinstance(mid,int) and mid<len(mats) else ""
            if "BODY" in name.upper() and "_SKIN" in name.upper():
                target=(mi,p); break
        if target: break
    if not target: raise SystemExit("BODY _SKIN primitive not found")
    mi,p=target

    skin_index=None
    for node in nodes:
        if node.get("mesh")==mi and isinstance(node.get("skin"),int):
            skin_index=node["skin"]; break
    if skin_index is None: raise SystemExit("Body skin not found")

    joint_nodes=skins[skin_index]["joints"]
    names=[nodes[x].get("name","") for x in joint_nodes]
    arm_slots={i for i,n in enumerate(names) if "lowerarm" in n.lower()}
    hand_slots={i for i,n in enumerate(names) if "hand" in n.lower() or "finger" in n.lower() or "thumb" in n.lower()}

    js=acc(doc,blob,p["attributes"]["JOINTS_0"])
    ws=acc(doc,blob,p["attributes"]["WEIGHTS_0"])
    indices=[x[0] for x in acc(doc,blob,p["indices"])]

    arm_vertex=[]; hand_vertex=[]
    for jv,wv in zip(js,ws):
        arm=sum(float(w) for j,w in zip(jv,wv) if int(j) in arm_slots)
        hand=sum(float(w) for j,w in zip(jv,wv) if int(j) in hand_slots)
        arm_vertex.append(arm>=a.arm_threshold)
        hand_vertex.append(hand>=a.hand_protect_threshold)

    old_hidden=set(old["hiddenTriangles"]); added=set()
    for t in range(0,len(indices)-2,3):
        tri_no=t//3
        if tri_no in old_hidden: continue
        tri=indices[t:t+3]
        if all(arm_vertex[v] for v in tri) and not any(hand_vertex[v] for v in tri):
            added.add(tri_no)

    hidden=sorted(old_hidden|added)
    result=dict(old)
    result["schema"]="elyra.body-mask.v1.foot-and-sleeve-fix"
    result["hiddenTriangles"]=hidden
    result["hiddenTriangleCount"]=len(hidden)
    result["keptTriangleCount"]=result["triangleCount"]-len(hidden)
    result["sleeveClearance"]={
      "armThreshold":a.arm_threshold,
      "handProtectThreshold":a.hand_protect_threshold,
      "rule":"all vertices LowerArm-influenced; reject triangle if any vertex is Hand/Finger/Thumb-influenced",
      "lowerArmJointNames":[names[i] for i in sorted(arm_slots)],
      "protectedHandJointNames":[names[i] for i in sorted(hand_slots)],
      "addedTriangles":len(added)
    }

    Path(a.output).write_text(json.dumps(result,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"Wrote {a.output}")
    print(f"Existing hidden triangles: {len(old_hidden)}")
    print(f"LowerArm bone slots: {len(arm_slots)}")
    for i in sorted(arm_slots): print(" SLEEVE:",names[i])
    print(f"Protected hand/finger bone slots: {len(hand_slots)}")
    print(f"Arm threshold: {a.arm_threshold:.2f}")
    print(f"Hand protect threshold: {a.hand_protect_threshold:.2f}")
    print(f"Additional wrist/forearm triangles hidden: {len(added)}")
    print(f"Final hidden triangles: {len(hidden)} / {result['triangleCount']}")
    print(f"Final body triangles hidden: {100*len(hidden)/result['triangleCount']:.2f}%")

if __name__=="__main__": main()
