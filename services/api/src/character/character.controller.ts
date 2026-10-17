import {Body,Controller,Get,Put} from "@nestjs/common";
import {CharacterService} from "./character.service";
@Controller("character")
export class CharacterController {
  constructor(private readonly service:CharacterService){}
  @Get() get(){return this.service.get();}
  @Put() update(@Body() body:unknown){return this.service.update(body);}
}
