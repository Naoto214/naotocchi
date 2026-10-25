const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const care=require('../care-status.js'),home=require('../home-diorama.js');
const {harness}=require('./helpers/runtime-harness.cjs');
test('home suppresses every routine delta family but retains meaningful outcomes and rewards',()=>{
 assert.equal(typeof home.homeText,'function');
 for(const t of ['そだち +1：せいちょうした','げんき+2','おとろえ−2','おとろえ＋6','せいちょう↑49％','おなか +25 / せいちょう +5'])assert.equal(home.homeText(t),'',t);
 for(const name of ['おなか','ごきげん','げんき','けんこう','いのち','せいちょう','おとろえ','へんしん','そだち'])assert.equal(home.homeText(name+'＋2'),'');
 for(const t of ['びょうきじゃないのにくすりを使った','コイン +50','実績10こ達成！','セーブできませんでした'])assert.equal(home.homeText(t),t);
 assert.equal(home.homeText('ひなたぼっこでぽかぽか。げんき+5'),'ひなたぼっこでぽかぽか。');
});
test('persistent warning combines life and illness without ordinary hunger/sleep messages',()=>{
 assert.equal(typeof home.homeWarnings,'function');
 const s={stage:'growing',health:100,hunger:0,energy:0,isSick:true,sicknessType:'かぜ',deathMeter:90};
 const before=JSON.stringify(s),n=care.assess(s),r=home.homeWarnings(s,n);
 assert.match(r,/いのち/);assert.match(r,/びょうき/);assert.equal(JSON.stringify(s),before);
 assert.equal(home.homeWarnings({...s,isSick:false,deathMeter:0},care.assess({...s,isSick:false,deathMeter:0})), '');
});
test('effect anchors reflect around artwork bounds while directional travel is independent of native facing',()=>{
 assert.equal(typeof home.effectPosition,'function');assert.equal(typeof home.effectTrajectory,'function');
 for(const origin of [35,50,64])for(const anchor of [22,71,90])for(const scale of [.4,.85,1]){
 const l=home.effectPosition(anchor,origin,-1)*scale,r=home.effectPosition(anchor,origin,1)*scale;
 assert.ok(Math.abs(l+r-2*origin*scale)<1e-9);
 }
 for(const d of [0,11,22.5])assert.equal(home.effectTrajectory(d,-1),-home.effectTrajectory(d,1));
});
test('terrain runtime suppresses daily numeric feedback without mutating state; illness returns after event',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',regionId:'forest',hunger:90,health:100,energy:90,isSick:false});h.api.render();h.advance(20000);
 h.api.setMessage('おとろえ＋6');assert.equal(h.get('message').textContent,'');
 const s=h.api.state();s.isSick=true;s.sicknessType='かぜ';h.api.render();assert.match(h.get('message').textContent,/びょうき/);
 const before=JSON.stringify(s);h.api.showStoryEvent({emoji:'🏆',message:'コイン +50'});assert.equal(JSON.stringify(s),before);h.advance(15000);h.api.render();assert.match(h.get('message').textContent,/びょうき/);
 assert.doesNotMatch(h.get('badges').innerHTML,/data-care-icon="sick"/);
});
test('legacy markup retains four daily meters and five lifetime meters before terrain activation',()=>{
 const html=fs.readFileSync('index.html','utf8'),part=html.slice(html.indexOf('id="careMeters"'),html.indexOf('<div class="minigame-overlay'));
 const ids=[...part.matchAll(/id="(hunger|happiness|energy|health|death|evo|devo|transform|goal)Bar"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['hunger','happiness','energy','health','evo','devo','death','transform','goal']);
});
test('terrain owns the five-plus-four meter move and restores legacy order on exit and destruction',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});
 const daily=h.get('careMeters'),life=h.get('lifeMeterRow'),death=h.get('deathMeterItem');
 const named=id=>({id,parentNode:null});
 daily.children=['hunger','happiness','energy','health'].map(named);
 life.children=[named('evo'),named('devo'),death,named('transform'),named('goal')];
 for(const parent of [daily,life]){
  for(const n of parent.children)n.parentNode=parent;
  parent.insertBefore=function(n,next){
   if(n.parentNode){const old=n.parentNode.children;old.splice(old.indexOf(n),1);}
   this.children.splice(next?this.children.indexOf(next):this.children.length,0,n);n.parentNode=this;return n;
  };
  parent.appendChild=function(n){return this.insertBefore(n,null);};
 }
 Object.defineProperty(death,'nextSibling',{get(){return death.parentNode?.children[death.parentNode.children.indexOf(death)+1]||null;}});
 const s=h.api.state();Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'forest',isSleeping:false,isSick:false,dying:false});
 for(const region of ['forest','home','city','mountain','river_lake']){
  s.regionId=region;h.api.render();h.api.render();
  const terrain=['forest','city','river_lake'].includes(region);
  assert.deepEqual(daily.children.map(n=>n.id),['hunger','happiness','energy','health',...(terrain?['deathMeterItem']:[])]);
  assert.deepEqual(life.children.map(n=>n.id),['evo','devo',...(!terrain?['deathMeterItem']:[]),'transform','goal']);
 }
 h.api.homeDiorama().destroy();
 assert.deepEqual(daily.children.map(n=>n.id),['hunger','happiness','energy','health']);
 assert.deepEqual(life.children.map(n=>n.id),['evo','devo','deathMeterItem','transform','goal']);
});
test('long partner names open existing profile details by tapping the header',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});h.api.setPresentCastFixture();h.api.render();
 h.dispatch(h.get('partnerLabel'),'click');
 assert.equal(h.get('profileOverlay').classList.contains('hidden'),false);
});
test('actual effect adapter keeps every Z upright and reflects all approved stage anchors',()=>{
 const pet=require('../pet-expression.js'),bounds=require('../cast-bounds.js');let total=0;
 for(const [asset,b]of Object.entries(bounds).filter(([p])=>/^assets\/characters\/[^/]+\/\d\d\.png$/.test(p))){
  for(const kind of ['sleeping','sick','sulky','happy']){
   const html=pet.accentFor(asset,kind);if(!html)continue;total++;
   const t=html.match(/<g transform="([^"]+)"/)[1];
   const paths=Array.from({length:6},()=>({setAttribute(k,v){this[k]=v;}}));
   const accent={classList:{contains:c=>c==='pet-expression-accent--'+kind},style:{setProperty(k,v){this[k]=v;}},querySelector:()=>({getAttribute:()=>t,querySelectorAll:()=>paths})};
   const owner={dataset:{},style:{setProperty(){}},querySelector:()=>accent,querySelectorAll:()=>[accent]};
   const origin=(b.box[0]+b.box[2])/256*100;
   home.placeActorEffects(owner,origin,1,1);assert.equal(parseFloat(accent.style.translate),0);
   home.placeActorEffects(owner,origin,-1,-1);
   assert.ok(Number.isFinite(parseFloat(accent.style.translate)));
   if(kind==='sleeping'){
    assert.equal(paths[0].transform,'translate(0 0)');assert.equal(paths[2].transform,'translate(-22 0)');assert.equal(paths[4].transform,'translate(-45 0)');
    assert.equal(accent.style['--sleep-drift'],'-3px');
   }
  }
 }
 assert.ok(total>=248*4);
});
test('infinite mode preserves the formerly hidden life gauge after its move',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});h.api.setPresentCastFixture();
 for(const infinite of [true,false]){
  h.api.state().infinite=infinite;h.api.render();
  assert.equal(h.get('deathMeterItem').classList.contains('hidden'),infinite);
 }
});
test('choice narration and a subsequent authored medicine response both remain readable',()=>{
 const h=harness({deterministic:true,resume:true});h.api.hatchEgg();
 const s=h.api.state();Object.assign(s,{ageTicks:80,companions:[{id:'shiba',bond:80}],isSleeping:false,isSick:false});
 h.api.clearConversationTimers();h.api.closeAllMenuOverlays();h.get('storyFlash').classList.add('hidden');
 h.get('screenNormal').classList.remove('hidden');h.get('device').classList.add('ui-home-active');
 s.individuality.natural.kindness[0].push('shiba-walk');s.individuality.natural.kindness[2].push('shiba-pace');
 assert.ok(h.api.maybeIndividualExchange());h.get('individualityChoices').children[0].onclick({stopPropagation(){}});
 h.dispatch(h.get('medicineBtn'),'click');h.advance(1);
 assert.equal(h.get('homeChoiceResult').classList.contains('hidden'),false);
 assert.equal(h.get('speechBubble').classList.contains('hidden'),false);
 assert.match(h.get('speechText').textContent,/薬|くすり/);
 const css=fs.readFileSync('home-diorama.css','utf8');
 assert.doesNotMatch(css,/:has\(#homeChoiceResult:not\(\.hidden\)\) #speechBubble\{display:none/);
});
