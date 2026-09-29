// Phase 4D 設計監査の 実測を 再現する 道具(よむ だけ。ゲームの コードは かえない)
//
//   node tools/meguru-phase4d-distant-survey.cjs
//
// 出すもの
//   1. 地域ごとの 出口の 向き(local)と、出口の さき 4000 の 点を 地域の spot から 見た 方角の ばらつき
//   2. 2 手先の 地域の 方角: 「さいしょの 出口の 向き」と「REGION_FRAME の 原点どうし」の くいちがい
//   3. 見えかたの ルールで しぼった DistantFeature 候補の かず
// docs/design/meguru-phase4d-distant-world-streaming-renderer-2026-09-23.md の 表は ここから 出して いる
const { harness } = require('../tests/helpers/runtime-harness.cjs');

const M = harness({ fullDisplay: true }).api.meguruMod;
const reg = M.buildRegistry();
const ids = Array.from(M.FRAMED_REGIONS);
const deg = (v) => ((Math.atan2(v.x, v.z) * 180 / Math.PI) + 360) % 360;
const ang = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const FOV = 2 * Math.atan(0.5 / 0.95) * 180 / Math.PI;   // renderer の F = 0.95 W から
const localOf = (from, o) => {
  if (o.leave) return deg(M.dirToLocal(from, o.leave));
  if (o.heading != null) { const t = o.heading * Math.PI / 180; return deg(M.dirToLocal(from, { x: Math.sin(t), z: Math.cos(t) })); }
  return null;
};

console.log(`# 1. 出口の 向き(水平 FOV ${FOV.toFixed(1)}°)`);
for (const id of ids) {
  const w = M.buildWorld(id, reg);
  const gates = Array.from(M.regionGates(id, w));
  const parts = [];
  const dirs = [];
  for (const o of Array.from(M.corridorsFrom(id))) {
    const b = localOf(id, o);
    if (b == null) { parts.push(`${o.to}:${o.way}`); continue; }
    dirs.push(b);
    const g = gates.find((x) => x.id === o.id);
    const t = b * Math.PI / 180, ax = g.spot.x + Math.sin(t) * 4000, az = g.spot.z + Math.cos(t) * 4000;
    const spread = Math.max(...w.spots.map((s) => ang(deg({ x: ax - s.x, z: az - s.z }), b)));
    parts.push(`${o.to}@${Math.round(b)}° ばらつき${Math.round(spread)}°`);
  }
  let inView = 0;
  for (let y = 0; y < 360; y += 5) inView = Math.max(inView, dirs.filter((d) => ang(d, y) <= FOV / 2).length);
  console.log(`${id.padEnd(11)} ${Math.round(w.maxX - w.minX)}x${Math.round(w.len)}  視野内さいだい ${inView}  ${parts.join(' / ')}`);
}

console.log('\n# 2. 2 手いない の 地域の 方角: 出口の 向き vs REGION_FRAME 原点');
const diffs = [];
for (const a of ids) for (const b of ids) {
  if (a === b) continue;
  const r = M.findRegionRoute(a, b);
  if (!r || r.legs.length > 2) continue;
  const first = localOf(a, Array.from(r.legs)[0]);
  const fa = M.regionFrame(a), fb = M.regionFrame(b);
  if (first == null || fb.y !== fa.y) continue;
  diffs.push(ang(first, deg(M.dirToLocal(a, { x: fb.x - fa.x, z: fb.z - fa.z }))));
}
diffs.sort((x, y) => x - y);
console.log(`地上の くみ ${diffs.length}  中央値 ${Math.round(diffs[diffs.length >> 1])}°  さいだい ${Math.round(diffs[diffs.length - 1])}°  45°こえ ${diffs.filter((d) => d > 45).length}  90°こえ ${diffs.filter((d) => d > 90).length}`);

console.log('\n# 3. 見えかたの ルールで しぼった 候補');
const SIL = {};
for (const id of ids) SIL[id] = M.buildWorld(id, reg).backdrop;
const TALL = new Set(['peaks', 'snowpeaks', 'neonskyline', 'mesas']);
let total = 0;
for (const id of ids) {
  const cors = Array.from(M.corridorsFrom(id));
  const out = [];
  for (const o of cors) {
    const b = localOf(id, o);
    if (o.kind === 'walk') out.push(`${o.to}:mid/${SIL[o.to]}@${Math.round(b)}`);
    else if (o.kind === 'sea') out.push(`${o.to}:far/island@${Math.round(b)}`);
    else out.push(`${o.to}:vertical/${o.vertical}`);
  }
  for (const t of ids) {
    if (t === id || cors.some((c) => c.to === t)) continue;
    const r = M.findRegionRoute(id, t, { special: false });
    if (!r || r.legs.length !== 2 || !TALL.has(SIL[t])) continue;
    out.push(`${t}:far/${SIL[t]}@${Math.round(localOf(id, Array.from(r.legs)[0]))}`);
  }
  total += out.length;
  console.log(`${id.padEnd(11)} ${out.length}  ${out.join(' ')}`);
}
console.log(`ぜんぶで ${total}`);
