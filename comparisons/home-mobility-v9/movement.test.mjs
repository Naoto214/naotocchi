import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forest,modelApi,sx,sy} from './movement-scene.mjs';

const api=modelApi(!!process.env.UNMODIFIED_V8);
const cases=JSON.parse(fs.readFileSync(new URL('./forest-refusals.json',import.meta.url)));
const distance=(a,b)=>Math.hypot((b.x-a.x)*sx,(b.y-a.y)*sy);
function restored(row, seed=214) {
  const feet=row.peers.map(([key,x,y,w,h])=>[key,null,x,y,w,h]);
  const trial=forest(api,seed,feet),{model}=trial;
  // Keep unrelated feet at their captured positions and preserve helper ineligibility.
  // The real continuous runs separately leave every resident's controls and decisions live.
  for(const person of model.testState().actors) {
    const record=row.peers.find(p=>p[0]===person.key);
    person.nextAt=1000;person.lastWalk=-90;person.activity=record[11];
    person.manualUntil=(record[5]||record[9]||record[10]||row.selected===person.key)?1000:Math.max(0,record[7]-row.clock);
    person.yieldAfter=Math.max(0,record[8]-row.clock);
  }
  return trial;
}
for(const row of cases) test('an original forest intention completes a checked normal walk at captured refusal '+row.index,()=>{
  const {model}=restored(row);
  const who=()=>model.testState().actors.find(a=>a.key===row.key),start={...who()};
  const goal={x:row.goal[0],y:row.goal[1]};
  model.move(row.key,goal,'ambient');
  const helpers=new Set();let accepted=false;
  for(let i=0;i<240;i++) {
    model.step(.05);
    const actors=model.testState().actors;
    const moving=actors.filter(a=>a.source==='yield'&&a.target);
    assert.ok(moving.length<=1);for(const b of moving)helpers.add(b.key);
    if(who().target && who().source==='ambient')accepted=true;
    if(accepted&&!who().target)break;
  }
  assert.ok(accepted,'owner received no route');
  assert.ok(helpers.size<=2);
  assert.ok(distance(who(),start)>=8-1e-6,'at least 8 CSS px of net own-goal travel');
  assert.ok(distance(start,goal)-distance(who(),goal)>=.75,'endpoint approached actual native goal');
  assert.equal(who().ambientEscape,false);
});

test('the native seating grid reads a fixed resident box once per search',()=>{
  const counts=[];
  for(const baseline of [true,!!process.env.UNMODIFIED_V8]){
    const native=modelApi(baseline);let reads=0;
    // This test counts the actual actorBounds callback inside sync, including the
    // candidate grid forced to search by the authentic overlapping opening.
    const {model,scene,rows}=forest(native);
    const rebuilt=native.createModel({random:()=>.5});
    const reference=scene.actorBounds;
    const measured={...scene,actorBounds:(a,b)=>{reads++;return reference(a,b);}};
    rebuilt.sync(rows,measured);
    counts.push({reads,feet:rebuilt.snapshot().map(a=>[a.key,a.x,a.y])});
  }
  assert.deepEqual(counts[1].feet,counts[0].feet);
  assert.ok(counts[1].reads<counts[0].reads/4,JSON.stringify(counts.map(c=>c.reads)));
});

function parallelCorridors() {
  const native=modelApi(!!process.env.UNMODIFIED_V8);
  const rows=Array.from({length:16},(_,i)=>({key:String(i),kind:i?'companion':'pet',w:10,h:10,
    x:i<4?(i%2?60:40):200+(i-4)*35,y:i<4?(i<2?40:100):150}));
  const nav={intentAware:true,intentScale:{x:1,y:1},initialPoint:i=>rows[i],project:p=>p,unproject:p=>p,
    nearest:(p,b,test=()=>true)=>test(p)?p:null, route:(a,p,b,test)=>test(p)?[p]:[],
    valid:()=>true, segmentSafe:(a,p,visible=()=>true)=>visible(a)&&visible(p)};
  const model=native.createModel({random:()=>.5});
  const scene={width:700,height:200,region:'forest',navigation:nav,
    actorBounds:a=>({left:a.key==='0'||a.key==='2'?40:0,right:a.key==='0'||a.key==='2'?52:680,
      top:rows[+a.key].y,bottom:rows[+a.key].y})};
  model.sync(rows,scene);
  for(const a of model.testState().actors){a.nextAt=1000;a.lastWalk=-90;}
  return {model,scene,rows};
}
test('both independent stalled requests keep their place through a busy helper search',()=>{
  const {model}=parallelCorridors();
  model.move('0',{x:52,y:40},'ambient');
  model.move('2',{x:52,y:100},'ambient');
  for(let i=0;i<239;i++)model.step(.05);
  assert.deepEqual([model.snapshot()[0].x,model.snapshot()[2].x],[52,52]);
});

test('a resident takes a safe bend before continuing the original crowded-room intention',()=>{
  const native=modelApi(!!process.env.UNMODIFIED_V8);
  const rows=Array.from({length:16},(_,i)=>({key:String(i),kind:i?'companion':'pet',w:10,h:10,
    x:i===0?40:i===1?40:130+i*30,y:i===0?40:i===1?24:80}));
  // A thin painted L. The first five pixels lead away from the goal.
  const legal=p=>Math.abs(p.x-40)<.2&&p.y>=40&&p.y<=45.05 || Math.abs(p.y-45)<.2&&p.x>=40&&p.x<=65;
  const nav={intentAware:true,intentScale:{x:1,y:1},initialPoint:i=>rows[i],project:p=>p,unproject:p=>p,
    nearest:(p,b,test=()=>true)=>test(p)&&legal(p)?p:null,route:()=>[],valid:p=>legal(p)||rows.some(r=>r.x===p.x&&r.y===p.y),
    segmentSafe:(a,b,visible=()=>true)=>{
      for(let j=0;j<=12;j++){
        const p={x:a.x+(b.x-a.x)*j/12,y:a.y+(b.y-a.y)*j/12};
        if(!legal(p)||!visible(p))return false;
      }
      return true;
    }};
  const model=native.createModel({random:()=>.5});
  let seating=true;
  const scene={width:700,height:200,navigation:nav,region:'forest',visible:(p,a)=>!seating||Math.hypot(p.x-rows[+a.key].x,p.y-rows[+a.key].y)<1e-7,
    actorBounds:a=>a.key==='0'?{left:40,right:65,top:40,bottom:46}:{left:rows[+a.key].x,right:rows[+a.key].x,top:rows[+a.key].y,bottom:rows[+a.key].y}};
  model.sync(rows,scene);seating=false;for(const a of model.testState().actors){a.nextAt=1000;a.lastWalk=-90;}
  const goal={x:64,y:40};model.move('0',goal,'ambient');
  for(let i=0;i<210;i++)model.step(.05);
  const a=model.snapshot()[0];
  assert.ok(a.x>=48 && Math.abs(a.y-45)<.2,`ended at ${a.x}, ${a.y}`);
  assert.equal(a.ambientEscape,false);
});

test('arrival from a micro-escape retains the same intention when the nearby corridor opens',()=>{
  const {model}=parallelCorridors();
  const [a,b]=model.testState().actors;
  // These resident bounds allow a small orthogonal clearance, followed by a
  // forward walk when the other foot vacates the corridor.
  a.x=48; b.x=28;
  a.lastWalk=-90;
  model.move('0',{x:41,y:40},'ambient');
  const leg=a.target;
  assert.ok(leg&&a.ambientEscape,'the only immediate safe movement is a micro-escape');
  // Neighbor moves away using the ordinary ambient entry point.
  model.move('1',{x:3,y:40},'ambient');
  for(let i=0;i<115;i++)model.step(.05);
  assert.ok(a.x<=43.000001,'the same original goal was retried before a new idle decision');
});

for(const mode of ['hold','replace','same scene sync','population change','pause','reduced motion']) {
  test('a pending checked handoff respects '+mode,()=>{
    const {model,rows,scene}=parallelCorridors();
    model.move('0',{x:52,y:40},'ambient');
    const get=key=>model.testState().actors.find(a=>a.key===key);
    for(let i=0;i<150&&!get('1').target;i++)model.step(.05);
    assert.ok(get('1').target&&get('1').source==='yield');
    const x=get('1').x;
    if(mode==='replace'){
      model.select('0');model.move('0',{x:40,y:40},'drag',{pointerDrop:true});
    }
    if(mode==='same scene sync')model.sync(rows,scene);
    if(mode==='population change')model.sync(rows.filter(r=>r.key!=='0'),scene);
    const flags=mode==='pause'?{blocked:true}:mode==='hold'?{heldActor:'1'}:mode==='reduced motion'?{reducedMotion:true}:{};
    for(let i=0;i<(mode==='same scene sync'?80:8);i++)model.step(.05,flags);
    if(mode==='same scene sync')assert.equal(get('0').x,52);
    else {
      assert.ok(!get('1').target);
      // A population change may legitimately trigger the existing seating policy.
      if(mode!=='population change')assert.equal(get('1').x,x);
      assert.ok(!get('0')||get('0').x===40);
    }
  });
}
test('holding the owner cancels its verified native route before another footstep',()=>{
  const {model}=parallelCorridors();
  model.move('0',{x:52,y:40},'ambient');
  const who=()=>model.testState().actors[0];
  for(let i=0;i<150&&!who().target;i++)model.step(.05);
  assert.ok(who().target&&who().intentRoute);
  const before=who().x;
  model.step(.05,{heldActor:'0'});
  assert.equal(who().x,before);
  assert.ok(!who().target);
});
