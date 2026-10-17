import { Module } from "@nestjs/common";
import { AppearanceController } from "./appearance.controller";
import { AppearanceService } from "./appearance.service";

@Module({
  controllers: [AppearanceController],
  providers: [AppearanceService],
})
export class AppearanceModule {}
