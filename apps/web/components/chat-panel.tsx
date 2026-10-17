"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import type {SiteConfig} from "@/lib/site-config";
type Message={id:number;role:"user"|"assistant";text:string};
function avatarSrc(url:string|null){return url?.startsWith("/api/v1/uploads/") ? url.replace("/api/v1/uploads/","/api/uploads/") : (url??"");}
export function ChatPanel({config}:{config:SiteConfig}){
 const [messages,setMessages]=useState<Message[]>([{id:1,role:"assistant",text:config.openingMessage}]); const [input,setInput]=useState(""); const [sending,setSending]=useState(false); const [conversationId,setConversationId]=useState<string|null>(null); const endRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const savedConversationId=window.localStorage.getItem("elyra.conversationId");
  if(savedConversationId)setConversationId(savedConversationId);
 },[]);
 useEffect(()=>{
  endRef.current?.scrollIntoView({behavior:"smooth"});
 },[messages,sending]);
 async function submit(e:FormEvent){e.preventDefault();const text=input.trim();if(!text||sending)return;const history=messages.slice(-20).map(m=>({role:m.role,content:m.text}));setInput("");setMessages(v=>[...v,{id:Date.now(),role:"user",text}]);setSending(true);try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,history,conversationId})});const d=await r.json() as {reply?:string;conversationId?:string|null};if(!r.ok)throw new Error("chat failed");if(d.conversationId&&d.conversationId!==conversationId){setConversationId(d.conversationId);window.localStorage.setItem("elyra.conversationId",d.conversationId);}setMessages(v=>[...v,{id:Date.now()+1,role:"assistant",text:d.reply??"I can’t reply right now."}])}catch{setMessages(v=>[...v,{id:Date.now()+1,role:"assistant",text:"Connection issue. Please try again."}])}finally{setSending(false)}}
 return <section className="chatPanel"><div className="chatHeader"><div className="identity"><div className="orb">{config.chatAvatarUrl?<img src={avatarSrc(config.chatAvatarUrl)} alt=""/>:config.chatName.slice(0,1)}</div><div><strong>{config.chatName}</strong><span><i/>{config.statusText}</span></div></div><button className="round" aria-label="Conversation menu">•••</button></div><div className="messages">{messages.map(m=><div key={m.id} className={`message ${m.role}`}><div className="bubble">{m.text}</div></div>)}{sending&&<div className="message assistant"><div className="bubble typing"><b/><b/><b/></div></div>}<div ref={endRef}/></div><form className="composer" onSubmit={submit}><button type="button" className="add" aria-label="Add">+</button><input value={input} onChange={e=>setInput(e.target.value)} placeholder={config.inputPlaceholder}/><button className="send" disabled={!input.trim()||sending} aria-label="Send">↑</button></form></section>
}
