"use client";

import { useCallback, useEffect, useState } from "react";

type ConversationSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

type Message = {
  id: string;
  role: string;
  content: string;
  matchedRuleId: string | null;
  createdAt: string;
};

type ConversationDetail = ConversationSummary & { messages: Message[] };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ConversationsManager() {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/conversations`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Conversations API returned ${response.status}`);
      setItems((await response.json()) as ConversationSummary[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load conversations."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function openConversation(id: string) {
    setDetailLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/conversations/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Conversation API returned ${response.status}`);
      setSelected((await response.json()) as ConversationDetail);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load conversation."); }
    finally { setDetailLoading(false); }
  }

  async function removeConversation(id: string) {
    if (!window.confirm("Delete this conversation and all of its messages? This cannot be undone.")) return;
    setError("");
    try {
      const response = await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Delete API returned ${response.status}`);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete conversation."); }
  }

  const normalized = query.trim().toLowerCase();
  const filtered = normalized ? items.filter((item) => `${item.title ?? ""} ${item.id}`.toLowerCase().includes(normalized)) : items;

  return <div className="conversationsStack">
    {error && <div className="conversationError">{error}</div>}
    <div className="conversationToolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or conversation ID" /><button onClick={() => void load()}>Refresh</button></div>
    <div className="conversationsGrid">
      <section className="panel conversationList">
        <div className="panelTitle"><div><small>CHAT DATA</small><h2>Saved conversations</h2></div><b>{filtered.length}</b></div>
        {loading ? <p className="emptyRules">Loading conversations…</p> : filtered.length === 0 ? <p className="emptyRules">No persisted conversations found.</p> : <div className="conversationRows">{filtered.map((item) => <button className={`conversationItem ${selected?.id === item.id ? "selected" : ""}`} key={item.id} onClick={() => void openConversation(item.id)}><span><strong>{item.title || "Untitled conversation"}</strong><small>{item._count.messages} messages · {formatDate(item.updatedAt)}</small></span><code>{item.id}</code></button>)}</div>}
      </section>
      <section className="panel conversationDetail">
        {!selected ? <div className="conversationEmpty"><strong>{detailLoading ? "Loading…" : "Select a conversation"}</strong><span>Choose a saved conversation to inspect its messages and rule matches.</span></div> : <>
          <div className="panelTitle"><div><small>CONVERSATION</small><h2>{selected.title || "Untitled conversation"}</h2><span className="conversationId">{selected.id}</span></div><button className="dangerAction" onClick={() => void removeConversation(selected.id)}>Delete</button></div>
          <div className="conversationMeta"><span>Created {formatDate(selected.createdAt)}</span><span>Updated {formatDate(selected.updatedAt)}</span><span>{selected.messages.length} messages</span></div>
          <div className="messageStream">{selected.messages.length === 0 ? <p className="emptyRules">This conversation has no messages.</p> : selected.messages.map((message) => <article className={`messageCard ${message.role === "user" ? "userMessage" : "assistantMessage"}`} key={message.id}><div><strong>{message.role}</strong><time>{formatDate(message.createdAt)}</time></div><p>{message.content}</p>{message.matchedRuleId && <small>Matched rule: <code>{message.matchedRuleId}</code></small>}</article>)}</div>
        </>}
      </section>
    </div>
  </div>;
}
