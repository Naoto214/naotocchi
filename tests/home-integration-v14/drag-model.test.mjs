import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerrainNavigation} from '../../home-route-navigation.mjs';
import productionModel from '../../home-production-model.js';
const {createModel}=productionModel;

function lane(points,{reference=false,cell=4,box={left:0,right:150,top:36,bottom:36},walkable=()=>true,scale={x:1,y:1}}={}){
  const events=[],model=createModel({random:()=>.5,onEvent:e=>events.push(e)});
  const nav=createTerrainNavigation({width:160,height:100,cell,gridOrigin:{x:0,y:0},
    project:p=>p,unproject:p=>({...p,z:p.y}),walkable,
    segmentWalkable:(a,b)=>{
      const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*4);
      for(let i=1;i<=steps;i++)if(!walkable({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}))return false;
      return true;
    }});
  nav.intentAware=true;nav.intentScale=scale;
  let seating=true;
  const people=points.map(([x,y],i)=>({key:String(i),kind:i?'companion':'pet',x,y,w:10,h:10}));
  const scene={region:'forest',width:160,height:100,navigation:nav,actorBounds:()=>box,
    visible:(p,a)=>!seating||(p.x===people[a.key].x&&p.y===people[a.key].y)};
  if(reference)scene.referenceBounds=()=>({...box});
  model.sync(people,scene);
  seating=false;model.select('0');
  const drop=(x,y=36)=>model.move('0',{x,y},'drag',{pointerDrop:true});
  const travel=(seconds=5)=>{
    const frames=[model.snapshot()];for(let t=0;t<seconds;t+=.05){model.step(.05,{autonomy:false});frames.push(model.snapshot());}
    return frames;
  };
  return {model,events,drop,travel,people,scene,nav};
}

test('one idle neighbor walks to a safe near seat and the selected resident reaches the raw release',()=>{
  const {model,drop,travel,events}=lane([[40,36],[60,36],[120,36]]);
  drop(52);
  assert.deepEqual(model.snapshot().map(a=>a.x),[40,60,120]);
  const frames=travel();
  for(const frame of frames){
    assert.ok(frame[1].x-frame[0].x>=20-1e-7);
    assert.ok(frame[1].x<=84&&frame[2].x===120);
  }
  assert.ok(frames.some((s,i)=>i>0&&s[1].x>frames[i-1][1].x&&s[0].x===40));
  assert.equal(model.snapshot()[0].x,52);
  assert.ok(events.some(e=>e.actor.key==='0'&&e.type==='arrive'&&e.source==='drag'));
});

test('a neighbor with a pending manual command keeps its own intention',()=>{
  const {model,drop,travel}=lane([[40,36],[60,36],[120,36]]);
  model.select('1');model.select('0');drop(52);
  travel();assert.deepEqual(model.snapshot().map(a=>a.x),[40,60,120]);
});

test('an inaccessible occupied goal keeps everyone in place',()=>{
  const {model,drop,travel}=lane([[40,36],[60,36]],{box:{left:30,right:60,top:36,bottom:36}});
  assert.equal(drop(52),false);travel();
  assert.deepEqual(model.snapshot().map(a=>a.x),[40,60]);
  assert.equal(model.snapshot()[0].activity,'look');
});

for(const stop of ['cancel','select','departure','paused'])test('a helper stops on '+stop,()=>{
  const {model,drop,travel,people,scene}=lane([[40,36],[60,36],[120,36]]);
  drop(52);model.step(.05,{autonomy:false});
  const helper=model.snapshot().find(a=>a.key==='1');
  assert.ok(helper.target&&helper.x>60);
  if(stop==='departure')model.sync(people.slice(1),scene);
  else if(stop==='paused')model.step(0,{blocked:true});
  else if(stop==='select')model.select('0');
  else model.cancel();
  travel();
  assert.equal(model.snapshot().find(a=>a.key==='1').x,helper.x);
});

test('an off-grid alternative around a painted corner arrives near the release',()=>{
  const a={x:42,y:65},p={x:61,y:47.8};
  const box={left:4,right:104,top:4,bottom:90};
  const walkable=q=>!(q.x>50&&q.x<67&&q.y>0&&q.y<49)&&!(q.x>52&&q.x<66&&q.y>51&&q.y<90);
  const {model,drop,travel}=lane([[a.x,a.y]],{walkable,cell:8,box});
  assert.ok(!walkable(p));assert.ok(drop(p.x,p.y));
  const initial=model.snapshot()[0];assert.ok(initial.route.length>=1);
  const frames=travel(),end=frames.at(-1)[0];
  assert.ok(frames.every(f=>walkable(f[0])));assert.ok(Math.hypot(end.x-p.x,end.y-p.y)<=2.1);
  assert.ok(Math.hypot(end.x-a.x,end.y-a.y)>15);
});

test('a far partial advances at least a quarter of the raw request in its direction',()=>{
  for(const [limit,accepted] of [[49,false],[61,true]]){
    const {model,drop,travel}=lane([[32,36]],{walkable:p=>p.x<=limit});
    assert.equal(drop(112),accepted);travel();
    const end=model.snapshot()[0];assert.ok(end.x<=limit&&end.y===36);
    if(accepted)assert.ok(end.x-32>=20);else assert.equal(end.x,32);
  }
});

test('ordinary programmatic and autonomous commands do not recruit another resident',()=>{
  for(const source of ['drag','ambient']){
    const {model,travel}=lane([[40,36],[60,36],[120,36]]);
    model.move('0',{x:52,y:36},source);travel();
    assert.deepEqual(model.snapshot().slice(1).map(a=>a.x),[60,120]);
  }
});

test('a manual takeover of the helper immediately releases the requester to use the open lane',()=>{
  const box={left:0,right:350,top:36,bottom:36};
  const {model,drop,travel}=lane([[40,36],[60,36]],{box});
  drop(52);travel(.2);
  model.select('1');
  assert.ok(model.move('1',{x:330,y:36},'drag',{pointerDrop:true}));
  travel(2);
  const [owner,peer]=model.snapshot();
  assert.equal(owner.x,52);assert.ok(peer.target&&peer.target.x===330);
  model.select('0');
  assert.equal(model.snapshot()[1].target.x,330);
});

test('a new roster member never inherits a departing helper’s move',()=>{
  const {model,drop,travel,people,scene}=lane([[40,36],[60,36],[120,36]]);
  drop(52);travel(.1);
  const newcomer={...people[1],key:'3',id:'new',x:110};
  model.sync([people[0],people[2],newcomer],scene);
  const opening=model.snapshot().find(a=>a.key==='3');
  travel(4);
  const end=model.snapshot().find(a=>a.key==='3');
  assert.equal(end.x,opening.x);
  assert.equal(end.y,opening.y);
  assert.ok(!end.target&&!end.yieldFor);
});

test('identical failed graph routes are queried once per drop and retried with fresh state',()=>{
  const {drop,model,nav}=lane([[40,36]],{reference:true,walkable:p=>p.x<=40||p.x>=49});
  const calls={route:0,referenceRoute:0,reachable:0};
  for(const method of Object.keys(calls)){
    const run=nav[method];
    nav[method]=(...args)=>{calls[method]++;return run(...args);};
  }
  assert.equal(drop(50),false);
  assert.deepEqual(calls,{route:1,referenceRoute:1,reachable:2});
  model.select('0');
  assert.equal(drop(50),false);
  assert.deepEqual(calls,{route:2,referenceRoute:2,reachable:4});
  model.select('0');
  assert.equal(drop(34),true);
  assert.equal(calls.route,2);
});

test('every committed walk checks the interior of the step and allows escape from existing contact',()=>{
  const runner={key:'runner',kind:'pet',w:10,h:10,x:48,y:50};
  function walk(peerY,goal,source){
    let seating=true;
    const model=createModel({random:()=>.5});
    const peer={key:'peer',kind:'companion',w:10,h:10,x:50,y:peerY};
    model.sync([runner,peer],{region:'home',width:120,height:100,
      actorBounds:()=>({left:0,right:120,top:0,bottom:100}),
      visible:(p,a)=>!seating||p.x===(a.key===runner.key?runner:peer).x&&p.y===(a.key===runner.key?runner:peer).y});
    seating=false;
    assert.ok(model.move('runner',{x:goal,y:50},source));
    model.step(.1,{autonomy:false});
    return model.snapshot()[0].x;
  }
  // The 4.2px hop crosses the ellipse near its top. Both endpoints are clear.
  for(const source of ['ambient','ground','drag']){
    assert.equal(walk(32.45,80,source),48,source);
    assert.ok(walk(35,20,source)<48,'an existing overlap can separate');
  }
});
