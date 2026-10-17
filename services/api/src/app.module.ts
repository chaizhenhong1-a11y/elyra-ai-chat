import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./database/prisma.module";
import { HealthController } from "./health.controller";
import { AppearanceModule } from "./appearance/appearance.module";
import { UploadsController } from "./uploads.controller";
import { ReplyRulesModule } from "./reply-rules/reply-rules.module";
import { ChatModule } from "./chat/chat.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SiteContentModule } from "./site-content/site-content.module";
import { ModulesSettingsModule } from "./modules-settings/modules-settings.module";
import { SettingsModule } from "./settings/settings.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PersonalitiesModule } from "./personalities/personalities.module";
import { CharacterModule } from "./character/character.module";
import { VoiceModule } from "./voice/voice.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AppearanceModule,
    ReplyRulesModule,
    ChatModule,
    ConversationsModule,
    DashboardModule,
    SiteContentModule,
    ModulesSettingsModule,
    SettingsModule,
    AnalyticsModule, PersonalitiesModule, CharacterModule, VoiceModule,
  ],
  controllers: [HealthController, UploadsController],
})
export class AppModule {}
