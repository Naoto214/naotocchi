// Isolated browser save; production world/bridge/presenter/fallback, no AI changes.
const fs=require('fs'),assert=require('node:assert/strict');
const {serve}=require('./shot.cjs'),{makeSave}=require('../meguru-3d-qa/character-integration.cjs');
(async()=>{
 const out='docs/qa/expression-complete-20261016',server=await serve();let browser;
 const result={environment:'Chromium software WebGL, isolated fixture save; not iPhone',checks:[],errors:[]};
 try{
 browser=await require('playwright').chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 page.on('pageerror',e=>result.errors.push(String(e)));
 const save=JSON.parse(makeSave());save.hunger=0;save.companions[0].bond=29;
 await page.addInitScript(s=>{
  localStorage.setItem('naotocchi-save-v1',s);
  Object.defineProperty(window,'installNaotocchiMeguru',{configurable:true,set(fn){Object.defineProperty(window,'installNaotocchiMeguru',{configurable:true,writable:true,value:function(...args){const m=fn(...args);window.__expressionModule=m;return m;}});}});
 },JSON.stringify(save));
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?perf=1');
 await page.locator('.device.ui-home-active').waitFor({timeout:60000});await page.locator('#travelBtn').click();await page.locator('#meguruEnterBtn').click();
 await page.waitForFunction(()=>{const r=window.__meguruRun,p=r?.renderer.char3dPresenter;return p?.has(r.sim.player)&&r.party.every(a=>p.has(a));},null,{timeout:120000});
 const snapshot=()=>page.evaluate(()=>{const r=__meguruRun,p=r.renderer.char3dPresenter;return {player:{expression:r.sim.player.expr,rendered:p.instanceOf(r.sim.player)?.anim.emotion},party:r.party.map(a=>({id:a.id,expression:a.expr,rendered:p.instanceOf(a)?.anim.emotion})),animLevel:p.animLevel};});
 let s=await snapshot();assert.equal(s.player.rendered,'hungry');assert.equal(s.party.find(a=>a.id==='shiba').rendered,'lonely');assert.equal(s.animLevel,0);result.checks.push({name:'live care, low bond and reduced motion',detail:s});
 await page.screenshot({path:out+'/world-hungry-lonely.png'});
 for(const [values,emotion] of [[{hunger:85,health:25},'weak'],[{health:100,deathMeter:80},'critical'],[{isSleeping:true},'sleeping'],[{isSleeping:false,deathMeter:0},'normal']]){
  await page.evaluate(v=>Object.assign(__meguruBridge.getState(),v),values);
  await page.waitForFunction(e=>__meguruRun.renderer.char3dPresenter.instanceOf(__meguruRun.sim.player)?.anim.emotion===e,emotion);result.checks.push({name:'player '+emotion});
 }
 await page.evaluate(()=>{__meguruBridge.getState().companions.find(a=>a.id==='shiba').bond=30;});
 await page.waitForFunction(()=>__meguruRun.party.find(a=>a.id==='shiba').expr.emotion==='normal');
 const cue=await page.evaluate(()=>{const a=__meguruRun.party.find(a=>a.id==='shiba'),s=__expressionModule.expressionEvents,e={version:1,type:'reunion',actorKey:a.key,at:1,context:'meguru',regionId:__meguruRun.world.regionId};return {accepted:s.accept(e),duplicate:s.accept(e)};});assert.deepEqual(cue,{accepted:true,duplicate:false});
 await page.waitForFunction(()=>__meguruRun.party.find(a=>a.id==='shiba').expr.emotion==='positive');result.checks.push({name:'relationship recovery and mock event',detail:cue});
 await page.evaluate(()=>{__meguruBridge.getState().hunger=0;__meguruRun.renderer.setChar3D(false);});
 await page.waitForFunction(()=>__meguruRun.renderer.playerVisible.mode==='2d');
 await page.waitForFunction(()=>{const r=__meguruRun;let ready=false;r.renderer.char3dPresenter.scene.traverse(o=>{if(o.visible&&o.userData.tex?.asset?.includes('-hungry'))ready=true;});return ready;},null,{timeout:60000});
 result.checks.push({name:'2D toggle uploads hungry image',detail:await snapshot()});await page.screenshot({path:out+'/world-2d-hungry.png'});
 await page.evaluate(()=>__meguruRun.renderer.setChar3D(true));await page.waitForFunction(()=>__meguruRun.renderer.playerVisible.mode==='3d');
 await page.evaluate(()=>{__expressionModule.expressionEvents.clear();__meguruBridge.getState().companions.find(a=>a.id==='shiba').bond=29;__meguruRun.renderer.char3dHooks({failUpdate:a=>a.id==='shiba'});});
 await page.waitForFunction(()=>{const r=__meguruRun,a=r.party.find(a=>a.id==='shiba');return r.renderer.char3dPresenter.isBroken(a);});
 await page.waitForFunction(()=>{let yes=false;__meguruRun.renderer.char3dPresenter.scene.traverse(o=>{if(o.visible&&o.userData.tex?.asset?.includes('shiba/lonely'))yes=true;});return yes;},null,{timeout:60000});
 result.checks.push({name:'per-actor failure uploads current lonely relationship image',detail:await snapshot()});await page.screenshot({path:out+'/world-actor-fallback.png'});
 assert.deepEqual(result.errors,[]);result.status='PASS';
 }catch(e){result.status='FAIL';result.error=String(e.stack||e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.close();fs.writeFileSync(out+'/world-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
})().catch(e=>{console.error(e);process.exitCode=1;});
