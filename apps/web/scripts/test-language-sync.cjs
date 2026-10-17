require('./test-i18n.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const {JSDOM} = require('jsdom');
const {renderToString} = require('react-dom/server');
const {hydrateRoot} = require('react-dom/client');
const {I18nProvider,useI18n} = require('../lib/i18n/provider.tsx');
const {messages} = require('../lib/i18n/messages.ts');

const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  return resolve.call(this,request.startsWith('@/') ? path.join(__dirname,'..',request.slice(2)) : request,parent,...rest);
};
// Test real UI components; WebGL itself is outside the language test's scope.
const viewportFile = require.resolve('../components/three-character-viewport.tsx');
require.cache[viewportFile] = {id:viewportFile,filename:viewportFile,loaded:true,exports:{
  ThreeCharacterViewport(){const {t}=useI18n();return React.createElement('div',{'aria-label':t.interactiveCharacter},t.preparing);},
}};
const {ExperienceShell} = require('../components/experience-shell.tsx');
const {WebToolLauncher} = require('../components/web-tool-launcher.tsx');
const config = {chatName:'Stanley',openingMessage:'Dynamic opening message',inputPlaceholder:'Message…'};
const modules = ['chat','memory','about','explore'].map(key=>({key,label:key,description:key,enabled:true}));
function tree(){return React.createElement(I18nProvider,null,
  React.createElement(ExperienceShell,{style:{},config,modules,modelKey:'elyra-stanley'}),
  React.createElement(WebToolLauncher));}

async function main(){
  const html = renderToString(tree());
  const dom = new JSDOM(`<!DOCTYPE html><html lang="en"><head><meta name="description" content="A private conversation space"></head><body><div id="root">${html}</div></body></html>`,{url:'http://elyra.test'});
  global.window=dom.window; global.document=dom.window.document;
  Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
  Object.defineProperty(navigator,'language',{configurable:true,value:'en-US'});
  global.IS_REACT_ACT_ENVIRONMENT=true;
  global.fetch=async()=>({ok:true,json:async()=>({enabled:false,supportedLanguages:[]})});
  const storage=window.localStorage;
  storage.setItem('elyra.uiLanguage','ms');
  const hydrationErrors=[];const consoleErrors=[];
  const oldError=console.error;console.error=(...args)=>consoleErrors.push(args.join(' '));
  const host=document.getElementById('root');
  let root;
  const {act}=React;
  await act(async()=>{root=hydrateRoot(host,tree(),{onRecoverableError:error=>hydrationErrors.push(error.message)});});
  const one=selector=>{const node=host.querySelector(selector);assert.ok(node,selector);return node;};
  const click=async node=>{assert.ok(node,'click target');await act(async()=>{node.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));});};
  const openHome=async()=>{await click(one('button.toolLauncher'));await click(one('.languageTool'));};
  const closeHome=async()=>click(one('.stageModal .modalClose'));
  const openMenu=async()=>{
    await click(one('.companionMenuButton'));
    await click([...host.querySelectorAll('.companionMenu button')].find(button=>button.querySelector('b')?.textContent===currentMessages().language));
  };
  const closeMenu=async()=>click(one('.companionPanel header button'));
  const currentMessages=()=>messages[document.documentElement.lang];
  const homeRow=code=>code==='system'?one('.stageModal .systemRow'):[...host.querySelectorAll('.stageModal .languageRow')].find(button=>button.querySelector('small')?.textContent.endsWith(` · ${code}`));
  // Catalog English names are authoritative, including the Chinese/Malay labels.
  const {ELYRA_LANGUAGE_CATALOG:catalog}=require('../lib/language-catalog.generated.ts');
  const findMenuRow=code=>code==='system'?one('.companionLanguage > button'):[...host.querySelectorAll('.companionLanguage .languageAlphaGroup button')].find(button=>button.querySelector('small')?.textContent===`${catalog.find(entry=>entry.code===code).names.en} · ${code}`);
  function assertUI(code){
    const t=messages[code];
    assert.equal(document.documentElement.lang,code);
    assert.equal(one('.brand span').textContent,t.yourSpace);
    assert.equal(one('.rail nav a span').textContent,t.navChat);
    assert.equal(one('.desktopHubHeading h2').textContent,t.characterOutfit);
    assert.equal(one('.desktopStartChat').textContent,t.startChat);
    assert.equal(one('.mobileCharacterIntro small').textContent,t.yourCompanion);
    assert.equal(document.title,t.pageTitle);
  }
  async function assertBothSelected(code){
    await openHome();assert.equal(homeRow(code).getAttribute('aria-pressed'),'true');await closeHome();
    await openMenu();assert.equal(findMenuRow(code).getAttribute('aria-pressed'),'true');await closeMenu();
  }
  assertUI('ms');await assertBothSelected('ms');
  console.log('PASS hydration restores saved Malay in both selectors');
  await openHome();await click(homeRow('en'));assertUI('en');assert.equal(storage.getItem('elyra.uiLanguage'),'en');await closeHome();await assertBothSelected('en');
  console.log('PASS Test 1: home English → menu English + UI English');
  await openMenu();await click(findMenuRow('zh-CN'));assertUI('zh-CN');assert.equal(storage.getItem('elyra.uiLanguage'),'zh-CN');await closeMenu();await assertBothSelected('zh-CN');
  console.log('PASS Test 2: menu Chinese → home Chinese + UI Chinese');
  await openHome();await click(homeRow('ms'));assertUI('ms');assert.equal(storage.getItem('elyra.uiLanguage'),'ms');await closeHome();await assertBothSelected('ms');
  console.log('PASS Test 3: home Malay → menu Malay + UI Malay');
  Object.defineProperty(navigator,'language',{configurable:true,value:'zh-SG'});
  await act(async()=>window.dispatchEvent(new window.Event('languagechange')));
  assertUI('ms'); // Explicit selection stays independent of browser language.
  await openMenu();await click(findMenuRow('system'));assertUI('zh-CN');assert.equal(storage.getItem('elyra.uiLanguage'),'system');await closeMenu();await assertBothSelected('system');
  console.log('PASS Test 4: menu Follow System → home Follow System + browser Chinese');
  await act(async()=>root.unmount());
  host.innerHTML=renderToString(tree());
  await act(async()=>{root=hydrateRoot(host,tree(),{onRecoverableError:error=>hydrationErrors.push(error.message)});});
  assertUI('zh-CN');await assertBothSelected('system');
  console.log('PASS Test 5: fresh hydration retains Follow System in both selectors');
  // Also reload a saved explicit selection rather than only the system default.
  await openHome();await click(homeRow('ms'));await closeHome();
  await act(async()=>root.unmount());host.innerHTML=renderToString(tree());
  await act(async()=>{root=hydrateRoot(host,tree(),{onRecoverableError:error=>hydrationErrors.push(error.message)});});
  assertUI('ms');await assertBothSelected('ms');
  await click(one('.toolTrigger'));await click(one('.languageAction'));
  assert.equal(one('.languageModal .languageRow.selected small').textContent,`${catalog.find(entry=>entry.code==='ms').names.en} · ms`);
  console.log('PASS legacy launcher shares the same Provider selection');
  await click(one('.languageModal header button'));
  await click(one('.desktopStartChat'));
  assert.equal(one('.companionSpeech').textContent,messages.ms.openingMessage);
  for(const code of ['en','zh-CN','ja','ms']){
    await openMenu();await click(findMenuRow(code));await closeMenu();
    assert.equal(one('.companionSpeech').textContent,messages[code].openingMessage);
  }
  await click(one('.companionMenuButton'));
  await click([...host.querySelectorAll('.companionMenu button')].find(button=>button.querySelector('b')?.textContent===messages.ms.fullHistory));
  assert.equal(one('.companionHistoryRow p').textContent,messages.ms.openingMessage);
  assert.equal(host.querySelectorAll('.companionHistoryRow').length,1);
  console.log('PASS welcome follows Malay → English → Chinese → Japanese → Malay immediately, including history');
  assert.deepEqual(hydrationErrors,[]);
  assert.ok(!consoleErrors.some(message=>/hydration|didn't match|did not match/i.test(message)),consoleErrors.join('\n'));
  console.log('PASS no recoverable hydration errors or hydration mismatch warnings');
  await act(async()=>root.unmount());console.error=oldError;dom.window.close();
}
main().catch(error=>{process.stderr.write(`${error.stack}\n`);process.exitCode=1;});
