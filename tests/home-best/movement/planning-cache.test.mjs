import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../../../home-production-model.js';

const pet={kind:'pet',key:'pet',w:10,h:10,x:24,y:40};
const peer={...pet,kind:'companion',key:'peer',x:60};
const box={left:10,right:150,top:40,bottom:40};

function setup(){
  let open=true,snapshots=0;
  const reads=[];
  const m=model.createModel({random:()=>.5});
  const nav={
    nearest:(p,b,ok=()=>true)=>ok(p)&&ok({...p})?p:null,
    route:(from,to,b,ok)=>ok(to)&&ok({...to})?[to]:[],
    segmentSafe:()=>true,
    valid:()=>true
  };
  m.sync([pet,peer],{region:'forest',width:160,height:80,navigation:nav,actorBounds:()=>box,
    visible:()=>open,planVisibility(){const value=open;snapshots++;return p=>{reads.push([p.x,p.y]);return value;};}});
  return {m,reads,snapshots:()=>snapshots,setOpen:value=>{open=value;}};
}

test('duplicate route and destination samples share one result only during this plan',()=>{
  const {m,reads,snapshots,setOpen}=setup();
  const goal={x:36,y:40};
  assert.ok(m.move('pet',goal,'ground'));
  assert.deepEqual(reads,[Object.values(goal)]);
  setOpen(false);
  m.step(.1,{autonomy:false});
  assert.equal(m.snapshot()[0].x,24);
  assert.equal(m.move('pet',goal,'ground'),false);
  setOpen(true);
  assert.ok(m.move('pet',goal,'ground'));
  assert.equal(snapshots(),3);
  assert.deepEqual(reads,Array.from({length:3},()=>Object.values(goal)));
});

test('the next planner sees a peer who left the previously occupied destination',()=>{
  const {m}=setup();
  const goal={x:51,y:40};
  assert.equal(m.move('pet',goal,'ground'),false);
  assert.ok(m.move('peer',{x:94,y:40},'ground'));
  for(let i=0;i<15;i++)m.step(.1,{autonomy:false});
  assert.ok(m.move('pet',goal,'ground'));
});

import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('point-dependent occlusion remains live and a new fixed-foreground plan sees new geometry',()=>{
  const source=readFileSync(new URL('../../../home-production-diorama.js',import.meta.url),'utf8');
  const start=source.indexOf('    const inside=(x,y,poly)=>');
  const end=source.indexOf('    // A relationship expression rebuilds',start);
  assert.ok(start>=0&&end>start);
  let hidden=true;
  const polygon=[[-100,-100],[150,-100],[150,150],[-100,150]];
  const scope={world:{pointIndependentOcclusion:false},scene:{navigation:{}},stage:{},worldHost:{},
    polygonsAt:p=>hidden&&(scope.world.pointIndependentOcclusion||p.x<40)?[polygon]:[],
    displayRect:()=>({left:0,top:0})};
  const visibility=runInNewContext(source.slice(start,end)+'\n;({planVisibility,visibleAt})',scope);
  const actor={...pet};
  const dynamic=visibility.planVisibility(actor);
  assert.equal(dynamic({x:24,y:40}),false);
  assert.equal(dynamic({x:98,y:40}),true);
  scope.world.pointIndependentOcclusion=true;
  const fixed=visibility.planVisibility(actor);
  assert.equal(fixed({x:98,y:40}),false);
  hidden=false;
  assert.equal(fixed({x:98,y:40}),false);
  assert.equal(visibility.visibleAt({x:98,y:40},actor),true);
  assert.equal(visibility.planVisibility(actor)({x:98,y:40}),true);
});
