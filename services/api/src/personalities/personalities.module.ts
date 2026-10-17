import { Module } from "@nestjs/common";
import { PersonalitiesController } from "./personalities.controller";
import { PersonalitiesService } from "./personalities.service";

@Module({
  controllers: [PersonalitiesController],
  providers: [PersonalitiesService],
  exports: [PersonalitiesService],
})
export class PersonalitiesModule {}
