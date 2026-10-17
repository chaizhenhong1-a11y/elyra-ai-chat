import { Body, Controller, Get, Put } from "@nestjs/common";
import { ModulesSettingsService } from "./modules-settings.service";

@Controller("modules")
export class ModulesSettingsController {
  constructor(private readonly service: ModulesSettingsService) {}
  @Get() getAll() { return this.service.getAll(); }
  @Put() update(@Body() body: unknown) { return this.service.update(body); }
}
