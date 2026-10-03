# なおとっち ゲーム／クイックゲーム 全体監査（2026-10-03）

- 正本: `Naoto214/naotocchi` main `0b0a6b3`（Merge PR #368）。GitHub remote から fresh fetch して確認。
- この監査では **コードを一切変更していない**。新規ゲームの追加、削除、台詞の実装はしていない。
- 根拠はコードと、テストの実行結果。過去の監査文書・README・MASTER_SPEC は参考として扱い、コードと食い違うものはその旨を書いた（→ 付録 integration §9）。
- 各ゲームの詳細（16項目）、クイック50本の表、本体接続の監査は付録フォルダ `docs/audit/minigame-portfolio-audit-2026-10-03/` にある。
  - `games-A`〜`games-G`: 通常100本の個別監査。行番号は games.js のもの
  - `quick-games-50.md`: クイック50本とラン構造
  - `integration-main-game.md`: 起動経路・報酬・キャラ反応・記録・設定・テスト・その他コンテンツ・過去文書
- 個別監査は分担して読み取った。そのため分類の判定の厳しさに、多少のばらつきがありうる。本書の中で重要な指摘は、統合者がコードを直接開いて確かめた（✔印）。
- **総合点のランキングはつけていない。**

---

## 0. 結論（先に要点）

1. **通常ゲームは100本ある。ただし、遊びとして独立しているのは約85本。** 100本の内訳は、基本86＋地域10＋季節4。生成関数（ゲームエンジン）は85種類。
   - road系6本・stack系6本・釣り4本・リングフライト2本・カーリング2本は、同じ生成関数の「見た目違い」。プレイヤーの判断と操作は同じ。
2. **クイックは50本ある。通常ゲームの縮小版ではなく、別の役割を果たしている。** すぐ始まり、約80秒で終わる。題材の多くはお世話（ごはん・うんち・くすり・なでる）で、世界観との接続はむしろ通常100本より強い。
3. **最大の弱点は「なおとっちらしさ」の薄さ。** 100本のどれを遊んでも、キャラの反応は点数「70以上／30未満」の2種類の共通台詞だけ。30〜69点では何も言わない。ゲーム・カテゴリ・自己ベスト・初S・回数に応じた反応はゼロ。games.js の中で仲間・恋人を参照するゲームは0本。
4. **既存ゲームの品質のばらつきは「数を増やす」より「磨く」で解決できる。** 分類の結果は次のとおり。
   - 小改善でかなり良くなる: 44本
   - 役割整理が必要: 29本（その大半は地域・季節版や近接ペア）
   - 大きな改善余地: 9本
   - 仕様確認が必要: 7本
   - 現状でも役割が明確: 11本
5. **新規ゲームを大量に追加する必要はない。** 遊びの種類として本当に欠けているのは、「性格が出る選択」「仲間との協力」「キャラ自身を対象にする遊び（通常枠）」程度。いずれも既存の改善や仕組みの修復で埋められる可能性が高い（→ M, N）。
6. **改善より先に直すべき不整合がある**（→ O の Phase 0）。性格（traitCounts）を増やす経路が存在しない ✔、時間切れの引き分けが負けより高得点になる ✔、説明と実装が食い違う、などの十数件。

---

## A. 最新正本から確認したゲーム全量一覧

### A-1. 数（実数）

| 区分 | 数 | 根拠 |
|---|---|---|
| 通常ゲーム（抽選プール） | **100** | `buildMinigamePool()` script.js:15876-15882 = MINIGAMES 86 + REGION_MINIGAMES 10 + SEASONAL_MINIGAMES 4。smoke-test は「minigames started: 100」で、全本起動を確認 ✔ |
| ├ うち生成関数（エンジン）の種類 | 85 | games.js の `make*Game` を集計 ✔ |
| └ 判断と操作が同一の派生 | 15本 / 5グループ | road×6, stack×6, fishing×4, ringFlight×2, curling×2 |
| クイックゲーム（マイクロゲーム） | **50** | quick.js の `def({id:…})` が50個 ✔ |
| ├ クイックの遊び方（ラッパー） | 2 | `quick-run`（混合20本）と `quick-solo`（1本を10回）。ゲーム数には数えない |
| その他ゲーム相当 | **1** | うそつきしょうぶ（duel。コード交換式の非同期2人対戦。読み合い・ブラフ）。抽選プールの外 |
| 境界が曖昧 | 1 | めぐる（meguru.js。探索コンテンツで、スコアも失敗もない） |
| 数えないもの | ― | じゃれる、たまご、へんしん選択、デート、きゅうあい、ラッキーコイン（確率のみ）、シールちょう。カードゲームは docs だけで、ランタイム実装はない |

- 「100本」という数は、テスト（tests/minigame-lifecycle-test.cjs:143、dialogue-test.js:1089）と UI 文言（「100本コンプリート」script.js:12220）に固定値で入っている。
- 地域版・季節版は「その場所でしか遊べない」わけではない。常に抽選候補に入っていて、現在地・現在季節のときだけ ×1.45 / ×1.25 と追加チケット1枚で出やすくなる。

### A-2. 通常100本（ID・表示名・カテゴリ）

基本86本（MINIGAMES）:

| ID | 表示名 | category | ID | 表示名 | category |
|---|---|---|---|---|---|
| road-themed | ロードラン | road | p3-space | うちゅうフライト3D | perspective3d |
| p3-drive | ハイウェイ3D | perspective3d | stack-themed | つみあげタワー | stack |
| stack-snowman | ゆきだるまタワー | stack | falling-block-puzzle | ブロックパズル | fallingBlock |
| crane-game-3d | クレーンゲーム | craneGame | pinball-physics | ピンボール | pinball |
| haunted-house-3d | おばけやしき3D | hauntedHouse | bowling-3d | ボウリング | swipeThrow |
| archery-3d | アーチェリー | swipeThrow | breakout-classic | ブロックくずし | breakout |
| dragDecorate-cake | ケーキデコレーション | dragDecorate | dragDecorate-bento | おべんとうづくり | dragDecorate |
| fp-dungeon | ダンジョン3D | firstPersonDungeon | race-3d | カーレース3D | roadRace |
| rhythm-highway-3d | リズムハイウェイ | rhythmHighway | tilt-maze-3d | たまころがし迷路 | tiltMaze |
| space-gunner-3d | スペースガンナー | spaceGunner | mini-golf-physics | ミニゴルフ | miniGolf |
| real-fishing | ほんかくさかなつり | realFishing | basketball-3d | バスケ3D | basketball |
| pingpong-3d | 卓球3D | pingPong | chain-puzzle | れんさパズル | chainPuzzle |
| street-fight | かくとうバトル | streetFight | free-kick-3d | フリーキック | freeKick |
| tower-defense | タワーディフェンス | towerDefense | roguelike-dungeon | ローグライク | roguelike |
| grand-prix-3d | グランプリ | grandPrix | sky-shooter | スカイシューター | skyShooter |
| jump-quest | ジャンプクエスト | jumpQuest | push-puzzle | そうこばん | pushPuzzle |
| reversi-6 | オセロ | reversi | billiards-6 | ビリヤード | billiards |
| animal-shogi | どうぶつしょうぎ | animalShogi | minesweeper-8 | マインスイーパー | minesweeper |
| snake-classic | スネーク | snake | baseball-batting | やきゅう | baseball |
| ring-flight-3d | リングフライト3D | ringFlight | bubble-shooter | バブルシューター | bubbleShooter |
| catapult-castle | カタパルト | catapult | connect-four | コネクトフォー | connectFour |
| puzzle-2048 | 2048 | twenty48 | frogger-road | かえるのおうちがえり | frogger |
| ski-jump | スキージャンプ | skiJump | air-hockey | エアホッケー | airHockey |
| submarine-3d | サブマリン3D | submarine | match-3 | フルーツマッチ3 | matchThree |
| gomoku-9 | 五目ならべ | gomoku | tank-battle | タンクバトル | tankBattle |
| tennis-rally | テニス | tennis | picross-5 | ピクロス | picross |
| darts-board | ダーツ | darts | hang-glider-3d | ハンググライダー3D | hangGlider |
| bomber-maze | ボンバー | bomber | blackjack-21 | ブラックジャック | blackjack |
| pipe-connect | パイプつなぎ | pipeConnect | fruit-slice | フルーツ斬り | fruitSlice |
| track-field | りくじょう | trackField | voxel-mine | ボクセルマイニング | voxelMine |
| sushi-belt | かいてんずし | sushiBelt | asteroids-classic | アステロイド | asteroids |
| yacht-dice | ヨット | yachtDice | lights-out | ライツアウト | lightsOut |
| doodle-jump | ぴょんぴょんジャンプ | doodleJump | curling-ice | カーリング | curling |
| jenga-tower | ジェンガ | jenga | line-trace | せんなぞり | lineTrace |
| checkers-6 | チェッカー | checkers | memory-cards | しんけいすいじゃく | memoryCards |
| halfpipe-skate | ハーフパイプ | halfpipe | domino-run | ドミノたおし | dominoRun |
| sudoku-mini | ナンプレ | sudoku | mancala-kalah | マンカラ | mancala |
| plane-landing | ひこうき着陸 | planeLanding | dot-eater | ドットイーター | dotEater |
| missile-command | ミサイルコマンド | missileCommand | area-claim | じんとり | areaClaim |
| solitaire-klondike | ソリティア | solitaire | hit-blow | ヒット&ブロー | hitBlow |
| lunar-lander | ルナランダー | lunarLander | shanghai-tiles | 上海 | shanghai |
| beach-volley | ビーチバレー | beachVolley | slide-puzzle | スライドパズル | slidePuzzle |
| sugoroku-race | すごろく | sugoroku | takoyaki-grill | たこやきやさん | takoyaki |

地域10本（REGION_MINIGAMES）: road-city（とかいラン）、stack-harvest（しゅうかくタワー）、stack-acorn（きのみタワー）、downhill-mountain（やまの岩場のぼり ※生成関数は makeRockClimbGame）、downhill-snow（ゆきのゲレンデ）、fishing-sea（うみのさかなつり）、fishing-deepsea（しんかいフィッシング）、fishing-river（みずべのさかなつり）、road-jungle（ジャングルラン）、road-desert（さばくラン）。

季節4本（SEASONAL_MINIGAMES）: stack-sakura（春）、ring-flight-summer（夏）、stack-leaves（秋）、curling-winter（冬）。

### A-3. クイック50本

eat, dodge, catch, mash, clean, stop, swipe, medicine, find, charge, partner, season, jump, pull, pet, button, flames, coins, cliff, throw, knock, wait, flee, mole, slice, guard, bento, spin, lift, tickle, balance, color, count, bigger, odd, order, holdlid, umbrella, shutter, sort, rhythm, trace, pushbox, fish, stack, pair, doors, sneak, feather, weather（指示文・入力・判断の詳細は付録 quick-games-50 §2）。

---

## B. 分類（通常／クイック／その他）

| 分類 | 役割（実装から読み取れるもの） | 育成への接続 |
|---|---|---|
| **通常ゲーム 100** | 15〜90秒のしっかりした1本。点数（0〜100）で育成が動く | ごきげん、げんき −12、**へんしんメーター +25（姿が変わる唯一の手段）**、せいちょう／おとろえ、コイン 0/30/60、日次チャレンジ、Sランクブースト、なかま勧誘 |
| **クイック 50** | 3〜4秒の指示ゲームを最大20本続ける（約80秒）。説明カードなし、げんき消費なし | 育成には不干渉。混合20/20完走だけ100コイン。ただし `minigameScoreSum/Count`（れんくんの出現条件）と `minigamesPlayed` 系の実績は動く（README の「育成に影響しない」と厳密には食い違う。→ integration §2.3） |
| **その他: うそつきしょうぶ** | 非同期の対人ブラフ | コインを賭ける。性格集計は別系統の `duelTraits` |
| **境界: めぐる** | 探索・発見 | スコアなし |

通常とクイックは、育成への接続（通常は育成を動かし、クイックは遊びに閉じている）とテンポで、はっきり役割が分かれている。**両者の役割分担は成立している。**

---

## C. 遊びの種類・操作・認知要素のマップ

各ゲームの「プレイヤーが毎秒または毎手やっていること」（付録の10番目の項目）をもとに、主な判断で分類した。

| 遊びの系統（主な判断） | 通常ゲーム | クイック |
|---|---|---|
| 前方から来る物の回避・取得（レーン・擬似3D前進） | road×6, race-3d, grand-prix-3d, submarine-3d, hang-glider-3d, ring-flight×2, downhill-snow, frogger-road | dodge, coins, jump |
| 照準・射撃 | space-gunner-3d, sky-shooter, asteroids-classic, missile-command, tank-battle | guard |
| 1ショットの物理エイム（強さ・角度） | bowling-3d, archery-3d, mini-golf, billiards-6, basketball-3d, free-kick-3d, darts-board, catapult-castle, curling×2, bubble-shooter | throw |
| 推力・姿勢の連続制御（着陸・滑空） | lunar-lander, plane-landing, ski-jump, halfpipe-skate | balance |
| 打ち返し・リアルタイム対戦 | pingpong-3d, tennis-rally, air-hockey, beach-volley, baseball-batting, breakout-classic, pinball-physics | ― |
| 格闘の読み合い | street-fight | ― |
| 1点のタイミング | stack×6, downhill-mountain, crane-game-3d | stop, stack, cliff, shutter, charge, button |
| 待つ→やり取り | real-fishing 系×4 | fish, umbrella, wait |
| 並行タスク管理 | takoyaki-grill, sushi-belt | ― |
| リズム | rhythm-highway-3d | rhythm, knock |
| 迷路・探索 | fp-dungeon, haunted-house-3d, tilt-maze-3d, dot-eater, roguelike-dungeon, voxel-mine | ― |
| 陣取り・リスク選択 | area-claim | ― |
| 横アクション・上昇 | jump-quest, doodle-jump, snake-classic | ― |
| 落ち物・盤面パズル | falling-block-puzzle, chain-puzzle, match-3, puzzle-2048, shanghai-tiles | ― |
| 論理パズル | minesweeper-8, picross-5, sudoku-mini, hit-blow, lights-out, pipe-connect, push-puzzle, slide-puzzle | ― |
| 対AIの盤上ゲーム | reversi-6, animal-shogi, connect-four, gomoku-9, checkers-6, mancala-kalah | ― |
| 運・確率の判断 | blackjack-21, yacht-dice, sugoroku-race, （solitaire-klondike の配り） | ― |
| 記憶 | memory-cards, dragDecorate-bento | （pair は記憶要素なし） |
| なぞり・配置の精密操作 | line-trace, dragDecorate-cake, domino-run, jenga-tower | trace, pull, lift, pushbox, spin |
| 反射の選別 | fruit-slice | slice, mole, eat, flee, swipe, sort |
| 連打 | track-field | mash, tickle, flames |
| 指示語→絵の選択（知識・観察） | ― | color, season, weather, partner, bigger, find, odd, pair, count, order, doors |
| お世話・キャラ自身への操作 | ― | clean, pet, medicine, sneak, lift, tickle, spin, catch |
| 経営・防衛の短期戦略 | tower-defense | ― |

**認知・操作タグの分布から読めること**
- 通常100本で厚いのは、物理エイム（約13本）、擬似3Dの前進回避（約13本）、対AI盤上（6本）、論理パズル（8本）。
- 薄いのは、記憶（実質1本。bento は配置が固定なので2回目から記憶にならない）、リズム（1本。ビート音がなく、空打ちに減点もない）、観察・間違い探し（0本。クイックの odd のみ）、協力（0本）、知識・言葉・性格選択（0本）。
- **クイックは「指示語→選択」と「お世話」の系統を独占している。** 通常ゲームと系統の重なりは小さい。

---

## D. 類似ゲーム群と、それぞれ差別化できているか

### D-1. 同じ生成関数の派生（パラメータを確認済み ✔）

| 群 | 本数 | 違い | 判断と操作 | 判定 |
|---|---|---|---|---|
| road系（road-themed, p3-space, p3-drive, road-city, road-jungle, road-desert） | 6 | 絵文字・背景色・自機の絵だけ。`makeRoadGame` には `duration` 引数があるが、どの派生も渡していない。p3-space と road-themed の sky テーマは、アイテムまでほぼ同じ | **完全に同一** | 差別化できていない。カテゴリが road と perspective3d に分かれているため、「同カテゴリ3連続回避」も効かない |
| stack系（stack-themed, stack-snowman, stack-harvest, stack-acorn, stack-sakura, stack-leaves） | 6 | blockEmoji・palette だけ。初期条件も毎回同じ | **完全に同一** | 差別化できていない |
| 釣り（real-fishing, fishing-sea, fishing-deepsea, fishing-river） | 4 | sea は **title 以外まったく同じ** ✔。deepsea は魚の価値と引きが強い（実質的な難度差あり）。river は魚の種類だけで、タイトルの「流れを読もう」に当たる水流の仕組みはない | 同一（deepsea のみ難度差） | sea は差別化なし。deepsea と river は「判断の差」が1つ要る |
| リングフライト（ring-flight-3d, ring-flight-summer） | 2 | 空や海の色、🐚コイン、🐬の飾り、タイトル | 同一 | 差別化なし |
| カーリング（curling-ice, curling-winter） | 2 | stoneCount 3→4 とタイトル。制限時間は同じ45秒で、冬版の8投が時間内に収まらない可能性がある（実機で要確認） | ほぼ同一 | 差別化なし。不具合の候補あり |
| テーマ乱択（race-3d, rhythm-highway-3d, tilt-maze-3d, space-gunner-3d, street-fight, downhill-snow） | 各1 | 見た目だけ。「こおり」のたまころがしは滑らず、street-fight のライバル3種は性能が同じ | ― | 1本としての計上は正しい。テーマが挙動の差を約束しているのに果たしていない |

### D-2. 別エンジンだが判断が近いペア

| ペア | 共通点 | 違い | 判定 |
|---|---|---|---|
| tank-battle ⇔ bomber-maze | 11×11マス、敵を全滅、壁を壊す | 射線で撃つか、爆風を置くか | **近い。** 役割の整理が必要 |
| submarine-3d ⇔ hang-glider-3d（⇔ road系・ring-flight） | 擬似3Dで前進して避ける・取る | 酸素か、高度・気流の資源か | 資源管理を前面に出さないと差が立たない |
| plane-landing ⇔ lunar-lander | 降下速度と姿勢の制御で着陸 | 横から見た滑空か、真上からの逆噴射か | 単体の完成度はどちらも高い。両方残すなら役割の言語化が必要 |
| haunted-house-3d ⇔ fp-dungeon | 一人称の迷路 | おばけ屋敷は「鍵を取ったら逃走」に反転する | 逃走に役割を絞れば別物になる |
| connect-four ⇔ gomoku-9（⇔ reversi, checkers） | 対AIで「並べる・塞ぐ」 | 重力の有無、盤の大きさ | connect-four と gomoku の判断はほぼ同じ |
| race-3d ⇔ grand-prix-3d ⇔ p3-drive | 疑似3Dのロード走行 | ライバル車の有無、周回 | race は「1人タイムアタック」に特化すれば差が出る |
| falling-block ⇔ chain-puzzle | 落ち物 | ライン消しか、4つ連結か | 別物と言えるが、どちらも28秒で浅い |
| space-gunner ⇔ sky-shooter ⇔ missile-command | 照準・射撃 | 攻撃予告への優先順位か、弾幕回避か、迎撃予測か | **別物と言える**（判断の中身が違う） |

### D-3. 似ていても別物と判断したもの（統合不要）

- 物理エイム系（bowling / archery / golf / billiards / basketball / free-kick / darts / curling / catapult）: どれも1ショットの調整だが、「何を読むか」（ピンの連鎖、風、反射、手玉の位置、キーパー、揺れ、ハウスの石、柱の崩れ）がそれぞれ違う。
- 打ち返し系（pingpong / tennis / air-hockey / beach-volley）: 操作の自由度（先回り、マレットの直接操作、3段階のタッチ）が違う。
- 論理パズル8本: 推論の種類（数字の安全推論、行列のヒント、数独の制約、色の推理、偶奇の順序、接続、押し順、置換）がすべて違う。
- クイックの「指示語→絵の選択」9本（eat, color, season, weather, partner, bigger, find, odd, pair）: 入力は同じ1タップだが、判断の中身が違う。

### D-4. クイック内の重複（付録 quick §4）

- 「範囲に入ったら1タップ」: stop / stack / cliff / shutter。stop と stack は絵柄以外ほぼ同じ。
- 「待って上スワイプ」: umbrella / fish。
- 「一方向へのドラッグ距離」: pull / lift / pushbox。

---

## E. 現状でも役割が明確なゲーム

**通常（11本）**: downhill-snow, real-fishing, jump-quest, frogger-road, air-hockey, pipe-connect, sushi-belt, asteroids-classic, lights-out, lunar-lander, takoyaki-grill

| ゲーム | 役割が明確な理由 |
|---|---|
| real-fishing | プールで唯一の「待つ→やり取り」型。1ボタンの意味が段階ごとに変わる。岸にキャラがいる |
| takoyaki-grill | 並行して焼き加減を管理する。判定と表示が一致し、ease の効き方も明快。食べ物の題材なので、キャラとの接続余地が最も大きい |
| frogger-road | キャラが主役。ルールと反復性が成立している |
| jump-quest | 唯一の横スクロールアクション。ステージを生成する |
| lunar-lander | 物理の操縦型。ease が判定と表示の両方に効いている |
| downhill-snow | 連続ステアリング＋ジャンプ。road系とはっきり違う |
| pipe-connect | 盤面を生成するパズルとして機能している |
| air-hockey / asteroids / sushi-belt / lights-out | 直接操作の対戦、慣性シューティング、注文を見て取る観察、短い順序パズル。それぞれ単独の役割を持つ |

**クイック（27本）**: eat, dodge, clean, swipe, medicine, charge, jump, pet, button, flames, coins, throw, wait, flee, mole, slice, guard, spin, tickle, balance, bigger, odd, order, sort, trace, pair, feather

---

## F. 小改善で大きく良くなりそうなゲーム（通常44本）

小改善の中身は、主に次のパターンに集約できる。同じパターンはまとめて直せる。

| 改善パターン | 対象（例） |
|---|---|
| **時間と目標の釣り合いを直す**（目標に届かない、または「みじかめ」設定で達成不能になる） | breakout（30秒で3面は無理）, dot-eater（28秒で全部食べるのは無理）, grand-prix（みじかめでは2周不可）, sky-shooter（ボス出現が15秒固定）, hit-blow（50秒）, slide-puzzle（4×4で60秒）, snake（28秒）, puzzle-2048（1024に届かない）, beach-volley, missile-command |
| **スコア式を直す**（引き分けが負けより高い、上限に届かない、失敗でも高い） | gomoku-9 ✔ / animal-shogi / connect-four（時間切れ50〜55 > 負けの上限45）, minesweeper（最高96）, fp-dungeon（宝箱0個で脱出しても52点 > 時間切れで宝箱3個の45点）, ski-jump（無操作で平均45〜60点）, basketball（予測輪が親切すぎる） |
| **残り時間の表示を足す** | pingpong, roguelike, grand-prix（ほかに TD, そうこばん, オセロ, checkers, mancala, curling。HUD に時間がないのは計8本以上） |
| **誤操作や判定のずれを直す** | mini-golf（どこをタップしても打てる）, baseball（早押しでその場で空振り、キャンバスに触れるだけでスイング）, pingpong（アウトのボールが打った側の得点）, fruit-slice（指を離さないとコンボが際限なく増える）, rhythm（空打ちに減点がない）, bubble-shooter（降下時に泡が消える・ずれる）, picross（間違えると自動で✕が付き、答えが分かる） |
| **乱数・生成を足して覚えゲーを防ぐ** | dragDecorate-bento（具の配置が固定）, billiards（ラック固定）, crane（景品配置）, picross（問題数）, archery（照準が風込みの着弾点を示す → 風を読む必要がない） |
| **テーマに挙動の差を1つ足す** | tilt-maze（こおりで滑る）, street-fight（ライバルの性能差）, rhythm（ビート音） |
| **難易度の配線漏れを直す** | bowling / memory / halfpipe / voxel-mine（難易度を取得しているが使っていない）。ageDifficulty を使わないのは8本（cake, bento, falling-block, 2048, picross, blackjack, yacht, solitaire）。blackjack と yacht は難易度設定に一切反応しない |
| **絵柄をなおとっちに寄せる**（中身はそのまま） | memory-cards, slide-puzzle, area-claim（背景の絵）, line-trace（図形）, dot-eater（自機）, missile-command（守る町） → J を参照 |

対象の全リスト: bowling-3d, archery-3d, breakout-classic, dragDecorate-bento, fp-dungeon, falling-block-puzzle, crane-game-3d, rhythm-highway-3d, tilt-maze-3d, mini-golf-physics, basketball-3d, pingpong-3d, street-fight, free-kick-3d, roguelike-dungeon, grand-prix-3d, sky-shooter, billiards-6, animal-shogi, minesweeper-8, snake-classic, baseball-batting, bubble-shooter, puzzle-2048, ski-jump, match-3, gomoku-9, tennis-rally, picross-5, darts-board, fruit-slice, track-field, voxel-mine, yacht-dice, doodle-jump, line-trace, memory-cards, dot-eater, missile-command, area-claim, hit-blow, shanghai-tiles, beach-volley, slide-puzzle（各ゲームの理由は付録の15番目の項目）。

**クイック（13本）**: catch, mash（Lv5 で毎秒約9.4回の連打が必要）, stop（Lv5 で窓が約75ms）, find, season, knock（正解後も待たされる）, bento, color, holdlid, shutter, rhythm, sneak, weather。

---

## G. 大きな改善余地があるゲーム（通常9本）

| ゲーム | 原因 | 方向性（案） |
|---|---|---|
| sugoroku-race | 説明は「ねらって止めよう」だが、目は85msごとにランダムに変わる ✔。実質は運だけ | 目を順番に巡回させて遅くする。マスで選択肢を出す |
| blackjack-21 | 運の比重が大きい。難易度に反応しない。基礎点50 | 賭け額の選択など、判断を足す |
| jenga-tower | 安定度45%以上なら崩れる確率が0。決定論的な最適解がある | ブロックごとの摩擦・重さに乱数。抜く量をドラッグにする |
| domino-run | 点線をタップするだけ。説明にある「余り手持ちボーナス」が点数に入っていない | 向き・間隔の判断、手持ちの不足 |
| halfpipe-skate | ポンプは押しっぱなしが最適。1回転を続けるだけで100点 | ポンプのタイミング判定、得点上限の見直し |
| solitaire-klondike | 90秒では完成にほとんど届かない | 目標を「台に○枚」にする、解ける配りを保証する |
| push-puzzle | 固定4面なので、すぐ解答の暗記になる | 逆再生による生成、面の追加 |
| catapult-castle | ステージ2つが固定で、乱数がない | 配置の乱数化 |
| dragDecorate-cake | 指示どおりにドラッグするだけ。乱数がない | 注文をランダムにする（キャラの好物）、見栄えの評価 |

---

## H. 役割整理が必要なゲーム（通常29本）

1. **同じ生成関数の派生（D-1）**: road系6、stack系6、fishing-sea/deepsea/river、ring-flight-3d/summer。
   - 選択肢は2つ。(a) 各地域版・季節版に「判断の差」を1つずつ足す（例: 川は流れでうきが動く、深海は深さを選ぶ・魚影が見えにくい、砂漠は蜃気楼の偽アイテム、さくらは花びらが風で揺れる）。(b) 見た目のバリエーションとして1本にまとめる。
   - (b) を選ぶと「100本」の数え方が変わる。テスト・UI・実績の文言に影響するため、**人間の判断が必要**。本監査は、まず (a) の小さな差を優先候補とする。
2. **近接ペア（D-2）**: tank-battle と bomber-maze、submarine-3d と hang-glider-3d、plane-landing と（lunar-lander）、haunted-house-3d と（fp-dungeon）、connect-four と（gomoku-9）、race-3d と（grand-prix-3d）、chain-puzzle と（falling-block）、space-gunner-3d。
3. **対AI盤上群**: reversi-6、checkers-6。6本ある盤上ゲームが、短時間の1局で何を味わわせるかを決める必要がある。例: AIに性格（仲間キャラ）を付ける、詰め問題にする。

**削除・統合は推奨しない**（似ているだけで削らない、という方針に合わせる）。ただし (1) の fishing-sea と ring-flight-summer は、現状では見た目の複製にすぎない。最初に手を入れる対象にする。

**仕様確認が必要（7本）**: downhill-mountain（説明は12段、実装は10段）、pinball-physics（目標点と時間の釣り合いは実測が要る）、tower-defense（時間切れで勝ち扱い。ウェーブ数のコメントと実装が不一致）、curling-ice / curling-winter（時間表示がない、冬版8投が45秒に収まらない可能性）、sudoku-mini（解が1つに決まる保証がなく、筋の通った別解がミス扱いになりうる）、mancala-kalah（時間内に終局するか）。

**クイックの役割整理（7本）**: pull, lift, pushbox, umbrella, fish, cliff, stack。**クイックの仕様確認（3本）**: partner（恋人がいないとき、別の仲間がハズレ選択肢に混ざる）、count / doors（指示文の表示が、最初の一瞬だけ見せる答えと重なる）。

---

## I. クイックゲーム固有の監査結果

| 観点 | 結果 |
|---|---|
| 開始までの速さ | **理想的。** noIntro で説明カードを出さず、1フレーム目で指示が出る。げんき制限もない |
| 説明なしで理解できるか | 50本中42本が「動詞1語＋絵」で通じる。迷いやすいのは stop / find / partner / throw / balance / stack と、似た語の組（とめろ／とまれ） |
| 短時間の手応え | ○/✕ が全画面に出て、きれいに区切れる。ただし成功演出は全ゲーム共通の「○ できた!」だけ |
| テンポ | 指示600ms、結果520ms でとても速い。例外は knock（正解後も待つ） |
| 失敗後の再挑戦 | 3ライフ制。最終画面に ✔数・最大連続・到達Lv。**どのゲームで失敗したかは表示されない**（集計はしている） |
| 1回でも成立するか | 成立する（最大約80秒） |
| 連続でも成立するか | 成立する。ただし color / weather / season は答えの絵が固定で、数十回で暗記に寄る。Lv6 には到達しない |
| 通常ゲームとの差別化 | **成立している。** 育成に不干渉で、題材はお世話。通常100本と系統がほぼ重ならない（C） |
| 不具合の候補 | 疑問形の指示（こいびとは／いくつ／どっち）が命令調で読まれる ✔（script.js:14529 の voice ラッパーが quick.js:933 の `{question}` を捨てている）。物の速度が px/s 固定なので、画面の高さによって難度が変わる。solo の記録は50本で1枠を共有している |

**結論**: クイックは「すぐ始まり、すぐ終わり、ちょっと笑える」役割をほぼ満たしている。足りないのは「笑える」の後半、つまりキャラの一言と、ゲームごとの成功・失敗の絵。

---

## J. 「なおとっちらしさ」を追加できる候補

### J-1. 現状（コードで確認したもの）
- games.js で仲間・恋人を参照するゲームは **0本**。季節は季節版の登録キーにしか使っていない。食べ物アイコンは cake と bento の2本だけ。
- キャラ絵（currentSprite）が出るのは約31か所（road系、breakout、岩登り、釣り、格闘、ローグ、シューター、ジャンプ、そうこばん、野球、リングフライト、カタパルト、フロッガー、スキージャンプ、doodle、jenga、halfpipe、plane、volley、すごろく など）。ただし年齢・姿・種族によって遊びや台詞が変わることはない。
- ゲーム内のメッセージは実況・説明の調子で、キャラの個性が出るものはない。
- 終了後の反応（integration §3）
  - 本人: great 9本／bad 9本の共通プール
  - 恋人: 18人 × great/bad 各3本
  - なかま: **1人あたり great/bad 各1本**
  - 30〜69点のときは会話なし
  - pet-expression に minigame 用の表情がない
  - 「またきた」再会の分岐は、加算するコードがないため到達しない

### J-2. 横断で効く候補（ゲームごとの実装より先に）
1. **カテゴリ別の一言**: 釣りのあと、パズルのあと、対戦で負けたあと、などに一言。`minigameCategoryOf` と点数帯で引く小さな台詞表にすれば、100本すべてに一度に効く。
2. **物語になる瞬間の反応**: 自己ベスト更新、初S、そのゲームの10回目・50回目、100本コンプリート、珍しい結果（深海でくじら、ボウリングでストライク、引き分け）。今はトーストの文字だけ。
3. **中くらいの点数（30〜69）の一言**: いちばん頻度の高い帯なのに無言になっている。
4. **年齢・ライフステージの一言**: ageDifficulty で「老い」とともに難しくなる設計を、台詞で伝える（例: 「むかしはもっと速かった気がする」）。
5. **なかまの台詞を厚くする**: 1人1本から増やす。なかまに勧誘されたゲームで、勧誘した仲間が観戦している演出を入れる。

### J-3. ゲームの絵や題材を差し替えるだけで効く候補
memory-cards（仲間・食べ物・アイテムの絵柄）、slide-puzzle / area-claim（キャラや思い出の絵）、line-trace（キャラの輪郭）、crane-game（好物やおもちゃの景品）、dot-eater（自機をキャラに）、missile-command（なおとっちの家を守る）、reversi / checkers / gomoku（対戦相手の顔を仲間に）、takoyaki / sushi-belt / dragDecorate-cake（キャラが客や注文主になる）。

---

## K. 会話・キャラ反応を強化すると特に化けそうなゲーム

| ゲーム | 理由（すでにある素材） | 差し込み点の例（実装はしない） |
|---|---|---|
| クイック partner / doors / catch / find / season / weather | 育成状態（恋人・仲間・自分の姿・季節）を答えにしている | 正解すると恋人の名前で呼ぶ。外すと「…だれ?」。外したドアから💩が出る。本当の天気・季節で出題する（effectiveWeather を S に渡す） |
| クイック全体 | 💩が8本、「ぎゃくへ」、崖落ちなどの笑いの素材がある | 失敗した指示を最終画面で並べる（「たべろ で 🧦をたべた」）。集計済みの `clears/plays` を使う |
| takoyaki-grill / sushi-belt / dragDecorate-cake / bento | 食べ物の題材。注文がある | キャラが客になり、焦がすと「…これはこれで」 |
| real-fishing 系 | 珍しい魚、地域ごとの魚がある | 地域ごとの初めての魚に一言（「ワニ!?」）。くじらにキャラごと引っぱられる |
| 対AI盤上6本 | 相手の顔がない | 相手を仲間にする。負けたときの悔しがり方を仲間の性格で変える |
| frogger / jump-quest / doodle / halfpipe / volley | キャラがすでに主役で描かれている | 失敗の瞬間（落ちる・ひかれる）に一言。回数で変わる |
| すごろく | キャラが出る。マスのイベント | マスの出来事をなおとっちの生活にする（「おやつマス」「ねぼうマス」） |

---

## L. 再プレイ性が弱いゲームと、その原因

| 原因 | 該当 |
|---|---|
| 配置・問題が固定（数回で覚える） | push-puzzle（4面）, catapult（2面）, billiards（ラック固定）, pinball（台固定）, mini-golf（6ホール固定）, dragDecorate-cake / bento, stack系（初期条件が同じ）, picross（問題数が少ない） |
| 最適解が決まる、または簡単に上限に届く | jenga, domino-run, halfpipe, basketball |
| 運だけで決まる | sugoroku, blackjack（yacht も運の比重が大きい） |
| 上限に届かず、上達が点数に出ない | puzzle-2048, minesweeper（96）, beach-volley（88）, sugoroku（約90）, breakout（85〜100の帯がほぼ使われない） |
| 結果が二極化して途中の上達が見えない | haunted-house, pinball, tilt-maze |
| テーマ乱択が見た目だけ | race / rhythm / tilt / gunner / street-fight / road系 / stack系 |
| クイック | color / weather / season は答えが固定。Lv6 に届かず上限が見えない。失敗したゲームが表示されない |

**再プレイ性がうまく生まれている実装パターン**（流用候補）
- crane: 落ちた景品が残り、次の手が良くなる
- haunted: 鍵を取ったら探索から逃走に反転する
- fishing: 段階ごとに1ボタンの意味が変わる
- jump-quest / pipe-connect / roguelike: ステージを生成する
- クイック: 3ライフ制と短さ

---

## M. 現在不足している遊びの種類

C のマップで通常・クイックのどちらにも該当がない、または実質1本以下のもの:

| 不足 | 現状 | 既存で埋められるか |
|---|---|---|
| **性格が出る選択**（正解のない選択で、キャラの性格が育つ） | かつての「せいかくクイズ」（docs と comment に記録あり）は現行コードに存在しない。`traitCounts` を加算する経路が0件 ✔。その結果、レア種族 mermaid / unicorn の性格条件、れんくんの romantic ルート、実績 gentle-10 / brave-10 / romantic-10、全実績が条件のゴール⑤に到達できない可能性がある | **新規追加の正当性が最もある候補。** ただし、ミニゲームではなく会話の選択肢で加算する方法もある。どこで加算するかを決めるのが先 |
| **仲間との協力** | 0本。すべてソロか対AI | なかまのさそいで始まるゲームを「仲間と一緒に」遊ぶ（beach-volley のペア、takoyaki の分担など）。**既存の改修で可能** |
| **キャラ自身を対象にする遊び（通常枠）** | クイックにはある（pet / clean / medicine / sneak）。通常にはない | クイックで担えている。通常に必要かは要検討 |
| 観察・間違い探し | 通常0本（クイック odd のみ） | 不足しているが優先度は低い |
| 本格的なリズム | rhythm-highway の1本だけ。ビート音がない | 既存の改善で可能 |
| 記憶（毎回変わるもの） | memory-cards の1本だけ | bento をシャッフルすれば2本目になる |
| 知識・ことば | 0本 | なおとっちの世界知識（図鑑・地域）を使えば固有性は高い。ただし必須ではない |

---

## N. 新規ゲームを追加する必要が本当にあるか

**現時点の結論: 大量追加は不要。新規は最大でも1〜2本で、それも「仕組みの修復」と一体で判断すべき。**

理由:
1. 通常100本は、認知・操作の系統を広く網羅している（C）。足りないのは系統ではなく、**ゲームとなおとっちの接続**（J）と**個々の仕上げ**（F, G）。
2. 不足している系統のうち「協力」「リズム」「記憶」は、既存ゲームの改修で埋められる。
3. 本当に既存で代替できないのは「性格が出る選択」だけ。これは**現状で壊れている育成の仕組み（traitCounts）を直す話**で、「ゲームを1本増やす」話ではない。ゲームとして追加するのか、会話の選択肢として入れるのかを先に決める必要がある。
4. 見た目だけの派生が15本ある状態で本数を増やすと、「数だけある」状態が悪化する。

---

## O. 改善を進める合理的な順番

| Phase | 内容 | 規模 | 理由 |
|---|---|---|---|
| **0. 不整合・不具合の確認と修正**（設計判断なし） | traitCounts の加算経路（壊れているのか、意図した廃止なのか）✔、クイックの疑問調の読み上げ ✔、時間切れの引き分けが負けより高い対戦群 ✔、sugoroku の説明と実装、downhill-mountain の12段と10段、curling-winter の時間、「みじかめ」で達成不能になる sky-shooter / grand-prix、rhythm が mgDuration を通らない、fruit-slice のコンボ、track-field に時間制限がない、bubble-shooter の降下、baseball の誤スイング、picross の自動✕、sudoku の一意性、なかま経路で初回説明とげんきチェックを飛ばす、プレイ回数を開始時に数える（すぐやめても「遊んだ種類」に入る）、quick が `minigameScoreSum` を動かす、「質ティア」のコメントが残っている | 各件小さい。PR は分ける | 遊びの評価以前に、点数や説明が信用できない状態を解消する |
| **1. キャラ反応の層を横断で足す** | J-2 の1〜5。カテゴリ×点数帯の台詞表、30〜69点の一言、自己ベスト・初S・回数の反応、なかまの台詞の拡充、クイックの失敗振り返り | 中。ただし台詞データ中心 | 1つの仕組みで100本＋50本すべてに効く。費用対効果が最も高い |
| **2. 派生と近接ペアの役割整理** | H(1) の地域・季節版に「判断の差」を1つずつ。fishing-sea と ring-flight-summer を最優先。近接ペアの役割を言語化する | 中 | 「数だけ」状態を解消する。まとめるかどうかは人間の判断 |
| **3. 小改善を横断パターンで一括対応** | F の表のパターン単位（時間表示、時間と目標、スコア式、乱数化、難易度の配線、絵柄差し替え） | 中 | 同じ種類の修正をまとめると、レビューと検証が楽になる |
| **4. 大改善9本の再設計** | G | 大（1本ずつ） | 設計判断が必要。Phase 1〜3 の後のほうが、何を目指すかが明確になる |
| **5. 新規追加の再判断** | M の「性格が出る選択」「協力」 | ― | Phase 0（traitCounts）と Phase 2〜4 の結果を見てから判断する |

**テストについての補足**: 現状のテストは「全100本が起動し、中断できる」ことは保証している。しかし「普通に遊んで onComplete に届き、上手いほど高得点になる」ことは保証していない（integration §7）。Phase 0 と Phase 3 では、ゲームごとの最小限の「勝ち筋で終了→点数の範囲」テストを足すと、退行を防げる。

---

## 付録: 分類の全リスト

| 分類 | 通常 | クイック |
|---|---|---|
| 現状でも役割が明確 | 11（E） | 27 |
| 小改善でかなり良くなる | 44（F） | 13 |
| 大きな改善余地がある | 9（G） | 0 |
| 他ゲームとの役割整理が必要 | 29（H） | 7 |
| 仕様確認が必要 | 7（H末尾） | 3 |
| 計 | 100 | 50 |

### 統合者が直接確認した主な指摘（✔）
- 100 = 86 + 10 + 4。生成関数は85（games.js:9953-10037, 10134-10213; script.js:15876-15882）。smoke-test で100本起動、minigame-lifecycle / quick-mode / quick-daily-economy / minigame-illustrations の各テストは 84/84 pass。
- `traitCounts` を加算するコードは0件（script.js:1474 初期化、7288 サニタイズ、14396 半減のみ）。
- quick.js:933 は `voice(text, {question})` を渡すが、script.js:14529 の `voice: (text) => audio.voice(text)` で第2引数が落ちる。
- gomoku-9 の点数: 勝ち 72〜100、負け 15〜45、引き分け（時間切れ）55（games.js の makeGomokuGame 内）。
- sugoroku-race: サイコロの目は rolling 中、85msごとに `Math.random()` で決まる（games.js:9784付近）。
- fishing-sea は title 以外に引数がない（games.js:10164）。
- track-field の範囲には mgDuration も時間制限もない。
