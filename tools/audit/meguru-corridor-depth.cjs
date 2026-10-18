process.chdir(require('path').resolve(__dirname, '../..'));
const { harness } = require('../../tests/helpers/runtime-harness.cjs');
const h = harness({ deterministic: true, fullDisplay: true });
const M = h.api.meguruMod;
let worstP = 0, worstA = 0, deepP = 0, deepA = 0, fr = 0, partyFrames = 0;
for (const spec of Array.from(M.walkCorridorSpecs())) for (const from of spec.connectionId.split('|')) {
  const walk = M.createCorridorWalk(spec, from, { party: Array.from({ length: 8 }, (_, i) => ({ key: 'p' + i, x: 0, z: 0 })) });
  const blk = walk.world.props.filter((p) => p.blocker);
  for (let f = 0; f < 60 * 40 && walk.state.s < spec.walkLength - 50; f++) {
    walk.step(1 / 60, { x: (Math.sin(f / 50) > 0 ? 1 : -1) * 0.9, y: -1 }); fr++;
    for (const b of blk) { const pen = 24 + 22 - Math.hypot(walk.player.x - b.x, walk.player.z - b.z); if (pen > 0) { worstP = Math.max(worstP, pen); if (pen > 11) deepP++; } }
    let any = false;
    for (const a of walk.party) for (const b of blk) { const pen = 24 + 17.6 - Math.hypot(a.x - b.x, a.z - b.z); if (pen > 0) { worstA = Math.max(worstA, pen); if (pen > 20) { deepA++; any = true; } } }
    if (any) partyFrames++;
  }
}
console.log(JSON.stringify({ frames: fr, playerWorstPen: Math.round(worstP), playerDeepFrames: deepP, partyWorstPen: Math.round(worstA), partyDeepHits: deepA, partyDeepFrames: partyFrames }));
