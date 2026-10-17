import type {CSSProperties} from "react";
import {ExperienceShell} from "@/components/experience-shell";
import {getAppearance} from "@/lib/appearance";
import {getCharacter} from "@/lib/character";
import {getSiteConfig} from "@/lib/site-config";
import {getSiteContent} from "@/lib/site-content";
import {getSiteModules} from "@/lib/modules";

export const dynamic = "force-dynamic";

function toBrowserBackgroundUrl(value: string) {
  if (!value) return value;
  if (value.startsWith("/api/v1/uploads/")) {
    return value.replace("/api/v1/uploads/", "/api/uploads/");
  }

  // Backward compatibility for backgrounds saved by older local builds.
  try {
    const parsed = new URL(value);
    if (
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
      parsed.pathname.startsWith("/api/v1/uploads/")
    ) {
      return parsed.pathname.replace("/api/v1/uploads/", "/api/uploads/");
    }
  } catch {
    // Non-URL values are handled by the normal fallback below.
  }
  return value;
}

export default async function Home() {
  const base = getSiteConfig();
  const content = await getSiteContent();
  const modules = await getSiteModules();
  const c = {...base, ...(content ?? {})};
  const appearance = await getAppearance();
  const character = await getCharacter();
  const skinTone = typeof character?.characterConfig?.skinTone === "string" ? character.characterConfig.skinTone : "original";
  const modelKey = character?.characterConfig?.modelKey === "male-01" ? "male-01" : "elyra-stanley";
  const background = {
    ...c.background,
    ...(appearance
      ? {
          type: appearance.backgroundType,
          imageUrl: appearance.backgroundImageUrl ?? "",
          overlayOpacity: appearance.backgroundOverlay,
          blur: appearance.backgroundBlur,
          position: appearance.backgroundPosition,
          fit: appearance.backgroundFit,
        }
      : {}),
  };
  const glassOpacity = appearance?.glassOpacity ?? c.glassOpacity;
  const accent = appearance?.accentColor ?? c.accent;
  const browserImageUrl = toBrowserBackgroundUrl(background.imageUrl);
  const bg =
    background.type === "image" && browserImageUrl
      ? `url(${JSON.stringify(browserImageUrl)})`
      : background.type === "solid"
        ? background.solidColor
        : background.gradient;

  return (
    <ExperienceShell
      config={c}
      skinTone={skinTone}
      modelKey={modelKey}
      modules={modules}
      style={{
        "--scene": bg,
        "--overlay": background.overlayOpacity,
        "--glass": glassOpacity,
        "--glass-blur": `${Math.round(glassOpacity * 24)}px`,
        "--accent": accent,
      } as CSSProperties}
    />
  );
}
