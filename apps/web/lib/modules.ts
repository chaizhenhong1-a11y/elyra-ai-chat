export type SiteModule={key:string;label:string;description:string;enabled:boolean;sortOrder:number};
const API_BASE_URL=process.env.ELYRA_API_URL ?? "http://localhost:4000/api/v1";
const fallback:SiteModule[]=[
 {key:"chat",label:"Chat",description:"Core conversation experience",enabled:true,sortOrder:0},
 {key:"memory",label:"Memory",description:"Personal memory and continuity",enabled:true,sortOrder:1},
 {key:"about",label:"About",description:"Information about this space",enabled:true,sortOrder:2},
 {key:"explore",label:"Explore",description:"Discover ideas and experiences",enabled:true,sortOrder:3},
];
export async function getSiteModules():Promise<SiteModule[]>{try{const r=await fetch(`${API_BASE_URL}/modules`,{cache:"no-store"});if(!r.ok)return fallback;return await r.json() as SiteModule[]}catch{return fallback}}
