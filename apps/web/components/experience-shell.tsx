"use client";
import type {CSSProperties} from "react";
import type {SiteConfig} from "@/lib/site-config";
import {CharacterConversation} from "./character-conversation";
import {useI18n} from "@/lib/i18n";

type Module={key:string;label:string;description:string;enabled:boolean};

export function ExperienceShell({style,config,skinTone,modelKey,modules}:{style:CSSProperties;config:SiteConfig;skinTone?:string;modelKey?:"elyra-stanley"|"male-01";modules:Module[]}){
 const {t}=useI18n();
 const label=(key:string,fallback:string)=>key==="chat"?t.navChat:key==="memory"?t.navMemory:key==="about"?t.navAbout:key==="explore"?t.navExplore:fallback;
 return <main className="experience" style={style}>
   <aside className="rail">
     <a className="brand" href="#">✦ <span>{t.yourSpace}</span></a>
     <nav>{modules.filter(m=>m.enabled).map(m=>{
       const icon=m.key==="chat"?"◉":m.key==="memory"?"◌":m.key==="about"?"◇":"✧";
       return <a className={m.key==="chat"?"active":undefined} key={m.key} title={label(m.key,m.description)}>{icon} <span>{label(m.key,m.label)}</span></a>;
     })}</nav>
     <div className="railQuote"><small>{t.privateSpace}</small><p>{t.privateQuote.split("\n").map((x,i)=><span key={i}>{x}{i===0&&<br/>}</span>)}</p></div>
   </aside>
   <CharacterConversation config={config} skinTone={skinTone} modelKey={modelKey}/>
 </main>;
}
