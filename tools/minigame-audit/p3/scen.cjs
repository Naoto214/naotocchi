// Phase 3: 対象ゲームの「連打・押しっぱなし・放置に 近い 操作」を ボットで 再現する。
// node tools/minigame-audit/p3/scen.cjs [名前の 一部]  …  例: node scen.cjs stack
const {many, fmt} = require('./probe.cjs');
const S = {};
const add = (name, id, bot, opt) => { S[name] = {id, bot, opt}; };

// つみあげタワー: 「おとす」を 0.15秒ごとに 連打
for (const id of ['stack-themed', 'stack-snowman', 'stack-harvest', 'stack-acorn', 'stack-sakura', 'stack-leaves']) {
  add(`${id} 連打0.15秒`, id, (r, t) => { if (t >= 1500 && t % 150 === 0) r.tap(r.q('#stDrop')); });
  add(`${id} 連打0.4秒`, id, (r, t) => { if (t >= 1500 && t % 400 === 0) r.tap(r.q('#stDrop')); });
}
// アステロイド: その場で 0.3秒ごとに 撃つ(回らない・進まない)
add('asteroids 撃つだけ', 'asteroids-classic', (r, t) => { if (t >= 1500 && t % 300 === 0) r.down(r.q('#asFire')); });
add('asteroids 撃つ+少し回す', 'asteroids-classic', (r, t) => { if (t >= 1500 && t % 300 === 0) r.down(r.q('#asFire')); });
// リズム: 3レーンを 同時に 連打
for (const iv of [100, 150, 250]) add(`rhythm 3レーン連打${iv}`, 'rhythm-highway-3d', (r, t) => { if (t % iv === 0) for (const s of ['#rhL', '#rhM', '#rhR']) r.down(r.q(s)); });
// ダーツ: まんなかを 押して すぐ はなす
add('darts 中央を押してすぐ離す', 'darts-board', (r, t) => { const c = r.q('#dtCanvas'); if (t >= 1000 && t % 2000 === 0) { r.down(c, 150, 141); r.up(c, 150, 141); } });
// フルーツ斬り: 画面を なぞりつづける
add('fruit なぞりつづける', 'fruit-slice', (r, t) => { const c = r.q('#fsCanvas'); if (t === 500) r.down(c, 20, 150); if (t > 500) r.move(c, 150 + Math.sin(t / 120) * 140, 80 + ((t / 50) % 8) * 25); });
// アーチェリー: まっすぐ 下に いっぱい 引いて はなす(ねらわない・風を 見ない)
add('archery まっすぐ引く', 'archery-3d', (r, t) => { const c = r.q('#arCanvas'); if (t >= 1000 && t % 3000 === 0) { r.down(c, 150, 200); r.move(c, 150, 330); r.up(c, 150, 330); } });
// ボクセル: 下スワイプを 0.4秒ごと
add('voxel 下スワイプ連打', 'voxel-mine', (r, t) => { const c = r.q('#vmCanvas'); if (t >= 1500 && t % 400 === 0) { r.down(c, 150, 100); r.move(c, 150, 140); r.up(c, 150, 140); } });
// ハーフパイプ: ポンプ押しっぱなし + トリック連打
for (const iv of [100, 200, 400]) add(`halfpipe ポンプ+連打${iv}`, 'halfpipe-skate', (r, t) => { if (t === 1000) r.down(r.q('#hpPump'), 0, 0, 7); if (t >= 1000 && t % iv === 0) r.down(r.q('#hpTrick'), 0, 0, 2); });
// かくとう: キック・パンチの 連打
add('fight キック0.75秒', 'street-fight', (r, t) => { if (t % 750 === 0) r.tap(r.q('#sfKick')); });
add('fight パンチ0.1秒', 'street-fight', (r, t) => { if (t % 100 === 0) r.tap(r.q('#sfPunch')); });
add('fight パンチ0.5秒', 'street-fight', (r, t) => { if (t % 500 === 0) r.tap(r.q('#sfPunch')); });
// グランプリ: アクセル 押しっぱなし(ハンドルなし)
add('grandprix アクセルだけ', 'grand-prix-3d', (r, t) => { if (t === 500) r.down(r.q('#gpAccel'), 0, 0, 5); });
// ハンググライダー: 少し ゆらす だけ
add('hangglider 少しゆらす', 'hang-glider-3d', (r, t) => { const c = r.q('#hgCanvas'); if (t % 1000 === 0) { r.down(c, 150, 150); r.move(c, 150, 150 + ((t / 1000) % 2 ? 20 : -20)); r.up(c, 150, 150); } });
// ドミノ: すぐ おす
add('domino すぐ押す', 'domino-run', (r, t) => { if (t % 2000 === 0 && t > 0) r.tap(r.q('#dmPush')); });

if (require.main === module) {
const pick = process.argv[2] || '';
for (const [name, sc] of Object.entries(S)) {
  if (!name.includes(pick)) continue;
  console.log(name.padEnd(30), fmt(many(sc.id, sc.bot, sc.opt || {})));
}
}
module.exports = {S};
