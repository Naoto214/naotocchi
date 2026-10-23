const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const M=harness({deterministic:true}).api.meguruMod;
test('Home compositions reuse official geometry, preserve sources and keep cast foreground clear',async()=>{
 const {composeHomeWorld}=await import('../home-world.mjs');
 for(const region of ['forest','river_lake','city']){
  const original=JSON.stringify(M.REGION3D[region]);const c=composeHomeWorld(M,region);
  assert.ok(c.objects.length>10);assert.ok(c.objects.every(o=>o.sourceId));
  assert.ok(c.objects.filter(o=>o.solid).every(o=>o.z>=1000||Math.abs(o.x)>700));
  assert.equal(JSON.stringify(M.REGION3D[region]),original);
  assert.ok(c.world.world3d);assert.ok(c.world.segments.length);
  if(region==='river_lake')assert.equal(c.world.terrain.kind,'river');
  if(region==='city')assert.ok(c.routes.some(r=>r.kind==='car'&&r.domain==='road'));
 }
});
test('Living environment remains bounded with correct routes and pauses',async()=>{
 const {createWorldLife}=await import('../world-life.mjs');
 for(const region of ['forest','river_lake','city']){
  const life=createWorldLife(region,()=>.37);let distance=0,last=life.snapshot();
  for(let i=0;i<36000;i++){life.step(.1,{time:'day',weather:'sunny'});let now=life.snapshot();assert.ok(now.length<=12);for(let a of now){assert.ok(Number.isFinite(a.x+a.y+a.z));if(a.kind==='fish')assert.ok(a.z>=1380&&a.z<=1620);if(a.kind==='car')assert.equal(a.z,1400);}if(i<600)distance+=now.reduce((n,a,j)=>n+Math.abs(a.x-(last[j]?.x||a.x)),0);last=now;}
  assert.ok(distance>100);const before=JSON.stringify(life.snapshot());life.step(40,{paused:true});assert.equal(JSON.stringify(life.snapshot()),before);assert.ok(life.metrics().spawned>2);
 }
});

// GPU failure is injected at the renderer boundary; composition and recovery are real.
async function recoveryHarness(fault='draw') {
 const {createHomeWorld}=await import('../home-world.mjs');
 const statuses=[],renderers=[];let width=390;
 const canvas={style:{},getContext:()=>({}),remove(){this.removed=true;}};
 const container={appendChild(){},getBoundingClientRect:()=>({width,height:844})};
 const factory=(m,o)=>{
  const r={draws:0,disposed:0,fault:renderers.length===0?fault:null,
   stats:()=>({mode:'3d'}),resize(){if(this.fault==='resize')throw Error('resize failed');},
   setAnimLevel(){if(this.fault==='level')throw Error('lost context');},
   draw(){if(this.fault==='draw')throw Error('webgl context lost');this.draws++;},
   destroy(){this.disposed++;},options:o};
  renderers.push(r);return r;
 };
 const world=createHomeWorld({M,container,document:{createElement:()=>canvas},window:{},rendererFactory:factory,onStatus:(mode)=>statuses.push(mode)});
 const env={region:'forest',time:'day',weather:'sunny',season:'summer'};
 world.setEnvironment(env);
 return {world,env,renderers,statuses,resize(){width=400;}};
}
test('Home recovers the same region after lost GPU without resetting its life clock',async()=>{
 const {world,env,renderers,statuses}=await recoveryHarness();
 world.draw(.1);assert.equal(world.stats().mode,'unavailable');
 const clock=world.stats().life.clock;
 for(let i=0;i<40;i++){world.setEnvironment(env);world.draw(.1);}
 assert.equal(world.stats().mode,'3d');assert.ok(world.stats().life.clock>=clock);
 assert.ok(renderers.at(-1).draws>0);assert.equal(renderers[0].disposed,1);
 assert.equal(statuses.at(-1),'3d');world.destroy();
});
test('Home renderer recovery is bounded, pauses while hidden and stops on destroy',async()=>{
 const {world,env,renderers}=await recoveryHarness();
 world.draw(.1);
 for(let i=0;i<100;i++)world.draw(1,{paused:true});
 assert.equal(renderers.length,1);
 for(let i=0;i<120;i++){
  if(renderers.at(-1))renderers.at(-1).fault='draw';
  world.setEnvironment(env);world.draw(1);
 }
 assert.equal(renderers.length,4,'initial renderer plus at most three recovery attempts');
 world.setEnvironment({...env,region:'city'});world.draw(.1);
 assert.equal(world.stats().mode,'3d');
 const count=renderers.length;world.destroy();
 for(let i=0;i<60;i++){world.setEnvironment(env);world.draw(1);}
 assert.equal(renderers.length,count);assert.ok(renderers.every(r=>r.disposed===1));
});
for(const fault of ['resize','level'])test(`Home contains ${fault} errors so the frame loop can recover`,async()=>{
 const h=await recoveryHarness(fault);if(fault==='resize')h.resize();
 assert.doesNotThrow(()=>h.world.draw(.1));assert.equal(h.world.stats().mode,'unavailable');
 for(let i=0;i<40;i++)h.world.draw(.1);
 assert.equal(h.world.stats().mode,'3d');h.world.destroy();
});

test('Home ground follows the cast feet on portrait and wide viewports; river stays behind',async()=>{
 const THREE=await import('../vendor/three-0.170.0/three.module.min.js');
 const {alignHomeGround}=await import('../meguru-3d.mjs');
 for(const [W,H,y] of [[390,844,350],[1363,936,425],[320,568,320]]){
  const camera=new THREE.PerspectiveCamera(46,W/H,20,12000);
  camera.position.set(0,1100,1350);camera.lookAt(0,0,-1000);
  assert.equal(typeof alignHomeGround,'function');
  alignHomeGround(camera,W,H,y);
  const feet=new THREE.Vector3(0,0,-550).project(camera);
  const river=new THREE.Vector3(0,0,-1500).project(camera);
  assert.ok(Math.abs((1-feet.y)*H/2-y)<.01,'clearing is underneath the cast anchor');
  assert.ok((1-river.y)*H/2<y-60,'river remains safely behind the upper walking bound');
 }
});
