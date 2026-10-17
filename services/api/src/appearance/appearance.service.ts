import { BadRequestException, Injectable } from "@nestjs/common";
import { AppearanceSettings } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  BACKGROUND_FITS,
  BACKGROUND_TYPES,
  BackgroundFit,
  BackgroundType,
  UpdateAppearanceInput,
} from "./appearance.types";

const SETTINGS_ID = "default";
const DEFAULT_APPEARANCE = {
  backgroundType: "gradient",
  backgroundImageUrl: null,
  backgroundOverlay: 0.55,
  backgroundBlur: 0,
  glassOpacity: 0.14,
  accentColor: "#8B7CFF",
  backgroundPosition: "center",
  backgroundFit: "cover",
} as const;

@Injectable()
export class AppearanceService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AppearanceSettings> {
    const settings = await this.prisma.appearanceSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_APPEARANCE },
      update: {},
    });

    const normalizedUrl = this.normalizeBackgroundImageUrl(settings.backgroundImageUrl);
    if (normalizedUrl !== settings.backgroundImageUrl) {
      return this.prisma.appearanceSettings.update({
        where: { id: SETTINGS_ID },
        data: { backgroundImageUrl: normalizedUrl },
      });
    }
    return settings;
  }

  async update(input: unknown): Promise<AppearanceSettings> {
    const data = this.validateUpdate(input);
    return this.prisma.appearanceSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_APPEARANCE, ...data },
      update: data,
    });
  }

  private validateUpdate(input: unknown): UpdateAppearanceInput {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestException("Request body must be an object.");
    }

    const body = input as Record<string, unknown>;
    const allowed = new Set([
      "backgroundType",
      "backgroundImageUrl",
      "backgroundOverlay",
      "backgroundBlur",
      "glassOpacity",
      "accentColor",
      "backgroundPosition",
      "backgroundFit",
    ]);
    const unknownKeys = Object.keys(body).filter((key) => !allowed.has(key));
    if (unknownKeys.length > 0) {
      throw new BadRequestException(`Unknown appearance field(s): ${unknownKeys.join(", ")}`);
    }

    const data: UpdateAppearanceInput = {};

    if (body.backgroundType !== undefined) {
      if (
        typeof body.backgroundType !== "string" ||
        !BACKGROUND_TYPES.includes(body.backgroundType as BackgroundType)
      ) {
        throw new BadRequestException(
          `backgroundType must be one of: ${BACKGROUND_TYPES.join(", ")}.`,
        );
      }
      data.backgroundType = body.backgroundType as BackgroundType;
    }

    if (body.backgroundImageUrl !== undefined) {
      if (
        body.backgroundImageUrl !== null &&
        (typeof body.backgroundImageUrl !== "string" ||
          body.backgroundImageUrl.length > 2048)
      ) {
        throw new BadRequestException(
          "backgroundImageUrl must be null or a string up to 2048 characters.",
        );
      }
      data.backgroundImageUrl = this.normalizeBackgroundImageUrl(
        body.backgroundImageUrl as string | null,
      );
    }

    data.backgroundOverlay = this.optionalNumber(
      body.backgroundOverlay,
      "backgroundOverlay",
      0,
      1,
    );
    data.glassOpacity = this.optionalNumber(
      body.glassOpacity,
      "glassOpacity",
      0,
      1,
    );
    data.backgroundBlur = this.optionalInteger(
      body.backgroundBlur,
      "backgroundBlur",
      0,
      100,
    );

    if (body.accentColor !== undefined) {
      if (
        typeof body.accentColor !== "string" ||
        !/^#[0-9a-fA-F]{6}$/.test(body.accentColor)
      ) {
        throw new BadRequestException(
          "accentColor must be a 6-digit hex color such as #8B7CFF.",
        );
      }
      data.accentColor = body.accentColor;
    }

    if (body.backgroundPosition !== undefined) {
      if (
        typeof body.backgroundPosition !== "string" ||
        body.backgroundPosition.trim().length === 0 ||
        body.backgroundPosition.length > 100
      ) {
        throw new BadRequestException(
          "backgroundPosition must be a non-empty string up to 100 characters.",
        );
      }
      data.backgroundPosition = body.backgroundPosition.trim();
    }

    if (body.backgroundFit !== undefined) {
      if (
        typeof body.backgroundFit !== "string" ||
        !BACKGROUND_FITS.includes(body.backgroundFit as BackgroundFit)
      ) {
        throw new BadRequestException(
          `backgroundFit must be one of: ${BACKGROUND_FITS.join(", ")}.`,
        );
      }
      data.backgroundFit = body.backgroundFit as BackgroundFit;
    }

    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as UpdateAppearanceInput;
  }

  private normalizeBackgroundImageUrl(value: string | null): string | null {
    if (!value) return value;

    // Older development builds stored an absolute localhost URL in PostgreSQL.
    // Convert only Elyra-owned upload URLs to a host-independent relative path.
    try {
      const parsed = new URL(value);
      if (
        ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
        /^\/api\/v1\/uploads\/background-[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(parsed.pathname)
      ) {
        return parsed.pathname;
      }
    } catch {
      // Relative URLs are expected for local uploads.
    }

    return value;
  }

  private optionalNumber(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      throw new BadRequestException(`${field} must be a number from ${min} to ${max}.`);
    }
    return value;
  }

  private optionalInteger(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
      throw new BadRequestException(`${field} must be an integer from ${min} to ${max}.`);
    }
    return value as number;
  }
}
