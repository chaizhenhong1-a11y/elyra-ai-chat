import { Controller, Delete, Get, Param } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list() {
    return this.conversationsService.list();
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.conversationsService.remove(id);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.conversationsService.get(id);
  }
}
