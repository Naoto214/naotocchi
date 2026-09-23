// Phase 4D-2c — 既存の backdrop 帯の 回転の 向き・速さを 方角固定の 遠景に あわせる
// (docs/handoff/meguru-phase4d2c-backdrop-yaw-2026-09-23.md)
//
// ここで しばるのは
//   ・どの backdrop の どの そうも、カメラを 右へ まわすと 左へ ながれる(方角固定の 遠景と おなじ 向き。逆は 0)
//   ・C だった 5 種(hills / farhills / lakehills / seahorizon / mesas)は 角度どおりの 0.6〜1.2 倍
//   ・B / A だった 種類は これまでの 速さの まま(直しすぎない)
//   ・1 周で 模様が つながる(180° の おりかえしで ぱっと かわらない)
//   ・形は かえない(yaw 0 では ずれ 0)。描く 命令の かずも かわらない
//   ・よいやすい せってい: 歩いた ぶんの よこの ずれを 3 わりに。回転の 向きは おなじ
//   ・実時刻・地図の 座標を 使わない。遠景レイヤー・セーブ・当たり判定・住民・たび・分母は 動かない
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { harness } = require('./helpers/runtime-harness.cjs');

const arr = (x) => Array.from(x || []);
const SRC = fs.readFileSync('meguru.js', 'utf8');
const W = 338, H = 533, F = W * 0.95, DEG = F * Math.PI / 180;       // 方角固定の 遠景は 1° で 5.60 px
const C_KINDS = ['hills', 'farhills', 'lakehills', 'seahorizon', 'mesas'];
const REGION_OF = { hills: 'home', neonskyline: 'city', farhills: 'countryside', treeline: 'forest', peaks: 'mountain', snowpeaks: 'snow',
  seahorizon: 'sea', lakehills: 'river_lake', canopy: 'jungle', mesas: 'desert', skystops: 'star_stop', abyss: 'deepsea', mist: 'memory_lake', dunes: 'home', skyline: 'city' };

function recCtx() {
  const log = [];
  const t = { canvas: { width: W, height: H }, globalAlpha: 1, fillStyle: '#000' };
  const ctx = new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'measureText') return () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return (...a) => { log.push([k, a]); return k.startsWith('create') ? { addColorStop() {} } : undefined; };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return { ctx, log };
}
let shared = null;
const setup = () => shared || (shared = { M: harness({ fullDisplay: true }).api.meguruMod });
// 帯を 1 つ(kind)だけ 見る 場面。もの・住民・木もれ日は けして、えんけいの 帯 だけに する
function scene(M, kind, o = {}) {
  const rc = recCtx();
  const r = M.createCanvasRenderer({ canvas: {}, ctx: rc.ctx, rawCtx: rc.ctx, W, H, tier: o.tier || 0 });
  if (o.reduced) r.setDistant({ regionId: REGION_OF[kind], list: [], reduced: true });
  const sim = M.createSimulation({ regionId: REGION_OF[kind], env: { time: 'day', weather: 'sunny', season: 'summer' } });
  sim.setCameraMotion(false); sim.world.props = []; sim.world.residents = []; sim.party.length = 0; sim.world.canopy = null;
  sim.world.backdrop = kind; sim.setPlayer(o.x || 0, sim.player.z);
  const at = (yawDeg) => { sim.camera.yaw = yawDeg * Math.PI / 180; rc.log.length = 0; r.draw(sim.view(), 1000); return arr(r.backdropLayers).map((l) => Object.assign({}, l)); };
  // 帯の 命令だけ(帯あり と 帯なし の ちがう ところ)
  const seg = (yawDeg) => {
    sim.camera.yaw = yawDeg * Math.PI / 180;
    rc.log.length = 0; r.draw(sim.view(), 1000); const a = rc.log.slice();
    sim.world.backdrop = '__none__'; rc.log.length = 0; r.draw(sim.view(), 1000); const b = rc.log.slice(); sim.world.backdrop = kind;
    const eq = (p, q) => p[0] === q[0] && JSON.stringify(p[1]) === JSON.stringify(q[1]);
    let s = 0; while (s < a.length && s < b.length && eq(a[s], b[s])) s++;
    let e = 0; while (e < a.length - s && e < b.length - s && eq(a[a.length - 1 - e], b[b.length - 1 - e])) e++;
    return a.slice(s, a.length - e);
  };
  return { r, sim, at, seg };
}
const wrapP = (d, P) => { let v = ((d % P) + P) % P; if (v > P / 2) v -= P; return v; };
// 2 つの yaw の あいだの そうごとの ずれ(px/°)
const perDeg = (a, b, dYaw) => a.map((l, i) => wrapP(b[i].s - l.s, l.period) / dYaw);
const ALL_KINDS = Object.keys(REGION_OF);

test('1. どの backdrop の どの そうも、右へ まわると 左へ ながれる(逆向き 0)。1 周 2° きざみ', () => {
  const { M } = setup();
  for (const kind of ALL_KINDS) {
    const S = scene(M, kind);
    let prev = S.at(0);
    assert.ok(prev.length >= 1, kind + ' の そうが ある');
    for (let yaw = 2; yaw <= 360; yaw += 2) {
      const cur = S.at(yaw);
      for (const [i, v] of perDeg(prev, cur, 2).entries()) assert.ok(v < 0, `${kind} そう ${i} yaw ${yaw}: ${v.toFixed(2)} px/° は 左へ`);
      prev = cur;
    }
  }
});

test('2. 速さ: C だった 5 種は 角度どおりの 0.6〜1.2 倍、ほかは これまでの 速さ(0.1〜0.7 倍)の まま', () => {
  const { M } = setup();
  const R0 = 2.6 / (2 * Math.PI * 0.95);                           // これまでの 1 周 2.6W を 角度どおりの わりあいに
  for (const kind of ALL_KINDS) {
    const S = scene(M, kind);
    const ratios = perDeg(S.at(40), S.at(42), 2).map((v) => -v / DEG);
    for (const [i, q] of ratios.entries()) {
      // ほしぞらの うすい 霧の 帯(さいごの そう)も 逆向き だった ので 角度どおりに した
      if (C_KINDS.includes(kind) || kind === 'dunes' || (kind === 'skystops' && i === ratios.length - 1)) assert.ok(q >= 0.6 && q <= 1.2, `${kind} そう ${i}: ${q.toFixed(2)} 倍`);
      else assert.ok(q >= 0.1 && q <= 0.7, `${kind} そう ${i}: ${q.toFixed(2)} 倍(これまでの 速さの まま)`);
    }
  }
  // B の 種類は これまでの m × R0 と ほぼ おなじ(1 周で つながる ように そろえた ぶん だけ ちがう)
  // (回転 だけの 速さ = 1 周で ながれる 量 k × くりかえし ÷ 2πF)
  const rot = (l) => l.k * l.period / (2 * Math.PI * F);
  const q = scene(M, 'peaks').at(40).map(rot);
  assert.ok(Math.abs(q[0] - 0.8 * R0) / (0.8 * R0) < 0.05 && Math.abs(q[1] - 1.1 * R0) / (1.1 * R0) < 0.05, 'やまなみは これまでの 速さ: ' + q.map((v) => v.toFixed(3)));
  // うみの 水平線は ほぼ 角度どおり(島・街の 灯と いっしょに うごく)
  for (const l of scene(M, 'seahorizon').at(100)) assert.ok(Math.abs(rot(l) - 1) < 0.1, 'うみの 水平線は 1.0 倍: ' + rot(l).toFixed(3));
  // C だった 種類の そうの 意味の 距離: おく(0.7〜0.8)< てまえ・水平線(0.9〜1.0)
  for (const kind of C_KINDS) { const ls = scene(M, kind).at(10).map(rot); assert.ok(Math.min(...ls) >= 0.6 && Math.max(...ls) <= 1.1, kind + ': ' + ls.map((v) => v.toFixed(2))); }
});

test('3. じっさいの 波の 形も 左へ ながれる(描いた 点で たしかめる)', () => {
  const { M } = setup();
  for (const kind of C_KINDS.concat(['dunes'])) {
    const S = scene(M, kind);
    for (const yaw of [20, 110, 200, 290]) {
      const pa = S.seg(yaw), pb = S.seg(yaw + 1);
      // 波の path: x が -10 から 12 px きざみ
      const waves = (seg) => { const out = []; let cur = null; for (const [k, a] of seg) { if (k === 'beginPath') { cur = []; out.push(cur); } else if (k === 'lineTo' && cur) cur.push(a); } return out.filter((p) => p.length > 20 && Math.abs(p[1][0] - p[0][0] - 12) < 1e-6); };
      const A = waves(pa), B = waves(pb);
      assert.ok(A.length >= 1 && A.length === B.length, `${kind}: 波が ある`);
      for (let w = 0; w < A.length; w++) {
        let num = 0, den = 0;
        for (let j = 2; j < A[w].length - 2; j++) { const dy = (A[w][j + 1][1] - A[w][j - 1][1]) / 24; num += (B[w][j][1] - A[w][j][1]) * dy; den += dy * dy; }
        const dx = -num / den;
        assert.ok(dx < -1.5, `${kind} yaw ${yaw} 波 ${w}: ${dx.toFixed(2)} px/° は 左へ`);
      }
    }
  }
});

test('4. 1 周で 模様が つながる: 0° / 360° と ±180° の 前後で ずれが とばない', () => {
  const { M } = setup();
  for (const kind of ALL_KINDS) {
    const S = scene(M, kind);
    for (const [a, b] of [[359.9, 0.1], [179.9, -179.9], [-0.1, 0.1]]) {
      const la = S.at(a), lb = S.at(b);
      for (const [i, l] of la.entries()) {
        const d = wrapP(lb[i].s - l.s, l.period);
        assert.ok(Math.abs(d) < 3, `${kind} そう ${i}: ${a}° → ${b}° で ${d.toFixed(2)} px(つながる)`);
      }
    }
  }
});

test('5. 形は かえない: yaw 0・よこ 0 では どの そうも ずれ 0。描く 命令の かずは 向きで かわらない', () => {
  const { M } = setup();
  for (const kind of ALL_KINDS) {
    const S = scene(M, kind);
    for (const l of S.at(0)) assert.ok(Math.abs(l.s) < 1e-9, `${kind}: yaw 0 では ずれ 0`);
    const counts = new Set([0, 45, 90, 135, 180, 225, 270, 315].map((y) => S.seg(y).filter(([k]) => ['fill', 'fillRect', 'stroke', 'ellipse', 'arc'].includes(k)).length));
    assert.equal(counts.size, 1, `${kind}: 命令の かずは 向きで かわらない ${[...counts]}`);
  }
});

test('6. よいやすい せってい: 回転の 向きは おなじ(左へ)、歩いた ぶんの よこの ずれは 3 わり', () => {
  const { M } = setup();
  for (const kind of ['hills', 'seahorizon', 'mesas', 'peaks']) {
    const N = scene(M, kind, { x: 400 }), R = scene(M, kind, { x: 400, reduced: true }), N0 = scene(M, kind), R0 = scene(M, kind, { reduced: true });
    const yaw = 30;
    const n = N.at(yaw), r = R.at(yaw), n0 = N0.at(yaw), r0 = R0.at(yaw);
    for (let i = 0; i < n.length; i++) {
      // よこに 400 あるいた ぶんの ずれ(ふつう / よいやすい せってい)
      const latN = n[i].s - n0[i].s, latR = r[i].s - r0[i].s;
      assert.ok(Math.abs(latN) > 1 && Math.abs(latR - latN * 0.3) < 1e-6, `${kind} そう ${i}: よこの ずれ ${latN.toFixed(2)} → ${latR.toFixed(2)}`);
    }
    // 回転の 向きと 速さは ほぼ おなじ(ちがうのは よこの ずれの ぶん だけ)
    const dN = perDeg(N.at(60), N.at(62), 2), dR = perDeg(R.at(60), R.at(62), 2);
    for (let i = 0; i < dN.length; i++) assert.ok(dR[i] < 0 && dN[i] < 0, `${kind}: よいやすい せっていでも 左へ ${dN[i].toFixed(2)} / ${dR[i].toFixed(2)}`);
    // 回転 だけの 速さ(1 周で ながれる 量)は おなじ
    assert.deepEqual(r.map((l) => l.k * l.period), n.map((l) => l.k * l.period), kind + ': 回転の 速さは おなじ');
  }
});

test('7. 実時刻・地図の 座標を つかわない。遠景レイヤー(方角固定)は そのまま', () => {
  const { M } = setup();
  const bd = SRC.slice(SRC.indexOf('// ---- えんけい(地平線の おくの シルエット)'), SRC.indexOf('// ====== Phase 4D-2: 方角固定'));
  const code = bd.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  for (const ng of ['performance.now', 'Date.now', 'mapX', 'mapY', 'REGION_FRAME', 'toGlobal', 'worldMapData', "plx('far')"]) assert.ok(!code.includes(ng), 'drawBackdrop は ' + ng + ' を つかわない');
  assert.ok(/cam\.yaw/.test(code) && /\bF\b/.test(code), '向きは カメラの yaw と 視野(F)から');
  // 遠景レイヤー: 画面の x は これまで どおり W/2 + F·tan(rel)
  const rc = recCtx(), r = M.createCanvasRenderer({ canvas: {}, ctx: rc.ctx, rawCtx: rc.ctx, W, H, tier: 0 });
  const sim = M.createSimulation({ regionId: 'home', env: { time: 'day', weather: 'sunny', season: 'summer' } }); sim.setCameraMotion(false);
  r.setDistant({ regionId: 'home', list: M.visibleDistant('home', { time: 'day', weather: 'sunny', season: 'summer' }, { links: [] }) });
  sim.camera.yaw = 300 * Math.PI / 180; r.draw(sim.view(), 1000);
  const d = arr(r.distantShown).find((x) => x.id === 'home>forest');
  assert.ok(d && Math.abs(d.x - d.dx - (W / 2 + F * Math.tan(15 * Math.PI / 180))) < 1e-6, '遠景レイヤーは かわらない');
});

test('8. セーブ・当たり判定・住民・たび・分母・DistantFeature は 動かない', () => {
  const { M } = setup();
  const C = M.worldCountable();
  assert.deepEqual([C.regions.length, C.links.length, C.tier1, C.zones], [11, 12, 17, 103]);
  assert.equal(Object.values(M.distantRegistry()).reduce((n, l) => n + arr(l).length, 0), 37);
  assert.equal(arr(M.worldCorridors()).length, 13);
  // 描いても sim は かわらない(おなじ 入力で 歩かせた 2 つが 一致)
  const fp = (sim) => [sim.player.x.toFixed(4), sim.player.z.toFixed(4), sim.discovered.size, sim.world.obstacles.length, sim.world.residents.length].join('/');
  for (const region of ['home', 'sea', 'desert']) {
    const a = M.createSimulation({ regionId: region }), b = M.createSimulation({ regionId: region });
    const rc = recCtx(), r = M.createCanvasRenderer({ canvas: {}, ctx: rc.ctx, rawCtx: rc.ctx, W, H, tier: 0 });
    for (let i = 0; i < 120; i++) { const inp = { x: Math.sin(i / 9), y: -0.8 }; a.step(1 / 30, inp); b.step(1 / 30, inp); r.draw(a.view(), 1000 + i * 33); }
    assert.equal(fp(a), fp(b), region + ': えがいても sim は おなじ');
  }
  const h = harness({ fullDisplay: true }), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'desert' });
  h.api.render();
  const run = h.api.meguruMod.start(h.document.getElementById('meguruOverlay'), { renderer: () => ({ draw() {}, destroy() {}, setDistant() {} }) });
  h.advance(500); run.stop();
  assert.ok(!/backdrop|ring|bdLayers/i.test(JSON.stringify(s.lifetime.meguru || {})), 'セーブに 帯の あとかたは ない');
  for (const id of ['sea', 'home']) { const reg = h.api.REGIONS.find((x) => x.id === id); h.api.travelToRegion(reg, { id }); assert.equal(s.regionId, id); }
});
