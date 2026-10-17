export const BACKGROUND_TYPES = ["image", "gradient", "solid"] as const;
export type BackgroundType = (typeof BACKGROUND_TYPES)[number];

export const BACKGROUND_FITS = ["cover", "contain", "stretch", "responsive"] as const;
export type BackgroundFit = (typeof BACKGROUND_FITS)[number];

export interface UpdateAppearanceInput {
  backgroundType?: BackgroundType;
  backgroundImageUrl?: string | null;
  backgroundOverlay?: number;
  backgroundBlur?: number;
  glassOpacity?: number;
  accentColor?: string;
  backgroundPosition?: string;
  backgroundFit?: BackgroundFit;
}
