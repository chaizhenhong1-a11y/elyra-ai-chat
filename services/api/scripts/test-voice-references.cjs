const fs=require('node:fs');
const ts=require('typescript');
const assert=require('node:assert/strict');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,filename);
const {VoiceService}=require('../src/voice/voice.service.ts');
const refs=new Map();
let settings={id:'default',referenceAudioUrl:'/api/v1/uploads/original.wav',profileName:'Stanley Original',supportedLanguages:['en','zh'],speed:1,enabled:false,autoSpeak:true};
const key=where=>`${where.profileId_language.profileId}/${where.profileId_language.language}`;
const db={
 voiceSettings:{upsert:async({update})=>{settings={...settings,...update};return {...settings,references:[...refs.values()]};}},
 voiceReference:{
  upsert:async({where,create,update})=>{const id=key(where);const next=refs.has(id)?{...refs.get(id),...update}:{...create,verified:false};refs.set(id,next);return next;},
  findUnique:async({where})=>refs.get(key(where))??null,
  update:async({where,data})=>{const id=key(where);refs.set(id,{...refs.get(id),...data});return refs.get(id);},
 },
 $transaction:async work=>work(db),
};
async function main(){
 const service=new VoiceService(db);
 await service.setReferenceAudio('/api/v1/uploads/english.wav','en','english.wav');
 await service.setReferenceAudio('/api/v1/uploads/malay.wav','ms','malay.wav');
 await service.setReferenceAudio('/api/v1/uploads/chinese.wav','zh-CN','chinese.wav');
 assert.equal(refs.size,3);
 assert.equal(settings.referenceAudioUrl,'/api/v1/uploads/original.wav');
 await service.verifyReference('en',{verified:true});
 assert.equal(refs.get('default/en').verified,true);
 await service.setReferenceAudio('/api/v1/uploads/english-new.wav','en','english-new.wav');
 assert.equal(refs.size,3);
 assert.equal(refs.get('default/en').verified,false);
 assert.equal(refs.get('default/ms').audioUrl,'/api/v1/uploads/malay.wav');
 assert.equal(refs.get('default/zh').audioUrl,'/api/v1/uploads/chinese.wav');
 await service.update({...settings,profileName:'Stanley multilingual',references:[]});
 assert.equal(refs.size,3);
 const result=await service.get();assert.equal(result.references.length,3);
 await assert.rejects(()=>service.setReferenceAudio('/bad','invalid/code','bad.wav'));
 await assert.rejects(()=>service.verifyReference('ja',{verified:true}));
 await assert.rejects(()=>service.verifyReference('en',{verified:'yes'}));
 console.log('PASS per-language storage, isolated replacement, preserved legacy reference, confirmation reset, zh-CN normalization, settings preservation and input validation.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
