"use client";

import {useI18n} from "@/lib/i18n";

export type HistoryMessage={id:number;role:"user"|"assistant";text:string;createdAt:number};

export function ConversationHistory({messages,name,welcomeAt,sending}:{messages:HistoryMessage[];name:string;welcomeAt:number|null;sending:boolean}){
  const {t,locale}=useI18n();
  // Omit timeZone deliberately: Intl uses the device's local time zone.
  const format=new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"});
  const timestamp=(value:number)=><time dateTime={new Date(value).toISOString()}>{format.format(value)}</time>;
  return <div className="companionHistory" role="log" aria-label={t.fullHistory}>
    <div className="companionHistoryRow assistant">
      <small>{name}</small><p dir="auto">{t.openingMessage}</p>
      {welcomeAt!==null&&timestamp(welcomeAt)}
    </div>
    {messages.map(message=><div key={message.id} className={`companionHistoryRow ${message.role}`}>
      <small>{message.role==="assistant"?name:t.you}</small>
      <p dir="auto">{message.text}</p>
      {timestamp(message.createdAt)}
    </div>)}
    {sending&&<div className="companionHistoryRow assistant"><small>{name}</small><p dir="auto">{t.thinking}</p></div>}
  </div>;
}
