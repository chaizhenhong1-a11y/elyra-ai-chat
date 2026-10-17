export type SiteContent = { displayName:string; chatName:string; chatAvatarUrl:string|null; heroEyebrow:string; heroTitle:string; heroSubtitle:string; heroDescription:string; openingMessage:string; inputPlaceholder:string; statusText:string; quickActions:string[] };
const API_BASE_URL = process.env.ELYRA_API_URL ?? "http://localhost:4000/api/v1";
export async function getSiteContent(): Promise<SiteContent | null> { try { const r=await fetch(`${API_BASE_URL}/site-content`,{cache:"no-store"}); return r.ok ? await r.json() as SiteContent : null; } catch { return null; } }
