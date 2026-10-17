import {Module} from "@nestjs/common";
import {CharacterController} from "./character.controller";
import {CharacterGenerationController} from "./character-generation.controller";
import {CharacterGenerationService} from "./character-generation.service";
import {CharacterService} from "./character.service";
@Module({controllers:[CharacterController,CharacterGenerationController],providers:[CharacterService,CharacterGenerationService]})
export class CharacterModule{}
