"use client";

import {useCallback,useState} from "react";
import {ThreeCharacterViewport} from "./three-character-viewport";
import {useI18n,uiLanguageName} from "@/lib/i18n";
import {languagePickerGroups} from "@/lib/i18n/language-picker";

type Tool = "language" | "appearance" | "settings" | null;

function flagImageUrl(flag: string) {
  const codePoints = Array.from(flag).map(char => char.codePointAt(0)?.toString(16)).filter(Boolean);
  return codePoints.length ? `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${codePoints.join("-")}.svg` : "";
}


export function DesktopGlobalCharacterTools() {
  const {locale,selection,setLocale,t}=useI18n();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [query, setQuery] = useState("");
  const groups = languagePickerGroups(query,locale);

  function openTool(next: Exclude<Tool, null>) {
    setTool(next);
    setToolsOpen(false);
  }

  return (
    <div className="desktopGlobalTools">
      <div className={`toolFan ${toolsOpen ? "open" : ""}`}>
        <button className="fanItem languageTool" type="button" onClick={() => openTool("language")} aria-label={t.language}>🌐<span>{t.language}</span></button>
        <button className="fanItem appearanceTool" type="button" onClick={() => openTool("appearance")} aria-label={t.appearance}>◇<span>{t.appearance}</span></button>
        <button className="fanItem settingsTool" type="button" onClick={() => openTool("settings")} aria-label={t.settings}>⚙<span>{t.settings}</span></button>
        <button className="toolLauncher" type="button" onClick={() => setToolsOpen(value => !value)} aria-label={t.tools} aria-expanded={toolsOpen}>◎</button>
      </div>

      {tool && <div className="stageModalBackdrop" onMouseDown={() => setTool(null)}>
        <div className="stageModal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
          <button className="modalClose" type="button" onClick={() => setTool(null)} aria-label={t.close}>×</button>
          {tool === "language" && <>
            <h2>{t.language}</h2>
            <input className="languageSearch" value={query} onChange={event => setQuery(event.target.value)} placeholder={t.searchLanguage} aria-label={t.searchLanguage} />
            <button className={`languageRow systemRow ${selection === "system" ? "selected" : ""}`} aria-pressed={selection === "system"} type="button" onClick={() => setLocale("system")}><span className="languageFlag systemFlag">◎</span><span><strong>{t.followSystem}</strong><small>{t.systemBrowser}</small></span><b>{selection === "system" ? "✓" : ""}</b></button>
            <div className="languageList">
              {groups.map(group => <div className="languageAlphaGroup" key={group.letter}>
              {group.letter && <div className="languageAlphaHeading">{group.letter}</div>}
              {group.items.map(item => <button className={`languageRow ${selection === item.code ? "selected" : ""}`} aria-pressed={selection === item.code} type="button" key={item.code} onClick={() => setLocale(item.code)}>
                <span className="languageFlag"><img src={flagImageUrl(item.flag)} alt="" /></span>
                <span><strong>{uiLanguageName(item,locale)}</strong><small>{item.names.en ?? item.code} · {item.code}</small></span><b>{selection === item.code ? "✓" : ""}</b>
              </button>)}</div>)}
            </div>
          </>}
          {tool === "appearance" && <>
            <div className="modalKicker">{t.appearance}</div><h2>{t.appearanceTitle}</h2>
            <p className="modalNote">{t.appearanceNote}</p>
            <div className="foundationParts">
              <span>{t.headMesh}</span><span>{t.torsoMesh}</span><span>{t.armMeshes}</span><span>{t.legMeshes}</span>
            </div>
          </>}
          {tool === "settings" && <><div className="modalKicker">{t.settings}</div><h2>{t.settings}</h2><p className="modalNote">{t.settingsNote}</p></>}
        </div>
      </div>}
    </div>
  );
}

export function CharacterStage({
  name,
  skinTone,
  modelKey,
  outfit="default",
  conversationStarted=false,
  inspectionMode=false,
  compactConversation=false,
  onStartConversation,
}: {
  name:string;
  skinTone?:string;
  modelKey?:"elyra-stanley"|"male-01";
  outfit?:"default"|"outfit-01";
  conversationStarted?:boolean;
  inspectionMode?:boolean;
  compactConversation?:boolean;
  onStartConversation?:()=>void;
}) {
  const {t}=useI18n();
  const mobileChatStarted=conversationStarted;
  const mobileCharacterExpanded=true;
  const [characterReady,setCharacterReady]=useState(false);
  const handleCharacterReady=useCallback(()=>setCharacterReady(true),[]);

  return (
    <section className={`characterStage ${mobileChatStarted ? "mobileChatStarted companionCharacterStage" : "mobileCharacterFirst"} ${compactConversation ? "companionCompact" : ""}`} aria-label={t.characterStage}>
      <div className="stageGlow" />
      <div className="mobileCharacterIntro">
        <small>{t.yourCompanion}</small>
        <strong>{name}</strong>
      </div>
      <div className="real3dStage">
        <ThreeCharacterViewport skinTone={skinTone} modelKey={modelKey} outfit={outfit} chatMode={mobileChatStarted} inspectionMode={inspectionMode} compactChatMode={compactConversation} onReady={handleCharacterReady} />
        <div className="real3dHint"><strong>{t.character3d}</strong><span>{t.rotateZoom}</span></div>
      </div>

      <div className="mobileCharacterActions">
        {!mobileChatStarted && characterReady ? (
          <button type="button" className="mobileStartChat" onClick={onStartConversation}>{t.startChat}</button>
        ) : null}
      </div>

    </section>
  );
}
