# 通常ゲーム100本の得点分布と、新性格システム（#417）の C/B 閾値との整合（実測）

- 基準: ブランチ `claude/minigame-phase2b-design-20261025`（main `f16e0f37`）。リポジトリのファイルは変更していない。
- 測定スクリプトと生データは `measure/` にある（§2 に一覧）。
- 「実測」は harness で実コードを動かした結果。「推定」はコードの得点式を読んで出した結果。この2つは分けて書く。

## 0. まとめ

1. **何もしなくても C（35点）以上になるゲームが19本ある（実測）。** さらに8本は、種によって C に届く。
2. **何もしなくても B（55点）以上になるゲームが5本ある（実測）。** mini-golf-physics（55〜73）、connect-four（55）、gomoku-9（55）、sugoroku-race（72）、hang-glider-3d（17〜91。5回中3回が B 以上、1回は S）。
3. **無操作のゲームを7回遊ぶだけで、「がんばり」が★5（72点＝自然経験の上限）になった（実測。本物の finishMinigame→individualGameResult を通した）。** 同じ15回の放置で「ゆうき」の「未経験の遊び」は5ジャンル（20点）埋まった。好きな遊びは「ボード」に決まった。
4. ランダムに触るだけで、半分以上の回で B 以上になるゲームは4本（mini-golf、gomoku、hang-glider、sugoroku）。半分以上の回で C 以上になるゲームは25本（実測）。
5. 「何もしない方が、適当に触るより点が高い」ゲームが11本ある（実測）。対戦の時間切れの引き分け（45〜55点）と、自動で進むゲームが原因。
6. ジャンル別では、**ボード（12本中7本が無操作で C）**が最も偏っている。次に drive3d と sports（各5本）。**strategy だけは、無操作で C に届くゲームがない（0/2）。**
7. 「ゆうき」の `genre:*` は1ジャンルにつき1件しか入らない（individuality.js:42）。そのため、ジャンル間の不公平は「6ジャンル中5ジャンルが、放置だけで埋まる」という形で表れる。
8. T2（100点・S に届かない6本）は、C/B の判定には影響しない（推定。どれも B までは届く）。性格への影響が大きいのは **T1（対戦の時間切れの点）と T7（無操作の点）**。
9. 点数式を変えない方法で一番効くのは「入力0回の結果は、個性の判定に数えない」こと。これで無操作の19本＋8本をまとめて止められる。ただし、1回タップするだけで C になるゲームが3本（minesweeper など）残る。運で取れる4本も残る。
10. 点数式を変える場合は、T1 の9本＋不具合候補の2本＋T7 の8本で、無操作 C の19本すべてに対応できる。

## 1. 個性への効き方（コードの事実）

### 1.1 ランクの閾値
| ランク | 最低点 | 根拠 |
|---|---|---|
| S | 90 | script.js:15849-15855 `MINIGAME_RANKS` |
| A | 75 | 同上 |
| B | 55 | 同上 |
| C | 35 | 同上 |
| D | 0 | 同上 |
- ランクは `minigameRankOf(score)`（script.js:15856）で決まる。
- 個性に渡す点数は、装備のボーナスを足す前の「実点」。0〜100 に収めて四捨五入した値を使う（script.js:17136-17138, 17163）。

### 1.2 `individualGameResult(game, score, lifeId)`（script.js:10808-10820）
| 条件 | 何が起きるか | 行 |
|---|---|---|
| 書き込みができない（育成中でない・♾️・別の命・保存の競合）、Quick、点数が数値でない | 何もしない | 10809、10793-10797 |
| ランクが D（35点未満） | **何もしない**（経験も好みも増えない） | 10811 |
| C 以上 | ゆうき・カテゴリ0「未経験の遊び」に `genre:<ジャンル>` | 10812 |
| C 以上 | がんばり・カテゴリ0「最初の達成」に `game:<ID>` | 10816 |
| **B 以上** | がんばり・カテゴリ1「次の段階の達成」に `game:<ID>` | 10817 |
| C 以上で、ほかのゲームの記録がすでにある | がんばり・カテゴリ2「別の遊びへの応用」に `game:<ID>` | 10813-10818 |
| C 以上 | 好きな遊び（ジャンル）の点を加える。初めてのゲームなら +1 | 10819、individuality.js:47-59 |

### 1.3 上限と★の数え方（individuality.js）
- 1つのカテゴリには、違う ID が**最大6件**まで入る（individuality.js:42）。
- 1件4点（individuality.js:38）。★は 8/20/36/60 点で 2/3/4/5（individuality.js:39）。
- ゆうき「未経験の遊び」は `genre:` だけなので、最大6件（6ジャンル）。ゲームから入るのは最大24点。
- がんばりの3カテゴリは、すべてゲームの結果から入る。6件×3＝最大72点で ★5。**ゲームの結果だけで ★5 まで行ける唯一の心**。
- ジャンルの対応は script.js:15594-15611 `MINIGAME_GENRE_OF_CATEGORY`。100本の内訳は action 32、drive3d 16、sports 21、puzzle 17、board 12、strategy 2。
- 途中でやめた場合（retireMinigameInner、script.js:17030-）は individualGameResult を通らない。終わらないゲームを放置して、やめるボタンで終えた場合は、個性に効かない。

### 1.4 個性以外への効き方（参考。今回は変えない）
- 30点以上で育成 +7・コイン30、70点以上で育成 +14・コイン60（script.js:17140-17186）。
- S ランクで成長2倍ブースト（script.js:17197-）。
- 無操作の mini-golf（〜73）と hang-glider（〜91）は、ここにも効く（実測の点数から推定）。

## 2. 測定方法と限界

### 2.1 方法
| 項目 | 内容 |
|---|---|
| 起動 | `tests/helpers/runtime-harness.cjs` の `harness({seed, canvasContext})`。1回の実行ごとに新しい harness を作る。`h.api.games[i]` を `h.api.startMinigame` で起動する（docs/qa/minigame-phase2-bento-measure.cjs と同じ包み方）。`done` に渡された実点を記録した |
| 状態 | harness の `reset()` の既定（育成中・ageTicks 500・難易度ふつう・長さふつう・装備なし・昼・晴れ）。地域・季節の限定ゲームも直接起動した |
| canvas | 呼び出しを捨てるだけの 2D コンテキストの代用品（measureText・グラデーション・getImageData などは空の値を返す） |
| 時間 | harness の偽の時計。200ms ずつ進めた。requestAnimationFrame は 16ms |
| idle（無操作） | 何もしないで 240 秒（ゲーム内の時間）進める。終わらなければ打ち切って「終わらない」と記録した。種は 1〜5 |
| onetap | 0.8 秒後に、入力先ごとに中央を1回タップする。その後は放置。種は 1〜3 |
| random | 120〜700ms ごとに入力する。入力先は、いま有効な canvas・ボタン・ドラッグ部品・パッドから選ぶ。動作はタップ5割・スワイプ（ドラッグ）3.5割・長押し1.5割。12% は矢印キー・Space・Enter。ボット用の乱数は、ゲームの乱数とは別にした。種は 1〜20 |
| mash（連打） | random と同じ入力先に、60〜200ms ごとに入力する。タップが多めで、長押しはしない。種は 1〜10 |
| 入力先の見つけ方 | container・querySelector の結果・innerHTML でできた子・createElement の node を追う。入力のリスナーか data-hold / data-key を持つものを候補にした。作り直されて外れた node は除いた |
| ドラッグ系 | cake と bento には、harness に配置がない。そこで置き場を上段、部品を下段に並べた矩形を与えた。6割はランダムな置き場へ、4割はランダムな位置へ動かした |
| 規模 | idle 500回、onetap 300回、random 2000回、mash 1000回。合計 3800 回。10本ずつ別プロセスで実行し（`--max-old-space-size=4096 --expose-gc`）、全部で約10分かかった。**実行エラーは0件** |
| 個性の実測 | `idle-life-sim.cjs`。1つの harness で15本を順に、本物の startMinigame→放置→finishMinigame で遊ぶ。individualGameResult の結果を記録した |

### 2.2 ファイル（すべて measure/）
| ファイル | 中身 |
|---|---|
| `score-measure.cjs` | 測定の本体。引数は `<from> <to> <idle\|onetap\|random\|mash> <seedFrom> <seedTo> <out.jsonl>`。cwd はリポジトリ |
| `run-all.sh` | idle / random / mash を10本ずつ並列で実行する（onetap は手で同じ形で実行） |
| `raw/*.jsonl` | 生データ。1回の実行につき1行（id, cond, seed, score, ended, endMs, inputs, targets, error） |
| `summarize.cjs` → `summary.json` / `summary.csv` | ゲームごとの集計 |
| `classify.cjs` → `classes.json` / `table.md` / `genre.md` | 分類と表 |
| `idle-life-sim.cjs` → `idle-life-sim.json` | 無操作で遊んだときの個性の変化の実測 |
| `genres.json` / `score-lines.txt` | ID→カテゴリ・ジャンルの対応、得点式の行の一覧（`score-lines.txt` は手がかり用） |

### 2.3 限界（必ず読む）
1. **ボットの入力は、実際の指と違う。** 狙いがなく、一様な乱数で触る。指は1本だけ。人の「なんとなく触る」よりも下手な場合と上手な場合がある。
2. **確定のために2回タップが必要なゲームは、ボットではほぼ進まない。** 例: gomoku は同じマスを2回押して決める（games.js:6278 付近）。ボットはほとんど石を置けず、時間切れの引き分け（55）になる。gomoku の「ランダムで B 100%」は無操作と同じ理由。実際の子どもは同じマスを2回押すことがあるので、実機ではもっと負けて低くなると推定する。
3. **配置がない。** harness の要素は、すべて (0,0)〜(300,300) の矩形を返す（ドラッグ系だけ別の矩形を与えた）。画面の外側に触るような入力はない。
4. **イベントは window → document → 対象にしか伝わらない**（runtime-harness.cjs の dispatch）。親要素で受けるゲームは、親に直接送ったときだけ反応する。
5. **canvas は代用品。** 画素は読めない。getImageData を判定に使うゲームがあっても、値はいつも0になる。
6. **時間は偽物。** フレーム落ちや処理落ちがない。実機の「重くて遅れる」は再現しない。
7. **種が少ない。** idle は 5、random は 20、mash は 10。B 率などは目安にとどめる（±10〜20% の誤差があると考える）。無操作の多くは、種を変えても同じ点になる（決定的）。
8. **終わらないゲームは 240 秒で打ち切った。** pinball・ski-jump・darts・blackjack・track-field・yacht-dice は、無操作では終わらない。実際には、プレイヤーがやめるしかない。やめた場合は個性に効かない（§1.3）。ski-jump は1回タップしても終わらなかった。T7 の資料にある「ski-jump 無操作で平均46点」は、別の前提（ボタンを押して進めるなど）のシミュレーション。今回の harness では再現していない。
9. 年齢・難易度・長さの設定は既定値のまま。「みじかめ」「やさしい」「むずかしい」では、点数が変わる（推定）。
10. 同じエンジンを共有するゲームは、同じ種で同じ点になる。road 系6本（road-themed を除く5本は同じ点）、stack 系6本、fishing 系4本、ring-flight 2本、curling 2本。「本数」で数えると偏りが大きく見えるので注意する。

## 3. 100本の測定表

- 無操作の点は、種1〜5の点を並べたもの。「打切」は 240 秒たっても終わらなかったもの。
- 分類の記号: i＝無操作で C（6割以上の種）、(i)＝ときどき C、ii＝無操作で B（6割以上）、iii＝ランダムか連打で半分以上 B、iii-C＝ランダムか連打で半分以上 C、(iii)＝ランダムで1回でも B、iv-近＝無操作で S（90点以上）が出た。
- この表は `table.md` と同じ。数値の元は `summary.csv`。

| # | ゲームID | ジャンル | 無操作の点(種1〜5) | ランダム 平均/最大 | ランダム C率/B率 | 連打 平均/最大 | 連打 B率 | 分類 |
|---|---|---|---|---|---|---|---|---|
| 1 | road-themed | action | 24·28·26·22·41 | 29.4 / 50 | 25% / 0% | 24.1 / 41 | 0% | (i) |
| 2 | stack-themed | action | 8·8·8·8·8 | 39 / 69 | 60% / 10% | 44.5 / 75 | 30% | iii-C |
| 3 | stack-snowman | action | 8·8·8·8·8 | 39.3 / 61 | 65% / 5% | 40 / 58 | 20% | iii-C |
| 4 | falling-block-puzzle | puzzle | 36·35·36·36·36 | 35.8 / 36 | 100% / 0% | 35.9 / 36 | 0% | i iii-C |
| 5 | crane-game-3d | action | 14·14·14·14·14 | 28.5 / 54 | 25% / 0% | 20 / 20 | 0% |  |
| 6 | pinball-physics | action | 終わらない（240秒打切） | 35.1 / 99 | 25% / 15% | 32.3 / 66 | 10% | (iii) |
| 7 | haunted-house-3d | drive3d | 22·25·25·25·25 | 24.4 / 25 | 0% / 0% | 24.4 / 25 | 0% |  |
| 8 | bowling-3d | sports | 14·14·14·14·14 | 25.3 / 55 | 30% / 5% | 29.4 / 63 | 20% | (iii) |
| 9 | archery-3d | sports | 8·8·8·8·8 | 10.8 / 28 | 0% / 0% | 12.8 / 22 | 0% |  |
| 10 | breakout-classic | action | 14·14·16·14·20 | 16.5 / 24 | 0% / 0% | 17.7 / 26 | 0% |  |
| 11 | dragDecorate-cake | puzzle | 0·0·0·0·0 | 19.9 / 100 | 5% / 5% | 29.9 / 67 | 20% | (iii) |
| 12 | dragDecorate-bento | puzzle | 0·0·0·0·0 | 13.8 / 50 | 5% / 0% | 17.5 / 50 | 0% |  |
| 13 | p3-space | drive3d | 23·41·13·36·15 | 28.4 / 61 | 35% / 5% | 31.6 / 61 | 10% | (i) (iii) |
| 14 | p3-drive | drive3d | 23·41·13·36·15 | 28.4 / 61 | 35% / 5% | 31.6 / 61 | 10% | (i) (iii) |
| 15 | fp-dungeon | drive3d | 18·18·18·18·18 | 18.4 / 27 | 0% / 0% | 18 / 18 | 0% |  |
| 16 | race-3d | drive3d | 15·14·14·15·14 | 16.9 / 21 | 0% / 0% | 15.4 / 16 | 0% |  |
| 17 | rhythm-highway-3d | drive3d | 8·8·8·8·8 | 11.2 / 24 | 0% / 0% | 24.8 / 44 | 0% |  |
| 18 | tilt-maze-3d | drive3d | 30·35·35·35·35 | 30.4 / 40 | 50% / 0% | 34.7 / 40 | 0% | i iii-C |
| 19 | space-gunner-3d | drive3d | 12·12·12·12·12 | 14.4 / 24 | 0% / 0% | 18.4 / 24 | 0% |  |
| 20 | mini-golf-physics | sports | 73·64·64·55·55 | 56.8 / 73 | 100% / 75% | 49.6 / 64 | 50% | ii iii |
| 21 | real-fishing | sports | 18·18·18·18·18 | 20 / 42 | 10% / 0% | 18 / 18 | 0% |  |
| 22 | basketball-3d | sports | 18·18·18·18·18 | 20.8 / 52 | 10% / 0% | 24.2 / 59 | 10% | (iii) |
| 23 | pingpong-3d | sports | 12·12·12·12·12 | 12 / 12 | 0% / 0% | 12 / 12 | 0% |  |
| 24 | chain-puzzle | puzzle | 12·12·12·12·12 | 14.1 / 26 | 0% / 0% | 16.6 / 30 | 0% |  |
| 25 | street-fight | action | 10·10·10·10·34 | 16.4 / 32 | 0% / 0% | 34.6 / 71 | 40% | (iii) |
| 26 | free-kick-3d | sports | 12·12·12·12·12 | 30.7 / 78 | 20% / 20% | 31.8 / 56 | 20% | (iii) |
| 27 | tower-defense | strategy | 30·30·30·30·30 | 44.3 / 81 | 35% / 30% | 42.2 / 89 | 20% | (iii) |
| 28 | roguelike-dungeon | strategy | 12·12·12·12·12 | 13.2 / 17 | 0% / 0% | 12 / 12 | 0% |  |
| 29 | grand-prix-3d | drive3d | 15·15·15·15·15 | 15 / 15 | 0% / 0% | 15 / 15 | 0% |  |
| 30 | sky-shooter | action | 38·32·41·32·35 | 40.5 / 64 | 60% / 30% | 34.9 / 58 | 10% | i iii-C |
| 31 | jump-quest | action | 13·13·13·13·13 | 13.9 / 16 | 0% / 0% | 14.6 / 17 | 0% |  |
| 32 | push-puzzle | puzzle | 30·30·30·30·30 | 30 / 30 | 0% / 0% | 30 / 30 | 0% |  |
| 33 | reversi-6 | board | 50·50·50·50·50 | 40.6 / 70 | 65% / 10% | 25.8 / 37 | 0% | i iii-C |
| 34 | billiards-6 | board | 10·10·10·10·10 | 10.4 / 19 | 0% / 0% | 10.9 / 19 | 0% |  |
| 35 | animal-shogi | board | 50·50·50·50·50 | 48.6 / 50 | 95% / 0% | 50 / 50 | 0% | i iii-C |
| 36 | minesweeper-8 | puzzle | 10·10·10·10·10 | 38.1 / 48 | 70% / 0% | 40.7 / 50 | 0% | iii-C |
| 37 | snake-classic | action | 10·10·10·10·10 | 10 / 10 | 0% / 0% | 10 / 10 | 0% |  |
| 38 | baseball-batting | sports | 12·12·12·12·12 | 12 / 12 | 0% / 0% | 13.5 / 27 | 0% |  |
| 39 | ring-flight-3d | drive3d | 41·46·41·40·25 | 28.4 / 64 | 30% / 10% | 22.3 / 30 | 0% | i (iii) |
| 40 | bubble-shooter | puzzle | 20·20·20·20·20 | 42.9 / 83 | 60% / 20% | 29.7 / 90 | 10% | iii-C |
| 41 | catapult-castle | action | 10·10·10·10·10 | 11.1 / 32 | 0% / 0% | 10 / 10 | 0% |  |
| 42 | connect-four | board | 55·55·55·55·55 | 28.8 / 37 | 10% / 0% | 30.2 / 45 | 0% | ii |
| 43 | puzzle-2048 | puzzle | 16·16·16·16·16 | 16 / 16 | 0% / 0% | 16 / 16 | 0% |  |
| 44 | frogger-road | action | 12·12·12·12·12 | 13.5 / 16 | 0% / 0% | 14.2 / 17 | 0% |  |
| 45 | ski-jump | sports | 終わらない（240秒打切） | 29.7 / 42 | 25% / 0% | 25.9 / 27 | 0% |  |
| 46 | air-hockey | sports | 50·50·50·50·50 | 41.3 / 50 | 75% / 0% | 39.5 / 50 | 0% | i iii-C |
| 47 | submarine-3d | drive3d | 30·30·66·33·33 | 26.8 / 57 | 20% / 5% | 26.8 / 58 | 10% | (i) (iii) |
| 48 | match-3 | puzzle | 10·10·10·10·10 | 16.9 / 36 | 5% / 0% | 20.6 / 44 | 0% |  |
| 49 | gomoku-9 | board | 55·55·55·55·55 | 55 / 55 | 100% / 100% | 55 / 55 | 100% | ii iii |
| 50 | tank-battle | action | 12·12·12·12·12 | 22.4 / 39 | 15% / 0% | 25.5 / 39 | 0% |  |
| 51 | tennis-rally | sports | 15·15·15·15·15 | 15.4 / 24 | 0% / 0% | 15 / 15 | 0% |  |
| 52 | picross-5 | puzzle | 10·10·10·10·10 | 10 / 10 | 0% / 0% | 11.6 / 26 | 0% |  |
| 53 | darts-board | sports | 終わらない（240秒打切） | 38 / 62 | 60% / 5% | 24.7 / 50 | 0% | iii-C |
| 54 | hang-glider-3d | drive3d | 64·17·82·44·91 | 59.5 / 82 | 100% / 55% | 53.9 / 72 | 60% | ii iii iv-近 |
| 55 | bomber-maze | action | 12·12·12·12·12 | 12 / 12 | 0% / 0% | 12 / 12 | 0% |  |
| 56 | blackjack-21 | board | 終わらない（240秒打切） | 39.5 / 90 | 45% / 30% | 45.5 / 80 | 30% | iii-C |
| 57 | pipe-connect | puzzle | 12·12·12·12·12 | 12 / 12 | 0% / 0% | 12 / 12 | 0% |  |
| 58 | fruit-slice | action | 22·22·22·22·22 | 22.6 / 27 | 0% / 0% | 23.8 / 29 | 0% |  |
| 59 | track-field | sports | 終わらない（240秒打切） | — | 0% / 0% | 10 / 10 | 0% |  |
| 60 | voxel-mine | drive3d | 16·16·16·16·16 | 18.2 / 29 | 0% / 0% | 19.2 / 23 | 0% |  |
| 61 | sushi-belt | action | 10·10·10·10·10 | 10.8 / 15 | 0% / 0% | 14.1 / 22 | 0% |  |
| 62 | asteroids-classic | action | 8·20·16·12·8 | 16.3 / 29 | 0% / 0% | 25.7 / 39 | 0% |  |
| 63 | yacht-dice | board | 終わらない（240秒打切） | 20.6 / 40 | 10% / 0% | 23.4 / 30 | 0% |  |
| 64 | lights-out | puzzle | 10·10·10·10·10 | 10 / 10 | 0% / 0% | 10 / 10 | 0% |  |
| 65 | doodle-jump | action | 29·14·28·52·25 | 30.9 / 61 | 45% / 5% | 31.6 / 59 | 10% | (i) (iii) |
| 66 | curling-ice | sports | 45·45·45·45·45 | 32.5 / 45 | 25% / 0% | 30.9 / 45 | 0% | i |
| 67 | jenga-tower | action | 22·22·22·22·22 | 44.8 / 62 | 80% / 10% | 38.8 / 58 | 10% | iii-C |
| 68 | line-trace | puzzle | 10·10·10·10·10 | 11.9 / 24 | 0% / 0% | 17.7 / 40 | 0% |  |
| 69 | checkers-6 | board | 50·50·50·50·50 | 50 / 50 | 100% / 0% | 50 / 50 | 0% | i iii-C |
| 70 | memory-cards | puzzle | 10·10·10·10·10 | 15.9 / 31 | 0% / 0% | 17.7 / 31 | 0% |  |
| 71 | halfpipe-skate | action | 10·10·10·10·10 | 10 / 10 | 0% / 0% | 10 / 10 | 0% |  |
| 72 | domino-run | action | 10·10·10·10·10 | 10 / 10 | 0% / 0% | 10 / 10 | 0% |  |
| 73 | sudoku-mini | puzzle | 10·10·10·10·10 | 10 / 10 | 0% / 0% | 10 / 10 | 0% |  |
| 74 | mancala-kalah | board | 50·50·50·50·50 | 45.3 / 94 | 60% / 20% | 29.5 / 86 | 10% | i iii-C |
| 75 | plane-landing | drive3d | 50·45·46·45·46 | 31.9 / 49 | 50% / 0% | 30.9 / 52 | 0% | i iii-C |
| 76 | dot-eater | action | 5·5·5·5·5 | 6.8 / 14 | 0% / 0% | 9.4 / 18 | 0% |  |
| 77 | missile-command | action | 5·5·5·5·5 | 9.2 / 20 | 0% / 0% | 14.1 / 18 | 0% |  |
| 78 | area-claim | action | 6·6·6·6·6 | 6.3 / 12 | 0% / 0% | 5.7 / 6 | 0% |  |
| 79 | solitaire-klondike | board | 8·8·8·8·8 | 12.8 / 18 | 0% / 0% | 16 / 24 | 0% |  |
| 80 | hit-blow | puzzle | 18·18·18·18·18 | 18 / 18 | 0% / 0% | 18 / 18 | 0% |  |
| 81 | lunar-lander | drive3d | 6·6·6·6·6 | 6 / 6 | 0% / 0% | 6 / 6 | 0% |  |
| 82 | shanghai-tiles | board | 6·6·6·6·6 | 5 / 5 | 0% / 0% | 5 / 5 | 0% |  |
| 83 | beach-volley | sports | 5·5·5·5·5 | 7.8 / 21 | 0% / 0% | 6.4 / 19 | 0% |  |
| 84 | slide-puzzle | puzzle | 14·14·14·14·8 | 14.5 / 27 | 0% / 0% | 16.2 / 27 | 0% |  |
| 85 | sugoroku-race | board | 72·72·72·72·72 | 56.4 / 82 | 75% / 55% | 66.8 / 91 | 80% | ii iii |
| 86 | takoyaki-grill | action | 5·5·5·5·5 | 5 / 5 | 0% / 0% | 5 / 5 | 0% |  |
| 87 | road-city | action | 23·41·13·36·15 | 28.4 / 61 | 35% / 5% | 31.6 / 61 | 10% | (i) (iii) |
| 88 | stack-harvest | action | 8·8·8·8·8 | 39.3 / 61 | 65% / 5% | 40 / 58 | 20% | iii-C |
| 89 | stack-acorn | action | 8·8·8·8·8 | 39.3 / 61 | 65% / 5% | 40 / 58 | 20% | iii-C |
| 90 | downhill-mountain | sports | 10·10·10·10·10 | 12.2 / 26 | 0% / 0% | 12.9 / 31 | 0% |  |
| 91 | downhill-snow | sports | 33·48·48·30·48 | 44.2 / 60 | 80% / 10% | 44.8 / 54 | 0% | i iii-C |
| 92 | fishing-sea | sports | 18·18·18·18·18 | 20 / 42 | 10% / 0% | 18 / 18 | 0% |  |
| 93 | fishing-deepsea | sports | 18·18·18·18·18 | 21.9 / 66 | 10% / 5% | 18 / 18 | 0% | (iii) |
| 94 | fishing-river | sports | 18·18·18·18·18 | 20.4 / 42 | 10% / 0% | 18 / 18 | 0% |  |
| 95 | road-jungle | action | 23·41·13·36·15 | 28.4 / 61 | 35% / 5% | 31.6 / 61 | 10% | (i) (iii) |
| 96 | road-desert | action | 23·41·13·36·15 | 28.4 / 61 | 35% / 5% | 31.6 / 61 | 10% | (i) (iii) |
| 97 | stack-sakura | action | 8·8·8·8·8 | 39.3 / 61 | 65% / 5% | 40 / 58 | 20% | iii-C |
| 98 | ring-flight-summer | drive3d | 41·46·41·40·25 | 28.4 / 64 | 30% / 10% | 22.3 / 30 | 0% | i (iii) |
| 99 | stack-leaves | action | 8·8·8·8·8 | 39.3 / 61 | 65% / 5% | 40 / 58 | 20% | iii-C |
| 100 | curling-winter | sports | 45·45·45·45·45 | 32.3 / 45 | 25% / 0% | 30.3 / 45 | 0% | i |
### 3.1 1回だけタップした場合（onetap、種1〜3、実測）
- ほとんどのゲームは無操作と同じ点だった。
- **1回タップしただけで C に届いたのは3本。** minesweeper-8（34/47/44）、tower-defense（34/34/66）、bubble-shooter（20/54/20）。どれも無操作では C 未満。
- sugoroku-race は、1回タップすると下がった（72→47/46/26）。サイコロが進むと CPU に抜かれるため。
- stack 系は 8→15 に上がったが、C には届かない。

### 3.2 何もしない方が、適当に触るより高いゲーム（実測、無操作の平均 − ランダムの平均 ≥ 5）
| ゲーム | 無操作の平均 | ランダムの平均 | 理由（コード） |
|---|---|---|---|
| connect-four | 55 | 28.8 | 時間切れの引き分け 55、負けは最大 45（games.js:5665） |
| reversi-6 | 50 | 40.6 | 石の差0で 50、負けは最大 45（games.js:4618） |
| air-hockey | 50 | 41.3 | 0-0 の引き分け 50、負けは最大 48（games.js:6030） |
| curling-ice / curling-winter | 45 | 32.5 / 32.3 | 引き分けの扱い 45（games.js:7741） |
| plane-landing | 46.4 | 31.9 | 自動で降下した着地の点（games.js:8452） |
| ring-flight-3d / -summer | 38.6 | 28.4 | 基本点 15 に加えて、まっすぐ飛ぶとリングを通る（games.js:5302） |
| submarine-3d | 38.4 | 26.8 | 生き残ると +10、HP×3（games.js:6140） |
| sugoroku-race | 72 | 56.4 | 誰も動かないと同着1位になる（games.js:9832 の安定ソート、9934） |
| mini-golf-physics | 62.2 | 56.8 | 未プレイのホールの par まで引く（games.js:2935-2936） |
- このほか、animal-shogi と checkers（50）は、ランダムでも無操作と同じ点だった。ボットの手がほとんど成立しないため。

## 4. 分類

### (i) 無操作で C 以上（6割以上の種）: 19本（実測）
falling-block-puzzle、tilt-maze-3d、mini-golf-physics、sky-shooter、reversi-6、animal-shogi、ring-flight-3d、connect-four、air-hockey、gomoku-9、hang-glider-3d、curling-ice、checkers-6、mancala-kalah、plane-landing、sugoroku-race、downhill-snow、ring-flight-summer、curling-winter。
- ときどき C（1〜2/5）: road-themed、p3-space、p3-drive、road-city、road-jungle、road-desert、submarine-3d、doodle-jump の8本。

| 原因の種類 | ゲーム | 根拠 |
|---|---|---|
| 対戦の時間切れ・引き分けの点（T1） | reversi（50）、animal-shogi（50）、connect-four（55）、gomoku（55）、checkers（50）、mancala（50）、air-hockey（50）、curling×2（45） | games.js:4618, 4907, 5665, 6294, 7972, 8323, 6030, 7741 |
| 自動で進む・基本点が高い（T7） | falling-block（下限35。`clamp(35+…,30,100)`）、sky-shooter（自動射撃の撃破＋残機×6）、ring-flight×2、hang-glider（距離/30＋未着地 +8）、plane-landing、tilt-maze（`15+prog*30`）、downhill-snow（自動で滑ってゴールすると下限45） | games.js:1653, 4316, 5302, 6740, 8452, 2648, 1485 |
| 得点式の不具合候補 | mini-golf（未プレイのホールの par も合計に入る → 無操作で over=3〜5、点数 55〜73）、sugoroku（全員が0マスのとき、プレイヤーが1位扱い → 72） | games.js:2935-2937、9832, 9934 |

### (ii) 無操作で B 以上: 5本（実測）
mini-golf-physics、connect-four、gomoku-9、sugoroku-race、hang-glider-3d。
- submarine-3d も 1/5 で B（66）だった。

### (iii) ランダム操作でほぼ B 以上（運だけで高得点）: 4本（実測）
| ゲーム | ランダムの B 率 | 連打の B 率 | 注記 |
|---|---|---|---|
| mini-golf-physics | 75% | 50% | 無操作でも B。原因は (i) の不具合候補 |
| gomoku-9 | 100% | 100% | ボットが石を置けず、時間切れの 55 になる（限界2）。実機では違う結果になると推定する |
| hang-glider-3d | 55% | 60% | 無操作でも B になりやすい |
| sugoroku-race | 55% | 80% | 運のゲーム（T1 G-FG-16、T8 G-FG-13）。連打での最大は 91 |
- 半分以上の回で C に届く: 25本（`classes.json` の randC）。代表は stack 系5本（平均約39）、minesweeper（1タップで C）、bubble-shooter、darts、blackjack、jenga。
- 1回でも B が出た: 35本。blackjack の最大は 90、mancala は 94、pinball は 99、tower-defense は 89。

### (iv) ほぼ自動で100点: 0本（実測）
- 無操作で100点になったゲームはない。
- 近いもの: hang-glider-3d は無操作で 91（S）が1/5 回出た。dragDecorate-cake はランダムで100点が1/20 回出た。

### (v) 測定ではほぼ届かない／熟練しても高得点が難しいもの
- **(v-a) 実測**: ランダムでも連打でも、30回中一度も C に届かなかったゲームが42本ある（`classes.json` の randNeverC）。これらは「触れば点が出る」ゲームではない。ただし、熟練すれば届くかどうかはこの測定ではわからない。
- **(v-b) 推定（得点式から）**: 100点や S に届かない、または届きにくいゲーム。T2 と一致する。

| ゲーム | 推定の最高点 | 根拠 |
|---|---|---|
| beach-volley | 88（S 不可） | games.js:9676 `10+me*12+22+min(8,rally)`、me は最大4 |
| minesweeper-8 | 96（実際は約90前後と推定） | games.js:4994 `72+max(0,60-経過秒)*0.4` |
| tennis-rally | 94 | games.js:6485（T2 G-DE-27） |
| air-hockey | 98 | games.js:6030 `70+(me-ai)*7` |
| tank-battle | 99 | games.js:6394 `78+lives*7` |
| puzzle-2048 | 1024 を作れないと最大 96 | games.js:5740-5741（T2 G-DE-15） |
- **どれも B（55）までは得点式の上で届く（推定）。** したがって T2 は、個性の C/B には効かない。効くのは S ランクのブースト（§1.4）だけ。

## 5. ジャンル別の偏り

| ジャンル | 本数 | 無操作で C 以上(6割以上の種) | うち無操作で B 以上 | 無操作でときどき C | ランダム/連打で半分以上 C | ランダム/連打で半分以上 B | 無操作が終わらない |
|---|---|---|---|---|---|---|---|
| action | 32 | 1（sky-shooter） | 0 | 5（road-themed, doodle-jump, road-city, road-jungle, road-desert） | 8（stack-themed, stack-snowman, sky-shooter, jenga-tower, stack-harvest, stack-acorn, stack-sakura, stack-leaves） | 0 | 1（pinball-physics） |
| drive3d | 16 | 5（tilt-maze-3d, ring-flight-3d, hang-glider-3d, plane-landing, ring-flight-summer） | 1（hang-glider-3d） | 3（p3-space, p3-drive, submarine-3d） | 3（tilt-maze-3d, hang-glider-3d, plane-landing） | 1（hang-glider-3d） | 0 |
| sports | 21 | 5（mini-golf-physics, air-hockey, curling-ice, downhill-snow, curling-winter） | 1（mini-golf-physics） | 0 | 4（mini-golf-physics, air-hockey, darts-board, downhill-snow） | 1（mini-golf-physics） | 3（ski-jump, darts-board, track-field） |
| puzzle | 17 | 1（falling-block-puzzle） | 0 | 0 | 3（falling-block-puzzle, minesweeper-8, bubble-shooter） | 0 | 0 |
| board | 12 | 7（reversi-6, animal-shogi, connect-four, gomoku-9, checkers-6, mancala-kalah, sugoroku-race） | 3（connect-four, gomoku-9, sugoroku-race） | 0 | 7（reversi-6, animal-shogi, gomoku-9, blackjack-21, checkers-6, mancala-kalah, sugoroku-race） | 2（gomoku-9, sugoroku-race） | 2（blackjack-21, yacht-dice） |
| strategy | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
### 5.1 個性への影響（実測 `idle-life-sim.json`、種3）
| 何回目 | ゲーム（無操作） | 点・ランク | がんばり★ | ゆうき★ |
|---|---|---|---|---|
| 1 | mini-golf-physics | 64 B | 2 | 1 |
| 2 | connect-four | 55 B | 3 | 2 |
| 4 | sugoroku-race | 72 B | 4 | 2 |
| 7 | reversi-6 | 50 C | **5** | 2 |
| 11 | sky-shooter | 35 C | 5 | 3 |
| 15 | downhill-snow | 47 C | 5 | 3 |
- 15回の放置のあと、がんばりは 72点（自然経験の上限）、ゆうきの `genre:` は5件（sports, board, drive3d, puzzle, action）だった。
- 4回目で、好きな遊びが「ボード・テーブル」に決まった。
- 15回中13回が C 以上だった（submarine 18、tilt-maze 15 は D）。

### 5.2 ジャンルの公平さ
- **ゆうき（未経験の遊び）**: 6ジャンル中5ジャンルは、無操作で C が出るゲームを持つ。最も確実なのは、puzzle が falling-block（常に35〜36）、board が7本、sports と drive3d が各5本。action は sky-shooter（3/5）と road 系。
- **strategy だけは、無操作では取れない**（tower-defense 30、roguelike 12）。ランダムでも tower-defense の C は35%、roguelike は0%。つまり strategy の1件だけが「遊ばないと取れない」。
- **不公平に稼げるのはボード。** 12本中7本が無操作で C、3本が B。原因は「時間切れ・引き分けの点が、負けより高い」こと（T1）。
- **がんばりは、ジャンルを問わず埋まる。** カテゴリごとの上限が6件で、無操作 B が5本、無操作 C が19本ある。そのため、遊ぶゲームを選べば数回で上限に達する。ゲームはゲームきろくの一覧から選べる（script.js:18857-18868）。「もういちど」で同じゲームを続けても、同じ ID は1件しか入らない。
- **好きな遊び**: C 以上の結果だけが好みの点に入る（script.js:10819）。そのため、放置すると board・drive3d・sports に寄りやすい（推定。5.1 の実測では board）。

## 6. 方針の比較材料

- 対象: 無操作 C の19本（＋ときどき8本）、無操作 B の5本、1タップで C の3本、運で B の4本。
- 「人間判断」は、性格成長量・実績条件・セーブ形式・T 判断の原則のどれかに触れるもの。

### 6.1 点数式を変えない方針
| 案 | 何をするか | 止められるもの（実測の本数） | 残るもの | 変更の場所 | 判断 |
|---|---|---|---|---|---|
| A1 無操作を数えない | セッション中にプレイヤーの入力が0回なら、individualGameResult を呼ばない | 無操作 C 19本＋ときどき8本＝**27本**の無操作の結果すべて。無操作 B 5本も含む | 1タップで C の3本、運の4本、ランダムで C の25本 | script.js:17163 の直前で判定。入力の数は、既存の document の capture（script.js:16978-16999）で数えられる | 点数・記録・コイン・実績は変わらない。**ただし「C で経験」という条件に入力の条件を足すので、T7 の原則として人間の承認が必要** |
| A2 入力回数の下限 N | 入力が N 回未満なら数えない（例: N=5） | A1 の27本＋1タップの3本（minesweeper, tower-defense, bubble-shooter）＝**30本** | 運の4本、ランダムで C の25本。ボットの入力は1回の実行で5〜380回あったので、下限ではランダム操作を止められない | A1 と同じ | A1 と同じく人間判断。N の値も決める必要がある |
| A3 対戦の「手を指さずに時間切れ」を数えない | 盤上・対戦のゲームが「プレイヤーの手が0回」の結果を返したら、個性に数えない | board 6本＋air-hockey＋curling 2本＝**9本** | T7 の自動進行の8本、不具合候補の2本 | ゲーム側から「手の数」を受け取る仕組みがいる。U5 `mgVersusOutcome` の前段にあたる | 点数式は変えないが、ゲーム側の変更がいる。T1 の判断と一緒に決める |
| A4 個性だけ閾値を上げる | 例: ゆうき・がんばり[0] を B 以上、がんばり[1] を A 以上にする | 無操作 C 14本（B 未満のもの） | 無操作 B 5本、運の4本 | script.js:10811, 10817 | **人間判断（性格の成長条件の変更）**。熟練者の成長も遅くなる |

### 6.2 点数式を変える方針
| 案 | 対象 | 本数 | 無操作の点の変化（推定） | 関わる T | 判断 |
|---|---|---|---|---|---|
| B1 対戦の時間切れ・引き分けの点を、負けの上限以下（例: ≤30、または手番0なら最低点）にする | reversi, animal-shogi, connect-four, gomoku, checkers, mancala, air-hockey, curling×2 | **9** | 45〜55 → 35 未満。無操作 B の2本（connect-four, gomoku）も外れる | **T1**（引き分けの点数帯の表） | 人間判断（T1 が未決） |
| B2 不具合候補の修正: mini-golf の par は遊んだホールだけで数える。sugoroku の同着は1位にしない | mini-golf, sugoroku | **2** | mini-golf 55〜73 → 15（3ホール未プレイなら over=12）。sugoroku 72 → 46 以下（同着の扱いによる） | 不具合なのか仕様なのかの確認（mini-golf はコードの意図と合わない可能性が高い。推定） | 確認後なら実装の判断だけで済む。sugoroku は T1 G-FG-16・T8 G-FG-13 と一緒に決める |
| B3 自動で進むゲームに「無操作の上限」を設ける（例: 入力がないと C 未満） | falling-block, sky-shooter, ring-flight×2, hang-glider, plane-landing, tilt-maze, downhill-snow | **8**（ときどき C の submarine・road 系5本・doodle-jump も入れれば15） | 35〜91 → 35 未満 | **T7** | 人間判断（T7 の原則）。熟練者の点の分布も変わる |
| B4 100点・S をそろえる | beach-volley, minesweeper, tennis, air-hockey, tank, 2048 | 6 | 個性の C/B には影響なし（推定） | T2 | 人間判断。個性の観点では優先度は低い |
- **B1＋B2＋B3 で、無操作 C の19本すべてに対応できる**（9＋2＋8＝19、重なりなし）。
- B 系の案では、無操作の育成・コイン（§1.4）も同時に直る。A 系の案では、個性だけが直る。
- **運の4本**（mini-golf, hang-glider, sugoroku, gomoku）のうち、mini-golf と hang-glider は B2・B3 で下がると推定する。sugoroku は運のゲームなので、T8（運のゲームと明記するか）の判断がいる。gomoku は測定の限界による可能性が高く、実機で確かめる必要がある。

### 6.3 組み合わせの目安
| 組み合わせ | 無操作 C の残り（本） | 1タップ C の残り | 運 B の残り | 人間判断の数 |
|---|---|---|---|---|
| 何もしない | 19（＋8） | 3 | 4 | 0 |
| A1 だけ | 0 | 3 | 4 | 1（T7 の原則） |
| A2（N=5）だけ | 0 | 0 | 4 | 1（T7 の原則＋N の値） |
| B1＋B2＋B3 | 0（推定） | 3 | 1〜2（sugoroku、gomoku は要実機確認） | 2〜3（T1・T7、B2 の確認） |
| A1＋B1＋B2 | 0 | 3 | 2〜3 | 2（T1・T7） |
- 性格成長量（1件4点、上限6件）、実績の条件、セーブ形式を変える案は含めていない。A4 は成長の条件を変えるので、人間判断とした。
- 測定の限界（§2.3）により、本数には ±数本の誤差がある。特に、ランダム操作の率と、2回タップで確定するゲーム（gomoku など）に誤差がある。
