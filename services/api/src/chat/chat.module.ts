import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { SemanticMatcherService } from "./semantic-matcher.service";
import { SettingsModule } from "../settings/settings.module";
import { AiConversationService } from "./ai-conversation.service";
import { PersonalitiesModule } from "../personalities/personalities.module";

@Module({
  imports: [SettingsModule, PersonalitiesModule],
  controllers: [ChatController],
  providers: [ChatService, SemanticMatcherService, AiConversationService],
})
export class ChatModule {}
