export type AppearanceSettings = {
  id: string;
  backgroundType: "gradient" | "image" | "solid";
  backgroundImageUrl: string | null;
  backgroundOverlay: number;
  backgroundBlur: number;
  glassOpacity: number;
  accentColor: string;
  backgroundPosition: string;
  backgroundFit: "cover" | "contain" | "stretch" | "responsive";
};

const API_BASE_URL = process.env.ELYRA_API_URL ?? "http://localhost:4000/api/v1";

export async function getAppearance(): Promise<AppearanceSettings | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/appearance`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as AppearanceSettings;
  } catch {
    return null;
  }
}
