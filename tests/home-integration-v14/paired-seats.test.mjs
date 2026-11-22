import assert from 'node:assert/strict';
import test from 'node:test';
import {createTerrainNavigation} from '../../home-route-navigation.mjs';
import production from '../../home-production-model.js';

const feet = actors => actors.slice(0, 2).map(({x,y}) => [x,y]);

test('first terrain seating keeps the pair on the layout side at its original spacing', () => {
  const navigation = createTerrainNavigation({
    width:350, height:350, project:p=>({x:p.x,y:p.z}), unproject:p=>({x:p.x,y:0,z:p.y}), walkable:()=>true
  });
  navigation.initialPoint = i => i===0 ? {x:192,y:280} : {x:274,y:87};
  const scene = {region:'forest',width:350,height:350,navigation,groundTop:50};
  const cast = [
    {kind:'pet',key:'pet',x:202,y:226,w:42,h:49},
    {kind:'partner',key:'bear',x:148,y:226,w:35,h:36}
  ];
  const model = production.createModel({random:()=>.5});
  model.sync(cast,{...scene,navigation:null});
  model.sync(cast,scene);
  assert.deepEqual(feet(model.snapshot()), [[192,280],[138,280]]);

  model.select('bear');
  assert.equal(model.move('bear',{x:90,y:280},'tap'),true);
  for(let i=0;i<80;i++)model.step(.05,{autonomy:false});
  const walked=feet(model.snapshot());
  assert.ok(walked[1][0]<100);
  model.cancel();
  model.sync(cast,scene);
  assert.deepEqual(feet(model.snapshot()),walked);
  const visitors=Array.from({length:4},(_,i)=>({kind:'companion',key:'guest'+i,x:300,y:70+i*35,w:12,h:12}));
  model.sync([...cast,...visitors],scene);
  assert.deepEqual(feet(model.snapshot()),walked);
  model.sync(cast,{...scene,region:'mountain'});
  assert.deepEqual(feet(model.snapshot()),[[192,280],[138,280]]);
});

test('a blocked layout seat is corrected on terrain before the other residents arrive', () => {
  const nav=createTerrainNavigation({width:350,height:350,
    project:p=>({x:p.x,y:p.z}), unproject:p=>({x:p.x,y:0,z:p.y}),
    walkable:p=>p.x>=135});
  nav.initialPoint=i=>({x:i?320:180,y:i?140:260});
  const scene={region:'forest',width:350,height:350,navigation:nav,
    visible:p=>p.y>=160};
  const hero={kind:'pet',key:'hero',x:200,y:200,w:40,h:40};
  const bear={kind:'partner',key:'bear',x:145,y:200,w:35,h:35};
  const model=production.createModel({random:()=>.5});
  model.sync([hero,bear],scene);
  const [lead,mate]=model.snapshot();
  assert.ok(mate.x<lead.x && nav.valid(mate) && scene.visible(mate));
  assert.ok(Math.hypot((lead.x-mate.x)/47.5,(lead.y-mate.y)/38.5)>=1);
  assert.ok(Math.hypot(lead.x-mate.x,lead.y-mate.y)<65);
});

test('fitting a pair into an occupied seat preserves unrelated regional seats', () => {
  const x=[160,272,104,72];
  const nav=createTerrainNavigation({width:320,height:200,cell:8,
    project:p=>({x:p.x,y:p.z}), unproject:p=>({x:p.x,y:0,z:p.y}),
    walkable:p=>p.z===128});
  nav.initialPoint=i=>({x:x[i],y:128});
  const scene={region:'jungle',width:320,height:200,navigation:nav,
    actorBounds:()=>({left:0,right:320,top:128,bottom:128})};
  const cast=['pet','partner','companion','companion'].map((kind,i)=>({
    kind,key:'resident'+i,x:[200,144,104,72][i],y:128,w:22,h:22
  }));
  const model=production.createModel({random:()=>.5});
  model.sync(cast,scene);
  const positions=model.snapshot().map(a=>a.x);
  assert.deepEqual(positions,[160,104,40,72]);
});


test('the coupled placement uses the measured camera once before first paint', () => {
  const nav=createTerrainNavigation({width:320,height:320,project:p=>({x:p.x,y:p.z}),
    unproject:p=>({x:p.x,y:0,z:p.y}),walkable:()=>true});
  nav.initialPoint=i=>({x:i?270:160,y:i?100:210});
  const cast=[{kind:'pet',key:'hero',x:200,y:200,w:30,h:32},
    {kind:'partner',key:'mate',x:144,y:200,w:22,h:24}];
  const model=production.createModel({random:()=>.5});
  const scene={region:'forest',width:320,height:320,navigation:nav,groundTop:40};
  model.sync(cast,scene,true);
  assert.ok(model.seatingPending());
  const provisional=feet(model.snapshot());
  model.sync(cast,{...scene,actorBounds:()=>({left:90,right:290,top:90,bottom:290})},true);
  assert.deepEqual(feet(model.snapshot()),provisional);
  model.finishSeating(p=>p.x>=90);
  assert.equal(model.seatingPending(),false);
  assert.deepEqual(feet(model.snapshot()),[[160,210],[104,210]]);
  model.finishSeating();
  assert.deepEqual(feet(model.snapshot()),[[160,210],[104,210]]);
});

test('portrait depth retains the cast offset with only enough width for painted bodies', () => {
  const nav=createTerrainNavigation({width:340,height:340,project:p=>({x:p.x,y:p.z}),
    unproject:p=>({x:p.x,y:0,z:p.y}),walkable:()=>true});
  nav.initialPoint=i=>({x:i?260:180,y:i?100:160});
  const cast=[{kind:'pet',key:'hero',x:140,y:160,w:40,h:50},
    {kind:'partner',key:'mate',x:132,y:240,w:30,h:38}];
  for(const [scaleY,expectedX] of [[.15,153.25],[.45,172]]){
    const model=production.createModel({random:()=>.5});
    model.sync(cast,{region:'forest',width:340,height:340,groundTop:20,navigation:nav},true);
    model.finishSeating(()=>true,{x:1,y:scaleY,body:.75});
    assert.deepEqual(feet(model.snapshot()),[[180,160],[expectedX,240]]);
  }
});
