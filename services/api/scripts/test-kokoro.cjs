const fs=require('node:fs');
const ts=require('typescript');
const assert=require('node:assert/strict');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,filename);
const {kokoroSpeechLanguage}=require('../src/voice/speech-language.ts');
const {VoiceController}=require('../src/voice/voice.controller.ts');
const {KOKORO_PRESET}=require('../src/voice/kokoro-preview.service.ts');
async function main(){
 for(const [text,expected] of [['你好，今天过得怎么样？','zh'],['Hello.','en'],['How was your day? I am here to listen.','en'],['你好，Stanley. How are you?','zh'],['Saya suka bercakap dengan kamu.',null],['Xin chào bạn, hôm nay bạn thế nào?',null],['مرحبا كيف حالك',null],['Bonjour, comment allez-vous?',null],['123456',null]])assert.equal(kokoroSpeechLanguage(text),expected,text);
 let provider='piper'; const calls=[];
 const engine=name=>({presets:()=>[{id:name}],preview:async()=>calls.push(`${name}:preview`),synthesize:async()=>calls.push(`${name}:synthesize`)});
 const controller=new VoiceController({get:async()=>({provider})},engine('piper'),engine('kokoro'));
 await controller.preview({preset:KOKORO_PRESET});
 await controller.preview({preset:'zh_CN-chaowen-medium'});
 await controller.synthesize({text:'你好'});provider='kokoro';await controller.synthesize({text:'Hello'});
 assert.deepEqual(calls,['kokoro:preview','piper:preview','piper:synthesize','kokoro:synthesize']);
 assert.equal(controller.presets().length,2);
 console.log('PASS Kokoro Chinese/English/mixed language gating, unsupported languages, preset routing and Piper preservation.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
