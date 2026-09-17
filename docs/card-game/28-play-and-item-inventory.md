# 28 あそび／あいてむ棚卸し — 初回登録の記録

**2026-09-17追従:** 以下のあいてむ38は初回登録時のsource記録。現行本編の品数ではない。最新のID・名称・効果・退役／追加の対応は[76](76-item-source-v2-followup.md)、現行26の本文は[77](77-current-items-card-text-draft.md)、接続監査は[78](78-current-items-text-audit.md)を正とする。旧38のうち14が現行と共通、24が現行sourceから退役。新12は未登録sourceとして別管理し、登録済み477の履歴を自動加減しない。

## 方針

カード専用イラストは引き続きPROXY。ここでは本編のstable IDをカード候補へ写し、能力の最終確定は全体役割監査後に行う。

## あそび

最新 `games.js` はゲーム生成時に配列位置へ依存しない固定文字列IDを付与し、並べ替え・追加・削除後も同一ゲームを追跡できる設計になっている。カード側もこのIDをsource IDとして使用する。

`randplay.json` の現行監査対象には100件のstable IDが記録されているため、まず100件すべてを `G-<stable-id>` のカード化候補として保持する。

### 現行100 stable IDs

1. stack-snowman
2. stack-themed
3. crane-game-3d
4. road-themed
5. falling-block-puzzle
6. archery-3d
7. breakout-classic
8. pinball-physics
9. dragDecorate-cake
10. dragDecorate-bento
11. haunted-house-3d
12. bowling-3d
13. p3-space
14. p3-drive
15. space-gunner-3d
16. fp-dungeon
17. tilt-maze-3d
18. rhythm-highway-3d
19. race-3d
20. pingpong-3d
21. basketball-3d
22. real-fishing
23. street-fight
24. mini-golf-physics
25. chain-puzzle
26. free-kick-3d
27. sky-shooter
28. roguelike-dungeon
29. jump-quest
30. grand-prix-3d
31. minesweeper-8
32. tower-defense
33. snake-classic
34. push-puzzle
35. billiards-6
36. baseball-batting
37. reversi-6
38. connect-four
39. ring-flight-3d
40. frogger-road
41. animal-shogi
42. ski-jump
43. catapult-castle
44. bubble-shooter
45. air-hockey
46. puzzle-2048
47. submarine-3d
48. darts-board
49. match-3
50. tennis-rally
51. tank-battle
52. bomber-maze
53. blackjack-21
54. hang-glider-3d
55. gomoku-9
56. fruit-slice
57. voxel-mine
58. asteroids-classic
59. pipe-connect
60. sushi-belt
61. doodle-jump
62. picross-5
63. yacht-dice
64. curling-ice
65. jenga-tower
66. line-trace
67. lights-out
68. domino-run
69. track-field
70. halfpipe-skate
71. memory-cards
72. checkers-6
73. plane-landing
74. dot-eater
75. mancala-kalah
76. lunar-lander
77. area-claim
78. beach-volley
79. missile-command
80. sudoku-mini
81. hit-blow
82. road-city
83. takoyaki-grill
84. slide-puzzle
85. sugoroku-race
86. stack-harvest
87. stack-acorn
88. solitaire-klondike
89. shanghai-tiles
90. downhill-mountain
91. downhill-snow
92. fishing-sea
93. stack-sakura
94. road-jungle
95. fishing-deepsea
96. fishing-river
97. road-desert
98. stack-leaves
99. ring-flight-summer
100. curling-winter

### あそびカード設計ルール

- 100本すべてCARD候補として保持するが、第0弾へ100枚入れる意味ではない。
- 同じジェネレーター／操作系でも、地域限定・季節限定など本編上別stable IDなら別候補として保持する。
- ただしカード効果まで機械的な色違いにしない。操作、勝利条件、テーマ、地域／季節性のどれをカード能力へ翻訳するかを記録する。
- `road-themed` 等の内部ランダムテーマは、1 stable IDから複数カードへ水増ししない。
- 本編でstable IDが追加・削除された場合は差分追従する。

## あいてむ

初回登録時の `script.js` では以下の系統を確認した。旧ショップの上位互換IDは新しい1種類へ統合されており、旧IDを独立カードとして復活させない。

### A. 身につけるもの — SHOP_ITEMS 15候補

1. I-flower — おはな
2. I-ribbon — リボン
3. I-bowtie — ちょうネクタイ
4. I-poop1 — トイレットペーパー
5. I-scarf — マフラー
6. I-glasses — サングラス
7. I-energy1 — げんきバンド
8. I-hat — シルクハット
9. I-travel1 — リュックサック
10. I-sleepboost1 — ふかふかまくら
11. I-star — スターバッジ
12. I-bond1 — おともだちバッジ
13. I-partner1 — らぶれたー
14. I-crown — かんむり
15. I-itemluck1 — よつばのクローバー

本編では一度に1つだけ装備する系統。この性質はカード能力設計時の差別化候補にするが、カードゲーム側へ「装備枠」を自動導入しない。

### B. なおとの報酬 — NAOTO_ITEMS 4候補

1. I-naoto_charm — なおとのおまもり
2. I-naoto_lantern — なおとのランタン
3. I-naoto_ring — なおとのリング
4. I-naoto_crown — なおとのかんむり

現行本編では購入式ではなくENDING_TIERS達成報酬として同期され、SHOP_ITEMSと違って複数が永続効果を持てる。この特殊性をカード側の役割候補として保持する。

### C. つかいきり — CONSUMABLE_ITEMS 11候補

1. I-c_coin2 — ラッキーコイン
2. I-c_safety — スコアほけん
3. I-c_mgsmall — やる気のおまもり
4. I-c_mgbig — 大成功のおまもり
5. I-c_sickshield — びょうきよけのおふだ
6. I-c_growth — せいちょうドリンク
7. I-c_courtsmall — こいのおまもり
8. I-c_courtbig — こいの大おまもり
9. I-c_breakhalf — なかなおりのおまもり
10. I-c_breakfull — きずなのおまもり
11. I-c_travel — たびのおまもり

本編では購入時／次の特定行動時に一度だけ働く。カードゲームでは「あいてむ」として扱い、即時効果・待機効果・使い切りのどの表現が既存ルールに最も自然かを後の横断監査で決める。

### D. おたのしみ — FUN_ITEMS 7候補

1. I-fun_candy — キャンディ
2. I-fun_bubbles — しゃぼんだま
3. I-fun_balloon — ふうせん
4. I-fun_fireworks — はなび
5. I-fun_camera — カメラ
6. I-fun_musicbox — オルゴール
7. I-fun_surprise — びっくりばこ

本編では「おたのしみ」として独立した遊び・会話演出を持つ。カード種類は既存7種類の「あいてむ」を維持し、新たに「おたのしみ」種類を増やさない。

### E. ごほうび — RECOVERY_ITEMS 1候補

- I-reward — ごほうび

現行定義はデートや旅を特別な思い出にするspecial reward。カード化候補として保持するが、汎用名で他カードと意味が衝突しやすいためHOLD。カード名・役割は横断監査で決める。

## 現時点のあいてむ候補数

SHOP 15 + NAOTO 4 + CONSUMABLE 11 + FUN 7 + RECOVERY 1 = **38候補**。

旧 `flower2/3`、`ribbon2/3` 等は現行ロード時に基礎IDへ統合される互換データなので候補へ含めない。旧回復ごほうび群も現行で統合・削除されるものは独立候補にしない。

## 全体プール暫定数

27までの311候補 + あそび100 + あいてむ38 = **449候補**。

ここには、その他のできごと候補はまだ完全には含まれていない。

## 次

1. 最新 `script.js` / WORLD_MASTER / 本編イベント群から「できごと」に翻訳可能な現行イベントを抽出する。
2. ログ文・単なる状態変化を機械的に1枚ずつカード化せず、独立した出来事として意味のある単位へまとめる。
3. 既存の伝説5件＋なおとを核に、できごと全体の役割地図を作る。
4. その後、既存カブト／クワガタ16枚を新カードID体系へ移植する。
