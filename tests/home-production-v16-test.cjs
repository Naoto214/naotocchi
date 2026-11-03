const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
test('V16 hides transient Home count deltas while preserving narration, milestone numbers and raw message',()=>{
 const h=harness({homeDiorama:true,productionHome:true});h.document.body.dataset.homeProduction='true';h.document.body.dataset.homeViewportVersion='12';h.document.body.dataset.homeDisplayVersion='16';
 for(const id of ['message','storyFlashText','homeChoiceText','birthdayToast','mgResultToast'])for(const [raw,want]of [
  ['うんち+1',''],['おかえり。変化：おなか−30／うんち+1','おかえり。'],
  ['見つけた！／コイン＋5','見つけた！'],['25さいになった！ 5回たっせい。そだち20！','25さいになった！ 5回たっせい。そだち20！']
 ]){h.api.setCommentText(h.get(id),raw,true);assert.equal(h.get(id).textContent,want,id);}
 const raw='おかえり。変化：うんち+1';h.api.setMessage(raw);h.api.render();assert.equal(h.api.getMessage(),raw);
 for(const id of ['speechText','homeActionText']){h.api.setCommentText(h.get(id),'うんち+1',true);assert.equal(h.get(id).textContent,'うんち+1');}
 h.document.body.dataset.homeDisplayVersion='15';h.api.setCommentText(h.get('message'),'うんち+1',true);assert.equal(h.get('message').textContent,'うんち+1');
});
test('V16 offline display filtering leaves original progression and save-compatible state intact',()=>{
 const result=[];for(const version of ['15','16']){const h=harness({homeDiorama:true,productionHome:true}),s=h.api.state();h.document.body.dataset.homeDisplayVersion=version;h.document.body.dataset.homeViewportVersion='12';Object.assign(s,{stage:'growing',infinite:false,isSleeping:false,hunger:95,happiness:95,energy:50,poopCount:0});const r=h.api.applyOfflineProgress(100000000,100000000-3600000);result.push({r:JSON.parse(JSON.stringify(r)),hunger:s.hunger,happiness:s.happiness,energy:s.energy,poop:s.poopCount});}assert.deepEqual(result[0],result[1]);assert.equal(result[1].poop,1);
});
