#!/usr/bin/env python3
import argparse,json,struct
from pathlib import Path
J=0x4E4F534A;B=0x004E4942
SZ={5121:1,5123:2,5125:4,5126:4};FM={5121:"B",5123:"H",5125:"I",5126:"f"};NN={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}
def load(p):
 r=bytearray(Path(p).read_bytes());m,v,t=struct.unpack_from("<4sII",r,0)
 if m!=b"glTF" or v!=2: raise SystemExit("Expected GLB 2.0")
 o=12;d=b=bo=None
 while o<t:
  n,k=struct.unpack_from("<II",r,o);o+=8
  if k==J:d=json.loads(bytes(r[o:o+n]).decode().rstrip("\x00 "))
  elif k==B:b=bytearray(r[o:o+n]);bo=o
  o+=n
 return r,d,b,bo
def acc(d,b,i):
 a=d["accessors"][i];v=d["bufferViews"][a["bufferView"]];c=NN[a["type"]];ct=a["componentType"];s=v.get("byteStride",SZ[ct]*c);p=v.get("byteOffset",0)+a.get("byteOffset",0);f="<"+FM[ct]*c
 return [struct.unpack_from(f,b,p+k*s) for k in range(a["count"])]
def main():
 q=argparse.ArgumentParser();q.add_argument("source");q.add_argument("--output",required=True);q.add_argument("--clearance-mm",type=float,default=10);a=q.parse_args()
 r,d,b,bo=load(a.source);ns=d["nodes"];ss=d["skins"];ms=d["materials"]
 mi=si=None
 for n in ns:
  if isinstance(n.get("mesh"),int) and isinstance(n.get("skin"),int):mi=n["mesh"];si=n["skin"];break
 mesh=d["meshes"][mi]; names=[ns[x].get("name","") for x in ss[si]["joints"]]
 torso={i for i,n in enumerate(names) if any(k in n.lower() for k in ("hips","spine","chest"))}
 arms={i for i,n in enumerate(names) if any(k in n.lower() for k in ("upperarm","lowerarm","hand","finger","thumb"))}
 tops=[]
 for p in mesh["primitives"]:
  x=p.get("material");name=ms[x].get("name","") if isinstance(x,int) else ""
  if "TOPS" in name.upper() and "_CLOTH" in name.upper():tops.append(p)
 at=tops[0]["attributes"];pi,ji,wi=at["POSITION"],at["JOINTS_0"],at["WEIGHTS_0"];P,K,W=acc(d,b,pi),acc(d,b,ji),acc(d,b,wi)
 verts=set()
 for p in tops: verts.update(int(x[0]) for x in acc(d,b,p["indices"]))
 cand=[]
 for i in verts:
  tw=sum(float(w) for j,w in zip(K[i],W[i]) if int(j) in torso);aw=sum(float(w) for j,w in zip(K[i],W[i]) if int(j) in arms)
  if tw>=.45 and aw<.10:cand.append((i,*P[i]))
 ys=sorted(x[2] for x in cand);qt=lambda q:ys[int((len(ys)-1)*q)];y0,y1=qt(.22),qt(.70)
 pa=d["accessors"][pi];pv=d["bufferViews"][pa["bufferView"]];st=pv.get("byteOffset",0)+pa.get("byteOffset",0);stride=pv.get("byteStride",12);push=a.clearance_mm/1000
 changed=L=R=0
 for i,x,y,z in cand:
  ax=abs(x)
  if not(y0<=y<=y1) or ax<.10:continue
  sx=min(1,max(0,(ax-.10)/.06));span=max(y1-y0,1e-6);vy=min(1,max(0,min((y-y0)/(span*.22),(y1-y)/(span*.22))));s=sx*vy
  if s<=0:continue
  nx=x+(push*s if x>=0 else -push*s);struct.pack_into("<f",b,st+i*stride,nx);changed+=1
  if x<0:L+=1
  else:R+=1
 r[bo:bo+len(b)]=b;Path(a.output).write_bytes(r)
 print(f"Wrote: {a.output}\nTops primitives: {len(tops)}\nUnique Tops vertices: {len(verts)}\nProtected coat-body candidates: {len(cand)}\nHand-height Y band: {y0:.4f} .. {y1:.4f}\nLocal clearance vertices moved: {changed} (left {L}, right {R})\nMaximum local outward clearance: {a.clearance_mm:.1f} mm\nDirection: outward from body (not inward)\nSleeve/arm-weighted vertices moved: no\nPants/shoes moved: no\nCoat length changed: no")
if __name__=="__main__":main()
