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
  const load=[];
  const clicked=[];
  const sandbox={console,Map,URLSearchParams,parent,localStorage:externalStorage,
    addEventListener(type,fn) { if(type==='load') load.push(fn); },
    document:{getElementById(id){return {click(){clicked.push(id);}};}},
  };
  sandbox.window=sandbox;
  vm.runInNewContext(bootstrap,sandbox);
  return {storage:sandbox.localStorage,externalData,calls,load,clicked};
}

function seededState(html,search='') {
  const run=runBootstrap(html,search);
  return {run,state:JSON.parse(run.storage.getItem(SAVE_KEY))};
}

test('buildPreview wraps the current game with a compact isolated phone-safe control shell', () => {
  const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const html=buildPreview();
  assert.match(html,/^<!doctype html>/i);
  assert.match(html,/>表情とマークの確認</);
  assert.match(html,/>このページでは保存しません</);
  assert.match(html,/<header\b[^>]*data-preview-controls/);
  assert.match(html,/<iframe\b[^>]*title="なおとっち 表情プレビュー"/);
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
    achievementsUnlocked:['age-10','age-25'],
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
    weak:{hunger:80,happiness:80,energy:80,health:80,isSick:false,sicknessType:null,deathMeter:60,affectionStreak:0,isSleeping:false},
    critical:{hunger:80,happiness:80,energy:80,isSick:false,sicknessType:null,deathMeter:80,affectionStreak:0},
    wantsPlay:{hunger:80,happiness:40,energy:80,health:80,isSick:false,sicknessType:null,deathMeter:0,affectionStreak:0,isSleeping:false},
    sleeping:{hunger:80,happiness:80,energy:80,health:80,isSick:false,sicknessType:null,deathMeter:0,affectionStreak:0,isSleeping:true},
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

test('temporary happy stays on ordinary care controls and never runs automatically', () => {
  const html=buildPreview();
  const run=runBootstrap(html);
  assert.throws(()=>buildPreview({preset:'happy'}),/Unknown preview preset/);
  assert.doesNotMatch(html,/href="\?preset=happy"/);
  assert.deepEqual(run.load,[]);
  assert.deepEqual(run.clicked,[]);
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

test('all preview forms keep selected faces visible across startup saves without achievement flashes', () => {
  for (const form of ['adult','kitten','otemba','young','calm','elder','toddler','baby','dogAdult','puppy','wanpaku','youngDog','calmDog','babyDog','toddlerDog','elderDog']) {
    for (const preset of ['hungry','tired','sleeping']) {
      const {state}=seededState(buildPreview({form,preset}));
      const h=harness();
      Object.assign(h.api.state(),state);
      h.get('storyFlash').classList.add('hidden');
      h.get('lifeCardOverlay').classList.add('hidden');
      h.api.render();
      h.api.saveState();
      h.api.render();
      assert.equal(h.get('storyFlash').classList.contains('hidden'),true,`${form}/${preset} has no achievement overlay`);
      assert.equal(h.get('petSprite').dataset.expression,preset,`${form}/${preset} keeps its face`);
    }
  }
});

test('preset clicks reset only the child session and bootstrap uses that selected preset', () => {
  const html=buildPreview();
  const code=html.match(/<script id="cat-expression-preview-controls">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code,'preview handles switches without top-level navigation');
  const frame={dataset:{},srcdoc:previewParts(html).gameHtml};
  let handler;
  const nav={addEventListener(type,fn){assert.equal(type,'click');handler=fn;},contains:()=>true};
  let formHandler;
  const formSelect={addEventListener(type,fn){assert.equal(type,'change');formHandler=fn;}};
  const document={querySelector:selector=>selector==='iframe'?frame:selector==='nav'?nav:formSelect};
  vm.runInNewContext(code,{document,URLSearchParams,window:{location:{search:''}}});
  formHandler({target:{value:'kitten'}});
  assert.equal(frame.dataset.form,'kitten');
  for(const preset of ['normal','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']) {
    let prevented=false;
    handler({target:{closest:()=>({getAttribute:()=>'?preset='+preset})},preventDefault(){prevented=true;}});
    assert.equal(prevented,true);
    assert.equal(frame.dataset.preset,preset);
    const boot=frame.srcdoc.match(/id="cat-expression-preview-bootstrap"[^>]*>([\s\S]*?)<\/script>/)[1];
    const ctx={Map,URLSearchParams,frameElement:frame,parent:{location:{search:'?preset=hungry'}}};ctx.window=ctx;
    vm.runInNewContext(boot,ctx);
    const state=JSON.parse(ctx.localStorage.getItem(SAVE_KEY));
    assert.equal(state.ageTicks,140);
    assert.equal(state.hunger,preset==='hungry'?40:80);
    assert.equal(state.energy,preset==='tired'?40:80);
    assert.equal(state.happiness,['sulky','wantsPlay'].includes(preset)?40:80);
    assert.equal(state.isSick,preset==='sick');
    assert.equal(state.deathMeter,preset==='critical'?80:preset==='weak'?60:0);
    assert.equal(state.isSleeping,preset==='sleeping');
  }
  let prevented=false;
  handler({target:{closest:()=>({getAttribute:()=>'?preset=happy'})},preventDefault(){prevented=true;}});
  assert.equal(prevented,false,'unsupported happy is not handled as a preset');
  assert.equal(frame.dataset.preset,'sleeping');
});

test('kitten preview seeds the real third stage in isolated storage and rejects unknown forms', () => {
  const html=buildPreview({form:'kitten',preset:'hungry'});
  const {state}=seededState(html);
  assert.equal(state.ageTicks,7*20);
  assert.equal(state.stageIndex,2);
  assert.equal(state.hunger,40);
  assert.match(html,/data-preview-form/);
  assert.throws(()=>buildPreview({form:'unknown'}),/Unknown preview form/);
});

test('otemba preview seeds the fourth stage in disposable storage', () => {
  const {state}=seededState(buildPreview({form:'otemba',preset:'wantsPlay'}));
  assert.equal(state.stageIndex,3);
  assert.equal(state.ageTicks,12*20);
  assert.equal(state.happiness,40);
});

test('young preview seeds the fifth stage in disposable storage', () => {
  const {state}=seededState(buildPreview({form:'young',preset:'wantsPlay'}));
  assert.equal(state.stageIndex,4);
  assert.equal(state.ageTicks,16*20);
  assert.equal(state.happiness,40);
});

test('calm preview seeds the seventh stage in disposable storage', () => {
  const {state}=seededState(buildPreview({form:'calm',preset:'wantsPlay'}));
  assert.equal(state.stageIndex,6);
  assert.equal(state.ageTicks,40*20);
  assert.equal(state.happiness,40);
});

test('elder preview seeds the eighth stage in disposable storage', () => {
  const {state}=seededState(buildPreview({form:'elder',preset:'wantsPlay'}));
  assert.equal(state.stageIndex,7);
  assert.equal(state.ageTicks,70*20);
  assert.equal(state.happiness,40);
});

test('toddler preview seeds the second stage in disposable storage', () => {
  const {state}=seededState(buildPreview({form:'toddler',preset:'wantsPlay'}));
  assert.equal(state.stageIndex,1);
  assert.equal(state.ageTicks,3*20);
  assert.equal(state.happiness,40);
});

test('baby preview seeds the first stage in disposable storage', () => {
  const {state}=seededState(buildPreview({form:'baby',preset:'wantsPlay'}));
  assert.equal(state.stageIndex,0);
  assert.equal(state.ageTicks,1*20);
  assert.equal(state.happiness,40);
});


test('adult dog preview uses isolated storage and the real sixth stage', () => {
  const {state}=seededState(buildPreview({form:'dogAdult',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,5);
  assert.equal(state.ageTicks,25*20);
  assert.equal(state.hunger,40);
});

test('query-selected dog matches the dropdown and can switch back to adult cat', () => {
  const html=buildPreview();
  const code=html.match(/<script id="cat-expression-preview-controls">([\s\S]*?)<\/script>/)[1];
  const frame={dataset:{},srcdoc:previewParts(html).gameHtml};
  let change;
  const select={value:'adult',addEventListener(type,fn){change=fn;}};
  const nav={addEventListener(){}};
  const document={querySelector:s=>s==='iframe'?frame:s==='nav'?nav:select};
  vm.runInNewContext(code,{document,URLSearchParams,window:{location:{search:'?form=dogAdult'}}});
  assert.equal(select.value,'dogAdult');
  change({target:{value:'adult'}});
  assert.equal(frame.dataset.form,'adult');
  const boot=previewParts(html).bootstrap;
  const ctx={Map,URLSearchParams,frameElement:frame,parent:{location:{search:'?form=dogAdult'}}};ctx.window=ctx;
  vm.runInNewContext(boot,ctx);
  assert.equal(JSON.parse(ctx.localStorage.getItem(SAVE_KEY)).speciesLine,'cat');
  change({target:{value:'dogAdult'}});
  vm.runInNewContext(boot,ctx);
  assert.equal(JSON.parse(ctx.localStorage.getItem(SAVE_KEY)).speciesLine,'dog');
});


test('puppy preview uses isolated storage and the real third stage', () => {
  const {state}=seededState(buildPreview({form:'puppy',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,2);
  assert.equal(state.ageTicks,7*20);
  assert.equal(state.hunger,40);
});


test('wanpaku preview uses isolated storage and the real fourth stage', () => {
  const {state}=seededState(buildPreview({form:'wanpaku',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,3);
  assert.equal(state.ageTicks,12*20);
  assert.equal(state.hunger,40);
});

test('young dog preview uses isolated storage and the real fifth stage', () => {
  const {state}=seededState(buildPreview({form:'youngDog',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,4);
  assert.equal(state.ageTicks,16*20);
  assert.equal(state.hunger,40);
});

test('calm dog preview uses isolated storage and the real seventh stage', () => {
  const {state}=seededState(buildPreview({form:'calmDog',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,6);
  assert.equal(state.ageTicks,40*20);
  assert.equal(state.hunger,40);
});

test('babyDog preview uses isolated storage and the correct age stage', () => {
  const {state}=seededState(buildPreview({form:'babyDog',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,0);
  assert.equal(state.ageTicks,1*20);
  assert.equal(state.hunger,40);
});

test('toddlerDog preview uses isolated storage and the correct age stage', () => {
  const {state}=seededState(buildPreview({form:'toddlerDog',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,1);
  assert.equal(state.ageTicks,3*20);
  assert.equal(state.hunger,40);
});

test('elderDog preview uses isolated storage and the correct age stage', () => {
  const {state}=seededState(buildPreview({form:'elderDog',preset:'hungry'}));
  assert.equal(state.speciesLine,'dog');
  assert.equal(state.stageIndex,7);
  assert.equal(state.ageTicks,70*20);
  assert.equal(state.hunger,40);
});

for (const species of ['man','woman','penguin','turtle','frog','clownfish','salmon','hermit_crab','jellyfish','starfish','coral','butterfly','beetle','stagbeetle','cicada','antlion']) {
  test(`${species} preview exposes every stage and never accesses real saves`, () => {
    const html=buildPreview({preset:'sick'});
    for (const [index,age] of [1,3,7,12,16,25,40,70].entries()) {
      const form=species+String(index+1).padStart(2,'0');
      assert.match(html,new RegExp(`value="${form}"`));
      const {run,state}=seededState(html,`?form=${form}`);
      assert.equal(state.speciesLine,species);
      assert.equal(state.stageIndex,index);
      assert.equal(state.ageTicks,age*20);
      assert.equal(state.isSick,true);
      assert.deepEqual(run.calls,[]);
      const h=harness();Object.assign(h.api.state(),state);
      h.get('storyFlash').classList.add('hidden');h.get('lifeCardOverlay').classList.add('hidden');
      h.api.render();h.api.saveState();h.api.render();
      assert.equal(h.api.state().stage,'growing');
      assert.match(h.get('petSprite').innerHTML,new RegExp(`expressions/${species}/${String(index+1).padStart(2,'0')}-sick.png`));
      assert.ok(h.get('storyFlash').classList.contains('hidden'));
    }
  });
}

test('salmon preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='salmon').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').salmon,names);
 const html=buildPreview({preset:'hungry',form:'salmon08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="salmon0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'salmon');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('hermit_crab preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='hermit_crab').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').hermit_crab,names);
 const html=buildPreview({preset:'hungry',form:'hermit_crab08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="hermit_crab0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'hermit_crab');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('jellyfish preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='jellyfish').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').jellyfish,names);
 const html=buildPreview({preset:'hungry',form:'jellyfish08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="jellyfish0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'jellyfish');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('starfish preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='starfish').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').starfish,names);
 const html=buildPreview({preset:'hungry',form:'starfish08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="starfish0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'starfish');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('coral preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='coral').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').coral,names);
 const html=buildPreview({preset:'hungry',form:'coral08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="coral0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'coral');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('butterfly preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='butterfly').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').butterfly,names);
 const html=buildPreview({preset:'hungry',form:'butterfly08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="butterfly0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'butterfly');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('beetle preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='beetle').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').beetle,names);
 const html=buildPreview({preset:'hungry',form:'beetle08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="beetle0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'beetle');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('stagbeetle preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='stagbeetle').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').stagbeetle,names);
 const html=buildPreview({preset:'hungry',form:'stagbeetle08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="stagbeetle0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'stagbeetle');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('cicada preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='cicada').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').cicada,names);
 const html=buildPreview({preset:'hungry',form:'cicada08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="cicada0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'cicada');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});

test('antlion preview uses all eight canonical stage names',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
 const names=Array.from(context.master.playerSpecies.normal.find(item=>item.id==='antlion').stages);
 assert.deepEqual(require('../tools/expression-stage-names.json').antlion,names);
 const html=buildPreview({preset:'hungry',form:'antlion08'});
 names.forEach((name,index)=>assert.match(html,new RegExp(`<option value="antlion0${index+1}"[^>]*>${name}</option>`)));
 const {state,run}=seededState(html);
 assert.equal(state.speciesLine,'antlion');
 assert.equal(state.stageIndex,7);
 assert.equal(state.hunger,40);
 assert.deepEqual(run.calls,[]);
});
