import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ReplyRule } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { CreateReplyRuleInput, MATCH_MODES, MatchMode, UpdateReplyRuleInput } from "./reply-rules.types";

@Injectable()
export class ReplyRulesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<ReplyRule[]> {
    return this.prisma.replyRule.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "asc" }] });
  }

  async get(id: string): Promise<ReplyRule> {
    const rule = await this.prisma.replyRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException("Reply rule not found.");
    return rule;
  }

  create(input: unknown): Promise<ReplyRule> {
    return this.prisma.replyRule.create({ data: this.validate(input, false) as CreateReplyRuleInput });
  }

  async update(id: string, input: unknown): Promise<ReplyRule> {
    await this.get(id);
    const data = this.validate(input, true);
    if (Object.keys(data).length === 0) throw new BadRequestException("At least one field is required.");
    return this.prisma.replyRule.update({ where: { id }, data });
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.get(id);
    await this.prisma.replyRule.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validate(input: unknown, partial: boolean): CreateReplyRuleInput | UpdateReplyRuleInput {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Request body must be an object.");
    const body = input as Record<string, unknown>;
    const allowed = new Set(["name", "triggers", "matchMode", "reply", "priority", "enabled"]);
    const unknown = Object.keys(body).filter((key) => !allowed.has(key));
    if (unknown.length) throw new BadRequestException(`Unknown reply rule field(s): ${unknown.join(", ")}`);
    if (!partial) {
      for (const field of ["name", "triggers", "reply"] as const) {
        if (body[field] === undefined) throw new BadRequestException(`${field} is required.`);
      }
    }
    const data: UpdateReplyRuleInput = {};
    if (body.name !== undefined) data.name = this.text(body.name, "name", 120);
    if (body.reply !== undefined) data.reply = this.text(body.reply, "reply", 10000);
    if (body.triggers !== undefined) {
      if (!Array.isArray(body.triggers) || body.triggers.length === 0 || body.triggers.length > 50) throw new BadRequestException("triggers must contain 1 to 50 strings.");
      const triggers = body.triggers.map((v) => this.text(v, "trigger", 200));
      data.triggers = [...new Set(triggers.map((v) => v.trim()))];
    }
    if (body.matchMode !== undefined) {
      if (typeof body.matchMode !== "string" || !MATCH_MODES.includes(body.matchMode as MatchMode)) throw new BadRequestException(`matchMode must be one of: ${MATCH_MODES.join(", ")}.`);
      data.matchMode = body.matchMode as MatchMode;
    } else if (!partial) data.matchMode = "contains";
    if (body.priority !== undefined) {
      if (!Number.isInteger(body.priority) || (body.priority as number) < 0 || (body.priority as number) > 100000) throw new BadRequestException("priority must be an integer from 0 to 100000.");
      data.priority = body.priority as number;
    } else if (!partial) data.priority = 100;
    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") throw new BadRequestException("enabled must be a boolean.");
      data.enabled = body.enabled;
    } else if (!partial) data.enabled = true;
    return data;
  }

  private text(value: unknown, field: string, max: number): string {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > max) throw new BadRequestException(`${field} must be a non-empty string up to ${max} characters.`);
    return value.trim();
  }
}
