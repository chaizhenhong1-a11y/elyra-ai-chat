"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, type VRM} from "@pixiv/three-vrm";
import {createVRMAnimationClip, VRMAnimationLoaderPlugin} from "@pixiv/three-vrm-animation";

type CharacterModelKey = "elyra-stanley" | "male-01";
const characterModels: Record<CharacterModelKey,{name:string;url:string;author:string;description:string}> = {
  // Elyra Stanley was created by Stanley in VRoid Studio and is Elyra's default character.
  "elyra-stanley": {name:"Elyra Stanley",url:"/models/templates/elyra-stanley.vrm",author:"Stanley",description:"Custom Elyra character · VRM 1.0"},
  "male-01": {name:"Male 01",url:"/models/templates/elyra-template-male-01.vrm",author:"pixiv VRoid Project",description:"Previous Elyra VRM template"},
};
const IDLE_VRMA_URL = "/animations/standing_idle.vrma";

function apiBaseUrl(){
  if(typeof window==="undefined")return "http://localhost:4000/api/v1";
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
}
const skinPresets = [
  {label:"Original", value:"original"},
  {label:"Fair", value:"#f0cbb8"},
  {label:"Natural", value:"#ddb092"},
  {label:"Warm", value:"#c99270"},
  {label:"Tan", value:"#aa7354"},
  {label:"Brown", value:"#805038"},
  {label:"Deep", value:"#593421"},
] as const;

type SkinMaterial = THREE.Material & {color?: THREE.Color; needsUpdate:boolean};
type SkinRecord = {material:SkinMaterial; original:THREE.Color};

function collectSkinMaterials(root:THREE.Object3D):SkinRecord[]{
  const seen=new Set<THREE.Material>();
  const records:SkinRecord[]=[];
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.forEach(material=>{
      if(!material||seen.has(material)||!material.name.toUpperCase().includes("_SKIN"))return;
      const skin=material as SkinMaterial;
      if(!skin.color)return;
      seen.add(material);
      records.push({material:skin,original:skin.color.clone()});
    });
  });
  return records;
}

function applySkinTone(records:SkinRecord[],tone:string){
  records.forEach(({material,original})=>{
    if(!material.color)return;
    if(tone==="original")material.color.copy(original);
    else {
      // Keep the authored VRoid texture/shading and tint only the two *_SKIN materials.
      // A partial blend avoids flattening the face texture into a solid colour.
      const target=new THREE.Color(tone);
      material.color.copy(original).lerp(target,.58);
    }
    material.needsUpdate=true;
  });
}


function applyNaturalHandRelaxation(vrm:VRM){
  const humanoid=vrm.humanoid;
  if(!humanoid)return;

  // Apply after AnimationMixer.update(). The mixer writes the authored idle pose
  // first, then these tiny local offsets soften the straight VRMA arm/wrist pose.
  // Because the animation rewrites these bones every frame, the offsets do not
  // accumulate over time.
  const offset=(boneName:Parameters<typeof humanoid.getNormalizedBoneNode>[0],x:number,y:number,z:number)=>{
    const bone=humanoid.getNormalizedBoneNode(boneName);
    if(!bone)return;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z),
      "XYZ",
    ));
    bone.quaternion.multiply(q);
  };

  // Slight asymmetry is intentional: perfectly mirrored arms read as mannequin-like.
  offset("leftUpperArm",0,1.2,-2.4);
  offset("rightUpperArm",0,-.8,2.0);
  offset("leftLowerArm",0,-1.8,-2.2);
  offset("rightLowerArm",0,1.4,1.8);
  // V5: lock the already-good left hand. Ease the right wrist back slightly from
  // V4 so the palm rests beside the thigh without looking deliberately tucked in.
  offset("leftHand",0.6,10.5,-0.8);
  offset("rightHand",0.45,-8.4,0.55);
}


function applyNaturalFingerPose(vrm:VRM){
  const humanoid=vrm.humanoid;
  if(!humanoid)return;

  // Finger bones are normally not keyed by the standing idle. Apply this once
  // after the mixer is primed so the hands keep a relaxed, slightly curled pose
  // instead of the VRoid straight-finger mannequin shape.
  const offset=(boneName:Parameters<typeof humanoid.getNormalizedBoneNode>[0],x:number,y:number,z:number)=>{
    const bone=humanoid.getNormalizedBoneNode(boneName);
    if(!bone)return;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z),
      "XYZ",
    ));
    bone.quaternion.multiply(q);
  };

  const curlFinger=(side:"left"|"right",finger:"Index"|"Middle"|"Ring"|"Little",proximal:number,intermediate:number,distal:number)=>{
    const sign=side==="left"?1:-1;
    offset(`${side}${finger}Proximal` as Parameters<typeof humanoid.getNormalizedBoneNode>[0],0,0,sign*proximal);
    offset(`${side}${finger}Intermediate` as Parameters<typeof humanoid.getNormalizedBoneNode>[0],0,0,sign*intermediate);
    offset(`${side}${finger}Distal` as Parameters<typeof humanoid.getNormalizedBoneNode>[0],0,0,sign*distal);
  };

  // Uneven curls are intentional: relaxed fingers do not form one flat blade.
  // V3: keep the fingers loose rather than increasing curl. The palm orientation
  // now does most of the visual work; excessive curl made the silhouette claw-like.
  curlFinger("left","Index",4,5,2);
  curlFinger("left","Middle",6,7,3);
  curlFinger("left","Ring",8,9,4);
  curlFinger("left","Little",10,11,5);
  // V6 FINAL HAND POSE: keep the V5 wrist/arm orientation and locked left hand.
  // Only settle the right four fingers into a slightly more relaxed cascade.
  curlFinger("right","Index",3,4.5,1.75);
  curlFinger("right","Middle",5,6.5,2.75);
  curlFinger("right","Ring",7,8.5,3.75);
  curlFinger("right","Little",9,10.5,4.75);

  // Let each thumb sit a little away from the palm rather than being pinned flat.
  offset("leftThumbMetacarpal",0,-3,3);
  offset("leftThumbProximal",0,-2,4);
  offset("leftThumbDistal",0,0,2);
  offset("rightThumbMetacarpal",0,3,-3);
  offset("rightThumbProximal",0,2,-4);
  offset("rightThumbDistal",0,0,-2);
}

function HumanPreview({skinTone,modelKey,onAssetState}:{skinTone:string;modelKey:CharacterModelKey;onAssetState:(s:string)=>void}){
  const ref=useRef<HTMLDivElement>(null);
  const skinRecordsRef=useRef<SkinRecord[]>([]);

  useEffect(()=>{applySkinTone(skinRecordsRef.current,skinTone)},[skinTone]);

  useEffect(()=>{
    const el=ref.current;if(!el)return;
    let disposed=false;
    let currentVrm:VRM|null=null;
    let animationMixer:THREE.AnimationMixer|null=null;
    let idleElapsed=0;
    let nextBlinkAt=2.2;
    let blinkStartedAt=-1;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(30,1,.01,100);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff,0x303650,2.4));
    const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(3,5,4);scene.add(key);
    const rim=new THREE.DirectionalLight(0xb9c9ff,1.4);rim.position.set(-3,3,-3);scene.add(rim);

    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.enablePan=true;
    controls.screenSpacePanning=true;
    controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};

    const loader=new GLTFLoader();
    loader.register(parser=>new VRMLoaderPlugin(parser));
    loader.register(parser=>new VRMAnimationLoaderPlugin(parser));
    onAssetState("Loading VRM template…");
    loader.load(characterModels[modelKey].url,gltf=>{
      if(disposed)return;
      const vrm=gltf.userData.vrm as VRM|undefined;
      if(!vrm){onAssetState("VRM metadata missing");return;}
      currentVrm=vrm;
      idleElapsed=0;
      nextBlinkAt=1.8+Math.random()*2.4;
      blinkStartedAt=-1;
      const model=vrm.scene;
      model.traverse(object=>{object.frustumCulled=false});
      skinRecordsRef.current=collectSkinMaterials(model);
      applySkinTone(skinRecordsRef.current,skinTone);
      scene.add(model);

      const box=new THREE.Box3().setFromObject(model);
      const size=box.getSize(new THREE.Vector3());
      const center=box.getCenter(new THREE.Vector3());
      const height=Math.max(size.y,.01);
      controls.target.copy(center);
      camera.position.set(center.x,height*.08,center.z+height*1.45);
      camera.near=Math.max(height/1000,.01);camera.far=Math.max(height*20,100);camera.updateProjectionMatrix();
      controls.minDistance=height*.18;controls.maxDistance=height*5;controls.update();
      onAssetState(`VRM 1.0 loaded · loading VRMA idle…`);
      loader.load(IDLE_VRMA_URL,animationGltf=>{
        if(disposed||currentVrm!==vrm)return;
        const vrmAnimations=animationGltf.userData.vrmAnimations as unknown[]|undefined;
        const vrmAnimation=vrmAnimations?.[0];
        if(!vrmAnimation){onAssetState("VRM loaded · idle.vrma has no VRM animation");return;}
        const clip=createVRMAnimationClip(vrmAnimation as Parameters<typeof createVRMAnimationClip>[0],vrm);
        animationMixer=new THREE.AnimationMixer(vrm.scene);
        const action=animationMixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat,Infinity);
        action.play();
        animationMixer.update(0);
        applyNaturalFingerPose(vrm);
        onAssetState(`VRM 1.0 loaded · VRMA idle active · humanoid ${vrm.humanoid?"ready":"missing"} · expressions ${vrm.expressionManager?"ready":"missing"} · spring bones ${vrm.springBoneManager?"ready":"missing"}`);
      },undefined,error=>{console.error("Failed to load idle VRMA",error);onAssetState("VRM loaded · idle VRMA missing or failed")});
    },undefined,error=>{console.error("Failed to load Elyra VRM",error);onAssetState("VRM load failed")});

    const resize=()=>{const w=Math.max(el.clientWidth,1),h=Math.max(el.clientHeight,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
    resize();const ro=new ResizeObserver(resize);ro.observe(el);const clock=new THREE.Clock();let id=0;
    const loop=()=>{
      const dt=Math.min(clock.getDelta(),.05);
      if(currentVrm){
        idleElapsed+=dt;
        animationMixer?.update(dt);
        applyNaturalHandRelaxation(currentVrm);
        const expressions=currentVrm.expressionManager;
        if(expressions){
          if(blinkStartedAt<0&&idleElapsed>=nextBlinkAt)blinkStartedAt=idleElapsed;
          let blink=0;
          if(blinkStartedAt>=0){
            const t=(idleElapsed-blinkStartedAt)/.18;
            blink=t<.5?t*2:Math.max(0,(1-t)*2);
            if(t>=1){blinkStartedAt=-1;nextBlinkAt=idleElapsed+2.2+Math.random()*3.2;}
          }
          expressions.setValue("blink",blink);
        }
        currentVrm.update(dt);
      }
      controls.update();renderer.render(scene,camera);id=requestAnimationFrame(loop)
    };loop();
    return()=>{
      disposed=true;cancelAnimationFrame(id);ro.disconnect();controls.dispose();animationMixer?.stopAllAction();animationMixer=null;skinRecordsRef.current=[];
      scene.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.geometry?.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m?.dispose())});
      renderer.dispose();if(renderer.domElement.parentElement===el)el.removeChild(renderer.domElement);
    };
  },[onAssetState,modelKey]);

  return <div ref={ref} className="characterThreeCanvas"/>;
}

export function CharacterBuilder(){
  const[assetState,setAssetState]=useState("Loading VRM template…");
  const[skinTone,setSkinTone]=useState("original");
  const[modelKey,setModelKey]=useState<CharacterModelKey>("elyra-stanley");
  const[skinSaveState,setSkinSaveState]=useState("Loading saved skin…");
  const onAssetState=useCallback((state:string)=>setAssetState(state),[]);

  useEffect(()=>{
    let cancelled=false;
    fetch(`${apiBaseUrl()}/character`,{cache:"no-store"})
      .then(async response=>{
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{characterConfig?:{skinTone?:unknown;modelKey?:unknown}}>;
      })
      .then(character=>{
        if(cancelled)return;
        const saved=character.characterConfig?.skinTone;
        if(typeof saved==="string"&&skinPresets.some(preset=>preset.value===saved)) setSkinTone(saved);
        const savedModel=character.characterConfig?.modelKey;
        if(savedModel==="male-01"||savedModel==="elyra-stanley") setModelKey(savedModel);
        else setModelKey("elyra-stanley");
        setSkinSaveState("Saved");
      })
      .catch(error=>{
        console.error("Failed to load character appearance",error);
        if(!cancelled)setSkinSaveState("Cannot load saved skin");
      });
    return()=>{cancelled=true};
  },[]);

  const selectSkinTone=useCallback(async(nextTone:string)=>{
    const previous=skinTone;
    setSkinTone(nextTone);
    setSkinSaveState("Saving…");
    try{
      const getResponse=await fetch(`${apiBaseUrl()}/character`,{cache:"no-store"});
      if(!getResponse.ok)throw new Error(`GET /character HTTP ${getResponse.status}`);
      const current=await getResponse.json() as {
        archetype?:string;headScale?:number;bodyScale?:number;armScale?:number;legScale?:number;
        primaryColor?:string;accentColor?:string;antenna?:boolean;characterConfig?:Record<string,unknown>|null;
      };
      const response=await fetch(`${apiBaseUrl()}/character`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          archetype:current.archetype??"human",
          headScale:current.headScale??1,
          bodyScale:current.bodyScale??1,
          armScale:current.armScale??1,
          legScale:current.legScale??1,
          primaryColor:current.primaryColor??"#b98263",
          accentColor:current.accentColor??"#777cff",
          antenna:current.antenna===true,
          characterConfig:{...(current.characterConfig??{}),skinTone:nextTone},
        }),
      });
      if(!response.ok)throw new Error(`PUT /character HTTP ${response.status}`);
      setSkinSaveState("Saved · Web synced");
    }catch(error){
      console.error("Failed to save skin tone",error);
      setSkinTone(previous);
      setSkinSaveState("Save failed");
    }
  },[skinTone]);

  const selectCharacter=useCallback(async(nextModel:CharacterModelKey)=>{
    const previous=modelKey;
    setModelKey(nextModel);
    setAssetState("Loading selected character…");
    try{
      const getResponse=await fetch(`${apiBaseUrl()}/character`,{cache:"no-store"});
      if(!getResponse.ok)throw new Error(`GET /character HTTP ${getResponse.status}`);
      const current=await getResponse.json() as {
        archetype?:string;headScale?:number;bodyScale?:number;armScale?:number;legScale?:number;
        primaryColor?:string;accentColor?:string;antenna?:boolean;characterConfig?:Record<string,unknown>|null;
      };
      const response=await fetch(`${apiBaseUrl()}/character`,{
        method:"PUT",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          archetype:current.archetype??"human",headScale:current.headScale??1,bodyScale:current.bodyScale??1,
          armScale:current.armScale??1,legScale:current.legScale??1,primaryColor:current.primaryColor??"#b98263",
          accentColor:current.accentColor??"#777cff",antenna:current.antenna===true,
          characterConfig:{...(current.characterConfig??{}),modelKey:nextModel},
        }),
      });
      if(!response.ok)throw new Error(`PUT /character HTTP ${response.status}`);
      setSkinSaveState("Saved · Web synced");
    }catch(error){console.error("Failed to save character model",error);setModelKey(previous);setSkinSaveState("Save failed");}
  },[modelKey]);

  return <section className="characterBuilderShell">
    <div className="characterBuilderHeader">
      <div>
        <small>AI APPEARANCE / CHARACTER TEMPLATES</small>
        <h2>Character Templates</h2>
        <p>Direct VRM runtime preview. Humanoid, expressions and spring bones stay available for animation.</p>
      </div>
    </div>
    <div className="characterBuilderGrid">
      <div className="characterViewportPanel">
        <div className="characterViewport"><HumanPreview skinTone={skinTone} modelKey={modelKey} onAssetState={onAssetState}/></div>
        <div className="characterViewportHint"><span>{characterModels[modelKey].name} · Author: {characterModels[modelKey].author}</span><small>{assetState}</small></div>
      </div>
      <div className="characterSettingsPanel">
        <div className="characterSection">
          <div className="characterSectionTitle"><small>CHARACTER LIBRARY</small><h3>Choose character</h3></div>
          <p style={{opacity:.68,fontSize:12,lineHeight:1.5}}>Select the character used by the Elyra web app. Elyra Stanley is the default.</p>
          <div style={{display:"grid",gap:10}}>
            {(Object.entries(characterModels) as [CharacterModelKey,(typeof characterModels)[CharacterModelKey]][]).map(([key,model])=><button key={key} type="button" onClick={()=>void selectCharacter(key)} style={{padding:"14px 16px",textAlign:"left",color:"inherit",border:modelKey===key?"1px solid rgba(126,160,255,.95)":"1px solid rgba(255,255,255,.12)",borderRadius:14,background:modelKey===key?"rgba(126,160,255,.14)":"rgba(255,255,255,.035)",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><strong>{model.name}</strong><span>{modelKey===key?"✓ Selected":"Select"}</span></div>
              <div style={{marginTop:6,opacity:.68,fontSize:12}}>{model.description}</div>
              <div style={{marginTop:4,opacity:.52,fontSize:11}}>Author: {model.author}</div>
            </button>)}
          </div>
        </div>
        <div className="characterSection">
          <div className="characterSectionTitle"><small>SKIN</small><h3>Skin tone</h3></div>
          <p style={{opacity:.68,fontSize:12,lineHeight:1.5}}>Preview skin tone without recolouring hair, eyes or clothing. “Original” restores the authored VRoid material.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {skinPresets.map(preset=><button key={preset.value} type="button" title={preset.label} aria-label={preset.label} onClick={()=>void selectSkinTone(preset.value)} style={{width:38,height:38,borderRadius:"50%",background:preset.value==="original"?"linear-gradient(135deg,#f5d6c6 0 48%,#0c1320 50% 100%)":preset.value,border:skinTone===preset.value?"3px solid #fff":"1px solid rgba(255,255,255,.24)",boxShadow:skinTone===preset.value?"0 0 0 2px rgba(126,160,255,.7)":"none",cursor:"pointer"}}/>) }
          </div>
          <div style={{marginTop:10,opacity:.62,fontSize:12}}>Selected: {skinPresets.find(p=>p.value===skinTone)?.label} · {skinSaveState}</div>
        </div>
        <div className="characterSection">
          <div className="characterSectionTitle"><small>ANIMATION</small><h3>VRMA Idle</h3></div>
          <p style={{opacity:.68,fontSize:12,lineHeight:1.6}}>Standing humanoid VRMA idle is retargeted to this VRM with AnimationMixer. Elyra layers a small asymmetric arm and inward palm relaxation pass plus the frozen Natural Hand Pose V6, so the hands rest more naturally beside the thighs. Natural random blinking remains layered on top.</p>
        </div>
      </div>
    </div>
  </section>;
}
