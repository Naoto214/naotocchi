import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {forest,nativeSource} from './forest-scene.mjs';

const require=createRequire(import.meta.url);
const source=process.env.UNMODIFIED_V7 ? nativeSource : require('./movement.cjs').patchMovement(nativeSource);
function nativeModel() {
  const context={module:{exports:{}}};
  runInNewContext(source,context);
  return context.module.exports;
}
function activeEligible(model) {
  for(let i=0;i<100;i++) model.step(.05,{autonomy:false});
}
function oneStepOfTheAgedForest(key){
  const {model,rows,sx,sy}=forest(nativeModel());
  activeEligible(model);
  const a=rows.find(row=>row.key===key);
  const b=model.snapshot().find(row=>row.key===key);
  const goal={x:a.x+20/sx,y:a.y};
  assert.ok(model.move(a.key,goal,'ambient'),'a safe short escape should be accepted for '+key);
  const planned=model.snapshot().find(row=>row.key===key).target;
  assert.ok(planned);
  assert.deepEqual([b.x,b.y],[a.x,a.y]);
  for(let i=0;i<40;i++)model.step(.05,{autonomy:false});
  const end=model.snapshot().find(row=>row.key===key);
  assert.ok(!end.target);
  const net=Math.hypot((end.x-a.x)*sx,(end.y-a.y)*sy);
  assert.ok(net>=3-1e-6&&net<8,'expected a short actual step for '+key+', got '+net);
}
for(const key of ['companion:otter','companion:sekizou']){
  test('V7 continuous forest endpoint, native safe short exit for '+key,()=>oneStepOfTheAgedForest(key));
}

// V7's recorded 28 initial foot positions in a controlled navigation fixture,
// with one distant moving bystander. This isolates search cancellation from
// actual occupied-floor changes in the native forest regression above.
async function movingBystander() {
  const {readFileSync} = await import('node:fs');
  const {pathToFileURL} = await import('node:url');
  const {createTerrainNavigation} = await import(pathToFileURL(process.env.MOBILITY_GAME+'/home-route-navigation.mjs'));
  const f = JSON.parse(readFileSync(new URL('../home-mobility-v7/geometry-fixture.json', import.meta.url)));
  const scale = {x:f.stageToCss.scaleX,y:f.stageToCss.scaleY};
  const nav = createTerrainNavigation({width:700,height:400,cell:8,gridOrigin:{x:0,y:0},project:p=>p,unproject:p=>({...p,z:p.y}),walkable:()=>true,segmentWalkable:()=>true});
  Object.assign(nav,{intentAware:true,intentScale:scale});
  const people=f.residents.map(({key,x,y,w,h})=>({key,kind:key.split(':')[0],x,y,w,h}));
  people.push({key:'bystander',kind:'companion',x:515,y:40,w:10,h:10});
  const bounds=new Map(f.residents.map(r=>[r.key,r.bounds]));
  const initial=new Map(people.map(r=>[r.key,r]));
  const model=nativeModel().createModel({random:()=>.5});
  let seating=true;
  const scene={width:700,height:400,region:'forest',navigation:nav,actorBounds:a=>bounds.get(a.key)||{left:500,right:600,top:40,bottom:40},
    visible:(p,a)=>!seating||Math.hypot(p.x-initial.get(a.key).x,p.y-initial.get(a.key).y)<1e-8};
  model.sync(people,scene);seating=false;
  const tick=n=>{for(let i=0;i<n;i++)model.step(.05,{autonomy:false});};
  const target=f.residents[24];
  model.select(target.key);
  const [x,y]=target.releaseNative;
  model.move(target.key,{x,y},'drag',{pointerDrop:true});
  tick(6);
  assert.ok(model.move('bystander',{x:550,y:40},'ambient'));
  tick(2);
  assert.ok(model.snapshot().at(-1).x>515);
  model.sync(people,scene);tick(239);
  const end=model.snapshot();
  assert.equal(end.filter(a=>a.source==='yield').length,2);
  assert.ok(Math.hypot((end[24].x-x)*scale.x,(end[24].y-y)*scale.y)<8);
}
test('an unrelated moving foot cannot starve the native two-helper handoff', movingBystander);

async function corridor(twoHelpers,spacing=20) {
  const {pathToFileURL}=await import('node:url');
  const {createTerrainNavigation}=await import(pathToFileURL(process.env.MOBILITY_GAME+'/home-route-navigation.mjs'));
  const x=i=>i===0?40:i===1?40+spacing:i===2&&twoHelpers?40+2*spacing:140+40*i;
  const people=Array.from({length:16},(_,i)=>({key:String(i),kind:i?'companion':'pet',w:spacing-10,h:10,x:x(i),y:40}));
  const native=source.replace('    return {metrics:', '    globalThis.actors=()=>actors;    return {metrics:')
    .replace('function* pairPlan(a,goal,ambient=false){','function* pairPlan(a,goal,ambient=false){if(ambient)globalThis.searches++;');
  const context={module:{exports:{}},searches:0};runInNewContext(native,context);
  const model=context.module.exports.createModel({random:()=>.5});
  const navigation=createTerrainNavigation({width:700,height:150,cell:8,gridOrigin:{x:0,y:0},project:p=>p,
    unproject:p=>({...p,z:p.y}),walkable:()=>true,segmentWalkable:()=>true});
  Object.assign(navigation,{intentAware:true,intentScale:{x:1,y:1}});
  let seating=true;
  const scene={width:700,height:150,region:'forest',navigation,
    actorBounds:a=>({left:a.key==='0'?40:0,right:a.key==='0'?52:900,top:40,bottom:40}),
    visible:(p,a)=>!seating||Math.abs(p.x-people[+a.key].x)<1e-8&&Math.abs(p.y-40)<1e-8};
  model.sync(people,scene);seating=false;
  for(const a of context.actors()){a.nextAt=1000;a.lastWalk=-85;}
  return {model,people,scene,actors:context.actors,searches:()=>context.searches};
}
for(const two of [false,true]) test('a stalled autonomous corridor completes '+(two?'two checked helper legs':'one checked helper leg'),async()=>{
  const {model,people}=await corridor(two);
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  let prev=people.map(a=>a.x),movers=[];
  for(let i=0;i<135;i++){
    model.step(.05,{autonomy:true});const rows=model.snapshot();
    for(let j=0;j<rows.length;j++)if(rows[j].x!==prev[j]){
      assert.ok(Math.abs(rows[j].x-prev[j])<=2.100001);
      if(!movers.includes(j))movers.push(j);
    }
    for(let j=0;j<2;j++)assert.ok(rows[j+1].x-rows[j].x>=20-1e-8);
    prev=rows.map(a=>a.x);
    if(prev[0]>=43-1e-6)break;
  }
  assert.ok(prev[0]>=43-1e-6);
  assert.deepEqual(movers,two?[2,1,0]:[1,0]);
});
for(const open of [false,true])test('a failed autonomous intention rechecks only when its local corridor opens: '+open,async()=>{
  const {model,actors}=await corridor(false);
  const actor=actors()[0];actor.lastWalk=-20;
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  const peer=actors()[open?1:14];
  assert.ok(model.move(peer.key,{x:peer.x+24,y:40},'ambient'));
  for(let i=0;i<65;i++)model.step(.05,{autonomy:true});
  const end=model.snapshot()[0];
  assert.equal(end.x,open?52:40);
});
for(const mode of ['pause','held','select','reduced'])test('background help yields immediately to '+mode,async()=>{
  const {model}=await corridor(true);
  model.move('0',{x:52,y:40},'ambient');
  let helper;
  for(let i=0;i<150&&!helper;i++){
    model.step(.05,{autonomy:true});helper=model.snapshot().find(a=>a.source==='yield'&&a.target);
  }
  assert.ok(helper);
  if(mode==='select')model.select(helper.key);
  const flags={autonomy:true,...(mode==='pause'?{blocked:true}:mode==='held'?{heldActor:helper.key}:mode==='reduced'?{reducedMotion:true}:{})};
  const before=model.snapshot().map(a=>[a.x,a.y]);
  for(let i=0;i<8;i++)model.step(.05,flags);
  assert.deepEqual(model.snapshot().map(a=>[a.x,a.y]),before);
});

for(const change of ['presentation','remove owner','new command'])test('live ambient handoff handles '+change,async()=>{
  const {model,people,scene}=await corridor(true);
  model.move('0',{x:52,y:40},'ambient');
  while(model.metrics().clock<8&&!model.snapshot()[2].target)model.step(.05,{autonomy:true});
  assert.ok(model.snapshot()[2].target);
  const before=model.snapshot().map(a=>[a.x,a.y]);
  if(change==='presentation')model.sync(people,scene);
  if(change==='remove owner')model.sync(people.slice(1),scene);
  if(change==='new command')model.move('1',{x:60,y:40},'drag',{pointerDrop:true});
  if(change==='presentation')assert.deepEqual(model.snapshot().map(a=>[a.x,a.y]),before);
  const afterSync=model.snapshot().map(a=>[a.key,a.x,a.y]);
  const moved=()=>model.snapshot()[0].x>40.1;
  if(change==='presentation'){
    while(model.metrics().clock<12&&!moved())model.step(.05,{autonomy:true});
    assert.ok(moved());
  }else {
    for(let i=0;i<8;i++)model.step(.05,{autonomy:true});
    const helper=model.snapshot().find(a=>a.key==='2'),prior=afterSync.find(a=>a[0]==='2');
    assert.deepEqual([helper.x,helper.y],[prior[1],prior[2]]);
    assert.ok(!helper.target);
  }
});

// Same feet can open a handoff when a real helper becomes available, or a
// resident's next normal intention points along a different safe corridor.
for(const retry of ['new intention','pending intention'])test('stationary helper re-enters after native manual cooldown: '+retry,async()=>{
  const {model,actors}=await corridor(false);
  model.select('1');model.select('14');
  for(const a of actors())a.nextAt=1000;
  const tick=n=>{for(let i=0;i<n;i++)model.step(.05,{autonomy:true});};
  if(retry==='pending intention')tick(80);
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  tick(retry==='pending intention'?150:260);
  assert.equal(model.snapshot()[0].x,40);
  if(retry==='new intention')assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  tick(175);
  assert.equal(model.snapshot()[0].x,52);
});
test('new autonomous direction can use a helper at unchanged feet',async()=>{
  const {model}=await corridor(false);
  assert.equal(model.move('0',{x:28,y:40},'ambient'),false);
  for(let i=0;i<20;i++)model.step(.05,{autonomy:true});
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  for(let i=0;i<150;i++)model.step(.05,{autonomy:true});
  assert.equal(model.snapshot()[0].x,52);
});

test('a blocked direction is cached against the helpers actually available during its search',async()=>{
  const {model,actors}=await corridor(false);
  const tick=n=>{for(let i=0;i<n;i++)model.step(.05,{autonomy:true});};
  assert.equal(model.move('0',{x:28,y:40},'ambient'),false);
  tick(30);
  model.select('1');model.select('14');for(const a of actors())a.nextAt=1000;
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  tick(260);
  assert.equal(model.snapshot()[0].x,40);
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  tick(160);assert.equal(model.snapshot()[0].x,52);
});

test('an exhausted direction is reused across repeated identical requests and unrelated motion',async()=>{
  const {model,searches,actors}=await corridor(false);
  const tick=n=>{for(let i=0;i<n;i++)model.step(.05,{autonomy:true});};
  for(let i=0;i<5;i++){
    assert.equal(model.move('0',{x:28,y:40},'ambient'),false);tick(12);
    if(i===1){
      const bystander=actors()[12];
      assert.ok(model.move(bystander.key,{x:bystander.x+8,y:bystander.y},'ambient'));tick(10);
    }
  }
  assert.equal(searches(),1);
});
test('a waiting owner observes the second helper leaving a conversation across two footprints',async()=>{
  const {model,actors}=await corridor(true,40);
  // Only the second helper is 80px away. It blocks the direct neighbor at 40px.
  const helper=actors()[2];helper.activity='together';
  assert.equal(model.move('0',{x:52,y:40},'ambient'),false);
  for(let i=0;i<35;i++)model.step(.05,{autonomy:true});
  assert.equal(model.snapshot()[0].x,40);
  helper.activity='rest';
  for(let i=0;i<165;i++)model.step(.05,{autonomy:true});
  assert.equal(model.snapshot()[0].x,52);
});
