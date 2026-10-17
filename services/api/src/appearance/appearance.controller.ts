import { Body, Controller, Get, Put } from "@nestjs/common";
import { AppearanceService } from "./appearance.service";

@Controller("appearance")
export class AppearanceController {
  constructor(private readonly appearanceService: AppearanceService) {}

  @Get()
  getAppearance() {
    return this.appearanceService.get();
  }

  @Put()
  updateAppearance(@Body() body: unknown) {
    return this.appearanceService.update(body);
  }
}
