import { Body, Controller, Get, Put } from "@nestjs/common";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getAdminSettings();
  }

  @Put()
  update(@Body() body: unknown) {
    return this.settingsService.update(body);
  }
}
