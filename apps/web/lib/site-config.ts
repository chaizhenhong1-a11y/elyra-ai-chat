import {readFileSync} from "node:fs";
import path from "node:path";
export type SiteConfig = {
  displayName:string; chatName:string; chatAvatarUrl:string|null; heroEyebrow:string; heroTitle:string; heroSubtitle:string; openingMessage:string; inputPlaceholder:string; statusText:string;
  background:{type:"gradient"|"image"|"solid";imageUrl:string;solidColor:string;gradient:string;overlayOpacity:number;blur:number;position:string}; glassOpacity:number; accent:string;
};
const base:SiteConfig={displayName:"Your Space",chatName:"Companion",chatAvatarUrl:null,heroEyebrow:"A PRIVATE SPACE FOR CONVERSATION",heroTitle:"Good evening.",heroSubtitle:"What’s on your mind?",openingMessage:"Hi. I’m here to listen, think with you, and have a meaningful conversation.",inputPlaceholder:"Message…",statusText:"Online",background:{type:"gradient",imageUrl:"",solidColor:"#09101f",gradient:"radial-gradient(circle at 72% 24%, #334a78 0%, #17243f 28%, #0a1020 62%, #060910 100%)",overlayOpacity:.38,blur:0,position:"center"},glassOpacity:.52,accent:"#8daeff"};
export function getSiteConfig():SiteConfig{
  try { const p=path.resolve(process.cwd(),"../../packages/shared/runtime-site-config.json"); const runtime=JSON.parse(readFileSync(p,"utf8")); return {...base,...runtime,background:{...base.background,...runtime.background}}; } catch { return base; }
}
