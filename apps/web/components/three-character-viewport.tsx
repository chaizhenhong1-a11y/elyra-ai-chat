"use client";

import {useEffect, useRef, useState} from "react";
import {useI18n} from "@/lib/i18n";
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, type VRM} from "@pixiv/three-vrm";
import {createVRMAnimationClip, VRMAnimationLoaderPlugin} from "@pixiv/three-vrm-animation";

const CHARACTER_MODEL_URLS = {
  // Elyra Stanley — created by Stanley in VRoid Studio. Default Elyra character.
  "elyra-stanley":"/models/templates/elyra-stanley.vrm",
  "male-01":"/models/templates/elyra-template-male-01.vrm",
} as const;
const IDLE_VRMA_URL = "/animations/standing_idle.vrma";
const OUTFIT_01_URL = "/models/outfits/elyra-stanley-outfit-01.compact.glb";
const OUTFIT_01_MASK_URL = "/models/outfits/elyra-stanley-outfit-01.body-mask.json";

type BodyMaskData={hiddenTriangles:number[]};

function collectNamedBones(root:THREE.Object3D){
  const bones=new Map<string,THREE.Bone>();
  root.traverse(object=>{
    if(object instanceof THREE.Bone&&object.name&&!bones.has(object.name))bones.set(object.name,object);
  });
  return bones;
}

function setDefaultClothesVisible(root:THREE.Object3D,visible:boolean){
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.forEach(material=>{
      if(material?.name.toUpperCase().includes("_CLOTH"))material.visible=visible;
    });
  });
}

type MaskedGeometryRecord={mesh:THREE.Mesh;original:THREE.BufferGeometry;masked:THREE.BufferGeometry};

function buildMaskedBodyGeometries(root:THREE.Object3D,hiddenTriangles:Set<number>):MaskedGeometryRecord[]{
  const records:MaskedGeometryRecord[]=[];
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||!object.geometry.index)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    const bodyMaterialIndices=new Set<number>();
    materials.forEach((material,index)=>{
      const name=material?.name.toUpperCase()??"";
      if(name.includes("BODY")&&name.includes("_SKIN"))bodyMaterialIndices.add(index);
    });
    if(bodyMaterialIndices.size===0)return;

    const geometry=object.geometry;
    const source=Array.from(geometry.index.array as ArrayLike<number>);
    const groups=geometry.groups.length
      ? geometry.groups.map(group=>({...group}))
      : [{start:0,count:source.length,materialIndex:0}];
    const next:number[]=[];
    const nextGroups:THREE.Group[]=[];

    groups.forEach(group=>{
      const start=next.length;
      if(bodyMaterialIndices.has(group.materialIndex)){
        let localTriangle=0;
        for(let i=group.start;i<group.start+group.count;i+=3,localTriangle++){
          if(hiddenTriangles.has(localTriangle))continue;
          next.push(source[i],source[i+1],source[i+2]);
        }
      }else{
        for(let i=group.start;i<group.start+group.count;i++)next.push(source[i]);
      }
      nextGroups.push({start,count:next.length-start,materialIndex:group.materialIndex});
    });

    const masked=geometry.clone();
    masked.setIndex(next);
    masked.clearGroups();
    nextGroups.forEach(group=>masked.addGroup(group.start,group.count,group.materialIndex));
    records.push({mesh:object,original:geometry,masked});
  });
  return records;
}

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
    else if(/^#[0-9a-fA-F]{6}$/.test(tone)){
      material.color.copy(original).lerp(new THREE.Color(tone),.58);
    }
    material.needsUpdate=true;
  });
}


function applyNaturalHandRelaxation(vrm: VRM) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  const offset = (
    boneName: Parameters<typeof humanoid.getNormalizedBoneNode>[0],
    x: number,
    y: number,
    z: number,
  ) => {
    const bone = humanoid.getNormalizedBoneNode(boneName);
    if (!bone) return;
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(x),
        THREE.MathUtils.degToRad(y),
        THREE.MathUtils.degToRad(z),
        "XYZ",
      ),
    );
    bone.quaternion.multiply(q);
  };

  offset("leftUpperArm", 0, 1.2, -2.4);
  offset("rightUpperArm", 0, -0.8, 2.0);
  offset("leftLowerArm", 0, -1.8, -2.2);
  offset("rightLowerArm", 0, 1.4, 1.8);
  offset("leftHand", 0.6, 10.5, -0.8);
  offset("rightHand", 0.45, -8.4, 0.55);
}

function applyNaturalFingerPose(vrm: VRM) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  const offset = (
    boneName: Parameters<typeof humanoid.getNormalizedBoneNode>[0],
    x: number,
    y: number,
    z: number,
  ) => {
    const bone = humanoid.getNormalizedBoneNode(boneName);
    if (!bone) return;
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(x),
        THREE.MathUtils.degToRad(y),
        THREE.MathUtils.degToRad(z),
        "XYZ",
      ),
    );
    bone.quaternion.multiply(q);
  };

  const curlFinger = (
    side: "left" | "right",
    finger: "Index" | "Middle" | "Ring" | "Little",
    proximal: number,
    intermediate: number,
    distal: number,
  ) => {
    const sign = side === "left" ? 1 : -1;
    offset(`${side}${finger}Proximal` as Parameters<typeof humanoid.getNormalizedBoneNode>[0], 0, 0, sign * proximal);
    offset(`${side}${finger}Intermediate` as Parameters<typeof humanoid.getNormalizedBoneNode>[0], 0, 0, sign * intermediate);
    offset(`${side}${finger}Distal` as Parameters<typeof humanoid.getNormalizedBoneNode>[0], 0, 0, sign * distal);
  };

  // Frozen Natural Hand Pose V6.
  curlFinger("left", "Index", 4, 5, 2);
  curlFinger("left", "Middle", 6, 7, 3);
  curlFinger("left", "Ring", 8, 9, 4);
  curlFinger("left", "Little", 10, 11, 5);

  curlFinger("right", "Index", 3, 4.5, 1.75);
  curlFinger("right", "Middle", 5, 6.5, 2.75);
  curlFinger("right", "Ring", 7, 8.5, 3.75);
  curlFinger("right", "Little", 9, 10.5, 4.75);

  offset("leftThumbMetacarpal", 0, -3, 3);
  offset("leftThumbProximal", 0, -2, 4);
  offset("leftThumbDistal", 0, 0, 2);
  offset("rightThumbMetacarpal", 0, 3, -3);
  offset("rightThumbProximal", 0, 2, -4);
  offset("rightThumbDistal", 0, 0, -2);
}


function applyConversationMotion(
  vrm:VRM,
  respondingWeight:number,
  talkingWeight:number,
  elapsed:number,
){
  if(!vrm.humanoid)return;
  const humanoid=vrm.humanoid;
  const rotate=(name:Parameters<typeof humanoid.getNormalizedBoneNode>[0],x:number,y:number,z:number)=>{
    const bone=humanoid.getNormalizedBoneNode(name);
    if(!bone)return;
    bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,"XYZ")));
  };

  // Smooth additive motion only. Frozen V6 remains the final hand-pose layer.
  if(respondingWeight>.001){
    const breathe=Math.sin(elapsed*1.18);
    const think=Math.sin(elapsed*.52);
    const w=respondingWeight;
    rotate("head",
      THREE.MathUtils.degToRad((-0.55+breathe*.18)*w),
      THREE.MathUtils.degToRad(think*.42*w),
      THREE.MathUtils.degToRad(.72*w));
    rotate("neck",
      THREE.MathUtils.degToRad(-.12*w),
      THREE.MathUtils.degToRad(think*.18*w),
      THREE.MathUtils.degToRad(.18*w));
    rotate("chest",0,
      THREE.MathUtils.degToRad(think*.10*w),
      THREE.MathUtils.degToRad(.07*w));
  }

  if(talkingWeight>.001){
    const phrase=Math.sin(elapsed*2.05);
    const slow=Math.sin(elapsed*.92);
    const w=talkingWeight;
    rotate("head",
      THREE.MathUtils.degToRad(phrase*.18*w),
      THREE.MathUtils.degToRad(slow*.34*w),
      THREE.MathUtils.degToRad(slow*.10*w));
    rotate("neck",
      THREE.MathUtils.degToRad(phrase*.05*w),
      THREE.MathUtils.degToRad(slow*.10*w),0);
    rotate("chest",0,
      THREE.MathUtils.degToRad(slow*.12*w),
      THREE.MathUtils.degToRad(phrase*.045*w));
    rotate("leftUpperArm",0,0,THREE.MathUtils.degToRad(slow*.09*w));
    rotate("rightUpperArm",0,0,THREE.MathUtils.degToRad(-slow*.09*w));
  }
}

export function ThreeCharacterViewport({
  skinTone="original",
  modelKey="elyra-stanley",
  outfit="default",
  chatMode=false,
  inspectionMode=false,
  compactChatMode=false,
  onReady,
  motionState="idle",
}:{skinTone?:string;modelKey?:keyof typeof CHARACTER_MODEL_URLS;outfit?:"default"|"outfit-01";chatMode?:boolean;inspectionMode?:boolean;compactChatMode?:boolean;onReady?:()=>void;motionState?:"idle"|"responding"|"talking"}) {
  const {t}=useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const skinRecordsRef = useRef<SkinRecord[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelProgress, setModelProgress] = useState(0);
  const chatModeRef = useRef(chatMode);
  const inspectionModeRef = useRef(inspectionMode);
  const motionStateRef=useRef(motionState);
  const motionBlendRef=useRef({responding:0,talking:0});
  const compactChatModeRef = useRef(compactChatMode);
  const outfitRef=useRef<"default"|"outfit-01">(outfit);
  const applyOutfitRef=useRef<(()=>void)|null>(null);
  const setChatCameraModeRef = useRef<((enabled:boolean, compact?:boolean)=>void) | null>(null);

  useEffect(()=>{motionStateRef.current=motionState},[motionState]);
  useEffect(()=>{outfitRef.current=outfit;applyOutfitRef.current?.()},[outfit]);

  useEffect(() => {
    chatModeRef.current = chatMode;
    inspectionModeRef.current = inspectionMode;

    // Let the mobile layout finish resizing first, then re-frame the camera.
    // The second call catches the end of the CSS height transition/layout pass.
    const apply = () => setChatCameraModeRef.current?.(chatMode, compactChatMode);
    const frame = requestAnimationFrame(apply);
    const settle = window.setTimeout(apply, 180);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [chatMode, compactChatMode, inspectionMode]);

  useEffect(()=>{applySkinTone(skinRecordsRef.current,skinTone)},[skinTone]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let currentVrm: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let outfitScene:THREE.Object3D|null=null;
    let outfitReady=false;
    let baseBones=new Map<string,THREE.Bone>();
    let outfitBones=new Map<string,THREE.Bone>();
    let maskedBody:MaskedGeometryRecord[]=[];
    let elapsed = 0;
    let nextBlinkAt = 1.8 + Math.random() * 2.4;
    let blinkStartedAt = -1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "threeCharacterCanvas";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x303650, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb9c9ff, 1.4);
    rim.position.set(-3, 3, -3);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    let desktopPanOrigin: THREE.Vector3 | null = null;
    let desktopPanLimitX = 0;
    let desktopPanLimitY = 0;
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));
    loader.register(parser => new VRMAnimationLoaderPlugin(parser));

    loader.load(
      CHARACTER_MODEL_URLS[modelKey],
      gltf => {
        if (disposed) return;
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) return;
        currentVrm = vrm;

        const model = vrm.scene;
        baseBones=collectNamedBones(model);
        model.traverse(object => {
          object.frustumCulled = false;
        });
        skinRecordsRef.current=collectSkinMaterials(model);
        applySkinTone(skinRecordsRef.current,skinTone);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const height = Math.max(size.y, 0.01);
        const isMobile = window.matchMedia("(max-width: 650px)").matches;

        // Real 3D pedestal shared by desktop and mobile. It lives in the same
        // scene as the avatar, so orbiting and zooming preserve their spatial
        // relationship instead of letting the avatar visually leave a CSS ring.
        const pedestalRadius = Math.max(size.x * 0.62, height * 0.19);
        const pedestalGeometry = new THREE.RingGeometry(
          pedestalRadius * 0.72,
          pedestalRadius,
          96,
        );
        const pedestalMaterial = new THREE.MeshBasicMaterial({
          color: 0xb8c7ff,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
        pedestal.rotation.x = -Math.PI / 2;
        pedestal.position.set(center.x, box.min.y + height * 0.004, center.z);
        pedestal.renderOrder = 1;
        scene.add(pedestal);

        const innerRingGeometry = new THREE.RingGeometry(
          pedestalRadius * 0.48,
          pedestalRadius * 0.51,
          96,
        );
        const innerRingMaterial = new THREE.MeshBasicMaterial({
          color: 0xdbe3ff,
          transparent: true,
          opacity: 0.13,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.set(center.x, box.min.y + height * 0.0045, center.z);
        innerRing.renderOrder = 1;
        scene.add(innerRing);

        controls.target.copy(center);

        if (isMobile) {
          // Fit the complete avatar inside the actual portrait viewport.
          // The limiting FOV on a tall phone is horizontal, not vertical.
          const padding = 1.14;
          const verticalFov = THREE.MathUtils.degToRad(camera.fov);
          const horizontalFov =
            2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          const distanceForHeight =
            (height * padding) / (2 * Math.tan(verticalFov / 2));
          const distanceForWidth =
            (Math.max(size.x, height * 0.34) * padding) /
            (2 * Math.tan(horizontalFov / 2));
          const defaultDistance = Math.max(distanceForHeight, distanceForWidth);

          // Fixed framing: rotate + constrained zoom only. No free panning.
          camera.position.set(center.x, center.y, center.z + defaultDistance);
          controls.enablePan = false;
          controls.enableRotate = true;
          controls.enableZoom = true;
          controls.minDistance = defaultDistance * 0.58;
          controls.maxDistance = defaultDistance;

          // Chat framing: when the existing mobile "开始聊天" state turns on,
          // move from the full-body composition to an upper-body conversation
          // composition. The model is never reloaded or remounted.
          const fullBodyTarget = center.clone();
          const fullBodyPosition = new THREE.Vector3(
            center.x,
            center.y,
            center.z + defaultDistance,
          );
          const chatTarget = new THREE.Vector3(
            center.x,
            box.min.y + height * 0.75,
            center.z,
          );
          // Deliberate conversation crop: head + torso, not full body.
          // Width is intentionally not allowed to force the old full-body distance.
          const upperBodyHeight = height * 0.38;
          const chatDistanceForHeight =
            (upperBodyHeight * 1.02) / (2 * Math.tan(verticalFov / 2));
          const chatDistance = Math.max(
            chatDistanceForHeight,
            defaultDistance * 0.30,
          );
          const chatPosition = new THREE.Vector3(
            chatTarget.x,
            chatTarget.y,
            chatTarget.z + chatDistance,
          );

          let cameraTweenFrame = 0;
          const compactTarget = new THREE.Vector3(
            center.x,
            box.min.y + height * 0.80,
            center.z,
          );
          const compactDistance = Math.max(
            (height * 0.29) / (2 * Math.tan(verticalFov / 2)),
            defaultDistance * 0.22,
          );
          const compactPosition = new THREE.Vector3(
            compactTarget.x,
            compactTarget.y,
            compactTarget.z + compactDistance,
          );

          const moveCamera = (enabled:boolean, compact=false) => {
            cancelAnimationFrame(cameraTweenFrame);
            controls.minDistance = enabled
              ? defaultDistance * 0.24
              : defaultDistance * 0.58;
            controls.maxDistance = enabled
              ? defaultDistance * 0.72
              : defaultDistance;
            const fromPosition = camera.position.clone();
            const fromTarget = controls.target.clone();
            const toPosition = compact ? compactPosition : enabled ? chatPosition : fullBodyPosition;
            const toTarget = compact ? compactTarget : enabled ? chatTarget : fullBodyTarget;
            const startedAt = performance.now();
            const duration = 420;

            const step = (now:number) => {
              if (disposed) return;
              const raw = Math.min(1, (now - startedAt) / duration);
              const t = 1 - Math.pow(1 - raw, 3);
              camera.position.lerpVectors(fromPosition, toPosition, t);
              controls.target.lerpVectors(fromTarget, toTarget, t);
              controls.update();
              if (raw < 1) cameraTweenFrame = requestAnimationFrame(step);
            };
            cameraTweenFrame = requestAnimationFrame(step);
          };
          setChatCameraModeRef.current = moveCamera;

          if (chatModeRef.current) {
            controls.minDistance = defaultDistance * 0.24;
            controls.maxDistance = defaultDistance * 0.72;
            camera.position.copy(chatPosition);
            controls.target.copy(chatTarget);
          }

          // Keep mobile orbit around a natural eye-level horizontal band.
          // Horizontal rotation remains 360°, but users cannot orbit above
          // the head or underneath the avatar's feet.
          controls.minPolarAngle = THREE.MathUtils.degToRad(12);
          controls.maxPolarAngle = THREE.MathUtils.degToRad(98);
        } else {
          // Desktop home: natural level view with enough breathing room to keep
          // the complete avatar (head to shoes) visible inside the center column.
          const desktopTarget = new THREE.Vector3(center.x, box.min.y + height * 0.52, center.z);
          const desktopDistance = height * 2.34;
          const desktopPosition = new THREE.Vector3(center.x, desktopTarget.y, center.z + desktopDistance);

          // Desktop chat gets its own canonical front-facing camera. Preview orbit,
          // zoom and pan must never leak into conversation mode.
          const desktopChatTarget = new THREE.Vector3(
            center.x,
            box.min.y + height * 0.72,
            center.z,
          );
          const desktopChatDistance = height * 1.16;
          const desktopChatPosition = new THREE.Vector3(
            center.x,
            desktopChatTarget.y,
            center.z + desktopChatDistance,
          );

          let desktopCameraTweenFrame = 0;
          const moveDesktopCamera = (enabled:boolean) => {
            // Desktop feature panels inspect the whole outfit, using the existing preview frame.
            if (window.matchMedia("(min-width:901px)").matches && inspectionModeRef.current) enabled=false;
            cancelAnimationFrame(desktopCameraTweenFrame);
            const fromPosition = camera.position.clone();
            const fromTarget = controls.target.clone();
            const toPosition = enabled ? desktopChatPosition : desktopPosition;
            const toTarget = enabled ? desktopChatTarget : desktopTarget;
            const startedAt = performance.now();
            const duration = 420;

            // Conversation mode is a deliberate front-facing view. Preview mode
            // restores the canonical full-body frame and re-enables inspection pan.
            controls.enablePan = !enabled;
            controls.minDistance = enabled ? height * 0.72 : height * 0.72;
            controls.maxDistance = enabled ? height * 1.55 : height * 2.35;
            desktopPanOrigin = enabled ? null : desktopTarget.clone();

            const step = (now:number) => {
              if (disposed) return;
              const raw = Math.min(1, (now - startedAt) / duration);
              const t = 1 - Math.pow(1 - raw, 3);
              camera.position.lerpVectors(fromPosition, toPosition, t);
              controls.target.lerpVectors(fromTarget, toTarget, t);
              controls.update();
              if (raw < 1) desktopCameraTweenFrame = requestAnimationFrame(step);
            };
            desktopCameraTweenFrame = requestAnimationFrame(step);
          };
          setChatCameraModeRef.current = moveDesktopCamera;

          const desktopConversationFrame = chatModeRef.current && !(window.matchMedia("(min-width:901px)").matches && inspectionModeRef.current);
          if (desktopConversationFrame) {
            camera.position.copy(desktopChatPosition);
            controls.target.copy(desktopChatTarget);
            controls.enablePan = false;
            desktopPanOrigin = null;
          } else {
            camera.position.copy(desktopPosition);
            controls.target.copy(desktopTarget);
            controls.enablePan = true;
            desktopPanOrigin = desktopTarget.clone();
          }

          desktopPanLimitX = height * 0.42;
          desktopPanLimitY = height * 0.58;
          controls.panSpeed = 0.72;
          controls.minDistance = chatModeRef.current ? height * 0.72 : height * 0.72;
          controls.maxDistance = desktopConversationFrame ? height * 1.55 : height * 2.35;
          controls.minPolarAngle = THREE.MathUtils.degToRad(12);
          controls.maxPolarAngle = THREE.MathUtils.degToRad(98);
        }

        camera.near = Math.max(height / 1000, 0.01);
        camera.far = Math.max(height * 20, 100);
        camera.updateProjectionMatrix();
        controls.update();

        // Add the model only after the initial camera is framed, so mobile never
        // flashes the temporary low-angle/default view while the VRM becomes visible.
        scene.add(model);
        renderer.render(scene, camera);
        setModelProgress(100);
        setModelLoading(false); onReady?.();

        if(modelKey==="elyra-stanley"){
          const applyOutfit=()=>{
            const enabled=outfitRef.current==="outfit-01"&&outfitReady&&!!outfitScene;
            setDefaultClothesVisible(model,!enabled);
            maskedBody.forEach(record=>{record.mesh.geometry=enabled?record.masked:record.original});
            if(outfitScene)outfitScene.visible=enabled;
          };
          applyOutfitRef.current=applyOutfit;

          Promise.all([
            new Promise<THREE.Object3D>((resolve,reject)=>{
              const outfitLoader=new GLTFLoader();
              outfitLoader.load(OUTFIT_01_URL,gltf=>resolve(gltf.scene),undefined,reject);
            }),
            fetch(OUTFIT_01_MASK_URL).then(response=>{
              if(!response.ok)throw new Error(`Body mask HTTP ${response.status}`);
              return response.json() as Promise<BodyMaskData>;
            }),
          ]).then(([loadedOutfit,mask])=>{
            if(disposed||currentVrm!==vrm)return;
            outfitScene=loadedOutfit;
            outfitScene.visible=false;
            outfitScene.traverse(object=>{object.frustumCulled=false});
            outfitBones=collectNamedBones(outfitScene);
            maskedBody=buildMaskedBodyGeometries(model,new Set(mask.hiddenTriangles));
            scene.add(outfitScene);
            outfitReady=true;
            applyOutfit();
          }).catch(error=>{
            console.error("Failed to prepare Elyra Outfit 01",error);
            setDefaultClothesVisible(model,true);
          });
        }

        loader.load(IDLE_VRMA_URL, animationGltf => {
          if (disposed || currentVrm !== vrm) return;
          const animations = animationGltf.userData.vrmAnimations as unknown[] | undefined;
          const animation = animations?.[0];
          if (!animation) return;
          const clip = createVRMAnimationClip(
            animation as Parameters<typeof createVRMAnimationClip>[0],
            vrm,
          );
          mixer = new THREE.AnimationMixer(vrm.scene);
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
          mixer.update(0);
          applyNaturalFingerPose(vrm);
        });
      },
      event => {
        if (disposed) return;
        if (event.total > 0) {
          const progress = Math.min(99, Math.max(0, Math.round((event.loaded / event.total) * 100)));
          setModelProgress(progress);
        }
      },
      error => {
        console.error("Failed to load Elyra web VRM", error);
        setModelLoading(false);
      },
    );

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (currentVrm) {
        elapsed += dt;
        mixer?.update(dt);
        const targetResponding=motionStateRef.current==="responding"?1:0;
        const targetTalking=motionStateRef.current==="talking"?1:0;
        const blend=motionBlendRef.current;

        // Exponential damping removes the one-frame pose jump:
        // enter ≈0.7s, cross-fade ≈0.55s, return to idle ≈0.9s.
        const respondingLambda=targetResponding>blend.responding?5.0:2.9;
        const talkingLambda=targetTalking>blend.talking?5.5:2.6;
        blend.responding=THREE.MathUtils.damp(blend.responding,targetResponding,respondingLambda,dt);
        blend.talking=THREE.MathUtils.damp(blend.talking,targetTalking,talkingLambda,dt);

        applyConversationMotion(currentVrm,blend.responding,blend.talking,elapsed);
        applyNaturalHandRelaxation(currentVrm);

        const expressions = currentVrm.expressionManager;
        if (expressions) {
          if (blinkStartedAt < 0 && elapsed >= nextBlinkAt) blinkStartedAt = elapsed;
          let blink = 0;
          if (blinkStartedAt >= 0) {
            const t = (elapsed - blinkStartedAt) / 0.18;
            blink = t < 0.5 ? t * 2 : Math.max(0, (1 - t) * 2);
            if (t >= 1) {
              blinkStartedAt = -1;
              nextBlinkAt = elapsed + 2.2 + Math.random() * 3.2;
            }
          }
          expressions.setValue("blink", blink);
        }

        currentVrm.update(dt);

        if(outfitScene&&outfitReady){
          outfitBones.forEach((outfitBone,name)=>{
            const baseBone=baseBones.get(name);
            if(!baseBone)return;
            outfitBone.position.copy(baseBone.position);
            outfitBone.quaternion.copy(baseBone.quaternion);
            outfitBone.scale.copy(baseBone.scale);
          });
          outfitScene.updateMatrixWorld(true);
        }
      }

      if (desktopPanOrigin) {
        const clampedX = THREE.MathUtils.clamp(
          controls.target.x,
          desktopPanOrigin.x - desktopPanLimitX,
          desktopPanOrigin.x + desktopPanLimitX,
        );
        const clampedY = THREE.MathUtils.clamp(
          controls.target.y,
          desktopPanOrigin.y - desktopPanLimitY,
          desktopPanOrigin.y + desktopPanLimitY,
        );
        const correction = new THREE.Vector3(
          clampedX - controls.target.x,
          clampedY - controls.target.y,
          0,
        );
        if (correction.lengthSq() > 0) {
          controls.target.add(correction);
          camera.position.add(correction);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      applyOutfitRef.current=null;
      setChatCameraModeRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      mixer?.stopAllAction();
      maskedBody.forEach(record=>record.masked.dispose());
      maskedBody=[];
      skinRecordsRef.current=[];
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material?.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, [skinTone, modelKey, onReady]);

  return (
    <div className="threeCharacterViewport" ref={hostRef} aria-label={t.interactiveCharacter}>
      {modelLoading ? (
        <div className="characterLoadOverlay" aria-live="polite">
          <div className="characterLoadPanel">
            <div className="characterLoadLabel">{t.preparing}</div>
            <div className="characterLoadTrack characterLoadTrackIndeterminate" aria-hidden="true">
              <div className="characterLoadFill characterLoadFillIndeterminate" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
