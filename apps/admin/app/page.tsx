"use client";

import { useState } from "react";
import { DashboardOverview } from "@/components/dashboard-overview";
import { ConversationsManager } from "@/components/conversations-manager";
import { ReplyRulesManager } from "@/components/reply-rules-manager";
import { SettingsManager } from "@/components/settings-manager";
import { PersonalitiesManager } from "@/components/personalities-manager";
import { CharacterBuilder } from "@/components/character-builder";
import { VoiceManager } from "@/components/voice-manager";

const nav = ["Dashboard", "Conversations", "AI Character", "Voice", "AI Settings", "Settings"];
const enabledSections = new Set(nav);

const sectionCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  Dashboard: {
    eyebrow: "OVERVIEW",
    title: "Control Center",
    description: "Live operational overview from the Elyra API and PostgreSQL.",
  },
  Conversations: {
    eyebrow: "CONVERSATIONS",
    title: "Conversations",
    description: "Inspect persisted chats, matched rules and messages from the Elyra chat engine.",
  },
  "AI Character": {
    eyebrow: "AI CHARACTER",
    title: "AI Character",
    description: "Manage the 3D AI character shown in Elyra.",
  },
  Voice: {
    eyebrow: "VOICE",
    title: "Voice",
    description: "Manage Stanley’s authorized reference voice and speech output settings.",
  },
  "AI Settings": {
    eyebrow: "AI SETTINGS",
    title: "AI Settings",
    description: "Manage Elyra’s reply rules and AI personality behavior in one place.",
  },
  Settings: {
    eyebrow: "SETTINGS",
    title: "Settings",
    description: "Manage Elyra runtime behavior and inspect core service status.",
  },
};

export default function Admin() {
  const [section, setSection] = useState("Dashboard");
  const copy = sectionCopy[section] ?? sectionCopy.Dashboard;

  return <main className="shell">
    <aside>
      <div className="adminBrand">✦ <span>Elyra</span><b>ADMIN</b></div>
      <nav>{nav.map((name) => <button className={name === section ? "active" : ""} disabled={!enabledSections.has(name)} key={name} onClick={() => enabledSections.has(name) && setSection(name)}>{name}{!enabledSections.has(name) && <small>Soon</small>}</button>)}</nav>
      <div className="account"><div>A</div><span><strong>Administrator</strong><small>Control Center</small></span></div>
    </aside>
    <section className="workspace">
      <header><div><small>CONTROL CENTER / {copy.eyebrow}</small><h1>{copy.title}</h1><p>{copy.description}</p></div><div className="environment">● Development</div></header>
      {section === "Dashboard" && <DashboardOverview onNavigate={setSection} />}
      {section === "Conversations" && <ConversationsManager />}
      {section === "AI Character" && <><div className="notice">This character belongs to the AI. Configure it here in Admin; the public website only displays the saved 3D character.</div><CharacterBuilder /></>}
      {section === "Voice" && <><div className="notice">Voice V1 stores Stanley’s reference voice and output preferences. Voice synthesis remains disabled until the self-hosted engine is connected.</div><VoiceManager /></>}
      {section === "AI Settings" && <><div className="notice">Reply Rules have highest priority. The active personality guides AI-generated replies when no rule matches.</div><ReplyRulesManager /><PersonalitiesManager /></>}
      {section === "Settings" && <><div className="notice">System settings are stored in PostgreSQL. Maintenance mode and message limits are enforced by the chat API.</div><SettingsManager /></>}
    </section>
  </main>;
}
