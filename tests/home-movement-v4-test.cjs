const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createModel}=require('../home-production-model.js');

const safe={left:0,right:100,top:0,bottom:100};
const old={...safe,left:10};
const key='pet:x';
const same=(a,b)=>a.x===b.x&&a.y===b.y;

// Isolate destination arbitration while retaining the real model's bounds,
// pairwise contact predicates, minimum movement distance, and execution steps.
function fixture({original,expanded,proposal,route,reachable,others=[]}){
  const navigation={
    rawDestination:true,
    nearest:(p,_bounds,predicate)=>predicate?(predicate(proposal)?proposal:null):p,
    referenceNearest:(_p,b,predicate)=>{
      const p=b.left===old.left?original:expanded;
      return p&&predicate(p)?p:null;
    },
    route:(from,to,b,predicate)=>route(from,to,b,predicate),
    referenceRoute:(from,to,b,predicate)=>route(from,to,b,predicate),
    valid:()=>true,segmentSafe:()=>true,project:p=>p,unproject:p=>p,
    ...(reachable?{reachable}:{}),
  };
  const model=createModel({random:()=>.5});
  model.sync([{key,kind:'pet',x:70,y:70,w:2,h:2},...others],{
    width:100,height:100,region:'city',navigation,
    actorBounds:()=>safe,referenceBounds:()=>old,
  });
  return model;
}

for(const source of ['drag','ambient'])test(`a supplemental endpoint below the 3px acceptance threshold preserves the accepted ${source} route`,()=>{
  const original={x:74,y:72},proposal={x:60,y:50},tooClose={x:68,y:72};
  const model=fixture({original,expanded:original,proposal,
    route:(_from,to,_bounds,predicate)=>predicate(to)?[to]:[],
    reachable:(_from,_raw,_bounds,free,accept)=>free(tooClose)&&accept(tooClose)?[tooClose]:[],
  });
  assert.ok(model.move(key,{x:0,y:100},source),
    'a 2.83px supplemental candidate must not turn an accepted 4.47px movement into a rejection');
  assert.deepEqual(model.snapshot()[0].target,original);
  for(let i=0;i<20;i++)model.step(.05,{autonomy:false});
  const after=model.snapshot()[0];
  assert.ok(Math.hypot(after.x-original.x,after.y-original.y)<.5);
});

test('an original endpoint with a contact-blocked route is not restored over a reachable fallback',()=>{
  const original={x:30,y:90},expanded={x:20,y:92},proposal={x:60,y:50};
  const occupied={x:40,y:80};let rejectedContact=false;
  const model=fixture({original,expanded,proposal,
    others:[{key:'companion:blocker',kind:'companion',...occupied,w:2,h:2}],
    route:(_from,to,_bounds,predicate)=>{
      const clear=predicate(occupied);rejectedContact||=!clear;
      if(same(to,expanded))return [];
      if(same(to,original)){
        return clear&&predicate(to)?[occupied,to]:[];
      }
      return predicate(to)?[to]:[];
    },
  });
  assert.ok(model.move(key,{x:0,y:100},'drag'));
  assert.deepEqual(model.snapshot()[0].target,proposal);
  // Check the very same production predicate used for route planning rather
  // than teaching the navigation fixture that a particular point is blocked.
  assert.ok(rejectedContact,'the route predicate must reject the occupied intermediate point');
});

test('an inadmissible supplemental candidate keeps the existing safe V3 route',()=>{
  const original={x:30,y:60},proposal={x:25,y:55},retreat={x:20,y:65};
  let considered=false;
  const model=fixture({original,expanded:original,proposal,
    route:(_from,to,_bounds,predicate)=>predicate(to)?[to]:[],
    reachable:(_from,_raw,_bounds,free,accept)=>{
      considered=true;
      return free(retreat)&&accept(retreat)?[retreat]:[];
    },
  });
  assert.ok(model.move(key,{x:0,y:0},'drag'));
  assert.ok(considered);
  assert.deepEqual(model.snapshot()[0].target,proposal,
    'the supplemental candidate improves x but retreats in requested y');
});

test('an acceptable supplemental improvement remains available',()=>{
  const original={x:30,y:60},proposal={x:25,y:55},better={x:20,y:50};
  const model=fixture({original,expanded:original,proposal,
    route:(_from,to,_bounds,predicate)=>predicate(to)?[to]:[],
    reachable:(_from,_raw,_bounds,free,accept)=>free(better)&&accept(better)?[better]:[],
  });
  assert.ok(model.move(key,{x:0,y:0},'drag'));
  assert.deepEqual(model.snapshot()[0].target,better);
});
