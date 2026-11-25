const {harness} = require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
function fakeCtx() { const grad = {addColorStop() {}}; return new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad; if (k === 'measureText') return () => ({width: 0}); if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)}); return () => {}; }, set(t, k, v) { t[k] = v; return true; } }); }
function play(id, {seed = 1, during, maxT = 240000} = {}) {
  const h = harness({seed, canvasContext: fakeCtx()});
  const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
  const game = h.api.games.find((g) => g.id === id);
  let box = null, raw = null, counted = null, t = 0;
  h.api.startMinigame({id, start(c, done) { box = c; return game.start(c, (sc, ...rest) => { if (raw !== null) return; raw = sc; const n = s.minigameCount; done(sc, ...rest); counted = s.minigameCount - n; }); }});
  for (t = 0; raw === null && t < maxT; t += 50) { if (during) during(h, t, box); h.advance(50); }
  return {raw, counted, t};
}
const ptr = (h, n, type, x, y, id = 1) => h.dispatch(n, type, {pointerId: id, clientX: x, clientY: y, button: 0});
let CV='';const cv = (box) => box.querySelector(CV);
const btn = (box, sel) => box.querySelector(sel);
const mode = process.argv[2];
const out = {};
const seeds = [1,2,3,4,5,6,7,8];
function many(id, opts) { return seeds.map((seed) => { const r = play(id, {seed, ...opts}); return `${r.raw}${r.counted ? '' : '(未記録)'}@${(r.t/1000).toFixed(0)}s`; }).join(' '); }
if (mode === 'idle') for (const id of ['match-3','gomoku-9','tank-battle','tennis-rally','picross-5','hang-glider-3d','bomber-maze','pipe-connect','fruit-slice']) out[id] = many(id);
if (mode === 'idle2') for (const id of ['darts-board','blackjack-21','track-field']) out[id] = many(id, {maxT: 120000});
if (mode === 'darts') { CV='#dtCanvas'; out.center = many('darts-board', {during: (h, t, box) => { if (t % 2000 === 500) { const c = cv(box); ptr(h, c, 'pointerdown', 150, 0.47*315); } if (t % 2000 === 550) ptr(h, cv(box), 'pointerup', 150, 0.47*315); }});
  out.t20 = many('darts-board', {during: (h, t, box) => { const y = 0.47*315 - 0.6*0.42*300; if (t % 2000 === 500) ptr(h, cv(box), 'pointerdown', 150, y); if (t % 2000 === 550) ptr(h, cv(box), 'pointerup', 150, y); }}); }
if (mode === 'bj') { const hit = (box, sel, h) => { const b = btn(box, sel); if (b && !b.disabled) h.dispatch(b, 'pointerdown', {pointerId: 1}); };
  const res = []; for (let seed = 1; seed <= 200; seed++) { const r = play('blackjack-21', {seed, maxT: 120000, during: (h, t, box) => { if (t % 500 === 0) { hit(box, '#bjStand', h); hit(box, '#bjNext', h); } }}); res.push(r.raw); }
  const hist = {}; for (const v of res) hist[v] = (hist[v]||0)+1; out.alwaysStand = hist; out.lt30 = res.filter(v=>v<30).length/res.length; out.ge70 = res.filter(v=>v>=70).length/res.length; out.mean = res.reduce((a,b)=>a+b,0)/res.length; }
if (mode === 'track') { out.mashNoJump = many('track-field', {during: (h, t, box) => { if (t % 200 === 0) h.dispatch(btn(box, t % 400 ? '#tfL' : '#tfR'), 'pointerdown', {pointerId: 1}); }}); }
if (mode === 'fruit') { CV='#fsCanvas'; out.zigzagHold = many('fruit-slice', {during: (h, t, box) => { const c = cv(box); if (t === 0) ptr(h, c, 'pointerdown', 10, 100); else { const ph = (t / 50) % 20; ptr(h, c, 'pointermove', 10 + (ph < 10 ? ph : 20 - ph) * 28, 60 + ((t / 50) % 7) * 40); } }});
  out.tapOnce = many('fruit-slice', {during: (h, t, box) => { if (t === 2000) { ptr(h, cv(box), 'pointerdown', 10, 10); ptr(h, cv(box), 'pointerup', 10, 10); } }}); }
if (mode === 'glider') { CV='#hgCanvas'; out.holdPitchUp = many('hang-glider-3d', {during: (h, t, box) => { const c = cv(box); if (t === 1000) ptr(h, c, 'pointerdown', 150, 150); if (t > 1000 && t % 500 === 0) ptr(h, c, 'pointermove', 150 + (t % 1000 ? 1 : -1), 0); }});
  out.wiggle = many('hang-glider-3d', {during: (h, t, box) => { const c = cv(box); if (t === 1000) ptr(h, c, 'pointerdown', 150, 150); if (t > 1000 && t % 500 === 0) ptr(h, c, 'pointermove', 150 + (t % 1000 ? 3 : -3), 150); }}); }
if (mode === 'gomoku') { CV='#gmCanvas';
  // place stones quickly in a row from corner; count raw for decisive loss
  out.fastRandom = many('gomoku-9', {during: (h, t, box) => { if (t % 1500 === 0) { const c = cv(box); const k = (t / 1500) % 81; const x = (k % 9) * 33 + 16, y = Math.floor(k / 9) * 33 + 16; ptr(h, c, 'pointerdown', x, y); ptr(h, c, 'pointerdown', x, y); } }});
  out.stall25s = many('gomoku-9', {during: (h, t, box) => { if (t % 25000 === 1000) { const c = cv(box); for (let k = 0; k < 81; k++) { const x = (k % 9) * 33 + 16, y = Math.floor(k / 9) * 33 + 16; ptr(h, c, 'pointerdown', x, y); ptr(h, c, 'pointerdown', x, y); if (box.querySelector('#gmTurn').textContent.includes('相手')) break; } } }});
}
if (mode === 'tennis') { out.swingSpam = many('tennis-rally', {during: (h, t, box) => { if (t % 100 === 0) h.dispatch(btn(box, '#tnSwing'), 'pointerdown', {pointerId: 1}); }}); }
if (mode === 'match') { CV='#m3Canvas'; out.random = many('match-3', {during: (h, t, box) => { if (t % 700 === 0) { const c = cv(box); const x = Math.floor(Math.random()*7)*300/7+20, y = Math.floor(Math.random()*7)*300/7+20; ptr(h, c, 'pointerdown', x, y); ptr(h, c, 'pointermove', x + 30, y); ptr(h,c,'pointerup',x+30,y);} }}); }
console.log(JSON.stringify(out, null, 1));
if (mode === 'tennis2') { for (const seed of [1,2,3]) { let el; const r = play('tennis-rally', {seed, during: (h, t, box) => { el = box.querySelector('#tnScore'); if (t % 100 === 0) h.dispatch(btn(box, '#tnSwing'), 'pointerdown', {pointerId: 1}); }}); console.log(seed, r.raw, el.textContent); } }
if (mode === 'tennisMove') { for (const seed of [1,2,3,4]) { let el; const r = play('tennis-rally', {seed, during: (h, t, box) => { el = box.querySelector('#tnScore'); if (t % 100 === 0) { h.dispatch(box.querySelector('#tnCanvas'), 'pointerdown', {pointerId: 1, clientX: 50, clientY: 50}); } }}); console.log(seed, r.raw, el.textContent); } }
if (mode === 'tennis3') { for (const per of [300, 500, 1000]) for (const seed of [1,2]) { let el, hint=[]; const r = play('tennis-rally', {seed, during: (h, t, box) => { el = box.querySelector('#tnScore'); const ht = box.querySelector('#tnHint').textContent; if (hint[hint.length-1] !== ht) hint.push(ht); if (t % per === 0) h.dispatch(btn(box, '#tnSwing'), 'pointerdown', {pointerId: 1}); }}); console.log(per, seed, r.raw, el.textContent, hint.slice(0,12).join(' | ').slice(0,400)); } }
