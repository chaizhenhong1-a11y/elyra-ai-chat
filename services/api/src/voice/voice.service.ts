import {BadRequestException, Injectable} from "@nestjs/common";
import {PrismaService} from "../database/prisma.service";

const defaults={id:"default",enabled:false,provider:"openvoice",profileName:"Stanley Original",language:"auto",supportedLanguages:["en","zh","ms"],speed:1,autoSpeak:true};
@Injectable()
export class VoiceService{
 constructor(private readonly prisma:PrismaService){}
 async get(){const settings=await this.prisma.voiceSettings.upsert({where:{id:"default"},create:defaults,update:{},include:{references:{orderBy:{language:"asc"}}}});return {...settings,effectiveSupportedLanguages:settings.enabled?(settings.provider==="kokoro"?["zh","en"]:settings.provider==="piper"?["zh"]:[]):[]};}
 update(raw:unknown){
  const b=(raw??{}) as Record<string,unknown>;
  const speed=Number(b.speed??1); if(!Number.isFinite(speed)||speed<0.7||speed>1.3)throw new BadRequestException("speed must be 0.7..1.3");
  const supportedLanguages=Array.isArray(b.supportedLanguages)
   ? [...new Set(b.supportedLanguages.filter((x):x is string=>typeof x==="string").map(x=>x.trim().toLowerCase()).filter(Boolean))].slice(0,40)
   : ["en","zh","ms"];
  const provider=b.provider==="piper"?"piper":b.provider==="kokoro"?"kokoro":"openvoice";
  const data={enabled:b.enabled===true,provider,profileName:typeof b.profileName==="string"&&b.profileName.trim()?b.profileName.trim().slice(0,80):"Stanley Original",language:"auto",supportedLanguages,speed,autoSpeak:b.autoSpeak!==false};
  return this.prisma.voiceSettings.upsert({where:{id:"default"},create:{id:"default",...data},update:data,include:{references:{orderBy:{language:"asc"}}}});
 }
 async setReferenceAudio(url:string,language?:string,originalName="Reference audio"){
  if(!language||language==="auto"){
   return this.prisma.voiceSettings.upsert({where:{id:"default"},create:{...defaults,referenceAudioUrl:url},update:{referenceAudioUrl:url},include:{references:true}});
  }
  const code=this.referenceLanguage(language);
  await this.prisma.$transaction(async tx=>{
   await tx.voiceSettings.upsert({where:{id:"default"},create:defaults,update:{}});
   await tx.voiceReference.upsert({where:{profileId_language:{profileId:"default",language:code}},
    create:{profileId:"default",language:code,audioUrl:url,originalName:originalName.slice(0,200)},
    update:{audioUrl:url,originalName:originalName.slice(0,200),verified:false}});
  });
  return this.get();
 }
 async verifyReference(language:string,raw:unknown){
  const code=this.referenceLanguage(language);
  const verified=(raw as {verified?:unknown})?.verified;
  if(typeof verified!=="boolean")throw new BadRequestException("verified must be a boolean");
  const existing=await this.prisma.voiceReference.findUnique({where:{profileId_language:{profileId:"default",language:code}}});
  if(!existing)throw new BadRequestException("Upload a reference sample first.");
  await this.prisma.voiceReference.update({where:{profileId_language:{profileId:"default",language:code}},data:{verified}});
  return this.get();
 }
 private referenceLanguage(value:string){
  if(typeof value!=="string"||value.length>35||!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value))throw new BadRequestException("Invalid reference language");
  try{const code=Intl.getCanonicalLocales(value)[0];return code==="zh-CN"?"zh":code;}catch{throw new BadRequestException("Invalid reference language");}
 }
}
