"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { SiteConfig } from "@/lib/site-config";

type Message = { id: number; role: "user" | "assistant"; text: string };

export function ChatPanel({ config }: { config: SiteConfig }) {
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: config.openingMessage }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((current) => [...current, { id: Date.now(), role: "user", text }]);
    setSending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      const data = (await response.json()) as { reply?: string };
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", text: data.reply ?? "暂时无法回复。" }]);
    } catch {
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", text: "连接暂时出现问题，请稍后再试。" }]);
    } finally { setSending(false); }
  }

  return <section className="chatShell" aria-label="聊天">
    <div className="chatTop"><div className="avatar">{config.chatName.slice(0,1).toUpperCase()}</div><div><strong>{config.chatName}</strong><span><i />{config.statusText}</span></div></div>
    <div className="messages">
      {messages.map((message) => <div key={message.id} className={`messageRow ${message.role}`}><div className="bubble">{message.text}</div></div>)}
      {sending && <div className="messageRow assistant"><div className="bubble typing"><b/><b/><b/></div></div>}
      <div ref={endRef}/>
    </div>
    <form className="composer" onSubmit={submit}><input value={input} onChange={(e)=>setInput(e.target.value)} placeholder={config.inputPlaceholder} maxLength={1000}/><button type="submit" disabled={!input.trim() || sending} aria-label="发送">↑</button></form>
  </section>;
}
