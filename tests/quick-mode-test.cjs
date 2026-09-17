const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { harness } = require('./helpers/runtime-harness.cjs');

function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key)};
}

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

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
}

function begin(random) {
  const h = harness(), s = h.api.state();
  if (random) h.api.setRandom(random);
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0 });
  h.api.render(); // the play button is enabled by render()
  assert.equal(h.api.startQuickRun(), true, 'quick run starts like a normal game');
  h.advance(40);
  const run = h.api.QUICK_RUN._run;
  assert.ok(run && run.current, 'the first game begins on the first frame');
  return { h, s, run };
}

test('coins target keeps the basket clear of bad drops at levels 1-5', () => {
  const h = harness();
  const def = h.api.QUICK_GAMES.find((game) => game.id === 'coins');
  assert.ok(def);
  for (let level = 1; level <= 5; level++) {
    h.api.setRandom(seededRandom(21));
    let result = null;
    const k = level - 1;
    const game = def.create({W:300,H:300,level,speed:1+h.api.QUICK_RULES.SPEED_UP*k,
      extra:Math.floor(k/2),feint:level>=3,win:()=>{result='win';},lose:()=>{result='lose';}});
    for (let elapsed = 0; elapsed < 6000 && !result; elapsed += 16) {
      game.update(.016);
      const target = game.target();
      game.onPress(target.x,target.y);
    }
    assert.equal(result,'win',`coins target solves level ${level}`);
  }
});

test('quick mode chains 3-6 second games: cue, immediate play, judge, next game within the result flash', () => {
  // This assertion requires the first game to be solved. Seed it so a random
  // dodge collision cannot make the chaining contract fail intermittently.
  const { h, s, run } = begin(seededRandom(0x12345678));
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
  const storage = memoryStorage();
  const h = harness({storage}), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0 });
  s.regionId = 'home';
  Object.assign(s.lifetime, {weatherMode:'cloudy', timeMode:'night', seasonMode:'autumn'});
  s.lifetime.equippedItemId = 'energy1';
  s.lifetime.money = 0; s.growth = 0; s.sodachi = 55; s.maxSodachi = 55;
  h.api.render();
  vm.runInContext('Math.random=()=>0.99', h.sandbox);
  const R = h.api.QUICK_RULES;
  const ids = h.api.QUICK_GAMES.map((g) => g.id);
  assert.equal(h.api.quickSoloRun('nope'), null);
  for (const id of ids) {
    const solo = h.api.quickSoloRun(id);
    assert.equal(solo.id, 'quick-solo'); assert.equal(solo.quickGameId, id);
  }
  // 1本を えらんで あそぶ: ぜんぶ おなじ ゲーム、10かい、2かいごとに レベル
  assert.equal(h.api.startQuickRun('knock'), true);
  s.lifetime.equippedItemId = null;
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
  assert.equal(s.lifetime.minigamesPlayed, 1, 'one completed solo run settles as one game');
  assert.equal(s.minigameCount, 1, 'one completed solo run applies one result');
  assert.equal(s.energy, 100, 'Quick preserves energy after an equipment swap');
  assert.equal(s.lifetime.money, 0, 'a solo run pays no coins');
  assert.equal(s.sodachi, 55, 'Quick preserves growth');
  const restored = harness({resume:true, storage}).api.state();
  assert.deepEqual(JSON.parse(JSON.stringify(restored.lifetime.quick.single.knock)), {runs:1, best:10});
  assert.deepEqual(JSON.parse(JSON.stringify(restored.lifetime.minigameRecords['quick-solo'])), {best:100, last:100});
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), true);
});

test('Quick list toggle uses its dedicated control and a selected solo starts', () => {
  const h = harness(), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80 });
  const grid = h.get('gameListGrid');
  const toggle = {dataset: {}};
  grid.closest = selector => selector === '.quick-list-toggle' ? toggle : null;
  h.dispatch(grid, 'click');
  assert.match(grid.innerHTML, /quick-solo-list/, 'the actual delegated toggle expands the solo list');
  const solo = {dataset: {quickId: 'knock'}};
  grid.closest = selector => selector === '.quick-solo-start' ? solo : null;
  h.dispatch(grid, 'click');
  h.advance(40);
  assert.equal(h.api.quickSoloRun('knock')._run.current.def.id, 'knock');
  h.api.retireMinigame();
});

test('both Quick entries pay zero for incomplete runs even with Star', () => {
  const h = harness(), s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80 });
  s.lifetime.equippedItemId = 'star';
  h.api.render();
  for (const id of [null, 'knock', 'tickle']) {
    assert.equal(h.api.startQuickRun(id), true);
    h.advance(40);
    const money = s.lifetime.money;
    h.api.finishMinigame(30);
    assert.equal(s.lifetime.money, money);
  }
  assert.equal(s.lifetime.itemProgress.starGames, undefined);
});

test('both Quick entries ignore retired energy-band snapshots', () => {
  for (const id of [null, 'knock']) {
    const h = harness(), s = h.api.state();
    Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80 });
    s.regionId = 'home';
    Object.assign(s.lifetime, {weatherMode:'cloudy', timeMode:'night', seasonMode:'autumn'});
    s.lifetime.equippedItemId = 'energy1';
    h.api.render();
    assert.equal(h.api.startQuickRun(id), true);
    s.lifetime.equippedItemId = null;
    h.advance(40);
    h.api.finishMinigame(50);
    assert.equal(s.energy, 100, `${id || 'mixed'} Quick preserves energy despite a retired band snapshot`);
  }
});

test('the production Quick voice control saves every selected mode for the audio router', () => {
  const storage = memoryStorage();
  const h = harness({storage}), s = h.api.state();
  assert.equal(s.lifetime.quickVoice, 'tts');
  assert.ok(h.api.QUICK_VOICE_CHOICES.pico && h.api.QUICK_VOICE_CHOICES.tts && h.api.QUICK_VOICE_CHOICES.off);
  const grid = h.get('quickVoiceGrid');
  const voiceCalls = [];
  h.api.audio.voice = text => { voiceCalls.push({text, mode:s.lifetime.quickVoice}); return true; };
  for (const mode of ['pico', 'tts', 'off']) {
    const button = {dataset: {id: mode}};
    grid.closest = selector => selector === '.theme-swatch' ? button : null;
    h.dispatch(grid, 'click');
    const saved = JSON.parse(storage.getItem('naotocchi-save-v1')).lifetime;
    assert.equal(s.lifetime.quickVoice, mode);
    assert.equal(saved.quickVoice, mode);
    assert.equal(saved.quickVoiceChosen, true);
    assert.equal(harness({resume:true, storage}).api.state().lifetime.quickVoice, mode);
  }
  assert.deepEqual(voiceCalls, [
    {text:'よけろ', mode:'pico'},
    {text:'よけろ', mode:'tts'},
    {text:'よけろ', mode:'off'},
  ]);
});

test('an unchosen legacy pico setting migrates to reading while chosen pico remains selected', () => {
  const legacy = memoryStorage();
  legacy.setItem('naotocchi-save-v1', JSON.stringify({lifetime: {quickVoice:'pico'}}));
  assert.equal(harness({resume:true, storage:legacy}).api.state().lifetime.quickVoice, 'tts');

  const chosen = memoryStorage();
  chosen.setItem('naotocchi-save-v1', JSON.stringify({lifetime: {quickVoice:'pico', quickVoiceChosen:true}}));
  assert.equal(harness({resume:true, storage:chosen}).api.state().lifetime.quickVoice, 'pico');
});

test('umbrella solo shows a compact cue and waits for rain before a successful swipe', () => {
  const h = harness(), s = h.api.state();
  Object.assign(s, {stage:'growing',isSleeping:false,isSick:false,energy:100,health:100,hunger:80,transformMeter:0});
  vm.runInContext('Math.random=()=>0.5', h.sandbox);
  h.api.render();
  assert.equal(h.api.startQuickRun('umbrella'), true);
  h.advance(40);
  const run = h.api.quickSoloRun('umbrella')._run;
  const cur = run.current;
  const overlay = h.get('minigameOverlay');
  const cue = overlay.querySelector('#qkCue').textContent;
  assert.ok(cue.length >= 2 && cue.length <= 9, `cue is a short instruction: ${cue}`);
  assert.doesNotMatch(cue, /\s/);
  assert.equal(cur.game.target().ready, false, 'wait for the rain');

  solve(h, run, cur);
  h.advance(16);
  assert.equal(overlay.querySelector('#qkCount').textContent, '✔ 1／10');
  assert.equal(overlay.querySelector('#qkFlash').classList.contains('hidden'), false);
  h.advance(h.api.QUICK_RULES.RESULT_MS + 40);
  assert.notEqual(run.current, cur);
  assert.equal(run.current.def.id, 'umbrella');
});

for(const id of ['quick-run','quick-solo']) test(`game pass never shortcuts ${id}, including during ordinary cooldown`,()=>{
  const h=harness(),s=h.api.state();
  s.lifetime.equippedItemId='gamepass1';
  Object.assign(s,{sodachi:80,maxSodachi:80,growth:0});
  h.api.render();
  h.dispatch(h.get('playBtn'),'click');
  let started=false;
  assert.equal(h.api.tryStartPlay({id,noIntro:true,start(){started=true;}}),true);
  assert.equal(started,true);
  assert.equal(s.actionCounts.play,1);
  h.api.finishMinigame(50);
  assert.equal(s.lifetime.minigameRecords[id].last,50);
});

// Fixed randomness makes this settlement fixture repeat weather/feather/sneak/doors.
// The broader randomized solver and input coverage above is deliberately unchanged.
function perfectMixedRun(h) {
  h.api.setRandom(() => 0.99);
  assert.equal(h.api.startQuickRun(), true);
  h.advance(40);
  const run = h.api.QUICK_RUN._run, beforeRuns = h.api.state().lifetime.quick.runs;
  for (let i = 0; i < 20; i++) {
    solve(h, run, run.current); h.advance(16);
    assert.equal(h.get('minigameOverlay').querySelector('#qkCount').textContent, `✔ ${i + 1}／20`);
    h.advance(h.api.QUICK_RULES.RESULT_MS + 40);
  }
  assert.equal(h.api.state().lifetime.quick.runs, beforeRuns + 1);
}

test('real mixed 20/20 callback pays 100, keeps records and achievements, and a new perfect run pays again', () => {
  const storage = memoryStorage(), h = harness({storage}), s = h.api.state();
  s.lifetime.equippedItemId = 'star';
  const before = s.lifetime.money, energy = s.energy, growth = s.growth;
  for (let n = 1; n <= 2; n++) {
    perfectMixedRun(h);
    assert.equal(s.lifetime.money, before + (n - 1) * 100, 'final card does not settle early');
    h.advance(h.api.QUICK_RULES.FINAL_MS + 100);
    assert.equal(s.lifetime.money, before + n * 100);
    assert.equal(s.lifetime.quick.runs, n);
    assert.equal(s.lifetime.quick.bestCleared, 20);
    assert.equal(s.lifetime.minigamePlayCounts['quick-run'], n);
    assert.equal(s.lifetime.minigamesPlayed, n);
    assert.equal(s.lifetime.minigameRecords['quick-run'].best, 100);
    assert.equal(s.energy, energy); assert.equal(s.growth, growth);
    assert.ok(s.achievementsUnlocked.includes('quick-10'));
    assert.ok(s.achievementsUnlocked.includes('quick-perfect'));
    h.api.finishMinigame(100);
    assert.equal(s.lifetime.money, before + n * 100, 'duplicate settlement is ignored');
  }
  const restored = harness({resume:true, storage}).api.state();
  assert.equal(restored.lifetime.money, before + 200);
  assert.equal(restored.lifetime.quick.runs, 2);
  assert.ok(restored.achievementsUnlocked.includes('quick-perfect'));
});

test('retiring a real Quick final card invalidates its delayed completion during the next session', () => {
  const h = harness(), s = h.api.state();
  const money = s.lifetime.money;
  perfectMixedRun(h);
  h.api.retireMinigame();
  assert.equal(s.lifetime.money, money);
  assert.equal(h.api.startQuickRun('knock'), true);
  h.advance(h.api.QUICK_RULES.FINAL_MS + 100);
  assert.equal(s.lifetime.money, money);
  assert.equal(s.lifetime.minigamesPlayed, 0, 'retired callback cannot settle the active solo game');
  h.api.retireMinigame();
});
