const {test}=require('node:test');
const assert=require('node:assert/strict');
const motion=require('../cast-motion.js');
const {harness}=require('./helpers/runtime-harness.cjs');
const fs=require('node:fs');
function rig({reduced=false,resting=false}={}){
 const node=()=>({isConnected:true,dataset:{},style:{width:'52px'},classList:{add(){},remove(){}},animations:[],animate(frames,options){const a={frames,options,cancel(){this.cancelled=true;}};this.animations.push(a);return a;}});
 const actors=[{kind:'pet',id:'cat',node:node()},{kind:'accessory',node:node()},{kind:'partner',id:'forest_bear',node:node()},...Array.from({length:26},(_,i)=>({kind:'companion',id:'c'+i,node:node()}))];
 const group=node();const c=motion.createController({getActors:()=>actors,getGroup:()=>group,getMotionRadius:()=>1,isResting:()=>resting,env:{matchMedia:()=>({matches:reduced,addEventListener(){}})}});
 return {c,actors,group};
}
for(const recipe of ['evolve','transform','welcome','union','marriage'])test(`L3 ${recipe}: single major peak, safe ceiling and exact rest`,()=>{
 for(const size of [24,52,104,128]){
  const {poses,duration}=motion.motionFrames('bounce',size,{recipe,maxDisplacement:16});
  const peak=Math.min(...poses.map(p=>p.y));assert.ok(peak<-9);
  assert.equal(poses.filter(p=>p.y<peak*.8).length,1,'one primary peak');
  assert.ok(duration>=1200);assert.deepEqual(poses.at(-1),{x:0,y:0,angle:0,scale:1});
  for(const p of poses)assert.ok(Math.hypot(p.x,p.y)+size/Math.SQRT2*(Math.abs(p.angle)+Math.abs(1-p.scale))<=16);
 }
});
test('special scope targets exact actors at 26, synchronizes equipment and never lifts group',()=>{
 for(const [event,ids] of [['evolve',[0,1]],['transform',[0,1]],['companion_new',[28]],['partner_new',[0,1,2]],['marriage',[0,1,2]]]){
  const {c,actors,group}=rig();c.special(event,{kind:'companion',id:'c25'});
  assert.deepEqual(actors.flatMap((a,i)=>a.node.animations.length?[i]:[]),ids,event);assert.equal(group.animations.length,0);
  if(ids.includes(1))assert.deepEqual(actors[0].node.animations[0].frames,actors[1].node.animations[0].frames);
  assert.equal(c.idle(),0);
 }
});
test('L3 secondary speech cannot replay or replace active special, positive cannot interrupt it',()=>{
 const {c,actors}=rig();c.speak({event:'marriage',text:'照れる',speaker:actors[0],primaryBeat:true});
 const a=actors[0].node.animations.at(-1);assert.equal(actors[0].node.dataset.reaction,'marriage');
 c.relationship(actors[2]);assert.equal(actors[2].node.dataset.reaction,'marriage');
 c.speak({event:'marriage',text:'うれしい',speaker:actors[0],primaryBeat:false});assert.equal(actors[0].node.animations.at(-1),a);
 c.clear(false);c.speak({event:'feed',speaker:actors[0],primaryBeat:true});const next=actors[0].node.animations.at(-1);
 a.onfinish();assert.equal(actors[0].node.animations.at(-1),next);assert.equal(next.cancelled,undefined);
});
test('reduced motion retains speaker attribution without L3 displacement',()=>{
 const {c,actors}=rig({reduced:true});c.speak({event:'evolve',speaker:actors[0],primaryBeat:true});
 assert.ok(actors.every(a=>a.node.animations.length===0));
});
test('real Home evolve and relationship events use L3 once, age stays ordinary',()=>{
 const h=harness(),s=h.api.state();s.partner={id:'forest_bear',label:'くま',affection:80,married:true};s.lifetime.equippedItemId='ribbon';h.api.render();
 for(const event of ['evolve','transform','partner_new','marriage']){
  h.api.speakEvent(event,{petText:'うれしい',partnerChance:0,companionChance:0});h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,event,event);
 }
 h.api.speakEvent('age',{petText:'誕生日',partnerChance:0,companionChance:0});h.advance(1);assert.notEqual(h.get('petSprite').dataset.reaction,'evolve');
});
module.exports={rig};
for(const family of ['breathe','sway','look','posture'])test(`idle ${family} is quiet and rests`,()=>{
 const m=motion.motionFrames(family,52,{maxDisplacement:1});
 assert.ok(m.duration>=1400,'slow sparse gesture');
 assert.deepEqual(m.poses.at(-1),{x:0,y:0,angle:0,scale:1});
 assert.ok(m.poses.some(p=>p.x||p.y||p.angle||p.scale!==1));
 for(const p of m.poses)assert.ok(Math.hypot(p.x,p.y)+52/Math.SQRT2*(Math.abs(p.angle)+Math.abs(1-p.scale))<=1);
});
test('idle takes one actor per turn, varies families and yields to rest and any active motion',()=>{
 const {c,actors}=rig();const selected=new Set(),families=new Set();
 for(let i=0;i<28;i++){
  c.idle();const moving=actors.filter(a=>a.node.animations.some(m=>!m.cancelled));
  const body=moving.filter(a=>a.kind!=='accessory');assert.equal(body.length,1);selected.add(body[0]);families.add(body[0].node.dataset.reaction);
  assert.equal(c.idle(),0);c.clear();
 }
 assert.equal(selected.size,28);assert.ok(families.size>=3);
 assert.equal(rig({resting:true}).c.idle(),0);
});
const world=new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
test('canonical metadata assigns every character and stage to a reusable personality',()=>{
 const defs=[...world.playerSpecies.normal,...world.playerSpecies.rare,...world.playerSpecies.secret,world.playerSpecies.author,...world.companions.normal,...world.companions.rare,...world.partners];
 assert.ok(world.motionPersonality);
 for(const d of defs)for(let stage=0;stage<(d.stages?.length||1);stage++)assert.ok(motion.PERSONALITIES[motion.personalityFor(d.id,stage,world.motionPersonality)],d.id);
 for(const [id,want] of [['cat','soft'],['rabbit_friend','bouncy'],['sekizou','heavy'],['jellyfish','float'],['squirrel','quick'],['snail','slow'],['clock','rigid'],['robot_neighbor','rigid'],['box','rigid']])assert.equal(motion.personalityFor(id,6,world.motionPersonality),want);
 assert.equal(motion.personalityFor('jellyfish',0,world.motionPersonality),'slow');
});
test('personality modifies bodies, not recipe meaning or safe envelope; recover is frozen',()=>{
 const variants=new Set();
 for(const personality of ['soft','bouncy','heavy','float','quick','slow','rigid'])for(const [mood,recipe,budget] of [['breathe',null,1],['bounce','play',10],['evolve','evolve',16]]){
  const m=motion.motionFrames(mood,52,{recipe,personality,maxDisplacement:budget});
  variants.add(JSON.stringify(m));assert.deepEqual(m.poses.at(-1),{x:0,y:0,angle:0,scale:1});
  for(const p of m.poses)assert.ok(Math.hypot(p.x,p.y)+52/Math.SQRT2*(Math.abs(p.angle)+Math.abs(1-p.scale))<=budget);
  if(personality==='rigid')assert.ok(m.poses.every(p=>p.scale===1));
  if(recipe==='evolve'){const peak=Math.min(...m.poses.map(p=>p.y));assert.ok(peak<-6);assert.equal(m.poses.filter(p=>p.y<peak*.8).length,1);}
  const options={id:'sekizou',maxDisplacement:16};assert.deepEqual(motion.motionFrames('recover',104,{...options,personality}),motion.motionFrames('recover',104,options));
 }
 assert.ok(variants.size>=18,'classes must produce distinct bodies across layers');
});
test('married ring follows owner translation without redefining its layout authority',()=>{
 const h=harness(),s=h.api.state();s.partner={id:'forest_bear',label:'くま',affection:80,married:true};h.api.render();
 h.api.speakEvent('marriage',{petText:'うれしい',partnerChance:0,companionChance:0});h.advance(1);
 const owner=h.get('partnerCompanion').querySelector('.partner-emoji'),ring=h.get('partnerCompanion').querySelector('.partner-ring');
 assert.ok(ring.animations.length);const position=[ring.style.left,ring.style.top,ring.style.width];
 const ownerY=owner.animations.at(-1).frames.map(f=>Number(f.transform.match(/translate\([^,]+, ([-.\d]+)px\)/)?.[1]));
 assert.deepEqual(ring.animations.at(-1).frames.map(f=>Number(f.transform.match(/translate\([^,]+, ([-.\d]+)px\)/)?.[1])),ownerY);
 assert.deepEqual([ring.style.left,ring.style.top,ring.style.width],position);
});
test('real recruitment result targets the actual newcomer after results, and care cancels it',()=>{
 for(const interrupt of [false,true]){
  const h=harness(),s=h.api.state();Object.assign(s,{stage:'growing',isSleeping:false,isSick:false,energy:100,health:100,hunger:80,transformMeter:0});
  let done;const game={id:'motion-recruit',start(_el,finish){done=finish;}};s.lifetime.minigamePlayCounts[game.id]=10;h.api.render();
  assert.equal(h.api.tryStartPlay(game),true);h.api.setPendingCompanion('snail');done(90);
  assert.ok(s.companions.some(c=>c.id==='snail'));
  if(interrupt){h.api.speakEvent('feed',{petText:'ごはん',partnerChance:0,companionChance:0});h.advance(1);}
  h.advance(6001);
  const node=[...h.get('companionLeft').children,...h.get('companionRight').children].find(n=>n.dataset.companionId==='snail');
  assert.equal(node.dataset.reaction,interrupt?undefined:'companion_new');
 }
});
test('critical and sleeping states suppress special celebration without changing outcome',()=>{
 for(const values of [{deathMeter:90},{isSleeping:true}]){
  const h=harness();Object.assign(h.api.state(),values);h.api.render();
  const count=h.get('petSprite').animations.length;h.api.speakEvent('evolve',{petText:'かわった',partnerChance:0,companionChance:0});h.advance(1);
  assert.equal(h.get('petSprite').animations.length,count);
 }
});
test('L3 keeps the actual speech owner while interrupting the prior reaction',()=>{
 const h=harness();h.api.render();h.api.speakEvent('transform',{petText:'かわった',partnerChance:0,companionChance:0});h.advance(1);
 assert.ok(h.get('petSprite').classList.contains('cast-speaking'));
});
test('approved recover output remains byte-equivalent for 56 baseline combinations',()=>{
 const sample=[24,52,104,128].flatMap(size=>['','snail','clock','koala','sekizou','robot_neighbor','cat'].flatMap(id=>[false,true].map(gentle=>motion.motionFrames('recover',size,{id,gentle,maxDisplacement:16}))));
 assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(sample)).digest('hex'),'49377d52e34cfc656ac0d48f0c85c957bf9421a23bbcd5978ebde386798eeb30');
});
test('actual life stage boundary selects evolve while ordinary birthday remains age',()=>{
 const h=harness(),s=h.api.state();Object.assign(s,{speciesLine:'cat',stage:'growing',hunger:90,health:90,energy:90,happiness:90,transformMeter:0});
 let age=1;while(h.api.stageForAge(age,'cat')===h.api.stageForAge(0,'cat'))age++;
 s.ageTicks=age*20;h.api.onAgeChanged(age-1);h.api.render();h.advance(1);
 assert.equal(h.get('petSprite').dataset.reaction,'evolve');
});
test('approved L2 base recipes remain byte-equivalent before personality modifiers',()=>{
 const sample=['meal','play','ticklish','wake'].flatMap(recipe=>[24,52,104,128].map(size=>motion.motionFrames('bounce',size,{recipe,maxDisplacement:10})));
 assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(sample)).digest('hex'),'14526ba14eadc60dfdc0ec420360b10ce45489af6d7ebc6b5552e807122b6230');
});
test('evolution retains the existing age dialogue while changing only physical event semantics',()=>{
 const lines=event=>{
  const h=harness({seed:1});const s=h.api.state();s.partner={id:'forest_bear',label:'くま',affection:80};s.companions=[{id:'snail',bond:80}];h.api.render();
  require('node:vm').runInContext('Math.random=()=>.1',h.sandbox);h.api.speakEvent(event,{age:5,stageLabel:'子ねこ',petText:'かわった',partnerChance:1,companionChance:1});
  return [1,2500,2500,2500].map(ms=>{h.advance(ms);return h.get('speechText').textContent;});
 };
 assert.deepEqual(lines('evolve'),lines('age'));
});
test('ring motion and soft interruption preserve the CSS-owned base transform',()=>{
 const h=harness(),s=h.api.state();s.partner={id:'forest_bear',label:'くま',affection:80,married:true};h.api.render();
 const ring=h.get('partnerCompanion').querySelector('.partner-ring');ring.style.transform='scale(1.2)'; // CSS computed-style contract in the lightweight DOM.
 h.api.speakEvent('marriage',{petText:'うれしい',partnerChance:0,companionChance:0});h.advance(1);
 assert.ok(ring.animations.at(-1).frames.every(f=>f.transform.endsWith('scale(1.2)')));
 ring.style.transform='matrix(1.2, 0, 0, 1.2, 0, -5)';h.api.clearConversationTimers();
 assert.ok(ring.animations.at(-1).frames.at(-1).transform.endsWith('scale(1.2)'));
});
test('temporary pupa appearance uses rigid personality without changing pet identity or save',()=>{
 const h=harness(),s=h.api.state();s.speciesLine='cat';s.itemLife.temporaryForm={line:'butterfly',index:4,originLine:'cat',originIndex:h.api.currentFormStageIndex(),expiresAt:h.api.now()+300000};h.api.render();
 assert.equal(h.api.currentVisualForm().line,'butterfly');assert.equal(h.api.currentVisualForm().index,4);
 const before=JSON.stringify(s.itemLife.temporaryForm);h.api.speakEvent('feed',{petText:'ごはん',partnerChance:0,companionChance:0});h.advance(1);
 assert.ok(h.get('petSprite').animations.at(-1).frames.every(f=>/scale\(1\)/.test(f.transform)));
 assert.equal(s.speciesLine,'cat');assert.equal(JSON.stringify(s.itemLife.temporaryForm),before);
});
