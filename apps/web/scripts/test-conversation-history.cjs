require('./test-i18n.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const Module=require('node:module');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {JSDOM}=require('jsdom');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(__dirname,'..',request.slice(2)):request,parent,...rest);};
const {I18nProvider}=require('../lib/i18n/provider.tsx');
const {ConversationHistory}=require('../components/conversation-history.tsx');
const sent=Date.parse('2026-10-16T23:58:00Z');
const received=sent+120000;
const messages=[
  {id:1,role:'user',text:'我的消息\n第二行 <test>',createdAt:sent},
  {id:2,role:'assistant',text:'AI original reply',createdAt:received},
];
function render(){
  const html=renderToString(React.createElement(I18nProvider,null,React.createElement(ConversationHistory,{messages,name:'Stanley',welcomeAt:sent-60000,sending:true})));
  const dom=new JSDOM(html);
  const rows=[...dom.window.document.querySelectorAll('.companionHistoryRow')];
  assert.equal(rows.length,4);
  assert.ok(rows[0].classList.contains('assistant'));
  assert.ok(rows[1].classList.contains('user'));
  assert.ok(rows[2].classList.contains('assistant'));
  assert.equal(rows[1].querySelector('p').textContent,messages[0].text);
  assert.equal(rows[2].querySelector('p').textContent,messages[1].text);
  assert.equal(rows[1].querySelector('p').getAttribute('dir'),'auto');
  assert.equal(rows[1].querySelector('time').dateTime,new Date(sent).toISOString());
  assert.equal(rows[2].querySelector('time').dateTime,new Date(received).toISOString());
  assert.equal(rows[3].querySelector('time'),null); // Thinking is not a received message.
  const result=rows[1].querySelector('time').textContent;
  dom.window.close();return result;
}
const savedTZ=process.env.TZ;
try{
  process.env.TZ='UTC';const utc=render();
  process.env.TZ='Asia/Kuala_Lumpur';const local=render();
  assert.notEqual(utc,local);
  assert.ok(utc.includes('16'));
  assert.ok(local.includes('17'));
  console.log(`PASS device timezone and midnight date boundary: ${utc} → ${local}`);
  console.log('PASS assistant/user rows, original content, stable timestamps, welcome time and thinking state');
}finally{if(savedTZ===undefined)delete process.env.TZ;else process.env.TZ=savedTZ;}
