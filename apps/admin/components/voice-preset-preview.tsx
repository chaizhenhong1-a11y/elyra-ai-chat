"use client";
import {useEffect,useState} from "react";
type Preset={id:string;name:string;language:string;quality:string;ready:boolean};
function api(){return process.env.NEXT_PUBLIC_API_BASE_URL??`${window.location.protocol}//${window.location.hostname}:4000/api/v1`;}
export function VoicePresetPreview({speed,selected,onSelect,onRemove,locked,presetId="zh_CN-chaowen-medium",title="超文 · Chaowen"}:{presetId?:string;title?:string;speed:number;selected:boolean;onSelect:()=>void;onRemove:()=>void;locked:boolean}){
 const [preset,setPreset]=useState<Preset|null>(null);
 const [text,setText]=useState("你好，我是斯坦利。今天过得怎么样？有什么想聊的，我在这里听你说。");
 const [audio,setAudio]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{fetch(`${api()}/voice/presets`,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json();}).then((items:Preset[])=>setPreset(items.find(item=>item.id===presetId)??null)).catch(()=>setError("预设声音服务暂不可用。"));},[presetId]);
 async function preview(){
  if(!preset)return;
  setBusy(true);setError("");setAudio("");
  try{const response=await fetch(`${api()}/voice/preview`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({preset:preset.id,text,speed})});const result=await response.json();if(!response.ok)throw new Error(typeof result.message==="string"?result.message:"试听生成失败。");setAudio(`${api().replace(/\/api\/v1$/,"")}${result.audioUrl}`);}
  catch(err){setError(err instanceof Error?err.message:"试听生成失败。");}finally{setBusy(false);}
 }
 return <section className="voicePresetPreview">
  <div className="voiceSampleHeading"><div className="voiceLanguageMark">{presetId==="kokoro-zh-zm009"?"中英":"中文"}</div><div><h3>{title}</h3><p>预设男声 · {presetId==="kokoro-zh-zm009"?"中文 / English · Speaker 58":"普通话"}</p></div><span className={`voiceSampleBadge ${preset?.ready?"ready":""}`}>{selected?"正在使用":preset?.ready?"可试听":"准备中"}</span></div>
  <p className="voicePresetIntro">无需上传录音。启用后，App 的自动朗读会使用这个声音朗读{presetId==="kokoro-zh-zm009"?"中文和英文":"中文"} AI 回复。</p>
  <div className="voiceSampleActions">{selected?<button type="button" disabled={locked||busy} onClick={onRemove}>停用此声音朗读</button>:<button type="button" disabled={!preset?.ready||locked||busy} onClick={onSelect}>使用这个声音</button>}</div>
  <label className="voicePresetTextLabel" htmlFor={`${presetId}-preview-text`}>试听文本</label>
  <textarea id={`${presetId}-preview-text`} value={text} maxLength={300} onChange={event=>setText(event.target.value)} rows={3}/>
  <div className="voicePresetFooter"><small>{text.length} / 300 · 语速 {speed.toFixed(2)}×</small><button type="button" disabled={!preset?.ready||busy||locked||!text.trim()} onClick={()=>void preview()}>{busy?"正在生成…":"▶ 生成试听"}</button></div>
  {audio&&<audio key={audio} src={audio} controls preload="auto" aria-label={`${title}生成语音试听`}/>}
  {error&&<p className="voiceStatus" role="status">{error}</p>}
 </section>;
}

