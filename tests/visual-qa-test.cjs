const assert = require('node:assert/strict');
const fixtures = require('./visual-qa-fixtures.cjs');

// Every fixture must be safe to serialize, and the most important layout
// regressions should stay explicit rather than depending on screenshots alone.
for (const [name,fixture] of Object.entries(fixtures)) {
  assert.equal(typeof fixture,'object',name);
  assert.ok(JSON.stringify(fixture).length>100,name);
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
assert.equal(h.api.state().lifetime.ownedShopItems.length,14);
assert.equal(h.api.state().lifetime.ownedNaotoItems.length,4);
assert.equal(h.api.state().lifetime.equippedItemId,'ribbon');
assert.equal(Object.keys(h.api.state().items).filter(id=>id.startsWith('fun_')&&h.api.state().items[id]===2).length,4);
assert.deepEqual(Array.from(h.api.state().lifetime.ownedTools).sort(),['fun_camera','fun_musicbox','fun_surprise']);
for(const id of ['fun_camera','fun_musicbox','fun_surprise']) assert.equal(h.api.state().lifetime.itemExtraScenes[id],1);
// Reload manual weather fixtures: an invalid mode would silently use live
// weather/time and invalidate the later visual observation.
for(const [name,weather,time] of [['scenery_clouds','cloudy','day'],['scenery_snow','snow','night'],['scenery_moon','sunny','night'],['scenery_rain','rain','day']]) {
  const storage=new Map([['naotocchi-save-v1',JSON.stringify(fixtures[name])]]);
  const scene=harness({resume:true,storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  scene.api.renderEnvironment();
  assert.equal(scene.document.body.dataset.weather,weather);
  assert.equal(scene.document.body.dataset.time,time);
}
console.log('VISUAL QA FIXTURE TEST OK');
