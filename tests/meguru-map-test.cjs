// めぐるの ちず(あるいた きろく)。
// たいせつなのは「べんりすぎて たんさくを けさない」こと なので、
// まだ 行って いない ところ・見つけて いない ひみつが もれない ことを いちばん あつく みる
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];

// canvas は かかない。よばれた ことだけ うけとる にせもの
function fakeCtx() {
  const state = { imageSmoothingEnabled: true }, stack = [];
  return new Proxy(state, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'save') return () => stack.push({ ...state });
    if (k === 'restore') return () => { const p = stack.pop(); if (p) Object.assign(state, p); };
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (t) => ({ width: String(t).length * 6 });
    if (k === 'getImageData') return () => ({ data: [] });
    return () => {};
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(opts = {}) {
  const h = harness(Object.assign({ fullDisplay: true }, opts));
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'salmon:5', 'sakura:6', 'dragon:7', 'ghost:1', 'mushroom:0', 'beetle:0'];
  s.regionId = opts.regionId || 'forest';
  h.api.render();
  return { h, M: h.api.meguruMod, s };
}
// spot へ むかって じっさいに あるく(テレポートしない ので みちも きろくされる)
function walkTo(sim, target, steps = 2200) {
  for (let i = 0; i < steps; i++) {
    const dx = target.x - sim.player.x, dz = target.z - sim.player.z, d = Math.hypot(dx, dz);
    if (d < Math.max(50, target.r * 0.5)) return true;
    sim.step(1 / 60, { x: dx / d, y: -dz / d });
  }
  return false;
}

test('a region you have never walked shows no paths, no spots and no landmarks: only the shape of the map', () => {
  const { M } = setup();
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    const md = sim.mapData();
    assert.equal(md.spots.length, 0, `${id}: no spot before walking`);
    assert.equal(md.paths.length, 0, `${id}: no path before walking`);
    assert.equal(md.landmarks.length, 0, `${id}: no landmark before walking`);
    assert.equal(md.zones.filter((z) => z.visited).length, 0, `${id}: no district visited`);
    for (const z of md.zones) assert.equal(z.spots.length, 0, `${id}/${z.id}: an unvisited district lists no spots`);
    assert.ok(md.len > 0 && md.halfW > 0, `${id}: the size of the world is known`);
  }
});

test('walking into a district records it, and only the neighbours reachable by an ordinary path are hinted at', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
  walkTo(sim, sim.world.spots.find((q) => q.id === 'bright1'));
  const md = sim.mapData();
  const visited = md.zones.filter((z) => z.visited).map((z) => z.id);
  assert.equal(Array.from(visited).join(','), 'bright', 'the bright forest is the district you are in');
  assert.ok(md.zones.some((z) => z.hinted), 'the next district over is hinted at');
  for (const z of md.zones) assert.ok(!(z.visited && z.hinted), 'a district is either drawn or hinted, never both');
  // ヒントに 出るのは ふつうの みちで つながって いる 地区だけ
  const zoneOf = new Map(sim.world.spots.map((q) => [q.id, q.zone]));
  const open = new Set();
  for (const sg of sim.world.segments) {
    if (sg.kind === 'secret') continue;
    const a = zoneOf.get(sg.a.id), b = zoneOf.get(sg.b.id);
    if (a === 'bright') open.add(b); if (b === 'bright') open.add(a);
  }
  for (const z of md.zones) if (z.hinted) assert.ok(open.has(z.id), `${z.id} is hinted only because an ordinary path leads there`);
});

test('a spot appears on the map only once you have stood in it, and its name comes with it', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const target = sim.world.spots.find((q) => q.id === 'village');
  assert.equal(sim.mapData().spots.some((q) => q.id === 'village'), false, 'not there before');
  walkTo(sim, target);
  const found = sim.mapData().spots.find((q) => q.id === 'village');
  assert.ok(found, 'there after');
  assert.equal(found.label, target.label, 'the name is on the map');
  assert.ok(Number.isFinite(found.x) && Number.isFinite(found.z));
});

test('an undiscovered secret leaks nothing: not its place, not its name, not the path to it, not even a marker', () => {
  const { M } = setup();
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    const secrets = sim.world.spots.filter((q) => q.secret);
    if (!secrets.length) continue;
    // その 地域を ぜんぶ あるいた ことに する(ひみつ いがい)
    const open = sim.world.spots.filter((q) => !q.secret);
    sim.loadMapRecords({
      zones: [...new Set(open.map((q) => q.zone).filter(Boolean))],
      paths: sim.world.segments.map((sg) => M.segKey(sg)),
      marks: sim.world.props.filter((p) => p.mid).map((p) => p.mid),
    });
    for (const q of open) sim.discovered.add(q.id);
    const md = sim.mapData();
    const ids = new Set(md.spots.map((q) => q.id));
    // ちずに じっさいに 字で 出るのは スポットの なまえ と 大ランドマークの なまえ だけ
    const labels = new Set(md.spots.map((q) => q.label).concat(md.landmarks.filter((q) => q.tier === 1).map((q) => q.label)));
    for (const sec of secrets) {
      assert.equal(ids.has(sec.id), false, `${id}: ${sec.id} is not on the map`);
      assert.equal(md.spots.some((q) => q.x === sec.x && q.z === sec.z), false, `${id}: ${sec.id} leaks no position`);
      assert.equal(labels.has(sec.label), false, `${id}: ${sec.label} leaks no name`);
    }
    for (const p of md.paths) {
      const A = sim.world.spots.find((q) => q.id === p.a), B = sim.world.spots.find((q) => q.id === p.b);
      assert.ok(!(A.secret || B.secret), `${id}: no path leads to an undiscovered secret (${p.key})`);
    }
    // スポットに つく めじるし(lm:/mk:)が ひみつの うえに 立って いない こと
    // (hero: は 地区に つく ので、地区 id と スポット id が おなじでも べつもの)
    assert.equal(md.landmarks.some((l) => /^(lm|mk):/.test(l.mid) && secrets.some((sec) => l.mid.slice(3) === sec.id)), false, `${id}: no marker stands on a secret`);
  }
});

test('a secret is added to the map the moment you find it, and not before', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
  const secret = sim.world.spots.find((q) => q.id === 'hiddenpond');
  assert.equal(sim.mapData().spots.some((q) => q.id === 'hiddenpond'), false);
  sim.setPlayer(secret.x, secret.z); sim.step(1 / 60, { x: 0, y: 0 });
  const md = sim.mapData();
  const shown = md.spots.find((q) => q.id === 'hiddenpond');
  assert.ok(shown && shown.secret, 'now it is drawn, marked as a secret');
});

test('landmarks keep their three tiers, and are drawn only when the place they mark is known', () => {
  const { M } = setup();
  let tier1 = 0, tier2 = 0, tier3 = 0;
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    const marks = sim.world.props.filter((p) => p.mid);
    assert.equal(new Set(marks.map((p) => p.mid)).size, marks.length, `${id}: every landmark has its own id`);
    for (const p of marks) assert.ok(p.tier >= 1 && p.tier <= 3, `${id}: ${p.mid} has a tier`);
    tier1 += marks.filter((p) => p.tier === 1).length;
    tier2 += marks.filter((p) => p.tier === 2).length;
    tier3 += marks.filter((p) => p.tier === 3).length;
    // 「見た」きろくが あっても、地区に 入って いない 中ランドマークは 出さない
    sim.loadMapRecords({ zones: [], paths: [], marks: marks.map((p) => p.mid) });
    const md = sim.mapData();
    assert.equal(md.landmarks.some((l) => l.tier === 2), false, `${id}: a district landmark waits until you enter the district`);
    assert.equal(md.landmarks.some((l) => l.tier === 3), false, `${id}: a small landmark waits until you find its spot`);
    for (const l of md.landmarks) assert.equal(l.tier, 1, `${id}: only the big ones are visible from afar`);
  }
  assert.ok(tier1 >= 13 && tier2 >= 60 && tier3 >= 40, `all three tiers exist across the world (${tier1}/${tier2}/${tier3})`);
});

test('an old save that only knows spots is turned into a map without losing anything', () => {
  const { M } = setup();
  const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
  const w = sim.world;
  const old = ['entry', 'bright1', 'bright2', 'thicket1', 'fork'];
  const seeded = M.seedMapRecords(w, new Set(old));
  assert.equal(Array.from(seeded.zones).sort().join(','), 'bright,thicket', 'the districts of those spots count as visited');
  for (const key of seeded.paths) {
    const [a, b] = key.split('|');
    assert.ok(old.includes(a) && old.includes(b), 'only roads between spots you already found');
  }
  assert.ok(seeded.marks.length > 0, 'the landmarks of those places come back too');
  assert.equal(seeded.marks.some((mid) => mid.startsWith('hero:') && !seeded.zones.includes(mid.slice(5))), false, 'no hero from a district you never saw');
  // 見つけて いた スポットは ちずでも 見つけた まま
  sim.loadMapRecords(seeded);
  for (const id of old) sim.discovered.add(id);
  const md = sim.mapData();
  for (const id of old) assert.ok(md.spots.some((q) => q.id === id), `${id} stays discovered`);
});

test('the map save stays small: ids only, no coordinates, and it fits in the existing save shape', () => {
  const { h, M, s } = setup({ canvasContext: fakeCtx() });
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  const target = run.world.spots.find((q) => q.id === 'bright2');
  run.setPlayer(target.x, target.z); h.advance(200);
  const m = s.lifetime.meguru;
  assert.ok(m && m.zones && m.paths && m.marks, 'the three new records live next to the old spot record');
  assert.ok(Array.isArray(m.spots.forest), 'the old spot record is untouched');
  const json = JSON.stringify({ zones: m.zones, paths: m.paths, marks: m.marks });
  assert.ok(!/\d{3,}\s*,\s*\d{3,}/.test(json), 'no walked coordinates are stored');
  // せかいを ぜんぶ あるいても、もつのは id だけ。おおきさは せかいの おおきさで とまる
  let bytes = 0;
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    bytes += JSON.stringify({
      zones: sim.world.zones.map((z) => z.id),
      paths: sim.world.segments.map((sg) => M.segKey(sg)),
      marks: sim.world.props.filter((p) => p.mid).map((p) => p.mid),
    }).length;
  }
  assert.ok(bytes < 40000, `a fully walked world is still small (${bytes} bytes)`);
  run.stop();
});

test('opening the map pauses the walk and closing it puts you back where you stood', () => {
  const { h } = setup({ canvasContext: fakeCtx() });
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  run.setPlayer(120, 640); h.advance(60);
  const before = { x: run.player.x, z: run.player.z };
  run.openMap();
  assert.equal(run.mapOpen, true, 'the map is open');
  const box = run.mapScreen.el;
  assert.ok(box.classList.contains('mgr-map'), 'the map covers the field');
  assert.ok(h.get('meguruOverlay').children.includes(box), 'and it lives inside the めぐる screen');
  const frame0 = run.sim.view().frame;
  h.advance(2000);
  assert.equal(run.sim.view().frame, frame0, 'the world does not run while the map is open');
  run.closeMap();
  assert.equal(run.mapOpen, false);
  assert.equal(box.isConnected, false, 'the map is gone');
  assert.equal(h.get('meguruOverlay').children.includes(box), false);
  assert.equal(run.player.x, before.x, 'you are exactly where you were');
  assert.equal(run.player.z, before.z);
  const frame1 = run.sim.view().frame;
  h.advance(300);
  assert.ok(run.sim.view().frame > frame1, 'and the world runs again');
  run.stop();
});

test('with the map closed there is no map work at all: it is built on open and thrown away on close', () => {
  const { h } = setup({ canvasContext: fakeCtx() });
  assert.equal(h.api.startMeguru(), true);
  const run = h.api.meguruRun();
  const mapBoxes = () => h.get('meguruOverlay').children.filter((c) => c.classList && c.classList.contains('mgr-map')).length;
  assert.equal(run.mapOpen, false, 'nothing is built until you ask for it');
  assert.equal(mapBoxes(), 0);
  h.advance(3000);
  assert.equal(mapBoxes(), 0, 'walking never creates the map');
  run.openMap();
  assert.equal(mapBoxes(), 1, 'exactly one map, built on open');
  run.openMap();
  assert.equal(mapBoxes(), 1, 'asking twice does not stack maps');
  run.closeMap();
  assert.equal(mapBoxes(), 0, 'and closing throws it away');
  run.stop();
  assert.equal(mapBoxes(), 0, 'leaving めぐる leaves nothing behind');
});

test('every one of the 13 regions can be drawn from mapData alone, and the progress never counts hidden secrets', () => {
  const { M } = setup();
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [] });
    const open = sim.world.spots.filter((q) => !q.secret);
    sim.loadMapRecords({ zones: [...new Set(open.map((q) => q.zone).filter(Boolean))], paths: [], marks: [] });
    for (const q of open) sim.discovered.add(q.id);
    const md = sim.mapData();
    assert.equal(md.progress.percent, 100, `${id}: walking everything except the secrets already reads 100%`);
    assert.equal(md.progress.zones, md.progress.zoneTotal, `${id}: districts read n/n`);
    const pal = M.mapPalette(md);
    assert.ok(pal.paper && pal.ink && pal.land, `${id}: the map has a paper and an ink colour`);
    const L = M.mapLayout(md, 320, 420, 1, 0, 0);
    assert.ok(L.s > 0 && Number.isFinite(L.toX(0)) && Number.isFinite(L.toY(md.len)), `${id}: every place lands on the sheet`);
    for (const z of md.zones) assert.ok(z.bounds && Number.isFinite(z.bounds.minX), `${id}/${z.id}: bounds come from the world data`);
  }
});

test('the map changes nothing about the scenery: the fauna and character audits still come back clean', () => {
  const { M } = setup();
  assert.equal(M.auditSceneryFauna().length, 0, 'no living creature in the scenery');
  const reg = M.buildRegistry();
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    assert.equal(w.props.filter((p) => p.emoji && M.isFaunaEmoji(p.emoji)).length, 0, `${id}: still no animals among the props`);
    // ちずの id は みため には いっさい ひびかない
    for (const p of w.props) if (p.mid) assert.ok(p.layer === 'landmark', `${id}: a map id only ever sits on a landmark`);
  }
});
