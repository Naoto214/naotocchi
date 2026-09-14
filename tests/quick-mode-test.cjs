const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// いまの ゲームを「せいかい」の そうさで とく(ゲームの target() が かえす 手がかりを つかう)
function solve(h, run, cur) {
  const g = cur.game; const t = g.target ? g.target() : null;
  if (!t) return;
  // はんてい(○/×)が 出たら そこで やめる(つぎの ゲームまで すすめない)
  const judged = () => run.current !== cur || !h.get('minigameOverlay').querySelector('#qkFlash').classList.contains('hidden');
  if (t.kind === 'tap') {
    for (let i = 0; i < 400 && !judged(); i++) {
      const k = g.target(); if (k.ready === false) { h.advance(16); continue; }
      g.onTap(k.x, k.y);
      if (!k.repeat && k.ready == null) return; // 1かいの タップで きまる ゲーム
      h.advance(16);
    }
    return;
  }
  if (t.kind === 'swipe') { g.onSwipe(t.dir); return; }
  if (t.kind === 'drag') {
    for (let pass = 0; pass < 16 && !judged(); pass++) {
      const k = g.target(); if (!k) return;
      if (g.onPress) g.onPress(k.x, k.y);
      let x = k.x, y = k.y; const steps = 6;
      for (let i = 1; i <= steps; i++) { const nx = k.x + (k.to.x - k.x) * i / steps, ny = k.y + (k.to.y - k.y) * i / steps; g.onDrag(nx, ny, nx - x, ny - y); x = nx; y = ny; }
      if (g.onRelease) g.onRelease(x, y);
      h.advance(16);
    }
    return;
  }
  if (t.kind === 'hold') { g.onPress(t.x, t.y); for (let i = 0; i < 400 && !judged(); i++) { h.advance(16); if (g.target().release) break; } g.onRelease(t.x, t.y); return; }
  if (t.kind === 'follow') { for (let i = 0; i < 400 && !judged(); i++) { const k = g.target(); if (!k) break; g.onPress(k.x, k.y); h.advance(16); } return; }
}

function begin() {
  const h = harness(), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0 });
  h.api.render(); // the play button is enabled by render()
  assert.equal(h.api.startQuickRun(), true, 'quick run starts like a normal game');
  h.advance(40);
  const run = h.api.QUICK_RUN._run;
  assert.ok(run && run.current, 'the first game begins on the first frame');
  return { h, s, run };
}

test('quick mode chains 3-6 second games: cue, immediate play, judge, next game within the result flash', () => {
  const { h, s, run } = begin();
  const R = h.api.QUICK_RULES;
  const ov = h.get('minigameOverlay');
  assert.equal(ov.querySelector('#qkLives').textContent, '❤️❤️❤️');
  assert.equal(ov.querySelector('#qkCount').textContent, `✔ 0／${R.TOTAL}`);
  const first = run.current;
  assert.ok(first.cue.length >= 2 && first.cue.length <= 9, `cue is a short instruction: ${first.cue}`);
  assert.ok(first.limit >= 2500 && first.limit <= 6000, `a game lasts a few seconds: ${first.limit}`);
  assert.equal(ov.querySelector('#qkCue').classList.contains('hidden'), false, 'the instruction is shown at once');
  // とく → すぐ ○ が 出て、RESULT_MS のあと つぎの ゲーム
  solve(h, run, first);
  h.advance(16);
  assert.equal(ov.querySelector('#qkCount').textContent, `✔ 1／${R.TOTAL}`, `solving ${first.def.id} counts`);
  assert.equal(ov.querySelector('#qkFlash').classList.contains('hidden'), false, 'result flash shows');
  h.advance(R.RESULT_MS + 40);
  assert.notEqual(run.current, first, 'the next game starts right after the flash');
  assert.notEqual(run.current.def.id, first.def.id, 'no immediate repeat');
  assert.equal(ov.querySelector('#qkFlash').classList.contains('hidden'), true);
});

test('every quick game can be solved from its own target hint and each kind of input is covered', () => {
  const { h, run } = begin();
  const seen = new Map(); const kinds = new Set();
  const R = h.api.QUICK_RULES;
  for (let i = 0; i < 60 && run.current; i++) {
    const cur = run.current; if (!cur) break;
    const t = cur.game.target && cur.game.target(); if (t) kinds.add(t.kind);
    const before = h.get('minigameOverlay').querySelector('#qkCount').textContent;
    solve(h, run, cur); h.advance(16);
    const after = h.get('minigameOverlay').querySelector('#qkCount').textContent;
    seen.set(cur.def.id, (seen.get(cur.def.id) || 0) + (after !== before ? 1 : 0));
    if (after === before && !cur.def.survive) assert.fail(`${cur.def.id} (Lv${cur.level}) could not be solved from its target hint`);
    h.advance(R.RESULT_MS + 40);
    if (h.api.state().lifetime.quick.runs) break;
  }
  const q = h.api.state().lifetime.quick;
  assert.equal(q.runs, 1, 'a full run of 20 finished');
  // よける 系(ランダムに ふってくる)は かんたんな 自動そうさでは たまに あたるので、2つまで ゆるす
  assert.ok(q.bestCleared >= R.TOTAL - 2, `nearly perfect from the hints: ${q.bestCleared}/${R.TOTAL}`);
  assert.ok(h.api.QUICK_GAMES.length >= 15, 'initial set has 15 games');
  const uses = new Set(h.api.QUICK_GAMES.flatMap((d) => d.uses || []));
  for (const k of ['tap', 'drag', 'swipe', 'hold']) assert.ok(uses.has(k), `input kind ${k} exists in the set`);
  assert.ok(kinds.size >= 3, 'several input kinds appeared in one run');
});

test('three misses end the run, the score feeds the normal result flow, and difficulty ramps every 4 games', () => {
  const { h, s, run } = begin();
  const R = h.api.QUICK_RULES;
  let misses = 0, limits = [];
  for (let i = 0; i < 40 && !s.lifetime.quick.runs; i++) {
    const cur = run.current;
    limits.push([cur.level, cur.limit, cur.def.dur]);
    if (cur.def.survive) { solve(h, run, cur); } // よける 系は うけとおす(時間切れ = せいこう)
    else { h.advance(cur.limit + 40); misses++; }                     // ほかは 時間切れ = しっぱい
    h.advance(R.RESULT_MS + 40);
  }
  assert.equal(misses, R.LIVES, 'the run ends on the third miss');
  const q = s.lifetime.quick;
  assert.equal(q.runs, 1);
  h.advance(R.FINAL_MS + 100);
  const rec = s.lifetime.minigameRecords['quick-run'];
  assert.ok(rec, 'the run is recorded like a game');
  assert.equal(rec.last, q.bestCleared * R.SCORE_PER_CLEAR, '5 points per cleared game');
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), true, 'back to the home screen');
  assert.equal(s.lifetime.minigamesPlayed, 1);
  // 4ゲームごとに レベルが あがり、せいげん時間が 7% ずつ みじかくなる
  const lv2 = limits.find(([lv]) => lv === 2);
  if (lv2) assert.equal(lv2[1], Math.round(lv2[2] * (1 - R.TIME_SHRINK)));
});
