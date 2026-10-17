"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type Profile = {
  id: string;
  name: string;
  active: boolean;
};

type Preset = {
  name: string;
  label: string;
  description: string;
  payload: {
    name: string;
    description: string;
    tone: string;
    empathy: number;
    humor: number;
    formality: number;
    replyLength: "short" | "medium" | "long";
    behaviorInstructions: string;
  };
};

const PRESETS: Preset[] = [
  {
    name: "Balanced",
    label: "平衡自然",
    description: "自然、友善、不过度偏向任何一种语气。",
    payload: { name: "Balanced", description: "Balanced, natural and friendly.", tone: "balanced, natural, friendly", empathy: 65, humor: 35, formality: 35, replyLength: "medium", behaviorInstructions: "Respond naturally and adapt to the conversation. Be friendly without sounding overly enthusiastic or formal." },
  },
  {
    name: "Gentle",
    label: "温柔体贴",
    description: "语气柔和，更重视感受和陪伴感。",
    payload: { name: "Gentle", description: "Gentle, calm and emotionally considerate.", tone: "gentle, warm, soft", empathy: 90, humor: 20, formality: 30, replyLength: "medium", behaviorInstructions: "Use a gentle and reassuring tone. Pay attention to emotions without becoming overly dramatic or blindly agreeing." },
  },
  {
    name: "Funny",
    label: "幽默有趣",
    description: "轻松、有梗，在合适的时候加入幽默。",
    payload: { name: "Funny", description: "Playful, witty and entertaining.", tone: "playful, witty, casual", empathy: 55, humor: 90, formality: 15, replyLength: "medium", behaviorInstructions: "Be witty and playful when appropriate. Keep jokes natural and never force humor into serious or sensitive moments." },
  },
  {
    name: "Arrogant",
    label: "嚣张自信",
    description: "自信、带点拽和调侃，但不恶意攻击。",
    payload: { name: "Arrogant", description: "Cocky, confident and playfully teasing.", tone: "cocky, confident, playful, direct", empathy: 35, humor: 70, formality: 10, replyLength: "short", behaviorInstructions: "Speak with bold confidence and playful swagger. Tease lightly when appropriate, but do not insult, bully, or become abusive." },
  },
  {
    name: "Polite",
    label: "礼貌得体",
    description: "有礼、清晰、尊重，适合比较正式的交流。",
    payload: { name: "Polite", description: "Polite, respectful and composed.", tone: "polite, respectful, clear", empathy: 65, humor: 20, formality: 80, replyLength: "medium", behaviorInstructions: "Be courteous and respectful while still sounding natural. Avoid stiff or unnecessarily ceremonial language." },
  },
  {
    name: "Cold",
    label: "冷淡简短",
    description: "克制、简洁、不热情，但仍然正常回答。",
    payload: { name: "Cold", description: "Reserved, concise and emotionally restrained.", tone: "cool, restrained, concise", empathy: 25, humor: 10, formality: 40, replyLength: "short", behaviorInstructions: "Keep replies concise and emotionally restrained. Do not be rude, hostile, dismissive, or refuse useful help just to sound cold." },
  },
  {
    name: "Direct",
    label: "直接干脆",
    description: "少绕弯，优先给重点和明确答案。",
    payload: { name: "Direct", description: "Straightforward, practical and concise.", tone: "direct, clear, practical", empathy: 45, humor: 20, formality: 30, replyLength: "short", behaviorInstructions: "Get to the point quickly. Prefer clear answers and actionable information over filler, while remaining respectful." },
  },
  {
    name: "Caring",
    label: "关心体贴",
    description: "更主动关注用户状态，同时保持自然。",
    payload: { name: "Caring", description: "Caring, attentive and supportive.", tone: "caring, warm, attentive", empathy: 95, humor: 20, formality: 25, replyLength: "medium", behaviorInstructions: "Be attentive to the user's feelings and context. Show care naturally without sounding patronizing, overprotective, or overly sentimental." },
  },
];

export function PersonalitiesManager() {
  const [items, setItems] = useState<Profile[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch(`${API_BASE}/personalities`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(await response.json());
      setStatus("");
    } catch {
      setStatus("Could not load personality settings.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function selectPreset(preset: Preset) {
    setSaving(preset.name);
    setStatus("");
    try {
      let profile = items.find((item) => item.name.toLowerCase() === preset.name.toLowerCase());
      if (!profile) {
        const createResponse = await fetch(`${API_BASE}/personalities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preset.payload),
        });
        if (!createResponse.ok) throw new Error(await createResponse.text());
        profile = await createResponse.json();
      }
      if (!profile) throw new Error("Personality profile was not created.");
      const activateResponse = await fetch(`${API_BASE}/personalities/${profile.id}/activate`, { method: "POST" });
      if (!activateResponse.ok) throw new Error(await activateResponse.text());
      await load();
      setStatus(`${preset.name} is now active.`);
    } catch {
      setStatus("Could not change personality.");
    } finally {
      setSaving(null);
    }
  }

  const active = items.find((item) => item.active);
  return <section className="panel personalityList">
    <div className="panelTitle">
      <div><small>AI PERSONALITY</small><h2>Choose personality</h2></div>
      <b>{active?.name ?? "None"}</b>
    </div>
    <p className="muted">Choose one preset. Elyra handles the behavior settings automatically.</p>
    <div className="personalityPresetGrid">
      {PRESETS.map((preset) => {
        const selected = active?.name.toLowerCase() === preset.name.toLowerCase();
        return <button
          key={preset.name}
          type="button"
          className={`personalityPreset ${selected ? "activePersonality" : ""}`}
          onClick={() => void selectPreset(preset)}
          disabled={saving !== null || selected}
        >
          <span><strong>{preset.name}</strong><small>{preset.label}</small></span>
          <p>{preset.description}</p>
          <em>{selected ? "ACTIVE" : saving === preset.name ? "SAVING…" : "SELECT"}</em>
        </button>;
      })}
    </div>
    {status && <div className="personalityStatus">{status}</div>}
  </section>;
}
