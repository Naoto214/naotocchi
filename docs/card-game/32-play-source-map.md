# 32 あそび100候補 — source対応マスター

最終更新: 2026-09-17

状態: **source対応の整理。効果本文・コスト・最終カード名は未確定。**

**79・80の追従（2026-09-17）:** main `5d39eea915d09be3900d92fa879a9e9f1ecf6091`（#285）の実カタログでも一般86・地域10・季節4、100 ID／category／source区分が一致。[79](79-play-batch-1-card-text-draft.md)で39の先頭20枚を全文化し、既存2048と合わせ本文あり21/100・未展開79。[80](80-play-batch-1-text-audit.md)に40局面を保存した。旧4試作とquick／めぐるの区分は維持する。以下Dのアイテム対応は初回棚卸し時点の履歴であり、現在のアイテムsourceは[76](76-item-source-v2-followup.md)を優先する。

**81・82の追従（2026-09-17）:** 登録順21〜40は[81](81-play-batch-2-card-text-draft.md)で全文化し、[82](82-play-batch-2-text-audit.md)で追加40局面を机上照合。本文ありは41/100・未展開59。最新mainは79確認時と同じ5d39eea915d09be3900d92fa879a9e9f1ecf6091。次は41番G-animal-shogiから、46番2048は既存全文を再利用する。100候補・legacy4・未登録sourceの区分は維持する。

**83・84の追従（2026-09-17）:** 登録順41〜60を[83](83-play-batch-3-card-text-draft.md)・[84](84-play-batch-3-text-audit.md)へ接続。新19＋既存2048の1で本文あり60/100・未展開40。次は61番G-doodle-jump。最新mainは5d39eea915d09be3900d92fa879a9e9f1ecf6091で前回から不変。五目のそだち減少を防止へ接続し、2048短文の境界は84 A83-01で追従する。過去の段落の枚数・再開地点は各保存時点の履歴。

**85・86の追従（2026-09-17）:** 登録順61〜80の[20本文](85-play-batch-4-card-text-draft.md)と[40局面](86-play-batch-4-text-audit.md)を保存。本文あり80/100・未展開20、次は81番G-hit-blow。83のどうぶつしょうぎ／パイプつなぎは、01のなかま時0・人物共有1人に合わせ個別改稿し、84へ同期した。mainは前回と同じ5d39eea915d09be3900d92fa879a9e9f1ecf6091。登録数は維持し、過去段落の枚数は当時の履歴として読む。

**87・88の追従（2026-09-17）:** 登録順81〜100の[20本文](87-play-batch-5-card-text-draft.md)と[40局面](88-play-batch-5-text-audit.md)を保存。本文あり100/100・未展開0（新99＋既存2048の1）。今回のsourceは一般6・地域10・季節4、全体86・10・4を維持。季節sourceから未決定の盤面方式を確定せず、地域名は個別本文の条件へ接続した。mainは5d39eea915d09be3900d92fa879a9e9f1ecf6091で不変。次はセカイ13・できごと34。過去段落の枚数は保存時の履歴で、本文完備は裁定・強度の確定ではない。


## 登録後に見つかった追加source

65の初回保存直後、main `19b579abfb48472b6abc1ac7c6f6b1693c8b027e`（PR #261）に `quick-run` と内部15ゲームが追加された。今回の確定反映時には、最新main `bf0ee0c56fad251464241f2e87e801ecdd7286d9`（PR #262）で内部30ゲームと単独モードまで増えていることを実際に確認した。以下はその30内部ID。従来の `games.js` は変更されず、下記A〜Cの100 stable IDは維持されている。

`script.js`・`quick.js` では、混合ランを `quick-run`、単独ランを `quick-solo` とし、後者の実際の種類は `quickGameId`・単独成績の内部IDで区別する。30個すべてに別のトップレベルstable IDが付いたと推測せず、モードのIDと内部のIDを分けて記録する。

| quick内部ID | sourceの指示表示 |
|---|---|
| `eat` | たべろ！ |
| `dodge` | よけろ！ |
| `catch` | つかまえろ！ |
| `mash` | れんだ！ |
| `clean` | そうじしろ！ |
| `stop` | とめろ！ |
| `swipe` | スワイプ！ |
| `medicine` | くすりをのませろ！ |
| `find` | さがせ！ |
| `charge` | ためて…はなせ！ |
| `partner` | こいびとは？（状況により、なかまは？） |
| `season` | きせつは？（実行時は、はるは？等へ変わる） |
| `jump` | とべ！ |
| `pull` | ひっぱれ！ |
| `pet` | なでろ！ |
| `button` | みどりでおせ！ |
| `flames` | けせ！ |
| `coins` | あつめろ！ |
| `cliff` | とまれ！ |
| `throw` | なげろ！ |
| `knock` | たたけ！ |
| `wait` | まて！ |
| `flee` | にげろ！ |
| `mole` | でたらたたけ！ |
| `slice` | きれ！ |
| `guard` | まもれ！ |
| `bento` | つめろ！ |
| `spin` | まわせ！ |
| `lift` | もちあげろ！ |
| `tickle` | くすぐれ！ |

**66確定反映時の追加確認:** main `16a053397bf4ceb516e2e8bab20ee7ed43ca0698`（PR #263）ではquick内部が30→50種へ拡張。実際の `quick.js` で50 IDと重複なしを確認した。上表は前回の30種の履歴として保持し、今回増えた20内部IDを下記へ記録する。

`balance / color / count / bigger / odd / order / holdlid / umbrella / shutter / sort / rhythm / trace / pushbox / fish / stack / pair / doors / sneak / feather / weather`

読み上げの初期値・単独一覧の修正も差分で確認。`quick-run`・`quick-solo` と内部IDの区別は維持され、`games.js` の既存100 stable IDは変更されていない。本編の差分を作業ブランチへマージした意味ではない。

これは**未棚卸しの追加source**で、CARD／HOLDへの候補登録ではない。内部IDを既存の `games.js` のstable IDと混ぜず、1ランの連続判断を1枚へ翻訳するか、内部要素を既存100の役割へ接続・別候補化するかを後続のあそび設計で整理する。モード数や内部ゲーム数から追加カード数を自動確定せず、登録済み477候補とその内数100は比較基準として保持する。現在の本編に存在する全あそびがこの100だけ、という説明にはしない。

## 目的

28では100 stable IDを列挙した。ここでは各IDを、`games.js` の生成元categoryと、一般／地域／季節のどのsourceに属するかへ接続する。

カード側の管理IDは `G-<stable-id>` を維持する。stable IDは本編の保存・追跡キーであり、カード表面名ではない。

重要:
- 一般プール86 + 地域10 + 季節4 = 100候補。
- 同じgeneratorでもstable IDが別なら候補は別に保持する。
- ただし同じ操作を名前違いで同効果にすることは避ける。
- `randomThemeGame` のゲームはプレイごとに見た目・タイトルが変わり得るため、単一の「現行表示名」を捏造しない。カード名はゲーム性を代表する名前を後で決める。
- 最終イラストはPROXY。

## A. 一般プール86

| 仮ID | stable ID | source category | source | 状態 |
|---|---|---|---|---|
| G-road-themed | `road-themed` | `road` | 一般 | CARD |
| G-stack-themed | `stack-themed` | `stack` | 一般 | CARD |
| G-stack-snowman | `stack-snowman` | `stack` | 一般 | CARD |
| G-falling-block-puzzle | `falling-block-puzzle` | `fallingBlock` | 一般 | CARD |
| G-crane-game-3d | `crane-game-3d` | `craneGame` | 一般 | CARD |
| G-pinball-physics | `pinball-physics` | `pinball` | 一般 | CARD |
| G-haunted-house-3d | `haunted-house-3d` | `hauntedHouse` | 一般 | CARD |
| G-bowling-3d | `bowling-3d` | `swipeThrow` | 一般 | CARD |
| G-archery-3d | `archery-3d` | `swipeThrow` | 一般 | CARD |
| G-breakout-classic | `breakout-classic` | `breakout` | 一般 | CARD |
| G-dragDecorate-cake | `dragDecorate-cake` | `dragDecorate` | 一般 | CARD |
| G-dragDecorate-bento | `dragDecorate-bento` | `dragDecorate` | 一般 | CARD |
| G-p3-space | `p3-space` | `perspective3d` | 一般 | CARD |
| G-p3-drive | `p3-drive` | `perspective3d` | 一般 | CARD |
| G-fp-dungeon | `fp-dungeon` | `firstPersonDungeon` | 一般 | CARD |
| G-race-3d | `race-3d` | `roadRace` | 一般 | CARD |
| G-rhythm-highway-3d | `rhythm-highway-3d` | `rhythmHighway` | 一般 | CARD |
| G-tilt-maze-3d | `tilt-maze-3d` | `tiltMaze` | 一般 | CARD |
| G-space-gunner-3d | `space-gunner-3d` | `spaceGunner` | 一般 | CARD |
| G-mini-golf-physics | `mini-golf-physics` | `miniGolf` | 一般 | CARD |
| G-real-fishing | `real-fishing` | `realFishing` | 一般 | CARD |
| G-basketball-3d | `basketball-3d` | `basketball` | 一般 | CARD |
| G-pingpong-3d | `pingpong-3d` | `pingPong` | 一般 | CARD |
| G-chain-puzzle | `chain-puzzle` | `chainPuzzle` | 一般 | CARD |
| G-street-fight | `street-fight` | `streetFight` | 一般 | CARD |
| G-free-kick-3d | `free-kick-3d` | `freeKick` | 一般 | CARD |
| G-tower-defense | `tower-defense` | `towerDefense` | 一般 | CARD |
| G-roguelike-dungeon | `roguelike-dungeon` | `roguelike` | 一般 | CARD |
| G-grand-prix-3d | `grand-prix-3d` | `grandPrix` | 一般 | CARD |
| G-sky-shooter | `sky-shooter` | `skyShooter` | 一般 | CARD |
| G-jump-quest | `jump-quest` | `jumpQuest` | 一般 | CARD |
| G-push-puzzle | `push-puzzle` | `pushPuzzle` | 一般 | CARD |
| G-reversi-6 | `reversi-6` | `reversi` | 一般 | CARD |
| G-billiards-6 | `billiards-6` | `billiards` | 一般 | CARD |
| G-animal-shogi | `animal-shogi` | `animalShogi` | 一般 | CARD |
| G-minesweeper-8 | `minesweeper-8` | `minesweeper` | 一般 | CARD |
| G-snake-classic | `snake-classic` | `snake` | 一般 | CARD |
| G-baseball-batting | `baseball-batting` | `baseball` | 一般 | CARD |
| G-ring-flight-3d | `ring-flight-3d` | `ringFlight` | 一般 | CARD |
| G-bubble-shooter | `bubble-shooter` | `bubbleShooter` | 一般 | CARD |
| G-catapult-castle | `catapult-castle` | `catapult` | 一般 | CARD |
| G-connect-four | `connect-four` | `connectFour` | 一般 | CARD |
| G-puzzle-2048 | `puzzle-2048` | `twenty48` | 一般 | CARD |
| G-frogger-road | `frogger-road` | `frogger` | 一般 | CARD |
| G-ski-jump | `ski-jump` | `skiJump` | 一般 | CARD |
| G-air-hockey | `air-hockey` | `airHockey` | 一般 | CARD |
| G-submarine-3d | `submarine-3d` | `submarine` | 一般 | CARD |
| G-match-3 | `match-3` | `matchThree` | 一般 | CARD |
| G-gomoku-9 | `gomoku-9` | `gomoku` | 一般 | CARD |
| G-tank-battle | `tank-battle` | `tankBattle` | 一般 | CARD |
| G-tennis-rally | `tennis-rally` | `tennis` | 一般 | CARD |
| G-picross-5 | `picross-5` | `picross` | 一般 | CARD |
| G-darts-board | `darts-board` | `darts` | 一般 | CARD |
| G-hang-glider-3d | `hang-glider-3d` | `hangGlider` | 一般 | CARD |
| G-bomber-maze | `bomber-maze` | `bomber` | 一般 | CARD |
| G-blackjack-21 | `blackjack-21` | `blackjack` | 一般 | CARD |
| G-pipe-connect | `pipe-connect` | `pipeConnect` | 一般 | CARD |
| G-fruit-slice | `fruit-slice` | `fruitSlice` | 一般 | CARD |
| G-track-field | `track-field` | `trackField` | 一般 | CARD |
| G-voxel-mine | `voxel-mine` | `voxelMine` | 一般 | CARD |
| G-sushi-belt | `sushi-belt` | `sushiBelt` | 一般 | CARD |
| G-asteroids-classic | `asteroids-classic` | `asteroids` | 一般 | CARD |
| G-yacht-dice | `yacht-dice` | `yachtDice` | 一般 | CARD |
| G-lights-out | `lights-out` | `lightsOut` | 一般 | CARD |
| G-doodle-jump | `doodle-jump` | `doodleJump` | 一般 | CARD |
| G-curling-ice | `curling-ice` | `curling` | 一般 | CARD |
| G-jenga-tower | `jenga-tower` | `jenga` | 一般 | CARD |
| G-line-trace | `line-trace` | `lineTrace` | 一般 | CARD |
| G-checkers-6 | `checkers-6` | `checkers` | 一般 | CARD |
| G-memory-cards | `memory-cards` | `memoryCards` | 一般 | CARD |
| G-halfpipe-skate | `halfpipe-skate` | `halfpipe` | 一般 | CARD |
| G-domino-run | `domino-run` | `dominoRun` | 一般 | CARD |
| G-sudoku-mini | `sudoku-mini` | `sudoku` | 一般 | CARD |
| G-mancala-kalah | `mancala-kalah` | `mancala` | 一般 | CARD |
| G-plane-landing | `plane-landing` | `planeLanding` | 一般 | CARD |
| G-dot-eater | `dot-eater` | `dotEater` | 一般 | CARD |
| G-missile-command | `missile-command` | `missileCommand` | 一般 | CARD |
| G-area-claim | `area-claim` | `areaClaim` | 一般 | CARD |
| G-solitaire-klondike | `solitaire-klondike` | `solitaire` | 一般 | CARD |
| G-hit-blow | `hit-blow` | `hitBlow` | 一般 | CARD |
| G-lunar-lander | `lunar-lander` | `lunarLander` | 一般 | CARD |
| G-shanghai-tiles | `shanghai-tiles` | `shanghai` | 一般 | CARD |
| G-beach-volley | `beach-volley` | `beachVolley` | 一般 | CARD |
| G-slide-puzzle | `slide-puzzle` | `slidePuzzle` | 一般 | CARD |
| G-sugoroku-race | `sugoroku-race` | `sugoroku` | 一般 | CARD |
| G-takoyaki-grill | `takoyaki-grill` | `takoyaki` | 一般 | CARD |

## B. 地域・季節14

| 仮ID | stable ID | source category | context | source上の呼び方／内容 | 状態 |
|---|---|---|---|---|---|
| G-road-city | `road-city` | `road` | 地域:とかい | 都会を走ろう | CARD |
| G-stack-harvest | `stack-harvest` | `stack` | 地域:いなか | いなかの収穫タワー | CARD |
| G-stack-acorn | `stack-acorn` | `stack` | 地域:もり | きのみタワー | CARD |
| G-downhill-mountain | `downhill-mountain` | `climbing` | 地域:やま | ロッククライミング系（保存IDはdownhill-mountain） | CARD |
| G-downhill-snow | `downhill-snow` | `downhill` | 地域:ゆきぐに | ゲレンデすべり（スキー／スノーボード可変） | CARD |
| G-fishing-sea | `fishing-sea` | `fishing` | 地域:うみ | うみでほんかくさかなつり | CARD |
| G-fishing-deepsea | `fishing-deepsea` | `fishing` | 地域:しんかい | しんかいフィッシング | CARD |
| G-fishing-river | `fishing-river` | `fishing` | 地域:みずべ | みずべで魚つり | CARD |
| G-road-jungle | `road-jungle` | `road` | 地域:ジャングル | ジャングルをかけぬけろ | CARD |
| G-road-desert | `road-desert` | `road` | 地域:さばく | さばくを走ろう | CARD |
| G-stack-sakura | `stack-sakura` | `stack` | 季節:はる | さくらタワー | CARD |
| G-ring-flight-summer | `ring-flight-summer` | `ringFlight` | 季節:なつ | なつのうみフライト | CARD |
| G-stack-leaves | `stack-leaves` | `stack` | 季節:あき | 落ち葉の山 | CARD |
| G-curling-winter | `curling-winter` | `curling` | 季節:ふゆ | ふゆのカーリング大会 | CARD |

## C. 旧テストデッキ「あそび」と現行本編sourceの対応

既存01〜24の試行錯誤を消さないため、A/Bで使った「あそび」カード名を現行100本へ無理に当てはめず監査する。

| 旧試作カード | 現行source対応 | 判定 |
|---|---|---|
| 2048 | `G-puzzle-2048` | **対応確定。** 現行stable IDとゲーム性が一致。旧効果案をこの候補へ接続してよい。 |
| スノーボード | `G-downhill-snow` のランダムテーマ内にスノーボードが存在 | **直接対応は保留。** `downhill-snow` はスキー／スノーボード可変の1ゲームなので、「スノーボード」単独カードへ自動固定しない。旧カード案は消さず、現行候補へ統合するかカードゲーム独自名で残すか後で決める。 |
| うそつきしょうぶ | 現行100 stable IDに同名・明白な1対1 sourceなし | **未対応。** 旧テスト能力は保存する。削除もしないし、現行ゲームへ勝手に付け替えない。 |
| キャッチボール | 現行100 stable IDに同名・明白な1対1 sourceなし | **未対応。** 旧テスト能力は保存。 |
| かくれんぼ | 現行100 stable IDに同名・明白な1対1 sourceなし | **未対応。** 旧テストの「しかける」検証価値を保持。 |

旧試作名が現行本編から消えていても、それだけでカードゲーム側から削除しない。カードゲーム正本で既に検証した役割は「legacy test candidate」として保持し、全役割地図を見てから
1. 現行source候補へ能力を移植
2. カードゲーム独自カードとして残す
3. HOLDへ移す
のいずれかを理由付きで決める。

## D. 旧テストデッキ「あいてむ」のsource差分も同時に固定

28で現行あいてむ38候補を抽出したため、A/Bの旧試作と照合する。

| 旧試作カード | 現行source対応 | 判定 |
|---|---|---|
| おはな | `I-flower` | 対応確定 |
| サングラス | `I-glasses` | 対応確定 |
| シルクハット | `I-hat` | 対応確定 |
| トイレットペーパー | `I-poop1` | 対応確定 |
| ハグ | 現行独立itemなし。旧ロード互換では旧回復報酬 `hug` が統合対象 | **未対応。** 旧テストカード本文を消さない。現行 `I-reward` へ自動統合せず、役割監査でカードゲーム独自カードとして残す価値を判定する。 |

## E. あそびカードの能力設計へ進む前の分類軸

100枚を順番にその場で能力化すると役割が先着順になるため、まずsource categoryを以下の大分類へ束ねて役割地図を作る。

- **反射・タイミング**: archery / bowling / darts / baseball / freeKick / rhythmHighway / takoyaki 等
- **移動・回避**: road / race / ringFlight / submarine / frogger / skyShooter / jumpQuest 等
- **物理・ねらい**: miniGolf / billiards / basketball / curling / catapult / pinball 等
- **盤面パズル**: 2048 / matchThree / picross / sudoku / lightsOut / slidePuzzle / pushPuzzle / pipeConnect 等
- **対人読み合い／ボード**: reversi / connectFour / gomoku / checkers / mancala / blackjack / yachtDice / animalShogi 等
- **構築・積み上げ**: stack / jenga / domino / towerDefense 等
- **探索・冒険**: roguelike / dungeon / hauntedHouse / voxelMine / fishing 等
- **戦闘・防衛**: streetFight / tankBattle / bomber / missileCommand / asteroids 等
- **創作・配置**: cake / bento / lineTrace 等
- **地域・季節経験**: 地域10・季節4

この分類はカード種類の追加ではない。能力設計時に同じ効果の名前違いを量産しないための監査用。

## F. 集計

この100候補は28で既に全体母集団へ加算済み。

- 全体477候補: **変更なし**
- あそび100候補: **変更なし**
- 今回はsource categoryと旧試作対応を追加しただけ
- 最終カード名・効果・時コスト・収録弾: 未確定

## G. 本編追加source — めぐる（75確認・未登録）

2026-09-14、最新main `3780497b8a9fc7e72a651ba6206543e47314f89d`（PR #268）の[meguru.js](https://github.com/Naoto214/naotocchi/blob/3780497b8a9fc7e72a651ba6206543e47314f89d/meguru.js)とscript.jsの接続を実際に確認した。既存13地域を歩き、登録済みの形態・なかま・こいびとを住民台帳へ配置し、現在の同行者を同じ個体として追従させる画面。こいびとは既存firstRegion・hookを参照する。げんざいちはhomeへの景観の重ね合わせで、地域IDを追加していない。

これはgames.jsの既存100本やquick内部50種への追加ゲームとして数えず、カード化単位・あそび／セカイ／できごとのどこで表現するかも未決定。あそび100・477候補へ自動加算しない。カード側に全員の地域ロックや新しい盤面を持ち込まず、E-naotoの表示「なおと」も維持する。75のsource追従記録を参照し、本編変更は作業ブランチへ未マージ。

## 次

1. 各source categoryについて「元ゲームの何をカード効果へ翻訳するか」を1〜3語で定義し、100枚の役割割当を始める。
2. 旧試作5枚は削除せず、対応確定／未対応を維持したまま役割地図へ入れる。
3. セカイを `じかん → てんき → きせつ → ばしょ` の順でsource inventory化する。
4. なかま・こいびと・あいてむ・できごととの役割衝突を横断監査してから、個別本文を大量作成する。
