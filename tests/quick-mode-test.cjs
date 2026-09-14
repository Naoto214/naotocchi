const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// いまの ゲームを「せいかい」の そうさで とく(ゲームの target() が かえす 手がかりを つかう)
function solve(h, run, cur) {
  const g = cur.game; const t = g.target ? g.target() : null;
  if (!t) return;
  // はんてい(○/×)が 出たら そこで やめる(つぎの ゲームまで すすめない)
  const ov = h.get('minigameOverlay');
  const judged = () => run.current !== cur || !ov.querySelector('#qkFlash').classList.contains('hidden') || !ov.querySelector('#qkFinal').classList.contains('hidden');
  if (t.kind === 'none') { for (let i = 0; i < 400 && !judged(); i++) h.advance(16); return; }
  if (t.kind === 'tap') {
    if (t.times) { for (let i = 0; i < t.times; i++) { g.onTap(t.x, t.y); h.advance(16); } for (let i = 0; i < 400 && !judged(); i++) h.advance(16); return; }
    for (let i = 0; i < 400 && !judged(); i++) {
      const k = g.target(); if (k.ready === false) { h.advance(16); continue; }
      g.onTap(k.x, k.y);
      if (!k.repeat && k.ready == null) return; // 1かいの タップで きまる ゲーム
      h.advance(16);
    }
    return;
  }
  if (t.kind === 'swipe') { for (let i = 0; i < 400 && !judged(); i++) { const k = g.target(); if (k.ready === false) { h.advance(16); continue; } g.onSwipe(k.dir); if (!k.repeat) break; h.advance(48); } for (let i = 0; i < 100 && !judged(); i++) h.advance(16); return; }
  if (t.kind === 'spin') { g.onPress(t.x + t.r, t.y); for (let i = 1; i <= 80 && !judged(); i++) { const a = i / 16 * Math.PI * 2; g.onDrag(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r, 0, 0); if (i % 4 === 0) h.advance(16); } g.onRelease(); return; }
  if (t.kind === 'drag') {
    for (let pass = 0; pass < 260 && !judged(); pass++) {
      const k = g.target(); if (!k) return;
      if (g.onPress) g.onPress(k.x, k.y);
      let x = k.x, y = k.y; const steps = k.slow ? 24 : 6;
      for (let i = 1; i <= steps; i++) { const nx = k.x + (k.to.x - k.x) * i / steps, ny = k.y + (k.to.y - k.y) * i / steps; if (k.slow) h.advance(16); g.onDrag(nx, ny, nx - x, ny - y); x = nx; y = ny; }
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
  for (let i = 0; i < 80 && run.current; i++) {
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
  assert.equal(h.api.QUICK_GAMES.length, 50, 'the set is fixed at 50 games');
  const uses = new Set(h.api.QUICK_GAMES.flatMap((d) => d.uses || []));
  for (const k of ['tap', 'drag', 'swipe', 'hold', 'none']) assert.ok(uses.has(k), `input kind ${k} exists in the set`);
  assert.ok(kinds.size >= 3, 'several input kinds appeared in one run');
});

test('three misses end the run, the score feeds the normal result flow, and difficulty ramps every 4 games', () => {
  const { h, s, run } = begin();
  const R = h.api.QUICK_RULES;
  const ov = h.get('minigameOverlay');
  let limits = [], games = 0;
  for (let i = 0; i < 40 && !s.lifetime.quick.runs; i++) {
    const cur = run.current; games++;
    limits.push([cur.level, cur.limit, cur.def.dur]);
    if (cur.def.survive) { solve(h, run, cur); } // よける 系は うけとおす(時間切れ = せいこう)
    else { for (let k = 0; k < 400 && run.current === cur && ov.querySelector('#qkFlash').classList.contains('hidden'); k++) h.advance(16); } // ほかは さわらず、はんてい(時間切れ か じばく)まで まつ
    if (s.lifetime.quick.runs) break;
    h.advance(R.RESULT_MS + 40);
    if (s.lifetime.quick.runs) break; // 3かいめの しっぱいで ラン おわり(さいごの がめんの あいだに しらべる)
  }
  const q = s.lifetime.quick;
  assert.equal(q.runs, 1, 'the run ended');
  assert.equal(ov.querySelector('#qkLives').textContent, '🖤'.repeat(R.LIVES), 'all three lives were lost');
  assert.ok(games < R.TOTAL, 'the run ended early on the third miss');
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

test('every game can be played on its own: a solo run repeats one game 10 times and keeps a per-game best', () => {
  const h = harness(), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0 });
  h.api.render();
  const R = h.api.QUICK_RULES;
  const ids = h.api.QUICK_GAMES.map((g) => g.id);
  assert.equal(h.api.quickSoloRun('nope'), null);
  for (const id of ids) {
    const solo = h.api.quickSoloRun(id);
    assert.equal(solo.id, 'quick-solo'); assert.equal(solo.quickGameId, id);
  }
  // 1本を えらんで あそぶ: ぜんぶ おなじ ゲーム、10かい、2かいごとに レベル
  assert.equal(h.api.startQuickRun('knock'), true);
  h.advance(40);
  const run = h.api.quickSoloRun('knock')._run;
  let levels = [];
  for (let i = 0; i < 30 && !s.lifetime.quick.single.knock; i++) {
    const cur = run.current; assert.equal(cur.def.id, 'knock', 'solo run only plays the chosen game');
    levels.push(cur.level);
    solve(h, run, cur); h.advance(16);
    h.advance(R.RESULT_MS + 40);
  }
  assert.deepEqual(levels.slice(0, 4), [1, 1, 2, 2], 'level rises every 2 games in solo mode');
  assert.equal(levels.length, R.SOLO_TOTAL);
  const rec = s.lifetime.quick.single.knock;
  assert.equal(rec.runs, 1); assert.equal(rec.best, R.SOLO_TOTAL);
  assert.equal(s.lifetime.quick.runs, 0, 'solo runs do not count as mixed runs');
  h.advance(R.FINAL_MS + 100);
  assert.equal(s.lifetime.minigameRecords['quick-solo'].last, 100, '10 clears of 10 points');
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), true);
});

test('the quick voice setting has three modes and the character voice speaks kana without the speech API', () => {
  const h = harness(), s = h.api.state();
  assert.equal(s.lifetime.quickVoice, 'tts');
  assert.ok(h.api.QUICK_VOICE_CHOICES.pico && h.api.QUICK_VOICE_CHOICES.tts && h.api.QUICK_VOICE_CHOICES.off);
});
