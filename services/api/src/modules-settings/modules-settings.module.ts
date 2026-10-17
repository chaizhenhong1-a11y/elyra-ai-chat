import { Module } from "@nestjs/common";
import { ModulesSettingsController } from "./modules-settings.controller";
import { ModulesSettingsService } from "./modules-settings.service";

@Module({ controllers: [ModulesSettingsController], providers: [ModulesSettingsService] })
export class ModulesSettingsModule {}
