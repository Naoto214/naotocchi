// Paired CSS-only audit: same live world/pose, baseline stylesheet vs candidate.
// Synthetic safe area and software WebGL; physical iPhone comfort remains Human QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {serve}=require('../tools/character-3d/shot.cjs');
const {makeSave}=require('../tools/meguru-3d-qa/character-integration.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.env.PAD_OUT||'test-results/home-layout/pad-size');
const BASE='e9932859c1479b2c1e53d77b20bb3b8f104343df';
const baseline=execFileSync('git',['show',BASE+':style.css'],{cwd:ROOT,encoding:'utf8'});
const candidate=fs.readFileSync(path.join(ROOT,'style.css'),'utf8');
async function snapshot(page){return page.evaluate(()=>{
 const box=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};};
 const pad=document.querySelector('#meguruOverlay .mg-pad'),p=box(pad),c=globalThis.__padCamera;
 const buttons=[...document.querySelectorAll('#meguruOverlay .mg-pad-actions button')].filter(e=>!e.classList.contains('hidden')).map(e=>({text:e.textContent,...box(e),hit:document.elementFromPoint(box(e).x+box(e).width/2,box(e).y+box(e).height/2)===e}));
 return {children:[...document.querySelector('#meguruOverlay').children].map(e=>({cls:e.className,height:e.offsetHeight,rect:box(e)})),pad:p,buttons,canvas:box(document.querySelector('#mgrCanvas')),buffer:[mgrCanvas.width,mgrCanvas.height],size:__meguruRun.canvasSize,
 camera:__meguruRun.renderer.is3D?{matrix:c.projectionMatrix.toArray(),position:c.position.toArray(),rotation:c.rotation.toArray(),fov:c.fov,aspect:c.aspect}:null,
 hit:[10,60,110].map(y=>document.elementFromPoint(p.x+p.width/2,p.y+y)===pad),renderer:__meguruRun.renderer.is3D?'3D':'Canvas'};
});}
async function settle(page){await page.waitForTimeout(550);await page.evaluate(async()=>{for(let i=0;i<2;i++)await new Promise(requestAnimationFrame);globalThis.__draw?.();});}
async function input(page){
 const p=await page.locator('#meguruOverlay .mg-pad').boundingBox(),x=p.x+p.width/2,y=p.y+110;
 const pos=()=>page.evaluate(()=>[__meguruRun.player.x,__meguruRun.player.z]);
 const client=await page.context().newCDPSession(page);
 const touch=(type,x,y)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
 const start=await pos();await touch('touchStart',x,y);await page.waitForTimeout(180);
 assert.deepEqual(await pos(),start,'press without drag must not move');
 await touch('touchMove',x+2,y);await page.waitForTimeout(160);assert.deepEqual(await pos(),start,'2px below start threshold must not move');
 await touch('touchMove',x+24,y-24);await page.waitForTimeout(220);const moving=await pos();
 assert.ok(Math.hypot(moving[0]-start[0],moving[1]-start[1])>1,'new lower 20px must start real movement');
 await page.waitForTimeout(220);const held=await pos();assert.notDeepEqual(held,moving,'sticky hold continues movement');
 await touch('touchEnd');await client.detach();await page.waitForTimeout(180);const released=await pos();await page.waitForTimeout(200);assert.deepEqual(await pos(),released,'release stops movement');
 return {start,moving,held,released};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const report={baseline:BASE,physicalIPhone:'NOT_RUN',rows:[],inputs:[],errors:[]};
 const server=await serve();let browser;
 try{browser=await require('playwright').chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM?{executablePath:process.env.PLAYWRIGHT_CHROMIUM}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const query of (process.env.PAD_QUERY?[process.env.PAD_QUERY]:['', '?m3d2d=1'])){
  const context=await browser.newContext({viewport:{width:393,height:760},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  await context.route('**/*.css?*',route=>{const file=path.join(ROOT,new URL(route.request().url()).pathname);return route.fulfill({contentType:'text/css',body:fs.readFileSync(file,'utf8').replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,(_,edge)=>({left:47,right:47,bottom:21,top:0}[edge]+'px'))});});
  await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',s),makeSave('forest'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/'+query);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{const T=await import('/vendor/three-0.170.0/three.module.min.js'),orig=T.PerspectiveCamera.prototype.updateProjectionMatrix;T.PerspectiveCamera.prototype.updateProjectionMatrix=function(){orig.call(this);if(this.view?.enabled)globalThis.__padCamera=this;};});
  await page.locator('#travelBtn').click();await page.locator('#meguruEnterBtn').click();await page.locator('#mgrCanvas').waitFor();
  if(!query)await page.waitForFunction(()=>__meguruRun?.renderer.is3D);
  await page.evaluate(()=>{const r=__meguruRun;globalThis.__padIdentity=[r,r.sim,r.world,r.player];globalThis.__step=r.sim.step;r.sim.step=()=>[];r.sim.setCameraMotion(false);r.sim.setEnv({...r.sim.env,time:'day',weather:'sunny'});r.sim.setEnv=()=>{};const e=r.world.spots.find(s=>s.id==='entry')||r.world.spots[0];r.sim.setPlayer(e.x,e.z);Object.assign(r.sim.camera,{x:e.x,z:e.z,yaw:0,dist:430,height:1});r.renderer.setAnimLevel?.(0);const draw=r.renderer.draw.bind(r.renderer);let lastSize="";globalThis.__draw=()=>{const size=JSON.stringify(r.canvasSize);if(size!==lastSize){draw(r.sim.view(),1000);lastSize=size;}};r.renderer.draw=()=>{};});
  // Temporarily replace only the linked style.css bytes, preserving every other stylesheet.
  const setCSS=async css=>{await page.evaluate(css=>{let s=document.querySelector('#pad-comparison-css');if(!s){s=document.createElement('style');s.id='pad-comparison-css';const link=document.querySelector('link[href^="style.css?"]');link.after(s);link.disabled=true;}s.textContent=css;window.dispatchEvent(new Event("resize"));},css.replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,(_,edge)=>({left:47,right:47,bottom:21,top:0}[edge]+'px')));let last='',stable=0;
   for(let i=0;i<8;i++){await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.waitForTimeout(300);
    const next=await page.evaluate(()=>JSON.stringify([...document.querySelectorAll('#mgrCanvas,#meguruOverlay .mg-pad-row')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})));
    stable=next===last?stable+1:0;last=next;if(stable>=2)break;if(i===7)throw Error('layout did not settle');
   }await settle(page);};
  // Entering Meguru can finish its initial deferred layout after fonts load.
  // Warm the baseline before starting the paired (non-startup) measurements.
  await page.evaluate(()=>document.fonts.ready);await setCSS(baseline);
  let portrait;
  for(const [width,height] of (process.env.PAD_INPUT_ONLY?[]:[[393,760],[960,500],[852,320],[667,300],[568,300],[852,390],[932,430],[393,760]])){
   await page.setViewportSize({width,height});
   for(const label of ['', '💬 はなす','ふねに のる','もぐる']){
    await page.evaluate(label=>{__meguruRun.sim.gateHere=()=>label?{action:label}:null;Object.defineProperty(__meguruRun.sim,'nearest',{configurable:true,get:()=>null});},label);
    await setCSS(baseline);const before=await snapshot(page);
    await setCSS(candidate);const after=await snapshot(page);
    const landscape=width>=560&&height<=500&&width>height;
    for(const key of ['canvas','buffer','size','camera']){try{assert.deepEqual(after[key],before[key],`${width}x${height} ${label}: ${key} changed`);}catch(e){console.error(JSON.stringify({before,after}));throw e;}}
    if(landscape){assert.equal(after.pad.width,184);assert.equal(after.pad.height,120,'actual pad height');assert.deepEqual(after.hit,[true,true,true],'full element hit area');
     for(const b of after.buttons){assert.ok(b.y>=after.pad.bottom+5,'pad/button overlap');assert.ok(b.bottom<=height-21&&b.right<=width-47&&b.hit,'button clipped');assert.ok(b.height>=44);}
    }else{assert.deepEqual(after.pad,before.pad,'portrait unchanged');if(!portrait)portrait=after;else if(!label)assert.deepEqual(after.camera,portrait.camera,'rotation restores camera');}
    assert.equal(await page.evaluate(()=>{const r=__meguruRun;return [r,r.sim,r.world,r.player].every((x,i)=>x===__padIdentity[i]);}),true);
    const name=(query?'canvas':'3d')+'-'+width+'x'+height+'-'+(label||'normal');report.rows.push({name,before,after});console.log('PASS '+name);
    if(width===852&&height===320&&(label===''||label==='ふねに のる')){await page.screenshot({path:path.join(OUT,name+'-after.png')});await setCSS(baseline);await page.screenshot({path:path.join(OUT,name+'-before.png')});await setCSS(candidate);}
   }
  }
  if(!query&&!process.env.PAD_INPUT_ONLY){
   await page.setViewportSize({width:960,height:500});
   await page.evaluate(()=>{__meguruRun.sim.gateHere=()=>({action:'💬 はなす'});});
   await setCSS(baseline);const reference=await snapshot(page);
   const validate=m=>{assert.deepEqual(m.canvas,reference.canvas,'canvas preservation');assert.equal(m.pad.height,120,'pad height');assert.deepEqual(m.hit,[true,true,true],'hit area');};
   await setCSS(candidate);validate(await snapshot(page));
   for(const [name,css,reason] of [
    ['old-size',candidate.replace('min-height: 120px; margin-bottom: -20px','min-height: 100px; margin-bottom: -20px'),/pad height|canvas preservation/],
    ['no-footprint-protection',candidate.replace('margin-bottom: -20px','margin-bottom: 0px'),/canvas preservation/],
    ['visual-only-hit-disabled',candidate+'\n#meguruOverlay .mg-pad { pointer-events:none; }',/hit area/]
   ]){await setCSS(css);const m=await snapshot(page);assert.throws(()=>validate(m),reason,name+' survived');report.mutations=(report.mutations||[]).concat(name);console.log('KILLED '+name);}
   await setCSS(candidate);validate(await snapshot(page));
  }
  await page.setViewportSize({width:852,height:320});await setCSS(candidate);
  await page.evaluate(()=>{__meguruRun.sim.step=__step;__meguruRun.sim.gateHere=()=>null;});
  report.inputs.push({query,detail:await input(page)});console.log('PASS lower-strip input '+query);
  if(!query){await page.evaluate(()=>__meguruRun.renderer.loseContext());await page.waitForFunction(()=>!__meguruRun.renderer.is3D);report.inputs.push({query:'real context-loss fallback',detail:await input(page)});console.log('PASS real context-loss input');}
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
 }finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
