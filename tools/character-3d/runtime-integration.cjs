// Existing real-world QA fixtures; production spec only, no image capture or stand-ins.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.resolve(__dirname, '../..');
function functionalRows(SPEC, { requireFull = false, keys = [] } = {}) {
  assert.ok(!requireFull || !keys.length, 'full sweep cannot filter roles');
  const inventory = require('./inventory.cjs').auditInventory(ROOT, undefined, { assets: [] }).active.filter(r => r.kind !== 'form').map(r => ({ ...r, key: r.kind + ':' + r.id }));
  assert.equal(inventory.length, 45, 'master nonplayer inventory45');
  for (const key of keys) assert.ok(inventory.some(r => r.key === key), 'unknown production role ' + key);
  const rows = [], missing = [];
  for (const row of inventory) {
    const specKey = SPEC.specKeyFor({ kind: row.kind === 'author' ? 'naoto' : row.kind, id: row.id });
    if (!specKey || !specKey.exact || specKey.stage !== 0 || !SPEC.stageSpec(specKey.id, 0)) missing.push(row.key);
    else {
      const modelId = row.kind === 'companion' && ['shiba','cat_friend'].includes(row.id) ? row.id : row.key;
      assert.equal(specKey.id, modelId, 'exact production role model ' + row.key);
      assert.equal(SPEC.referenceAsset(modelId,0), row.asset, 'exact production role source ' + row.key);
      if (!keys.length || keys.includes(row.key)) rows.push({ ...row, specKey });
    }
  }
  for (const key of keys) assert.ok(rows.some(r => r.key === key), 'role lacks exact production model ' + key);
  assert.ok(!requireFull || rows.length === 45 && !missing.length, 'all45 production roles required; missing ' + missing.join(','));
  return { inventory, rows, missing, requireFull };
}
function validateFunctional(row, r) {
  assert.equal(r.candidateOnly, false, 'production route cannot use candidate overlay');
  assert.equal(r.roleKey, row.key, 'production role identity');
  assert.equal(r.actorIdentity.kind, row.kind === 'author' ? 'naoto' : row.kind, 'actual role identity');
  assert.equal(r.actorIdentity.id, row.id, 'actual role identity');
  assert.equal(r.actorIdentity.key, row.kind === 'author' ? 'naoto' : row.key, 'actual role key identity');
  assert.equal(r.actorIdentity.asset, row.asset, 'actual source identity');
  assert.equal(r.specKey?.id, row.specKey.id, 'exact production model');
  assert.equal(r.specKey?.stage, 0, 'exact production stage0');
  assert.equal(r.specKey?.exact, true, 'exact production lookup');
  assert.equal(r.template?.id, row.specKey.id, 'exact live template');
  assert.equal(r.template?.stage, 0, 'exact live template stage0');
  assert.ok(r.live3d && r.holderAttached, 'actual actor holder attached and live');
  assert.equal(r.stats.fallbacks, 0, 'unexplained fallback');
  assert.equal(r.stats.failedTemplates, 0, 'failed production template');
  for (const [key, ok] of Object.entries(r.unchanged)) assert.equal(ok, true, 'unchanged ' + key);
  for (const key of ['save','getter','saveWrites']) assert.equal(r.unchanged[key], true, 'unchanged ' + key);
  if(r.boundaries)for(const proof of r.boundaries)for(const key of ['save','storage','getter','saveWrites'])assert.equal(proof[key],true,'dirty presentation boundary '+proof.label+' '+key);
  if (row.kind === 'author') {
    assert.equal(r.actorIdentity.key, 'naoto', 'actual author key');
    for (const key of ['natural2D','sameActor','restoredActor','restoredPose','restoredDraw','restoredStep','restoredList']) assert.equal(r.author?.[key], true, 'actual author ' + key);
    assert.equal(r.author.qaRegion, 'forest', 'bounded author QA forest only');
  }
}
const PLATEAU = ['templates', 'materials', 'atlases', 'eyeGeos', 'textures', 'geometries'];
function validateRepeated(r) {
  assert.equal(r.cycles, 3, 'declared bounded repeated cycles');
  assert.equal(r.samples.length, r.cycles, 'complete repeated samples');
  for (const sample of r.samples) {
    for (const state of ['off','city']) { assert.equal(sample[state].live, 0, state + ' cleanup'); assert.equal(sample[state].holders, 0, state + ' holder cleanup'); }
    assert.equal(sample.city.is3D, false, 'city natural2D');
    assert.equal(sample.forest.is3D, true, 'forest 3D restored');
    assert.equal(sample.forest.live, sample.forest.holders, 'forest holder/live balance');
    assert.equal(sample.forest.live, r.before.live, 'same fixture actor count');
    assert.equal(sample.forest.fallbacks, 0, 'repeat fallback0');
    assert.equal(sample.forest.failedTemplates, 0, 'repeat failed templates0');
    for (const key of PLATEAU) assert.equal(sample.forest[key], r.before[key], 'warm resource plateau ' + key);
  }
  for (const key of PLATEAU) assert.equal(r.after[key], r.before[key], 'final warm resource plateau ' + key);
  assert.equal(r.after.created - r.after.removed, r.after.live, 'created/removed/live balance');
  for (const key of ['save','storage','getter','saveWrites']) assert.equal(r.unchanged[key], true, 'unchanged ' + key);
  for (const key of ['step','region']) assert.equal(r.restored[key], true, 'restored ' + key);
}
// Read-only causal proof: ordinary app tasks cannot interleave a synchronous boundary.
function saveDelta(before, after, prefix = '') {
  if (Object.is(before,after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().flatMap(key => saveDelta(before[key],after[key],prefix ? prefix+'.'+key : key));
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{path:prefix,before,after}];
}
function saveSnapshot(bridge, observer) { return {state:JSON.stringify(bridge.getState()),storage:JSON.stringify(observer.storage()),writes:observer.writes(),getter:bridge.getState}; }
function observeSaveBoundary(bridge, observer, action, label) {
  const before=saveSnapshot(bridge,observer);let value,proof;
  try { value=action(); } finally {
    const after=saveSnapshot(bridge,observer);proof={label,save:before.state===after.state,storage:before.storage===after.storage,getter:before.getter===after.getter,saveWrites:before.writes===after.writes,beforeWrites:before.writes,afterWrites:after.writes,delta:observer.delta(JSON.parse(before.state),JSON.parse(after.state)),storageDelta:observer.delta(JSON.parse(before.storage),JSON.parse(after.storage))};
    observer.record(proof);
  }
  return {value,proof};
}
function recordFunctionalResult(results,row,result,validate=validateFunctional) {
  results.push(result);
  try { assert.ok(result.boundaries?.length,'synchronous presentation boundary proof required');validate(row,result);result.validation={pass:true}; }
  catch(e) { result.validation={pass:false,error:String(e.message||e)};throw new Error(row.key+': '+e.message,{cause:e}); }
}
// Observe normal storage calls; never suppress or rewrite them.
function installSaveCounter() {
  const original = Storage.prototype.setItem;
  globalThis.__integrationSaveWrites = 0;globalThis.__integrationSaveEvents=[];
  Storage.prototype.setItem = function(key, value) { if (String(key).startsWith('naotocchi-save')) {globalThis.__integrationSaveWrites++;if(globalThis.__integrationSaveEvents.length<256)globalThis.__integrationSaveEvents.push({key:String(key),timestampMs:performance.now(),stack:new Error('observed save call').stack});} return original.call(this, key, value); };
}
async function functionalRun(out, args = []) {
  assert.ok(!args.some(a => a.startsWith('--candidate')), 'production route cannot request candidate overlay');
  const SPEC = require('../../character-3d/spec.js');
  const plan = functionalRows(SPEC, { requireFull: args.includes('--require-full'), keys: args.find(a => a.startsWith('--keys='))?.slice(7).split(',') || [] });
  const { saveFor, stageAuthorResident, distanceActor } = require('./nonplayer-review.cjs');
  const srv = await require('./shot.cjs').serve(); // No candidate factory or historical revision.
  let browser;
  try { browser = await require('playwright').chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); } catch (e) { srv.close(); throw e; }
  const results = [], errors = [], failures = [];let activeRole=null;
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const row of plan.rows) {
      activeRole=row.key;console.log('functional role START '+row.key);
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }), pg = await ctx.newPage();
      pg.on('pageerror', e => errors.push(String(e)));
      await pg.addInitScript(installSaveCounter);
      await pg.addInitScript({ content: 'globalThis.__stageAuthorResident=' + stageAuthorResident.toString() + ';globalThis.__distanceActor=' + distanceActor.toString() + ';globalThis.saveDelta='+saveDelta.toString()+';globalThis.saveSnapshot='+saveSnapshot.toString()+';globalThis.observeSaveBoundary='+observeSaveBoundary.toString()+';' });
      await pg.addInitScript(s => localStorage.setItem('naotocchi-save-v1', s), saveFor(row));
      let result,primaryError;
      try {
        await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html?meguru3d=1&char3d=1&perf=1');
        await pg.locator('.device.ui-home-active').waitFor({ timeout: 60000 });
        await pg.locator('#travelBtn').click(); await pg.locator('#meguruEnterBtn').waitFor({ state: 'visible' }); await pg.locator('#meguruEnterBtn').click(); await pg.locator('#mgrCanvas').waitFor({ state: 'visible' });
        if (row.kind === 'author') {
          await pg.waitForFunction(() => globalThis.__meguruRun?.world.residents.some(a => a.kind === 'naoto') && globalThis.__meguruRun.renderer.is3D === false, null, { timeout: 60000 });
          await pg.evaluate(() => {
            const run = globalThis.__meguruRun, bridge = globalThis.__meguruBridge, actor = run.world.residents.find(a => a.kind === 'naoto');
            const audit=globalThis.__integrationAudit={boundaries:[]},observer=audit.observer={writes:()=>globalThis.__integrationSaveWrites,storage:()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('naotocchi-save')).sort().map(k=>[k,localStorage.getItem(k)])),delta:saveDelta,record(proof){this.last=proof;audit.boundaries.push(proof);}};
            globalThis.__integrationAuthor = { actor, list: [...run.world.residents], draw: run.renderer.draw, step: run.sim.step, pose: Object.fromEntries(['x','z','tx','tz','heading','route','behavior','until'].map(k => [k, actor[k]])), spanBefore:saveSnapshot(bridge,observer),eventStart:globalThis.__integrationSaveEvents.length,natural2D: !run.renderer.is3D };
            globalThis.__authorStage = observeSaveBoundary(bridge,observer,()=>globalThis.__stageAuthorResident(run,bridge,globalThis.installNaotocchiMeguru(bridge)),'author-stage-entry').value;
            const adapter=run.renderer.draw;
            run.renderer.draw=function(view,now){return observeSaveBoundary(bridge,observer,()=>adapter.call(this,view,now),'author-staged-draw').value;};
          });
        }
        await pg.waitForFunction(row => { const run = globalThis.__meguruRun, actor = run && globalThis.__distanceActor(run, row, globalThis.__authorStage); return actor && run.renderer.char3dPresenter?.has(actor); }, row, { timeout: 60000 });
        result = await pg.evaluate(async row => {
          const SPEC = (await import('/character-3d/spec-esm.mjs')).default, run = globalThis.__meguruRun, bridge = globalThis.__meguruBridge, p = run.renderer.char3dPresenter, a = globalThis.__distanceActor(run, row, globalThis.__authorStage), inst = p.instanceOf(a);
          const audit=globalThis.__integrationAudit||(globalThis.__integrationAudit={boundaries:[]}),observer=audit.observer||(audit.observer={writes:()=>globalThis.__integrationSaveWrites,storage:()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('naotocchi-save')).sort().map(k=>[k,localStorage.getItem(k)])),delta:saveDelta,record(proof){this.last=proof;audit.boundaries.push(proof);}});
          observeSaveBoundary(bridge,observer,()=>run.renderer.draw(run.sim.view(),performance.now()),'functional-final-draw');
          const r = { roleKey: row.key, candidateOnly: false, actorIdentity: { key:a.key, kind:a.kind, id:a.id, asset:a.asset }, specKey: SPEC.specKeyFor(a), template: { id:inst.tpl.id, stage:inst.tpl.stage }, live3d:p.has(a), holderAttached:!!inst.holder.parent, stats:p.stats(),boundaries:audit.boundaries,unchanged:{},author:null };
          if (row.kind === 'author') {
            const before = globalThis.__integrationAuthor, stage = globalThis.__authorStage;
            r.author = { ...stage.provenance, natural2D: before.natural2D, sameActor: a === before.actor && stage.actor === a, qaRegion: stage.sim.world.regionId };
            observeSaveBoundary(bridge,observer,()=>stage.release(),'author-stage-release');globalThis.__authorStage=null;
            Object.assign(r.author, { restoredActor: run.world.residents.includes(a), restoredPose: Object.keys(before.pose).every(k => Object.is(a[k], before.pose[k])), restoredDraw: run.renderer.draw === before.draw, restoredStep: run.sim.step === before.step, restoredList: run.world.residents.length === before.list.length && before.list.every((v,i) => run.world.residents[i] === v) });
            const after=saveSnapshot(bridge,observer);
            r.applicationInterval={scope:'Observed async interval outside synchronous presentation boundaries; changes are not a no-write claim',beforeWrites:before.spanBefore.writes,afterWrites:after.writes,delta:saveDelta(JSON.parse(before.spanBefore.state),JSON.parse(after.state)),storageDelta:saveDelta(JSON.parse(before.spanBefore.storage),JSON.parse(after.storage)),saveCalls:globalThis.__integrationSaveEvents.slice(before.eventStart)};
          }
          r.saveCounters={before:r.boundaries[0].beforeWrites,after:r.boundaries.at(-1).afterWrites};
          for(const key of ['save','storage','getter','saveWrites'])r.unchanged[key]=r.boundaries.every(proof=>proof[key]);
          return r;
        }, row);
        recordFunctionalResult(results,row,result);console.log('functional role PASS '+row.key);
      } catch(e) { primaryError=e;if(!result){result={roleKey:row.key,validation:{pass:false,error:String(e.message||e)},phase:'readiness-or-evaluate'};try{Object.assign(result,await pg.evaluate(()=>{const audit=globalThis.__integrationAudit,before=globalThis.__integrationAuthor?.spanBefore,after=before&&saveSnapshot(globalThis.__meguruBridge,audit.observer);return {boundaries:audit?.boundaries||[],saveCalls:globalThis.__integrationSaveEvents||[],applicationInterval:before?{delta:saveDelta(JSON.parse(before.state),JSON.parse(after.state)),storageDelta:saveDelta(JSON.parse(before.storage),JSON.parse(after.storage)),beforeWrites:before.writes,afterWrites:after.writes}:null};}));}catch(diagnosticError){result.diagnosticError=String(diagnosticError.message||diagnosticError);}results.push(result);}throw e; } finally {
        try { const cleanup=await pg.evaluate(() => {if(!globalThis.__authorStage)return null;const audit=globalThis.__integrationAudit;const proof=observeSaveBoundary(globalThis.__meguruBridge,audit.observer,()=>globalThis.__authorStage.release(),'author-failure-release').proof;globalThis.__authorStage=null;return proof;});if(cleanup){result.cleanupBoundary=cleanup;for(const key of ['save','storage','getter','saveWrites'])assert.equal(cleanup[key],true,'dirty failure release '+key);} } catch(cleanupError) { failures.push(row.key+': cleanup '+String(cleanupError.message||cleanupError));if(!primaryError)throw cleanupError; } finally { await ctx.close(); }
      }
    }
    assert.deepEqual(errors, [], 'no production browser errors');
  } catch(e) { failures.push(activeRole+': '+String(e.message||e));throw e; } finally {
    await browser.close(); srv.close();
    fs.writeFileSync(path.join(out, 'production-nonplayer.json'), JSON.stringify({ sourceCommit:process.env.GITHUB_SHA || null, productionOnly:true, candidateOnly:false, capture:false, required:45, requireFull:plan.requireFull, checked:results.filter(r=>r.validation?.pass).length,attempted:results.length,failingRole:results.find(r=>r.validation?.pass===false)?.roleKey||null, missing:plan.missing, rows:results, errors, failures, verdict:{pass:results.length===plan.rows.length&&results.every(r=>r.validation?.pass)&&!errors.length&&!failures.length,final45:plan.requireFull&&results.filter(r=>r.validation?.pass).length===45&&!errors.length&&!failures.length}, measurements:{animationOnlyCpuMs:null,firstAppearanceHitchMs:null,note:'Presenter CPU and build stats are aggregate; functional readiness is not a hitch measurement.'} }, null, 2));
  }
  assert.equal(results.length, plan.rows.length, 'complete requested production sweep');
  console.log('production role functional PASS', results.length + '/45; missing=' + plan.missing.join(','));
}
module.exports = { functionalRows, validateFunctional, validateRepeated, installSaveCounter, functionalRun, saveDelta, saveSnapshot, observeSaveBoundary, recordFunctionalResult };
// Runs in the existing Meguru scene. Warm once, then compare three identical cycles.
async function repeatScene(page) {
  return page.evaluate(async () => {
    const run = globalThis.__meguruRun, rd = run.renderer, p = rd.char3dPresenter, bridge = globalThis.__meguruBridge, getter = bridge.getState, state = getter(), region = state.regionId, save = JSON.stringify(state), step = run.sim.step;
    const storage = () => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('naotocchi-save')).sort().map(k => [k,localStorage.getItem(k)]));
    const raw = JSON.stringify(storage()), writes = globalThis.__integrationSaveWrites;
    const raf = () => new Promise(requestAnimationFrame), wait = async (fn, max = 240) => { for(let i=0;i<max;i++){await raf();if(fn())return;}throw Error('repeated scene readiness timeout'); };
    const snapshot = () => { let holders=0;p.scene?.traverse(o=>{if(o.name?.startsWith('c3d-actor:'))holders++;});const st=rd.stats3d();return {...p.stats(),holders,is3D:rd.is3D,textures:st?.textures,geometries:st?.geometries,heapBytes:performance.memory?.usedJSHeapSize||null}; };
    const fixtureCount = p.stats().live;
    const cycle = async () => {
      rd.setChar3D(false); await wait(()=>p.stats().live===0); const off=snapshot();
      rd.setChar3D(true); await wait(()=>p.stats().live===fixtureCount);
      state.regionId='city';run.enterWorld('city');await wait(()=>run.world.regionId==='city'&&!rd.is3D);const city=snapshot();
      state.regionId='forest';run.enterWorld('forest');await wait(()=>run.world.regionId==='forest'&&rd.is3D&&p.stats().live===fixtureCount);
      for(let i=0;i<8;i++)await raf();return {off,city,forest:snapshot()};
    };
    const result={cycles:3,warmup:null,before:null,after:null,samples:[],unchanged:{},restored:{}};
    try {
      // Hold this QA simulation during the renderer/region proof; no game save/getter replacement.
      run.sim.step=function(){return [];};
      result.warmup=await cycle();result.before=snapshot();
      for(let i=0;i<3;i++)result.samples.push(await cycle());result.after=snapshot();
    } finally {
      run.sim.step=step;state.regionId=region;if(run.world.regionId!==region)run.enterWorld(region);
      result.saveCounters={before:writes,after:globalThis.__integrationSaveWrites};
      result.unchanged={save:save===JSON.stringify(getter()),storage:raw===JSON.stringify(storage()),getter:getter===bridge.getState,saveWrites:writes===globalThis.__integrationSaveWrites};
      result.restored={step:run.sim.step===step,region:run.world.regionId===region&&state.regionId===region};
    }
    return result;
  });
}
module.exports.repeatScene = repeatScene;
// QA-only frame observations; these intervals are not isolated build or animation CPU.
function installAppearanceProbe() {
  globalThis.__integrationAppearance = [];
  const started = performance.now(); let last = started, firstSeen = null;
  function frame(now) {
    const p = globalThis.__meguruRun?.renderer.char3dPresenter, s = p?.stats();
    if(s&&firstSeen===null)firstSeen=now;
    if (s) globalThis.__integrationAppearance.push({ timestampMs:now, intervalMs:now-last, live:s.live, created:s.created, templates:s.templates, built:s.built });
    last=now;if(now-started<120000&&(firstSeen===null||now-firstSeen<30000))requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function appearanceWindows(samples) {
  const windows=[];
  for(let i=0;i<samples.length;i++) {
    const now=samples[i],prev=samples[i-1];
    if(now.live>0&&(!prev||now.created>prev.created||now.templates>prev.templates||now.built>prev.built)) {
      const neighbors=samples.slice(Math.max(0,i-1),i+2);
      windows.push({timestampMs:now.timestampMs,live:now.live,created:now.created,templates:now.templates,built:now.built,frames:neighbors,maxIntervalMs:Math.max(...neighbors.map(s=>s.intervalMs))});
    }
  }
  return {label:'Observed appearance-window RAF intervals, including neighbor frames; not isolated first-build CPU',sampleCount:samples.length,windows,maxAppearanceWindowIntervalMs:windows.length?Math.max(...windows.map(w=>w.maxIntervalMs)):null};
}
async function isolatedAnimation(page) {
  return page.evaluate(async () => {
    const {instantiate,disposeInstance}=await import('/character-3d/runtime.mjs'),{animate}=await import('/character-3d/animate.mjs'),r=globalThis.__meguruRun,p=r.renderer.char3dPresenter,actors=[r.sim.player,...r.party],live=actors.map(a=>p.instanceOf(a));
    if(live.some(a=>!a))throw Error('Isolated animation needs every declared actual live template');
    const snapshot=()=>JSON.stringify(live.map(a=>({anim:a.anim,bones:Object.fromEntries(Object.entries(a.bones).map(([k,b])=>[k,{p:b.position.toArray(),r:b.rotation.toArray(),s:b.scale.toArray()}]))}))),before=snapshot(),clones=[],samples=[],composition={};
    try {
      for(const [i,a]of live.entries()){clones.push(instantiate(a.tpl,i));const key=a.tpl.id+':'+a.tpl.stage;composition[key]=(composition[key]||0)+1;}
      const frame=()=>{for(const a of clones)animate(a,{dt:1/60,moving:true,animLv:2});};
      for(let i=0;i<30;i++)frame();
      for(let i=0;i<120;i++){const start=performance.now();frame();samples.push(performance.now()-start);}
      const sorted=[...samples].sort((a,b)=>a-b);
      return {label:'Isolated QA animate() on clones of the actual declared templates; not main render CPU',actors:clones.length,warmupFrames:30,measuredFrames:120,dtSeconds:1/60,moving:true,animLevel:2,composition,samplesMs:samples,avgFrameMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95FrameMs:sorted[Math.floor(sorted.length*.95)],liveActorsUnchanged:before===snapshot()};
    } finally {for(const a of clones)disposeInstance(a);}
  });
}
module.exports.installAppearanceProbe=installAppearanceProbe;
module.exports.appearanceWindows=appearanceWindows;
module.exports.isolatedAnimation=isolatedAnimation;
