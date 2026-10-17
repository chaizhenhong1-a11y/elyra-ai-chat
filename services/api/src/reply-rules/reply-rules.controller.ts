import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ReplyRulesService } from "./reply-rules.service";

@Controller("reply-rules")
export class ReplyRulesController {
  constructor(private readonly replyRulesService: ReplyRulesService) {}
  @Get() list() { return this.replyRulesService.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.replyRulesService.get(id); }
  @Post() create(@Body() body: unknown) { return this.replyRulesService.create(body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: unknown) { return this.replyRulesService.update(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.replyRulesService.remove(id); }
}
