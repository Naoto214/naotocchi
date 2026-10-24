const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const care=require('../care-status.js'),pet=require('../pet-expression.js'),home=require('../home-diorama.js');
const {harness}=require('./helpers/runtime-harness.cjs');
test('sleep emission reflects the approved per-stage small-Z center without changing expression artwork',()=>{
 assert.equal(typeof home.sleepAccentShift,'function');
 let count=0;
 for(const [asset,bounds] of Object.entries(require('../cast-bounds.js')).filter(([p])=>/^assets\/characters\/[^/]+\/\d\d\.png$/.test(p))){
  const html=pet.accentFor(asset,'sleeping');if(!html)continue;count++;
  const transform=html.match(/<g transform="([^"]+)"/)[1],dx=Number(transform.match(/translate\(([-\d.]+)/)[1]);
  const anchor=(71+dx)/104*100,origin=(bounds.box[0]+bounds.box[2])/256*100;
  assert.equal(home.sleepAccentShift(transform,origin,1),0);
  for(const scale of [.85,.5,1]){
   const reflected=(2*origin-anchor)*scale;
   assert.ok(Math.abs((anchor+home.sleepAccentShift(transform,origin,-1))*scale-reflected)<1e-9);
  }
 }
 assert.ok(count>=248);assert.equal(home.sleepAccentShift(null,50,-1),0);
});
test('routine care summary preserves numeric canonical feedback and important costs',()=>{
 assert.equal(typeof care.summary,'function');
 const before={energy:40,growth:0},after={energy:42,growth:5},frozen=JSON.stringify([before,after]);
 const feedback=care.changes(before,after);assert.match(feedback.text,/げんき \+2/);
 assert.equal(care.summary('げんき +2'),'少しげんきになった');
 assert.equal(care.summary('せいちょう ↑ 49%'),'すくすく育っている');
 assert.equal(care.summary('せいちょう ↑ 83％'),'すくすく育っている');
 assert.equal(care.summary('おなか +25 / せいちょう +5'),'おなかが満たされた / すくすく育っている');
 assert.equal(care.summary('げんき −2'),'少しつかれた');
 for(const important of ['そだち +1：せいちょうした','けんこう −5','コイン +50','実績10こ達成！','せいちょう2ばい（あと5分）'])assert.equal(care.summary(important),important);
 assert.equal(JSON.stringify([before,after]),frozen);
});
test('small measured bubble dimensions survive edge clamping for each phone width',()=>{
 for(const width of [288,343,358,398])for(const bubbleWidth of [70,180,280])for(const bubbleHeight of [32,52,72])for(const x of [0,width/2,width]){
 const r=home.speechPlacement({speaker:{x,y:180,h:40},width,height:300,bubbleWidth,bubbleHeight});
 assert.equal(r.w,Math.min(bubbleWidth,width-12));assert.ok(r.x>=6&&r.x+r.w<=width-6);assert.ok(r.y>=6&&r.y+bubbleHeight<=294);
 }
});
test('terrain dialogue measures intrinsic size and removes the 55px minimum',()=>{
 const source=fs.readFileSync('script.js','utf8'),start=source.indexOf('  function pointHomeSpeech()'),end=source.indexOf('  function renderHomeCast()',start),body=source.slice(start,end);
 assert.match(body,/bubbleWidth:.*\.width/);assert.doesNotMatch(body,/bubbleWidth:Math\.min\(340/);assert.doesNotMatch(body,/,55\)/);
 const css=fs.readFileSync('home-diorama.css','utf8');assert.match(css,/#speechBubble\{[^}]*width:max-content/);assert.match(css,/font-size:14px/);
});
test('important story reward text remains intact and numeric state stays unchanged',()=>{
 const h=harness({deterministic:true,worldScene:true,homeDiorama:true});Object.assign(h.api.state(),{stage:'growing',speciesLine:'dog',regionId:'forest'});h.api.render();h.advance(20000);
 const old=JSON.stringify(h.api.state());h.api.showStoryEvent({emoji:'🏆',message:'実績10こ達成！ コイン +50'});
 assert.match(h.get('storyFlashText').innerHTML+h.get('storyFlashText').textContent,/コイン\s?\+50/);assert.equal(JSON.stringify(h.api.state()),old);
});
test('ambient story hides only trailing routine deltas while preserving authored narration and rewards',()=>{
 assert.equal(care.summary('ひなたぼっこでぽかぽか。げんき+5',true),'ひなたぼっこでぽかぽか。');
 assert.equal(care.summary('雲をながめてのんびり。げんき+3',true),'雲をながめてのんびり。');
 assert.equal(care.summary('宝箱からコイン+50',true),'宝箱からコイン+50');
 assert.equal(care.summary('けんこう +2'),'少し調子がよくなった');
});
test('result narration has independent width before measurement and mixed tone keeps original signs',()=>{
 const css=fs.readFileSync('home-diorama.css','utf8'),src=fs.readFileSync('script.js','utf8');
 assert.match(css,/#homeChoiceResult\{[^}]*width:var\(--terrain-speech-max[^}]*flex:none/);
 assert.match(css,/#speechSlot\{[^}]*flex-direction:column/);
 assert.match(src,/careFeedback\.text\.includes\('−'\)/);
 assert.equal(care.summary('げんき +2 / ごきげん −3'),'少しげんきになった / 少ししょんぼり');
 assert.equal(care.summary('はしゃぎすぎちゃった。げんき-2',true),'はしゃぎすぎちゃった。');
});
