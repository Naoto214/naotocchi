// めぐる 3D 静的 geometry 監査(2026-10-02・Geometry pass の 続き・Human QA を またない 範囲)
//   node tools/meguru-3d-qa/geometry-audit.cjs [region,...] [--json out.json]
//   - 接地: 物の parts は 物の 中心の 地形の 高さに すわる。parts ごとの 足もとの 地形 と の 差(+ = 浮き、− = 埋まり)
//   - Building v4: シルエット(からだ + 屋根の 高さ / いちばん ひろい はば)・屋根 / 土台 / 入口
//   - 小川 / 川 / 池 / 橋: 交わりごとに 橋 か 飛び石、橋の 床 > 水面、ながさ ≥ 水の はば、池の 円盤が ながれの 上に ない
//   - 予算: shape ごとの instance 数 × 三角形(geometry の 三角形は meguru-3d.mjs の GEO から)
//   - 小物: dressing / props の 種類(A 立体 / B 記号 / C 出さない の 対応表 に ない 物を 出す)
// 2D の あたり / 道 / spot / save は 読む だけ
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.find((a) => !a.startsWith('--') && a !== jsonOut);

const FLOAT_TOL = 4, BURY_TOL = 8;

// 1 地域の 監査(tests/meguru-3d-geometry-audit-test.cjs と CLI で おなじ もの)。M = meguru の module、m3 = meguru-3d.mjs
function auditRegion(M, m3, reg, rid) {
    const world = M.buildWorld(rid, reg, { world3d: true });
    const objects = M.worldObjects3d(world).objects;
    const tg = m3.terrainGrid(world, M, objects);
    const R = { objects: objects.length, ground: { parts: 0, float: 0, bury: 0, worst: [] }, buildings: [], crossings: [], ponds: [], shapes: {}, kinds: {} };
    for (const ob of objects) {
      R.kinds[ob.type] = (R.kinds[ob.type] || 0) + 1;
      const isWaterLevel = ob.type === 'bridge' || ob.type === 'ford';
      const gr = m3.objectGround(tg, ob);   // renderer と おなじ 接地
      for (const pt of ob.parts || []) {
        R.shapes[pt.shape] = (R.shapes[pt.shape] || 0) + 1;
        if (isWaterLevel || !m3.GROUND_SHAPES.has(pt.shape) || (pt.y || 0) > 2) continue;
        const oy = gr.part ? gr.part(pt) : gr.base;
        // 足もとの 範囲(半径)の 4 すみ と 中心
        const px = ob.x + (pt.dx || 0), pz = ob.z + (pt.dz || 0);
        const rr = m3.partFootprint(pt);
        const samples = [[0, 0]].concat(rr > 12 ? [[rr, 0], [-rr, 0], [0, rr], [0, -rr]] : []);
        let lo = Infinity, hi = -Infinity;
        for (const [sx, sz] of samples) { const s = tg.surfaceY(px + sx, pz + sz); lo = Math.min(lo, s); hi = Math.max(hi, s); }
        R.ground.parts++;
        const fl = oy - lo, bu = hi - oy;   // fl: いちばん ひくい 地面 から 浮く、bu: いちばん 高い 地面に 埋まる
        const thick = pt.h || (pt.r ? pt.r * 2 : 10);
        if (fl > FLOAT_TOL) R.ground.float++;
        if (bu > Math.max(BURY_TOL, thick * 0.7)) R.ground.bury++;
        const bad = Math.max(fl - FLOAT_TOL, bu - Math.max(BURY_TOL, thick * 0.7));
        if (bad > 0) R.ground.worst.push({ id: ob.id, type: ob.type, shape: pt.shape, float: +fl.toFixed(1), bury: +bu.toFixed(1), x: Math.round(px), z: Math.round(pz) });
      }
      if (ob.type === 'house' && ob.parts) {
        let body = 0, top = 0, wide = 0, roof = false, foundation = false, door = false;
        for (const pt of ob.parts) {
          const y = pt.y || 0, hh = pt.h || 0;
          if (pt.shape === 'box') { body = Math.max(body, y + hh); wide = Math.max(wide, 2 * Math.max(pt.rx || 0, pt.rz || 0)); if (y < 2 && hh < 14) foundation = true; if (/door|入口/.test(pt.role || '') || (pt.color && /#(5|6|7)[0-9a-f]{2}3/.test(pt.color) && hh > 30 && (pt.rx || 0) < 20)) door = true; }
          if (pt.shape === 'board') wide = Math.max(wide, pt.w || 0);   // 屋上の ひろい 看板(AD-7 と おなじ)
          if (pt.shape === 'roof' || pt.shape === 'gable' || pt.shape === 'dome') { roof = true; top = Math.max(top, y + hh); wide = Math.max(wide, 2 * Math.max(pt.r || 0, pt.rx || 0, pt.rz || 0)); }
        }
        const sil = Math.max(body, top) / Math.max(1, wide);
        R.buildings.push({ id: ob.id, family: ob.family || ob.parts.family || null, sil: +sil.toFixed(2), body: Math.round(body), top: Math.round(Math.max(body, top)), wide: Math.round(wide), roof, foundation, landmark: !!ob.landmark || /tower|lighthouse/.test(ob.id) });
      }
    }
    R.ground.worst.sort((a, b) => Math.max(b.float, b.bury) - Math.max(a.float, a.bury));
    R.ground.worstByType = {};
    for (const w of R.ground.worst) { const k = w.type + ':' + w.shape; R.ground.worstByType[k] = (R.ground.worstByType[k] || 0) + 1; }
    R.ground.worst = R.ground.worst.slice(0, 12);
    // 小川 / 川 の 交わり
    for (const s of tg.streams) for (const c of s.crossings) {
      const wy = m3.STREAM_WATER_Y[s.kind === 'river' ? 'river' : s.kind === 'ditch' ? 'ditch' : 'creek'];
      const near = objects.filter((o) => (o.type === 'bridge' || o.type === 'ford') && Math.hypot(o.x - c.x, o.z - c.z) < Math.max(160, c.w * 2));
      const br = near.find((o) => o.type === 'bridge'), fo = near.find((o) => o.type === 'ford');
      let deckTop = null, span = null;   // 形の 原点は 下面(log = y〜y + 2r・plank 8・slab 10)
      if (br) { for (const pt of br.parts) if (pt.shape === 'slab' || pt.shape === 'plank' || pt.shape === 'wslab' || pt.shape === 'log') { deckTop = Math.max(deckTop ?? -Infinity, (pt.y || 0) + (pt.shape === 'log' ? 2 * (pt.r || 0) : pt.shape === 'plank' ? 8 : pt.shape === 'slab' ? 10 : (pt.h || 8))); span = Math.max(span ?? 0, pt.len || 0); } }
      const sinA = Math.max(0.45, Math.abs(Math.sin(c.pathAng - c.streamAng)));
      const needSpan = 2 * c.w / sinA;
      R.crossings.push({ stream: s.id, kind: c.kind, has: br ? 'bridge' : fo ? 'ford' : 'none', water: wy, deckTop: deckTop == null ? null : +deckTop.toFixed(1), span: span == null ? null : Math.round(span), needSpan: Math.round(needSpan), ok: c.kind === 'bridge' ? !!br && deckTop != null && deckTop - wy >= (s.kind === 'ditch' ? 8 : 12) && span >= needSpan * 0.95 : !!(fo || br) });
    }
    // 池の 円盤が ながれの 上に ない か
    for (const ob of objects) for (const pt of ob.parts || []) if (pt.shape === 'pool') {
      const px = ob.x + (pt.dx || 0), pz = ob.z + (pt.dz || 0), sd = tg.sDist(px, pz);
      if (sd.d < sd.w) R.ponds.push({ id: ob.id, type: ob.type, d: Math.round(sd.d), w: Math.round(sd.w) });
    }
    return R;
}
module.exports = { auditRegion, FLOAT_TOL, BURY_TOL };
if (require.main !== module) return;

(async () => {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod, st = h.api.state();
  Object.assign(st, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'home' });
  h.api.render();
  const reg = M.buildRegistry();
  const m3 = await import(path.join(ROOT, 'meguru-3d.mjs'));
  const regions = only ? only.split(',') : Object.keys(M.REGION3D);
  const report = {};
  for (const rid of regions) {
    const R = report[rid] = auditRegion(M, m3, reg, rid);
    const nb = R.buildings.filter((b) => !b.landmark), tall = nb.filter((b) => b.sil > 1.6);
    const badX = R.crossings.filter((c) => !c.ok);
    console.log(`${rid.padEnd(12)} obj ${String(R.objects).padStart(5)}  ground ${R.ground.parts} float ${R.ground.float} bury ${R.ground.bury}  houses ${nb.length} sil>1.6 ${tall.length} max ${nb.length ? Math.max(...nb.map((b) => b.sil)) : '-'}  crossings ${R.crossings.length} bad ${badX.length}  pond-on-stream ${R.ponds.length}`);
    if (Object.keys(R.ground.worstByType).length) console.log('   worst by type', JSON.stringify(R.ground.worstByType));
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
