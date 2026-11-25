const {harness} = require(process.cwd() + '/tests/helpers/runtime-harness.cjs');
function fakeCtx() {
  const grad = {addColorStop() {}};
  return new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad; if (k === 'measureText') return () => ({width: 0}); if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)}); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
}
function play(id, {seed = 1, during, maxT = 240000} = {}) {
  const h = harness({seed, canvasContext: fakeCtx()});
  const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  const game = h.api.games.find((g) => g.id === id) || (h.api.allGames && h.api.allGames.find((g)=>g.id===id));
  if (!game) return {err: 'no game ' + id};
  let box = null, raw = null, counted = null, detail = null;
  h.api.startMinigame({id, start(c, done) { box = c; c.__id = id; return game.start(c, (sc, m, d) => { if (raw !== null) return; raw = sc; detail = d; const n = s.minigameCount; done(sc, m, d); counted = s.minigameCount - n; }); }});
  let t = 0;
  for (; raw === null && t < maxT; t += 100) { if (during) during(h, t, box); h.advance(100); }
  for (let k = 0; k < 20 && counted === null; k++) h.advance(100);
  return {raw, counted, detail: detail && JSON.stringify(detail), t, msg: raw === null ? 'not ended' : ''};
}
const CAN = {'reversi-6':'#rvCanvas','connect-four':'#c4Canvas','bubble-shooter':'#bsCanvas','ring-flight-3d':'#rfCanvas','submarine-3d':'#smCanvas','air-hockey':'#ahCanvas','minesweeper-8':'#msCanvas','push-puzzle':'#pzCanvas'};
const ids = process.argv[2] ? process.argv[2].split(',') : ['jump-quest','push-puzzle','reversi-6','billiards-6','animal-shogi','minesweeper-8','snake-classic','baseball-batting','ring-flight-3d','bubble-shooter','catapult-castle','connect-four','puzzle-2048','frogger-road','ski-jump','air-hockey','submarine-3d'];
const LASTT = +(process.env.LASTT||0);
const mode = process.argv[3] || 'idle';
const drag = (h, box, x0, y0, x1, y1) => { const n = box.querySelector(CAN[box.__id] || 'canvas'); h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: x0, clientY: y0, button: 0}); h.dispatch(n, 'pointermove', {pointerId: 1, clientX: x1, clientY: y1}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: x1, clientY: y1}); };
for (const id of ids) {
  const out = [];
  for (const seed of [1,2,3,4,5]) {
    let during;
    if (mode === 'onemove') during = (h, t, box) => { if (t === 2000) { const n = box.querySelector('#pzCanvas'); h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: 100, clientY: 100}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: 160, clientY: 100}); } };
    if (mode === 'spam') during = (h, t, box) => { if (t % 800 === 0 && t > 0) { const n = box.querySelector('#bsCanvas'); const x = 20 + Math.floor(((t*7919)%260)); h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: x, clientY: 50}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: x, clientY: 50}); } };
    if (mode === 'slow') during = (h, t, box) => { if (t === 1000 || t === 29000 || t === 57000 || t === LASTT) { const n = box.querySelector(CAN[box.__id]); for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { h.dispatch(n, 'pointerdown', {pointerId: 1, clientX: x*50+25, clientY: y*50+25}); h.dispatch(n, 'pointerup', {pointerId: 1, clientX: x*50+25, clientY: y*50+25}); } } };
    if (mode === 'wiggle') during = (h, t, box) => { if (t % 3000 === 1000) drag(h, box, 20, 400, 30 + (t/3000%2)*10, 400); };
    out.push(play(id, {seed, during, maxT: id === 'ski-jump' ? 60000 : 240000}));
  }
  console.log(id, mode, JSON.stringify(out.map(o => o.err || `${o.raw}/${o.counted}${o.msg?'('+o.msg+')':''} ${o.detail||''}`)));
}
