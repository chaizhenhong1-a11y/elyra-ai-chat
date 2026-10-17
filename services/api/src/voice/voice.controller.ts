import {BadRequestException,Body,Controller,Get,Param,Post,Put,UploadedFile,UseInterceptors} from "@nestjs/common";
import {FileInterceptor} from "@nestjs/platform-express";
import {diskStorage} from "multer";
import {extname,join} from "path";
import {mkdirSync} from "fs";
import {VoiceService} from "./voice.service";
import {PiperPreviewService} from "./piper-preview.service";
import {KokoroPreviewService,KOKORO_PRESET} from "./kokoro-preview.service";
const dir=join(process.cwd(),"uploads"); mkdirSync(dir,{recursive:true});
@Controller("voice")
export class VoiceController{
 constructor(private readonly service:VoiceService,private readonly piper:PiperPreviewService,private readonly kokoro:KokoroPreviewService){}
 @Get("presets") presets(){return [...this.piper.presets(),...this.kokoro.presets()];}
 @Post("preview") preview(@Body() body:unknown){return (body as {preset?:unknown})?.preset===KOKORO_PRESET?this.kokoro.preview(body):this.piper.preview(body);}
 @Post("synthesize") async synthesize(@Body() body:unknown){const settings=await this.service.get();return settings.provider==="kokoro"?this.kokoro.synthesize(body):this.piper.synthesize(body);}
 @Get() get(){return this.service.get();}
 @Put() update(@Body() b:unknown){return this.service.update(b);}
 @Post("reference") @UseInterceptors(FileInterceptor("audio",{storage:diskStorage({destination:dir,filename:(_r,f,cb)=>cb(null,`voice-${Date.now()}${extname(f.originalname).toLowerCase()}`)}),limits:{fileSize:15*1024*1024},fileFilter:(_r,f,cb)=>{const ok=/audio\/(wav|wave|mpeg|mp4|x-m4a|webm|ogg)/i.test(f.mimetype)||/\.(wav|mp3|m4a|webm|ogg)$/i.test(f.originalname);cb(ok?null:new BadRequestException("Unsupported audio format"),ok);}}))
 upload(@UploadedFile() file?:Express.Multer.File,@Body("language") language?:string){if(!file)throw new BadRequestException("audio is required");return this.service.setReferenceAudio(`/api/v1/uploads/${file.filename}`,language,file.originalname);}
 @Put("reference/:language/verification") verify(@Param("language") language:string,@Body() body:unknown){return this.service.verifyReference(language,body);}
}
