const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
const {buildPreview} = require('../tools/cat-expression-preview.cjs');

const ROOT = path.join(__dirname,'..');
const SAVE_KEY = 'naotocchi-save-v1';

function decodeAttribute(value) {
  return value.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&#39;/g,"'").replace(/&amp;/g,'&');
}

function previewParts(html) {
  const source=html.match(/<iframe\b[^>]*\bsrcdoc="([\s\S]*?)"[^>]*>/)?.[1];
  assert.ok(source,'preview has an iframe srcdoc game document');
  const gameHtml=decodeAttribute(source);
  const bootstrap=gameHtml.match(/<script\b[^>]*id="cat-expression-preview-bootstrap"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(bootstrap,'game document has a storage bootstrap');
  return {gameHtml,bootstrap};
}

function runBootstrap(html,search='',sentinelValue='real-save') {
  const {bootstrap}=previewParts(html);
  const externalData=new Map([[SAVE_KEY,sentinelValue],['outside','untouched']]);
  const calls=[];
  const externalStorage={
    getItem(key) {calls.push(['getItem',key]);return externalData.get(String(key)) ?? null;},
    setItem(key,value) {calls.push(['setItem',key,value]);externalData.set(String(key),String(value));},
    removeItem(key) {calls.push(['removeItem',key]);externalData.delete(String(key));},
    clear() {calls.push(['clear']);externalData.clear();},
    key(index) {calls.push(['key',index]);return [...externalData.keys()][index] ?? null;},
    get length() {calls.push(['length']);return externalData.size;},
  };
  const parent={location:{search},localStorage:externalStorage};
  const sandbox={console,Map,URLSearchParams,parent,localStorage:externalStorage};
  sandbox.window=sandbox;
  vm.runInNewContext(bootstrap,sandbox);
  return {storage:sandbox.localStorage,externalData,calls};
}

function seededState(html,search='') {
  const run=runBootstrap(html,search);
  return {run,state:JSON.parse(run.storage.getItem(SAVE_KEY))};
}

test('buildPreview wraps the current game with a compact isolated phone-safe control shell', () => {
  const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const html=buildPreview();
  assert.match(html,/^<!doctype html>/i);
  assert.match(html,/>猫の表情テスト</);
  assert.match(html,/>このページでは保存しません</);
  assert.match(html,/<header\b[^>]*data-preview-controls/);
  assert.match(html,/<iframe\b[^>]*title="なおとっち 猫の表情プレビュー"/);
  assert.ok(html.indexOf('data-preview-controls') < html.indexOf('<iframe'),
    'preview controls remain outside and above the game viewport');
  const {gameHtml}=previewParts(html);
  assert.ok(gameHtml.indexOf('<base href="./">') < gameHtml.indexOf('<link'),
    'relative game assets resolve from the preview root');
  const sourceLoaders=[...source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map(match=>match[1]);
  const previewLoaders=[...gameHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map(match=>match[1]);
  assert.deepEqual(previewLoaders,sourceLoaders,'the disposable game keeps every original loader in order');
  assert.ok(gameHtml.indexOf('cat-expression-preview-bootstrap') < gameHtml.indexOf(sourceLoaders[0]),
    'memory storage is installed before any game loader');
  assert.match(gameHtml,/id="ageLabel"/);
  assert.match(gameHtml,/id="careActions"/);
  assert.doesNotMatch(source,/cat-expression-preview|猫の表情テスト/,
    'the normal game never imports the preview');
});

test('default preview seeds an exact fresh-state adult hungry cat in memory only', () => {
  const html=buildPreview();
  const {run,state}=seededState(html);
  const fresh=JSON.parse(JSON.stringify(harness().api.freshState()));
  const expected=Object.assign(fresh,{
    stage:'growing',speciesLine:'cat',stageIndex:5,ageTicks:500,
    hunger:40,happiness:80,energy:80,health:80,isSick:false,sicknessType:null,
    isSleeping:false,deathMeter:0,dying:false,affectionStreak:0,
    transformOptions:null,companions:[],partner:null,
  });
  assert.deepEqual(state,expected);
  assert.equal(run.storage.length,1,'only the preview save is initially seeded');
  assert.equal(run.storage.key(0),SAVE_KEY);
  assert.deepEqual([...run.externalData],[[SAVE_KEY,'real-save'],['outside','untouched']]);
  assert.deepEqual(run.calls,[],'bootstrap never accesses the real storage object');
});

test('the generated Map-backed adapter implements the complete disposable Storage surface', () => {
  const {storage,externalData,calls}=runBootstrap(buildPreview());
  assert.equal(storage.getItem('missing'),null);
  storage.setItem('count',7);
  assert.equal(storage.getItem('count'),'7');
  assert.equal(storage.length,2);
  assert.equal(storage.key(1),'count');
  assert.equal(storage.key(9),null);
  storage.removeItem('count');
  assert.equal(storage.getItem('count'),null);
  storage.clear();
  assert.equal(storage.length,0);
  assert.deepEqual([...externalData],[[SAVE_KEY,'real-save'],['outside','untouched']]);
  assert.deepEqual(calls,[],'adapter operations never escape to real storage');
});

test('URL presets use a strict allowlist and reset every care fixture independently', () => {
  const html=buildPreview({preset:'normal'});
  const cases={
    normal:{hunger:80,happiness:80,energy:80,isSick:false,sicknessType:null,deathMeter:0,affectionStreak:0},
    hungry:{hunger:40,happiness:80,energy:80,isSick:false,sicknessType:null,deathMeter:0,affectionStreak:0},
    sick:{hunger:80,happiness:80,energy:80,isSick:true,sicknessType:'かぜ',deathMeter:0,affectionStreak:0},
    tired:{hunger:80,happiness:80,energy:40,isSick:false,sicknessType:null,deathMeter:0,affectionStreak:0},
    sulky:{hunger:80,happiness:40,energy:80,isSick:false,sicknessType:null,deathMeter:0,affectionStreak:3},
    critical:{hunger:80,happiness:80,energy:80,isSick:false,sicknessType:null,deathMeter:80,affectionStreak:0},
  };
  for (const [preset,want] of Object.entries(cases)) {
    const {state}=seededState(html,`?preset=${preset}`);
    for (const [key,value] of Object.entries(want)) assert.equal(state[key],value,`${preset} ${key}`);
  }
  assert.equal(seededState(html,'?preset=../../real-save').state.hunger,80,
    'unknown URL values fall back to the selected safe default');
  assert.throws(()=>buildPreview({preset:'other'}),/Unknown preview preset/);
  for (const preset of Object.keys(cases)) assert.match(html,new RegExp(`href="\\?preset=${preset}"`));
});

test('CLI writes the same self-contained preview for the requested safe preset', () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cat-expression-preview-'));
  const output=path.join(directory,'cat-expression-check.html');
  try {
    const result=spawnSync(process.execPath,['tools/cat-expression-preview.cjs',output,'sulky'],{
      cwd:ROOT,encoding:'utf8',
    });
    assert.equal(result.status,0,result.stderr);
    assert.equal(fs.readFileSync(output,'utf8'),buildPreview({preset:'sulky'}));
  } finally {
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
