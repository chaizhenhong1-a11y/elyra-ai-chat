"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSiteConfig } from "@/components/site-config-provider";
import type { SiteConfig } from "@/lib/site-config";

const fields: Array<{ key: keyof SiteConfig; label: string; hint: string }> = [
  { key: "displayName", label: "网站显示名称", hint: "显示在导航栏和页脚，不影响项目内部名称。" },
  { key: "chatName", label: "聊天对象名称", hint: "显示在聊天窗口顶部。" },
  { key: "heroTitle", label: "首页主标题", hint: "聊天模块上方最大的标题。" },
  { key: "heroSubtitle", label: "首页简介", hint: "主标题下方的说明文字。" },
  { key: "openingMessage", label: "聊天开场白", hint: "访客进入时看到的第一条消息。" },
  { key: "inputPlaceholder", label: "输入框提示", hint: "用户尚未输入消息时显示。" },
  { key: "statusText", label: "状态文字", hint: "例如：在线、在这里、可以聊天。" },
];

export function SiteSettingsForm({ embedded = false }: { embedded?: boolean }) {
  const { config, updateConfig, resetConfig } = useSiteConfig();
  const [draft, setDraft] = useState(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(config), [config]);

  function submit(event: FormEvent) {
    event.preventDefault();
    updateConfig(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  const content = <><header className="adminHeader"><div><span>SITE CONTENT</span><h1>站点内容</h1><p>管理访客实际看到的身份、文案与聊天入口。</p></div><div className="adminStatus">LOCAL PREVIEW</div></header><div className="adminNotice"><strong>开发阶段</strong><span>当前配置只保存在这个浏览器。Firebase 接入后会切换成云端管理员配置。</span></div><form className="settingsForm" onSubmit={submit}>{fields.map((field)=><label className="settingRow" key={field.key}><div><strong>{field.label}</strong><span>{field.hint}</span></div><input value={draft[field.key]} maxLength={160} onChange={(event)=>setDraft((current)=>({...current,[field.key]:event.target.value}))}/></label>)}<div className="adminActions"><button className="secondaryButton" type="button" onClick={()=>{resetConfig();setDraft(config)}}>恢复默认</button><button className="primaryButton" type="submit">{saved?"已保存 ✓":"保存更改"}</button></div></form></>;
  if (embedded) return content;
  return <main className="adminMain">{content}</main>;
}
