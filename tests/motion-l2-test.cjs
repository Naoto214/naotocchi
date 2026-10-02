const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(options={}) {
 const h=harness(options),s=h.api.state();
 const world=new Function(require('node:fs').readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
 s.companions=[...world.companions.normal,...world.companions.rare].map(c=>({id:c.id,bond:80}));
 s.partner={id:'forest_bear',label:'くま',affection:80,married:true};
 s.lifetime.equippedItemId='ribbon';h.api.render();return h;
}
const ys=a=>a.frames.map(f=>Number(f.transform.match(/translate\([^,]+, ([-.\d]+)px\)/)?.[1]));
function speak(h,event,text){h.api.speakEvent(event,{petText:text,partnerChance:0,companionChance:0});h.advance(1);}
test('feed is a focused readable munch then satisfaction in dense Home, equipment synchronized',()=>{
 const h=setup();speak(h,'feed','おいしい！');
 const a=h.get('petSprite').animations.at(-1),y=ys(a);
 assert.ok(Math.min(...y)<=-6,'focused feed needs a readable satisfaction lift');
 assert.ok(Math.min(...y)>-10,'L2 stays below recovery');
 assert.equal(y.at(-1),0);assert.equal(h.get('castResponse').animations.length,0,'feed is SELF');
 assert.deepEqual(h.get('petAccessory').animations.at(-1).frames,a.frames);
 assert.equal(h.get('petSprite').dataset.reaction,'munch');
});
test('feed secondary replies do not restart a meal or lift the group; overfeed stays negative',()=>{
 const h=setup();speak(h,'feed','おいしい');
 h.api.setSpeechBubble('おいしかった',{kind:'pet'},{event:'feed',primaryBeat:false});
 assert.equal(h.get('petSprite').dataset.reaction,'nod');
 assert.equal(h.get('castResponse').animations.length,0);
 speak(h,'overfeed','もういっぱい');assert.equal(h.get('petSprite').dataset.reaction,'settle');
 assert.equal(h.get('castResponse').animations.length,0);
});
module.exports={setup,speak,ys};
test('play joy and ticklish motion are focused L2; tired or annoyed replies never bounce',()=>{
 for(const [text,want] of [['うれしい','bounce'],['くすぐったい','wiggle'],['疲れたから休みたい','settle'],['もう少しだけ置き物にして','settle']]){
  const h=setup();speak(h,'play_with',text);
  assert.equal(h.get('petSprite').dataset.reaction,want);
  const a=h.get('petSprite').animations.at(-1);
  if(want!=='settle') assert.ok(Math.min(...ys(a))<=-5,'play reads larger than ambient');
  assert.equal(h.get('castResponse').animations.length,0);
 }
 const h=setup();speak(h,'play_with_annoyed','うれしいけど休みたい');
 assert.equal(h.get('petSprite').dataset.reaction,'settle');
 assert.equal(h.get('castResponse').animations.length,0,'annoyed is SELF too');
});
test('clean GROUP has one shared peak and secondary speech cannot restart it',()=>{
 const h=setup();const nodes=[h.get('petSprite'),h.get('petAccessory'),h.get('partnerCompanion'),...h.get('companionLeft').children,...h.get('companionRight').children];
 const placement=()=>nodes.map(n=>[n.style.left,n.style.top,n.style.width,n.style.height]);const before=placement();
 speak(h,'clean','きれい！');
 const a=h.get('castResponse').animations.at(-1),y=a.frames.map(f=>Number(f.transform.match(/translateY\(([-.\d]+)px\)/)[1]));
 assert.equal(y.filter(v=>v<=-8).length,1,'one group peak, not repeated hops');
 assert.ok(y.every(v=>v>=-12 && v<=0));assert.equal(y.at(-1),0);
 assert.equal(h.get('petSprite').animations.length,0,'uniform group recipe, no added local squash');
 const count=h.get('castResponse').animations.length;
 h.api.setSpeechBubble('やったね',{kind:'partner',id:'forest_bear'},{event:'clean',primaryBeat:false});
 assert.equal(h.get('castResponse').animations.length,count);
 assert.deepEqual(placement(),before);
});
test('wake stretches the pet with a held L2 rise and no group or second wake',()=>{
 const h=setup();speak(h,'wake','おはよう、まだねむい');
 const a=h.get('petSprite').animations.at(-1),y=ys(a);
 assert.ok(Math.min(...y)<=-6 && Math.min(...y)>-10);
 assert.ok(y.filter(v=>v===Math.min(...y)).length>=2,'held stretch');
 assert.equal(y.at(-1),0);assert.equal(h.get('castResponse').animations.length,0);
 h.api.setSpeechBubble('おはよ',{kind:'pet'},{event:'wake',primaryBeat:false});assert.equal(h.get('petSprite').dataset.reaction,'nod');
});
test('clean GROUP survives active partner positive and retains owner cues',()=>{
 const h=setup();h.api.reinforceRelationship();h.api.render();
 speak(h,'clean','きれい');const a=h.get('castResponse').animations.at(-1);assert.ok(a);
 h.api.render();assert.equal(a.playState,'running');
 const partner=h.get('partnerCompanion').querySelector('.partner-emoji');
 assert.equal(partner.dataset.relationshipState,'positive');
 assert.ok(partner.querySelector('.relationship-heart'));assert.ok(partner.querySelector('.relationship-aura'));
});
for(const event of ['feed','play_with','clean','wake'])test(`${event} reduced motion and menu cancellation keep canonical rest`,()=>{
 const quiet=setup({reducedMotion:true});speak(quiet,event,'うれしい');
 assert.equal(quiet.get('petSprite').animations.length,0);assert.equal(quiet.get('castResponse').animations.length,0);
 assert.ok(quiet.get('petSprite').classList.contains('cast-speaking'));
 const h=setup();speak(h,event,'うれしい');h.api.openExclusiveMenu('menu');
 for(const id of ['petSprite','petAccessory','castResponse'])assert.ok(h.get(id).animations.every(a=>a.playState==='idle'));
});
test('L2 frames keep full corner envelope within 10px, rest exactly, and do not grow with density',()=>{
 const {motionFrames}=require('../cast-motion.js');
 for(const recipe of ['meal','play','ticklish','wake'])for(const size of [24,52,104,128]){
  const {poses}=motionFrames('bounce',size,{recipe,maxDisplacement:10});
  assert.deepEqual(poses.at(-1),{x:0,y:0,angle:0,scale:1});
  for(let i=1;i<poses.length;i++)for(let t=0;t<=1;t+=.1){
   const p=Object.fromEntries(Object.keys(poses[i]).map(k=>[k,poses[i-1][k]*(1-t)+poses[i][k]*t]));
   assert.ok(Math.hypot(p.x,p.y)+size/Math.SQRT2*(Math.abs(p.angle)+Math.abs(1-p.scale))<10);
  }
 }
});
test('L2 real-Home QA fixtures include all actions and solo/pair/few/dense conditions',()=>{
 let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(v){html=v;}});}}});
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];const fixtures=require('node:vm').runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
 for(const event of ['feed','play','clean','wake'])for(const [scene,count] of [['solo',0],['pair',0],['few',3],['dense26',26]]){
  const s=fixtures[`l2_${event}_${scene}`];assert.ok(s,`${event}/${scene}`);assert.equal(s.companions.length,count);
  assert.equal(s.isSleeping,event==='wake');assert.equal(s.poopCount,3);assert.equal(s.lifetime.equippedItemId,'ribbon');
 }
 assert.ok(fixtures.l2_play_rescue26.companions.every(c=>c.bond===20));
 assert.equal(fixtures.l2_clean_lonely26.partner.affection,20);
});
test('real clean-to-feed interruption preserves the in-flight soft group return',()=>{
 const h=setup(),s=h.api.state();s.hunger=40;s.poopCount=3;h.api.render();
 h.dispatch(h.get('cleanBtn'),'click');h.advance(1);
 const group=h.get('castResponse');assert.equal(group.dataset.reaction,'clean');
 // The harness exposes computed transform through style; represent the real apex.
 group.style.transform='matrix(1, 0, 0, 1, 0, -10)';
 h.dispatch(h.get('feedBtn'),'click');
 const returning=group.animations.at(-1);assert.equal(returning.options.duration,140);assert.equal(returning.playState,'running');
 h.advance(1);assert.equal(returning.playState,'running','new SELF beat must not snap the group return');
 assert.equal(group.dataset.reaction,undefined,'return is not a new GROUP celebration');
 assert.equal(returning.frames.at(-1).transform,'translate(0px, 0px) rotate(0rad) scale(1)');
});
