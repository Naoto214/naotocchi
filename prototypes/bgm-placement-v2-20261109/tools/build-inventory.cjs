#!/usr/bin/env node
// 配置表の 調査部分 inventory.js を 作る。
//   node prototypes/bgm-placement-v2-20261109/tools/build-inventory.cjs
// 入力: docs/bgm-survey-20261108/data/minigames.json（#531 の 実測）と docs/bgm-placement-v2-20261109/data/*.json（今回の 調査）
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const repo = path.resolve(__dirname, '../../..');
const out = path.resolve(__dirname, '../inventory.js');
const read = (p) => JSON.parse(fs.readFileSync(path.join(repo, p), 'utf8'));
const mg = read('docs/bgm-survey-20261108/data/minigames.json').games;
const inv = read('docs/bgm-placement-v2-20261109/data/independent.json');

const RACE = ['p3-drive', 'race-3d', 'grand-prix-3d', 'rhythm-highway-3d', 'space-gunner-3d'];
const EXPLORE = ['haunted-house-3d', 'fp-dungeon', 'tilt-maze-3d', 'voxel-mine'];
const FISHING = ['real-fishing', 'fishing-sea', 'fishing-deepsea', 'fishing-river'];
const groupOf = (g) => {
  if (g.genre === 'action') return 'action';
  if (g.genre === 'strategy') return 'strategy';
  if (g.genre === 'puzzle') return 'puzzle';
  if (g.genre === 'board') return 'board';
  if (g.genre === 'sports') return FISHING.includes(g.id) ? 'fishing' : 'sports';
  if (g.genre === 'drive3d') return RACE.includes(g.id) ? 'race' : EXPLORE.includes(g.id) ? 'explore' : 'flight';
  throw new Error('unknown genre ' + g.genre);
};
const CONF = '採用決定・曲名確認待ち（気に入った 方を 採用、両方なら 両方）';
const DEF = {
  action: { cls: 'D', confirm: true, area: 'ミニゲーム アクション', current: 'game（未確定）', candidates: ['game-1', 'game-2'], keepExisting: '既存 game は 不採用では ない（クイックモードで 残すかを 比較）', reuse: '—', needNew: '不要', length: 'ゲーム中 ループ（1回 30〜90秒）。新曲は 16小節（約 27〜30秒）', status: CONF + '。両方なら 速い アクション＝あそびのはじまり、間の ある ゲーム＝ぴょこぴょこステップ' },
  strategy: { cls: 'D', confirm: true, area: 'ミニゲーム ストラテジー', current: 'game（未確定）', candidates: ['game-1', 'game-2'], keepExisting: '同上', reuse: 'ミニゲーム汎用の 採用曲', needNew: '不要', length: 'ゲーム中 ループ（数分）', status: CONF + '（ミニゲーム汎用と 同じ 曲）' },
  puzzle: { cls: 'D', area: 'ミニゲーム パズル', current: 'puzzle（不採用）', candidates: ['poyo-1', 'card-1'], keepExisting: '不可（不採用。統合までは 保護）', reuse: 'なおぽよ。の 採用曲の 流用（独立ゲームの 個性が うすれる 点に 注意）', needNew: '流用しない なら 追加作曲（E に 変わる）', length: 'ゲーム中 ループ（数分）', status: '未確定（流用するか 判断が 必要）' },
  board: { cls: 'D', area: 'ミニゲーム ボード・テーブル', current: 'puzzle（不採用）', candidates: ['card-1', 'poyo-1'], keepExisting: '不可（不採用。統合までは 保護）', reuse: 'CARD GAME の 採用曲の 流用（同上の 注意）', needNew: '流用しない なら 追加作曲（E に 変わる）', length: 'ゲーム中 ループ（数分）', status: '未確定（流用するか 判断が 必要）' },
  sports: { cls: 'E', area: 'ミニゲーム スポーツ', current: 'sports（不採用）', candidates: ['sports-1', 'sports-2'], keepExisting: '不可（不採用。統合までは 保護）', reuse: 'ミニゲーム汎用の 採用曲も 候補に できる', needNew: '必要 → 追加作曲 2案（はれのひグラウンド・かぜをきって）の 評価待ち', length: 'ゲーム中 ループ（30〜90秒）', status: '不足 → 追加作曲済み、評価待ち' },
  fishing: { cls: 'D', area: 'ミニゲーム 釣り', current: 'sports（不採用）', candidates: ['explore-2', 'sports-2'], keepExisting: '不可（不採用。統合までは 保護）', reuse: '3D の「そらとうみのさんぽ」が 採用なら その 流用', needNew: '不要（流用候補あり）', length: '待つ 時間が 長い。ゆっくり ループ', status: '未確定' },
  race: { cls: 'D', area: 'ミニゲーム 3D レース・シューティング', current: 'race（未確定）', candidates: ['bgm-race', 'game-1', 'game-2'], keepExisting: '未確定（疾走感は 合う）', reuse: 'ミニゲーム汎用の 採用曲', needNew: '不要', length: 'ゲーム中 ループ。いまの race は 1周 13秒', status: '未確定（既存 race を 残すか）' },
  explore: { cls: 'D', confirm: true, area: 'ミニゲーム 3D 探検', current: 'race（未確定。探検には 速すぎる）', candidates: ['explore-1', 'explore-2'], keepExisting: '既存 race は レースで 比較', reuse: '—', needNew: '不要', length: 'ゲーム中 ループ', status: CONF + '。両方なら ここは ふしぎのちか' },
  flight: { cls: 'D', confirm: true, area: 'ミニゲーム 3D 飛行・海', current: 'race（未確定。飛行には 速すぎる）', candidates: ['explore-2', 'explore-1'], keepExisting: '既存 race は レースで 比較', reuse: '—', needNew: '不要', length: 'ゲーム中 ループ', status: CONF + '。両方なら ここは そらとうみのさんぽ' },
};
const groups = {};
for (const g of mg) (groups[groupOf(g)] = groups[groupOf(g)] || []).push(g);
const MINIGAME_ROWS = Object.entries(DEF).map(([k, d]) => {
  const list = groups[k] || [];
  return Object.assign({ id: 'mg-' + k, scene: `${list.length}本: ${list.map((g) => g.name).join('・')}`, minigames: list.length, gameIds: list.map((g) => g.id), timeOfDay: '不要' }, d);
});

const outText = `// BGM 配置 VERSION 2 — 調査部分（tools/build-inventory.cjs が 生成。手で 編集しない）
(function (root) {
  'use strict';
  const api = ${JSON.stringify({ REGION_COUNT: inv.regions.length, REGION_LABELS: inv.regions.map((r) => r.label).join('・'), REGIONS: inv.regions, DAYPARTS: inv.dayparts, MINIGAME_ROWS, INDEPENDENT_ROWS: inv.rows }, null, 1)};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NAOTOCCHI_BGM_INVENTORY = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
fs.writeFileSync(out, outText);
console.log('wrote', path.relative(repo, out), MINIGAME_ROWS.map((r) => `${r.id}=${r.minigames}`).join(' '));
