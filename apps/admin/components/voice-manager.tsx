"use client";
import {useEffect,useState} from "react";
import {ELYRA_LANGUAGE_CATALOG} from "@/lib/language-catalog.generated";
import {VoicePresetPreview} from "./voice-preset-preview";

type Reference={language:string;audioUrl:string;originalName:string;verified:boolean};
type Voice={enabled:boolean;provider:string;profileName:string;referenceAudioUrl:string|null;language:string;supportedLanguages:string[];speed:number;autoSpeak:boolean;references:Reference[]};
const initial:Voice={enabled:false,provider:"openvoice",profileName:"Stanley Original",referenceAudioUrl:null,language:"auto",supportedLanguages:["en","zh","ms"],speed:1,autoSpeak:true,references:[]};
const catalog=[...ELYRA_LANGUAGE_CATALOG].sort((a,b)=>(a.names.en??a.code).localeCompare(b.names.en??b.code,"en"));
const codeFor=(code:string)=>code==="zh-CN"?"zh":code;
function languageName(code:string){const entry=catalog.find(item=>codeFor(item.code)===code);return entry?.names.zh??entry?.names.en??code;}
function api(){if(typeof window==="undefined")return "http://localhost:4000/api/v1";return process.env.NEXT_PUBLIC_API_BASE_URL??`${window.location.protocol}//${window.location.hostname}:4000/api/v1`;}
function audioUrl(value:string){return `${api().replace(/\/api\/v1$/,"")}${value}`;}

export function VoiceManager(){
 const [v,setV]=useState(initial);
 const [busy,setBusy]=useState<string|null>(null);
 const [msg,setMsg]=useState("");
 const [extraLanguages,setExtraLanguages]=useState<string[]>([]);
 const [addLanguage,setAddLanguage]=useState("");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{fetch(`${api()}/voice`,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(x=>{setV({...initial,...x,references:x.references??[]});setLoaded(true);}).catch(()=>setMsg("无法连接 Voice API，请确认后端已启动。"));},[]);

 function mergeServer(server:Voice){
  // An upload must not discard unsaved speed, switches or profile-name edits.
  setV(current=>({...current,referenceAudioUrl:server.referenceAudioUrl,references:server.references??[]}));
 }
 async function save(){
  setBusy("settings");setMsg("");
  try{const r=await fetch(`${api()}/voice`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)});if(!r.ok)throw Error();setV({...initial,...await r.json()});setMsg("语音设置已保存。");}
  catch{setMsg("保存失败，请稍后重试。");}finally{setBusy(null);}
 }
 async function upload(language:string,file?:File){
  if(!file)return;
  if(file.size>15*1024*1024){setMsg("音频不能超过 15 MB。");return;}
  setBusy(language);setMsg(`正在上传${language==="auto"?"通用":languageName(language)}样本…`);
  try{const form=new FormData();form.append("language",language);form.append("audio",file);const r=await fetch(`${api()}/voice/reference`,{method:"POST",body:form});if(!r.ok)throw Error();mergeServer(await r.json());setMsg("样本已保存。其他语言的样本保持不变，请试听后确认质量。");}
  catch{setMsg("上传失败，请使用 15 MB 以内的 WAV、MP3、M4A、WEBM 或 OGG 音频。");}finally{setBusy(null);}
 }
 async function selectPreset(remove:boolean,provider="piper"){
  setBusy("preset");setMsg("");
  try{
   const next={...v,provider:remove?"openvoice":provider,enabled:!remove,autoSpeak:remove?v.autoSpeak:true,profileName:remove?"Stanley Original":provider==="kokoro"?"Kokoro 58 · zm_009":"超文 · Chaowen"};
   const response=await fetch(`${api()}/voice`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)});
   if(!response.ok)throw Error();
   setV({...initial,...await response.json()});
   setMsg(remove?"已停用当前预设朗读。":"已启用所选声音，中文 AI 回复会使用这个声音。");
  }catch{setMsg("无法更新预设声音，请重试。");}finally{setBusy(null);}
 }
 async function verify(reference:Reference){
  setBusy(reference.language);setMsg("");
  try{const r=await fetch(`${api()}/voice/reference/${encodeURIComponent(reference.language)}/verification`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({verified:!reference.verified})});if(!r.ok)throw Error();mergeServer(await r.json());setMsg(reference.verified?"已取消样本确认。":"已记录你的样本试听确认。语音合成仍需引擎接入后测试。");}
  catch{setMsg("无法保存试听确认，请重试。");}finally{setBusy(null);}
 }
 const languages=[...new Set(["en","zh","ms","vi",...v.supportedLanguages,...v.references.map(item=>item.language),...extraLanguages])];
 const sampleCount=v.references.length;
 const available=catalog.filter(item=>!languages.includes(codeFor(item.code)));
 const uploadControl=(language:string,hasSample:boolean)=><label className={`voiceSampleUpload ${busy?"isBusy":""}`}>
  <input type="file" disabled={!!busy||!loaded} accept="audio/wav,audio/mpeg,audio/mp4,audio/webm,audio/ogg,.m4a" aria-label={`${hasSample?"替换":"上传"}${language==="auto"?"通用":languageName(language)}样本`} onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value="";void upload(language,file);}}/>
  <span aria-hidden="true">{hasSample?"↻":"＋"}</span>{busy===language?"上传中…":hasSample?"替换样本":"上传样本"}
 </label>;
 return <div className="voiceGrid voiceManagerV2">
  <section className="panel voicePanel voiceLibrary">
   <div className="panelTitle"><div><small>STANLEY VOICE</small><h2>多语言声音样本</h2></div><span className="voiceLibraryCount">{sampleCount} 个语言样本</span></div>
   <p className="voiceLead">同一个 Stanley 声音档案，每种语言分别上传和试听。替换某个语言的样本，不会覆盖其他语言。</p>
   <div className="voiceGeneralSample"><div><b>上传新的中文声音样本</b><p>无需先移除超文。上传后可在下方中文卡片试听；不会自动启用声音克隆。</p></div>{uploadControl("zh",v.references.some(reference=>reference.language==="zh"))}</div>
   {msg&&<p className="voiceStatus" role="status">{msg}</p>}
   <div className="voiceLibraryToolbar"><select aria-label="添加样本语言" value={addLanguage} onChange={event=>setAddLanguage(event.target.value)}><option value="">添加其他语言…</option>{available.map(item=><option key={item.code} value={codeFor(item.code)}>{item.names.zh??item.names.en} · {item.code}</option>)}</select><button type="button" disabled={!addLanguage||!!busy} onClick={()=>{setExtraLanguages(current=>[...current,addLanguage]);setAddLanguage("");}}>＋ 添加</button></div>
   <div className="voiceSampleList">
    {languages.map(language=>{
     const reference=v.references.find(item=>item.language===language);
     return <article className="voiceSampleCard" key={language}>
      <div className="voiceSampleHeading"><div className="voiceLanguageMark">{language.toUpperCase()}</div><div><h3>{languageName(language)}</h3><p>{reference?"该语言的默认声音样本":"尚未上传该语言的样本"}</p></div><span className={`voiceSampleBadge ${reference?"ready":""}`}>{reference?"已上传":"待上传"}</span></div>
      <div className="voiceSampleStatus"><span className={reference?"complete":""}>● 样本{reference?"已上传":"未上传"}</span><span>○ 克隆引擎待接入</span><span className={reference?.verified?"complete":""}>{reference?.verified?"● 样本已确认":"○ 样本待确认"}</span></div>
      {reference&&<><div className="voiceSampleFilename" title={reference.originalName}>{reference.originalName}</div><audio controls preload="none" src={audioUrl(reference.audioUrl)} aria-label={`${languageName(language)}声音样本试听`}/></>}
      <div className="voiceSampleActions">{uploadControl(language,!!reference)}{reference&&<button type="button" disabled={!!busy} className="voiceVerifyButton" onClick={()=>void verify(reference)}>{reference.verified?"取消确认":"试听后确认样本"}</button>}</div>
      <label className="voiceLanguageEnable"><input type="checkbox" checked={v.supportedLanguages.includes(language)} onChange={event=>setV(current=>({...current,supportedLanguages:event.target.checked?[...current.supportedLanguages,language]:current.supportedLanguages.filter(code=>code!==language)}))}/><span>加入期望朗读语言<small>仅保存偏好，尚不代表引擎支持</small></span></label>
     </article>;
    })}
   </div>
   <div className="voiceGeneralSample"><div><b>通用参考样本</b><p>保留原来的上传记录。将来仅在引擎支持跨语言生成时作为备用。</p></div>{v.referenceAudioUrl&&<audio controls preload="none" src={audioUrl(v.referenceAudioUrl)} aria-label="通用声音样本试听"/>}{uploadControl("auto",!!v.referenceAudioUrl)}</div>
   <VoicePresetPreview speed={v.speed} selected={v.provider==="piper"&&v.enabled} locked={!!busy||!loaded} onSelect={()=>void selectPreset(false)} onRemove={()=>void selectPreset(true)}/>
   <VoicePresetPreview presetId="kokoro-zh-zm009" title="Kokoro 58 · zm_009" speed={v.speed} selected={v.provider==="kokoro"&&v.enabled} locked={!!busy||!loaded} onSelect={()=>void selectPreset(false,"kokoro")} onRemove={()=>void selectPreset(true,"kokoro")}/>
   <div className="voiceConsent"><b>声音授权</b><p>请上传你本人或已获得明确授权的声音。WAV / MP3 / M4A / WEBM / OGG，每份最大 15 MB。</p></div>
  </section>
  <aside className="panel voicePanel voiceOutputSettings">
   <div className="panelTitle"><div><small>VOICE PROFILE</small><h2>声音档案与朗读</h2></div></div>
   <label className="voiceField"><span>档案名称</span><input value={v.profileName} onChange={event=>setV({...v,profileName:event.target.value})}/></label>
   <div className="voiceEngineState"><span className="voiceEngineDot"/><div><b>自定义声音引擎尚未接入</b><p>预设超文声音可单独试听；上传录音的克隆合成仍需接入引擎。</p></div></div>
   <div className="voiceRoutingNote"><b>之后如何分配样本？</b><ol><li>识别 AI 回复的实际语言</li><li>优先使用该语言的默认样本</li><li>无对应样本时，检查引擎是否支持通用样本</li><li>不支持则只显示文字，不播放错误语言</li></ol></div>
   <label className="voiceField"><span>语速 <b>{v.speed.toFixed(2)}×</b></span><input type="range" min="0.7" max="1.3" step="0.05" value={v.speed} onChange={event=>setV({...v,speed:Number(event.target.value)})}/></label>
   <label className="voiceSwitch"><span><b>启用 Stanley Voice</b><small>保存开关，接入引擎后才会生成语音</small></span><input type="checkbox" checked={v.enabled} onChange={event=>setV({...v,enabled:event.target.checked})}/></label>
   <label className="voiceSwitch"><span><b>允许用户使用朗读</b><small>用户可在聊天页自行开启或关闭</small></span><input type="checkbox" checked={v.autoSpeak} onChange={event=>setV({...v,autoSpeak:event.target.checked})}/></label>
   <button type="button" className="primaryButton voiceSave" disabled={!!busy||!loaded} onClick={()=>void save()}>{busy==="settings"?"保存中…":"保存朗读设置"}</button>
   <p className="voiceSaveHint">音频上传和样本确认自动保存；语言偏好、名称及开关需点击保存。</p>
  </aside>
 </div>;
}

