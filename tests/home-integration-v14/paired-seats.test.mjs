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
