export type SiteConfig = {
  displayName: string;
  chatName: string;
  heroTitle: string;
  heroSubtitle: string;
  openingMessage: string;
  inputPlaceholder: string;
  statusText: string;
};

export const defaultSiteConfig: SiteConfig = {
  displayName: "Your Space",
  chatName: "Companion",
  heroTitle: "有什么想和我说的吗？",
  heroSubtitle: "这里留给一段真正属于你的对话。",
  openingMessage: "嗨，我在这里。今天想聊些什么？",
  inputPlaceholder: "输入消息…",
  statusText: "在线",
};

export const SITE_CONFIG_STORAGE_KEY = "elyra.site-config.v1";
