import fs from 'node:fs';import {POOLS} from '../../prototypes/life-sugoroku/tournament-v4.mjs';
const baseline=JSON.parse(fs.readFileSync('docs/life-sugoroku/V5-MINIGAME-AUDIT.json','utf8'));
const groups={
 'タイミング':['stack-themed','stack-snowman','stack-harvest','stack-acorn','stack-sakura','stack-leaves','takoyaki-grill','baseball-batting','ski-jump','darts-board'],
 'ドラッグ・なぞり':['dragDecorate-cake','dragDecorate-bento','line-trace','fruit-slice'],
 '方向移動・回避':['road-themed','road-city','road-jungle','road-desert','frogger-road','snake-classic','doodle-jump','jump-quest','downhill-mountain','downhill-snow','haunted-house-3d','fp-dungeon','roguelike-dungeon','dot-eater','area-claim','bomber-maze','ring-flight-3d','ring-flight-summer','submarine-3d','p3-space','hang-glider-3d'],
 '反射・球技':['air-hockey','breakout-classic','pingpong-3d','tennis-rally','beach-volley'],
 '物理・軌道':['crane-game-3d','pinball-physics','bowling-3d','archery-3d','tilt-maze-3d','mini-golf-physics','real-fishing','basketball-3d','free-kick-3d','billiards-6','catapult-castle','curling-ice','curling-winter','jenga-tower','halfpipe-skate','domino-run','plane-landing','lunar-lander','fishing-sea','fishing-deepsea','fishing-river'],
 'パズル':['falling-block-puzzle','chain-puzzle','push-puzzle','minesweeper-8','bubble-shooter','puzzle-2048','match-3','picross-5','pipe-connect','lights-out','sudoku-mini','hit-blow','shanghai-tiles','slide-puzzle'],
 '盤上・カード':['reversi-6','animal-shogi','connect-four','gomoku-9','blackjack-21','yacht-dice','checkers-6','mancala-kalah','solitaire-klondike','sugoroku-race'],
 '記憶・選択タップ':['memory-cards','sushi-belt'],
 'シューティング':['space-gunner-3d','sky-shooter','tank-battle','asteroids-classic','missile-command'],
 'レース':['p3-drive','race-3d','grand-prix-3d'],
 'リズム':['rhythm-highway-3d'],
 '連打・複合操作':['track-field','voxel-mine','street-fight','tower-defense'],
};
const families=Object.fromEntries(Object.entries(groups).flatMap(([family,ids])=>ids.map(id=>[id,family])));
const blocker={
 'タイミング':'既存の可視目標・反応遅延基盤は再利用可能。ゲーム固有の発射/投球判断と正式終了を未検証',
 'ドラッグ・なぞり':'共通ドラッグは再利用可能。対象の配置条件・重なり判定・DOM操作の記録を未検証',
 '方向移動・回避':'方向入力は共通化済み。障害物の可視観測、移動速度、アクションボタンの専用判断が未実装',
 '反射・球技':'共通追跡ドラッグは再利用可能。球軌道・返球タイミング・相手側ルールの専用判断が未実装',
 '物理・軌道':'力・角度・姿勢・3D投影または釣りの張力判断が未実装。無作為入力では採用しない',
 'パズル':'盤面の可視観測と合法手探索が未実装。ブロック/パイプ/マッチ群から次段階で検証',
 '盤上・カード':'合法手生成・相手手番・勝敗比較・60秒内の正式終了が未検証',
 'シューティング':'照準・弾道・回避・アクションボタンを組み合わせる判断が未実装',
 'レース':'道路投影・曲率・速度制御の共通観測と操作が未実装',
 'リズム':'レーン/拍の可視観測と入力時刻の評価が未実装',
 '連打・複合操作':'連打だけではルールを満たさない。資源・対象・アクションボタンの判断が未実装',
};
const rows=baseline.rows.filter(r=>r.pool==='game').map(r=>{
 const supported=POOLS.game.includes(r.id),family=families[r.id];if(!family)throw Error('unclassified '+r.id);
 const durationBlocked=r.baseSeconds.some(n=>n>=60);
 return {...r,family,adoption:supported?'V6対応':'保留',cpu:supported?'可視描画＋合法pointer入力、初級/中級':r.cpu,resume:supported?'4席・途中入力・結果/報酬境界の自動検証済み':'未検証',reason:supported?null:(durationBlocked?'原本の設定が60秒以上（終了演出もある）。時間/ルールを変更せず正式終了する条件の確認が必要。':'')+blocker[family]};
});
if(rows.length!==100||new Set(rows.map(r=>r.id)).size!==100)throw Error('normal catalog integrity');
const result={base:'373f5f7d32f2af133de1b7c9c6b0e1363a0e9aeb',source:'V5 audit reused; games.js and quick.js latest main blob equal pinned source',counts:{normal:POOLS.game.length,quick:POOLS.quick.length},scope:'static classification of all100; only selected15 have execution verification; iPhone Safari hardware untested',rows};
fs.writeFileSync('docs/life-sugoroku/V6-MINIGAME-AUDIT.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync('docs/life-sugoroku/V6-MINIGAME-AUDIT.md','# VERSION 6 正式通常ゲーム監査\n\nV5監査を継承。100種を再監査したものではなく操作群を追加分類。採用15/100、クイック45/50。元ソースと最新mainのゲームblobは一致。実機Safari未検証。\n\n|正式ID|名前|操作群|状態・理由|\n|---|---|---|---|\n'+rows.map(r=>`|${r.id}|${r.name}|${r.family}|${r.reason||'対応（正式callback・4席・保存復帰・Chrome）'}|`).join('\n')+'\n');
console.log(result.counts);
