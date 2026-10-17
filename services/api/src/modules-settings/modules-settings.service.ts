import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const defaults = [
  { key: "chat", label: "Chat", description: "Core conversation experience", enabled: true, sortOrder: 0 },
  { key: "memory", label: "Memory", description: "Personal memory and continuity", enabled: true, sortOrder: 1 },
  { key: "about", label: "About", description: "Information about this space", enabled: true, sortOrder: 2 },
  { key: "explore", label: "Explore", description: "Discover ideas and experiences", enabled: true, sortOrder: 3 },
];

@Injectable()
export class ModulesSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    await Promise.all(defaults.map(item => this.prisma.siteModule.upsert({ where: { key: item.key }, create: item, update: {} })));
    return this.prisma.siteModule.findMany({ orderBy: [{ sortOrder: "asc" }, { key: "asc" }] });
  }

  async update(input: unknown) {
    if (!Array.isArray(input)) throw new BadRequestException("Modules must be an array.");
    const allowedKeys = new Set(defaults.map(item => item.key));
    const seen = new Set<string>();
    const rows = input.map((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Each module must be an object.");
      const item = raw as Record<string, unknown>;
      const key = item.key;
      if (typeof key !== "string" || !allowedKeys.has(key) || seen.has(key)) throw new BadRequestException("Unknown or duplicate module key.");
      seen.add(key);
      if (typeof item.label !== "string" || !item.label.trim() || item.label.length > 40) throw new BadRequestException(`${key}.label must be 1 to 40 characters.`);
      if (typeof item.description !== "string" || !item.description.trim() || item.description.length > 160) throw new BadRequestException(`${key}.description must be 1 to 160 characters.`);
      if (typeof item.enabled !== "boolean") throw new BadRequestException(`${key}.enabled must be boolean.`);
      if (key === "chat" && item.enabled === false) throw new BadRequestException("Chat is the core module and cannot be disabled.");
      return { key, label: item.label.trim(), description: item.description.trim(), enabled: key === "chat" ? true : item.enabled, sortOrder: index };
    });
    if (rows.length !== defaults.length || seen.size !== defaults.length) throw new BadRequestException("All site modules must be included.");
    await this.prisma.$transaction(rows.map(row => this.prisma.siteModule.upsert({ where: { key: row.key }, create: row, update: row })));
    return this.getAll();
  }
}
