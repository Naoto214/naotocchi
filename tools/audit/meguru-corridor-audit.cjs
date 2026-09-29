process.chdir(require('path').resolve(__dirname, '../..'));
const { harness } = require('../../tests/helpers/runtime-harness.cjs');
const h = harness({ deterministic: true, fullDisplay: true });
const M = h.api.meguruMod, s = h.api.state();
const arr = (x) => Array.from(x || []);
const specs = arr(M.walkCorridorSpecs());
const res = [];
for (const spec of specs) {
  for (const from of spec.connectionId.split('|')) {
    const walk = M.createCorridorWalk(spec, from, { party: Array.from({ length: 8 }, (_, i) => ({ key: 'p' + i, x: 0, z: 0 })) });
    const w = walk.world;
    const st = spec.stages;
    const halfW = st.map((x) => x.halfWidth), uMax = st.map((x) => x.uMax);
    // near の deco の u(帯の まんなか からの よこ)と 帯の はば
    const deco = w.props.filter((p) => p.layer === 'side' && !p.blocker);
    let reachable = 0;
    // chart の (s,u) へ もどせない ので、プレイヤーを 帯の はしまで あるかせて、deco の 見た目の 半径の なかに 入るかを しらべる
    const blk = w.props.filter((p) => p.blocker);
    // 左右に ふりながら 前に すすむ
    let partyInBlocker = 0, playerInBlocker = 0, playerInDeco = 0, frames = 0;
    const decoSolid = deco.filter((p) => /bigtrunk|parktree|pinewall|mistwood|bluetree|riverwood|stump|bigrock|cliff|building|house|barn|ledgerock|hedge|fence|log|rock|palmgrove/.test(p.struct || '') || /[🌳🌲🌴🪨🏠🏢]/u.test(p.emoji || ''));
    for (let f = 0; f < 60 * 40 && walk.state.s < spec.walkLength - 50; f++) {
      const side = Math.sin(f / 50) > 0 ? 1 : -1;
      walk.step(1 / 60, { x: side * 0.9, y: -1 });
      frames++;
      const P = walk.player;
      for (const b of blk) if (Math.hypot(P.x - b.x, P.z - b.z) < 24 + 22 - 1) playerInBlocker++;
      for (const a of walk.party) for (const b of blk) if (Math.hypot(a.x - b.x, a.z - b.z) < 24 + 17) partyInBlocker++;
      for (const d of decoSolid) { const vr = d.size * 0.3; if (Math.hypot(P.x - d.x, P.z - d.z) < vr) { playerInDeco++; break; } }
    }
    res.push({ id: spec.connectionId, from, stages: st.length, halfW: halfW.map(Math.round), uMax: uMax.map(Math.round), deco: deco.length, decoSolidLooking: decoSolid.length, blockers: blk.length, frames, playerInBlocker, partyInBlocker, playerInDecoFrames: playerInDeco });
  }
}
console.log(JSON.stringify(res, null, 0).replace(/\},\{/g, '},\n{'));
