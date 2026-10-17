import {BadRequestException,Injectable,ServiceUnavailableException,OnModuleInit,OnModuleDestroy} from "@nestjs/common";
import {spawn} from "node:child_process";
import type {ChildProcessWithoutNullStreams} from "node:child_process";
import {createInterface} from "node:readline";
import {existsSync} from "node:fs";
import {mkdir,unlink,stat} from "node:fs/promises";
import {resolve,join} from "node:path";
import {randomUUID} from "node:crypto";
import {PrismaService} from "../database/prisma.service";

export const CHAOWEN_PRESET="zh_CN-chaowen-medium";
@Injectable()
export class PiperPreviewService implements OnModuleInit,OnModuleDestroy{
 constructor(private readonly prisma:PrismaService){}
 private readonly root=resolve(__dirname,"../../../voice-runtime");
 private readonly python=process.env.ELYRA_VOICE_PYTHON || join(this.root,".venv",process.platform==="win32"?"Scripts/python.exe":"bin/python");
 private busy=false;
 private worker:ChildProcessWithoutNullStreams|null=null;
 private startup:Promise<void>|null=null;
 private pending:{done:()=>void;reject:(error:Error)=>void}|null=null;
 onModuleInit(){if(this.presets()[0].ready)void this.ensureWorker().catch(()=>{});}
 onModuleDestroy(){this.worker?.kill();}
 private ensureWorker(){
  if(this.startup)return this.startup;
  this.startup=new Promise<void>((ready,reject)=>{
   const child=spawn(this.python,[join(this.root,"preview.py"),"--worker"],{windowsHide:true,stdio:"pipe",env:{...process.env,PYTHONIOENCODING:"utf-8",HF_HUB_OFFLINE:"1",TRANSFORMERS_OFFLINE:"1"}});
   this.worker=child;
   const timer=setTimeout(()=>child.kill(),120000);
   const lines=createInterface({input:child.stdout});
   child.stderr.on("data",()=>{});
   child.stdin.on("error",()=>{});
   lines.on("line",line=>{
    try{const result=JSON.parse(line);if(result.ready){clearTimeout(timer);ready();}
     else if(this.pending){const pending=this.pending;this.pending=null;result.ok?pending.done():pending.reject(new Error("Piper synthesis failed"));}
    }catch{/* Ignore non-protocol diagnostic output. */}
   });
   const failed=()=>{
    clearTimeout(timer);lines.close();this.worker=null;this.startup=null;
    const error=new Error("Piper worker stopped");reject(error);this.pending?.reject(error);this.pending=null;
   };
   child.once("error",failed);child.once("close",failed);
  });
  return this.startup;
 }
 presets(){
  const ready=existsSync(this.python)&&existsSync(join(this.root,"models/chaowen/ready.json"))&&existsSync(join(this.root,`models/chaowen/${CHAOWEN_PRESET}.onnx`));
  return [{id:CHAOWEN_PRESET,name:"超文",language:"zh-CN",provider:"piper",quality:"medium",sampleRate:22050,ready}];
 }
 async preview(raw:unknown){
  const body=(raw??{}) as Record<string,unknown>;
  if(body.preset!==CHAOWEN_PRESET)throw new BadRequestException("Unknown voice preset.");
  if(typeof body.text!=="string"||!body.text.trim()||body.text.trim().length>300)throw new BadRequestException("试听文本需为 1–300 个字符。");
  if(!/\p{Script=Han}/u.test(body.text))throw new BadRequestException("超文目前仅支持中文试听。");
  const speed=Number(body.speed??1);
  if(!Number.isFinite(speed)||speed<0.7||speed>1.3)throw new BadRequestException("语速需为 0.7–1.3。");
  return this.render(body.text.trim(),speed);
 }
 async synthesize(raw:unknown){
  const body=(raw??{}) as Record<string,unknown>;
  if(typeof body.text!=="string"||!body.text.trim()||body.text.length>3000)throw new BadRequestException("Invalid speech text.");
  const settings=await this.prisma.voiceSettings.findUnique({where:{id:"default"}});
  if(!settings?.enabled||!settings.autoSpeak||settings.provider!=="piper")return {audioUrl:null,reason:"disabled"};
  // This first preset is Mandarin-only; never force other scripts through it.
  if(!/\p{Script=Han}/u.test(body.text)||/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}]/u.test(body.text))return {audioUrl:null,reason:"unsupported-language"};
  return this.render(body.text.trim(),settings.speed);
 }
 private async render(text:string,speed:number){
  if(!this.presets()[0].ready)throw new ServiceUnavailableException("本地超文声音尚未准备好。");
  if(this.busy)throw new ServiceUnavailableException("正在生成语音，请稍后再试。");
  this.busy=true;
  const filename=`piper-preview-${randomUUID()}.wav`;
  const output=resolve(process.cwd(),"uploads",filename);
  try{
   await mkdir(resolve(process.cwd(),"uploads"),{recursive:true});
   await this.ensureWorker();
   await new Promise<void>((done,reject)=>{
    const timer=setTimeout(()=>{this.worker?.kill();reject(new Error("timeout"));},120000);
    this.pending={done:()=>{clearTimeout(timer);done();},reject:error=>{clearTimeout(timer);reject(error);}};
    this.worker!.stdin.write(JSON.stringify({text,speed,output})+"\n");
   });
   const file=await stat(output);
   if(file.size<44)throw new Error("empty audio");
   return {audioUrl:`/api/v1/uploads/${filename}`,preset:CHAOWEN_PRESET,language:"zh-CN"};
  }catch{
   await unlink(output).catch(()=>{});
   throw new ServiceUnavailableException("语音生成失败，请稍后重试或检查本地 Piper 环境。");
  }finally{this.busy=false;}
 }
}
