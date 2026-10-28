const {test}=require('node:test'),assert=require('node:assert/strict');
const home=require('../home-diorama.js');
const {harness}=require('./helpers/runtime-harness.cjs');
function sleepOwner(){const paths=Array.from({length:6},()=>({setAttribute(k,v){this[k]=v;}}));const accent={classList:{contains:c=>c==='pet-expression-accent--sleeping'},style:{setProperty(k,v){this[k]=v;}},querySelector:()=>({getAttribute:()=> 'translate(-34 -19.5)',querySelectorAll:()=>paths})};return {paths,accent,owner:{dataset:{},style:{setProperty(){}},querySelector:()=>accent,querySelectorAll:()=>[accent]}};}
test('sleep preserves native right-up design for left-facing dog; reflection reverses only trajectory',()=>{
 const s=sleepOwner();
 for(const direction of [-1,1]){const facing=home.facingScale({asset:'assets/characters/dog/06.png'},direction);home.placeActorEffects(s.owner,48,facing,direction);
 assert.equal(s.paths[0].transform,'translate(0 0)');assert.equal(s.paths[2].transform,facing===1?'translate(0 0)':'translate(-22 0)');assert.equal(s.paths[4].transform,facing===1?'translate(0 0)':'translate(-45 0)');
 assert.equal(s.accent.style['--sleep-drift'],facing===1?'3px':'-3px');assert.equal(parseFloat(s.accent.style.translate),home.effectPosition(37/104*100,48,facing)-37/104*100);
 }
});
const measure=(text,size)=>[...text].reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*size,0);
test('text fitting prefers large short lines and preserves readable floors for Japanese/English',()=>{
 assert.equal(home.textLayout('もうむり。ねる',220,'speech',measure).size,18);
 assert.equal(home.textLayout('おやすみモード',260,'notice',measure).size,17);
 for(const kind of ['notice','speech'])for(const text of ['びょうきではないのに、くすりを飲ませた','A longer English message with many words.','長い文章です。'.repeat(30),'unbreakable'.repeat(30),'一行目\n二行目\n三行目'])for(const w of [180,240,320]){
  const r=home.textLayout(text,w,kind,measure);assert.ok(r.size>=(kind==='speech'?14:13));assert.ok(r.width<=w);assert.ok(r.width>0);
 }
 assert.ok(home.textLayout('あくびに返事とられた',170,'speech',measure).size<home.textLayout('あくびに返事とられた',300,'speech',measure).size);
});
test('terrain reparents the same individuality dialog into shared lane and restores it on exit',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});const dialog=h.get('individualityDialog'),slot=h.get('speechSlot'),parent={appendChild(n){n.parentNode=this;},insertBefore(n){n.parentNode=this;}};dialog.parentNode=parent;slot.appendChild=function(n){n.parentNode=this;};
 Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',regionId:'forest',isSleeping:false,isSick:false});h.api.render();assert.equal(dialog.parentNode,slot);
 h.api.state().stage='egg';h.api.render();assert.equal(dialog.parentNode,parent);
});
test('terrain adopts dialog parsed after synchronous initial render without leaving region',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true}),dialog=h.get('individualityDialog'),slot=h.get('speechSlot');
 dialog.parentNode=null;Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',regionId:'forest'});h.api.render();
 const parent={appendChild(n){n.parentNode=this;},insertBefore(n){n.parentNode=this;}};dialog.parentNode=parent;slot.appendChild=n=>{n.parentNode=slot;};
 h.api.render();assert.equal(dialog.parentNode,slot);h.api.homeDiorama().destroy();assert.equal(dialog.parentNode,parent);
});
