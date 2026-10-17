const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {renderToString} = require('react-dom/server');
const React = require('react');

// Load the actual TypeScript modules without adding a test-runner dependency.
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022},
    }).outputText, filename);
  };
}
const {ELYRA_LANGUAGE_CATALOG: catalog} = require('../lib/language-catalog.generated.ts');
const {messages} = require('../lib/i18n/messages.ts');
const {normalizeLocale, normalizeSelection, localeDirection} = require('../lib/i18n/locale.ts');
const {I18nProvider, useI18n, uiLanguageName, ELYRA_UI_LANGUAGE_KEY} = require('../lib/i18n/provider.tsx');
const {languagePickerGroups} = require('../lib/i18n/language-picker.ts');
let count = 0;
function test(name, fn) {fn(); count++; console.log(`PASS ${name}`);}

test('every installed pack has exactly the English keys and nonempty strings', () => {
  const expected = Object.keys(messages.en).sort();
  for (const [code, pack] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(pack).sort(), expected, code);
    assert.ok(Object.values(pack).every(value => typeof value === 'string' && value.trim()), code);
    const disk = JSON.parse(fs.readFileSync(path.join(__dirname, `../lib/i18n/messages/${code}.json`), 'utf8'));
    assert.deepEqual(Object.keys(disk).sort(), expected, `${code}: no missing/extra raw keys`);
  }
});
test('locale normalization handles regions, script, case, aliases and unknown locales', () => {
  for (const [input, expected] of Object.entries({
    'en-US':'en','en-GB':'en','EN_us':'en','zh':'zh-CN','zh-CN':'zh-CN','zh-SG':'zh-CN',
    'zh-Hans-SG':'zh-CN','zh-TW':'zh-CN','zh-HK':'zh-CN','pt-BR':'pt','pt-PT':'pt',
    'ms-MY':'ms','ja-JP':'ja','iw-IL':'he','fil-PH':'tl','nb-NO':'no','xx-ZZ':'en',
  })) assert.equal(normalizeLocale(input), expected, input);
  assert.equal(normalizeSelection('system'), 'system');
  for (const entry of catalog) assert.equal(normalizeLocale(entry.code), entry.code);
});
test('English → Chinese → Malay → Japanese → English retains actual packs', () => {
  assert.deepEqual(['en-US','zh-SG','ms-MY','ja-JP','en'].map(value=>messages[normalizeLocale(value)].startChat),
    ['Start Chat','开始聊天','Mula Berbual','チャットを始める','Start Chat']);
});
test('RTL direction resolves independently of the selection UI', () => {
  for (const code of ['ar','he','fa','ur','ps','sd','ug','yi']) assert.equal(localeDirection(code),'rtl');
  for (const code of ['en','zh-CN','ja','ms']) assert.equal(localeDirection(code),'ltr');
});
test('picker groups use English A–Z; searches use visible name, English name and code only', () => {
  const groups = languagePickerGroups('', 'zh-CN');
  const flat = groups.flatMap(group=>group.items);
  assert.equal(flat.length,catalog.length);
  assert.deepEqual(flat.map(entry=>entry.names.en), [...flat].sort((a,b)=>a.names.en.localeCompare(b.names.en,'en',{sensitivity:'base'})).map(entry=>entry.names.en));
  const results = languagePickerGroups('b', 'en');
  assert.equal(results.length,1); assert.equal(results[0].letter,'');
  assert.ok(results[0].items.some(entry=>entry.code==='ar')); // Arabic contains b, not a prefix.
  const hiddenMalayName = 'bahasa arab';
  assert.equal(languagePickerGroups(hiddenMalayName,'en')[0].items.length,0);
  assert.equal(uiLanguageName(catalog.find(entry=>entry.code==='en'),'zh-CN'),'英语');
  assert.equal(uiLanguageName(catalog.find(entry=>entry.code==='ar'),'ja'),'Arabic');
});
test('server and first browser render ignore saved and navigator language', () => {
  function Probe(){const {selection,locale,t}=useI18n();return React.createElement('span',null,`${selection}/${locale}/${t.startChat}`);}
  const tree=()=>React.createElement(I18nProvider,null,React.createElement(Probe));
  const server=renderToString(tree());
  global.window={localStorage:{getItem(){throw Error('storage read during render');}}};
  const clientFirst=renderToString(tree());
  delete global.window;
  assert.equal(server,clientFirst);assert.ok(server.includes('system/en/Start Chat'));
});
test('all selectors use context with no competing language state, storage or custom events', () => {
  assert.equal(ELYRA_UI_LANGUAGE_KEY,'elyra.uiLanguage');
  for (const file of ['character-stage.tsx','character-conversation.tsx','web-tool-launcher.tsx']) {
    const source=fs.readFileSync(path.join(__dirname,'../components',file),'utf8');
    assert.ok(source.includes('useI18n()'),file);
    assert.ok(!source.includes('setLanguage('),file);
    assert.ok(!source.includes('elyra.web.language'),file);
    assert.ok(!source.includes('ELYRA_UI_LANGUAGE_EVENT'),file);
    assert.ok(source.includes('setLocale("system")'),file);
  }
});
console.log(`${count} test groups passed; ${catalog.length} catalog languages, ${Object.keys(messages).length} complete packs, ${Object.keys(messages.en).length} keys.`);
const missing=catalog.filter(entry=>!messages[entry.code]).map(entry=>entry.code);
if(missing.length) console.log(`Catalog packs still missing (${missing.length}): ${missing.join(', ')}`);
if(process.argv.includes('--coverage')) assert.deepEqual(missing, [], 'Every catalog language must have its own translation pack');
