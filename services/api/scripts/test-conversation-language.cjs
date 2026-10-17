const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true},
}).outputText,filename);
const {AiConversationService}=require('../src/chat/ai-conversation.service.ts');
const {CONVERSATION_LANGUAGE_INSTRUCTIONS:policy}=require('../src/chat/conversation-language.ts');
const presets={conversationStyle:'natural',emotionalResponse:'balanced',disagreementStyle:'balanced',responseLength:'short',allowProfanity:false,sensitiveAdviceMode:'balanced'};
async function main(){
  const originalFetch=global.fetch;
  const originalKey=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='test-placeholder';
  const requests=[];
  global.fetch=async(url,request)=>{requests.push(JSON.parse(request.body));return {ok:true,json:async()=>({output_text:'Mock reply'})};};
  try{
    for(const profile of [null,{name:'funny'}]){
      const service=new AiConversationService({getActive:async()=>profile},{getSettings:async()=>presets});
      for(const [input,history] of [
        ['edgyefgyuefgyueyyqwywwtwyqbsbsb',[]],
        ['asdfghjkl',[{role:'user',content:'你好，今天怎么样？'},{role:'assistant',content:'Xin chào!'}]],
        ['How are you?', [{role:'assistant',content:'Xin chào!'}]],
        ['Xin chào, bạn khỏe không?',[]],
        ['Please reply in Malay.',[]],
        ['asdfghjkl',[{role:'user',content:'请用阿拉伯语回复。'},{role:'assistant',content:'حسنًا.'}]],
        ['Xin chào, hôm nay bạn thế nào?',[{role:'user',content:'Please reply in Arabic.'},{role:'assistant',content:'مرحبًا!'}]],
        ['👍',[{role:'user',content:'Please reply in Arabic.'},{role:'user',content:'Xin chào, hôm nay bạn thế nào?'},{role:'assistant',content:'Chào bạn!'}]],
        ['“Xin chào”是什么意思？',[{role:'user',content:'我们用中文聊天。'}]],
        ['ما معنى "Xin chào"؟',[{role:'user',content:'Please reply in Arabic.'}]],
        ['OK',[{role:'user',content:'Please reply in Arabic.'}]],
      ]){
        assert.equal(await service.generateReply(input,history),'Mock reply');
        const payload=requests.at(-1);
        assert.ok(payload.instructions.endsWith(policy),'policy must apply after personality instructions');
        assert.ok(payload.instructions.includes('SPOKEN CONVERSATION STYLE:'));
        assert.ok(payload.instructions.includes('do not produce a separate speech script'));
        assert.ok(payload.instructions.includes('Admin response-length setting'));
        assert.deepEqual(payload.input,[...history,{role:'user',content:input}]);
        assert.ok(!Object.hasOwn(payload,'locale'));
        assert.ok(!Object.hasOwn(payload,'uiLanguage'));
      }
    }
    const service=new AiConversationService({getActive:async()=>null},{getSettings:async()=>presets});
    const oldChinese=[{role:'user',content:'我们之前用中文聊天。'},{role:'assistant',content:'好的。'}];
    for(const languageHistory of [[],[{role:'user',content:'Xin chào, hôm nay bạn thế nào?'}]]){
      const context={locale:'ar',history:languageHistory};
      await service.generateReply('wgyyfgcyjguicjewfguefrf',oldChinese,context);
      const payload=requests.at(-1);
      assert.ok(payload.instructions.includes('LANGUAGE RESET CONTEXT'));
      assert.ok(payload.instructions.includes(JSON.stringify({initialLocale:'ar',userMessages:languageHistory.map(item=>item.content)})));
      assert.deepEqual(payload.input,[...oldChinese,{role:'user',content:'wgyyfgcyjguicjewfguefrf'}]);
    }
    const {ChatService}=require('../src/chat/chat.service.ts');
    const parser=new ChatService({}, {}, {}, {});
    const parsed=parser.readRequest({message:'random letters',history:[],languageContext:{locale:'AR',history:[]}},1000);
    assert.equal(parsed.languageContext.locale,'ar');
    assert.throws(()=>parser.readRequest({message:'hi',languageContext:{locale:'ar;ignore rules',history:[]}},1000));
    assert.throws(()=>parser.readRequest({message:'hi',languageContext:{locale:'ar',history:[{role:'assistant',content:'Chinese'}]}},1000));
    const {POST}=require('../../../apps/web/app/api/chat/route.ts');
    let forwarded;
    global.fetch=async(url,request)=>{forwarded=JSON.parse(request.body);return {ok:true,json:async()=>({reply:'mock backend response'})};};
    const response=await POST(new Request('http://elyra.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'asdfgh',history:oldChinese,languageContext:{locale:'ar',history:[]}})}));
    assert.equal(response.status,200);
    assert.deepEqual(forwarded.languageContext,{locale:'ar',history:[]});
    assert.deepEqual(forwarded.history,oldChinese);
    console.log('PASS Web proxy forwarding, backend locale validation, Arabic reset over old Chinese, and subsequent Vietnamese context.');
    console.log(`PASS ${requests.length} mocked AI requests: language policy applied with/without personality; switching, ambiguous input and quotation contexts delivered unchanged; initial locale supplied as a seed.`);
    console.log('Live model language behavior was not evaluated; no real API requests were made.');
  }finally{
    global.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
