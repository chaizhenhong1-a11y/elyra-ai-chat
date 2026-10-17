"use client";

// @refresh reset

import {FormEvent,useEffect,useRef,useState} from "react";
import type {SiteConfig} from "@/lib/site-config";
import {CharacterStage,DesktopGlobalCharacterTools} from "./character-stage";
import {ELYRA_LANGUAGE_CATALOG} from "@/lib/language-catalog.generated";
import {useI18n,uiLanguageName} from "@/lib/i18n";
import {languagePickerGroups} from "@/lib/i18n/language-picker";
import {ConversationHistory,type HistoryMessage} from "./conversation-history";
import {speechChunks} from "@/lib/speech-chunks";

type Message=HistoryMessage;
type VoicePublicConfig={enabled:boolean;autoSpeak:boolean;supportedLanguages:string[];provider?:string};
const READ_ALOUD_KEY="elyra.voice.readAloud";
function voiceApi(){if(typeof window==="undefined")return "http://localhost:4000/api/v1";return process.env.NEXT_PUBLIC_API_BASE_URL??`${window.location.protocol}//${window.location.hostname}:4000/api/v1`;}

export function CharacterConversation({
  config,
  skinTone,
  modelKey,
}:{config:SiteConfig;skinTone?:string;modelKey?:"elyra-stanley"|"male-01"}) {
  const {t,locale,selection,setLocale}=useI18n();
  const [started,setStarted]=useState(false);
  const [welcomeAt,setWelcomeAt]=useState<number|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState("");
  const [sending,setSending]=useState(false);
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [panel,setPanel]=useState<"history"|"language"|"outfit"|"voice"|null>(null);
  const [languageQuery,setLanguageQuery]=useState("");
  const [outfit,setOutfit]=useState<"default"|"outfit-01">("default");
  const [voiceConfig,setVoiceConfig]=useState<VoicePublicConfig>({enabled:false,autoSpeak:true,supportedLanguages:[]});
  const [readAloud,setReadAloud]=useState(false);
  const [speechBlocked,setSpeechBlocked]=useState(false);
  const [speechFailed,setSpeechFailed]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const playbackRef=useRef<HTMLAudioElement|null>(null);
  const messageCountRef=useRef(0);
  const languageStartRef=useRef(0);
  useEffect(()=>{messageCountRef.current=messages.length},[messages]);
  useEffect(()=>{languageStartRef.current=messageCountRef.current},[locale]);

  function startConversation(){
    setWelcomeAt(Date.now());
    setStarted(true);
  }

  useEffect(()=>{
    const saved=window.localStorage.getItem("elyra.conversationId");
    if(saved)setConversationId(saved);
  },[]);

  useEffect(()=>{
    const saved=window.localStorage.getItem(READ_ALOUD_KEY);
    setReadAloud(saved==="true");
    fetch(`${voiceApi()}/voice`,{cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject())
      .then((v:Partial<VoicePublicConfig>&{effectiveSupportedLanguages?:string[]})=>{
        setVoiceConfig({enabled:v.enabled===true,autoSpeak:v.autoSpeak!==false,provider:v.provider,supportedLanguages:v.effectiveSupportedLanguages??(Array.isArray(v.supportedLanguages)?v.supportedLanguages:[])});
        // Respect an explicit user choice; otherwise inherit the active Admin preset.
        if(window.localStorage.getItem(READ_ALOUD_KEY)===null)setReadAloud(v.enabled===true&&v.autoSpeak!==false);
      })
      .catch(()=>setVoiceConfig({enabled:false,autoSpeak:true,supportedLanguages:[]}));
  },[]);

  function toggleReadAloud(){
    const next=!readAloud; setReadAloud(next); window.localStorage.setItem(READ_ALOUD_KEY,String(next));
  }

  useEffect(()=>{
    if(modelKey!=="elyra-stanley"){setOutfit("default");return}
    setOutfit(window.localStorage.getItem("elyra.outfit.elyra-stanley")==="outfit-01"?"outfit-01":"default");
  },[modelKey]);

  function selectOutfit(next:"default"|"outfit-01"){
    setOutfit(next);
    if(modelKey==="elyra-stanley")window.localStorage.setItem("elyra.outfit.elyra-stanley",next);
  }


  // The welcome is UI copy, derived on every render so language switches update it.
  // Actual conversation messages remain unchanged and are sent to the API as before.
  const latestAssistant=[...messages].reverse().find(m=>m.role==="assistant")?.text ?? t.openingMessage;
  const latestUser=[...messages].reverse().find(m=>m.role==="user")?.text ?? "";
  const spokenReply=[...messages].reverse().find(m=>m.role==="assistant");
  const speechText=spokenReply?.text??(started?t.openingMessage:"");
  useEffect(()=>{
    setSpeechFailed(false);setSpeechBlocked(false);
    if(!readAloud||sending||!speechText)return;
    const abort=new AbortController();
    let cancelled=false;
    const audio=playbackRef.current;
    const queue:string[]=[];
    let playing=false;
    function pump(){
      if(cancelled||playing||!audio||!queue.length)return;
      playing=true;audio.src=queue.shift()!;
      void audio.play().catch(()=>{if(!cancelled)setSpeechBlocked(true);});
    }
    if(audio)audio.onended=()=>{playing=false;pump();};
    // Kokoro CPU synthesis is slower than playback. Buffer a complete reply;
    // Piper can continue generating the next sentence during playback.
    const buffered=voiceConfig.provider==="kokoro";
    void(async()=>{
      const chunks=buffered&&speechText.length<=3000?[speechText]:speechChunks(speechText);
      for(const text of chunks){
        if(cancelled)break;
        const response=await fetch(`${voiceApi()}/voice/synthesize`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,replyText:speechText}),signal:abort.signal});
        if(!response.ok)throw new Error("Speech request failed");
        const result=await response.json() as {audioUrl?:string|null};
        if(cancelled)break;
        if(!result.audioUrl)break;
        queue.push(`${voiceApi().replace(/\/api\/v1$/,"")}${result.audioUrl}`);
        if(!buffered)pump();
      }
      if(buffered)pump();
    })().catch(()=>{if(!cancelled)setSpeechFailed(true);});
    return()=>{cancelled=true;abort.abort();if(audio){audio.pause();audio.onended=null;audio.removeAttribute("src");}queue.length=0;};
  },[speechText,readAloud,sending,voiceConfig.provider]);
  const groupedLanguages=languagePickerGroups(languageQuery,locale);

  const supportedVoiceLanguages=voiceConfig.supportedLanguages.map(code=>{
    const item=ELYRA_LANGUAGE_CATALOG.find(x=>x.code.toLowerCase()===code.toLowerCase() || (code==="zh"&&x.code.toLowerCase().startsWith("zh")));
    return item?uiLanguageName(item,locale):code;
  });

  async function submit(e:FormEvent){
    e.preventDefault();
    const text=input.trim();
    if(!text||sending)return;
    const history=messages.slice(-20).map(m=>({role:m.role,content:m.text}));
    setInput("");
    setMessages(v=>[...v,{id:Date.now(),role:"user",text,createdAt:Date.now()}]);
    setSending(true);
    try{
      const r=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:text,history,conversationId,languageContext:{
          locale,
          history:messages.slice(languageStartRef.current).filter(m=>m.role==="user").slice(-20).map(m=>({role:m.role,content:m.text})),
        }}),
      });
      const d=await r.json() as {reply?:string;conversationId?:string|null};
      if(!r.ok)throw new Error("chat failed");
      if(d.conversationId&&d.conversationId!==conversationId){
        setConversationId(d.conversationId);
        window.localStorage.setItem("elyra.conversationId",d.conversationId);
      }
      setMessages(v=>[...v,{id:Date.now()+1,role:"assistant",text:d.reply??"I can’t reply right now.",createdAt:Date.now()}]);
    }catch{
      setMessages(v=>[...v,{id:Date.now()+1,role:"assistant",text:"Connection issue. Please try again.",createdAt:Date.now()}]);
    }finally{
      setSending(false);
    }
  }

  return <div className={`characterConversation ${started?"conversationStarted":"conversationPreview"} ${panel?"detailPanelOpen":""}`}>
    <>
      <button
        type="button"
        className="companionMenuButton"
        aria-label={t.menu}
        aria-expanded={menuOpen}
        onClick={()=>setMenuOpen(v=>!v)}
      >•••</button>

      {menuOpen && <>
        <button className="companionMenuBackdrop" aria-label={t.close} onClick={()=>setMenuOpen(false)}/>
        <div className="companionMenu" role="menu">
          <button type="button" onClick={()=>{setPanel("outfit");setMenuOpen(false)}}><span>◇</span><b>{t.characterOutfit}</b><small>{t.wardrobe}</small></button>
          {started && <button type="button" onClick={()=>{setPanel("history");setMenuOpen(false)}}><span>◉</span><b>{t.fullHistory}</b></button>}
          <button type="button" onClick={()=>{setPanel("language");setMenuOpen(false)}}><span>◎</span><b>{t.language}</b></button>
          <button type="button" onClick={()=>{setPanel("voice");setMenuOpen(false)}}><span>🔊</span><b>{t.stanleyVoice}</b><small>{readAloud?t.on:t.off}</small></button>
          <button type="button" disabled><span>◇</span><b>{t.feature3}</b><small>{t.comingSoon}</small></button>
          <button type="button" disabled><span>◇</span><b>{t.feature4}</b><small>{t.comingSoon}</small></button>
          <button type="button" disabled><span>◇</span><b>{t.feature5}</b><small>{t.comingSoon}</small></button>
        </div>
      </>}

      {panel && <div className="companionPanelBackdrop" onMouseDown={()=>setPanel(null)}>
        <section className={`companionPanel ${panel==="language"?"companionLanguagePanel":""}`} onMouseDown={e=>e.stopPropagation()}>
          <header>
            <div>{panel!=="language"&&<small>{panel==="outfit"?t.characterLabel:panel==="voice"?t.voice:t.conversation}</small>}<h2>{panel==="history"?t.fullHistory:panel==="language"?t.language:panel==="voice"?t.stanleyVoice:t.characterOutfit}</h2></div>
            <button type="button" onClick={()=>setPanel(null)} aria-label={t.close}>×</button>
          </header>
          {panel==="history" ? (
            <ConversationHistory messages={messages} name={config.chatName} welcomeAt={welcomeAt} sending={sending}/>
          ) : panel==="language" ? (
            <div className="companionLanguage">
              <input className="languageSearch" value={languageQuery} onChange={e=>setLanguageQuery(e.target.value)} placeholder={t.searchLanguage} aria-label={t.searchLanguage}/>
              <button type="button" className={`languageRow systemRow ${selection==="system"?"selected":""}`} aria-pressed={selection==="system"} onClick={()=>setLocale("system")}><span className="languageFlag systemFlag">◎</span><span><strong>{t.followSystem}</strong><small>{t.systemBrowser}</small></span><b>{selection==="system"?"✓":""}</b></button>
              <div className="languageList">
              {groupedLanguages.map(group=><div className="languageAlphaGroup" key={group.letter}>
                {group.letter&&<div className="languageAlphaHeading">{group.letter}</div>}
                {group.items.map(item=><button type="button" key={item.code} className={`languageRow ${selection===item.code?"selected":""}`} aria-pressed={selection===item.code} onClick={()=>setLocale(item.code)}>
                  <span className="languageFlag"><img src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${Array.from(item.flag).map(char=>char.codePointAt(0)!.toString(16)).join("-")}.svg`} alt=""/></span>
                  <span><strong>{uiLanguageName(item,locale)}</strong><small>{item.names.en ?? item.code} · {item.code}</small></span>
                  <b>{selection===item.code?"✓":""}</b>
                </button>)}
              </div>)}
              </div>
            </div>
          ) : panel==="voice" ? (
            <div className="companionVoicePanel">
              <button type="button" className={`companionVoiceToggle ${readAloud?"enabled":""}`} onClick={toggleReadAloud} aria-pressed={readAloud}>
                <span><b>{t.readAloud}</b><small>{t.readAloudHint}</small></span>
                <i><em/>{readAloud?t.on:t.off}</i>
              </button>
              <div className="companionVoiceLanguageSection">
                <small>{t.speakingLanguages}</small>
                <div className="companionVoiceLanguageList">
                  {supportedVoiceLanguages.length?supportedVoiceLanguages.map((name,index)=><div key={`${name}-${index}`}>{name}</div>):<div>{t.voiceUnavailable}</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="companionOutfit">
              <div className="companionOutfitIntro">
                <small>{t.characterWardrobe}</small>
                <h3>{t.chooseOutfit}</h3>
                <p>{t.wholeOutfitHint}</p>
              </div>
              <div className="companionOutfitCurrent">
                <small>{t.currentOutfit}</small>
                <b>{outfit==="outfit-01"?t.outfit1:t.defaultOutfit}</b>
              </div>
              <div className="companionOutfitPresets">
                <button type="button" className={outfit==="default"?"selected":""} onClick={()=>selectOutfit("default")}><b>{t.defaultOutfit}</b>{outfit==="default"&&<span>✓</span>}</button>
                {modelKey==="elyra-stanley"&&<button type="button" className={outfit==="outfit-01"?"selected":""} onClick={()=>selectOutfit("outfit-01")}><b>{t.outfit1}</b>{outfit==="outfit-01"&&<span>✓</span>}</button>}
              </div>
            </div>
          )}
        </section>
      </div>}
    </>

    {!started && <aside className="desktopCompanionHub" aria-label={t.characterControls}>
      <section className="desktopHubCard desktopWardrobeCard">
        <div className="desktopHubHeading"><small>{t.characterLabel}</small><h2>{t.characterOutfit}</h2></div>
        <div className="desktopOutfitGrid">
          <button type="button" className={outfit==="default"?"selected":""} onClick={()=>selectOutfit("default")}><span>01</span><b>{t.defaultOutfit}</b></button>
          {modelKey==="elyra-stanley"&&<button type="button" className={outfit==="outfit-01"?"selected":""} onClick={()=>selectOutfit("outfit-01")}><span>02</span><b>{t.outfit1}</b></button>}
        </div>
      </section>
      <div className="desktopModuleGrid">
        <section className="desktopHubCard desktopPlaceholder"><small>{t.comingSoon}</small><b>{t.characterActions}</b><span>{t.actionModule}</span></section>
        <section className="desktopHubCard desktopPlaceholder"><small>{t.comingSoon}</small><b>{t.companionSpace}</b><span>{t.moreFeatures}</span></section>
      </div>
      <button type="button" className="desktopStartChat" onClick={startConversation}>{t.startChat}</button>
    </aside>}

    {!started && <DesktopGlobalCharacterTools />}

    <CharacterStage
      name={config.chatName}
      skinTone={skinTone}
      modelKey={modelKey}
      outfit={outfit}
      conversationStarted={started}
      inspectionMode={panel!==null}
      compactConversation={false}
      onStartConversation={startConversation}
    />

    {started && <div className="companionOverlay" aria-label={t.conversation}>
      {(sending || latestAssistant) && <div className={`companionSpeech ${sending?"thinking":""}`} aria-live="polite">
        {sending ? <><span>{t.thinking.replace("…","")}</span><b/><b/><b/></> : latestAssistant}
        <audio ref={playbackRef} hidden preload="auto" onError={()=>setSpeechFailed(true)}/>
        {speechBlocked&&<button type="button" onClick={()=>{void playbackRef.current?.play().then(()=>setSpeechBlocked(false)).catch(()=>setSpeechFailed(true));}} aria-label={t.readAloud}>▶ {t.readAloud}</button>}
        {speechFailed&&<small role="status">{t.voiceUnavailable}</small>}
      </div>}

      {latestUser && <div className="companionUserEcho">{latestUser}</div>}

      <form className="companionComposer" onSubmit={submit}>
        <button type="button" className="companionAdd" aria-label={t.add}>+</button>
        <input
          ref={inputRef}
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder={config.inputPlaceholder === "Message…" ? t.messagePlaceholder : config.inputPlaceholder}
          aria-label={config.inputPlaceholder === "Message…" ? t.messagePlaceholder : config.inputPlaceholder}
          type="text"
          inputMode="text"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="button" className="companionMic" aria-label={t.voice}>◉</button>
        <button className="companionSend" disabled={!input.trim()||sending} aria-label={t.send}>↑</button>
      </form>
    </div>}
  </div>;
}
