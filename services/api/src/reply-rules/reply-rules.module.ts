import { Module } from "@nestjs/common";
import { ReplyRulesController } from "./reply-rules.controller";
import { ReplyRulesService } from "./reply-rules.service";

@Module({ controllers: [ReplyRulesController], providers: [ReplyRulesService], exports: [ReplyRulesService] })
export class ReplyRulesModule {}
