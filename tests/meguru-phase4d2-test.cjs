// Phase 4D-2 — home / sea だけの Canvas 遠景 PoC
// (docs/design/meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md §9〜§11、
//  docs/handoff/meguru-phase4d2-canvas-poc-2026-09-23.md)
//
// ここで しばるのは
//   ・遠景は home / sea だけ。ほかの 地域には 出さない
//   ・画面の x は 方角 + カメラの 向き + いまの 視野(F = 0.95W)だけで きまる(方角固定)
//   ・見える かどうか・順位・lod は DistantFeature / visibleDistant / distantInView の まま(renderer で 作りなおさない)
//   ・1 画面の かずは 性能 tier ごとに 3 / 2 / 1
//   ・よいやすい せってい: 位置は おなじ、よこの ずれは よわく、ちらつきは なし、あらわれる / きえる は fade
//   ・2D 命令は 1 フレーム +30 いか
//   ・sim / セーブ / view / 世界地図 / corridor は 1 つも 動かない。4D-2 を 消しても 指紋は おなじ
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const SRC = fs.readFileSync('meguru.js', 'utf8');
const strip4d2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4D-2$/.test(l)).join('\n');
const blocks4d2 = () => SRC.match(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm) || [];

const W = 338, H = 533, F = W * 0.95;
const FOV = 2 * Math.atan(W / 2 / F) * 180 / Math.PI;       // 55.5°(いまの 視野の まま)
const ENV = (time, weather = 'sunny', season = 'summer') => ({ time, weather, season, region: 'x' });
const wrap = (d) => ((d + 540) % 360) - 180;
const YAWS = [0, 45, 90, 135, 180, 225, 270, 315];
// 2D の 主要命令(設計監査 §1.3 と おなじ かぞえかた)
const COUNTED = new Set(['fill', 'stroke', 'fillRect', 'drawImage', 'fillText', 'arc', 'ellipse', 'createLinearGradient', 'createRadialGradient']);

// なんでも うける ctx。命令の 名前だけ 記録する
function recCtx() {
  const log = [];
  const t = { canvas: { width: W, height: H }, globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic' };
  const grad = { addColorStop() {} };
  const ctx = new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return (...a) => { log.push(k); return k.startsWith('create') ? grad : undefined; };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return { ctx, log, counted: () => log.filter((k) => COUNTED.has(k)).length };
}
function setup() {
  const h = harness({ fullDisplay: true });
  return { h, M: h.api.meguruMod, G: h.api.meguruMod.WORLD_GEOGRAPHY };
}
// region / env / 見つけた みち / tier / reduced で 1 フレーム えがく
function scene(M, o) {
  const rc = recCtx();
  const r = M.createCanvasRenderer({ canvas: {}, ctx: rc.ctx, rawCtx: rc.ctx, W, H, tier: o.tier || 0 });
  const sim = M.createSimulation({ regionId: o.region, env: o.env });
  sim.setCameraMotion(false);
  const list = o.list || M.visibleDistant(o.region, o.env, { links: o.links || [] });
  if (o.distant !== false) r.setDistant({ regionId: o.region, list, reduced: !!o.reduced });
  const draw = (yawDeg, now = 1000) => { sim.camera.yaw = yawDeg * Math.PI / 180; rc.log.length = 0; r.draw(sim.view(), now); return arr(r.distantShown).map((x) => Object.assign({}, x)); };
  return { r, sim, rc, list, draw };
}
const ids = (xs) => xs.map((x) => x.id).sort().join(',');
// lod.maxTier で しぼった うえで distantInView(renderer と おなじ もの を データ がわ から 出す)
const expectInView = (M, list, yaw, tier, max) => arr(M.distantInView(arr(list).filter((v) => v.feature.lod.maxTier >= tier), yaw, FOV, max)).map((v) => v.id).sort().join(',');

test('1. 遠景を 出すのは home / sea だけ(start() の データの わたしかた)', () => {
  for (const [region, want] of [['home', 'home'], ['sea', 'sea'], ['city', null], ['forest', null], ['deepsea', null], ['star_stop', null]]) {
    const { h, M } = setup();
    const s = h.api.state();
    Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: region });
    Object.assign(s.lifetime, { timeMode: 'night', weatherMode: 'sunny', seasonMode: 'summer' });
    h.api.render();
    const calls = [];
    const fake = () => ({ draw() {}, destroy() {}, setDistant(st) { calls.push(st); } });
    const run = M.start(h.document.getElementById('meguruOverlay'), { renderer: fake });
    h.advance(1200);
    run.stop();
    const last = calls[calls.length - 1];
    if (want) {
      assert.ok(last && last.regionId === want, region + ' には 遠景の データが わたる');
      const got = arr(last.list).map((v) => v.id).sort().join(',');
      assert.equal(got, arr(M.visibleDistant(region, { time: 'night', weather: 'sunny', season: 'summer' }, { links: arr(h.api.state().lifetime.meguru.world.links) })).map((v) => v.id).sort().join(','),
        region + ': わたす ものは visibleDistant の まま');
      assert.ok(calls.length <= 3, region + ': 毎フレーム わたさない(かわった ときだけ): ' + calls.length);
    } else {
      assert.ok(calls.length >= 1 && calls.every((c) => c === null), region + ' には 遠景を わたさない');
    }
  }
});

test('2. 方角固定: yaw 0〜315 で 画面の x は 方角 + カメラの 向き + 視野 だけで きまる(home / sea)', () => {
  const { M } = setup();
  const cases = [
    { region: 'home', env: ENV('day') },
    { region: 'sea', env: ENV('evening'), links: ['jungle|sea'] },
  ];
  for (const c of cases) {
    const S = scene(M, c);
    const seen = new Set();
    for (const yaw of YAWS.concat([10, 100, 200, 330, 336, 350])) {
      const shown = S.draw(yaw);
      assert.equal(ids(shown), expectInView(M, S.list, yaw, 0, 3), `${c.region} yaw ${yaw}: えらぶのは distantInView`);
      for (const d of shown) {
        const f = S.list.find((v) => v.id === d.id).feature;
        const rel = wrap(f.bearingLocal - yaw);
        assert.ok(Math.abs(rel) <= FOV / 2 + 1e-9, `${d.id}: 視野の なか`);
        assert.ok(Math.abs(d.x - d.dx - (W / 2 + F * Math.tan(rel * Math.PI / 180))) < 1e-6, `${c.region} yaw ${yaw} ${d.id}: x = W/2 + F·tan(rel)`);
        // 画面から 方角を もどすと いつも おなじ(カメラが まわっても 世界に くっついて いる)
        const back = (yaw + Math.atan((d.x - d.dx - W / 2) / F) * 180 / Math.PI + 360) % 360;
        assert.ok(Math.abs(wrap(back - f.bearingLocal)) < 1e-6, `${d.id}: 画面から もどした 方角 ${back} = ${f.bearingLocal}`);
        seen.add(d.id);
      }
    }
    // 真正面を むけば まんなか
    for (const v of S.list) {
      if (v.feature.bearingLocal == null) continue;
      const d = S.draw(v.feature.bearingLocal).find((x) => x.id === v.id);
      if (!d) continue;                                            // 順位で おされた もの
      assert.ok(Math.abs(d.x - d.dx - W / 2) < 1e-6, v.id + ' を むくと まんなか');
    }
    assert.ok(seen.size >= 2, c.region + ': まわると 遠景が 出る: ' + [...seen]);
  }
  // 決まった 方角: home は 森と 山が 315°、湖の おかが 45°。sea は 島が 336°、街と 砂漠が 135°
  const H1 = scene(M, { region: 'home', env: ENV('day') });
  assert.equal(ids(H1.draw(315)), 'home>>mountain,home>forest');
  assert.equal(ids(H1.draw(45)), 'home>river_lake');
  for (const yaw of [135, 180, 225]) assert.equal(H1.draw(yaw).length, 0, 'home の うしろがわ には ない');
  const S1 = scene(M, { region: 'sea', env: ENV('night'), links: ['jungle|sea'] });
  assert.equal(ids(S1.draw(135)), 'sea>>desert,sea>city');
});

test('3. 見える 条件: 島は 見つけてから、街の 灯は 夕方・夜 だけ、しんかいは 地平線に 出ない', () => {
  const { M, G } = setup();
  const at = (o, yaw) => scene(M, o).draw(yaw).map((d) => d.kind);
  // 島: 見つける まえ / あと(昼)
  assert.ok(!at({ region: 'sea', env: ENV('day') }, 336).includes('island'), '見つける まえは 島が ない');
  assert.ok(at({ region: 'sea', env: ENV('day'), links: ['jungle|sea'] }, 336).includes('island'), '見つけたら 島が 見える');
  assert.ok(!at({ region: 'sea', env: ENV('night'), links: ['jungle|sea'] }, 336).includes('island'), '夜は 島が ない');
  assert.ok(!at({ region: 'sea', env: ENV('day', 'rain'), links: ['jungle|sea'] }, 336).includes('island'), '雨は 島が ない');
  // 街の 灯: 昼は ない、夕方は うすく、夜は こく
  assert.ok(!at({ region: 'sea', env: ENV('day') }, 135).includes('city_glow'), '昼は 街の 灯が ない');
  const ev = scene(M, { region: 'sea', env: ENV('evening') }).draw(135).find((d) => d.kind === 'city_glow');
  const ni = scene(M, { region: 'sea', env: ENV('night') }).draw(135).find((d) => d.kind === 'city_glow');
  assert.ok(ev && ni, '夕方と 夜は 街の 灯が 見える');
  assert.ok(Math.abs(ev.alpha - 0.5) < 1e-9 && Math.abs(ni.alpha - 1) < 1e-9, `こさは データの まま(夕方 ${ev.alpha} / 夜 ${ni.alpha})`);
  // しんかい(たて)は 方位が ない。道を ぜんぶ 見つけて、出口の ちかくに いても 地平線には 出さない
  const all = M.visibleDistant('sea', ENV('night'), { links: G.connections.map((c) => c.id) }, { nearGates: ['deepsea|sea'] });
  assert.ok(arr(all).some((v) => v.feature.kind === 'deep_dark'), 'データ としては ある');
  const S = scene(M, { region: 'sea', env: ENV('night'), list: all });
  for (let yaw = 0; yaw < 360; yaw += 15) assert.ok(!S.draw(yaw).some((d) => d.kind === 'deep_dark'), 'yaw ' + yaw + ': しんかいは 地平線に 出ない');
  // ほしぞら の のりば は home / sea の 遠景に ない
  for (const r of ['home', 'sea']) assert.ok(!arr(M.visibleDistant(r, ENV('night'), { links: G.connections.map((c) => c.id) })).some((v) => v.feature.targetRegion === 'star_stop'), r);
});

test('4. 性能 tier: 1 画面 3 / 2 / 1。lod.maxTier より おもい tier では 出さない', () => {
  const { M } = setup();
  // home 315° は 森(mid)と 山(far)
  assert.equal(ids(scene(M, { region: 'home', env: ENV('day'), tier: 0 }).draw(315)), 'home>>mountain,home>forest');
  assert.equal(ids(scene(M, { region: 'home', env: ENV('day'), tier: 1 }).draw(315)), 'home>>mountain,home>forest');
  assert.equal(ids(scene(M, { region: 'home', env: ENV('day'), tier: 2 }).draw(315)), 'home>forest', 'いちばん かるい tier は mid だけ');
  assert.equal(ids(scene(M, { region: 'sea', env: ENV('day'), links: ['jungle|sea'], tier: 2 }).draw(336)), '', 'かるい tier では far の 島も 出さない');
  // 上限: 視野に 5 つ ある とき(ほんものの 特徴を 方角だけ ずらした もの)
  const src = arr(M.distantFeatures('home')).find((f) => f.id === 'home>forest');
  const five = [0, 5, 10, 15, 20].map((b, i) => ({ id: 'fake' + i, alpha: 1, feature: Object.assign({}, src, { id: 'fake' + i, bearingLocal: b, priority: 300 - i }) }));
  for (const [tier, max] of [[0, 3], [1, 2], [2, 1]]) {
    const shown = scene(M, { region: 'home', env: ENV('day'), tier, list: five }).draw(10);
    assert.equal(shown.length, max, `tier ${tier} は ${max} まで`);
    assert.equal(ids(shown), five.slice(0, max).map((v) => v.id).sort().join(','), '順位の たかい じゅん');
  }
});

test('5. よいやすい せってい: 位置は おなじ、よこの ずれは よわく、ちらつかない。あらわれる ときは fade', () => {
  const { M } = setup();
  const base = { region: 'sea', env: ENV('night'), links: ['jungle|sea'] };
  const A = scene(M, base), B = scene(M, Object.assign({ reduced: true }, base));
  // よこに あるいた いち(よこの ずれが 出る ところ)
  for (const S of [A, B]) S.sim.setPlayer(600, S.sim.player.z);
  for (const yaw of [120, 135, 150]) {
    const a = A.draw(yaw), b = B.draw(yaw);
    assert.equal(ids(a), ids(b), 'えらぶ ものは おなじ');
    for (const d of a) {
      const e = b.find((x) => x.id === d.id);
      assert.ok(Math.abs((d.x - d.dx) - (e.x - e.dx)) < 1e-9, d.id + ': 方角の 位置は おなじ');
      assert.ok(Math.abs(d.dx) > 1, d.id + ': ふだんは よこの ずれが ある');
      assert.ok(Math.abs(e.dx - d.dx * 0.3) < 1e-9, d.id + ': よいやすい せっていでは 3 わり');
    }
  }
  // 街の 灯: ふだんは ゆっくり またたく、よいやすい せっていでは かわらない
  const lights = (S, now) => S.draw(135, now).find((d) => d.kind === 'city_glow').lights.join(',');
  assert.notEqual(lights(A, 1000), lights(A, 2400), 'ふだんは またたく');
  assert.equal(lights(B, 1000), lights(B, 2400), 'よいやすい せっていでは ちらつかない');
  // 夜に なった とき: 街の 灯は ぱっと 出ない(ふっと あらわれる)。どちらの せっていでも
  for (const reduced of [false, true]) {
    const C = scene(M, { region: 'sea', env: ENV('day'), reduced });
    C.draw(135, 1000);
    C.r.setDistant({ regionId: 'sea', list: M.visibleDistant('sea', ENV('night'), { links: [] }), reduced });
    const seq = [];
    for (let i = 1; i <= 90; i++) { const d = C.draw(135, 1000 + i * 16).find((x) => x.kind === 'city_glow'); seq.push(d ? d.alpha : 0); }
    assert.ok(seq[0] < 0.1, 'さいしょは うすい: ' + seq[0]);
    for (let i = 1; i < seq.length; i++) assert.ok(seq[i] >= seq[i - 1] - 1e-9, 'だんだん こく');
    assert.ok(seq[seq.length - 1] > 0.9, 'やがて データの こさ: ' + seq[seq.length - 1]);
    // 昼に もどると ふっと きえる
    C.r.setDistant({ regionId: 'sea', list: M.visibleDistant('sea', ENV('day'), { links: [] }), reduced });
    const d1 = C.draw(135, 3000).find((x) => x.kind === 'city_glow');
    assert.ok(d1 && d1.alpha > 0.5, 'すぐには きえない');
    for (let i = 1; i <= 120; i++) C.draw(135, 3000 + i * 16);
    assert.ok(!C.draw(135, 5000).some((x) => x.kind === 'city_glow'), 'やがて きえる');
  }
  // 視野の はしでは うすい(はみ出して ぱっと きえない)
  const E = scene(M, { region: 'home', env: ENV('day') });
  const mid = E.draw(45).find((d) => d.id === 'home>river_lake'), edge = E.draw(45 - FOV / 2 + 1).find((d) => d.id === 'home>river_lake');
  assert.ok(mid.alpha > 0.99 && edge && edge.alpha < 0.3, `まんなか ${mid.alpha} / はし ${edge && edge.alpha}`);
});

test('6. 2D 命令は 1 フレーム +30 いか(home / sea の いちばん おおい ばめん)', () => {
  const { M } = setup();
  const worst = [];
  for (const [region, env, links, yaw] of [
    ['home', ENV('day'), [], 315], ['home', ENV('day', 'snow', 'winter'), [], 315], ['home', ENV('day'), [], 45],
    ['sea', ENV('night'), ['jungle|sea'], 135], ['sea', ENV('evening'), ['jungle|sea'], 135], ['sea', ENV('day'), ['jungle|sea'], 336],
  ]) {
    for (const tier of [0, 1, 2]) {
      const on = scene(M, { region, env, links, tier }), off = scene(M, { region, env, links, tier, distant: false });
      on.draw(yaw); off.draw(yaw);
      const diff = on.rc.counted() - off.rc.counted();
      worst.push(`${region}/${env.time}/${yaw}/t${tier}: +${diff}`);
      assert.ok(diff >= 0 && diff <= 30, `${region} ${env.time} yaw ${yaw} tier ${tier}: +${diff}`);
    }
  }
  // 遠景が 視野に ない ときは 0
  const on = scene(M, { region: 'home', env: ENV('day') }), off = scene(M, { region: 'home', env: ENV('day'), distant: false });
  on.draw(180); off.draw(180);
  assert.equal(on.rc.counted(), off.rc.counted(), 'うしろを むいて いる ときは 1 つも ふえない');
});

test('7. renderer contract: データは よむ だけ。view・セーブ・地図の 座標・buildWorld は つかわない', () => {
  const { h, M } = setup();
  const before = JSON.stringify(M.distantRegistry());
  const S = scene(M, { region: 'sea', env: ENV('evening'), links: ['jungle|sea'] });
  for (const yaw of YAWS) S.draw(yaw);
  assert.equal(JSON.stringify(M.distantRegistry()), before, 'えがいても DistantFeature は かわらない(px を 書きこまない)');
  for (const f of arr(M.distantRegistry().sea)) for (const k of Object.keys(f)) assert.ok(!/^(x|y|sx|sy|px|screen|width|height)$/i.test(k), f.id + '.' + k);
  assert.ok(!('distant' in S.sim.view()), 'view に 遠景は のせない');
  const B = blocks4d2();
  assert.equal(B.length, 2, '4D-2 の ブロックは renderer と start() の 2 つ');
  const code = B.join('\n').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  for (const ng of ['mapX', 'mapY', 'buildWorld', 'REGION_FRAME', 'toGlobal', 'regionFrame', 'recordWorldLinks', 'recordSpot', 'localStorage', 'saveMapBits', 'setRandom', 'performance.now', 'Date.now', 'star_stop']) {
    assert.ok(!new RegExp('\\b' + ng.replace('.', '\\.') + '\\b').test(code), '4D-2 は ' + ng + ' を つかわない');
  }
  // 視野は あたらしい 定数を もたない(F から 出す)
  assert.ok(/Math\.atan\(W \/ 2 \/ F\)/.test(code) && !/55\.5/.test(code), '視野は F = 0.95W から');
  // えんけいの 帯(abyss / neonskyline)は 実時刻を よまない
  const bd = SRC.slice(SRC.indexOf('function drawBackdrop('), SRC.indexOf('// ====== Phase 4D-2: 方角固定'));
  assert.ok(!/performance\.now\(\)/.test(bd), 'drawBackdrop は now(curNow)だけ');
  // セーブに 遠景の あとかたは ない
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'sea' });
  h.api.render();
  const run = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
  h.advance(600); run.stop();
  assert.ok(!/distant|silhouette|bearing/i.test(JSON.stringify(s.lifetime.meguru || {})), 'セーブに 遠景の あとかたも ない');
});

test('8. **消しても うごきが 変わらない**: 4D-2 を 消した meguru.js と sim の 指紋が おなじ。ほかの 地域の え も おなじ', () => {
  const stripped = strip4d2(SRC);
  assert.ok(!/setDistant|drawDistant|syncDistant|distantShown|DISTANT_POC/.test(stripped), 'けしのこしが ない');
  assert.ok(/visibleDistant/.test(stripped) && /worldCorridors/.test(stripped), 'Phase 4C / 4D-1 は のこって いる');
  const files = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4d2-a-'));
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'meguru4d2-b-'));
  const plant = (d) => {
    fs.mkdirSync(path.join(d, 'tests', 'helpers'), { recursive: true });
    for (const f of files) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(d, f));
    fs.copyFileSync('tests/helpers/runtime-harness.cjs', path.join(d, 'tests/helpers/runtime-harness.cjs'));
  };
  try {
    plant(dirA); plant(dirB);
    fs.writeFileSync(path.join(dirB, 'meguru.js'), stripped);
    const probe = `
      const { harness } = require('./tests/helpers/runtime-harness.cjs');
      const h = harness({ fullDisplay: true }), M = h.api.meguruMod;
      M.setRandom(((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(4848));
      const out = [];
      out.push('distant ' + JSON.stringify(M.distantRegistry()).length + ' corridors ' + JSON.stringify(M.worldCorridors()).length);
      for (const id of ['home', 'sea', 'city', 'mountain', 'deepsea']) {
        const sim = M.createSimulation({ regionId: id });
        for (let i = 0; i < 300; i++) sim.step(1 / 30, { x: Math.sin(i / 7), y: Math.cos(i / 5) });
        const p = sim.player, v = sim.view();
        out.push(id + ' walk ' + p.x.toFixed(4) + ',' + p.z.toFixed(4) + ',' + p.heading.toFixed(4) + ' found ' + sim.discovered.size + ' view ' + Object.keys(v).sort().join(','));
      }
      // setDistant を よばない renderer の え(ほかの 地域・遠景なし)は 命令の ならびが おなじ
      for (const id of ['city', 'mountain', 'forest', 'home', 'sea']) {
        const log = [];
        const t = { canvas: { width: 338, height: 533 }, globalAlpha: 1 };
        const ctx = new Proxy(t, { get(o, k) { if (k in o) return o[k]; if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
          return (...a) => { log.push(k); return String(k).startsWith('create') ? { addColorStop() {} } : undefined; }; }, set(o, k, v) { o[k] = v; return true; } });
        const r = M.createCanvasRenderer({ canvas: {}, ctx, rawCtx: ctx, W: 338, H: 533, tier: 0 });
        const sim = M.createSimulation({ regionId: id, env: { time: 'night', weather: 'sunny', season: 'summer' } });
        sim.setCameraMotion(false);
        for (const yaw of [0, 1, 2, 3, 4, 5]) { sim.camera.yaw = yaw; r.draw(sim.view(), 1000 + yaw * 16); }
        out.push(id + ' draw ' + log.length + ' ' + log.join('').length);
      }
      // start() の セーブの ながれ
      const s = h.api.state();
      Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'sea' });
      h.api.render();
      const run = M.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {} }) });
      h.advance(900); run.stop();
      out.push('save ' + JSON.stringify(s.lifetime.meguru));
      console.log(out.join('\\n'));
    `;
    fs.writeFileSync(path.join(dirA, 'probe.cjs'), probe);
    fs.writeFileSync(path.join(dirB, 'probe.cjs'), probe);
    const withP = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirA });
    const without = execFileSync(process.execPath, ['probe.cjs'], { encoding: 'utf8', cwd: dirB });
    assert.ok(withP.length > 300 && /city draw [1-9]/.test(withP), '指紋が とれて いる');
    assert.ok(/setDistant/.test(fs.readFileSync(path.join(dirA, 'meguru.js'), 'utf8')), 'A がわには 4D-2 が ある');
    assert.equal(without, withP, 'Phase 4D-2 を 消しても sim・セーブ・ほかの え は 1 つも 変わらない');
  } finally {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  }
});

test('9. 分母・spot・たび・世界地図・corridor・DistantFeature の かずは 動いて いない', () => {
  const { M, G } = setup();
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 12);
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  assert.equal(G.connections.length, 14);
  assert.equal(arr(M.worldCorridors()).length, 13);
  const reg = M.distantRegistry();
  assert.equal(Object.keys(reg).length, 12);
  assert.equal(Object.keys(reg).reduce((n, k) => n + arr(reg[k]).length, 0), 37);
});
