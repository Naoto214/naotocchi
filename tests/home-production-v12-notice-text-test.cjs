const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
test('V12 notice routes remove parameter deltas but retain meaningful numbers and prose',()=>{
 const h=harness({homeDiorama:true,productionHome:true});
 h.document.body.dataset.homeProduction='true';h.document.body.dataset.homeViewportVersion='12';
 for(const id of ['message','storyFlashText','homeChoiceText','birthdayToast','mgResultToast']){
  for(const [raw,want] of [
   ['少ししょんぼり / おとろえ＋6','少ししょんぼり'],
   ['うれしそう／おとろえ−2','うれしそう'],
   ['びょうきではないのに、くすりを飲ませた／けんこう−5','びょうきではないのに、くすりを飲ませた'],
   ['そだち＋1：せいちょうした','せいちょうした'],
   ['水切りの石が3回はねた。ごきげん+6.00000000001','水切りの石が3回はねた。'],
   ['25さいになった！ 5回たっせい。そだち20！','25さいになった！ 5回たっせい。そだち20！']
  ]){const n=h.get(id);n.innerHTML='';n.textContent='';h.api.setCommentText(n,raw,true);assert.equal(n.textContent,want,id);}
 }
});
test('V12 filtering does not rewrite spoken quotes, other screens, or V11',()=>{
 const h=harness({homeDiorama:true,productionHome:true});h.document.body.dataset.homeProduction='true';
 const raw='そだち＋1：せいちょうした';
 h.document.body.dataset.homeViewportVersion='12';
 for(const id of ['speechText','homeActionText']){h.api.setCommentText(h.get(id),raw,true);assert.equal(h.get(id).textContent,raw);}
 h.document.body.dataset.homeViewportVersion='11';h.api.setCommentText(h.get('storyFlashText'),raw,true);assert.equal(h.get('storyFlashText').textContent,raw);
});
test('story event route filters display only and keeps its original event payload',()=>{
 const h=harness({homeDiorama:true,productionHome:true});
 h.document.body.dataset.homeProduction='true';h.document.body.dataset.homeViewportVersion='12';
 const event={emoji:'📋',message:'3回目の発見！ ごきげん+6.00000001'};
 h.api.showStoryEvent(event);
 assert.equal(h.get('storyFlashText').textContent,'3回目の発見！');
 assert.equal(event.message,'3回目の発見！ ごきげん+6.00000001');
});
