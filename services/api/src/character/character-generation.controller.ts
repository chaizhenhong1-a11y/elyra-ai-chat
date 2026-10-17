import {BadRequestException,Controller,Post,UploadedFile,UseInterceptors} from "@nestjs/common";
import {FileInterceptor} from "@nestjs/platform-express";
import {diskStorage} from "multer";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {extname} from "node:path";
import {randomUUID} from "node:crypto";
import {CharacterGenerationService} from "./character-generation.service";
const DIR=resolve(process.cwd(),"uploads/character-source");
const types:Record<string,string>={"image/jpeg":".jpg","image/png":".png","image/webp":".webp"};
@Controller("character")
export class CharacterGenerationController{
 constructor(private readonly generation:CharacterGenerationService){}
 @Post("generate-from-photo")
 @UseInterceptors(FileInterceptor("photo",{limits:{fileSize:10*1024*1024},fileFilter:(_r,f,cb)=>types[f.mimetype]?cb(null,true):cb(new BadRequestException("Photo must be JPG, PNG, or WEBP."),false),storage:diskStorage({destination:(_r,_f,cb)=>{mkdirSync(DIR,{recursive:true});cb(null,DIR)},filename:(_r,f,cb)=>cb(null,`character-${randomUUID()}${types[f.mimetype]??extname(f.originalname)}`)})}))
 generate(@UploadedFile() file?:Express.Multer.File){return this.generation.generate(file)}
}
