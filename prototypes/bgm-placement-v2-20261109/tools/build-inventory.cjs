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
const DEF = {
  action: { cls: 'A', area: 'ミニゲーム アクション', current: 'game（未確定）', candidates: ['game-1'], keepExisting: '既存 game は 不採用では ない（クイックモードで 残すか 検討）', reuse: '—', needNew: '不要', length: 'ゲーム中 ループ（1回 30〜90秒）。あそびのはじまり は 16小節 約27秒', status: '確定（あそびのはじまり）。別案 ぴょこぴょこステップ は 保存' },
  strategy: { cls: 'A', area: 'ミニゲーム ストラテジー', current: 'game（未確定）', candidates: ['game-1'], keepExisting: '同上', reuse: 'ミニゲーム汎用の 採用曲', needNew: '不要', length: 'ゲーム中 ループ（数分）', status: '確定（ミニゲーム汎用 あそびのはじまり）' },
  puzzle: { cls: 'D', area: 'ミニゲーム パズル', current: 'puzzle（不採用）', candidates: ['poyo-1', 'poyo-2'], keepExisting: '不可（不採用。統合までは 保護）', reuse: '採用曲 ぽよぽよこもれび で カバー できる（なおぽよ。の 個性が うすれる 点に 注意）', needNew: '分けたい なら 追加作曲', length: 'ゲーム中 ループ（数分）', status: '未確定（カバー案で よいか、追加作曲か）' },
  board: { cls: 'D', area: 'ミニゲーム ボード・テーブル', current: 'puzzle（不採用）', candidates: ['card-1', 'poyo-1', 'card-2'], keepExisting: '不可（不採用。統合までは 保護）', reuse: '別案 カードをひらいて の 流用、または パズルと 同じ 曲（採用曲 デュエル・スタート は 勝負の 曲で にぎやか すぎる 可能性）', needNew: 'どれも 合わなければ 追加作曲', length: 'ゲーム中 ループ（数分）', status: '未確定' },
  sports: { cls: 'D', area: 'ミニゲーム スポーツ', current: 'sports（不採用）', candidates: ['game-1', 'sports-1', 'sports-2'], keepExisting: '不可（不採用。統合までは 保護）', reuse: '採用曲 あそびのはじまり で カバー できる', needNew: 'スポーツ専用に するなら 追加作曲 2案（はれのひグラウンド・かぜをきって）の 評価', length: 'ゲーム中 ループ（30〜90秒）', status: '未確定（カバー案か、追加作曲 2案か）' },
  fishing: { cls: 'D', area: 'ミニゲーム 釣り', current: 'sports（不採用）', candidates: ['explore-2', 'sports-2', 'explore-1'], keepExisting: '不可（不採用。統合までは 保護）', reuse: '別案 そらとうみのさんぽ（水辺）の 流用。採用曲 ふしぎのちか は 地下の 曲で 合いにくい', needNew: '不要（流用候補あり）', length: '待つ 時間が 長い。ゆっくり ループ', status: '未確定' },
  race: { cls: 'D', area: 'ミニゲーム 3D レース・シューティング', current: 'race（未確定）', candidates: ['bgm-race', 'game-1'], keepExisting: '未確定（疾走感は 合う）', reuse: '採用曲 あそびのはじまり で カバー できる', needNew: '不要', length: 'ゲーム中 ループ。いまの race は 1周 13秒', status: '未確定（既存 race を 残すか）' },
  explore: { cls: 'A', area: 'ミニゲーム 3D 探検', current: 'race（未確定。探検には 速すぎる）', candidates: ['explore-1'], keepExisting: '—', reuse: '—', needNew: '不要', length: 'ゲーム中 ループ。ふしぎのちか は 16小節 40秒', status: '確定（ふしぎのちか）' },
  flight: { cls: 'C', area: 'ミニゲーム 3D 飛行・海', current: 'race（未確定。飛行には 速すぎる）', candidates: ['explore-1', 'explore-2'], keepExisting: '既存 race は レースで 検討', reuse: '「3D ゲーム」の 採用曲 ふしぎのちか で カバー。ただし 地下の 曲なので 空・海には 雰囲気が ちがう 可能性 → 別案 そらとうみのさんぽ（この 7本の ために 作った 曲）も 保存', needNew: '不要', length: 'ゲーム中 ループ', status: '採用曲で カバー（雰囲気の 確認を おすすめ）' },
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
