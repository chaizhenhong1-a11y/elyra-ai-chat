import {BadGatewayException,BadRequestException,Injectable,ServiceUnavailableException} from "@nestjs/common";
import {Prisma} from "@prisma/client";
import {spawn} from "node:child_process";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {basename,resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {PrismaService} from "../database/prisma.service";

type FaceProfile={faceWidth:number;faceLength:number;jawWidth:number;chinSize:number;cheekFullness:number;eyeSize:number;eyeSpacing:number;eyeHeight:number;noseWidth:number;noseLength:number;mouthWidth:number;lipFullness:number};
type CharacterProfile={version:2;style:"ELYRA_CHIBI_V1";face:FaceProfile;skin:{tone:string;undertone:number};hair:{color:string;description:string};identityNotes:string[]};
const clamp=(v:unknown,d=.5)=>Math.max(0,Math.min(1,Number.isFinite(Number(v))?Number(v):d));
const hex=(v:unknown,d="#b98263")=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v)?v:d;
// Identity is intentionally constrained around the single Elyra chibi mother mesh.
// 0.5 stays neutral; even extreme photo analysis can only move a morph by +/- 0.18.
const identityMorph=(v:unknown)=>0.5+(clamp(v)-0.5)*0.36;

@Injectable()
export class CharacterGenerationService{
 constructor(private readonly prisma:PrismaService){}
 async generate(file?:Express.Multer.File){
  if(!file)throw new BadRequestException("Choose a clear portrait photo first.");
  const profile=await this.analyze(file);
  const current=await this.prisma.aiCharacter.upsert({where:{id:"default"},create:{id:"default",archetype:"human"},update:{}});
  const old=(current.characterConfig&&typeof current.characterConfig==="object"&&!Array.isArray(current.characterConfig)?current.characterConfig:{}) as Record<string,unknown>;
  const face={faceWidth:profile.face.faceWidth,faceLength:profile.face.faceLength,jawWidth:profile.face.jawWidth,chinLength:profile.face.chinSize,cheekFullness:profile.face.cheekFullness,eyeSize:profile.face.eyeSize,eyeSpacing:profile.face.eyeSpacing,eyeHeight:profile.face.eyeHeight,noseWidth:profile.face.noseWidth,noseLength:profile.face.noseLength,mouthWidth:profile.face.mouthWidth,lipFullness:profile.face.lipFullness};
  const characterConfig={...old,human:{skinTone:profile.skin.tone,undertone:profile.skin.undertone,face},generation:{sourcePhoto:basename(file.path),profile,status:"profile_ready",updatedAt:new Date().toISOString()}} as Prisma.InputJsonObject;
  await this.prisma.aiCharacter.update({where:{id:"default"},data:{archetype:"human",primaryColor:profile.skin.tone,characterConfig}});
  const blender=await this.runBlender(profile,file.path);
  const finalConfig={...characterConfig,generation:{sourcePhoto:basename(file.path),profile,status:blender.status,modelUrl:blender.modelUrl??null,message:blender.message,updatedAt:new Date().toISOString()}} as Prisma.InputJsonObject;
  const character=await this.prisma.aiCharacter.update({where:{id:"default"},data:{characterConfig:finalConfig}});
  return{character,profile,blender};
 }
 private async analyze(file:Express.Multer.File):Promise<CharacterProfile>{
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw new ServiceUnavailableException("OPENAI_API_KEY is not configured on the API server.");
  const model=process.env.ELYRA_CHARACTER_VISION_MODEL||"gpt-6-luna";
  const data=await readFile(file.path);
  const image=`data:${file.mimetype};base64,${data.toString("base64")}`;
  const prompt=`Analyze this portrait only to extract identity differences for the fixed ELYRA_CHIBI_V1 mother mesh. Do not design a character, do not choose an art style, and do not choose body/head proportions. Return JSON only. All numeric morph values must be 0..1 where 0.5 is neutral. Do not identify the person. Preserve visible facial proportions, skin appearance and hair traits without inferring sensitive traits. Schema: {"face":{"faceWidth":0.5,"faceLength":0.5,"jawWidth":0.5,"chinSize":0.5,"cheekFullness":0.5,"eyeSize":0.5,"eyeSpacing":0.5,"eyeHeight":0.5,"noseWidth":0.5,"noseLength":0.5,"mouthWidth":0.5,"lipFullness":0.5},"skin":{"tone":"#RRGGBB","undertone":0.5},"hair":{"color":"#RRGGBB","description":"short visual description"},"identityNotes":["visible shape detail"]}`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:prompt},{type:"input_image",image_url:image,detail:"high"}]}]})});
  if(!r.ok)throw new BadGatewayException(`OpenAI vision failed (${r.status}): ${(await r.text()).slice(0,300)}`);
  const result=await r.json() as {output_text?:unknown;output?:Array<{content?:Array<{type?:string;text?:string}>}>};
  const text=typeof result.output_text==="string"?result.output_text:(result.output??[]).flatMap(item=>item.content??[]).filter(part=>part.type==="output_text").map(part=>part.text??"").join("");
  const match=text.match(/\{[\s\S]*\}/);if(!match)throw new BadGatewayException("Vision model did not return a character profile.");
  let raw:any;try{raw=JSON.parse(match[0])}catch{throw new BadGatewayException("Vision model returned invalid JSON.")}
  return{version:2,style:"ELYRA_CHIBI_V1",face:{faceWidth:identityMorph(raw.face?.faceWidth),faceLength:identityMorph(raw.face?.faceLength),jawWidth:identityMorph(raw.face?.jawWidth),chinSize:identityMorph(raw.face?.chinSize),cheekFullness:identityMorph(raw.face?.cheekFullness),eyeSize:identityMorph(raw.face?.eyeSize),eyeSpacing:identityMorph(raw.face?.eyeSpacing),eyeHeight:identityMorph(raw.face?.eyeHeight),noseWidth:identityMorph(raw.face?.noseWidth),noseLength:identityMorph(raw.face?.noseLength),mouthWidth:identityMorph(raw.face?.mouthWidth),lipFullness:identityMorph(raw.face?.lipFullness)},skin:{tone:hex(raw.skin?.tone),undertone:clamp(raw.skin?.undertone)},hair:{color:hex(raw.hair?.color,"#2b211d"),description:String(raw.hair?.description??"").slice(0,240)},identityNotes:Array.isArray(raw.identityNotes)?raw.identityNotes.slice(0,8).map((x:unknown)=>String(x).slice(0,180)):[]};
 }
 private async runBlender(profile:CharacterProfile,photoPath:string){
  const root=resolve(process.cwd(),"../..");
  const base=resolve(root,"assets/character/elyra-chibi-v1.blend");
  if(!existsSync(base))return{status:"awaiting_base_mesh",modelUrl:null,message:"AI profile is ready. The old prototype is disabled. Add the approved Elyra Cute Base Mesh at assets/character/elyra-chibi-v1.blend to enable automatic Blender generation."};
  const blender=process.env.BLENDER_PATH||"C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe";
  if(!existsSync(blender))return{status:"blender_unavailable",message:`Blender not found at ${blender}`};
  const jobId=randomUUID();const jobs=resolve(root,".elyra/character-jobs");const outDir=resolve(root,"apps/admin/public/models/generated");await mkdir(jobs,{recursive:true});await mkdir(outDir,{recursive:true});
  const profilePath=resolve(jobs,`${jobId}.json`),output=resolve(outDir,`${jobId}.glb`);await writeFile(profilePath,JSON.stringify({profile,photoPath,output},null,2));
  const script=resolve(root,"scripts/blender/generate_elyra_character.py");
  await new Promise<void>((ok,fail)=>{const p=spawn(blender,["--background",base,"--python",script,"--","--profile",profilePath,"--output",output],{stdio:"pipe"});let err="";p.stderr.on("data",d=>err+=String(d));p.on("error",fail);p.on("close",code=>code===0?ok():fail(new Error(err.slice(-1200)||`Blender exited ${code}`)))}).catch(e=>{throw new BadGatewayException(`Blender generation failed: ${e instanceof Error?e.message:String(e)}`)});
  return{status:"complete",modelUrl:`/models/generated/${jobId}.glb`,message:"AI profile applied and GLB exported automatically."};
 }
}
