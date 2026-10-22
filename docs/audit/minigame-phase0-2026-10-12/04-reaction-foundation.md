# 04. ゲーム反応共通基盤 — 現状・設計案・適用方法（Phase 0）

- 基準: main `249a954f`。現状の調査結果の全文は `evidence/reaction-infra-current.md` にある（行番号つき。2点は実行して確かめた）。
- ここに書くのは**設計案**。実装はしていない。台詞の大量追加もしていない。
- **新しい育成効果・性格の変化・報酬は導入しない**。反応は表示（台詞・表情・動き）に限り、保存もしない。
- 例外として、記録用のフィールドを足す場合は、別途判断を受ける。

---

## 1. 現状の構造

### 1.1 流れ（通常ゲーム）

```
games.js  onComplete(score)                    ← 引数は点数だけ（85か所すべて）
  → session guard (16527)
  → finishMinigame(score, customMessage)       ← customMessage を使うのはクイックだけ
  → finishMinigameInner
      recordMinigameResult → {score,best,prevBest,isNewBest,rank,bestRank}
      isGreat(≥70) / isBad(<30) / isQuick
      育成・コイン・日次・Sブースト・なかま勧誘          ← クイックはここに来る前に終わる
      showMinigameResultToast → resultDuration (3600/6000ms)
      speakEvent('minigame_great'|'minigame_bad'|'companion_new', {delayMs: resultDuration})
                                                 ← 30〜69点では何も言わない
      checkStoryEvents('minigame-great'|'minigame-bad')  (45%)
      emotePet(fun|sad|happy)
```

### 1.2 反応を担う既存の部品

| 部品 | 役割 | 流用できるか |
|---|---|---|
| `speakEvent(key, ctx)`（6215-6411） | 話者の選択（本人・恋人・なかま）、キャラ固有の台詞、掛け合い、遅延、取り消し、重複回避。`ctx.petText` で本人の台詞を外から差し替えられる | **◎ そのまま使う** |
| `CONVERSATION_POOLS` / `PARTNER_DAILY_REACTIONS` / `COMPANION_DAILY_REACTIONS` | 台詞データ。great と bad は共通プール。恋人は1人3本、なかまは1人1本 | ○ 既存のまま残す |
| `pet-expression.js` の `REACTIONS` | イベントキー → 一時表情。minigame は未登録（spec どおり） | ○ 2行足すだけで済む |
| `cast-motion.js` | イベントキー → 体の動き（great は bounce、bad は droop） | ◎ 既存のまま |
| `startRelationshipPositive`（8874） | 恋人・なかまのハートの一時反応 | ○ 未接続 |
| `scheduleCareAfterglow`（4117-4137） | 会話が落ち着いてから出す一時反応 | ○ 30〜69点帯に流用できる |
| `resident-expression.js`（めぐる） | 「出来事 → 感情 → 表情・台詞」を1か所の表で持ち、一貫性を検査（`consistent`）・監査（`audit`）する | **◎ 新しい層の雛形にする** |

### 1.3 足りないもの

- **ゲームの中のできごと**（釣った魚、ストライク、引き分け、くじら、など）が本体に届かない。
- **連敗・連勝・同じゲームの繰り返し・前回の点**が判定できない。`lastMinigame` と回数は開始時に今回の分へ書き換わる。`recordMinigameResult` は前回の `last` を返さない。
- 文脈で反応を選ぶ層が Home にない。条件分岐は呼び出し元に散らばっている。
- **クイックでは、キャラの反応がまったく出ない**（テストで固められているのは「育成・勧誘・ストーリー・メーターを通らないこと」だけ）。

### 1.4 壊してはいけない契約（テストで固められているもの）

- 結果トーストが先、反応は `delayMs: resultDuration` の後。お世話や再プレイで取り消される（minigame-lifecycle-test:17-45）。
- `speakEvent` を**名前経由で**呼ぶ（dialogue-test がこの関数を差し替えてキーを記録している）。イベントキー `minigame_great` / `minigame_bad` / `companion_new`。
- `CONVERSATION_POOLS` の全キーに、3話者分のプールと followUps があること（4拍のテスト）。**新しいキーを足すと、3プールと followUps がすべて必要になる。**
- 70/30・69/70・50 の境目と、ランク S90/A75/B55/C35。
- `minigameRecords[id]` は厳密に `{best,last}` の形。`dailyStreak`・`dailyLastDate` は変えない。新しい配列フィールドを足すなら、読み込み時の null 修復にも入れる。旧セーブの冪等性を保つ。
- クイックは、育成・勧誘・ストーリー・メーターを通らない。
- 一時表情・反応は保存しない。ゲーム中・メニュー表示中・storyFlash 表示中・睡眠中・critical のときは出さない。
- 台詞の文体（docs/TEXT_STYLE.md）。

---

## 2. 設計案: 4段のパイプライン

```
[games.js / quick.js]          [新: minigame-reactions.js（純関数・データのみ）]           [script.js 既存]
 onComplete(score, msg?, detail?) ─► ① buildResultContext ─► ② detectMoments ─► ③ resolveReaction ─► ④ dispatch
                                       (文脈を組み立てる)      (瞬間を検出)        (反応プランを選ぶ)    speakEvent / REACTIONS /
                                                                                                   castMotion / heart / afterglow
```

### ① buildResultContext（文脈）— 純関数

- 呼ぶ場所: `finishMinigameInner` の `recordMinigameResult` の直後（通常ゲーム）。クイックは `recordQuickRun` の後。
- 入力はすでに手元にあるものだけにする。

| フィールド | 出どころ（既存） |
|---|---|
| `kind` | `'normal'` / `'quick-run'` / `'quick-solo'` |
| `gameId`, `category`, `genre`, `home` | `activeMinigame`、`minigameCategoryOf`、`minigameGenreId`、`minigameHomeOf` |
| `score`, `band` | rawScore。band は既存の境目（great ≥70 / mid / bad <30）をそのまま使う |
| `record` | `recordMinigameResult` の戻り値（isNewBest、prevBest、rank、bestRank、初記録） |
| `prevLast` | **新規（メモリのみ）**: 記録する前に `minigameRecords[id].last` を読む |
| `playCount`, `totalPlayed` | `minigamePlayCount(game)`、`lifetime.minigamesPlayed` |
| `recent` | **新規（メモリのみ）**: 直近8回の `{gameId, band, score}` を持つリングバッファ。保存しない |
| `source` | `'play'` / `'companion'` / `'daily'` / `'replay'` |
| `relations` | 恋人の有無・関係段階、なかまの一覧、勧誘の結果 |
| `life` | 年齢、ライフステージ、種族（表示の出し分けだけに使う） |
| `env` | `currentEnvironment()` |
| `detail` | ゲームからの任意の付加情報（③ 参照）。無ければ空 |

- 新しく作るのはメモリ上の `prevLast` と `recent` だけ。**セーブの形は変えない。**
- 人生をまたいだ連敗などが必要になったら、そのときに別途判断を受けて、新しい `lifetime` キー（オブジェクト）を足す。

### ② detectMoments（瞬間）— 純関数・表で定義する

文脈から「いま何が起きたか」を、**優先度つきの表**で検出する。1回の結果につき、主な瞬間を1つ（と従の瞬間）返す。

| moment | 条件（既存データだけで判定できる） | 優先度の例 |
|---|---|---|
| `firstClear` | `record.prevBest == null` | 高 |
| `firstS` | rank S、かつ bestRank が以前 S でなかった | 高 |
| `newBest` | `record.isNewBest` かつ初回ではない | 中高 |
| `nearMiss` | `best - score ≤ 5`、または `65 ≤ score < 70`（大成功の一歩手前） | 中 |
| `losingStreak` | `recent` の末尾3件以上が bad | 中 |
| `repeatPlay` | `recent` の末尾3件以上が同じ gameId | 中 |
| `milestone` | `playCount ∈ {10, 50, 100}`、`totalPlayed ∈ {…}` | 中 |
| `rareDetail` | `detail.tags` に、表に登録された珍しい結果がある | 中高 |
| `companionRecruit` / `companionMiss` | 勧誘の結果（既存の判定） | 最高（既存の `companion_new` を保つ） |
| `plain` | 上のどれにも当たらない | 低（既存と同じ反応） |

- 閾値と優先度は**データ**として持つ。ゲームを増やしても、コードは変えなくてよい。
- 「惜敗」「連敗」などの判定は**表示だけに使う**。育成・報酬には一切つなげない（新しい育成効果を作らないため）。

### ③ resolveReaction（反応プラン）— 純関数・表で定義する

`(moment, ctx)` から、次の形の `ReactionPlan` を返す。

```js
{
  eventKey: 'minigame_great' | 'minigame_bad' | 'companion_new' | null, // 既存キーだけを使う
  petText?: string,            // speakEvent の ctx.petText で本人の台詞を差し替える
  partnerText?, companionText?, // 将来の拡張用（既存の固有→共通の選び方に合わせる）
  expression?: 'happy'|'sulky'|'strained'|...,   // pet-expression の既存の表情だけを使う
  motion?: (cast-motion の既存のレシピ名),
  relationshipHeart?: boolean, // startRelationshipPositive を呼ぶか
  quiet?: boolean              // 30〜69点帯の「会話なし・一瞬の表情だけ」
}
```

**台詞データの引き方（重複を避ける要）**: スコープつきの代替チェーンを使う。

```
gameId → category → genre → any        （通常ゲーム）
quick:<qid> → quick:motif → quick:any   （クイック）
```

- 100本＋50本のそれぞれに台詞を書かなくても、**ジャンル（6）とカテゴリ（83）の粒度で成立する**。特に化けるゲームだけ、gameId で上書きする。
- road×6、stack×6、fishing×4 などの派生も、**gameId や home（地域・季節）のスコープで台詞を上書きできる**。ゲームの数と構成を変えずに、それぞれに地域らしさ・季節らしさを足せる（後工程の「判断差の付与」とは別の、軽い手段になる）。
- 「何回か遊ぶと別のことを言う」は、`playCount` の帯を条件に入れたエントリで表す。
- 新しい台詞の表は `resident-expression.js` と同じく、`consistent()`（表情と台詞の符号が合っているか）と `audit()`（未使用のエントリ・欠けている代替）を持たせる。
- 台詞の文体は TEXT_STYLE.md に従う。テストで自動検査する（空でないこと、未置換の変数がないこと、同じ候補の中で完全一致がないこと）。

### ④ dispatch（既存の部品に流す）— script.js 内の薄いアダプタ

- `eventKey` があれば、**既存どおり名前経由で `speakEvent(eventKey, {delayMs: resultDuration, petText, …})` を呼ぶ**。
  - キーを増やさないので、4拍のテストや固有台詞のキー集合の契約に触れない。
- `quiet`（30〜69点帯）のときは、`scheduleCareAfterglow` 型で「トーストが消えた後に一瞬の表情・小さな動き」を出す。会話は増やさない（既存の30〜69点の体験からの変化を最小にする）。
- 表情: `pet-expression.js` の `REACTIONS` に `minigame_great: 'happy'`、`minigame_bad: 'sulky'`（または 'strained'）を足す。吹き出しの最初の拍で自動的に出る。
  - **既存 spec「ミニゲームでは無効化」との関係**: 無効になるのはゲーム中だけで、結果の後の吹き出しは対象外と読める。ただし念のため**表情の追加は人間の確認を受けてから**にする。
- **結果トーストの保護（01 の B05 / U11）**: dispatch の中で、遅延なしの吹き出し（そだち など）を `resultDuration` の後に回す。
- 恋人・なかまのハート: great のときに `startRelationshipPositive` を呼ぶかどうかは、プランの `relationshipHeart` で決める。

### 段階的な導入（挙動を変えない v0 から）

| 段 | 内容 | 挙動の変化 |
|---|---|---|
| **v0** | ①〜④を入れる。表は「既存の挙動を再現するエントリ」だけにする（great→minigame_great、bad→minigame_bad、mid→何もしない） | **なし**（既存テストがすべてそのまま通ることを導入の条件にする）。B05 のトースト保護だけ含める |
| v1 | `firstClear` / `newBest` / `firstS` / `nearMiss` に、ジャンル単位の petText を少しずつ足す（1ジャンルあたり数本） | 台詞の差し替えだけ。テキストのレビュー（TEXT_STYLE）が必要 |
| v2 | 30〜69点帯の `quiet` 反応。`REACTIONS` への表情の追加（要確認） | 表示だけ |
| v3 | `detail` の口を開ける。対戦の終局理由（01 の U5）、釣果などの `rareDetail` | ゲームごとの小さな変更（1行程度） |
| v4 | クイックへの適用（§4） | クイックの最終画面・判定表示 |

---

## 3. 通常100本への適用方法

1. **ゲーム側の変更なしで効く範囲（v0〜v2）**
   - 本体側の文脈（点数・記録・回数・関係・環境・ジャンル・カテゴリ）だけで、初回／自己ベスト／初S／惜敗／連敗／繰り返し／節目／恋人・なかまの反応が出せる。
   - **100本すべてに一度に効く。**
2. **付加情報の口（v3）**
   - `onComplete(score, message, detail)` のように**後ろへ任意の引数を足す**。既存の85か所は1引数のまま動く。セッションの見張り（16527）と `finishMinigame` も、後ろに足すだけで済む。
   - `detail` の形（案）: `{ outcome?: 'win'|'draw'|'lose'|'timeUp'|'escape', tags?: string[], stats?: {...} }`。
   - 最初に対応させる候補:
     - 対AI盤面・対戦の約15本: U5 `mgVersusOutcome` から outcome を自動で出す（1か所の変更で済む）
     - 釣り4本: 釣った魚の種類（くじら・ワニなどの珍しい結果）
     - bowling（ストライク）、takoyaki（焦がした）、sushi（注文を全部取った）
   - 珍しい結果のタグは表に登録したものだけを使う。未登録のタグは無視する。
3. **派生ゲーム（road×6、stack×6、fishing×4、ring×2、curling×2）**
   - 削除・統合はしない。
   - 台詞のスコープを gameId または home（地域・季節）で上書きすることで、反応の面から地域差・季節差を付けられる。
   - ゲームの判断差は、後工程で別に検討する。
4. **ゲームを追加・改修するとき**: 表にエントリを足すだけで済む。コードは変えない。`audit()` が代替の欠けを検出する。

## 4. クイック50本への適用方法

- **原則**: クイックは育成・勧誘・ストーリー・メーターを通らない（既存の契約）。反応は**表示だけ**に限る。
- **文脈の出どころ**: `onRunEnd(stats)` がすでに本体に届いている（`{cleared, total, maxCombo, level, lives, plays, clears, score, solo}`）。これに、失敗した cue の一覧（quick.js 内で集計済みの `clears/plays` から作れる）を足して `kind:'quick-*'` の文脈にする。
- **瞬間**: `perfect`（20/20）、`firstRun`、`newBestCleared`、`bigCombo`、`failedOn:<qid>`（何で失敗したか）、`soloFirst`（その1本を初めて遊んだ）。
- **反応の出し口（2か所。どちらもデータ駆動）**:
  1. **最終画面の一言**（quick.js の `finishRun` の表示。954行付近）: 本体から `S.reactionLine(ctx)` のような提供関数を受け取り、1行だけ表示する。例として「たべろ で 🧦をたべた」のような振り返りも、表の1エントリで書ける。
  2. **1問ごとの判定表示**（943行付近の ○/✕）: 任意の短い一言。表は `quick:<qid>` → `quick:motif` → `quick:any` のスコープで引く。テンポ（520ms）を壊さないよう、表示時間は増やさない。
- **本体のキャラの吹き出しをクイック後に出すか**は**人間の判断**とする（README の「育成に影響しない」とは矛盾しないが、クイックの軽さに関わるため）。
- **育成状態を参照する問題**（partner / doors / catch / find / season / weather）は、文脈の `relations` / `env` を quick 側に渡す口と共通化できる。
  - ただし、本当の天気や恋人の名前を出題に使うのは**ゲームの意味の変更**にあたるので、別途判断を受ける。

## 5. 重複実装を避けるための原則（まとめ）

1. 台詞・表情・動きの実行は、**既存の speakEvent / REACTIONS / cast-motion に一本化する**。新しい表示の経路を作らない。
2. 文脈の判定と反応の選択は、**純関数＋データの表**にする（resident-expression.js の形にそろえる）。node のテストで、DOM なしに全組み合わせを検査できる。
3. ゲームごとの if 文は書かない。ゲームを特定する必要があるときも、**表のスコープ（gameId）で表す**。
4. 既存のイベントキーを増やさない（増やすと、3プールと followUps の契約が全キーに及ぶため）。差し替えは `petText` で行う。
5. 保存しない。必要になったら、別途判断を受けてから新しい lifetime キーを足す（`minigameRecords` の形は変えない）。
