const path='/home/user/naotocchi/tests/helpers/runtime-harness.cjs';
const {harness} = require(path);
function fakeCtx() {
  const grad = {addColorStop() {}};
  return new Proxy({}, { get(t, k) { if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({width: 0});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
function play(id, {seed = 1, during, maxT=240000} = {}) {
  const h = harness({seed, canvasContext: fakeCtx()});
  const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  let game = h.api.games.find((g) => g.id === id);
  if (!game) return {err:'nogame'};
  let box=null, raw=null, rest=null, counted=null, t=0;
  h.api.startMinigame({id, start(c, done) { box = c;
    return game.start(c, (sc, ...r) => { if (raw !== null) return; raw = sc; rest=r; const n = s.minigameCount; done(sc, ...r); counted = s.minigameCount - n; }); }});
  for (t = 0; raw === null && t < maxT; t += 100) { if (during) during(h, t, box); h.advance(100); }
  return {raw, play: rest && rest[1], counted, t, h, box};
}
module.exports={play,harness};
if (require.main===module){
 const ids=process.argv.slice(2);
 for (const id of ids) for (const seed of [1,2,3]) { const r=play(id,{seed}); console.log(id, seed, 'raw',r.raw,'play',JSON.stringify(r.play),'counted',r.counted,'t',r.t, r.err||''); }
}
