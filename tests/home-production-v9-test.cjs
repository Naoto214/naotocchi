const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');
test('home name and speaker match the current baby appearance without changing species',()=>{
 const h=harness({homeDiorama:true,productionHome:true,worldScene:true});h.document.body.dataset.homeProduction='true';
 Object.assign(h.api.state(),{stage:'growing',speciesLine:'woman',stageIndex:0,ageTicks:0,hunger:100,health:100,energy:100,happiness:100});h.api.render();
 assert.equal(h.get('mainNameLabel').textContent,'あかちゃん');
 h.api.showStoryEvent({message:'こんにちは',petReaction:true,characterComment:true});
 assert.match(h.get('storyFlashEmoji').innerHTML,/あかちゃん/);assert.equal(h.api.state().speciesLine,'woman');
});
test('V9 fits all reserved lanes inside visual viewport in both orientations',()=>{
 const s=fs.readFileSync('home-production-touch.js','utf8'),window={};vm.runInNewContext(s.slice(s.indexOf('/* V8 viewport:')),{window});
 for(const [width,height]of [[320,480],[375,550],[390,664],[430,740],[568,230],[844,280]]){
  const p=window.NaotocchiHomeViewport.layoutV9({width,height,left:16,headerBottom:46,controlsHeight:103,offsetTop:0});
  assert.equal(p.noticeHeight,42);assert.equal(p.commentHeight,76);assert.ok(p.frameHeight>=40);
  assert.ok(p.controlsTop+p.controlsHeight<=height);assert.ok(p.commentTop+76<=p.controlsTop);
  if(!p.landscape){assert.ok(p.frameTop+p.frameHeight<=p.metersTop);assert.ok(p.metersTop+p.metersHeight<=p.commentTop);}
  else assert.ok(p.frameWidth>width*.4);
 }
});
