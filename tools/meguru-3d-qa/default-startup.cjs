// Real production page; fault injection stays in request/init-script instrumentation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {serve}=require('../character-3d/shot.cjs');
const {makeSave}=require('./character-integration.cjs');
const {installSaveCounter}=require('../character-3d/runtime-integration.cjs');
async function run(out){
 fs.mkdirSync(out,{recursive:true});const report={status:'RUNNING',physicalIPhone:'NOT_RUN',checks:[],errors:[]};
 const srv=await serve(),base='http://127.0.0.1:'+srv.address().port;
 const browser=await require('playwright').chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM?{executablePath:process.env.PLAYWRIGHT_CHROMIUM}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function pageFor(mode){
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();let release;const held=new Promise(r=>release=r);
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.addInitScript(installSaveCounter);
  await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',s),makeSave());
  if(mode==='no-webgl')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return /webgl/.test(t)?null:get.call(this,t,...args);};});
  await page.route('**/meguru-3d.mjs*',async route=>{
   if(mode==='module-error')return route.abort();
   if(mode==='timeout'||mode==='cancel'||mode==='cold')await held;
   const response=await route.fetch();let body=await response.text();
   if(mode==='constructor'){
    const anchor='  renderer = o.home &&';
    assert.equal(body.split(anchor).length,2,'constructor fault anchor must match exactly once');
    // Fail only the Meguru initialization under test, after its canvas is attached.
    body=body.replace(anchor,"  if (!o.home) throw new Error('injected constructor');\n"+anchor);
   }
   if(mode==='shader')body=body.replace('renderer.compile(scene, camera);', "scene.traverse(o=>{if(o.material)o.material.onBeforeCompile=s=>{s.fragmentShader='INVALID_GLSL';};}); renderer.compile(scene, camera);");
   if(mode==='draw')body=body.replace('    renderer.render(scene, camera);',"    if(globalThis.__fault) throw new Error('injected draw'); renderer.render(scene, camera);");
   if(mode==='resize')body=body.replace('renderer.setSize(W, H, false); place();',"if(globalThis.__fault) throw new Error('injected resize'); renderer.setSize(W, H, false); place();");
   await route.fulfill({response,body});
  });
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await page.locator('.device.ui-home-active').waitFor({timeout:60000});
  return {page,ctx,release};
 }
 async function enter(p){await p.locator('#travelBtn').click();await p.locator('#meguruEnterBtn').click();}
 async function ready(p,three){await p.waitForFunction(want=>{const r=globalThis.__meguruRun;return !!r?.running&&(want?!!r.renderer.is3D:!r.renderer.is3D);},three,{timeout:60000});}
 async function cleanup(p){await p.locator('#mgrHome').click();await p.waitForFunction(()=>!globalThis.__meguruRun);assert.equal(await p.locator('#meguruOverlay .meguru-3d-canvas').count(),0);}
 async function record(name,fn){try{const detail=await fn();report.checks.push({name,pass:true,detail});console.log('PASS '+name);}catch(e){report.checks.push({name,pass:false,error:String(e.stack||e)});console.error('FAIL '+name+': '+e.message);}}
 try{
  for(const mode of ['cold','cancel','timeout','module-error','no-webgl','constructor','shader','draw','resize','context-loss'])await record(mode,async()=>{
   const {page:p,ctx,release}=await pageFor(mode);
   try{
    await enter(p);
    if(['cold','cancel','timeout'].includes(mode)){
     await p.locator('#meguruOverlay [role=status]').waitFor();assert.equal(await p.locator('#mgrCanvas').count(),0);
     if(mode!=='cancel'){
      // The deliberately held module can keep document.fonts.ready pending.
      // Capture current pixels without Playwright waiting for page-load font readiness.
      const cdp=await ctx.newCDPSession(p);try{const shot=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,mode+'-loading.png'),Buffer.from(shot.data,'base64'));}finally{await cdp.detach();}
     }
     // Repeated real button events must not spawn another pending start.
     await p.evaluate(()=>{for(let i=0;i<8;i++)document.querySelector('#meguruEnterBtn').click();});
     if(mode==='cancel'){
      await p.locator('#meguruOverlay button').click();release();
      await p.waitForFunction(()=>!!window.NaotocchiMeguru3D);assert.equal(await p.locator('#mgrCanvas').count(),0);
      assert.equal(await p.evaluate(()=>!!globalThis.__meguruRun),false);await enter(p);
     }else if(mode==='cold')release();
     else{await ready(p,false);release();await p.waitForFunction(()=>!!window.NaotocchiMeguru3D);}
    }
    const fault=['timeout','module-error','no-webgl','constructor','shader'].includes(mode);
    await ready(p,!fault);
    let proof;
    if(['draw','resize','context-loss'].includes(mode)){
     // Capture strict identities and state at the synchronous failure boundary.
     proof=await p.evaluate(mode=>{
      const r=__meguruRun,sim=r.sim,world=r.world,party=r.party,player=r.sim.player,obstacles=r.world.obstacles;
      globalThis.__beforeFailure={r,sim,world,party,player,obstacles};
      const snap=()=>JSON.stringify({state:__meguruBridge.getState(),player,party,storage:{...localStorage},writes:__integrationSaveWrites});
      const before=snap();globalThis.__fault=true;
      if(mode==='draw')r.renderer.draw(r.sim.view(),performance.now());
      if(mode==='resize')r.renderer.resize({W:700,H:390});
      if(mode==='context-loss'){
       const canvas=document.querySelector('#meguruOverlay .meguru-3d-canvas');
       // Real browser WEBGL_lose_context, with event-boundary snapshots around production listener.
       canvas.addEventListener('webglcontextlost',()=>{globalThis.__contextBefore=snap();},{capture:true});
       canvas.addEventListener('webglcontextlost',()=>{globalThis.__contextUnchanged=__contextBefore===snap();globalThis.__contextAfter=true;});r.renderer.loseContext();
      }
      return {synchronousSaveAndActorsUnchanged:before===snap()};
     },mode);
     if(mode==='context-loss'){await p.waitForFunction(()=>globalThis.__contextAfter);assert.equal(await p.evaluate(()=>__contextUnchanged),true,'context event preserves state, save, actors and coordinates');}
     await p.waitForFunction(()=>__meguruRun.renderer.failed&&!__meguruRun.renderer.is3D);
     const same=await p.evaluate(()=>{const b=__beforeFailure,r=__meguruRun;return b.r===r&&b.sim===r.sim&&b.world===r.world&&b.party===r.party&&b.player===r.sim.player&&b.obstacles===r.world.obstacles;});
     assert.equal(same,true,'same simulation, world, player, party and collision array');assert.equal(proof.synchronousSaveAndActorsUnchanged,true);
    }
    assert.equal(await p.locator('#meguruOverlay .meguru-3d-canvas').count(),fault||proof?0:1,'no stale canvas');
    const before=await p.evaluate(()=>__meguruBridge.getState().lifetime.meguru.visits);
    await p.screenshot({path:path.join(out,mode+'-result.png')});await cleanup(p);await enter(p);await ready(p,!(fault||proof));
    const after=await p.evaluate(()=>__meguruBridge.getState().lifetime.meguru.visits);assert.equal(after,before+1,'one start per visit');
    assert.equal(await p.locator('#meguruOverlay .meguru-3d-canvas').count(),fault||proof?0:1,'session failure does not retry');await cleanup(p);
    return {sameWorldProof:proof||null,visitsDelta:after-before,physicalPerformance:'NOT_MEASURED'};
   }finally{release();await p.unrouteAll({behavior:'ignoreErrors'});await ctx.close();}
  });
  report.status=report.checks.every(c=>c.pass)&&!report.errors.length?'PASS':'FAIL';
 }finally{await browser.close();await new Promise(r=>srv.close(r));fs.writeFileSync(path.join(out,'default-startup.json'),JSON.stringify(report,null,2)+'\n');}
 return report;
}
module.exports={run};
if(require.main===module){const i=process.argv.indexOf('--out');run(i<0?'qa-artifacts/default-startup':process.argv[i+1]).then(r=>{console.log(r.status);if(r.status!=='PASS')process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});}
