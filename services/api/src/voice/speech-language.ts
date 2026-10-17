import {detect} from "tinyld";

/** Resolve from reply text only; never from App UI locale. Unknown stays silent. */
export function kokoroSpeechLanguage(text:string):"zh"|"en"|null{
 if(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Devanagari}\p{Script=Thai}]/u.test(text))return null;
 if(/\p{Script=Han}/u.test(text))return "zh";
 if(/^(?:hello|hi|okay|ok|yes|no|thanks|thank you|good morning|good night)[.!?\s]*$/i.test(text.trim()))return "en";
 return detect(text)==="en"?"en":null;
}
