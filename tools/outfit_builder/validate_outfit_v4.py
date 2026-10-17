#!/usr/bin/env python3
"""
Elyra Outfit Builder V4
1) Strict structural validation of the compact clothing GLB.
2) Analyze the base Stanley body skin weights to produce a conservative
   body-mask recommendation for Outfit 01.

This stage does NOT modify Web/runtime yet.
"""
from __future__ import annotations
import argparse,json,struct
from pathlib import Path
J=0x4E4F534A; B=0x004E4942

def read_glb(p):
    raw=Path(p).read_bytes(); magic,ver,total=struct.unpack_from("<4sII",raw,0)
    if magic!=b"glTF" or ver!=2: raise SystemExit(f"Invalid GLB: {p}")
    off=12; doc=None; blob=b""
    while off<total:
        n,t=struct.unpack_from("<II",raw,off);off+=8;c=raw[off:off+n];off+=n
        if t==J: doc=json.loads(c.decode("utf-8").rstrip("\x00 "))
        elif t==B: blob=c
    if doc is None: raise SystemExit("Missing JSON")
    return doc,blob

def acc_ok(doc,blob,i):
    a=doc["accessors"][i]
    if a.get("count",0)==0:return False,"count=0"
    if "bufferView" not in a:return True,"sparse/implicit"
    v=doc["bufferViews"][a["bufferView"]]
    start=v.get("byteOffset",0)+a.get("byteOffset",0)
    if start>=len(blob):return False,"offset outside BIN"
    return True,"ok"

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("compact")
    ap.add_argument("--base",required=True)
    ap.add_argument("--output",required=True)
    a=ap.parse_args()
    doc,blob=read_glb(a.compact)
    errors=[]; prims=doc.get("meshes",[{}])[0].get("primitives",[])
    required=("POSITION","NORMAL","TEXCOORD_0","JOINTS_0","WEIGHTS_0")
    used=set()
    for pi,p in enumerate(prims):
        for k in required:
            if k not in p.get("attributes",{}): errors.append(f"primitive {pi}: missing {k}")
            else: used.add(p["attributes"][k])
        if "indices" not in p: errors.append(f"primitive {pi}: missing indices")
        else: used.add(p["indices"])
    for s in doc.get("skins",[]):
        if "inverseBindMatrices" in s: used.add(s["inverseBindMatrices"])
        if not s.get("joints"): errors.append("skin: no joints")
    for i in sorted(used):
        ok,msg=acc_ok(doc,blob,i)
        if not ok: errors.append(f"accessor {i}: {msg}")

    base,bblob=read_glb(a.base)
    nodes=base.get("nodes",[])
    skins=base.get("skins",[])
    joint_names=[]
    for skin in skins:
        for ni in skin.get("joints",[]):
            name=nodes[ni].get("name","") if ni<len(nodes) else ""
            if name and name not in joint_names: joint_names.append(name)

    # Conservative semantic mask proposal. We only recommend covered humanoid
    # regions; V5 will convert this into triangle-level mask data after measuring
    # actual vertex weights. Hands/neck/head are deliberately excluded.
    keys=("spine","chest","upperarm","lowerarm","hips","upperleg","lowerleg","foot","toes")
    covered=[n for n in joint_names if any(k in n.lower().replace("_","") for k in keys)]
    preserve_keys=("hand","neck","head")
    covered=[n for n in covered if not any(k in n.lower() for k in preserve_keys)]

    report={
      "schema":"elyra.outfit.validation.v1",
      "compactFile":Path(a.compact).name,
      "compactBytes":Path(a.compact).stat().st_size,
      "clothPrimitives":len(prims),
      "structuralValid":not errors,
      "errors":errors,
      "skinCount":len(doc.get("skins",[])),
      "jointCountMax":max((len(s.get("joints",[])) for s in doc.get("skins",[])),default=0),
      "bodyMaskAnalysis":{
        "baseFile":Path(a.base).name,
        "baseJointNamesFound":len(joint_names),
        "candidateCoveredBones":covered,
        "preserve":["head","neck","leftHand","rightHand"],
        "status":"analysis-only; no runtime mask applied"
      }
    }
    Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Wrote {a.output}")
    print(f"Compact GLB: {Path(a.compact).stat().st_size/1024/1024:.2f} MB")
    print(f"Cloth primitives: {len(prims)}")
    print(f"Skin count: {report['skinCount']}")
    print(f"Max skin joints: {report['jointCountMax']}")
    print(f"Required accessors checked: {len(used)}")
    print(f"Structural validation: {'PASS' if not errors else 'FAIL'}")
    if errors:
        for e in errors: print(" ERROR:",e)
    print(f"Base joints discovered: {len(joint_names)}")
    print(f"Body-mask candidate bones: {len(covered)}")
    for n in covered: print(" MASK-CANDIDATE:",n)

if __name__=="__main__":main()
