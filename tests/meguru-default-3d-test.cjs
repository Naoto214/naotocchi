// Production startup code, deterministic DOM/network/timer boundaries only.
// Removing the default, single-start token, timeout lock or failure lock must fail.
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const source=fs.readFileSync('script.js','utf8');
function setup(query='', webgl=true){
 const tags=[],timers=new Map(),overlay={innerHTML:'',classList:{add(){},remove(){}},appendChild(n){this.child=n;}},stats={visits:0};let serial=0,starts=0,stops=0,renders=0,options;
 const document={getElementById:()=>({dataset:{src:'meguru-3d.mjs'}}),createElement(tag){return {style:{},setAttribute(){},appendChild(){},addEventListener(){},getContext(){return webgl?{getExtension(){return null;}}:null;}};},head:{appendChild(t){tags.push(t);}}};
 const ctx={document,location:{search:query},window:{},console:{warn(){}},Promise,setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout(id){timers.delete(id);},meguruMod:{start(_,o){starts++;options=o;return {running:true,stop(){stops++;}};}},meguruBridge:{currentPetKey:()=> 'dog'},meguruActive:false,meguruRun:null,gameActive:false,state:{isSleeping:false},el:{meguruOverlay:overlay,screenNormal:{classList:{add(){},remove(){}}}},meguruStats:()=>stats,audio:{play(){}},scheduleHistoryLayerSync(){},renderWorldScene(){},render(){renders++;},saveState(){},closeAllMenuOverlays(){},clearConversationTimers(){},hideSpeechBubble(){}};
 vm.createContext(ctx);
 const flags=source.slice(source.indexOf('  const MEGURU3D_ON ='),source.indexOf('  const meguruBridge ='));
 const loader=source.slice(source.indexOf('  let meguru3dRenderer ='),source.indexOf('  function meguruStats()'));
 const lifecycle=source.slice(source.indexOf('  function startMeguru()'),source.indexOf('  // 「1本ずつ」'));
 vm.runInContext(flags+loader+lifecycle+'\nthis.start=startMeguru;this.stop=stopMeguru;this.world=MEGURU3D_ON;',ctx);
 return {ctx,tags,timers,stats,overlay,get renders(){return renders;},get starts(){return starts;},get stops(){return stops;},get options(){return options;},loaded(){ctx.window.NaotocchiMeguru3D={createMeguru3D(_,opts){ctx.rendererOpts=opts;return ()=>{};}};tags[0]?.onload();},timeout(){for(const fn of [...timers.values()])fn();}};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
test('normal URL requests both 3D layers, waits visibly and starts exactly once',async()=>{const h=setup();assert.equal(h.ctx.world,true);assert.equal(h.ctx.start(),true);assert.equal(h.ctx.start(),false);assert.equal(h.timers.size,1,'one bounded wait, not a new timeout per click');assert.equal(h.starts,0);assert.ok(h.renders>0,'commit menu closure before waiting');assert.match(h.overlay.innerHTML,/role="status"/);h.loaded();await flush();assert.equal(h.starts,1);assert.equal(h.stats.visits,1);assert.equal(h.ctx.rendererOpts.char3d,true);assert.ok(h.options.renderer);});
test('QA URL priorities: any 2D override wins, char3d=0 keeps world',async()=>{for(const q of ['?meguru3d=0','?meguru3d=1&meguru3d=0','?m3d2d=1&meguru3d=1']){const h=setup(q);h.ctx.start();await flush();assert.equal(h.starts,1);assert.equal(h.tags.length,0);assert.equal(h.options,undefined);assert.equal(h.ctx.world,!q.includes('meguru3d=0'));}const h=setup('?char3d=1&char3d=0');h.loaded();h.ctx.start();await flush();assert.equal(h.ctx.rendererOpts.char3d,false);assert.ok(h.options.renderer);});
test('timeout ignores late load, remains Canvas on reopen, and counts one visit',async()=>{const h=setup();h.ctx.start();h.timeout();await flush();assert.equal(h.starts,1);assert.equal(h.options,undefined);h.loaded();await flush();assert.equal(h.ctx.rendererOpts,undefined,'late module must not even construct a factory');assert.equal(h.starts,1);h.ctx.stop();h.ctx.start();await flush();assert.equal(h.starts,2);assert.equal(h.options,undefined);assert.equal(h.stats.visits,2);});
test('cancel and reopen cannot let old completion start a stale run',async()=>{const h=setup();h.ctx.start();h.ctx.stop();h.loaded();await flush();assert.equal(h.starts,0);assert.equal(h.stats.visits,0);h.ctx.start();await flush();assert.equal(h.starts,1);assert.ok(h.options.renderer);});
test('module error and unavailable WebGL use Canvas without retries',async()=>{for(const available of [true,false]){const h=setup('',available);h.ctx.start();if(available)h.tags[0].onerror();await flush();assert.equal(h.starts,1);assert.equal(h.options,undefined);h.ctx.stop();h.ctx.start();await flush();assert.equal(h.starts,2);assert.equal(h.options,undefined);assert.equal(h.tags.length,available?1:0);}});
test('runtime fallback locks subsequent visits to Canvas',async()=>{const h=setup();h.loaded();h.ctx.start();await flush();h.ctx.rendererOpts.onFallback(Error('lost'));h.ctx.stop();h.ctx.start();await flush();assert.equal(h.starts,2);assert.equal(h.options,undefined);});
test('diagnostic logger failure cannot interrupt fallback',async()=>{const h=setup();h.ctx.console.warn=()=>{throw Error('logger');};h.ctx.start();assert.doesNotThrow(()=>h.tags[0].onerror());await flush();assert.equal(h.starts,1);assert.equal(h.options,undefined);});

// Execute the shipped camera block with real Three matrices: verify framing,
// yaw and terrain following, without constructing a WebGL renderer.
async function cameraPose(W,H,yaw=0,terrain=0,height=1) {
 const THREE=await import('../vendor/three-0.170.0/three.module.min.js');
 const src=fs.readFileSync('meguru-3d.mjs','utf8');
 const block=src.slice(src.indexOf('    const F = '),src.indexOf('    // ひかり(時間'));
 const camera=new THREE.PerspectiveCamera(50,1,20,12000), c={x:100,z:300,dist:430,yaw,height};
 vm.runInNewContext(block,{W,H,c,camera,HOR_BASE:.30,FEET_FRAC:.80,built:{terr:{walkY:()=>terrain}},view:{player:{x:c.x,z:c.z}},Math});
 camera.updateMatrixWorld(true);
 return {camera,feet:new THREE.Vector3(c.x,terrain,-c.z).project(camera),direction:camera.getWorldDirection(new THREE.Vector3()), horizon:new THREE.Vector3(c.x+Math.sin(yaw)*1e9,terrain,-c.z-Math.cos(yaw)*1e9).project(camera)};
}
test('wide 3D framing retains horizon, elevation and feet at every yaw',async()=>{
 for(const yaw of [0,.7,Math.PI/2,Math.PI,-1.1]) for(const terrain of [0,250]) {
  const p=await cameraPose(600,220,yaw,terrain);
  assert.ok(p.camera.position.y-terrain>=145,'wide view must not sink towards the ground');
  assert.ok(Math.abs(p.direction.y)<1e-12,'no additional pitch that hides the distance');
  assert.ok(Math.abs((1-p.horizon.y)/2-.3)<1e-6,'horizon stays at 30%, not outside the top');
  assert.ok(Math.abs(p.feet.x)<1e-10,'yaw does not roll or displace target');
  assert.ok(Math.abs(p.feet.y+.6)<1e-10,'feet stay at 80% of canvas height');
 }
});
test('portrait projection is unchanged; wide compensation joins continuously',async()=>{
 for(const [W,H] of [[343,400],[600,400]]) for(const height of [.8,1,1.2]) {
  const p=await cameraPose(W,H,0,0,height), hor=Math.round(H*(.30+.07*(height-1)));
  assert.equal(p.camera.position.y,(.8-hor/H)*H*430/(W*.95));
  assert.ok(Math.abs(p.direction.y)<1e-12);
 }
 const a=await cameraPose(600,400), b=await cameraPose(600,399.999);
 assert.ok(Math.abs(a.camera.position.y-b.camera.position.y)<.001);
 assert.ok(Math.abs(a.direction.y-b.direction.y)<.00001);
});

test('wide camera retains vertical field of view instead of cropping the distance',async()=>{
 const ref=await cameraPose(600,400);
 for(const W of [600,700,800]) {
  const p=await cameraPose(W,220);
  assert.ok(Math.abs(p.camera.fov-ref.camera.fov)<1e-10,'same vertical frustum across wide aspects');
  assert.ok(Math.abs(p.camera.position.y-ref.camera.position.y)<1e-10,'same elevation');
  const halfFov=Math.atan(W/(2*1.425*220))*180/Math.PI;
  assert.ok(halfFov<55,'supported wide framing avoids extreme >110 degree horizontal field');
 }
});
