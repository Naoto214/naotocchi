# ゲーム反応共通基盤のための現状調査（なおとっち）

- 対象: `/home/user/naotocchi`。HEAD は `28624886`（249a954f に docs/audit だけを足したマージ）。`git diff --stat 249a954f HEAD` で差分は `docs/audit/minigame-portfolio-audit-2026-10-03/*` だけ。したがって、以下のコードの行番号は **249a954f と同じ**。
- コードは変更していない。commit・checkout もしていない。
- 動作を確かめたのは1回だけ。evidence/scripts の `p0/probe.cjs` から既存の `tests/helpers/runtime-harness.cjs` を読み込み、2か所の挙動を実際に確認した（§1.4 と §3.5 に「実行確認」と書いたもの）。それ以外は読んだコードと既存テストが根拠。
- 出発点にした前回監査は `integration-main-game.md` §2〜§3。主な点は再確認でき、一致した。行番号は前回の 0b0a6b3 から 2〜6 行ずれている。

---

## 1. ゲーム結果の流れ

### 1.1 呼び出し順（通常ゲーム）

| # | 段階 | 関数 / 処理 | file:line |
|---|---|---|---|
| 0 | 開始 | `tryStartPlay` → `recordMinigamePlay(game)`（回数を**開始時**に+1）→ `startMinigame` | script.js:17098-17136, 15873-15876 |
| 0' | なかま経路 | `startMinigame(pickRandomMinigame())`（tryStartPlay を通らない）。`pickRandomMinigame` 内で `lastMinigame` と回数を更新 | script.js:17795, 16074-16079 |
| 1 | ゲーム側 | `game.start(container, onComplete)` の中で `onComplete(score)`。**引数は1つ（点数）だけ**。games.js の85か所に、引数が2つの呼び出しは0件（grep） | games.js（例 4598-4601） |
| 2 | セッションの見張り | `onComplete = (result, message) => { if (session!==mgSession \|\| !gameActive) return; finishMinigame(result, message) }` | script.js:16527-16530 |
| 3 | 外枠 | `finishMinigame(score, customMessage)`。`game = activeMinigame`。`mgCodeDepth=0` に切り替えて Inner を呼ぶ | script.js:16324-16337 |
| 4 | 記録 | `recordMinigameResult(game, score)` → `{score, best, prevBest, isNewBest, rank, bestRank}`。保存先は `minigameRecords[id]={best,last}` | script.js:16348, 15115-15123 |
| 5 | 判定 | `isGreat = ≥70`、`isBad = <30`、`isQuick` | script.js:16352-16354 |
| 6 | 全体の集計 | `minigameScoreSum` / `minigameCount` / `lifetime.minigamesPlayed` を+1 | script.js:16355-16357 |
| 6Q | **クイックはここで終わる** | 下の 1.3 を参照 | script.js:16358-16370 |
| 7 | 育成 | ごきげん、げんき、へんしんメーター → `offerTransformIfReady()`。`applyGrowth`/`applyDecline`/`raiseDeathMeter` | script.js:16371-16385 |
| 8 | 報酬 | `result='great'/'success'/'failure'` → コイン。日次チャレンジ。Sランクのブースト・シール | script.js:16386-16409 |
| 9 | なかま勧誘 | `pendingCompanionId` があれば判定する（50 / レア70）。**ここで `pendingCompanionId=null` に戻す** | script.js:16416-16446, 9683-9684 |
| 10 | 通知 | `setMessage(resultMessage)` | script.js:16448 |
| 11 | 画面を閉じる | `closeMinigameScreen()`（`gameActive=false`） | script.js:16450, 16241-16253 |
| 12 | 結果トースト | `showMinigameResultToast(record)`。戻り値は表示時間（もういちどボタンあり 6000ms / なし 3600ms） | script.js:16451, 15824-15851 |
| 13 | 会話 | `speakEvent('companion_new' \| 'minigame_great' \| 'minigame_bad', {delayMs: resultDuration, partnerChance, companionChance})`。**30〜69点では呼ばない** | script.js:16453-16455 |
| 14 | 効果音 | rank が S/A なら fanfare、D なら fail、それ以外は clear | script.js:16456 |
| 15 | ストーリー | `checkStoryEvents('minigame-great' \| 'minigame-bad')`。delay なしで、確率は45% | script.js:16460-16461, 10663-10685, 6543 |
| 16 | 体の動き | `emotePet(recruited ? 'fun' : great ? 'fun' : bad ? 'sad' : 'happy')` | script.js:16463, 11009-11028 |
| 17 | 後処理 | `checkMeters()` → `saveState()`（中で `checkAchievements` が動き、実績の storyFlash が出る）→ `recordCareChange` → `render()` | script.js:16464-16467, 2858-2869, 2435 |

- `resultMessageForScore(score)` の判定は 80 / 50 の3段階（script.js:16082-16089）。呼ばれるのは、`customMessage` がないときだけ（16363 / 16391）。

### 1.2 各段階で手に入る情報

凡例: ◎＝引数やローカル変数で直接持っている。○＝その場で `state` などから引ける。×＝持っていない（渡されていない）。

| 情報 | games.js onComplete | finishMinigame | Inner（記録後） | トースト | speakEvent ctx | checkStoryEvents | emotePet | 根拠 |
|---|---|---|---|---|---|---|---|---|
| score | ◎ | ◎ | ◎ `rawScore` | ◎ `record.score` | × | × | × | 16348-16353, 6215 |
| game.id | ×（ゲーム自身は知っている） | ◎ `activeMinigame` | ◎ | × | × | × | × | 16325 |
| category | × | ○ `minigameCategoryOf.get(game)` | ○ | × | × | × | × | games.js:70-73, script.js:15076 |
| genre | × | ○ `minigameGenreId(game)` | ○ | × | × | × | × | 15078-15080, 14836-14844 |
| 名前・絵文字 | × | ○ `minigameInfo(game)` | ○ | × | × | × | × | 15072-15077 |
| 地域・季節限定か | × | ○ `minigameHomeOf.get(game)` / `isRegionExclusiveGame` | ○ | × | × | × | × | 15082-15092, 15890-15899 |
| rank / bestRank | × | × | ◎ `record` | ◎ | × | × | × | 15106-15108, 15122 |
| 自己ベスト更新 | × | × | ◎ `record.isNewBest` | ◎ | × | × | × | 15120 |
| 初記録（初めての完了） | × | × | ◎ `record.prevBest==null` | ◎ | × | × | × | 15122, 15829 |
| 前回のベスト | × | × | ◎ `record.prevBest` | ◎ | × | × | × | 15122 |
| そのゲームの前回の点（last） | × | ○（記録の前なら `minigameRecords[id].last`） | **×（上書き済み。`prev.last` は return に入っていない）** | × | × | × | × | 15119-15122 |
| そのゲームの回数 | × | ○ `minigamePlayCount(game)`（**開始時に加算済みで、中断も含む**） | ○ | × | × | × | × | 15869-15876, 17127 |
| 全体の完了回数 | × | ○ `lifetime.minigamesPlayed` | ◎ +1 済み | × | × | × | × | 16357 |
| 直前のゲーム | × | ○ `lastMinigame`（メモリのみ。**開始時に今のゲームへ書き換え済み**） | ○ 同左 | × | × | × | × | 15854, 16075, 17128 |
| 直近ジャンル4件 | × | ○ `recentMinigameCategories`（メモリのみ、開始時に push） | ○ | × | × | × | × | 15857, 16077, 17129 |
| 直前の結果（ゲームをまたいで） | × | **×（どこにも保存していない）** | × | × | × | × | × | — |
| なかま経路か | × | ○ `pendingCompanionId` | ◎ 16416 まで。そのあとは `recruitedNow` / `recruitedMotionTarget` だけ | × | △ `motionTarget`（加入したときだけ） | × | × | 16410-16446 |
| 恋人の有無・結婚 | × | ○ `state.partner` / `.married` / `relationshipStage()` | ○ | × | ○（speakEvent が内部で `state.partner` を見る） | × | × | 8160-8163, 6229 |
| なかま | × | ○ `state.companions`（`{id,bond}`） | ○ | × | ○（内部で `companionSpeaker()` がランダムに選ぶ） | × | × | 4267-4272, 6239 |
| 年齢 | × | ○ `currentAge()` | ○ | × | ○（`{age}` の置換だけ） | × | × | 9946-9948, 4963-4967 |
| ライフステージ・種族 | × | ○ `currentFormStageIndex()` / `state.speciesLine` | ○ | × | × | × | × | 11284-, 4259 |
| 天気・時間・季節・地域 | × | ○ `currentEnvironment()` → `{time,weather,weatherSource,season,region,locality?}` | ○ | × | × | × | × | 13784-13790 |
| 装備 | × | ○ `activeMinigameEquipment`（開始時に固定） | ◎ | × | × | × | × | 16523, 16387 |
| 日次チャレンジ達成 | × | × | ◎ `dailyCompleted` | × | × | × | × | 16395-16401 |
| ゲーム内部のできごと（釣った魚、ストライク、引き分け、くじら など） | **ゲームの中のクロージャだけ** | × | × | × | × | × | × | 下の 1.4 |

### 1.3 クイック（quick.js）の流れ

| # | 処理 | file:line |
|---|---|---|
| 1 | 1問ごとに `judge(ok)` が cleared / combo / lives / clears を更新し、○×を表示する | quick.js:935-946 |
| 2 | `finishRun()` で `stats = {cleared,total,maxCombo,level,lives,plays,clears,score,solo}` を作り、**`S.onRunEnd(stats)` → 本体の `recordQuickRun` を先に呼ぶ** | quick.js:947-952, script.js:14536, 14775-14788 |
| 3 | `FINAL_MS=2200` 待ってから `onComplete(score, '<cue or クイック>Nこクリア（さいだいMれんぞく）')`。**この2本目の引数が `customMessage` を使う唯一の例** | quick.js:956, 33 |
| 4 | 本体の Inner で `isQuick` に分岐する。コイン（混合の20/20だけ100）→ `setMessage(customMessage...)` → close → トースト → 効果音 → save → render で終わる | script.js:16358-16370 |

- **クイックでは `speakEvent` も `emotePet` も `checkStoryEvents` も `checkMeters` も呼ばない。** キャラクターの反応は一切出ない。
- テスト `quick-daily-economy-v2-test.cjs:65-73` は「Quick bypasses recruitment, story care, and meter processing」で、これを契約として確かめている。
- `stats` の構造化データは `lifetime.quick` に入るだけで、Inner には届かない。Inner が受け取るのは点数と文字列だけ。
- `onRunEnd` は FINAL_MS の待ちより前に呼ばれる。そのため、その2.2秒のあいだに「やめる」を押しても `lifetime.quick` は更新済みになる（quick.js:952 と 956 の順序から読める）。
- 「1本ずつ」は50本すべてが `id:'quick-solo'` を共有する（quick.js:889）。どの1本かは `activeMinigame.quickGameId` で分かる（quick.js:889）。

### 1.4 ゲーム内部の情報は本体に渡っているか → **渡っていない**

- `installMinigames(...)` が games.js に渡すのは描画・入力・難易度のヘルパーだけ。結果を返す口はない（script.js:14522）。
- 例: 釣りの `caught[]` は局所変数のまま（games.js:2946, 3002, 3108-3110）。ボウリングの `strikes` は `say()` に表示するだけ（games.js:459, 524）。陣取りの「引き分け」も、50点にして say するだけ（games.js:4598-4601）。ほかの「引き分け」も多数（games.js:4887, 5632, 5997, 6261, 6452, 6842, 7699, 7928, 8261, 9584）。
- クイックの `stats` は `lifetime.quick` に残る。ただし反応処理（Inner の非クイック部）には渡らない。

### 1.5 反応のタイミングで起きていること（実行確認あり）

1. **great / bad では、終了直後の `emotePet` の体の動きが出ない。**
   - 仕組み: 13 の `speakEvent` が `playConversationBeats` の中で `conversationBusyUntil = now + delay + …` をすぐに立てる（6420）。そのあとの 16 の `emotePet` は、`if (!conversationIsBusy()) castMotion.emote(...)` の条件で弾かれる（11012-11013）。
   - 実際に体が動くのは、トーストの後に吹き出しが出たとき。`castMotion.speak` → `reactionFor('minigame_great')='bounce'` / `'minigame_bad'` は pet なら `'droop'`（cast-motion.js:102, 128, 237-281）。
   - 30〜69点だけは会話がないので、その場で bounce が出る。
   - 実行確認: 90点・10点では、1ms 後の pet アニメーション数が0。50点では1。
2. **終了処理の途中でそだちが上がると、`gainSodachi` が先に `speakEvent('sodachi')` を予約する**（10130。Inner の7の中）。
   - great / bad では、13 の speakEvent が `clearConversationTimers()` を呼ぶので、そだちの台詞は消える（6221）。
   - **30〜69点では、そだちの台詞が delay 0 で出る。`setSpeechBubble` は `hideMinigameResultToast()` を呼ぶ（4225）ので、結果トーストがすぐ消える。**
   - 実行確認: 50点でそだちが上がると、1ms 後にトーストが hidden になり、吹き出し「おせわされた分、ちゃんと残ってる」が出ていた。
3. ストーリーフラッシュは結果トーストと同時に出る（4200ms。10658, 10709-10715）。
   - `petExpressionContextVisible()` は storyFlash が出ている間 false になる（4146-4152）。この間は一時表情（§3）を出せない。
   - `saveState()` の中で実績が解除されると、同じ storyFlash 枠が `じっせきたっせい!` で上書きされる（2868, 2435）。
4. `offerTransformIfReady()` が出す「へんしんメーターがいっぱい…」のメッセージは、直後の `setMessage(resultMessage)`（16448）で上書きされる（10645-10654）。`transformOptions` が立つと、`castMotion.canAnimate` が false になる（4041-4042）。

---

## 2. 会話システム

### 2.1 speakEvent の流れ（script.js:6215-6411）

1. **キーの読み替え:** `evolve→age`、`companion_new→minigame_great`（6216）。プールは `CONVERSATION_POOLS[dialogueKey]` で、なければ何もしない（6217-6218）。
2. **前の反応を消す:** `invalidateCareAfterglow`、`clearPetExpression(true)`、`clearConversationTimers()`（6219-6221）。**新しい会話は、常に前の会話を全部取り消す。** 優先度の比較はない。
3. **本人の台詞:** `ctx.petText` があればそれを使い、なければ `pickConversationLine(pool.pet, ctx)`（6223-6230）。
4. **恋人:** `state.partner && pool.partner && random < partnerChance(既定0.6)` のとき。
   - `PARTNER_RELATIONSHIP_LINES[id][court|marriage]` を最優先にする（partner_new / marriage のときだけ）。
   - それ以外は `partnerDailyLine(dialogueKey)`。中身は `pickCharacterConversationLine(PARTNER_DAILY_REACTIONS[id][key], pool.partner)` で、固有の台詞（直近で使っていないもの）を70%で選ぶ（6209-6213, 6231-6237, 4976-4980）。
5. **なかま:** `state.companions.length && pool.companion && random < companionChance(0.55)` のとき。
   - 話者は `companionSpeaker()` が**ランダムに1人**選ぶ（4267-4272）。台詞は `COMPANION_DAILY_REACTIONS[id][key]` と共通プールから選ぶ（6239-6243）。
6. **掛け合い:** 話者が2人以上で、random < 0.82 なら、`followUps[dialogueKey]` から本人がもう一言返す（6246-6411。minigame は 6392-6408）。
7. **表示:** `playConversationBeats(beats, eventKey, delayMs, motionTarget)`（6413-6428）。
   - 最大4拍。`SPEECH_DURATION_MS=2500` 間隔（4037）。
   - `conversationBusyUntil` を立てる（6420）。
   - 吹き出しは `setSpeechBubble`。ここで `PET_EXPRESSION.reactionFor(event)` → `startPetExpression`、`castMotion.speak` を呼ぶ（4221-4256）。

**重複を防ぐ仕組み**

- `recentConversationLines` に直近24行を覚え、記号や空白を無視したキーで比べて避ける（4953, 4968-4990）。
- ストーリーは `lastStoryEventMessage` で、同じ行が2回続くのを防ぐ（10668-10670）。
- ムービーは `pickMovieStory(key, stories)` の shuffle-bag で、一巡するまで同じ話を出さない（9226-9238）。

**クールダウン**

- 会話専用のクールダウンはない。
- 放置会話（`scheduleIdleGreeting`）は `!message && !conversationIsBusy()` のときだけ出る（11073-11082）。
- 体の idle は `!conversationIsBusy() && !speechActive`（11050-11053）。
- `petBusyUntil`（11014）。
- ストーリーは確率45%だけ（6543）。

### 2.2 台詞データの置き場所

| データ | 構造 | minigame 用の中身 | file:line |
|---|---|---|---|
| `CONVERSATION_POOLS[key].{pet,partner,companion}` | 21キー（feed … minigame_bad） | great: pet 9 / partner 8 / companion 9。bad: 9 / 8 / 7 | script.js:4279-4950（great 4883-4916, bad 4917-4950） |
| `followUps[key]`（speakEvent の中のローカル） | 21キー × 6本 | 各6本 | script.js:6247-6408 |
| `PARTNER_DAILY_REACTIONS[partnerId][key]` | 18人 × {play_with, medicine_cure, travel, minigame_great, minigame_bad} | 各3本 | script.js:4991-（cat_ceo 5008-5017） |
| `COMPANION_DAILY_REACTIONS[companionId][key]` | 26人＋旧ID × {feed, play_with, travel, minigame_great, minigame_bad} | 各1本 | script.js:5720-6207 |
| `PARTNER_RELATIONSHIP_LINES[id].{court,marriage}` | 固有の1行 | — | script.js:9146- |
| `PARTNER_/COMPANION_CHARACTER_IDLE_LINES`、`*_IDLE_LINES` | 放置会話 | — | 5480, 5573, 6434, 6485 |
| `STORY_EVENT_POOLS[context]` | `{emoji,message}[]` | minigame-great 5 / bad 4 | script.js:6544-, 6697-6736 |
| `resultMessageForScore` | 80/50 の3段階 × 5本（通知欄用） | — | script.js:16082-16089 |
| `movie-dialogue.js` | `dates/deepsea/partners/anniversaries/shared/legends`（話者つき beat） | 関係しない | movie-dialogue.js:13-284 |
| めぐる住民 `resident-expression.js` の `DIALOGUE[emotion]` | 感情→台詞 | 関係しない | resident-expression.js:155-161 |

### 2.3 ライフステージ・種族・関係による出し分け（ほかのイベントにすでにあるもの）

- **関係**
  - 恋人とその固有台詞（`PARTNER_DAILY_REACTIONS`）、なかまとその固有台詞。
  - 成立と結婚の固定行（`PARTNER_RELATIONSHIP_LINES`）。
  - 結婚の記念日では、仲直りの記録の有無でムービーを変える（9495-9520）。
  - 出し分けているのは「誰が話すか、どの固有プールを使うか」だけ。
- **年齢**
  - `{age}` の差し込み（4963-4967）。
  - 思い出あいさつで、40歳以上なら振り返りの台詞を出す（9876-9878）。`このまえ / Nさいのとき` の言い分けもある（9892-9894）。
  - 中年イベント `MIDLIFE_EVENTS`（10042-）。
  - **ライフステージ（stageIndex）で台詞を変える会話は、speakEvent 系に存在しない。**
- **種族**
  - 台詞の出し分けはない。
  - 動きの性格だけある: `personalityFor(id, stage, worldMaster.motionPersonality)`（cast-motion.js:93-98）。
  - 空腹の表情アイコンは種族と段階で変わる（pet-expression.js:375-408）。
  - 図鑑の説明は `stageDesc`（script.js:931）。
- **場所**
  - デートは deepsea なら `book.deepsea` に差し替える（9450-9452, 9461）。
  - 地域・天気の小さなできごと `ENV_MOMENTS` / `REGION_MOMENTS`（13925-, 14003）。
  - 方言は、本人がたまに出すもの（8%）として扱う（11104）。

### 2.4 テストと TEXT_STYLE.md が台詞データに課している制約

- **tests/dialogue-test.js**（npm test に含まれる）
  - **`CONVERSATION_POOLS` の全キー**で、partner / companion の発言確率を1にすると、**pet → partner → companion → pet の4拍が、0 / 2500 / 5000 / 7500ms に必ず出る**（182-197）。
    - このため、新しいキーを足すなら `pet` / `partner` / `companion` の3プールと **`followUps[key]` が必須**になる（random=0.25 < 0.82 のとき4拍目が要る）。
  - `validSpeech`: 台詞が空でない。`undefined` や未置換の `{age}{sodachi}{coins}` がない。話者は pet / partner / companion のどれか（167-174）。
  - 恋人18人全員に `['play_with','medicine_cure','travel','minigame_great','minigame_bad']` の固有台詞がある。2回続けて引くと違う台詞になる（実質2本以上）（216-224）。
  - なかま全員に `['feed','play_with','travel','minigame_great','minigame_bad']` の固有台詞がある（233-240）。
  - **90点 → `minigame_great`、10点 → `minigame_bad` のイベントが `speakEvent` を通って出る**（254-256）。
    - テストは `speakEvent = (key,ctx)=>{__events.push(key); …}` で**関数の束縛を差し替えて**キーを記録している（104-105）。
    - したがって、finishMinigame から**同じクロージャの中で `speakEvent` という名前を通して**呼ぶことが前提になっている。
  - 新しい会話は前の会話の残りの拍をすべて取り消す（210-214）。
  - 直近の重複回避と、記号違いを同一視すること（204-208）。
  - レアなかまの勧誘は69 / 70点が境目（819-829）。
- **tests/content-registry-test.cjs:62-82**: `PARTNER_DAILY_REACTIONS` のキー集合は master の partners と完全一致。`COMPANION_DAILY_REACTIONS` は companions＋旧ID と完全一致。
- **tests/midlife-test.cjs:5-12**: 指定した STORY_EVENT_POOLS（minigame は対象外）が3本以上あり、`{emoji,message}` 形式であること。
- **tests/movie-test.cjs**: 字幕に絵文字（`\p{Extended_Pictographic}`）を出さない（73, 92）。コイン・報酬を出さない（168-169）。話者の画像と名前を出す（89-90, 145-147）。
- **docs/TEXT_STYLE.md**（自動テストではない。方針）
  - 日本語の文中を空白で区切らない（7）。同義文や語尾の違いだけで本数を増やさない。同じ候補内の完全一致を避ける（12）。
  - 話者の役割（pet＝当事者の感情、partner＝距離感とツッコミ、companion＝参加・応援・発見）（29-35）。
  - 一人称や関西弁を全員に一律で付けない（37）。
  - 効果の数値は「ごきげん+8／げんき-3」のように「／」で区切る（22）。
  - ムービーは1枚につき1人が話す（41）。
- **movie-dialogue.js:1-3** の冒頭規約: 保存データ・報酬・タイマー・乱数をこのファイルに置かない。

---

## 3. 表情・動き

### 3.1 pet-expression.js

- 表情は11種: `EXPRESSIONS = normal, happy, strained, sulky, hungry, sick, tired, weak, critical, wantsPlay, sleeping`（7-9）。
  - 「残念・悲しい」専用の表情はない。近いのは `sulky` / `strained`。
- `REACTIONS`（イベントキー→一時表情）は Object.freeze された表（410-419）。
  - 登録済み: `play_with:'happy'`、`play_with_annoyed:'sulky'`、`overfeed / medicine_wrong:'strained'`、`feed / medicine_cure / sleep / wake:'normal'`。
  - **minigame_great / minigame_bad / companion_new は未登録**。
  - `reactionFor(event)` は未登録なら null を返す（471-473）。
- 持続表情 `PERSISTENT`（care の状態→表情。329-331）と `resolve(emotion, {reaction, sleeping, blocked})`（421-431）。
  - critical は reaction より優先される。

### 3.2 本体側の一時表情（script.js）

- `setSpeechBubble` の中で、**話者が pet のときだけ** `reactionFor(reaction.event)` を見る。値があれば `startPetExpression(expression, SPEECH_DURATION_MS)` を呼ぶ（4237-4240）。
- `startPetExpression`（4067-4084）は1件だけ持ち、保存はしない。
  - life / line / stageIndex が変わったとき、期限切れのとき、文脈が見えないとき、寝ているとき、critical のときは捨てる（4086-4098）。
  - 文脈が見えない（`petExpressionContextVisible`）とは: ゲーム中、めぐる中、へんしん選択中、メニュー、storyFlash、ライフカード（4146-4152）。
- ごはん・くすりの「余韻」`scheduleCareAfterglow`（4117-4137）。
  - 会話・動きが落ち着くのを120ms間隔で待ち、そのあと `castMotion.pet(motion)` と `startPetExpression('happy')` を出す。呼び出し元は 17013（feed）と 17218（cure）。
- 仕様の出典は `docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:12`。「pet の意味のある発話の拍で一時表情、partner / companion の発話では変えない、保存しない、ミニゲームなどで無効化する」と書かれている。

### 3.3 emotion-state.js（persistent）

- `resolve(signals)`（25-40）は care-status の signals → `{state, severity, motion, cueMinMs, cueMaxMs, gentle, suppressPetIdle}` に変換する純関数。
- 本体の `deriveHomeEmotion`（4139-4145）→ `syncHomeEmotion`（4193-4212）→ `scheduleEmotionCue`（4176-4190）で周期的な cue を出す。
- 会話中、余韻中、`petBusyUntil` 中は待つ（`canShowEmotionCue` 4167-4170）。
- **ミニゲームの結果は入力にない。** 入力は `CARE_STATUS.signals` だけ。
- 設計方針「状態（persistent）と反応（temporary）を分け、保存しない」は `docs/superpowers/specs/2026-09-15-emotional-state-layer-design.md:8-13`。

### 3.4 relationship-expression.js / relationship-reaction

- 恋人・なかまの表情は `resolve({kind,id,value,positive})` → `positive` / `lonely`（bond<30）/ `normal`（13-16）。対応するIDは `SUPPORTED`（5-8）。
- `createReactions()` は WeakMap に `REACTION_MS=2500` の一時反応を持つ。保存はしない（27-44）。
  - 呼び出し元は `startRelationshipPositive(kind, entity)`（script.js:8874-8876）。使われているのは、じゃれる（17273-17274）、恋人関係（8206, 9560, 17366, 17498）。
  - ハートの描画は script.js:14091-14150。
- tests/relationship-reaction-test.cjs は、トークンが一時的で entity に書き込まないこと（3-7）と、ハートの配置（8-57）を見ている。
- **ミニゲームからは呼ばれていない。** 恋人・なかまの「よかったね」をハートで出す口はあるが、未接続。

### 3.5 resident-expression.js（めぐる用）

- 構成は `出来事 → canonical emotion → expression → asset → renderer / dialogue` の1か所集約（1-11）。
  - `EVENT_REACTION`（talk / play_end → positive、talk_wake / pester → dislike）（131-136）
  - `REACTION` の継続秒（127-130）
  - `effectiveEmotion({persistent, reaction})`（146-149）
  - `EXPRESSION_FOR[family][emotion]`（45-49）
  - `DIALOGUE[emotion]` と `consistent(emotion, line)`（155-176）
  - 監査用の `audit`（178-189）
- 画像の解決は Home の正本（pet-expression の `assetFor`、relationship-expression の `resolve`）を流用し、複製しない（4-6, 18-26, 84-101）。
- 使っているのは meguru.js だけ（meguru.js:42）。テストは `tests/meguru-resident-expression-test.cjs`。

### 3.6 cast-motion.js（動きの正本）

- 表がイベントキー駆動になっている。
  - `SPECIAL`（evolve / transform / companion_new / partner_new / marriage → L3 のレシピ。52）
  - `EVENT_SCOPE`（SELF / GROUP / RELATIONSHIP。60-63）
  - `EVENT_RECIPES`（L2。64）
  - `reactionPlan(event, text, kind, primaryBeat)`（66-72）
  - `reactionFor(event, text, kind)`（100-132）
- minigame の扱い
  - `minigame_bad` は pet なら droop、それ以外なら nod（102）。聞き手の反応も quiet（275）。
  - `minigame_great` は bounce（128）。
  - `EVENT_SCOPE` に minigame はないので、`playGroup(mood)`（270）でキャスト全体が持ち上がる（GROUP_LIFTS bounce / droop 11-19）。
- `emote(mood)`（307）は `emotePet` から呼ばれる。`speak(...)`（237-281）は吹き出しから呼ばれる。
- 抑止の条件
  - 本体の `canAnimate`: ゲーム中、DEAD、へんしん選択中、メニュー、tab hidden で false（script.js:4041-4042）。
  - `emotePet` は会話中なら emote しない（11013）。
  - `motionLevel===3`（special）の最中は `pet()` が無視される（311）。

### 3.7 ミニゲーム結果を表情系に流すフック点

- **一時表情**
  - いちばん薄いのは `pet-expression.js` の `REACTIONS` に `minigame_great` / `minigame_bad`（と必要なら `companion_new`）を足すこと。
  - 理由: 吹き出しの最初の pet の拍で、`setSpeechBubble` が自動で `startPetExpression` を呼ぶ（script.js:4237-4240）。
  - ただし 30〜69点は会話がないので、別に出す必要がある。
  - `tests/pet-expression-test.cjs:76-90` は登録済みのものを列挙して null 判定するだけ（`court` が null であることも確認）。追加しても壊れない。
- **体の動き:** 既存の `castMotion.speak` で反応済み。足すなら `cast-motion.js` の `EVENT_SCOPE` / `EVENT_RECIPES` / `reactionFor` の表に寄せる。
- **恋人・なかまのハート:** `startRelationshipPositive(kind, entity)`（script.js:8874）を great のときに呼べばよい。
- **会話のない帯（30〜69）の表情:** `scheduleCareAfterglow` 型の「落ち着いてから happy を一瞬」が流用できる（4117-4137）。
- **持続表情（emotion-state）には入れない。** 設計方針の上で、ミニゲームの結果は一時反応の側にあたる。

---

## 4. ほかのイベントにある「文脈→反応」パターン

| パターン | 中身 | ミニゲームへの流用 |
|---|---|---|
| speakEvent のイベントキー＋3話者プール＋キャラ固有表＋確率 | `CONVERSATION_POOLS[key]`、`PARTNER_DAILY_REACTIONS[id][key]`、`COMPANION_DAILY_REACTIONS[id][key]`、`ctx.partnerChance / companionChance`、`ctx.petText` で台詞を外から渡す（6215-6411） | ◎ そのまま使える。「文脈で選んだ台詞を `petText` で渡す」は、じゃれる・求愛がすでにやっている（17280-17285, 8339-8341, 17412, 17519）。**キーを増やさず `petText` で差し替えれば、テストの「全キーで4拍」契約に触れない** |
| ctx の差し込み | `{age}{sodachi}{coins}`（4963-4967） | ○ ただし `{game}` などを足すと、dialogue-test の未置換チェック（171）の正規表現を更新する必要がある |
| 特別行の優先 | partner_new / marriage では `PARTNER_RELATIONSHIP_LINES` を最優先（6232-6234） | ○「特定の文脈では固定の1行が勝つ」の前例になる |
| cast-motion のイベント表 | `SPECIAL` / `EVENT_SCOPE` / `EVENT_RECIPES` / `reactionFor`（cast-motion.js:52-132） | ◎ 動きはイベントキーで決まる |
| pet-expression の `REACTIONS` | イベントキー → 一時表情 | ◎ 2行足すだけ |
| 余韻（afterglow） | 結果条件（`signals.hunger==='none'`）を満たしたときだけ、遅れて happy（17013, 17218, 4117-4137） | ○ 条件付きで遅らせて出す反応の前例 |
| ストーリーフラッシュ | `STORY_EVENT_POOLS[context]` ＋確率 ＋直前と重複しない ＋任意の delay ＋ life / serial の照合（10663-10685） | ○ 文脈名を細かくすれば流用できる |
| resident-expression | `event → emotion → (expression, dialogue)` を1か所で持ち、表情と台詞の一貫性を `consistent()` で検査（resident-expression.js 全体） | ◎ **抽象として最も近い。** ただしこれはめぐる住民用で、Home の speakEvent・cast-motion とはつながっていない |
| ムービーの選択 | 場所（deepsea）・相手・記憶（仲直り）で bag を選ぶ（9449-9462, 9508-9516） | ○ 条件で key を作り、`pickMovieStory` の shuffle-bag で選ぶ流れは流用できる |
| 思い出あいさつ | lifeLog のマーカー → 年齢差で言い方を変える（9865-9900） | △ 履歴から台詞を作る前例 |
| `itemContextReaction` | 装備品の文脈で小さな動きと title を出す（13066-13081） | △ |

- **結論:** 「イベントキー＋条件テーブル→（台詞・表情・動き）」を1か所で持つ汎用の層は、**Home には存在しない**。
- 台詞は speakEvent、表情は pet-expression の REACTIONS、動きは cast-motion の表、と**イベントキーという共通語でゆるく束ねられている**だけ。
- 条件（文脈）による出し分けは、各呼び出し元のアドホックな if 文の中にある（例: じゃれるの spam 判定 17261、求愛の結果）。
- 唯一体系化されているのが resident-expression（めぐる）。

---

## 5. 記録データ

| データ | 構造 | 書く時点 | file:line |
|---|---|---|---|
| `lifetime.minigameRecords[id]` | `{best, last}` だけ | 完了時（クイック含む） | 1663, 15115-15123 |
| `lifetime.minigamePlayCounts[id]` | 回数 | **開始時**（中断も含む） | 1658, 15873-15876, 16076, 17127 |
| `lifetime.minigamesPlayed` | 全体の完了数 | 完了時 | 1523, 16357 |
| `state.minigameScoreSum / minigameCount` | 人生ごとの合計と回数 | 完了時（クイック含む） | 1475-1476, 16355-16356 |
| `lifetime.dailyChallenge` | `{date, gameId, score, rank}`（その日の達成） | 達成時 | 1669, 16398 |
| `lifetime.dailyStreak / dailyLastDate` | 0 / null | **どこからも書かない**（定義だけ） | 1670-1671 |
| `lifetime.quick` | `{runs, bestCleared, bestCombo, totalCleared, plays{qid}, clears{qid}, single{qid:{runs,best}}}` | `finishRun` の時点（onComplete より前） | 1665, 14768-14788 |
| `lastMinigame` / `recentMinigameCategories` | メモリのみ（保存しない） | 開始時 | 15854-15857 |

判定に足りるかどうか:

- **初回**
  - 「初めて完了」は `record.prevBest == null` で判定できる（十分）。
  - 「初めて開始」は `minigamePlayCount(game) === 1`。中断した回も数に入る。
- **自己ベスト:** `record.isNewBest`（初回も true）と `prevBest` で判定できる（十分）。
- **惜敗**
  - 「ベストにあと少し」は `best - score`、「大成功ラインまであと少し」は `70 - score` で計算できる（十分）。
  - 「前回の自分にあと少し」は、`recordMinigameResult` が `prev.last` を返していないので**取れない**（15117-15122）。記録の前に読めば取れる。
- **連敗・連勝（ゲームをまたぐ）**
  - **足りない。** 直前の結果を保存している場所がない。
  - 同じゲームの中でも `last` は1件だけで、連続回数は分からない。
- **繰り返し（同じゲームを続けて）**
  - 「直前のゲームと同じか」は、`lastMinigame` が開始時に今のゲームへ書き換えられるため、**finish の時点では判定できない**（16075, 17128）。
  - 1つ前を保持する変数が必要になる。メモリだけでよいなら、保存は不要。
  - なお `recentMinigameCategories` には直近のカテゴリが残る（その末尾が今回）。
- **ゲーム内部のできごと（釣果、引き分けなど）:** 何も取れない（§1.4）。

**新しく必要になる最小限のもの（案）**

- メモリのみの「直近 N 回の `{id, score, band, at}`」。セッション内の連敗・繰り返しなら、これで足りる。
- 人生をまたいで連敗を覚えたいときだけ、保存用の新しい `lifetime` キー（オブジェクト推奨）を足す。

**セーブ互換の注意**

- `tests/scoring-shop-test.cjs:17` は `JSON.stringify(minigameRecords['score-probe']) === '{"best":62,"last":40}'` を**厳密に**確かめている。**`minigameRecords[id]` にフィールドを足すと壊れる。** 別のキーにすること。
- `tests/save-integrity-test.cjs:188-212`: `freshState()` にある**すべての配列**について、null 要素を load 時に取り除く「種類表」でカバーしなければならない。新しい配列フィールドを足すなら、修復表も一緒に更新する。オブジェクトや数値なら、この制約はかからない。
- `tests/save-compat-test.cjs:45-82`: 実際の旧セーブを load → save → load して冪等であること、値が減らないこと。新しいキーにも既定値と正規化が必要になる。前例は script.js:1904-1906。
- `tests/quick-daily-economy-v2-test.cjs:97-98`: `dailyStreak===0` かつ `dailyLastDate===null` のままであることを確かめている。**未使用だからといって流用してはいけない。**
- 同じテストの 6-9 と 40-73: クイックは care 系フィールドを一切変えない（`lifeLog / partner / companions / traitCounts` を含む）。

---

## 6. 既存テストが反応系に課している契約（壊してはいけないもの）

| 契約 | テスト | 内容 |
|---|---|---|
| 結果トースト → 反応の順序 | minigame-lifecycle-test.cjs:17-28 | 10点・90点のとき、トーストは 6000ms 表示。その間は吹き出しが出ない。6000ms 後にトーストが消えて吹き出しが出る。`animationDuration='6000ms'` |
| 割り込み | 同 30-36 | 遅れて出る予定のゲーム反応は、新しいお世話の会話（`speakEvent('feed')`）で取り消され、そのあと復活しない |
| もういちど | 同 38-45 | 再プレイで、遅延反応と古いトーストが消える |
| great / bad のイベントキー | dialogue-test.js:254-256 | 90点で `minigame_great`、10点で `minigame_bad` が `speakEvent` を通る（関数を差し替えて記録しているので、名前を通して呼ぶこと） |
| 全プールで4拍 | dialogue-test.js:182-197 | `CONVERSATION_POOLS` の全キーに pet / partner / companion と followUps がある。拍の間隔は 2500ms |
| 固有台詞が引けること | dialogue-test.js:216-240、content-registry-test.cjs:62-82 | 恋人18人 × great / bad（2本以上）、なかま全員 × great / bad。キー集合は master と一致 |
| 70 / 30 の境界 | item-care-game-test.cjs:118-130 | コインは 0→0、29→0、30→30、69→30、70→60、100→60 |
| 69 / 70（レア勧誘） | dialogue-test.js:819-829 | — |
| ランク | scoring-shop-test.cjs:5-18 | S90 / A75 / B55 / C35。`recordMinigameResult` の戻り値の形。records は `{best,last}` 厳密 |
| 勧誘の動き | motion-v2-test.cjs:97-108 | 加入したときは結果の後（6001ms）に `companion_new` のレシピが**実際の新入り**に出る。お世話で割り込むと取り消される |
| 悪い結果を祝わない | cast-motion-test.cjs:115-122 | `minigame_bad` のとき、聞き手の pet は nod / droop / settle / shake のどれか |
| great の集団の動き | cast-motion-test.cjs:43-60 | `minigame_great` で castResponse が −10px 以上持ち上がり、0 に戻る。サイズは不変 |
| ゲームが表情と cue を止める | pet-expression-integration-test.cjs:212-230（219）、emotion-integration-test.cjs:440-456, 467-485 | startMinigame で一時表情を消す。持続 cue を止め、再開する |
| クイックは反応・育成を通さない | quick-daily-economy-v2-test.cjs:40-73 | care フィールドが不変、勧誘しない、ストーリーを出さない |
| customMessage | input-polish-test.cjs:58、quick.js:956 | `finishMinigame(score, msg)` の2引数の形 |
| 中断・例外・遅れて届く onComplete | minigame-lifecycle-test.cjs:141-152, 214-244、script.js:16527-16530 | セッション番号で捨てる。中断では反応しない（retire は `emotePet('happy')` だけ。16287） |

---

## 7. まとめ

### 7.1 すでにあって流用すべきもの

1. **`speakEvent(eventKey, ctx)` と `ctx.petText`**（script.js:6215-6411）
   - 話者の選択、恋人・なかまの固有台詞、掛け合い、遅延、取り消し、重複回避、cast-motion と表情への橋渡しまで全部そろっている。
   - 文脈別の台詞は、**キーを `minigame_great/bad` のまま `petText` で差し替える**のがいちばん安全。
   - 恋人・なかまの文脈別の台詞を出したい場合は、`partnerDailyLine` と同じ「固有→共通」の選び方（`pickCharacterConversationLine` 4976-4980）を使う。
2. **`recordMinigameResult` の戻り値**（`isNewBest` / `prevBest` / `rank` / `bestRank`。15115-15123）と、`minigameInfo` / `minigameGenreId` / `minigameCategoryOf` / `minigameHomeOf`（15072-15092）。
3. **`currentEnvironment()`**（13784）、`currentAge()`（9946）、`currentFormStageIndex()`（11284）、`relationshipStage()`（8160）、`state.companions`。
4. **表情:** `pet-expression.js` の `REACTIONS`。これに登録すれば、`setSpeechBubble` が自動で一時表情を出す（4237-4240）。
5. **動き:** `cast-motion.js` の `reactionFor` / `EVENT_SCOPE` / `SPECIAL`（すでに minigame の bounce / droop がある）。
6. **関係の反応:** `startRelationshipPositive`（8874）。
7. **会話のない帯の遅延反応:** `scheduleCareAfterglow` 型（4117-4137）。
8. **ストーリー:** `checkStoryEvents(context, delayMs)`（10663。delay と照合の仕組みがある）。
9. **設計の雛形:** `resident-expression.js`（event → emotion → expression / dialogue、`consistent`、`audit`）。新しい層の「文脈→canonical な反応」の作り方は、これに合わせるとよい。

### 7.2 新しく必要な薄い層

1. **GameResultContext の組み立て（純関数）**
   - Inner の `recordMinigameResult` の直後で作る。入力は game、record、score、band（great / success / bad）、なかま経路と加入、恋人とその状態、なかまの一覧、年齢・ステージ・種族、環境、プレイ回数、日次チャレンジ。
   - あわせて **記録する前の `prev.last`** と、**1つ前のゲーム（現状は開始時に上書きされる）** を捕まえておく必要がある。
2. **ReactionSelector（純関数・表駆動）**
   - context → `{eventKey (既存の minigame_great / bad / companion_new), petText?, partnerLine?, companionLine?, expression?, motion?, storyContext?}`。
   - 優先度の表（初めてのS＞自己ベスト＞惜敗＞連敗＞通常、など）と、データの表（台詞プールは新しい表に置く）。
3. **短期の履歴（メモリのみ）**
   - 直近 N 回の結果。セッション内の連敗・繰り返し・直前の結果に使う。
   - 保存が必要になったときだけ、新しい `lifetime` のオブジェクトキーを足す（§5 の注意を参照）。
4. **ゲームからの任意の付加情報の口**
   - 今は `onComplete(score)` だけ。将来、拡張するなら `onComplete(score, message, detail?)` のように**後ろに足す**のが安全。wrapper（16527）、`finishMinigame`、テストの2引数呼び出しはそのまま動く。
   - クイックについては、`onRunEnd(stats)` がすでに本体に届いている。これを Inner へつなげば足りる。
5. **30〜69点帯とクイックの反応方針**（現状は会話なし・反応なし）。
   - クイックの「反応なし」は、テストで固められているのは care / 勧誘 / ストーリーだけ。台詞を足す場合でも、care フィールドを変えないこと。

### 7.3 触ってはいけない既存の契約

- イベントキー `minigame_great` / `minigame_bad` / `companion_new` の名前と、`speakEvent` を名前経由で呼ぶこと（dialogue-test.js:104-105, 254-256、motion-v2-test.cjs:97-108）。
- **トーストが先、反応は `delayMs: resultDuration` の後**。新しい会話・再プレイで取り消されること（minigame-lifecycle-test.cjs:17-45）。
  - `setSpeechBubble` がトーストを隠す（4225）。このため、遅延なしの吹き出しはトーストを消してしまう（§1.5-2 の既存の副作用に注意）。
- 70 / 30（育成・コイン・会話）、69 / 70（レア勧誘）、50（通常勧誘）、S90 / A75 / B55 / C35（ランク）。
- `CONVERSATION_POOLS` の全キーに3話者と followUps があること。恋人・なかまの固有表のキー集合（content-registry）。
- `minigameRecords[id]` が厳密に `{best,last}` であること。`dailyStreak` / `dailyLastDate` が不変であること。新しい配列には null 修復が必要なこと。旧セーブの冪等性。
- クイックが care / 勧誘 / ストーリー / メーターを通らないこと。
- 一時表情と反応を**保存しない**こと（両 spec と relationship-expression の WeakMap 方針）。critical・睡眠・メニュー・ゲーム・storyFlash で無効になること。
- `pet-expression` の既存の `REACTIONS` の値（pet-expression-test.cjs:76-90）。`minigame_bad` で pet・聞き手が祝わないこと（cast-motion-test.cjs:115-122）。
- 台詞の文体（TEXT_STYLE.md）。ムービー字幕には絵文字・報酬を入れない（movie-test.cjs）。

### 7.4 設計時に意識すべき既存の歪み（参考。いまは変えない前提）

- great / bad では、終了直後の `emotePet` の体の動きが出ない。会話の拍で初めて動く（§1.5-1、実行確認）。
- 30〜69点でそだちが上がると、そだちの台詞がトーストをすぐ消す（§1.5-2、実行確認）。
- `lastMinigame` と回数は開始時に更新されるので、finish の時点では「前回」が見えない。
- storyFlash の枠は、ミニゲームのストーリーと実績の通知で共有されている（後に出たほうが勝つ）。表示中は一時表情が出ない。
- `resultMessageForScore` は 80 / 50 の帯で、育成側の 70 / 30 とずれている（16082-16089）。
