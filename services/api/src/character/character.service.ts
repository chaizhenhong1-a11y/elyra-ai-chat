import {BadRequestException, Injectable} from "@nestjs/common";
import {Prisma} from "@prisma/client";
import {PrismaService} from "../database/prisma.service";

const defaults = {
  id: "default",
  archetype: "human",
  headScale: 1,
  bodyScale: 1,
  armScale: 1,
  legScale: 1,
  primaryColor: "#b98263",
  accentColor: "#777cff",
  antenna: false,
};

@Injectable()
export class CharacterService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.aiCharacter.upsert({where: {id: "default"}, create: defaults, update: {}});
  }

  update(raw: unknown) {
    const b = (raw ?? {}) as Record<string, unknown>;
    const n = (k: string, d = 1) => {
      const v = Number(b[k] ?? d);
      if (!Number.isFinite(v) || v < 0.45 || v > 1.8) {
        throw new BadRequestException(`${k} must be 0.45..1.8`);
      }
      return v;
    };
    const color = (k: string, d: string) =>
      typeof b[k] === "string" && /^#[0-9a-fA-F]{6}$/.test(b[k] as string) ? (b[k] as string) : d;
    const archetype = b.archetype === "robot" || b.archetype === "custom" ? b.archetype : "human";
    const cfg = b.characterConfig;
    let characterConfig: Prisma.InputJsonObject | undefined;
    if (cfg !== undefined) {
      if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
        throw new BadRequestException("characterConfig must be an object.");
      }
      const rawConfig = cfg as Record<string, unknown>;
      const allowedSkinTones = new Set([
        "original",
        "#f0cbb8",
        "#ddb092",
        "#c99270",
        "#aa7354",
        "#805038",
        "#593421",
      ]);
      if (
        rawConfig.skinTone !== undefined &&
        (typeof rawConfig.skinTone !== "string" || !allowedSkinTones.has(rawConfig.skinTone))
      ) {
        throw new BadRequestException("characterConfig.skinTone is not a supported skin tone.");
      }
      if (rawConfig.modelKey !== undefined && rawConfig.modelKey !== "elyra-stanley" && rawConfig.modelKey !== "male-01") {
        throw new BadRequestException("characterConfig.modelKey is not a supported character model.");
      }
      characterConfig = rawConfig as Prisma.InputJsonObject;
    }
    const data = {
      archetype,
      headScale: n("headScale"),
      bodyScale: n("bodyScale"),
      armScale: n("armScale"),
      legScale: n("legScale"),
      primaryColor: color("primaryColor", defaults.primaryColor),
      accentColor: color("accentColor", defaults.accentColor),
      antenna: b.antenna === true,
      ...(characterConfig ? {characterConfig} : {}),
    };
    return this.prisma.aiCharacter.upsert({where: {id: "default"}, create: {id: "default", ...data}, update: data});
  }
}
