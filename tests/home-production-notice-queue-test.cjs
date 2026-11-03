const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');
let html;
require('./visual-qa.cjs')().configureServer({middlewares:{use(_path,handler){handler({},{setHeader(){},end(value){html=value;}});}}});
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');

for(const [gender,orientationId,targets,expectedGender] of [
 ['male','gay',['male'],'female'],
 ['male','straight',['female'],'female'],
 ['nonbinary','straight',['male','female'],'nonbinary'],
])test(`production notice lane delivers ${gender}/${orientationId} transition after growth and story`,()=>{
 const h=harness({homeDiorama:true,productionHome:true,worldScene:true});
 h.sandbox.Math=Object.create(Math);h.sandbox.Math.random=()=>.4;
 const state=h.api.state();
 Object.assign(state,JSON.parse(JSON.stringify(fixtures.phone_dog)),{
  speciesLine:'clownfish',ageTicks:1399,stageIndex:6,regionId:'forest',
  gender,orientationId,attractedTo:targets,clownfishFemaleReached:false,
  pendingClownfishTransition:null,partner:null,health:100,hunger:100,
  energy:100,happiness:100,poopCount:0,transformMeter:0,
 });
 h.api.render();h.advance(20000);
 // This harness uses the legacy 70-year stage table; the browser loads the
 // species-specific profile and crosses at 84. The actual notice queue is shared.
 state.ageTicks=1400;h.api.onAgeChanged(69);h.api.showPendingClownfishTransition();
 const text=()=>h.get('storyFlashText').textContent;
 assert.match(text(),/70さいになった/);
 h.advance(4199);assert.match(text(),/70さいになった/,'growth remains readable for its whole slot');
 h.advance(1);assert.match(text(),/姿がかわった/);
 h.advance(4199);assert.match(text(),/姿がかわった/,'story remains readable for its whole slot');
 h.advance(1);assert.match(text(),/からだがメスになった。好きになる相手は、そのまま/);
 assert.equal(h.get('storyFlash').classList.contains('hidden'),false);
 assert.equal(state.gender,expectedGender);assert.deepEqual([...state.attractedTo].sort(),[...targets].sort());
 assert.equal(state.pendingClownfishTransition,null);
 h.advance(4199);assert.match(text(),/からだがメスになった/);
 assert.equal(h.get('storyFlash').classList.contains('hidden'),false);
 h.advance(1);assert.equal(h.get('storyFlash').classList.contains('hidden'),true);
});
