const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
test('V12 notice leading symbols use the same existing art as notice text',()=>{
 const h=harness({fullDisplay:true});h.document.body.dataset.homeProduction='true';h.document.body.dataset.homeViewportVersion='12';
 for(const id of ['message','storyFlashEmoji'])for(const [emoji,asset]of [['🥚','assets/characters/egg/intact.png'],['🦉','assets/characters/companions/owl.png'],['🐻','assets/characters/partners/forest_bear.png']]){
  const n=h.get(id);n.innerHTML='';n.textContent='';h.api.setCommentText(n,emoji,true);assert.ok(n.innerHTML.includes(asset),id+' '+emoji);
 }
 for(const emoji of ['📋','🔧']){const n=h.get('storyFlashEmoji');n.innerHTML='';n.textContent='';h.api.setCommentText(n,emoji,true);assert.match(n.innerHTML,/<svg/);}
 const n=h.get('message');n.innerHTML='';n.textContent='';h.api.setCommentText(n,'🐕',true);assert.match(n.innerHTML,/v12-unresolved-icon/);assert.doesNotMatch(n.innerHTML,/dog\/08/);
});
test('V12 jellyfish notice uses the newly requested transparent illustration',()=>{
 const h=harness({fullDisplay:true});h.document.body.dataset.homeProduction='true';h.document.body.dataset.homeViewportVersion='12';
 for(const id of ['message','storyFlashEmoji']){const n=h.get(id);h.api.setCommentText(n,'🪼',true);assert.match(n.innerHTML,/assets\/ui\/home-notices\/jellyfish-v12\.png/);assert.doesNotMatch(n.innerHTML,/v12-unresolved-icon/);}
});
