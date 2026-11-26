// Phase 3: 7つの プレイヤー像で 対象ゲームを 遊ばせ、点と「1分あたりの 報酬」を 出す。
//   node tools/minigame-audit/p3/personas.cjs [--out file.json] [--ids a,b] [--seeds 6]
// 変更前は main の worktree に この フォルダを コピーして おなじ コマンドで 走らせる(ハーネスと games.js は その worktree の もの)。
// 報酬は 本体(script.js finishMinigameInner・C案)と おなじ 決まりで 点から 計算する:
//   記録される 回: コイン 0/30/60(30・70の 帯)、そだち 0/+7/+14、きげん +5+点/5、へんしんメーター +25
//   記録されない 回(放置・参加なし): コイン 0、そだち 0、きげん +2、へんしん 0
// 1分あたりは 1回の 時間 = プレイ時間 + 画面の 行き来(結果を 見て もう一度 えらぶ まで)OVERHEAD_S 秒 で わる。
const {play} = require('./probe.cjs');
const sk = require('./skill.cjs');
const {S} = require('./scen.cjs');
const OVERHEAD_S = 8;

const idle = null;
const tap1 = (r, t) => { if (t === 1000) { const n = r.box.children.find((c) => c.listeners && c.listeners.length) || r.box; r.tap(n); } };
const mash = (r, t) => { if (t >= 1000 && t % 150 === 0) { for (const n of [...globalThis.__mgListened]) { if (!n.isConnected || n.disabled || /^mg(Quit|Help)/.test(n.id || '')) continue; const ty = new Set(n.listeners.map((l) => l.type)); if (ty.has('pointerdown')) r.tap(n); } } };
const P = {
  idle: '完全放置', tap1: '一度だけ操作', mash: '単純な連打', quick: '意図的な即時失敗', beginner: '初心者', average: '平均的', expert: '上級者',
};
// ゲームごとの「連打」「即時失敗」「初心者・平均・上級」ボット
const G = {};
const stackIds = ['stack-themed', 'stack-snowman', 'stack-harvest', 'stack-acorn', 'stack-sakura', 'stack-leaves'];
for (const id of stackIds) G[id] = {name: 'つみあげタワー', mash: S[`${id} 連打0.15秒`].bot, quick: S[`${id} 連打0.15秒`].bot,
  beginner: sk.stackBot({tol: 25}), average: sk.stackBot({tol: 12}), expert: sk.stackBot({tol: 3}), step: {beginner: 33, average: 16, expert: 16}};
const dartsHold = (ms) => (r, t) => { const c = r.q('#dtCanvas'), ph = t % 2500; if (t < 1000) return; if (ph === 0) r.down(c, 150, 141); if (ph === Math.max(50, Math.round(ms / 50) * 50)) r.up(c, 150, 141); };
G['darts-board'] = {name: 'ダーツ', mash: S['darts 中央を押してすぐ離す'].bot, quick: (r, t) => { const c = r.q('#dtCanvas'); if (t >= 1000 && t % 450 === 0) { r.down(c, 20, 20); r.up(c, 20, 20); } },
  beginner: (r, t) => { const c = r.q('#dtCanvas'), ph = t % 2500; if (t < 1000) return; if (ph === 0) r.down(c, 150 + ((t / 2500) % 3 - 1) * 25, 150); if (ph === 250) r.up(c, 150 + ((t / 2500) % 3 - 1) * 25, 150); },
  average: dartsHold(400), expert: dartsHold(750)};
G['rhythm-highway-3d'] = {name: 'リズムハイウェイ', mash: S['rhythm 3レーン連打150'].bot, quick: tap1,
  beginner: sk.rhythmBot({jitter: 140, hitRate: 0.75}), average: sk.rhythmBot({jitter: 70, hitRate: 0.9}), expert: sk.rhythmBot({jitter: 15})};
G['asteroids-classic'] = {name: 'アステロイド', mash: S['asteroids 撃つだけ'].bot, quick: S['asteroids 撃つだけ'].bot,
  beginner: sk.asteroidsBot({slow: 0.15, aimTol: 0.5}), average: sk.asteroidsBot({slow: 0.3, aimTol: 0.3}), expert: sk.asteroidsBot({})};
G['fruit-slice'] = {name: 'フルーツ斬り', mash: S['fruit なぞりつづける'].bot, quick: tap1,
  beginner: sk.fruitBot({every: 800, multi: false}), average: sk.fruitBot({every: 400}), expert: sk.fruitBot({every: 150})};
G['archery-3d'] = {name: 'アーチェリー', mash: S['archery まっすぐ引く'].bot, quick: (r, t) => { const c = r.q('#arCanvas'); if (t >= 1000 && t % 1500 === 0) { r.down(c, 150, 200); r.move(c, 150, 330); r.up(c, 150, 330); } },
  beginner: sk.archeryBot({err: 25}), average: sk.archeryBot({err: 12}), expert: sk.archeryBot({err: 2})};
G['halfpipe-skate'] = {name: 'ハーフパイプ', mash: (r, t) => { if (t === 1000) r.down(r.q('#hpPump'), 0, 0, 7); if (t >= 1000 && t % 700 === 0) r.down(r.q('#hpTrick'), 0, 0, 2); }, quick: tap1,
  beginner: sk.halfpipeBot({smart: false, pattern: [1]}), average: sk.halfpipeBot({pattern: [1]}), expert: sk.halfpipeBot({pattern: [1, 2]})};
const fighter = (mix, lo, hi, guard) => require('./probe.cjs').fresh((seed) => { let next = 1000, rnd = seed * 99 + 1, gUntil = 0; const rand = () => ((rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0) / 4294967296); return (r, t) => { if (guard && t > gUntil && gUntil > 0) { r.up(r.q('#sfGuard'), 0, 0, 4); gUntil = 0; } if (t < next) return; if (guard && rand() < 0.2) { r.down(r.q('#sfGuard'), 0, 0, 4); gUntil = t + 500; next = t + 600; return; } r.tap(r.q(rand() < mix ? '#sfKick' : '#sfPunch')); next = t + lo + rand() * (hi - lo); }; });
G['street-fight'] = {name: 'かくとうバトル', mash: S['fight キック0.75秒'].bot, quick: S['fight パンチ0.1秒'].bot,
  beginner: fighter(0.5, 600, 1200, true), average: fighter(0.5, 400, 900, false), expert: fighter(0.8, 700, 1000, false)};
G['grand-prix-3d'] = {name: 'グランプリ', mash: S['grandprix アクセルだけ'].bot, quick: tap1,
  beginner: sk.gpBot({dead: 0.8, lag: 8}), average: sk.gpBot({dead: 0.6, lag: 5}), expert: sk.gpBot({dead: 0.35, lag: 2})};
G['hang-glider-3d'] = {name: 'ハンググライダー', mash: S['hangglider 少しゆらす'].bot, quick: tap1,
  beginner: sk.hgBot({gain: 0.3, aimBalloons: false}), average: sk.hgBot({gain: 0.4, aimBalloons: false}), expert: sk.hgBot({gain: 0.6})};
G['jenga-tower'] = {name: 'ジェンガ', mash: sk.jengaBot({middleOnly: true}), quick: tap1,
  beginner: sk.jengaBot({minS: 0.2, every: 2500}), average: sk.jengaBot({minS: 0.45}), expert: sk.jengaBot({minS: 0.6, every: 900})};
G['domino-run'] = {name: 'ドミノたおし', mash: S['domino すぐ押す'].bot, quick: S['domino すぐ押す'].bot,
  beginner: sk.dominoBot({every: 2000}), average: sk.dominoBot({every: 900}), expert: sk.dominoBot({every: 300})};

function rewards(score, recorded) {
  if (!recorded || score === null) return {coins: 0, growth: 0, happy: 2, transform: 0};
  const s = Math.round(score);
  return {coins: s >= 70 ? 60 : s >= 30 ? 30 : 0, growth: s >= 70 ? 14 : s >= 30 ? 7 : 0, happy: 5 + Math.floor(s / 5), transform: 25};
}
function main() {
  const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const ids = opt('ids') ? opt('ids').split(',') : Object.keys(G);
  const seeds = Array.from({length: Number(opt('seeds', '6'))}, (_, i) => i + 1);
  const out = [];
  for (const id of ids) {
    const g = G[id];
    for (const p of Object.keys(P)) {
      const bot = p === 'idle' ? idle : p === 'tap1' ? tap1 : g[p];
      const runs = [];
      for (const seed of seeds) {
        let r;
        try { r = play(id, {seed, bot: bot && bot.isFactory ? bot(seed) : bot, step: (g.step && g.step[p]) || 50}); } catch (e) { r = {score: null, err: String(e.message || e)}; }
        const sec = (r.endedMs || 400000) / 1000;
        runs.push({seed, score: r.score, recorded: !!r.recorded, sec, ...rewards(r.score, r.recorded)});
      }
      const n = runs.length, avg = (k) => runs.reduce((a, b) => a + (b[k] || 0), 0) / n;
      const min = (avg('sec') + OVERHEAD_S) / 60;
      out.push({id, name: g.name, persona: p, label: P[p], scores: runs.map((x) => x.score === null ? null : Math.round(x.score)), recorded: runs.filter((x) => x.recorded).length, n,
        avgScore: Math.round(avg('score')), sec: Math.round(avg('sec') * 10) / 10,
        perMin: {coins: Math.round(avg('coins') / min), growth: Math.round(avg('growth') / min * 10) / 10, happy: Math.round(avg('happy') / min * 10) / 10, transform: Math.round(avg('transform') / min)}});
      process.stderr.write(`${id} ${p}: ${out[out.length - 1].scores.join(' ')} rec ${out[out.length - 1].recorded}/${n}\n`);
    }
  }
  const file = opt('out');
  if (file) require('fs').writeFileSync(file, JSON.stringify(out, null, 1)); else console.log(JSON.stringify(out));
}
if (require.main === module) main();
module.exports = {G, P, rewards, OVERHEAD_S};
