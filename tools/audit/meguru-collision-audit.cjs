// 使いかた: node tools/audit/meguru-collision-audit.cjs [walk|core|stand](読むだけ。production は かえない。docs/audit/meguru-collision-audit-2026-09-29.md の 数字)
// めぐるの collision semantics / visual geometry の 監査(読むだけ。production は かえない)
process.chdir(require('path').resolve(__dirname, '../..'));
const fs = require('fs');
const src = fs.readFileSync('meguru.js', 'utf8');
const { harness } = require('../../tests/helpers/runtime-harness.cjs');
const lit = (name) => { const m = src.match(new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\});')); return Function('return ' + m[1])(); };
const OCC = lit('OCCLUDER_BOX'), COLL = lit('COLLIDER'), ROLE = lit('STRUCT_ROLE');
const SOLID_BUILD = new Set(['🏢', '🏬', '🏠', '🏡', '🏚️', '🛖', '🏪', '🚉', '🏕️', '⛺', '⛩️', '🎡', '⛲', '🚏', '🏛️', '🗿', '⚓', '⛵', '🚧']);
const SOLID_TREE = new Set(['🌳', '🌲', '🌴', '🌵', '🪸', '🪨']);
// 見た目が「かたい もの」(木・岩・建物・柵)。草・花・葉・すなの うねりは 通れて 正しい
const TREE_STRUCT = new Set(['bigtrunk', 'parktree', 'riverwood', 'mistwood', 'bluetree', 'pinewall', 'palmgrove', 'stump', 'log', 'driftwood', 'buttress', 'hayroll']);
const SOFT = new Set(['dune', 'sandcrest', 'snowdrift', 'cloudwisp', 'scree', 'fern', 'reed', 'reedclump', 'ricestalk', 'crop', 'vine', 'bigleaf', 'hugeleaf', 'palmfrond', 'branch', 'kelp', 'mushroomcluster', 'planter', 'parasol', 'crosswalk', 'woodbridge', 'ropebridge', 'lightbridge', 'pier', 'cropline']);
function category(p) {
  if (p.landmark) return 'landmark';
  if (p.struct) {
    if (SOFT.has(p.struct)) return 'soft';
    if (TREE_STRUCT.has(p.struct) || p.struct === 'hedge') return 'tree';
    const r = ROLE[p.struct];
    if (r === 'building') return 'building';
    if (r === 'terrain') return 'rock/terrain';
    if (r === 'obstacle') return /fence|rail|guard/.test(p.struct) ? 'fence' : 'small-solid';
    if (r === 'water') return 'water';
    if (r === 'light') return 'post/light';
    if (r === 'vegetation') return 'plant-mass';
    return 'other-struct';
  }
  if (p.emoji) {
    if (SOLID_BUILD.has(p.emoji)) return p.emoji === '🚧' ? 'fence' : 'building';
    if (SOLID_TREE.has(p.emoji)) return p.emoji === '🪨' ? 'rock/terrain' : 'tree';
    if (/[🌳🌲🌴🌵🎋🎄]/u.test(p.emoji)) return 'tree';
    if (/[🏠🏡🏢🏬🏪🏭🏫🏥🏦🏨🏯🏰⛪🕌🛕⛩🏛🏚🛖]/u.test(p.emoji)) return 'building';
    if (/[🪨⛰🗻🏔]/u.test(p.emoji)) return 'rock/terrain';
    return 'soft';
  }
  return 'other';
}
const SOLIDLIKE = new Set(['tree', 'building', 'rock/terrain', 'fence', 'landmark', 'small-solid', 'post/light', 'water', 'plant-mass']);
function visualHalf(p) { if (p.struct) return p.size * ((OCC[p.struct] || [0.3])[0]); return p.size * 0.32; }
function fullCollider(p) {
  if (p.landmark) return { shape: 'circle', w: 0.13 };
  if (p.struct) return Object.prototype.hasOwnProperty.call(COLL, p.struct) ? COLL[p.struct] : { shape: 'circle', w: Math.min(0.34, ((OCC[p.struct] || [0.3])[0]) * 0.55), guessed: true };
  if (SOLID_BUILD.has(p.emoji)) return { shape: 'circle', w: 0.24 };
  if (SOLID_TREE.has(p.emoji)) return { shape: 'circle', w: 0.17 };
  return null;
}
function inWalkable(w, x, z, r) {
  const lo = w.minX != null ? w.minX : -w.halfW, hi = w.maxX != null ? w.maxX : w.halfW;
  return x + r > lo && x - r < hi && z + r > 60 && z - r < w.len - 60;
}
function audit(regionId) {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod, reg = M.buildRegistry();
  const w = M.buildWorld(regionId, reg, {});
  // あたり → 物: o.pi(world.props の 番号。2026-09-30 から)が あれば それを、なければ 位置で むすぶ
  const obsAt = new Map(w.obstacles.map((o) => [o.pi != null ? 'i' + o.pi : o.x + ',' + o.z, o]));
  const rows = [];
  for (const p of w.props) {
    const cat = category(p);
    if (!SOLIDLIKE.has(cat)) continue;
    const vh = visualHalf(p);
    if (!inWalkable(w, p.x, p.z, vh)) { rows.push({ cat, status: 'unreachable', p }); continue; }
    const o = obsAt.get('i' + w.props.indexOf(p)) || obsAt.get(p.x + ',' + p.z), fc = fullCollider(p);
    let status, reason = '';
    if (!o) {
      status = 'no-collision';
      if (p.solid === false && p.struct) reason = 'deco(solid:false)';
      else if (!p.solid) reason = p.struct ? (p.layer === 'struct' ? 'small struct(size≤120)' : 'layer ' + p.layer + ' not solid') : 'emoji ' + (p.layer || '') + ' not solid';
      else if (!fc || (p.struct && COLL[p.struct] === null)) reason = 'COLLIDER null';
      else if (p.emoji && !SOLID_BUILD.has(p.emoji) && !SOLID_TREE.has(p.emoji)) reason = 'emoji not in solid sets';
      else reason = 'removed by clearCorridor(path/spot)';
    } else {
      const full = p.size * (fc.w), shrink = o.hw / full;
      // 見た目の よこ幅に たいする あたりの よこ幅(木は みき だけ なので 除く)
      const ratio = o.hw / vh;
      if (shrink < 0.6) { status = 'mismatch'; reason = 'shrunk ' + Math.round(shrink * 100) + '% by clearCorridor'; }
      else if (cat !== 'tree' && cat !== 'landmark' && cat !== 'post/light' && ratio < 0.5) { status = 'mismatch'; reason = 'collider ' + Math.round(ratio * 100) + '% of visual width'; }
      else if (fc.guessed) { status = 'collision'; reason = 'guessed shape'; }
      else status = 'collision';
    }
    rows.push({ cat, status, reason, p, o });
  }
  // shape の 内訳
  const shapes = {};
  for (const o of w.obstacles) shapes[o.shape] = (shapes[o.shape] || 0) + 1;
  return { w, rows, shapes, M, h };
}
function simulate(regionId, frames = 4000) {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId });
  const arr = (x) => Array.from(x || []);
  const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 26);
  s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
  const pc = arr(h.api.partnerCandidates)[0];
  s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
  h.api.render();
  const S = M.createSimulation({ regionId, env: { time: 'day', weather: 'sunny', season: 'spring', region: regionId } });
  const w = S.world, R = 22, r = R * M.STAND_CLEAR;
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  let dir = { x: 0, y: -1 }, playerHit = 0, partyHitFrames = 0, partyHits = 0, movingFrames = 0;
  const partyThrough = new Map(), playerBlocked = new Set();
  for (let f = 0; f < frames; f++) {
    if (f % 90 === 0) { const a = rnd() * Math.PI * 2; dir = { x: Math.sin(a), y: -Math.abs(Math.cos(a)) - 0.2 }; }
    const bx = S.player.x, bz = S.player.z;
    S.step(1 / 60, f % 400 < 340 ? dir : { x: 0, y: 0 });
    if (S.player.moving) movingFrames++;
    if (M.penetrationAt(w, S.player.x, S.player.z, R) > 0.5) playerHit++;
    let any = false;
    for (const a of S.party) {
      const list = M.collidersAt ? null : null;
      if (M.penetrationAt(w, a.x, a.z, r) > 2) {
        any = true; partyHits++;
        // どの obstacle か
        for (const o of w.obstacles) { const d = Math.hypot(o.x - a.x, o.z - a.z); if (d < o.r + r) { const k = o.kind; partyThrough.set(k, (partyThrough.get(k) || 0) + 1); break; } }
      }
    }
    if (any) partyHitFrames++;
    if (Math.hypot(S.player.x - bx, S.player.z - bz) < 0.2 && S.player.moving) playerBlocked.add(Math.round(S.player.x / 50) + ',' + Math.round(S.player.z / 50));
  }
  // 見た目は かたいが あたりが ない もの の なかを プレイヤーの 中心が とおった 回数
  return { frames, movingFrames, playerHit, partyHitFrames, partyHits, partyThrough: [...partyThrough.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8), blockedCells: playerBlocked.size };
}
function main() {
const out = {};
for (const regionId of ['forest', 'mountain', 'city']) {
  const { rows, shapes, w } = audit(regionId);
  const byCat = {};
  for (const r of rows) { const k = r.cat; byCat[k] = byCat[k] || {}; const st = r.status + (r.reason ? ' — ' + r.reason.replace(/\d+%/, 'N%') : ''); byCat[k][st] = (byCat[k][st] || 0) + 1; }
  const kinds = {};
  for (const r of rows) if (r.status !== 'unreachable') { const k = r.cat + ':' + (r.p.struct || r.p.emoji || r.p.landmark) + ':' + r.status; kinds[k] = (kinds[k] || 0) + 1; }
  const sim = simulate(regionId);
  out[regionId] = { props: w.props.length, obstacles: w.obstacles.length, shapes, byCat, topKinds: Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 40), sim };
}
console.log(JSON.stringify(out, null, 1));
}

// ---- プレイヤーが「見た目は かたいが あたりの ない もの」の 中を とおる 回数 ----
function walk() {
  const res = {};
  for (const regionId of ['forest', 'mountain', 'city']) {
    const { rows, M, h } = audit(regionId);
    const ghosts = rows.filter((r) => r.status === 'no-collision');
    const s = h.api.state(); Object.assign(s, { stage: 'growing', isSleeping: false, regionId });
    const S = M.createSimulation({ regionId, env: { time: 'day', weather: 'sunny', season: 'spring', region: regionId } });
    let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    let dir = { x: 1, y: 0 }; const hit = {}; let frames = 0; const touched = new Set();
    for (let f = 0; f < 12000; f++) {
      if (f % 45 === 0) { const a = rnd() * Math.PI * 2; dir = { x: Math.sin(a), y: Math.cos(a) }; }
      S.step(1 / 60, dir); frames++;
      for (const g of ghosts) { const vr = visualHalf(g.p) * 0.6; if (Math.hypot(S.player.x - g.p.x, S.player.z - g.p.z) < vr) { hit[g.cat] = (hit[g.cat] || 0) + 1; touched.add(g.p); } }
    }
    const kinds = {}; for (const p of touched) { const k = p.struct || p.emoji || p.landmark; kinds[k] = (kinds[k] || 0) + 1; }
    res[regionId] = { frames, ghostCount: ghosts.length, framesInsideByCat: hit, distinctGhostsEntered: touched.size, kinds };
  }
  console.log(JSON.stringify(res, null, 1));
}

// ---- 見た目の 足もと(描いた 位置)を ずらして 見る(OCCLUDER_SHIFT の ある 建物・崖は 道と 反対がわへ 描く)----
// 2026-09-30 追加。当たりの 有無に よらず「見た目の 中心部に からだが 入った」フレームを 数える(before / after で 同じ 物差し)
const SHIFT = lit('OCCLUDER_SHIFT');
function outward(w, p) {
  let best = null, bd = Infinity;
  for (const sg of w.segments || []) {
    const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - sg.a.x) * dx + (p.z - sg.a.z) * dz) / L2));
    const px = sg.a.x + dx * t, pz = sg.a.z + dz * t, d = Math.hypot(p.x - px, p.z - pz);
    if (d < bd) { bd = d; best = { px, pz, d, half: sg.half }; }
  }
  if (!best || best.d < 1e-3) return { ux: 0, uz: 0, edge: best ? best.d - best.half : Infinity };
  return { ux: (p.x - best.px) / best.d, uz: (p.z - best.pz) / best.d, edge: best.d - best.half };
}
function footprint(w, p) {
  const half = visualHalf(p), sh = p.struct && SHIFT[p.struct] ? SHIFT[p.struct] * p.size : 0;
  const o = outward(w, p);
  return { x: p.x + o.ux * sh, z: p.z + o.uz * sh, r: half * 0.6, edge: o.edge };
}
const PRIORITY = new Set(['tree', 'building', 'rock/terrain', 'fence', 'landmark']);
function walkCore(frames = 12000) {
  const res = {};
  for (const regionId of ['forest', 'mountain', 'city']) {
    const { rows, M, h, w } = audit(regionId);
    const solids = rows.filter((r) => r.status !== 'unreachable' && PRIORITY.has(r.cat)).map((r) => ({ r, f: footprint(w, r.p) }));
    const s = h.api.state();
    Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId });
    const arr = (x) => Array.from(x || []);
    const comps = arr(h.api.normalCompanions).concat(arr(h.api.rareCompanions)).slice(0, 26);
    s.companions = comps.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = comps.map((c) => c.id);
    const pc = arr(h.api.partnerCandidates)[0];
    s.partner = { id: pc.id, label: pc.label || pc.name, emoji: pc.emoji, affection: 100 }; s.lifetime.partnersRecorded = [pc.id];
    h.api.render();
    const S = M.createSimulation({ regionId, env: { time: 'day', weather: 'sunny', season: 'spring', region: regionId } });
    let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    let dir = { x: 1, y: 0 };
    const player = {}, party = {}; let playerFrames = 0, partyFrames = 0, stuckFrames = 0, lastX = 0, lastZ = 0, maxSpread = 0;
    const grid = new Map(); const cell = 400;
    for (const it of solids) { const k = Math.floor(it.f.x / cell) + ',' + Math.floor(it.f.z / cell); (grid.get(k) || grid.set(k, []).get(k)).push(it); }
    const near = (x, z) => { const cx = Math.floor(x / cell), cz = Math.floor(z / cell), out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const g = grid.get((cx + i) + ',' + (cz + j)); if (g) out.push(...g); } return out; };
    const inside = (x, z) => { for (const it of near(x, z)) if (Math.hypot(x - it.f.x, z - it.f.z) < it.f.r) return it; return null; };
    for (let f = 0; f < frames; f++) {
      if (f % 45 === 0) { const a = rnd() * Math.PI * 2; dir = { x: Math.sin(a), y: Math.cos(a) }; }
      S.step(1 / 60, f % 400 < 340 ? dir : { x: 0, y: 0 });
      const hp = inside(S.player.x, S.player.z);
      if (hp) { playerFrames++; const k = hp.r.cat + ':' + (hp.r.p.struct || hp.r.p.emoji || hp.r.p.landmark); player[k] = (player[k] || 0) + 1; }
      let any = false;
      for (const a of S.party) { const hq = inside(a.x, a.z); if (hq) { any = true; const k = hq.r.cat + ':' + (hq.r.p.struct || hq.r.p.emoji || hq.r.p.landmark); party[k] = (party[k] || 0) + 1; } maxSpread = Math.max(maxSpread, Math.hypot(a.x - S.player.x, a.z - S.player.z)); }
      if (any) partyFrames++;
      if (S.player.moving && Math.hypot(S.player.x - lastX, S.player.z - lastZ) < 0.05) stuckFrames++;
      lastX = S.player.x; lastZ = S.player.z;
    }
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10);
    res[regionId] = { frames, solids: solids.length, playerInsideFrames: playerFrames, partyInsideFrames: partyFrames, playerStuckFrames: stuckFrames, partyMaxDistance: Math.round(maxSpread), playerTop: top(player), partyTop: top(party) };
  }
  console.log(JSON.stringify(res, null, 1));
}

// 2026-09-30 追加。あるき方に よらない ものさし: かたく 見える 物の 絵の 中心部(footprint)に
// player(半径 22)が 立てるか。中心 + 半径 0.5 の 8 点。道の 面の うえ(road)と そと(off-road)を わけて 数える
function standCore() {
  const res = {};
  for (const regionId of ['forest', 'mountain', 'city']) {
    const { rows, M, w } = audit(regionId);
    const R = 22, out = { objects: 0, centerStandable: 0, samples: 0, samplesStandable: 0, road: { objects: 0, centerStandable: 0 }, offRoad: { objects: 0, centerStandable: 0 }, byCat: {}, topKinds: {} };
    for (const r of rows) {
      if (r.status === 'unreachable' || !PRIORITY.has(r.cat)) continue;
      const f = footprint(w, r.p), road = outward(w, { x: f.x, z: f.z }).edge <= 0;
      const pts = [[f.x, f.z]];
      for (let k = 0; k < 8; k++) pts.push([f.x + Math.cos(k * Math.PI / 4) * f.r * 0.5, f.z + Math.sin(k * Math.PI / 4) * f.r * 0.5]);
      const ok = pts.map(([x, z]) => inWalkable(w, x, z, R) && M.penetrationAt(w, x, z, R) <= 0.5);
      const bucket = road ? out.road : out.offRoad, c = out.byCat[r.cat] || (out.byCat[r.cat] = { objects: 0, centerStandable: 0 });
      out.objects++; bucket.objects++; c.objects++;
      out.samples += pts.length; out.samplesStandable += ok.filter(Boolean).length;
      if (ok[0]) {
        out.centerStandable++; bucket.centerStandable++; c.centerStandable++;
        const k = r.cat + ':' + (r.p.struct || r.p.emoji || r.p.landmark) + (road ? ':road' : ':off-road');
        out.topKinds[k] = (out.topKinds[k] || 0) + 1;
      }
    }
    out.topKinds = Object.entries(out.topKinds).sort((a, b) => b[1] - a[1]).slice(0, 15);
    res[regionId] = out;
  }
  console.log(JSON.stringify(res, null, 1));
}

module.exports = { audit, simulate, footprint, outward, category, visualHalf };
if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'walk') walk();
  else if (mode === 'core') walkCore();
  else if (mode === 'stand') standCore();
  else main();
}
