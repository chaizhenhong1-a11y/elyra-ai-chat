#!/usr/bin/env python3
"""
Elyra Outfit Builder V5
Generates an Outfit-01 triangle-level body mask from Stanley Base's actual
JOINTS_0 / WEIGHTS_0. This is an offline analysis artifact; Web is untouched.
"""
from __future__ import annotations
import argparse,json,struct
from pathlib import Path

J=0x4E4F534A; B=0x004E4942
COMPONENT_FMT={5120:"b",5121:"B",5122:"h",5123:"H",5125:"I",5126:"f"}
COMPONENT_SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
TYPE_N={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}
MASK_KEYS=("hips","spine","chest","upperarm","lowerarm","upperleg","lowerleg","foot")
PRESERVE_KEYS=("hand","neck","head")

def read_glb(p):
    raw=Path(p).read_bytes(); magic,ver,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or ver!=2: raise SystemExit("Expected GLB/VRM 2.0 container")
    off=12; doc=None; blob=b""
    while off<total:
        n,t=struct.unpack_from("<II",raw,off);off+=8;c=raw[off:off+n];off+=n
        if t==J: doc=json.loads(c.decode("utf-8").rstrip("\x00 "))
        elif t==B: blob=c
    return doc,blob

def accessor(doc,blob,idx):
    a=doc["accessors"][idx]; v=doc["bufferViews"][a["bufferView"]]
    ct=a["componentType"]; n=TYPE_N[a["type"]]; cs=COMPONENT_SIZE[ct]
    stride=v.get("byteStride",n*cs)
    start=v.get("byteOffset",0)+a.get("byteOffset",0)
    fmt="<"+COMPONENT_FMT[ct]*n
    vals=[]
    for i in range(a["count"]):
        vals.append(struct.unpack_from(fmt,blob,start+i*stride))
    return vals

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("--output",required=True)
    ap.add_argument("--threshold",type=float,default=0.60)
    a=ap.parse_args()
    doc,blob=read_glb(a.base)
    mats=doc.get("materials",[]); nodes=doc.get("nodes",[]); skins=doc.get("skins",[])
    target=None
    for mi,m in enumerate(doc.get("meshes",[])):
        for pi,p in enumerate(m.get("primitives",[])):
            mid=p.get("material")
            name=mats[mid].get("name","") if isinstance(mid,int) and mid<len(mats) else ""
            if "BODY" in name.upper() and "_SKIN" in name.upper():
                target=(mi,pi,p,name);break
        if target:break
    if not target: raise SystemExit("Stanley BODY _SKIN primitive not found")
    mi,pi,p,matname=target

    skin_index=None
    for node in nodes:
        if node.get("mesh")==mi and isinstance(node.get("skin"),int):
            skin_index=node["skin"];break
    if skin_index is None: raise SystemExit("Body mesh skin not found")
    skin=skins[skin_index]; joints=skin["joints"]
    joint_names=[nodes[x].get("name","") for x in joints]
    masked_joint_slots={i for i,n in enumerate(joint_names)
        if any(k in n.lower().replace("_","") for k in MASK_KEYS)
        and not any(k in n.lower() for k in PRESERVE_KEYS)}

    attrs=p["attributes"]
    joints0=accessor(doc,blob,attrs["JOINTS_0"])
    weights0=accessor(doc,blob,attrs["WEIGHTS_0"])
    indices=[x[0] for x in accessor(doc,blob,p["indices"])]

    vertex_mask=[]
    scores=[]
    for js,ws in zip(joints0,weights0):
        score=sum(float(w) for j,w in zip(js,ws) if int(j) in masked_joint_slots)
        scores.append(score); vertex_mask.append(score>=a.threshold)

    hidden=[]; kept=[]
    # conservative: hide triangle only if all 3 vertices are predominantly covered
    for t in range(0,len(indices)-2,3):
        tri=indices[t:t+3]
        (hidden if all(vertex_mask[v] for v in tri) else kept).append(t//3)

    report={
      "schema":"elyra.body-mask.v1",
      "outfitId":"outfit-01",
      "baseFile":Path(a.base).name,
      "bodyMeshIndex":mi,
      "bodyPrimitiveIndex":pi,
      "bodyMaterial":matname,
      "skinIndex":skin_index,
      "threshold":a.threshold,
      "rule":"hide triangle only when all three vertices have covered-bone weight >= threshold",
      "maskedJointSlots":sorted(masked_joint_slots),
      "maskedJointNames":[joint_names[i] for i in sorted(masked_joint_slots)],
      "vertexCount":len(vertex_mask),
      "triangleCount":len(indices)//3,
      "hiddenTriangleCount":len(hidden),
      "keptTriangleCount":len(kept),
      "hiddenTriangles":hidden,
      "preservePolicy":["head","neck","leftHand","rightHand"]
    }
    Path(a.output).write_text(json.dumps(report,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"Wrote {a.output}")
    print(f"Body material: {matname}")
    print(f"Body vertices: {len(vertex_mask)}")
    print(f"Body triangles: {len(indices)//3}")
    print(f"Mask threshold: {a.threshold:.2f}")
    print(f"Masked bone slots: {len(masked_joint_slots)}")
    print(f"Hidden triangles: {len(hidden)}")
    print(f"Kept triangles: {len(kept)}")
    pct=(100*len(hidden)/(len(indices)//3)) if indices else 0
    print(f"Body triangles hidden: {pct:.2f}%")
    for n in report["maskedJointNames"]: print(" MASK:",n)

if __name__=="__main__":main()
