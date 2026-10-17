"use client";

import {useState} from "react";
import {useI18n,uiLanguageName} from "@/lib/i18n";
import {languagePickerGroups} from "@/lib/i18n/language-picker";

function flagCountryCode(flag: string) {
  const points = Array.from(flag).map(char => char.codePointAt(0) ?? 0);
  if (points.length !== 2 || points.some(point => point < 0x1f1e6 || point > 0x1f1ff)) return null;
  return String.fromCharCode(...points.map(point => point - 0x1f1e6 + 97));
}

export function WebToolLauncher() {
  const {locale,selection,setLocale,t}=useI18n();
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = languagePickerGroups(query,locale);

  return <>
    <div className={`toolLauncher${open ? " open" : ""}`}>
      <button className="toolAction languageAction" type="button" onClick={() => {setLanguageOpen(true); setOpen(false);}} aria-label={t.language}><span>🌐</span><b>{t.language}</b></button>
      <button className="toolAction appearanceAction" type="button" aria-label={t.appearance}><span>✦</span><b>{t.appearance}</b></button>
      <button className="toolAction settingsAction" type="button" aria-label={t.settings}><span>⚙</span><b>{t.settings}</b></button>
      <button className="toolTrigger" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={t.tools}>◉</button>
    </div>

    {languageOpen && <div className="languageBackdrop" role="presentation" onMouseDown={() => setLanguageOpen(false)}>
      <section className="languageModal" role="dialog" aria-modal="true" aria-label={t.language} onMouseDown={event => event.stopPropagation()}>
        <header><div><h2>{t.language}</h2></div><button type="button" onClick={() => setLanguageOpen(false)} aria-label={t.close}>×</button></header>
        <input className="languageSearch" value={query} onChange={event => setQuery(event.target.value)} placeholder={t.searchLanguage} aria-label={t.searchLanguage} autoFocus />
        <button className={`languageRow systemLanguage${selection === "system" ? " selected" : ""}`} aria-pressed={selection === "system"} type="button" onClick={() => setLocale("system")}><span className="systemFlag">◎</span><span><strong>{t.followSystem}</strong><small>{t.systemBrowser}</small></span><i>{selection === "system" ? "✓" : ""}</i></button>
        <div className="languageList">
          {groups.map(group=><div className="languageAlphaGroup" key={group.letter}>
          {group.letter&&<div className="languageAlphaHeading">{group.letter}</div>}
          {group.items.map(entry => {
            const country = flagCountryCode(entry.flag);
            return <button className={`languageRow${selection === entry.code ? " selected" : ""}`} aria-pressed={selection === entry.code} type="button" key={entry.code} onClick={() => setLocale(entry.code)}>
              <span className="flagBox">{country ? <img src={`https://flagcdn.com/w40/${country}.png`} alt="" /> : entry.flag}</span>
              <span><strong>{uiLanguageName(entry,locale)}</strong><small>{entry.names.en ?? entry.code} · {entry.code}</small></span><i>{selection === entry.code ? "✓" : ""}</i>
            </button>;
          })}</div>)}
        </div>
      </section>
    </div>}
  </>;
}
