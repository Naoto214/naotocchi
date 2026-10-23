const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(){const h=harness({deterministic:true,worldScene:true,homeDiorama:true}),s=h.api.state();Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'forest',isSleeping:false,isSick:false,dying:false});for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');h.get('screenNormal').classList.remove('hidden');h.api.render();return {h,s,c:h.api.homeDiorama()};}
test('live Home movement and idle change no saved state or relationship',()=>{const {s,c}=setup();const before=JSON.stringify(s),a=c.model.snapshot()[0];c.model.select(a.key);c.model.move(a.key,{x:70,y:240});for(let i=0;i<1200;i++)c.model.step(.1,{});assert.equal(JSON.stringify(s),before);});
test('household displays an acquired resident before its special visit',()=>{const {h,s,c}=setup();s.companions=[{id:'shiba',bond:100}];s.lifetime.companionsRecruited=['shiba'];h.api.render();assert.equal(h.api.homeVisitors().companions.length,0);assert.equal(c.model.snapshot().length,2);h.api.meguruMod.socialSession.advance(300);h.api.render();assert.equal(h.api.dioramaActors().filter(a=>a.kind==='companion').length,h.api.homeVisitors().companions.length);});
test('care button still runs official feeding and stops movement',()=>{const {h,s,c}=setup();s.hunger=30;const a=c.model.snapshot()[0];c.model.move(a.key,{x:70,y:240});h.dispatch(h.get('feedBtn'),'click');assert.equal(s.hunger,55);assert.equal(c.model.snapshot()[0].target,null);});
test('Pilot exits on egg/dead and non-Pilot regions without touching save schema',()=>{const {h,s}=setup();for(const regionId of ['home','sea','mountain']){s.regionId=regionId;h.api.render();assert.equal(h.get('castStage').dataset.diorama,undefined);}s.regionId='city';s.stage='egg';h.api.render();assert.equal(h.get('castStage').dataset.diorama,undefined);});
test('routine live render preserves a user walking destination',()=>{const {h,c}=setup();const a=c.model.snapshot()[0];c.model.move(a.key,{x:90,y:240});for(let i=0;i<10;i++){c.model.step(.05,{autonomy:false});h.api.render();}const b=c.model.snapshot()[0];assert.ok(b.target);assert.ok(b.x<a.x-15);});
test('another resident expression change preserves a stationary moved speaker anchor',()=>{
 const {h,s,c}=setup();s.companions=[{id:'shiba',bond:20}];h.api.render();
 const a=c.model.snapshot()[0];assert.ok(c.model.move(a.key,{x:70,y:240}));
 for(let i=0;i<300;i++)c.model.step(.1,{autonomy:false});c.sync();
 const moved=c.model.snapshot()[0],frame=h.api.dioramaActors().find(a=>a.key===moved.key);
 assert.ok(Math.abs(moved.x-frame.x)>1,'speaker has a nonzero presentation offset');
 const before=h.get('speechBubble').style['--speech-tail-x'];
 s.companions[0].bond=90;h.api.render();
 assert.equal(c.model.snapshot()[0].x,moved.x);
 assert.equal(h.get('speechBubble').style['--speech-tail-x'],before,'layout refresh must restore the cached actor offset');
});
test('crowded minimum height stays applied when the measured height equals its floor',()=>{
 const {h,s}=setup();s.companions=h.api.normalCompanions.slice(0,10).map(c=>({id:c.id,bond:80}));
 h.get('device').classList.add('ui-home-active');
 for(let i=0;i<12;i++){h.api.render();assert.equal(h.get('castStage').style.minHeight,'300px','do not alternate removing and adding the floor inside ResizeObserver');}
});
