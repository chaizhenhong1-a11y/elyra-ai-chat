import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const DEFAULTS = {
  defaultLanguage: "en",
  timezone: "Asia/Kuala_Lumpur",
  conversationSavingEnabled: false,
  conversationRetentionDays: 30,
  maxMessageLength: 4000,
  maintenanceMode: false,
  conversationStyle: "natural",
  emotionalResponse: "balanced",
  disagreementStyle: "natural",
  responseLength: "adaptive",
  allowProfanity: true,
  sensitiveAdviceMode: "cautious",
};

type EditableSettings = typeof DEFAULTS;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.systemSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...DEFAULTS },
      update: {},
    });
  }

  async getAdminSettings() {
    const settings = await this.getSettings();
    let database = "connected";
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { database = "unavailable"; }
    return { ...settings, runtime: { api: "online", database } };
  }

  async update(input: unknown) {
    const data = this.readUpdate(input);
    await this.getSettings();
    return this.prisma.systemSettings.update({ where: { id: "default" }, data });
  }

  private readUpdate(input: unknown): EditableSettings {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Request body must be an object.");
    const body = input as Record<string, unknown>;
    const allowed = Object.keys(DEFAULTS);
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
    if (unknown.length) throw new BadRequestException(`Unknown settings field(s): ${unknown.join(", ")}`);

    const text = (key: "defaultLanguage" | "timezone", max: number) => {
      const value = body[key];
      if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new BadRequestException(`${key} must be a non-empty string up to ${max} characters.`);
      return value.trim();
    };
    const bool = (key: "conversationSavingEnabled" | "maintenanceMode" | "allowProfanity") => {
      if (typeof body[key] !== "boolean") throw new BadRequestException(`${key} must be a boolean.`);
      return body[key] as boolean;
    };
    const integer = (key: "conversationRetentionDays" | "maxMessageLength", min: number, max: number) => {
      const value = body[key];
      if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new BadRequestException(`${key} must be an integer from ${min} to ${max}.`);
      return value as number;
    };
    const choice = <T extends string>(key: string, values: readonly T[]): T => {
      const value = body[key];
      if (typeof value !== "string" || !values.includes(value as T)) throw new BadRequestException(`${key} must be one of: ${values.join(", ")}.`);
      return value as T;
    };

    return {
      defaultLanguage: text("defaultLanguage", 20),
      timezone: text("timezone", 80),
      conversationSavingEnabled: bool("conversationSavingEnabled"),
      conversationRetentionDays: integer("conversationRetentionDays", 1, 3650),
      maxMessageLength: integer("maxMessageLength", 100, 20000),
      maintenanceMode: bool("maintenanceMode"),
      conversationStyle: choice("conversationStyle", ["natural", "casual", "professional"] as const),
      emotionalResponse: choice("emotionalResponse", ["low", "balanced", "high"] as const),
      disagreementStyle: choice("disagreementStyle", ["agreeable", "natural", "challenging"] as const),
      responseLength: choice("responseLength", ["short", "adaptive", "detailed"] as const),
      allowProfanity: bool("allowProfanity"),
      sensitiveAdviceMode: choice("sensitiveAdviceMode", ["strict", "cautious", "normal"] as const),
    };
  }
}
