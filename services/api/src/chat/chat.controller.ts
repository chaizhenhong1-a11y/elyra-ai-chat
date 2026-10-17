import { Body, Controller, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatResponse } from "./chat.types";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  reply(@Body() body: unknown): Promise<ChatResponse> {
    return this.chatService.reply(body);
  }
}
