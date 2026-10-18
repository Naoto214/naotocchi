const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { harness, ENVIRONMENT_WEATHER_LABELS } = require('./helpers/runtime-harness.cjs');

// RH-3: harness の 任意の せってい(environment / hostEnvironmentClock / seed)で、
// host の 時計・TZ が かわっても おなじ 結果に なることを、別の process で たしかめる。
// host の 時計は --require の shim で ずらす(監査の probe と おなじ方法)。production は変えない。
const ROOT = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rh3-determinism-'));
const SHIM = path.join(TMP, 'host-clock.cjs');
const PROBE = path.join(TMP, 'probe.cjs');
fs.writeFileSync(SHIM, `
const RealDate = Date, base = Number(process.env.HOST_NOW), start = RealDate.now();
const shifted = () => base + (RealDate.now() - start);
class HostDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(shifted()); else super(...a); }
  static now() { return shifted(); }
}
global.Date = HostDate;
`);
fs.writeFileSync(PROBE, `
process.chdir(${JSON.stringify(ROOT)});
const vm = require('node:vm');
const { harness } = require(${JSON.stringify(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'))});
const options = JSON.parse(process.env.HARNESS_OPTIONS);
const h = harness(options);
const out = { env: h.api.currentEnvironment() };
if (process.env.PROBE_RANDOM) out.page = [1, 2, 3].map(() => vm.runInContext('Math.random()', h.sandbox));
if (process.env.PROBE_MEGURU) {
  // meguru-test の「めぐるに はいる」と おなじ 場面(いぜん 時間・天気・らんすう しだいで ゆれていた)
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  const petStage = h.api.currentFormStageIndex();
  s.discoveredStages = [...new Set(['dog:0', 'dog:1', 'dog:' + petStage, 'cat:2', 'penguin:3', 'salmon:5', 'sakura:6', 'dragon:7', 'ghost:1', 'mushroom:0', 'beetle:0'])];
  s.lifetime.companionsRecruited = ['shiba', 'owl', 'rabbit_friend'];
  s.lifetime.partnersRecorded = ['forest_bear', 'sea_mermaid'];
  s.regionId = 'forest';
  h.api.render();
  h.api.startMeguru();
  h.advance(2000);
  const run = h.api.meguruRun();
  out.meguru = run.world.residents.map((a) => [a.key, Math.round(a.x), Math.round(a.z), a.behavior]);
  h.api.stopMeguru();
}
process.stdout.write(JSON.stringify(out));
`);

// host の 時計(UTC)と TZ を かえて、別の process で probe を うごかす
function probe(hostIso, tz, options, extra = {}) {
  const r = spawnSync(process.execPath, ['--require', SHIM, PROBE], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, TZ: tz, HOST_NOW: String(Date.parse(hostIso)), HARNESS_OPTIONS: JSON.stringify(options), ...extra },
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const HOSTS = [['2026-09-27T03:00:00Z', 'UTC'], ['2026-09-27T13:00:00Z', 'Asia/Tokyo'], ['2027-01-15T21:30:00Z', 'America/Los_Angeles']];
const FIXED = {
  environment: { time: 'day', weather: 'sunny' }, hostEnvironmentClock: true, seed: 20260923,
  pinDate: true, clockNow: Date.parse('2026-09-16T12:00:00Z'),
};

test('the same environment + seed + pinned clock gives the same time, weather, season and randomness on any host clock and TZ', () => {
  const runs = HOSTS.map(([at, tz]) => probe(at, tz, FIXED, { PROBE_RANDOM: '1' }));
  for (const r of runs.slice(1)) assert.deepEqual(r, runs[0]);
  assert.equal(runs[0].env.time, 'day');
  assert.equal(runs[0].env.weather, 'sunny');
});

test('with environment: \'auto\' the result follows the host clock (the test detects the difference)', () => {
  const morning = probe('2026-09-27T03:00:00Z', 'UTC', { environment: 'auto' });
  const afternoon = probe('2026-09-27T13:00:00Z', 'UTC', { environment: 'auto' });
  assert.notEqual(morning.env.time, afternoon.env.time, 'time of day comes from the host clock');
  const winter = probe('2027-01-15T12:00:00Z', 'UTC', { environment: 'auto' });
  assert.notEqual(winter.env.season, afternoon.env.season, 'season comes from the host calendar without pinDate');
  // pinDate + clockNow だけで 季節は そろう(environment.season は つくらない)
  const pinned = { environment: 'auto', pinDate: true, clockNow: Date.parse('2026-09-16T12:00:00Z') };
  assert.equal(probe('2027-01-15T12:00:00Z', 'UTC', pinned).env.season, probe('2026-09-27T13:00:00Z', 'UTC', pinned).env.season);
});

test('hostEnvironmentClock alone makes the time of day follow the harness clock instead of the host clock', () => {
  const options = { environment: 'auto', hostEnvironmentClock: true, clockNow: Date.parse('2026-09-16T08:00:00Z') };
  const a = probe('2026-09-27T03:00:00Z', 'UTC', options);
  const b = probe('2026-09-27T20:00:00Z', 'UTC', options);
  assert.equal(a.env.time, 'morning');
  assert.equal(b.env.time, 'morning');
  assert.equal(a.env.weather, b.env.weather);
});

test('the flaky "entering meguru" scene is reproducible with the options on any host clock and TZ', () => {
  const runs = HOSTS.map(([at, tz]) => probe(at, tz, FIXED, { PROBE_MEGURU: '1' }));
  assert.ok(runs[0].meguru.length >= 3, 'the forest has inhabitants');
  for (const r of runs.slice(1)) assert.deepEqual(r.meguru, runs[0].meguru);
  // options なし(clock だけ固定)では、host の 時刻と たねの ない らんすうで 場面が ゆれる
  const pinnedOnly = { environment: 'auto', pinDate: true, clockNow: FIXED.clockNow };
  const loose = [probe('2026-09-27T03:00:00Z', 'UTC', pinnedOnly, { PROBE_MEGURU: '1' }), probe('2026-09-27T13:00:00Z', 'UTC', pinnedOnly, { PROBE_MEGURU: '1' })];
  assert.notDeepEqual(loose[0].meguru, loose[1].meguru);
});

test('one generator feeds the page Math.random (from boot) and meguru', () => {
  const h = harness({ seed: 5 });
  const afterBoot = h.rng.calls();
  assert.ok(afterBoot > 0, 'startup randomness is drawn from the seeded generator');
  vm.runInContext('Math.random()', h.sandbox);
  assert.equal(h.rng.calls(), afterBoot + 1, 'page Math.random');
  const M = h.api.meguruMod;
  const before = h.rng.calls();
  M.wantActivity({ traits: {} }, { time: 'day', weather: 'sunny', season: 'autumn' }, { regionId: 'forest' }, { actWeights: { walk: 1, look: 1, sit: 1 } });
  assert.ok(h.rng.calls() > before, 'meguru draws from the same generator');
  const twin = harness({ seed: 5 });
  assert.equal(twin.rng.calls(), afterBoot);
  assert.equal(vm.runInContext('Math.random()', twin.sandbox), (() => { const g = harness({ seed: 5 }); return vm.runInContext('Math.random()', g.sandbox); })());
});

test('default harness(): fixed day/sunny environment (RH-6), native random, unpinned new Date(), harness Date.now()', () => {
  const h = harness();
  assert.equal(h.rng, null);
  assert.equal(h.api.currentEnvironment().time, 'day');
  assert.equal(h.api.currentEnvironment().weather, 'sunny');
  assert.equal(harness({ environment: 'auto' }).sandbox.NaotocchiEnvironment, require('../world-environment.js'), "environment: 'auto' passes the real module through");
  assert.match(vm.runInContext('Math.random.toString()', h.sandbox), /native code/, 'Math.random is not replaced');
  const drift = Math.abs(vm.runInContext('new Date().getTime()', h.sandbox) - Date.now());
  assert.ok(drift < 60000, 'new Date() is not pinned by default');
  assert.equal(vm.runInContext('Date.now()', h.sandbox), 1000, 'Date.now() still uses the harness clock');
});

test('a manual time/weather mode still wins over environment, and the undersea/starry regions keep no weather', () => {
  const h = harness({ environment: { time: 'night', weather: 'rain' } });
  const s = h.api.state();
  assert.equal(h.api.currentEnvironment().time, 'night');
  assert.equal(h.api.currentEnvironment().weather, 'rain');
  s.lifetime.timeMode = 'morning'; s.lifetime.weatherMode = 'snow';
  assert.equal(h.api.currentEnvironment().time, 'morning');
  assert.equal(h.api.currentEnvironment().weather, 'snow');
  s.lifetime.timeMode = 'auto'; s.lifetime.weatherMode = 'auto';
  for (const region of ['deepsea', 'star_stop']) {
    s.regionId = region;
    assert.equal(h.api.currentEnvironment().weather, null, region);
  }
  // script.js は この 2 地域で simulatedWeather を よばないので、包んだ module を じかに たしかめる
  for (const region of ['deepsea', 'star_stop']) assert.equal(h.sandbox.NaotocchiEnvironment.simulatedWeather(region, 'autumn'), null, region);
  assert.equal(h.sandbox.NaotocchiEnvironment.simulatedWeather('forest', 'autumn').mode, 'rain');
  assert.throws(() => harness({ environment: { time: 'noon' } }), /environment\.time/);
});

test('the deterministic preset pins environment, host clock, seed and date; explicit options win', () => {
  const { DETERMINISTIC } = require('./helpers/runtime-harness.cjs');
  const h = harness({ deterministic: true });
  assert.ok(h.rng, 'seeded');
  assert.equal(vm.runInContext('new Date().getTime()', h.sandbox), DETERMINISTIC.clockNow, 'new Date() is pinned');
  assert.equal(h.api.currentEnvironment().time, 'day');
  const o = harness({ deterministic: true, environment: { time: 'night', weather: 'rain' } });
  assert.equal(o.api.currentEnvironment().time, 'night');
  assert.equal(o.api.currentEnvironment().weather, 'rain');
});

test('the weather labels the harness returns match world-environment.js', () => {
  const real = require('../world-environment.js');
  const seen = {};
  for (let day = 0; day < 400 && Object.keys(seen).length < 4; day++) {
    for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
      const w = real.simulatedWeather('home', 'winter', new Date(Date.UTC(2026, 0, 1 + day, hour)));
      if (w) seen[w.mode] = w.label;
    }
  }
  assert.deepEqual(seen, ENVIRONMENT_WEATHER_LABELS);
});
