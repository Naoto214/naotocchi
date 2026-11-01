const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const home=require('../home-production-diorama.js');
test('production event does not inherit persistent hungry care icon; care action remains recommended',()=>{
 const h=harness({homeDiorama:true,productionHome:true,worldScene:true});
 h.document.body.dataset.homeProduction='true';
 Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',stageIndex:3,hunger:5,health:100,energy:100,happiness:100,regionId:'forest'});
 h.api.setMessage('きれいな景色を見て、しばらく立ちどまっていた');h.api.render();
 assert.equal(h.get('message').dataset.careIcon,'');
 assert.equal(h.get('feedBtn').dataset.careRecommended,'true');
});
test('Japanese notice groups preserve all characters and the reported word boundaries',()=>{
 assert.equal(typeof home.noticeChunks,'function');
 for(const [text,words] of [
 ['もりにやってきた！きのこを見つけた。食べずに名前だけ考えた',['食べずに']],
 ['きれいな景色を見て、しばらく立ちどまっていた',['しばらく']],
 ['道に迷いかけたけれど、すぐに行き先を見つけた',['すぐに','行き先を']],
 ['「長い名前のキャラクター」\nありがとう！ English words 123',[]]]){
 const chunks=home.noticeChunks(text);assert.equal(chunks.join(''),text);
 for(const word of words)assert.ok(chunks.some(c=>c.includes(word)),word+' kept in one group');
 }
});
