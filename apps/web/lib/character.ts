export type CharacterSettings={characterConfig?:{skinTone?:string;modelKey?:"elyra-stanley"|"male-01";[key:string]:unknown}|null};
const API_BASE_URL=process.env.ELYRA_API_URL??"http://localhost:4000/api/v1";
export async function getCharacter():Promise<CharacterSettings|null>{
  try{const response=await fetch(`${API_BASE_URL}/character`,{cache:"no-store"});if(!response.ok)return null;return await response.json() as CharacterSettings}catch{return null}
}
