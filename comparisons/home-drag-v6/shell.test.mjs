import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {gameURL,readDragScene,sceneQuery} from './shell-model.mjs';

const readScene = () => ({region:'forest',time:'day',paused:false});
const base = 'https://example.invalid/test/v6/';

test('both arms launch the same frozen region and fixture regardless of caller play state', () => {
  for (const paused of [true,false]) {
    for (let count=1; count<=28; count++) {
      const scene={region:'river_lake',time:'night',count,paused};
      const v5=gameURL({...scene,arm:'v5'},base);
      const v6=gameURL({...scene,arm:'v6'},base);
      assert.equal(v5.pathname,'/test/game/drag-v5.html');
      assert.equal(v6.pathname,'/test/game/drag-v6.html');
      assert.equal(v5.search,v6.search);
      assert.deepEqual(Object.fromEntries(v6.searchParams),{
        region:'river_lake',time:'night',count:String(count),paused:'1',clock:'0',
        ground:'on',paired:'1',variant:'B',compareSplit:'0',season:'autumn',weather:'sunny',
      });
    }
  }
});

test('the owner URL preserves only the active arm, complete-count fixture and selected scene', () => {
  for (let count=1; count<=28; count++) {
    const scene=readDragScene(new URLSearchParams({arm:'v5',count}),readScene);
    assert.deepEqual(scene,{...readScene(),arm:'v5',count});
    assert.equal(sceneQuery(scene).get('count'),String(count));
    assert.equal(sceneQuery(scene).get('paused'),'0');
  }
  for (const count of ['', '0', '29', '8.5', '04', ' 8']) {
    assert.deepEqual(readDragScene(new URLSearchParams({arm:'garbage',count}),readScene),
      {...readScene(),arm:'v6',count:28});
  }
});

test('the first complete, stationary native cast stays available during later play', () => {
  const actors=[{key:'pet:dog',asset:'dog.png',x:1,y:2,w:8,h:9,target:null}];
  const window={HomeCastTrial:{ready:false,settings:{paused:true,count:1},inspect:()=>actors},
    HomeBeauty:{frozen:true,clockSeconds:0,settings:{region:'home',time:'morning',season:'autumn',weather:'sunny',variant:'B'}}};
  vm.runInNewContext(fs.readFileSync(new URL('./trial-hooks.js',import.meta.url),'utf8'),
    {window,innerWidth:375,innerHeight:760,URLSearchParams,location:{search:""}});
  assert.equal(window.HomeDragTrial.opening(),null);
  window.HomeCastTrial.ready=true;
  const opening=window.HomeDragTrial.opening();
  assert.equal(opening.actors.length,1);
  assert.equal(opening.actors[0][2],1);
  actors[0].x=20;
  window.HomeCastTrial.settings.paused=false;
  assert.equal(window.HomeDragTrial.opening(),opening);
  assert.equal(opening.actors[0][2],1);
});

test('the paired fixture uses the last fitted native terrain, then releases all startup hooks', () => {
  const calls=[];
  let model, castActors, paints=0;
  const seedRandom=()=>.5;
  const create = ({random}) => {
    const sync=(rows,scene)=>{
      calls.push([rows.length,scene.phase]);
      castActors=rows.map(r=>({...r,x:scene.navigation.x,y:random()}));
    };
    model={sync,originalSync:sync};
    return model;
  };
  const attach=()=>{};
  const window={HomeBeauty:{actorRandom:seedRandom,frozen:true,clockSeconds:0,settings:{}},
    HomeCastTrial:{ready:false,attach,settings:{count:1,paused:true},inspect:()=>castActors},
    NaotocchiHomeDioramaModel:{createModel:create}};
  vm.runInNewContext(fs.readFileSync(new URL('./trial-hooks.js',import.meta.url),'utf8'),
    {window,innerWidth:375,innerHeight:760,URLSearchParams,location:{search:'?paired=1'}});
  window.NaotocchiHomeDioramaModel.createModel({random:seedRandom});
  window.HomeCastTrial.attach({repaint(){paints++;}});
  const resident=[{key:'pet:dog',asset:'dog.png',w:6,h:7}];
  model.sync(resident,{phase:'provisional',navigation:{x:10}});
  model.sync(resident,{phase:'settled',navigation:{x:15}});
  assert.equal(window.HomeDragTrial.opening(),null);
  window.HomeCastTrial.ready=true;
  const opening=window.HomeDragTrial.opening();
  assert.deepEqual(calls,[[1,'provisional'],[1,'settled'],[0,'settled'],[1,'settled']]);
  assert.equal(opening.actors[0][2],15);
  assert.equal(opening.actors[0][3],((Math.imul(1664525,214)+1013904223)>>>0)/4294967296);
  window.HomeCastTrial.settings.paused=false;
  assert.equal(window.HomeDragTrial.opening(),opening);
  assert.equal(paints,1);
  assert.equal(model.sync,model.originalSync);
  assert.equal(window.HomeCastTrial.attach,attach);
  assert.equal(window.NaotocchiHomeDioramaModel.createModel,create);
});
