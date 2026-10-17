"use client";

import { useCallback, useEffect, useState } from "react";

type DashboardData = {
  counts: {
    conversations: number;
    messages: number;
    replyRules: number;
    enabledRules: number;
    disabledRules: number;
    exactRules: number;
    containsRules: number;
    semanticRules: number;
  };
  recentRules: Array<{
    id: string;
    name: string;
    matchMode: string;
    enabled: boolean;
    priority: number;
    updatedAt: string;
  }>;
  recentConversations: Array<{
    id: string;
    title: string | null;
    updatedAt: string;
    _count: { messages: number };
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardOverview({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/dashboard`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
      setData((await response.json()) as DashboardData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="dashboardState">Loading live dashboard data…</div>;
  if (error || !data) {
    return <div className="dashboardState errorState"><b>Dashboard unavailable</b><span>{error || "No data returned."}</span><button onClick={() => void load()}>Retry</button></div>;
  }

  const cards = [
    ["Conversations", data.counts.conversations, `${data.counts.messages} saved messages`],
    ["Reply Rules", data.counts.replyRules, `${data.counts.enabledRules} enabled · ${data.counts.disabledRules} disabled`],
    ["Semantic Rules", data.counts.semanticRules, "AI-assisted rule selection"],
    ["Deterministic Rules", data.counts.exactRules + data.counts.containsRules, `${data.counts.exactRules} exact · ${data.counts.containsRules} contains`],
  ] as const;

  return <div className="dashboardStack">
    <div className="metricGrid">
      {cards.map(([label, value, detail]) => <article className="metricCard" key={label}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>)}
    </div>

    <div className="dashboardGrid">
      <section className="panel dashboardPanel">
        <div className="panelTitle"><div><small>RULE ENGINE</small><h2>Recent rule changes</h2></div><button className="textAction" onClick={() => onNavigate("AI Settings")}>Manage rules →</button></div>
        {data.recentRules.length === 0 ? <p className="emptyRules">No reply rules yet.</p> : <div className="dashboardRows">{data.recentRules.map((rule) => <div className="dashboardRow" key={rule.id}><div><strong>{rule.name}</strong><small>{rule.matchMode.toUpperCase()} · Priority {rule.priority}</small></div><div className="rowMeta"><span className={rule.enabled ? "stateDot on" : "stateDot"}>{rule.enabled ? "Enabled" : "Disabled"}</span><time>{formatDate(rule.updatedAt)}</time></div></div>)}</div>}
      </section>

      <section className="panel dashboardPanel">
        <div className="panelTitle"><div><small>CHAT DATA</small><h2>Recent conversations</h2></div></div>
        {data.recentConversations.length === 0 ? <p className="emptyRules">No persisted conversations yet.</p> : <div className="dashboardRows">{data.recentConversations.map((conversation) => <div className="dashboardRow" key={conversation.id}><div><strong>{conversation.title || "Untitled conversation"}</strong><small>{conversation._count.messages} messages</small></div><time>{formatDate(conversation.updatedAt)}</time></div>)}</div>}
      </section>
    </div>

    <section className="panel quickPanel">
      <div className="panelTitle"><div><small>SHORTCUTS</small><h2>Quick actions</h2></div></div>
      <div className="quickActions"><button onClick={() => onNavigate("AI Settings")}><b>AI Settings</b><span>Manage reply rules and personality behavior.</span></button><button onClick={() => onNavigate("AI Character")}><b>AI Character</b><span>Manage Elyra’s 3D character.</span></button></div>
    </section>
  </div>;
}
