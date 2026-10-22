# Phase 0 検証 G-QI: クイック50本と本編接続（traitCounts 以外）

- 対象: 付録 `quick-games-50.md` と `integration-main-game.md` の指摘のうち、traitCounts（性格）に関係しないもの全部。加えて、ミニゲーム・クイックで読む箇所はあるのに書く箇所がない状態フィールドを横断で探した。
- 基準: 作業ツリー HEAD 28624886（249a954f をマージしたもの）。行番号は現行ファイルの番号。script.js は 14703 行より後ろが前回監査から +2 ずれている。quick.js / audio.js / style.css は前回監査と同じ行番号。
- コードは変更していない。検証用に書いたスクリプトは同じフォルダにある。
  - `qi-voice.cjs`: 声のラッパーの引数を実測
  - `qi-solo-toast.cjs`: solo の結果トーストを実測
  - `qi-writeonly.cjs` / `qi-ach.cjs`: 書き込み元の grep
  - `qi-emoji.cjs`: デコイの絵文字と仲間の絵文字の重なりを確認

---

## A. クイック（quick.js / 本体との連携）

### G-QI-01 / quick（疑問形の cue 6本）/ 仕様不整合
- **現象**: 本体側の声のラッパーが第2引数を捨てる。そのため、疑問形の cue（こいびとは？・なかまは？・いくつ？・どっち？・きせつは？／はるは？…・いろは？・てんきは？）が、命令調の「〜っ!」で読み上げられる（よみあげ=tts モードのとき）。
- **根拠**:
  - quick.js:933 `voice(String(game.say || def.say), { question: /[？?]$/.test(String(game.cue || def.cue)) })`
  - script.js:14529 `voice: (text) => audio.voice(text),` ← `o` を渡していない
  - audio.js:382-386 `voice(text, o = {})` → `tts(text, o)` → `shapeCue`。audio.js:358-364 は `o.question` があれば語尾に「?」を付け、なければ「っ!」を付ける。
  - 実測（qi-voice.cjs）: count を起動すると、audio.voice への呼び出しは `[["いくつ"]]`（引数1個）だった。`_shapeCue('いくつ',{question:true})` は「いくつ?」、question なしは「いくつっ!」になる。
- **判定**: **確定不具合（一意）**。
  - 正本 audio.js:354「しつもん(こいびとは)は「こいびとは?」— 語尾を あげる」
  - 正本 quick.js:933 は question を渡している（呼び出し側の意図が明示されている）
- **修正単位**: script.js:14529 を `voice: (text, o) => audio.voice(text, o)` にする（1行）。
  - 影響範囲: 記録・実績・セーブには影響しない。
  - 回帰テスト案: quick-mode-test に追加する。`h.api.audio.voice` を差し替えて引数を記録し、`startQuickRun('count')` のあと `calls[0][1].question === true` を確認する。命令形の 1本（例: mash）では `question === false` を確認する。

### G-QI-02 / quick（count・doors・button）/ 表示不整合
- **現象**: cue のオーバーレイ（600ms。画面全体に暗い放射グラデーションと 40px の文字）が、最初の短い時間だけ情報を見せるゲームの表示と重なる。
  - count: ⭐を見せる時間は SHOW=1.1s（Lv1）〜0.78s（Lv5）。
  - doors: 中にいる相手を見せる時間は SHOW=0.8s。相手の絵は画面中央の高さ（H*0.5）にあり、cue の文字と同じ位置になる。
  - button: Lv5 では GO が出る時刻が最短 0.8/1.56≈0.51s なので、cue 表示中に GO が出る。
- **根拠**:
  - quick.js:31（CUE_MS 600。コメントに「この あいだも そうさは うけつける」）
  - quick.js:927-930, 996
  - quick.js:621（count SHOW）, 828（doors SHOW 0.8）, 359（button goAt）
  - style.css:4515-4520（inset:0、pointer-events:none）
- **判定**: **Human QA 要**。
  - 操作を受け付けることは仕様で明示されている。ただし、見えにくさがどの程度かはコードからは決まらない。
- **確定手順**: 実機（縦長スマホ、H≈300 と ≈510 の2条件）で count と doors を Lv1・Lv5 で各10回録画し、次を測る。
  - cue が消えてから情報が消えるまでの残り時間（count は Lv5 で約 180ms しかない）
  - 正答率
  - 結果が「見えなかった」になるなら直す。直し方の候補: 対象ゲームの SHOW を `CUE_MS` 後から数える（`t` を cue 後に開始する共通オプション `showAfterCue`）、またはそのゲームでは cue を上部の帯に縮める。

### G-QI-03 / quick（makeQuickRun）/ 難易度配線
- **現象**: MAX_LEVEL=6 には到達しない。
  - level = min(6, 1+floor(index/LEVEL_EVERY)) で、index の最大は TOTAL-1。混合は 19/4、solo は 9/2 で、どちらも Lv5 が上限になる。
  - 13か所で `lerp(a, b, (level-1)/(MAX_LEVEL-1))` を使っているため、設計上の終点 b（Lv6 の値）が一度も使われない。たとえば stop の窓は 0.06 ではなく Lv5 の 0.07 で止まる。
- **根拠**: quick.js:35, 918。`RULES.MAX_LEVEL - 1` が13か所（grep）。README:73 には「4ゲームごとにレベルが上がり」とあるだけで、最大値の記述はない。
- **判定**: **仕様判断要**。正本が最大レベルを定めていない。
- **選択肢**:
  - (a) MAX_LEVEL=5 にする。13本の lerp の終点が Lv5 に来るので、Lv5 が少し難しくなる（stop の窓 75ms→約 64ms など）。G-QI-04 と一緒に見る必要がある。
  - (b) 6 のまま、レベルの式を `1+floor(index*(MAX_LEVEL-1)/TOTAL)` などに変えて、最後の数本で Lv6 に届かせる。
  - (c) 現状を維持し、コメントに「6 は lerp の分母用で到達しない」と明記する。
  - 影響: 記録とセーブへの影響はない。テスト `levels.slice(0,4)` と Lv2 の limit のテストは (a)(c) なら不変。(b) では solo の [1,1,2,2] が変わる可能性がある。

### G-QI-04 / quick（mash・stop の Lv5）/ 難易度配線
- **現象**: Lv5 の要求値が極端になる。
  - mash: need=9+3·2+2·4=23 回を、limit=3400×0.72=2448ms で押す必要がある。約 9.4 回/秒。
  - stop: 窓の半幅 0.07、速度 (0.9+0.3)×1.56=1.87/s なので、窓は約 75ms。
- **根拠**: quick.js:137, 178-179, 920-922。
- **判定**: **Human QA 要**。正本に難度の上限がなく、テストは target() による理想操作だけで確かめている。
- **確定手順**: 実機で Lv5 を 10人×10回試し、成功率を測る。Lv5 のタイミング系（umbrella / fish / cliff / shutter）の成功率と比べ、目安として半分以下なら調整対象にする。G-QI-03 の (a) を選ぶと stop はさらに厳しくなるので、同時に判断する。

### G-QI-05 / quick（落下・飛来系）/ 難易度配線
- **現象**: 動く速度が px/s で固定されている。一方で canvas の高さは、画面に応じて 300〜510px（maxGrow 1.7）の範囲で変わる。このため、画面の高さによって到達時間と難度が変わる。
- **根拠**: quick.js:902 `createMgCanvas(canvas, 300, { grow: true, maxGrow: 1.7 })`。script.js `createMgCanvas` の grow 処理。`g.speed` を px/s の値に掛けている箇所が21か所。
- **判定**: **Human QA 要**。
- **確定手順**: devtools で高さ 300 と 510 の viewport を作る。dodge / coins / feather / umbrella などの Lv1・Lv5 で、対象が到達するまでの時間を測る（ログを入れるか、target() の ready が立つまでの時間で測る）。差が 1.5 倍を超えるなら、速度を H に比例させる共通ヘルパー（例: `px(v) = v * H / 300`）を検討する。

### G-QI-06 / quick（partner。恋人なし時の「なかまは？」）/ bug
- **現象**: 恋人がいないときは「なかまは？」と出題し、正解は自分の仲間1人になる。ところがデコイは固定の12種から選んでおり、自分のほかの仲間の絵文字を除外していない。仲間 🦊・🐱・🐰・🐼・🐨 はデコイの候補と重なるので、仲間が2人以上いると、2人目の仲間がデコイとして出て、それを押すと失敗になることがある。
- **根拠**:
  - quick.js:271-274 `const answer = pe || pick(comps); const decoyPool = [...].filter((e) => e !== answer);`
  - 仲間の絵文字（script.js:8789〜 COMPANION_RUNTIME）とデコイ12種の重なりは 🦊 🐱 🐰 🐼 🐨（qi-emoji.cjs と grep で確認）。
  - 確率の見積り: 重なる仲間が1人いる場合、Lv1-3 で 2/11≈18%、Lv4+ で 3/11≈27%。
- **判定**: **確定不具合（一意）**。
  - 正本 quick.js:267 のコメント「3にんの なかから こいびと(いなければ なかま)を タップ」、表示される問い「なかまは？」(quick.js:279)。仲間が2人並ぶと正解が2つになり、問いと採点が食い違う。正答を1つにする方法は「デコイから自分の仲間・恋人を全部除く」しかない。
- **修正単位**: decoyPool の除外対象を `answer` 1つから、集合 `new Set([pe, ...comps].filter(Boolean))` に広げる。
  - doors（quick.js:825）は1人だけを使うので対象外。
  - 影響範囲: 記録・セーブへの影響はない。
  - 回帰テスト案: harness で `state.partner=null`、`state.companions` に 🦊 と 🐱 の2人を入れる。Math.random を固定して partner を 200 回生成し、faces のうち仲間の絵文字が常に1つだけであることを確認する。

### G-QI-07 / quick（partner・doors。仲間0人のとき）/ 仕様不整合
- **現象**: 恋人も仲間もいないと、`companions()` は代わりに ['🐇','🐿️','🦋'] を返す。そのため、まだ出会っていない（🐿️は実在の仲間の絵文字）か、仲間ですらない絵が「なかまは？」の正解になる。
- **根拠**: quick.js:20, 271-273, 825。
- **判定**: **仕様判断要**。正本は仲間がいないケースを書いていない。
- **選択肢**:
  - (a) 仲間がいないときは partner・doors を出題の候補から外す（`def.ready(S)` のような共通の出題可否フック）。
  - (b) 正解を自分の姿（sprite）にして「じぶんは？」にする。
  - (c) 現状を維持する。
  - 影響: (a) は混合ランの出題分布が変わる。solo の一覧からも外すか、無効表示にする必要がある。

### G-QI-08 / quick（solo の記録）/ 表示不整合
- **現象**: solo は50本すべてが `minigameRecords['quick-solo']` の1枠を共有している。結果トーストの「はじめての記録!／自己ベスト更新!／自己ベスト◯点(ランク◯)」はこの共有枠で判定されるので、ほかのゲームの記録が表示される。
- **根拠**:
  - quick.js:889 `id: only ? 'quick-solo' : 'quick-run'`
  - script.js:16350 `recordMinigameResult(game, score)` → 15115-15123（game.id をキーにしている）
  - script.js:15828-15830（トーストの文言）
  - 実測（qi-solo-toast.cjs）: button の solo で 100点を取ったあと、初めて遊ぶ stop の solo を 0点で終えると、トーストは「D 0点 自己ベスト100点(ランクS)」になった。stop 自身の記録は `quick.single.stop = {runs:1,best:0}`。
- **判定**: **確定不具合（一意）**。
  - 正本 README:73「好きな1本だけを10回くりかえす遊びかた…もでき、1本ごとの最高記録が残ります」。トーストの「自己ベスト」は、いま遊んだ1本の記録を指す以外に読みようがない。
- **修正単位**:
  - solo のときは、トースト用の比較元を `lifetime.quick.single[id]` にする。前回の best×(100/SOLO_TOTAL) を prevBest として渡す。
  - 実装は `recordMinigameResult` の前で「solo なら single から作った疑似 prev を使う」とする分岐が最小。
  - キーを `quick-solo:<id>` に分ける案もある。ただし記録の互換に注意が要る。既存の `minigameRecords['quick-solo']` と、テスト quick-mode-test:193 の `minigameRecords['quick-solo'].last` が影響を受ける。
  - 影響範囲: 実績は countMinigameRecords が pool で絞るので無関係。セーブ互換は前者の案なら不変。
  - 回帰テスト案: qi-solo-toast.cjs の手順をテストにし、2本目のトーストが「はじめての記録!」になることを確認する。

### G-QI-09 / quick（lifetime.quick）/ 到達不能（書くだけで読まない）
- **現象**: 書き込むだけで、どこからも読まれないフィールドがある。
  - `quick.plays` / `quick.clears` / `quick.totalCleared` / `quick.bestCombo` / `quick.single[id].runs`
  - どの本で失敗したかは最終画面にも一覧にも出ない。
- **根拠**:
  - 書き込み: script.js:14779-14787
  - 読み取り: grep の結果、12240-12242 で使っているのは runs・bestCleared・single.best だけ
- **判定**: **仕様判断要**。正本はこれらの表示を求めていない。
- **選択肢**:
  - (a) 一覧に表示する。solo ボタンに clears/plays の成功率、カードに最大連続を出す。
  - (b) 集計をやめる。セーブには残しても無害。
  - (c) 将来の調整データとして現状を維持し、そうコメントする。
  - 影響: どれを選んでもセーブ互換は保たれる。

### G-QI-10 / quick → minigameScoreSum / minigameCount / 仕様不整合
- **現象**: クイックの結果でも `state.minigameScoreSum` と `minigameCount` が増える（isQuick の分岐より前で加算している）。これらは `avgSkill` の材料で、隠し種族れんくんを変身候補に入れる条件（`minigameCount>=5 && avgSkill>=85`）に使われる。solo なら1本だけを選んで 10/10=100点を簡単に重ねられるので、れんくんの条件を満たしやすくなる。
- **根拠**:
  - script.js:16355-16356（加算）、959, 993（avgSkill の使い道）
  - README:73「おせわ・せいちょう・関係などの育成パラメータを変えない独立モード」
  - spec `2026-09-16-quick-mode-economy-rules.md`「育成パラメータには一切影響しない」「通常育成とは切り離した独立の腕試しモード」
  - 一方、テスト `tests/quick-mode-test.cjs:196` は `assert.equal(s.minigameCount, 1, 'one completed solo run applies one result')` で、クイックでも加算されることを**期待している**。
- **判定**: **仕様判断要**。spec・README（加算しない側）と既存テスト（加算する側）が食い違っている。
- **選択肢**:
  - (a) クイックでは加算しない。2行を isQuick 分岐の後ろに移し、テスト 196 行を `minigameCount===0` に直す。spec・README と一致し、れんくんの抜け道がなくなる。
  - (b) 加算は続け、avgSkill の計算だけクイックを除く。そのためには別のカウンタ（`quickScoreSum` 等）が必要。
  - (c) 現状を維持し、README/spec に「腕前の平均には入る」と追記する。
  - 影響: セーブ互換は保たれる。れんくんの出やすさが (a)(b) で下がる。

### G-QI-11 / quick → actionCounts.play・lifetime.minigamesPlayed・envPlays / 誤検出
- **現象（前回の指摘）**: クイックでも、ミニゲーム回数系の実績（minigame-30/150/500、play-100、rain/snow-play）が進む。
- **判定**: **誤検出**。
  - spec `2026-09-16-quick-coin-and-star-scope.md`「記録・実績は従来どおり残す」、`quick-mode-economy-rules.md`「クイックモードの記録・自己ベスト・クイック専用実績は維持する」、README:73「自己ベスト・ランク・実績は残ります」。
  - テスト quick-daily-economy-v2:51 と quick-mode-test:153/195 は、minigamesPlayed の加算を意図どおりとして確認している。
  - tryStartPlay は `actionCounts.play += 1` を `if (!isQuick)`（affectionStreak / travelStreak のリセット）の外に置いている（script.js:17119-17123）。クイックを意図して数えている配置になっている。
  - actionCounts / envPlays は実績の集計にしか使われていない（qi-ach.cjs）。育成パラメータではない。

### G-QI-12 / quick（solo 一覧の cue とヒント欄の motif）/ 表示不整合
- **現象**:
  - solo 一覧に出る cue は def の固定値で、実際のプレイで出る指示と違う（「スワイプ！」→実際は「うえへ！」等、「いろは？」「きせつは？」「てんきは？」「たたけ！」）。
  - プレイ中のヒント欄には、内部の分類である motif（「（倉庫番）」など）がそのまま出る。
- **根拠**: script.js:12242、quick.js:931, 194/600/286/866/438。
- **判定**: **仕様判断要**。代表の指示として固定値を見せるのは設計として成り立つ。正本は表記を定めていない。
- **選択肢**:
  - (a) def に `listLabel` を追加して、一覧用の表記を別に持つ。
  - (b) 現状を維持する。
  - (c) ヒント欄から motif を外す。
  - 影響: 表示だけ。

---

## B. 本編との接続（integration-main-game.md）

### G-QI-13 / なかまのさそい「またきた」/ 到達不能
- **現象**: `openCompanionInvite` は `companionFriendshipProgress[id] > 0` のときに「◯◯がまたきた／◯◯だ。またあった」を出す。しかし、この値を増やすコードがない。
- **根拠**: 全 .js を grep した結果、出てくるのは次の3か所だけ。
  - 初期化 script.js:1602
  - 読み取り 11201-11205
  - 勧誘成功時の delete 16428-16429
  - qi-writeonly.cjs でも、書き込みが0件のフィールドとして出た。
- **判定**: **仕様判断要（到達不能は確定）**。
  - 構造から読める意図は「勧誘に失敗したら progress を増やし、次に会ったら再会扱い」。成功時の delete と `!hasRecruitedCompanionId` の条件がそれを前提にしている。ただし、加算の条件と量を書いた正本はない。
- **選択肢**:
  - (a) 勧誘に失敗したとき（rawScore < threshold、script.js:16443 付近）に `+1` する。「また こんど」で断ったとき（companionInviteLaterBtn）も加算するかどうかは別に決める。
  - (b) 分岐と台詞を削除し、フィールドはセーブ互換のために残す。
  - 影響: (a) はセーブに新しい値が入る（既存フィールドなので migration は不要）。
  - 回帰テスト案: 勧誘で 49点 → 次に openCompanionInvite したとき、タイトルが「またきた」になることを確認する。

### G-QI-14 / なかま経路（E/E'）の開始ゲート / 仕様不整合
- **現象**: 「あそぶ!」は tryStartPlay を通らず `startMinigame(pickRandomMinigame())` を直接呼ぶ。その結果、次のようになる。
  - げんきが10未満でも遊べる。
  - 初回の操作説明カードが出ない。それでも pickRandomMinigame が play count を加算するので、説明を出す「最初の3回」がそのまま消費される。
  - ゲームパスを装備していても、実際のゲームになる。
- **根拠**:
  - script.js:17787-17796（stillOk は ねむり・成長中・へんしん選択中しか見ない）
  - 16077（recordMinigamePlay）、16546-16548（説明は play count が3以下のときだけ）
  - 16467-16469 のコメント「opts.intro … tryStartPlay だけ」
  - README:75「そのゲームを3回遊ぶまでは…カードで見せ」
  - README:107「ゲームパスは…次の「あそぶ」まで5秒待ち」（「あそぶ」ボタンに限った書き方）
- **判定**: **仕様判断要**。
  - 説明カードについては、README:75（すべてのゲームが対象と読める）と、コード内コメント（tryStartPlay だけ）が食い違っている。
  - げんきとゲームパスについては、正本がなかま経路を明示していない。
- **選択肢**:
  - (a) 共通の開始ゲート `beginPlaySession(game, {source})` を作り、なかま経路も通す。説明カード・げんき判定・後述の記録がそろう。げんきが足りないときに勧誘を失わせるかどうかは別に決める。
  - (b) 説明カードだけ通し、げんきとゲームパスは「なかまの誘いは特別」として現状を維持し、README に書く。
  - (c) 現状を維持し、README:75 に「なかまのさそいでは出ない」と追記する。
  - 影響: (a) は、げんき不足時に勧誘の機会が減る。

### G-QI-15 / なかま経路の actionCounts.play・envPlays / bug
- **現象**: なかまの誘いで実際にミニゲームを遊んでも、`actionCounts.play`（実績 play-100「ひとつの人生で、30回あそんだ」）と `envPlays`（rain-play「雨の日にミニゲームであそんだ」、snow-play、night-play-10）が増えない。
- **根拠**: 加算しているのは tryStartPlay の中（script.js:17119, 17123）だけで、なかま経路（17796）はそこを通らない。終了時の `minigamesPlayed` はなかま経路でも加算される（16357）ので、同じ1回が実績によって数えられたり数えられなかったりする。
- **判定**: **確定不具合（一意）**。
  - 正本は実績の説明文（script.js:2232-2233, 2241）。なかまの誘いで遊ぶのも「ミニゲームであそんだ」に当たる。直し方は「なかま経路でも同じ2つを記録する」で一意に決まる。
- **修正単位**: tryStartPlay の 17119-17123 の「遊んだ記録」部分（`actionCounts.play += 1`、`recordEnvironmentPlay()`）を `notePlayStarted(game)` のような関数に切り出し、なかま経路の startMinigame 直前でも呼ぶ。G-QI-14 (a) の共通ゲートを作るなら、その中に含める。
  - 影響範囲: 実績の進み方が少し早くなる。セーブ互換は保たれる。
  - 回帰テスト案: 雨の環境で openCompanionInvite → playBtn を押したとき、`envPlays.rain===1` と `actionCounts.play===1` になることを確認する。

### G-QI-16 / プレイ回数を開始時に加算 / 仕様不整合
- **現象**: `minigamePlayCounts` はゲーム開始時に加算される。そのため、始めてすぐ「やめる」と、games-played-25/60 と games-complete-100（「◯しゅるいのミニゲームをあそんだ」）、未プレイ優遇の解除、一覧の「◯かい」に数えられる。
- **根拠**: script.js:16077、17129、2348-2351（countMinigamesPlayed）。
  - 中断（retire）は回数を戻さない。
  - 初回説明の「3回まで」も、この開始ベースの回数を前提にしている（16542-16548 のコメント）。
- **判定**: **仕様判断要**。
  - 「あそんだ」に中断を含めるかどうかを定めた正本はない。
  - skip-rules spec が定めているのはゲームパスの扱いだけ。
- **選択肢**:
  - (a) 種類数の実績用に、完了時に加算する別のカウンタ（`minigameCompleted[id]`）を新設する。説明カードと抽選は今の開始ベースのまま残す。
  - (b) 中断のとき、`minigamePlayCounts` を1戻す。ただし説明カードの回数も戻ることになる。
  - (c) 現状を維持する。
  - 影響: (a) は既存セーブで種類数が減って見える。過去分は minigameRecords の有無で補える。

### G-QI-17 / 抽選のコメント（質ティア）/ 表示不整合（コメント）
- **現象**: 現行のコードにないティアの説明がコメントに残っている。そのすぐ後ろには「出やすさは ぜんゲーム 同確率」というコメントもある。実際には、未プレイ ×2.2・回数による減衰・地域 ×1.45・季節 ×1.25・環境補正がかかるので、これも合っていない。
- **根拠**: script.js:15901-15905, 15906（同確率の記述）, 15945-15946（「ティアに おうじて 追加チケット(S:2枚 A:1枚)」）。`MINIGAME_TIER_*` は全 .js を grep しても0件。
- **判定**: **確定不具合（文言側を直す）**。
  - 正本 README:61「現在の地域や季節に合うもの、まだあまり遊んでいないものは出やすくなります」。
- **修正単位**: 15901-15908 と 15945-15948 のコメントを、実際の重み（minigameDrawWeight の4要素と、地域・季節の追加券）の説明に書き換える。コードは変えない。テストは不要。

### G-QI-18 / 実績 id の数字と条件 / 誤検出
- **現象（前回の指摘）**: minigame-50 の条件が 30回、minigame-300 が 150回、minigame-1000 が 500回、record-rank-s-15 が 10種になっている。
- **判定**: **誤検出（不具合ではない）**。
  - id はセーブ（lifetime.achievements）のキーで、画面には出ない。
  - 表示の label/desc と condition は一致している（script.js:2219, 2255, 2307, 2309）。
  - id を変えるにはセーブの移行が必要になるので、直さないのが正しい。必要なら id の横に「id は旧条件の名残」とコメントを書く程度でよい。

### G-QI-19 / rain-play・snow-play と手動の天気 / 仕様不整合
- **現象**: `recordEnvironmentPlay` は天気の取得元（source）を見ないので、「せかい」で天気を手動で雨にしても rain-play が加算される。一方、隣の `noteEnvironmentSeen`（weather-all 用）は manual を除外している。
- **根拠**: script.js:13832-13844。コメント 13832「手で えらんだ ときは かぞえない」が付いているのは noteEnvironmentSeen だけ。
- **判定**: **仕様判断要**。
  - 説明文は「雨の日に」で、手動の雨を「雨の日」と見なすかどうかを正本は決めていない。
  - 隣の関数の方針は参考になるが、こちらに適用するとは書かれていない。
- **選択肢**:
  - (a) manual を除外して weather-all にそろえる。
  - (b) 現状を維持し、コメントに「遊ぶ実績は手動の天気でも数える」と書く。
  - 影響: (a) は rain/snow-play の取りやすさが下がる。獲得済みの実績は消えない。

### G-QI-20 / resultMessageForScore の境目 / 仕様不整合
- **現象**: メッセージ欄の一言は 80点／50点を境目にしている。育成の境目は 70点（大成功）／30点（失敗）。そのため次のずれが起きる。
  - 30〜49点: 通常成功で30コインをもらうのに、文言は「今回はここまで!」系。
  - 70〜79点: 大成功の会話が出るのに、文言は「あとちょっといけそう!」系。
- **根拠**: script.js:16082-16088 と 16351-16352, 16372-16380。
- **判定**: **仕様判断要**。メッセージの境目を定めた正本はない。
- **選択肢**:
  - (a) 70/30 にそろえる（`isGreat` / `isBad` を引数で渡す）。
  - (b) 3段階のうち下の段だけ 30 に合わせる。
  - (c) 現状を維持する（ランク B=55 などとも違う、独立した気分の表現として扱う）。
  - 影響: 表示だけ。

### G-QI-21 / ストーリーフラッシュと結果トースト / 表示不整合
- **現象**: 大成功・失敗のときは `checkStoryEvents('minigame-great'|'minigame-bad')` を遅延なしで呼ぶ（発生率 45%）。そのため、結果トーストの表示中（3.6〜6秒）にストーリーフラッシュも出る。キャラの会話には `delayMs: resultDuration` を付けているが、ストーリーにはない。
  - `checkStoryEvents` は delayMs 引数に対応している（script.js:10663 の関数内）。
- **根拠**:
  - script.js:16455-16461
  - 表示位置: index.html:136 の `#mgResultToast`（top:100px、z6）と、index.html:240 の `#storyFlash`（top:0、z5）。親要素が違う。
- **判定**: **Human QA 要**。重なり方は、配置とスクロールの状態によって変わる。
- **確定手順**: 実機で Math.random を固定するか、何度か繰り返して 90点・10点のときにフラッシュを出す。トーストの「もういちど」ボタンとフラッシュが重なるか、文字が読めるか、notify 音と fanfare 音がかぶるかを録画で確認する。問題があれば `checkStoryEvents(ctx, resultDuration)` を渡す（1行）。

### G-QI-22 / pet-expression の REACTIONS / 誤検出
- **判定**: **誤検出**。
  - spec `docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:11` が `reactionFor(event)` の対応表を定めていて、そこに「other events→null」とある。minigame_great/bad が未登録なのは仕様どおり。
  - 体の動きは cast-motion.js:102, 128 で付けている。

### G-QI-23 / MASTER_SPEC J-3 の古い記述 / 誤検出
- **判定**: **誤検出（正本ではない）**。
  - NAOTOCCHI_MASTER_SPEC.md の冒頭（3-11行）が「以下は歴史的な棚卸し」「専用ごほうび…を復活させる根拠にはしない」「I章とJ-1／J-2は…更新済み。その他の過去の棚卸しは冒頭の注意に従って」と明記している。J-3（770行〜）は、現行仕様として扱われていない。
  - 気になるなら J-3 の見出しに「（旧・歴史資料）」と付ける程度の文書整理で足りる。

### G-QI-24 / 「100本コンプリート」の固定文字列 / 誤検出
- **判定**: **誤検出（現状は一致している）**。
  - script.js:12220 と実績の label（2308「100ぼんコンプリート」）は固定文字列だが、`buildMinigamePool().length` は現在 100（smoke の `minigames started: 100`）なので一致している。
  - 本数を変える場合に保守上の注意が要るだけ。必要なら `${pool.length}本` にする（改善）。

### G-QI-25 / Sランク閾値・大成功閾値 / 誤検出
- **判定**: **誤検出**。
  - S=90、A=75、大成功=70 という差は、script.js:15095-15099 のコメントに「大成功(70+)と A(75+)が ほぼ そろう ように」と意図が書かれている。
  - README:147（S でせいちょう2倍。日次の達成回とクイックは対象外）とコード（16401）も一致している。
  - 以前の「Sランク15種」は旧 README（docs/history）の記述で、現行の正本ではない。

---

## C. 横断: 読むのに書かない状態フィールド（traitCounts 以外）

- 方法:
  - `freshState()`（script.js:1390-1702）の全キーについて、全 .js で書き込みのパターンを grep した（qi-writeonly.cjs）。パターンは代入・`+=`・`++`・push/add/set・`[k]=`。
  - 実績の condition が参照する全フィールドについても、同じように確認した（qi-ach.cjs）。
  - 書き込みが0件と出たものは、別名変数経由（companionsRecruited の `record.push` など）を手で除外した。
- 結果:

| 区分 | フィールド | 状況 | 指摘 |
|---|---|---|---|
| 到達不能（ミニゲーム関連） | `lifetime.companionFriendshipProgress` | 読む: 11201。書く: なし（delete だけ） | G-QI-13 |
| 書くだけ（クイック） | `quick.plays / clears / totalCleared / bestCombo / single[id].runs` | 書く: 14779-14787。読む: なし | G-QI-09 |
| 読まれも書かれもしない | `lifetime.dailyStreak / dailyLastDate`（1670-1671） | 初期化だけ。spec daily-challenge-v2:12「連続日数ボーナスは撤去」、:26「移行や削除…を確認」 | G-QI-26 |
| 範囲外（参考） | `lifetime.bonusUnlockedThemeIds` | 読む: 2744（isThemeUnlocked）。実行時に書く箇所なし（移行とテストだけ）。ミニゲームとは無関係なので、該当担当へ回す | ― |

- 実績の condition が参照するフィールドで書き込み元がないのは、traitCounts.gentle / brave / romantic（別担当）だけだった。
- ほかに確認したもの:
  - ストーリーのプール13種、minigame_great/bad の会話、companion_new は、いずれも呼び出し元がある。
  - quick.js / games.js が S.* として期待する関数は、本体がすべて渡している。例外は `S.debugHook` で、テスト用の任意フックなので問題ない。

### G-QI-26 / lifetime.dailyStreak・dailyLastDate / 到達不能（不要フィールド）
- **現象**: 初期化（script.js:1670-1671）以外に、読む箇所も書く箇所もない。
- **判定**: **仕様判断要**。spec が「移行や削除」を実装前の確認事項として残したまま、決まっていない。
- **選択肢**:
  - (a) freshState から外す。旧セーブの値は merge で残っても無害。
  - (b) 互換のために残し、コメントで「V2 で廃止」と明記する。
  - 影響: どちらでもゲームの挙動は変わらない。

---

## 共通パターンとしてまとめられる修正単位

| パターン | 対象 |
|---|---|
| 開始時の共通処理 `beginPlaySession` / `notePlayStarted`（開始の判定・説明カード・actionCounts・envPlays を1か所にまとめる） | G-QI-14, G-QI-15（G-QI-16 の (a) を選ぶ場合も、ここに完了カウンタを置く） |
| クイックを育成側の集計から外す（isQuick 分岐より前の加算を見直す） | G-QI-10 |
| solo の記録を1本ごとに参照する（トーストの比較元を `quick.single` にする） | G-QI-08（G-QI-09 の表示を足すなら同じ箇所） |
| 本体からモジュールへのラッパーで引数を落とさない（`(...a) => audio.voice(...a)`） | G-QI-01 |
| 自分の関係者をデコイから除く集合（partner と companions） | G-QI-06（G-QI-07 の出題可否フックも同じ場所） |
| 結果表示の境目を育成と同じ isGreat / isBad にそろえる | G-QI-20, G-QI-21（遅延も resultDuration にそろえる） |
| 古いコメント・文書の整理 | G-QI-17（確定）, G-QI-23, G-QI-18（コメントを付けるだけ） |
| quick のレベル曲線（MAX_LEVEL と lerp の分母） | G-QI-03, G-QI-04 |

## 改善工程送り（Phase 0 の一覧から外すもの）
- G-QI-04（Lv5 の手応えは改善工程で調整。実測で確定するまでは Human QA）
- G-QI-12
- G-QI-24
- そのほか付録にあった「楽しさ」系: 重複群（stop/stack、umbrella/fish、pull/lift/pushbox）、color・weather・season の答えが固定で暗記できること、weather が本当の天気を見ないこと、ゲームごとの成功・失敗の一言がないこと、30〜69点のキャラ反応がないこと、なかまの固有台詞が各1本しかないこと、ゲーム別・自己ベスト・初Sの台詞がないこと、knock の正解後の待ち時間

## 気づき（5行）
1. 確定した不具合は4件（G-QI-01・06・08・15）で、どれも数行で直せる局所的な修正。セーブ互換への影響もない。
2. 「クイックは育成に影響しない」は、spec・README と既存テスト（quick-mode-test:196 の minigameCount===1）が逆を向いている。まずテストの意図を確認する必要がある（G-QI-10）。
3. なかまの誘いの経路は、tryStartPlay を通らないことでいくつも食い違いを生んでいる（説明・げんき・ゲームパス・回数・環境）。開始処理を1か所にまとめるのが根本の対策になる。
4. 到達不能なコンテンツで新たに見つかったものはなかった。traitCounts のほかは companionFriendshipProgress だけ。それ以外は「書くだけ」の集計値と、廃止済みの日次連続のフィールドだった。
5. 前回の指摘のうち5件（REACTIONS、MASTER_SPEC、実績 id、100本の文言、閾値）は、spec・コメント・冒頭の注意書きで説明がついていて、誤検出だった。
