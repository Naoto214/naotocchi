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
function play(id, {seed = 1, before, during, step=100, maxT=400000} = {}) {
  const h = harness({seed, canvasContext: fakeCtx()});
  const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  if (before) before(h, s);
  const game = h.api.games.find((g) => g.id === id);
  let box = null, raw = null, detail=null, counted = null, t=0;
  h.api.startMinigame({id, start(c, done) { box = c;
    return game.start(c, (sc, msg, d) => { if (raw !== null) return; raw = sc; detail=d; const n = s.minigameCount; done(sc, msg, d); counted = s.minigameCount - n; }); }});
  for (t = 0; raw === null && t < maxT; t += step) { if (during) during(h, t, box); h.advance(step); }
  return {h, s, raw, detail, counted, t};
}
module.exports={play, harness, fakeCtx};
