import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PersonalityProfile, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class PersonalitiesService {
  constructor(private readonly prisma: PrismaService) {}
  list(): Promise<PersonalityProfile[]> { return this.prisma.personalityProfile.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] }); }
  async getActive(): Promise<PersonalityProfile | null> { return this.prisma.personalityProfile.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } }); }
  create(input: unknown): Promise<PersonalityProfile> { return this.prisma.personalityProfile.create({ data: this.validateCreate(input) }); }
  async update(id: string, input: unknown): Promise<PersonalityProfile> {
    await this.require(id); const data = this.validateUpdate(input); if (!Object.keys(data).length) throw new BadRequestException("At least one field is required.");
    return this.prisma.personalityProfile.update({ where: { id }, data });
  }
  async activate(id: string): Promise<PersonalityProfile> {
    await this.require(id);
    return this.prisma.$transaction(async (tx) => { await tx.personalityProfile.updateMany({ where: { active: true }, data: { active: false } }); return tx.personalityProfile.update({ where: { id }, data: { active: true } }); });
  }
  async remove(id: string): Promise<{ deleted: true; id: string }> {
    const profile = await this.require(id); if (profile.active) throw new BadRequestException("Activate another personality before deleting the active profile.");
    await this.prisma.personalityProfile.delete({ where: { id } }); return { deleted: true, id };
  }
  private async require(id: string) { const value = await this.prisma.personalityProfile.findUnique({ where: { id } }); if (!value) throw new NotFoundException("Personality profile not found."); return value; }
  private validateCreate(input: unknown): Prisma.PersonalityProfileUncheckedCreateInput {
    return this.validate(input, false) as Prisma.PersonalityProfileUncheckedCreateInput;
  }
  private validateUpdate(input: unknown): Prisma.PersonalityProfileUncheckedUpdateInput {
    return this.validate(input, true) as Prisma.PersonalityProfileUncheckedUpdateInput;
  }
  private validate(input: unknown, partial: boolean): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Request body must be an object.");
    const body = input as Record<string, unknown>; const allowed = new Set(["name","description","tone","empathy","humor","formality","replyLength","behaviorInstructions"]);
    const unknown = Object.keys(body).filter((key) => !allowed.has(key)); if (unknown.length) throw new BadRequestException(`Unknown personality field(s): ${unknown.join(", ")}`);
    if (!partial && body.name === undefined) throw new BadRequestException("name is required.");
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = this.text(body.name,"name",80,false);
    if (body.description !== undefined) data.description = this.text(body.description,"description",500,true);
    if (body.tone !== undefined) data.tone = this.text(body.tone,"tone",300,false);
    for (const field of ["empathy","humor","formality"] as const) if (body[field] !== undefined) { if (!Number.isInteger(body[field]) || (body[field] as number) < 0 || (body[field] as number) > 100) throw new BadRequestException(`${field} must be an integer from 0 to 100.`); data[field] = body[field]; }
    if (body.replyLength !== undefined) { if (!["short","medium","long"].includes(String(body.replyLength))) throw new BadRequestException("replyLength must be short, medium or long."); data.replyLength = body.replyLength; }
    if (body.behaviorInstructions !== undefined) data.behaviorInstructions = this.text(body.behaviorInstructions,"behaviorInstructions",4000,true);
    return data;
  }
  private text(value: unknown, field: string, max: number, allowEmpty: boolean) { if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) throw new BadRequestException(`${field} must be ${allowEmpty ? "a" : "a non-empty"} string up to ${max} characters.`); return value.trim(); }
}
