import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const ID = "default";
const defaults = {
  displayName: "Your Space", chatName: "Companion", chatAvatarUrl: null as string | null, heroEyebrow: "A PRIVATE SPACE FOR CONVERSATION",
  heroTitle: "Good evening.", heroSubtitle: "What’s on your mind?", heroDescription: "A space to think, talk, and be yourself.",
  openingMessage: "Hi. I’m here to listen, think with you, and have a meaningful conversation.", inputPlaceholder: "Message…",
  statusText: "Online", quickActions: ["Talk about anything", "Get some advice", "Explore ideas", "Just chat"],
};
const textFields = ["displayName","chatName","heroEyebrow","heroTitle","heroSubtitle","heroDescription","openingMessage","inputPlaceholder","statusText"] as const;

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}
  get() { return this.prisma.siteContent.upsert({ where: { id: ID }, create: { id: ID, ...defaults }, update: {} }); }
  update(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Request body must be an object.");
    const body = input as Record<string, unknown>; const allowed = new Set([...textFields, "chatAvatarUrl", "quickActions"]);
    const unknown = Object.keys(body).filter(k => !allowed.has(k));
    if (unknown.length) throw new BadRequestException(`Unknown site content field(s): ${unknown.join(", ")}`);
    const data: Record<string, string | string[] | null> = {};
    for (const key of textFields) if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || !(body[key] as string).trim() || (body[key] as string).length > 1000) throw new BadRequestException(`${key} must be a non-empty string up to 1000 characters.`);
      data[key] = (body[key] as string).trim();
    }
    if (body.chatAvatarUrl !== undefined) {
      if (body.chatAvatarUrl !== null && (typeof body.chatAvatarUrl !== "string" || !/^\/api\/v1\/uploads\/avatar-[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(body.chatAvatarUrl))) throw new BadRequestException("chatAvatarUrl must be an uploaded avatar URL or null.");
      data.chatAvatarUrl = body.chatAvatarUrl as string | null;
    }
    if (body.quickActions !== undefined) {
      if (!Array.isArray(body.quickActions) || body.quickActions.length < 1 || body.quickActions.length > 8 || body.quickActions.some(v => typeof v !== "string" || !v.trim() || v.length > 120)) throw new BadRequestException("quickActions must contain 1 to 8 non-empty strings up to 120 characters.");
      data.quickActions = body.quickActions.map(v => (v as string).trim());
    }
    return this.prisma.siteContent.upsert({ where: { id: ID }, create: { id: ID, ...defaults, ...data }, update: data });
  }
}
