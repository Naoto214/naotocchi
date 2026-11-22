// Reproduce the first genuine refusal, retaining exclusively the real native
// walking steps. This is instrumentation for a finite, seeded replay.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {patchMovement:fromV9}=require('../home-mobility-v10/movement.cjs');
const {patchAfterRefusal}=require('./goal-after-refusal.cjs');
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const sha=body=>crypto.createHash('sha256').update(body).digest('hex');
const witness={steps:[]};
const shadow=process.env.GOAL_WITNESS_MODE==='original';
const point=a=>[a.x,a.y];
const meteredCpu=(process.threadCpuUsage||process.cpuUsage).bind(process);
globalThis.goalWitnessCpu=meteredCpu;
const same=(a,clock)=>a.key==='companion:owl' && Math.abs(clock-2)<1e-6;
function stats(v){
 const a=[...v].sort((p,q)=>p-q);
 return {samples:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};
}
globalThis.goalColdRequest=(a,p,clock,cast,box,scene,run,priorCpu,priorTime)=>{
 if(!same(a,clock))return;
 witness.originalDeclined=true;
 witness.before={key:a.key,time:clock,request:point(p),foot:point(a),bounds:box,
  cssScale:point(scene.navigation.intentScale),cast:cast.map(b=>[b.key,b.x,b.y,b.w,b.h])};
 const prior=meteredCpu(priorCpu);
 witness.originalRequestBeforeFallbackMs={wall:performance.now()-priorTime,threadCpu:(prior.user+prior.system)/1000};
 const found=run();witness.offer=found?.map(point);
 // Navigation caches are already warm from the actual call. No movement/random
 // decisions are performed. Report CPU separately from time shared with jobs.
 const wall=[],cpu=[],batch=512;
 for(let i=0;i<31;i++){
   const t=performance.now(),c=meteredCpu();let result;
   for(let j=0;j<batch;j++)result=run();
   const took=meteredCpu(c);
   if(JSON.stringify(result)!==JSON.stringify(found))throw Error('Repeating geometry changed the chosen endpoint');
   cpu.push((took.user+took.system)/(batch*1000));wall.push((performance.now()-t)/batch);
 }
 witness.warmQueryMs={batch,mode:process.threadCpuUsage?"thread":"process",cpu:stats(cpu),wall:stats(wall)};
};
globalThis.goalColdResult=(a,clock,ok)=>{
 if(same(a,clock)){witness.nativeRequestReturned=ok;witness.nativeAssignedTarget=a.target?point(a.target):null;}
};
globalThis.goalColdStep=(a,p,clock,dt,speed,box,nav,see,peers,contact)=>{
 if(a.key!==witness.before?.key || witness.nativeRequestReturned!==true||witness.nativeArrival||clock>3.5)return;
 const scale=nav.intentScale;
 const stepWorld=Math.hypot(p.x-a.x,p.y-a.y),stepCss=Math.hypot((p.x-a.x)*scale.x,(p.y-a.y)*scale.y);
 const collisions=peers.filter(b=>a!==b&&!contact(a,p,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10)).map(b=>b.key);
 witness.steps.push({clock,from:point(a),to:point(p),css:stepCss,world:stepWorld,
   terrain:nav.valid(p)&&nav.segmentSafe(a,p),bodyVisible:nav.segmentSafe(a,p,see),
   inside:p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom,
   atNativeSpeed:stepWorld<=speed*dt+1e-7,collisions});
};
globalThis.goalColdArrive=(a,clock)=>{
 if(a.key===witness.before?.key&&witness.nativeRequestReturned===true&&!witness.nativeArrival&&clock<3.5){
  witness.nativeArrival={clock,foot:point(a),source:a.source,activity:a.activity};
 }
};
function patchMovement(source){
 const v10=fromV9(source),cmp=patchAfterRefusal(v10,{shadow});
 witness.source={v9:sha(source),v10:sha(v10),trial:sha(cmp)};
 let out=replaceExact(cmp,'const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;',
  'const goalColdCpu=globalThis.goalWitnessCpu(),goalColdTime=performance.now();const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;');
 const scan='const checked=refusedForwardRay(a,p,safeBounds,canSee);';
 out=replaceExact(out,scan,'globalThis.goalColdRequest(a,p,clock,actors,safeBounds,scene,()=>refusedForwardRay(a,p,safeBounds,canSee),goalColdCpu,goalColdTime);'+scan);
 // Observe the native planner return without disabling the original harness.
 const move="    function move(key,p,source='tap',{pointerDrop=false}={}){";
 out=replaceExact(out,move,"    function move(key,p,source='tap',options={}){const ok=goalColdMove(key,p,source,options);globalThis.goalColdResult(actor(key),clock,ok);return ok;}\n"+move.replace('function move','function goalColdMove'));
 const hop='if(mobility?.enabled)mobility.hop(a,p,clock);';
 out=replaceExact(out,hop,'globalThis.goalColdStep(a,p,clock,dt,speed,bounds(a,scene),scene.navigation,scene.planVisibility(a),actors,contactSegmentSafe);'+hop);
 const arrival="if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'";
 return replaceExact(out,arrival,'globalThis.goalColdArrive(a,clock);'+arrival);
}
process.on('beforeExit',()=>fs.writeFileSync(process.env.GOAL_WITNESS_OUT,JSON.stringify(witness,null,2)+'\n'));
module.exports={patchMovement};
