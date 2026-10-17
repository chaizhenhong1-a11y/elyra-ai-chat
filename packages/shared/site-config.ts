export type BackgroundType = "gradient" | "image" | "solid";
export type SiteConfig = {
  displayName: string;
  chatName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  openingMessage: string;
  inputPlaceholder: string;
  statusText: string;
  background: {
    type: BackgroundType;
    imageUrl: string;
    solidColor: string;
    gradient: string;
    overlayOpacity: number;
    blur: number;
    position: string;
  };
  glassOpacity: number;
  accent: string;
};
export const defaultSiteConfig: SiteConfig = {
  displayName: "Your Space",
  chatName: "Companion",
  heroEyebrow: "A PRIVATE SPACE FOR CONVERSATION",
  heroTitle: "Good evening.",
  heroSubtitle: "What’s on your mind?",
  openingMessage: "Hi. I’m here to listen, think with you, and have a meaningful conversation.",
  inputPlaceholder: "Message…",
  statusText: "Online",
  background: { type: "gradient", imageUrl: "", solidColor: "#09101f", gradient: "radial-gradient(circle at 72% 24%, #334a78 0%, #17243f 28%, #0a1020 62%, #060910 100%)", overlayOpacity: 0.28, blur: 0, position: "center" },
  glassOpacity: 0.52,
  accent: "#8daeff"
};
