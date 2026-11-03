#!/usr/bin/env node
// Production World3D + Character3D browser contract QA. No candidate models.
// node tools/meguru-3d-qa/character-integration.cjs --out <directory>
// Browser is Chromium + SwiftShader, never physical iPhone evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { serve } = require('../character-3d/shot.cjs');
const { installSaveCounter, installAppearanceProbe, appearanceWindows } = require('../character-3d/runtime-integration.cjs');
const {placeCast,normalState,validateNormal}=require('./cast-fixture.cjs');
const ROOT = path.resolve(__dirname, '../..');
const REGIONS = ['home','city','countryside','forest','mountain','snow','sea','deepsea','river_lake','jungle','desert','star_stop','memory_lake'];
function makeSave(region = 'forest') {
  const h = require('../../tests/helpers/runtime-harness.cjs').harness({ deterministic: true, fullDisplay: true });
  const s = h.api.state(), life = require('../../life-stage-profiles.js');
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 3, ageTicks: (life.minsForLine('dog')[3] + .5) * 20, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: region });
  s.companions = ['shiba','cat_friend'].map(id => ({id,bond:100}));
  s.lifetime.companionsRecruited = ['shiba','cat_friend']; s.lifetime.regionsVisited = REGIONS.slice();
  return JSON.stringify(s);
}
function validateSample(s, characters = true, minimumBodies = 3) {
  assert.equal(s.is3D, true, 'World must remain 3D'); assert.equal(s.failed, false, 'renderer failure');
  assert.equal(s.player.ok, true, 'player body visibility ' + JSON.stringify(s.player));
  assert.equal(s.player.mode, characters ? '3d' : '2d', 'actual active player body');
  assert.equal(s.holders, s.stats.live, 'no orphan character holders');
  assert.equal(s.stats.created - s.stats.removed, s.stats.live, 'actor allocation balance');
  if (characters) { assert.ok(s.stats.live >= minimumBodies, 'required actual character bodies: '+minimumBodies); assert.equal(s.stats.failedTemplates, 0); }
  else assert.equal(s.stats.live, 0, 'character cleanup');
}
function validateReducedMotion(d) { assert.equal(d.reduced,true,'media preference'); assert.equal(d.cameraMotion,false,'application camera motion disabled'); assert.equal(d.animLevel,0,'character presenter uses reduced animation level'); }
function validateBoundary(p) { for (const key of ['state','storage','writes','getter']) assert.equal(p[key], true, 'presentation changed ' + key); }
function installProbe() {
  globalThis.__qa = {
    snapshot() { const b = globalThis.__meguruBridge; return { state: JSON.stringify(b.getState()), storage: JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))), writes: globalThis.__integrationSaveWrites, getter: b.getState }; },
    boundary(action) { const a=this.snapshot(); action(); const b=this.snapshot(); return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]===b[k]])); },
    sample() { const r=globalThis.__meguruRun, p=r.renderer.char3dPresenter; let holders=0; p?.scene?.traverse(o=>{if(o.name.startsWith('c3d-actor:'))holders++;}); return {region:r.world.regionId,is3D:r.renderer.is3D,failed:r.renderer.failed,player:r.renderer.playerVisible,stats:p?.stats(),holders,canvasCount:document.querySelectorAll('#meguruOverlay .meguru-3d-canvas').length}; }
  };
}
async function run(out) {
  fs.mkdirSync(out, {recursive:true});
  const result = { sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(), environment:'headless Chromium + SwiftShader software WebGL', physicalIPhone:'NOT_RUN', pixelOcclusion:'requires screenshot inspection; body/frustum checks alone are not pixel proof', checks:[], screenshots:[], errors:[], status:'RUNNING' };
  let browser, srv;
  const record = async (name, action) => { try {const detail=await action();result.checks.push({name,pass:true,detail});console.log('PASS '+name);} catch(e) {result.checks.push({name,pass:false,error:String(e.stack||e)});console.error('FAIL '+name+': '+e.message);} };
  try {
    browser = await require('playwright').chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM}:{}), args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
    result.browserVersion=browser.version(); srv=await serve(); const base='http://127.0.0.1:'+srv.address().port;
    async function open(query, reducedMotion='no-preference', save=makeSave()) {
      const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion});const page=await ctx.newPage();
      page.on('pageerror',e=>result.errors.push(String(e)));
      await page.addInitScript(installSaveCounter);await page.addInitScript(installAppearanceProbe);await page.addInitScript(installProbe);
      await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',s),save);
      await page.goto(base+'/index.html'+query);await page.locator('.device.ui-home-active').waitFor({timeout:60000});
      await page.locator('#travelBtn').click();await page.locator('#meguruEnterBtn').waitFor({state:'visible'});await page.locator('#meguruEnterBtn').click();await page.locator('#mgrCanvas').waitFor({state:'visible'});
      await page.waitForFunction(()=>!!globalThis.__meguruRun?.world,null,{timeout:60000});return page;
    }
    const page=await open('?perf=1');
    const ready=()=>page.waitForFunction(()=>{const r=globalThis.__meguruRun,p=r?.renderer.char3dPresenter;return r?.renderer.is3D&&p?.has(r.sim.player)&&r.party.every(a=>p.has(a));},null,{timeout:60000});
    const shot=async name=>{const file=name+'.png';await page.screenshot({path:path.join(out,file),clip:await page.locator('#mgrCanvas').boundingBox()});result.screenshots.push(file);};
    await record('initial production appearance / free life',async()=>{await ready();const normal=await page.evaluate(normalState);validateNormal(normal,2);const s=await page.evaluate(()=>__qa.sample());validateSample(s,true,1);await shot('forest-production');return {normal,sample:s,appearance:appearanceWindows(await page.evaluate(()=>__integrationAppearance))};});
    await record('explicit two-companion rendering fixture',async()=>{const fixture=await page.evaluate(placeCast);assert.deepEqual(fixture.keys.sort(),['companion:cat_friend','companion:shiba']);await ready();validateSample(await page.evaluate(()=>__qa.sample()));return fixture;});
    await record('player does not disappear over 120 rendered frames',async()=>{const samples=await page.evaluate(async()=>{const r=__meguruRun,out=[];let last=r.renderer.frames3d(),started=performance.now();while(out.length<120&&performance.now()-started<300000){await new Promise(requestAnimationFrame);const n=r.renderer.frames3d();if(n>last){last=n;out.push({...r.renderer.playerVisible});}}return out;});assert.equal(samples.length,120);for(const s of samples){assert.equal(s.ok,true,JSON.stringify(s));assert.equal(s.mode,'3d');}return {frames:samples.length,missFrames:samples.at(-1).missFrames,pixelVisibility:samples.at(-1).pixelVisibility};});
    await record('character 3D to 2D to 3D and save isolation',async()=>{const proofs=[];proofs.push(await page.evaluate(()=>__qa.boundary(()=>__meguruRun.renderer.setChar3D(false))));await page.waitForFunction(()=>__meguruRun.renderer.playerVisible.mode==='2d');const off=await page.evaluate(()=>__qa.sample());validateSample(off,false);await shot('forest-characters-2d');proofs.push(await page.evaluate(()=>__qa.boundary(()=>__meguruRun.renderer.setChar3D(true))));await ready();const on=await page.evaluate(()=>__qa.sample());validateSample(on);for(const p of proofs)validateBoundary(p);return {off,on,proofs};});
    await record('one actor failure retains other 3D actors',async()=>{const proof=await page.evaluate(()=>__qa.boundary(()=>__meguruRun.renderer.char3dHooks({failUpdate:a=>a.id==='shiba'})));validateBoundary(proof);await page.waitForFunction(()=>{const r=__meguruRun,p=r.renderer.char3dPresenter,a=r.party.find(a=>a.id==='shiba');return p.isBroken(a)&&!p.has(a)&&p.has(r.sim.player)&&p.has(r.party.find(a=>a.id==='cat_friend'));},null,{timeout:60000});const detail=await page.evaluate(()=>{const r=__meguruRun,p=r.renderer.char3dPresenter,a=r.party.find(a=>a.id==='shiba');const meshes=[];p.scene.traverse(o=>{if(o.isMesh&&o.visible&&o.material?.map&&Math.abs(o.position.x-a.x)<.01&&Math.abs(o.position.z+a.z)<.01)meshes.push(o);});return {sample:__qa.sample(),visibleFallbackBillboards:meshes.length};});assert.equal(detail.sample.is3D,true);assert.equal(detail.sample.failed,false);assert.ok(detail.visibleFallbackBillboards>0,'broken actor has an actual visible textured 2D mesh');await shot('forest-shiba-fallback');await page.evaluate(()=>{__meguruRun.renderer.char3dHooks({});__meguruRun.enterWorld('forest');});await page.evaluate(placeCast);await ready();return {proof,...detail,recovery:'new regional actor identities; broken actor identity remains fail-safe'};});
    // Regional changes are placement operations. Only synchronous draw/toggle boundaries
    // are claimed save-neutral; normal app discovery/travel writes remain observable.
    for(const region of REGIONS) await record('regional scene '+region,async()=>{
      await page.evaluate(region=>{const r=__meguruRun;globalThis.__oldHolders=[];r.renderer.char3dPresenter.scene.traverse(o=>{if(o.name.startsWith('c3d-actor:'))__oldHolders.push(o);});__meguruBridge.getState().regionId=region;r.enterWorld(region);},region);
      const normal=await page.evaluate(normalState);validateNormal(normal,2);await page.evaluate(placeCast);
      await ready();await page.waitForFunction(()=>__oldHolders.every(o=>!o.parent),null,{timeout:60000});const s=await page.evaluate(()=>({...__qa.sample(),oldDetached:__oldHolders.every(o=>!o.parent)}));validateSample(s);assert.equal(s.region,region);assert.equal(s.oldDetached,true,'old-region holders removed');assert.equal(s.canvasCount,1);await shot('region-'+region);return s;
    });
    await record('terrain groundY matches actual holder at slope and crossing samples',async()=>{
      await page.evaluate(()=>{__meguruBridge.getState().regionId='forest';__meguruRun.enterWorld('forest');});await page.evaluate(placeCast);await ready();
      const rows=await page.evaluate(async()=>{
        const {terrainGrid}=await import('/meguru-3d.mjs'),M=installNaotocchiMeguru(__meguruBridge),r=__meguruRun,rd=r.renderer,p=rd.char3dPresenter;
        const terr=terrainGrid(r.world,M,M.worldObjects3d(r.world).objects),spots=[...r.world.spots.slice(0,3),...terr.crossings];
        let slope=null;for(let z=200;z<r.world.len&&!slope;z+=160)for(let x=-r.world.halfW+160;x<r.world.halfW;x+=160)if(Math.abs(terr.walkY(x,z))>1){slope={x,z};break;}if(slope)spots.push(slope);
        const out=[],draw=rd.draw.bind(rd),a=r.sim.player,old={x:a.x,z:a.z};
        for(const q of spots){a.x=q.x;a.z=q.z;const proof=__qa.boundary(()=>draw(r.sim.view(),performance.now()));const actual=p.instanceOf(a)?.holder.position.y,expected=terr.walkY(a.x,a.z);let billboard=null;const billboardProof=__qa.boundary(()=>{rd.setChar3D(false);draw(r.sim.view(),performance.now());p.scene.traverse(m=>{if(m.isMesh&&m.visible&&m.userData.tex&&Math.abs(m.position.x-a.x)<1e-6&&Math.abs(m.position.z+a.z)<1e-6)billboard={y:m.position.y,pad:m.userData.tex.pad,size:M.ACTOR_SIZE,lift:a.moving||a.behavior==='walk'?Math.abs(Math.sin((a.bob||0)*5))*M.ACTOR_SIZE*.08:0};});rd.setChar3D(true);draw(r.sim.view(),performance.now());});out.push({x:a.x,z:a.z,expected,actual,proof,billboard,billboardProof});}Object.assign(a,old);draw(r.sim.view(),performance.now());return {rows:out,slope:!!slope,crossings:terr.crossings.length};
      });assert.ok(rows.rows.length>=3);assert.equal(rows.slope,true,'nonzero terrain height sampled');assert.ok(rows.crossings>0,'actual stream/bridge crossing sampled');for(const q of rows.rows){assert.ok(Math.abs(q.expected-q.actual)<1e-6,JSON.stringify(q));validateBoundary(q.proof);validateBoundary(q.billboardProof);assert.ok(q.billboard,'actual fallback billboard exists');assert.ok(Math.abs(q.billboard.y+q.billboard.pad*q.billboard.size-q.billboard.lift-q.expected)<1e-6,'2D fallback shares terrain plane');}return rows;
    });
    await record('corridor production views retain 3D player and cleanup',async()=>{
      const detail=await page.evaluate(async()=>{
        const r=__meguruRun,rd=r.renderer,M=installNaotocchiMeguru(__meguruBridge),spec=M.walkCorridorSpec('home|forest'),walk=M.createCorridorWalk(spec,'home',{party:r.party.map(a=>({...a})),env:r.sim.env,firstVisit:false});
        const samples=[],draw=rd.draw.bind(rd);for(const f of [0,.25,.5,.75,1]){walk.state.s=spec.walkLength*f;walk.step(0,{x:0,y:0});const proof=__qa.boundary(()=>{for(let i=0;i<5;i++)draw(walk.view(),performance.now()+i);});samples.push({fraction:f,proof,sample:__qa.sample()});}
        const old=[];rd.char3dPresenter.scene.traverse(o=>{if(o.name.startsWith('c3d-actor:'))old.push(o);});const proof=__qa.boundary(()=>{for(let i=0;i<5;i++)draw(r.sim.view(),performance.now()+i);});return {samples,restored:__qa.sample(),oldDetached:old.every(o=>!o.parent),proof,scope:'production corridor views at five positions; not a physical input/travel commit test'};
      });for(const q of detail.samples){validateSample(q.sample);validateBoundary(q.proof);}validateSample(detail.restored);validateBoundary(detail.proof);assert.equal(detail.oldDetached,true);return detail;
    });
    await page.context().close();
    await record('explicit 27-actor fixture and portrait-landscape cleanup',async()=>{
      const h=require('../../tests/helpers/runtime-harness.cjs').harness({deterministic:true});
      const save=JSON.parse(makeSave());
      const ids=[...h.api.normalCompanions,...h.api.rareCompanions].map(c=>c.id);
      assert.equal(ids.length,26);save.companions=ids.map(id=>({id,bond:100}));save.lifetime.companionsRecruited=ids;
      const pg=await open('', 'no-preference', JSON.stringify(save));
      try{
        const normal=await pg.evaluate(normalState);validateNormal(normal,26);const fixture=await pg.evaluate(placeCast);assert.equal(fixture.count,26);
        await pg.waitForFunction(()=>{const r=__meguruRun,p=r.renderer.char3dPresenter;return r.party.length===26&&p?.has(r.sim.player)&&r.party.every(a=>p.has(a));},null,{timeout:120000});
        const samples=[];
        for(const viewport of [{width:844,height:390},{width:390,height:844}]){
          await pg.setViewportSize(viewport);
          const sample=await pg.evaluate(async()=>{const r=__meguruRun,rd=r.renderer,start=rd.frames3d();while(rd.frames3d()-start<30)await new Promise(requestAnimationFrame);return {party:r.party.length,player:rd.playerVisible,failed:rd.failed,canvasCount:document.querySelectorAll('#meguruOverlay .meguru-3d-canvas').length,stats:rd.char3dPresenter.stats(),frames:rd.frames3d()-start};});
          assert.equal(sample.party+1,27);assert.equal(sample.player.mode,'3d');assert.equal(sample.player.ok,true);assert.equal(sample.failed,false);assert.equal(sample.canvasCount,1);samples.push({viewport,...sample});
        }
        await pg.screenshot({path:path.join(out,'fixture-27-actors.png')});result.screenshots.push('fixture-27-actors.png');
        await pg.locator('#mgrHome').click();assert.equal(await pg.locator('#meguruOverlay .meguru-3d-canvas').count(),0);
        return {normal,fixture,samples,physicalIPhone:'NOT_RUN',RAM:'NOT_MEASURED',performanceComparison:'NOT_MEASURED'};
      }finally{await pg.context().close();}
    });
    for(const mode of [
      {name:'no flags',query:'',world:true,char:true},
      {name:'explicit legacy 2D',query:'?meguru3d=0',world:false,char:false},
      {name:'character flag only',query:'?char3d=1',world:true,char:true},
      {name:'world only',query:'?meguru3d=1&char3d=0&perf=1',world:true,char:false},
      {name:'forced 2D',query:'?meguru3d=1&char3d=1&m3d2d=1&perf=1',world:false,char:false},
      {name:'reduced motion',query:'?meguru3d=1&char3d=1&perf=1',world:true,char:true,reduced:'reduce'}
    ]) await record('URL flags / '+mode.name,async()=>{const pg=await open(mode.query,mode.reduced);try{if(mode.world)await pg.waitForFunction(want=>{const r=__meguruRun;return r.renderer.is3D&&(!want||r.renderer.char3dPresenter?.has(r.sim.player));},mode.char,{timeout:60000});const d=await pg.evaluate(()=>{const r=__meguruRun;return {world:!!r.renderer.is3D,char:!!r.renderer.char3dPresenter?.has(r.sim.player),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,cameraMotion:r.sim.cameraMotion,animLevel:r.renderer.char3dPresenter?.animLevel};});assert.equal(d.world,mode.world);assert.equal(d.char,mode.char);if(mode.reduced)validateReducedMotion(d);return d;}finally{await pg.context().close();}});
    result.status=result.checks.every(c=>c.pass)&&!result.errors.length?'PASS':'FAIL';
  } catch(e) {result.status=browser?'FAIL':'BLOCKED';result.blocker=String(e.stack||e);} finally {if(browser)await browser.close();if(srv)await new Promise(resolve=>srv.close(resolve));fs.writeFileSync(path.join(out,'character-integration.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(result.status);return result;
}
module.exports={REGIONS,makeSave,validateSample,validateBoundary,validateReducedMotion,run};
if(require.main===module){const i=process.argv.indexOf('--out'),out=i>=0?process.argv[i+1]:path.join(ROOT,'docs/qa/world-character-integration-20261012/browser');run(out).then(r=>{if(r.status!=='PASS')process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
