"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AnalyticsData = {
  rangeDays: number;
  counts: { conversations: number; messages: number; userMessages: number; assistantMessages: number; matched: number; unmatched: number; matchRate: number };
  modeHits: { exact: number; contains: number; semantic: number; deleted: number };
  topRules: Array<{ ruleId: string; ruleName: string; matchMode: string; hits: number }>;
  trend: Array<{ date: string; messages: number; userMessages: number; assistantMessages: number }>;
  recentUnmatched: Array<{ id: string; conversationId: string; content: string; createdAt: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AnalyticsOverview({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [days, setDays] = useState<7 | 30>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/analytics?days=${days}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Analytics API returned ${response.status}`);
      setData((await response.json()) as AnalyticsData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load analytics.");
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, [load]);
  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.map((row) => row.messages) ?? [1])), [data]);

  if (loading) return <div className="dashboardState">Loading analytics…</div>;
  if (error || !data) return <div className="dashboardState errorState"><b>Analytics unavailable</b><span>{error || "No data returned."}</span><button onClick={() => void load()}>Retry</button></div>;

  return <div className="analyticsStack">
    <div className="analyticsToolbar"><div><button className={days === 7 ? "active" : ""} onClick={() => setDays(7)}>7 days</button><button className={days === 30 ? "active" : ""} onClick={() => setDays(30)}>30 days</button></div><button onClick={() => void load()}>Refresh</button></div>
    <div className="metricGrid">
      <article className="metricCard"><small>Conversations</small><strong>{data.counts.conversations}</strong><span>{data.counts.messages} saved messages</span></article>
      <article className="metricCard"><small>Rule Match Rate</small><strong>{(data.counts.matchRate * 100).toFixed(1)}%</strong><span>{data.counts.matched} matched · {data.counts.unmatched} unmatched</span></article>
      <article className="metricCard"><small>User Messages</small><strong>{data.counts.userMessages}</strong><span>{data.counts.assistantMessages} assistant replies</span></article>
      <article className="metricCard"><small>Semantic Hits</small><strong>{data.modeHits.semantic}</strong><span>{data.modeHits.exact} exact · {data.modeHits.contains} contains</span></article>
    </div>

    <section className="panel analyticsTrend"><div className="panelTitle"><div><small>ACTIVITY</small><h2>Last {data.rangeDays} days</h2></div></div><div className="trendBars">{data.trend.map((row) => <div className="trendBar" key={row.date} title={`${row.date}: ${row.messages} messages`}><span style={{ height: `${Math.max(4, row.messages / maxTrend * 100)}%` }} /><small>{data.rangeDays === 7 ? row.date.slice(5) : row.date.slice(8)}</small></div>)}</div></section>

    <div className="dashboardGrid">
      <section className="panel dashboardPanel"><div className="panelTitle"><div><small>RULE PERFORMANCE</small><h2>Top reply rules</h2></div><button className="textAction" onClick={() => onNavigate("Reply Rules")}>Manage rules →</button></div>{data.topRules.length === 0 ? <p className="emptyRules">No matched rules in saved conversations yet.</p> : <div className="dashboardRows">{data.topRules.map((rule) => <div className="dashboardRow" key={rule.ruleId}><div><strong>{rule.ruleName}</strong><small>{rule.matchMode.toUpperCase()}</small></div><div className="analyticsHits"><b>{rule.hits}</b><small>hits</small></div></div>)}</div>}</section>
      <section className="panel dashboardPanel"><div className="panelTitle"><div><small>MATCH TYPES</small><h2>Matched reply distribution</h2></div></div><div className="modeRows"><div><span>Exact</span><b>{data.modeHits.exact}</b></div><div><span>Contains</span><b>{data.modeHits.contains}</b></div><div><span>Semantic</span><b>{data.modeHits.semantic}</b></div>{data.modeHits.deleted > 0 && <div><span>Deleted rules</span><b>{data.modeHits.deleted}</b></div>}</div></section>
    </div>

    <section className="panel"><div className="panelTitle"><div><small>COVERAGE GAPS</small><h2>Recent unmatched questions</h2></div><button className="textAction" onClick={() => onNavigate("Reply Rules")}>Add coverage →</button></div>{data.recentUnmatched.length === 0 ? <p className="emptyRules">No unmatched saved questions yet.</p> : <div className="unmatchedRows">{data.recentUnmatched.map((item) => <div key={`${item.id}-${item.createdAt}`}><p>{item.content}</p><span>{formatDate(item.createdAt)} · {item.conversationId}</span></div>)}</div>}</section>
  </div>;
}
