// 使い方 (リポジトリの 根で): node prototypes/bgm-survey-20261108/tools/survey-dump.cjs <出力フォルダ>
// 本体の ファイルは 変更しない (メモリ上で 調査用の のぞき口を 足すだけ)。
// Read-only survey: boots script.js via the repo's runtime harness, injecting an in-memory probe.
const fs = require('node:fs');
const path = require('node:path');
const OUT = process.argv[2];
const orig = fs.readFileSync;
const probe = `
  globalThis.__survey = { MINIGAME_INFO, MINIGAMES, REGION_MINIGAMES, SEASONAL_MINIGAMES, minigameInfo, minigameGenreId,
    cat: g => minigameCategoryOf.get(g), QUICK_RUN, quickSoloRun, QUICK_GAMES: quickMod ? quickMod.QUICK_GAMES : [],
    sceneFor(g, extra) { const ga = gameActive, am = activeMinigame; gameActive = true; activeMinigame = g;
      try { return audio.currentScene(); } finally { gameActive = ga; activeMinigame = am; } },
    sceneNoGame() { return audio.currentScene(); }, state: () => state, STAGE, el };
  globalThis.__naotocchiBooted = true;`;
fs.readFileSync = function (p, ...a) {
  const r = orig.call(this, p, ...a);
  if (p === 'script.js') return r.replace('  globalThis.__naotocchiBooted = true;', probe);
  return r;
};
const { harness } = require(path.resolve(__dirname, '../../../tests/helpers/runtime-harness.cjs'));
fs.readFileSync = orig;
const h = harness();
const S = h.sandbox.__survey;
if (!S) throw new Error('probe not injected');
// harness DOM stub: lifeCardOverlay starts without 'hidden' class (index.html has it hidden); mirror the real page
if (S.el.lifeCardOverlay) { console.error('lifeCardOverlay hidden before?', S.el.lifeCardOverlay.classList.contains('hidden')); S.el.lifeCardOverlay.classList.add('hidden'); }
{ const m = h.document.getElementById('dateMovie'); if (m) m.classList.add('hidden'); }
const genreToBgm = { drive3d: 'race', puzzle: 'puzzle', board: 'puzzle', sports: 'sports' };
const rows = [];
const add = (g, availability) => {
  const info = S.minigameInfo(g); const genre = S.minigameGenreId(g);
  const bgm = S.sceneFor(g);
  if (bgm !== (genreToBgm[genre] || 'game')) throw new Error("mismatch " + g.id + " got " + bgm + " genre " + genre + " stage " + S.state().stage);
  rows.push({ id: g.id, name: info.name, emoji: info.emoji, category: S.cat(g) || null, genre, bgm, availability, hasInfoEntry: !!S.MINIGAME_INFO[g.id] });
};
for (const g of S.MINIGAMES) add(g, 'always');
for (const [r, es] of Object.entries(S.REGION_MINIGAMES)) for (const e of es) add(e.game, 'region:' + r);
for (const [s, es] of Object.entries(S.SEASONAL_MINIGAMES)) for (const e of es) add(e.game, 'season:' + s);
const count = (k) => rows.reduce((m, r) => (m[r[k]] = (m[r[k]] || 0) + 1, m), {});
const ids = rows.map(r => r.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
fs.writeFileSync(path.join(OUT, 'minigames.json'), JSON.stringify({
  generatedFrom: 'tests/helpers/runtime-harness.cjs boot of script.js (+games.js, audio.js); bgm = audio.currentScene() with gameActive=true, activeMinigame=game',
  total: rows.length, byAvailabilityKind: { always: rows.filter(r => r.availability === 'always').length, region: rows.filter(r => r.availability.startsWith('region')).length, season: rows.filter(r => r.availability.startsWith('season')).length },
  countsByBgm: count('bgm'), countsByGenre: count('genre'), duplicateIds: dup, games: rows }, null, 2));
// quick
const qr = S.QUICK_RUN; const solo = S.quickSoloRun(S.QUICK_GAMES[0].id);
const quick = {
  quickRun: { id: qr.id, category: S.cat(qr) || null, genre: S.minigameGenreId(qr), bgm: S.sceneFor(qr), info: S.MINIGAME_INFO[qr.id] },
  quickSolo: { id: solo.id, category: S.cat(solo) || null, genre: S.minigameGenreId(solo), bgm: S.sceneFor(solo), info: S.MINIGAME_INFO[solo.id] },
  total: S.QUICK_GAMES.length,
  games: S.QUICK_GAMES.map(g => ({ id: g.id, name: g.cue + '（' + g.motif + '）', cue: g.cue, motif: g.motif, scene: g.scene || null })),
};
fs.writeFileSync(path.join(OUT, 'quick.json'), JSON.stringify(quick, null, 2));
// baseline scenes outside games
const st = S.state(); const base = S.sceneNoGame(); st.isSleeping = true; const sleep = S.sceneNoGame(); st.isSleeping = false;
const prevStage = st.stage; st.stage = S.STAGE.DEAD; const dead = S.sceneNoGame(); st.stage = S.STAGE.EGG; const egg = S.sceneNoGame(); st.stage = prevStage;
console.log(JSON.stringify({ total: rows.length, byBgm: count('bgm'), byGenre: count('genre'), dup, missingInfo: rows.filter(r => !r.hasInfoEntry).map(r => r.id), quick: { run: quick.quickRun, solo: quick.quickSolo, n: quick.total }, scenes: { base, sleep, dead, egg } }, null, 1));
