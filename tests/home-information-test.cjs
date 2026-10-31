const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {harness}=require('./helpers/runtime-harness.cjs');
test('multiple Home story notices retain their text and show in order',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});const s=h.api.state();Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'forest'});h.get('storyFlash').classList.add('hidden');h.api.render();h.advance(20000);
 h.api.showStoryEvent({emoji:'⭐',message:'最初のおしらせ'});h.api.showStoryEvent({emoji:'🏆',message:'次のおしらせ'});
 assert.match(h.get('storyFlashText').innerHTML+h.get('storyFlashText').textContent,/最初のおしらせ/);
 h.advance(4300);assert.match(h.get('storyFlashText').innerHTML+h.get('storyFlashText').textContent,/次のおしらせ/);
});
test('Home information contains ordered status/environment/name/gesture then event slot',()=>{
 const html=fs.readFileSync('index.html','utf8');const ids=['homeInformation','ageLabel','environmentLabel','mainNameLabel','homeGestureGuide','homeEventSlot','storyFlash'];let last=-1;for(const id of ids){const i=html.indexOf(`id="${id}"`);assert.ok(i>last,id);last=i;}
});
test('hidden Home retains active and pending notices until visible',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',regionId:'forest'});h.api.render();h.advance(20000);
 h.api.showStoryEvent({emoji:'⭐',message:'先のお知らせ'});h.api.showStoryEvent({emoji:'🏆',message:'待つお知らせ'});
 h.document.visibilityState='hidden';h.dispatch(h.document,'visibilitychange');h.advance(9000);
 h.document.visibilityState='visible';h.dispatch(h.document,'visibilitychange');
 assert.equal(h.get('storyFlash').classList.contains('hidden'),false);assert.match(h.get('storyFlashText').innerHTML+h.get('storyFlashText').textContent,/先のお知らせ/);
 h.advance(4300);assert.match(h.get('storyFlashText').innerHTML+h.get('storyFlashText').textContent,/待つお知らせ/);
});
