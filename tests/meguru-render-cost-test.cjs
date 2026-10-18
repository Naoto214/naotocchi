// RH-7: めぐるの 1 frame の 描画の 重さ(forest / mountain の 着いた ときと city 系の ふだんの frame)。
// 見た目は 1 つも 減らさない。
//  1) 描画の よびだしは なまの ctx へ(Proxy の トラップを とおらない)。絵文字を イラストに かえる fillText / strokeText だけ
//     つつんだ ctx(o.ctx)を とおる。どちらも おなじ canvas なので 描かれる ものは 同じ
//  2) 地面の もよう(sampleGroundDetails)は マスごとに 決定的なので world と マスごとに おぼえる(中身は 同じ)
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function setup(regionId) {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod;
  h.api.state().regionId = regionId;
  const S = M.createSimulation({ regionId, env: { time: 'day', weather: 'sunny', season: 'spring', region: regionId } });
  for (let i = 0; i < 30; i++) S.step(1 / 60, { x: 0, y: -1 });
  return { M, S };
}
// なまの ctx(よびだしを 記録する)と、それを つつむ ctx(トラップの 回数と、とおった メソッドを 記録する)
function contexts() {
  const log = [];
  const grad = { addColorStop() {} };
  const raw = new Proxy({ canvas: { width: 338, height: 533 }, globalAlpha: 1, font: '10px sans-serif' }, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return (...a) => { log.push(k); return k.startsWith('create') ? grad : undefined; };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  const viaWrapper = [];
  let traps = 0;
  const wrapped = new Proxy(raw, {
    get(target, k) { traps++; const v = Reflect.get(target, k, target); if (typeof v === 'function') { viaWrapper.push(k); return v.bind(target); } return v; },
    set(target, k, v) { traps++; return Reflect.set(target, k, v, target); },
  });
  return { raw, wrapped, log, viaWrapper, traps: () => traps };
}

for (const regionId of ['forest', 'mountain', 'city']) {
  test(`${regionId}: drawing goes to the raw context; only text (emoji → illustration) goes through the wrapped context`, () => {
    const { M, S } = setup(regionId);
    const c = contexts();
    const r = M.createCanvasRenderer({ canvas: {}, ctx: c.wrapped, rawCtx: c.raw, W: 338, H: 533, tier: 0 });
    r.draw(S.view(), 1000);
    assert.ok(c.log.length > 1000, `${regionId}: a real frame (${c.log.length} ops)`);
    const nonText = [...new Set(c.viaWrapper)].filter((k) => k !== 'fillText' && k !== 'strokeText');
    assert.deepEqual(nonText, [], 'no drawing call goes through the wrapped context');
    // 文字は つつんだ ctx(キャラ・しるしの 絵文字 → イラスト)か、いままでどおり なまの ctx(けしきの ふつうの 絵文字)
    assert.ok(c.viaWrapper.length > 0, 'text still reaches the wrapped context');
    assert.ok(c.traps() < c.log.length / 10, `wrapper traps ${c.traps()} ≪ ops ${c.log.length}`);
  });
}

test('ground details: the per-cell memo returns exactly what a fresh world computes, across many queries and all regions', () => {
  const { M } = setup('home');
  const reg = M.buildRegistry();
  for (const regionId of Object.keys(M.WORLDS)) {
    const warm = M.buildWorld(regionId, reg, {});
    for (let i = 0; i < 40; i++) M.sampleGroundDetails(warm, (i * 7919 % 4000) - 2000, i * 211 % 9000, 930, []);
    for (let i = 0; i < 20; i++) {
      const x = (i * 104729 % 3000) - 1500, z = (i * 7919 % 8000) + 100, rad = 700 + (i % 4) * 200;
      const fresh = M.buildWorld(regionId, reg, {});
      assert.equal(JSON.stringify(M.sampleGroundDetails(warm, x, z, rad, [])), JSON.stringify(M.sampleGroundDetails(fresh, x, z, rad, [])), `${regionId} #${i}`);
    }
  }
});
