const assert = require('node:assert/strict');
const vm = require('node:vm');
const plugin = require('./visual-qa.cjs')();

// Test our actual development route output: incomplete saves or the wrong
// encounter history would silently invalidate a later browser observation.
let route;
plugin.configureServer({middlewares:{use(path, handler) {
  assert.equal(path, '/__qa'); route = handler;
}}});
let html;
route({}, {setHeader() {}, end(value) { html = value; }});
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const fixtures = vm.runInNewContext(script.slice(0, script.indexOf('const mount=')) + '\nfixtures');
for(const [name,growth] of [['egg',0],['egg_cracking',8],['egg_ready',16]]) {
  assert.equal(fixtures[name].stage,'egg');
  assert.equal(fixtures[name].growth,growth);
  assert.equal(fixtures[name].partner,null);
  assert.equal(fixtures[name].companions.length,0);
}
for (const years of [1,10,50]) {
  const save = fixtures['anniversary_' + years + '_scrolled'];
  assert.equal(save.ageTicks + 4, (25 + years) * 20, 'anniversary must allow four ticks before opening');
  assert.ok(save.partner.married);
  assert.equal(save.marriageAge, 25);
  assert.deepEqual(Array.from(save.marriageMilestonesSeen), [1,10,25,50].filter(year => year < years));
}
assert.equal(fixtures.anniversary_50_scrolled.lifetime.money, 123456789);
for (const id of ['gate','stairs','boss','lamp','mirror']) {
  const save = fixtures['legend_' + id + '_cared'];
  const unseen = ['gate','stairs','boss','lamp','mirror'].filter(other => !save.lifetime.legendsMet.includes(other));
  assert.deepEqual(unseen, [id], id + ': fixture would select another legend');
  assert.equal(save.legendMet, false);
  assert.equal(save.infinite, false);
  assert.equal(save.partner, null);
  assert.ok(save.sodachi >= 90);
  assert.equal(save.oneTimeBoosts.sicknessShieldCount, 12);
}
assert.equal(fixtures.special_date.items.reward, 1);
assert.equal(fixtures.special_date_two.items.reward, 2);
assert.equal(fixtures.special_date_two.lifetime.money, 123456789);
assert.equal(fixtures.special_date_ring.items.reward, 1);
assert.ok(fixtures.special_date_ring.lifetime.ownedNaotoItems.includes('naoto_ring'));
assert.equal(fixtures.deepsea_date.regionId, 'deepsea');
assert.equal(fixtures.deepsea_date.partner.id, 'anglerfish');
assert.equal(fixtures.deepsea_special_date.regionId, 'deepsea');
assert.equal(fixtures.deepsea_special_date.partner.id, 'anglerfish');
assert.equal(fixtures.deepsea_special_date.items.reward, 1);
for (const name of ['special_date','special_date_two','special_date_ring','deepsea_special_date']) {
  assert.equal(fixtures[name].datesThisLife, 2);
  assert.equal(fixtures[name].dateCooldownTicks, 0);
  assert.ok(fixtures[name].partner.married);
  assert.equal(fixtures[name].companions.length, 26);
}
// The dedicated long-name fixture must expose sickness, not a higher-priority
// low-health notice. The illustrated fixture must keep all inspection targets.
const care = require('../care-status.js');
const sick = care.assess(fixtures.care_sick_only);
assert.equal(sick.kind, 'sick');
assert.equal(sick.action, 'medicineBtn');
const {harness} = require('./helpers/runtime-harness.cjs');
const saved = new Map([['naotocchi-save-v1',JSON.stringify(fixtures.ui_illustrations)]]);
const h = harness({resume:true,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}});
assert.equal(h.api.state().companions.length,26);
assert.equal(h.api.state().partner.id,'robot_neighbor');
assert.equal(h.api.state().lifetime.ownedShopItems.length,15);
assert.equal(h.api.state().lifetime.ownedNaotoItems.length,4);
assert.equal(h.api.state().lifetime.equippedItemId,'ribbon');
assert.equal(Object.keys(h.api.state().items).filter(id=>id.startsWith('fun_')&&h.api.state().items[id]===2).length,7);
// Reload manual weather fixtures: an invalid mode would silently use live
// weather/time and invalidate the later visual observation.
for(const [name,weather,time] of [['scenery_clouds','cloudy','day'],['scenery_snow','snow','night'],['scenery_moon','sunny','night'],['scenery_rain','rain','day']]) {
  const storage=new Map([['naotocchi-save-v1',JSON.stringify(fixtures[name])]]);
  const scene=harness({resume:true,storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  scene.api.renderEnvironment();
  assert.equal(scene.document.body.dataset.weather,weather);
  assert.equal(scene.document.body.dataset.time,time);
  assert.equal(scene.api.state().companions.length,26);
  assert.equal(scene.api.state().partner.id,'robot_neighbor');
}

// Execute the actual emitted discovery code with backgrounds already removed
// by production fallback. Hidden probes must still report the failed atlas.
for(const [name,season,region] of [
  ['season_spring','spring','home'],['season_autumn','autumn','forest'],['season_summer_sea','summer','sea'],
  ['scenery_animals_farm','spring','countryside'],['scenery_animals_snow','spring','snow'],
  ['scenery_memory_lake','summer','memory_lake'],
  ['stack_harvest','summer','countryside'],['stack_sakura','spring','home'],
  ['stack_leaves','autumn','forest'],
]){
  const storage=new Map([['naotocchi-save-v1',JSON.stringify(fixtures[name])]]);
  const scene=harness({resume:true,storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  assert.equal(scene.api.state().lifetime.seasonMode,season);
  assert.equal(scene.api.state().regionId,region);
  assert.equal(scene.api.state().companions.length,26);
}
{
  const storage=new Map([['naotocchi-save-v1',JSON.stringify(fixtures.badges_transparent)]]);
  const scene=harness({resume:true,storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  scene.api.render();
  assert.equal((scene.get('endingBadges').innerHTML.match(/class="ending-badge"/g)||[]).length,5);
  assert.match(scene.get('badges').innerHTML,/data-care-icon="sick"/);
  assert.match(scene.get('badges').innerHTML,/data-care-icon="sleep"/);
  assert.equal(scene.api.state().companions.length,26);
}
for(const name of ['stack_harvest','stack_sakura','stack_leaves']){
  const storage=new Map([['naotocchi-save-v1',JSON.stringify(fixtures[name])]]);
  const scene=harness({resume:true,storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  scene.dispatch(scene.get('gamesBtn'),'click');
  assert.ok(scene.get('gameListGrid').innerHTML.includes('data-game-id="'+name.replace('_','-')+'"'),name+' must be selectable through the actual game list');
  assert.equal(scene.api.state().isSleeping,false);
  assert.ok(scene.api.state().energy>=80);
}
const discovery=script.slice(script.indexOf('const iconNodes='),script.indexOf('const panelOverflow='));
const callbacks=[];
const context={iconLoads:new Map(),Image:class{set src(value){callbacks.push(()=>this.onerror());}},doc:{
  querySelectorAll:selector=>selector==='img[data-icon-atlas]'?[{src:'https://example.test/failed-atlas.png'}]:[],
  getElementById:()=>({}),defaultView:{getComputedStyle:()=>({backgroundImage:'none'})},
}};
vm.createContext(context);
vm.runInContext('function sample(){'+discovery+'return iconImages;} first=sample();',context);
assert.equal(context.first.length,1,'failed atlas disappeared after its CSS background was removed');
assert.equal(context.first[0].status,'pending');
callbacks[0]();
assert.equal(context.first[0].status,'pending','later load/error mutated an earlier measurement');
vm.runInContext('second=sample();',context);
assert.equal(context.second[0].status,'failed');
console.log('VISUAL QA ROUTE TEST OK: generated script compiles; egg, anniversary, legend and date saves; long disease selects medicine; illustrated save reloads 26 companions, partner, 15 shop items, 4 rewards, 7 fun props. No browser rendering claimed.');
