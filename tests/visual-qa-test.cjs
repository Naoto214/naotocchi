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
console.log('VISUAL QA ROUTE TEST OK: generated script compiles; 3 egg stages; 3 delayed anniversaries; 5 pending legends; reward counts, ring and deepsea saves. No browser rendering claimed.');
