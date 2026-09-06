# なおとっち 現行実装版マスター仕様書

**基準コミット**: `794e6f2`（`origin/main`, PR #90 マージ後）
**対象ファイル**: `script.js` (15,121行) / `index.html` (570行) / `style.css` (5,058行)

## この文書について

これは**設計書ではなく、コードの棚卸し**です。以下のルールで作成しています。

- 現在の `main` のコードだけを事実として読んでいます
- `README.md` の記述は根拠にしていません
- 過去の設計資料・PR 本文で補完していません
- コードに実際に存在する挙動だけを書いています
- コードから読み取れない設計意図は**「意図未確認」**と明記しています
- 旧コードの残骸・移行コード・到達不能処理は **P章** に分離しています
- 新しい仕様の提案はしていません。バグを見つけても修正していません

数値・件数・ID はすべて実コードから機械的に抽出しています。

---

## A. ゲーム全体構造

### A-1. 二重構造

コード上、進行は 2 つの層に分かれています。

| 層 | 実体 | リセットされるか |
|---|---|---|
| **1 つの人生** | `state` のうち `lifetime` 以外のほぼ全て | 「あたらしい たまご」でリセット |
| **人生を重ねる** | `state.lifetime` / `state.discoveredStages` / `state.achievementsUnlocked` | リセットされない |

### A-2. ライフサイクル（`STAGE`）

```js
const STAGE = { EGG: 'egg', GROWING: 'growing', FAREWELL: 'farewell', DEAD: 'dead' };
```

| 値 | 意味 | 遷移元 → 遷移先 |
|---|---|---|
| `egg` | たまご | 初期状態・周回後 → `hatchEgg()` で `growing` |
| `growing` | 成長中 | → 100さい到達で `farewell` / いのち尽きで `dead` |
| `farewell` | さいごの じかん | → 「この子の いっしょうを きろくする」で人生記録カード |
| `dead` | 死亡 | → 「あたらしい たまご」 |

`isLiveLife()` は `growing` のときだけ true を返し、`tick()` の冒頭でこれが false なら**何も進みません**。

### A-3. たまご

- `hatchEgg()` は `applyGrowth()` 経由でのみ呼ばれます。`tick()` は `stage === EGG` で即 return するため、**時間経過では孵化しません**
- 「じゃれる」を押すと `applyGrowth(4)`。`state.growth >= HATCH_GROWTH (20)` で孵化（**5回**）
- 孵化時に `speciesLine`（`pickDreamLine() || pickRandomLine()`）、`gender` / `orientationId` / `attractedTo`（`rollIdentity()`）が決まります
- たまご中は `playWithBtn` 以外のお世話ボタンが `disabled`

### A-4. 100さい

- `tick()` 内で `state.ageTicks += 1` → `currentAge() >= GOAL_AGE(100)` で `enterFarewell()`
- `AGE_TICKS_PER_YEAR = 20`, `TICK_MS = 3000` → **1さい = 60秒 / 100さい = 2,000 tick = 100分**
- `state.lifetime.maxAgeReached = 100` を記録

### A-5. さいごの じかん（`farewell`）

`isLiveLife()` が false になるため、`tick()` が冒頭で return します。結果として**時間・そだち・せいちょう・おとろえ・いのち・ステータス自然減・図鑑・実績・コインがすべて停止**します。時間制限はなく、`#farewellBtn`（「この子の いっしょうを きろくする」）を押すまで続きます。

お世話ボタンは押せます（`disableCare` は `isOver || isEgg || hasTransformChoice` で、`farewell` は `isOver` に含まれない）。

### A-6. 死亡

`triggerDeath()` で `stage = 'dead'`。`state.lifetime.deaths += 1`。死亡時に人生記録カードが自動表示されます（`render()` 内の `deathCardShown` ガード）。

### A-7. 周回

`#resetBtn`（「あたらしい たまご」／`isOver || isFarewell` のときだけ表示）:

1. `state.stage !== EGG && !state.infinite` なら `archiveLifeAndReset()` → `lifetime.pastLives` に要約を push（上限 100 件、超えると `shift()`）
2. `lifetime.resets += 1`
3. `state = freshState()` し、`lifetime` / `discoveredStages` / `achievementsUnlocked` を引き継ぐ
4. `declineBaseline = lifetime.devolutions`

### A-8. 5 段階のゴール

| # | 名前 | 判定場所 | 条件 |
|---|---|---|---|
| ① | てんじゅを まっとうした | `enterFarewell()` | 100さい到達 → `lifetime.clears += 1` |
| ② | はじめての いっしょうクリア | `enterFarewell()` | 100さい ＋ `maxSodachi >= LIFE_CLEAR_SODACHI (70)` → `lifeClears += 1` |
| ③ | さいこうの いっしょう | `enterFarewell()` | 100さい ＋ `maxSodachi >= SODACHI_MAX (100)` → `bestLives += 1` |
| ④ | ずかんクリア | `checkGrandGoals()` | `discoveredStages.length >= 168` → `lifetime.dexCleared = true` |
| ⑤ | パーフェクトクリア | `checkGrandGoals()` | ④ ＋ 全 75 実績 → `lifetime.perfectCleared = true` |

`checkGrandGoals()` は `saveState()` から呼ばれます。`endingProgress()` が `{dexComplete, achComplete}` を返し、`achComplete` は **`dex-complete` 実績を除いて**判定します。

### A-9. ♾️（`state.infinite`）

`lifetime.perfectCleared` が true になると `#infiniteBtn` が現れます（`!state.infinite && !isDead` の間ずっと表示。人生の途中でも入れます）。

- `enterInfinite()`: 現在の `state` を **ディープコピー**して `state.infiniteReturn` に格納（`lifetime` / `discoveredStages` / `achievementsUnlocked` は除外）。`stage = growing`, `infinite = true`
- `exitInfinite()`: `infiniteReturn` から復元。`lifetime` / `discoveredStages` / `achievementsUnlocked` は現在の値を引き継ぐ
- ♾️ 中は `#resetBtn` が非表示、`#infiniteBtn` が `↩️ いっしょうに もどる` に変わります
- ♾️ 中の停止: `tick()` で `state.ageTicks` が増えず、`applyGrowth()` / `applyDecline()` が `state.infinite` で即 return、`isImmortal()` が true
- `#lifeMeterRow`（せいちょう／おとろえ／いのち）が `display:none`
- 表示は `ねんれい: ♾️` / `そだち: ♾️`
- `infiniteReturn` は `state` の一部なので `saveState()` でセーブされ、リロードしても復帰できます
- `infiniteReturn` がない場合（旧 `freePlay` からの移行など）、`exitInfinite()` は `freshState()` にフォールバックします

---

## B. 状態管理

### B-1. ねんれい

- 唯一の真実は `state.ageTicks`
- `currentAge()` = `Math.min(100, Math.floor(ageTicks / 20))`
- `state.stageIndex` は**キャッシュ**であり、`stageForAge(currentAge())` から再導出されます
- `ageTicks` を減らすコードは存在しません（不可逆）
- `tick()` は `!isLiveLife()`（`egg` / `farewell` / `dead`）と `state.infinite` で進みません。またメニューを開いている間も止まります（`isAnyMenuOverlayOpen()`）

### B-2. そだち

| フィールド | 意味 |
|---|---|
| `state.sodachi` | 現在値（0〜100）。初期 `SODACHI_START = 20` |
| `state.maxSodachi` | その人生で到達した最高値。特典の解禁判定に使う |

`hasPerk(level)` は `state.maxSodachi >= level`。つまり**おとろえで下がっても特典は失われません**。

### B-3. せいちょう（`state.growth`）

`applyGrowth(amount, opts)`:
- `amount === 0 || !isLiveLife() || state.infinite` なら何もしない
- `amount > 0 && !opts.silent` なら `markCared()`（`recentActionTicks = 20`）
- `stage === EGG` なら `growth += amount`、`>= 20` で孵化
- それ以外は `growth += amount > 0 ? amount * growthMultiplier() : amount`（下限 0）
- `while (growth >= sodachiCost(sodachi) && sodachi < 100)` → `growth -= cost`, `gainSodachi(1)`

`growthMultiplier()` = `state.boostTicks > 0 ? 2 : 1`

### B-4. おとろえ（`state.decline`）

`applyDecline(amount)`:
- `amount === 0 || !isLiveLife() || stage === EGG || state.infinite` なら何もしない
- `decline = clamp(decline + amount, 0, DECLINE_MAX(100))`
- `while (decline >= 100 && sodachi > 0)` → `decline -= 100`, `loseSodachi(1)`

**1 回の呼び出しで下がるのは最大 1**（`applyDecline(100000)` でも `-1`）。

### B-5. いのち（`state.deathMeter`）

内部値は「死亡メーター」で、**表示は反転**します（`updateMeter(el.deathBar, 100 - state.deathMeter, 'death')`）。`value <= 30` で `low`（警告色）。

`raiseDeathMeter(amount)`:
- `amount > 0 && isImmortal()` なら**何もしない**
- `crownFactor`（`crown3` 0.35 / `crown2` 0.6 / `crown` 0.8 / なし 1）
- `deathMeter = clamp(deathMeter + amount * DEATH_METER_MULTIPLIER[relationshipStage()] * crownFactor, 0, 100)`

`DEATH_METER_MULTIPLIER = { none: 1, dating: 0.75, married: 0.5 }`

`isImmortal()` = `state.maxSodachi >= 100 || hasNaotoItem('naoto_ring') || state.infinite`

### B-6. 4 ステータス

| フィールド | 初期値 | tick での自然減 |
|---|---|---|
| `hunger`（おなか） | 90 | `-0.6 × sleepFactor × hungerFactor × legendFactor` |
| `happiness`（ごきげん） | 90 | `-0.6 × sleepFactor × happinessFactor × legendFactor` |
| `energy`（げんき） | 90 | 起床時 `-0.32 × energyDecayMultiplier() × energyFactor × legendFactor` / 睡眠時 `+40`（病気中 `+16`）＋ `sleepBoost` |
| `health`（けんこう） | 100 | `healthDelta` 加算（下記） |

- `sleepFactor` = 睡眠中 0.4 / それ以外 1
- `legendFactor` = `hasPerk(90) ? 0.85 : 1`
- `energyDecayMultiplier()` = `clamp(1 - companions.length × 0.05, 0.5, 1)`
- `hasNaotoItem('naoto_crown')` を持つと 4 ステータスが毎 tick 100 に上書きされます

`healthDelta`:
```
hunger <= 0     → -3
happiness <= 0  → -2
起床中 energy<=0 → -2
isSick          → -(2 + min(3, floor(totalSicknessCount / 3)))
上記が全て 0 かつ hunger>50 かつ happiness>50 → +1
```

### B-7. 一人生データと恒久データの区別

`freshState()` の返り値は **63 フィールド**（`lifetime` を含む）。うち `lifetime` は **53 フィールド**。

**一人生データ（62 フィールド）**:
`stage, speciesLine, stageIndex, hunger, happiness, energy, health, ageTicks, sodachi, maxSodachi, growth, decline, boostTicks, recentActionTicks, sleptTicks, miracleGuard, dying, dyingTicks, transformsThisLife, declineBaseline, transformStageDone, sandUsed, bigSandUsed, dateCooldownTicks, datesThisLife, legendMet, lifeLog, infinite, infiniteForm, infiniteReturn, schemaVersion, poopCount, isSick, sicknessType, totalSicknessCount, sicknessCuredThisLife, isSleeping, lowHealthStreak, careSum, careTicks, affectionStreak, travelStreak, actionCounts, traitCounts, minigameScoreSum, minigameCount, deathMeter, transformMeter, transformOptions, items, oneTimeBoosts, partner, gender, orientationId, attractedTo, questioningEncounters, guest, companions, regionId, duel`

**ただし `discoveredStages` と `achievementsUnlocked` は `state` 直下にありながら、`resetBtn` ハンドラで明示的に引き継がれるため恒久データです。**

**恒久データ（`state.lifetime` 53 フィールド）**:
`evolutions, devolutions, transforms, clears, deaths, minigamesPlayed, sicknessCured, maxAgeReached, resets, lifeClears, bestSodachi, bestLives, flawlessLives, dexCleared, perfectCleared, pastLives, dreamEggs, nextEggLine, endingTiersReached, deviceThemeId, screenThemeId, seasonMode, devicePatternId, screenPatternId, companionsRecruited, rareCompanionsRecruited, partnersRecorded, partnersMarried, money, ownedShopItems, equippedItemId, ownedNaotoItems, consumablesUsed, ownedConsumableItems, bonusUnlockedThemeIds, regionsVisited, specialRegionsVisited, datesEnjoyed, legendsMet, minigamePlayCounts, duelTraits, duelMatchesPlayed, duelWins, duelLosses, duelDraws, duelLiesUsed, duelLiesSucceeded, duelLiesFacedAsGuesser, duelLiesDetected, duelHonestAnswersGiven, duelHonestMisread, duelLongestLieStreak, duelRecentQuestionIds`

---

## C. 種族・姿

### C-1. 21 種族 × 8 形態 = 168 形態

**通常 16 種（`NORMAL_LINES`）**: `dog`(いぬ) / `cat`(ねこ) / `bird`(とり) / `man`(おとこのひと) / `woman`(おんなのひと) / `beetle`(カブトムシ) / `stagbeetle`(クワガタムシ) / `rabbit`(うさぎ) / `fish`(さかな) / `dragon`(りゅう) / `panda`(パンダ) / `fox`(きつね) / `owl`(ふくろう) / `plant`(はな) / `robot`(ロボット) / `dinosaur`(きょうりゅう)

**レア 5 種（`RARE_LINES`）**: `god`(かみさま) / `ren`(れんくん) / `mermaid`(にんぎょ) / `unicorn`(ユニコーン) / `phoenix`(フェニックス)

- `pickRandomLine()` は `NORMAL_LINES` からのみ選びます。**たまごからレア種は生まれません**（`lifetime.nextEggLine` が指定されている場合を除く）
- 各形態は `{ emoji, label, message? }`。`SPECIES_STAGE_DESCS` に 168 件の説明文（すべて相異なる）

### C-2. 8 ライフステージと年齢境界

```js
LIFE_STAGES = [
  { min: 0,  name: 'あかちゃん' },
  { min: 3,  name: 'よちよち' },
  { min: 7,  name: 'こども' },
  { min: 12, name: 'しょうねん・しょうじょ' },
  { min: 16, name: 'せいしゅん' },
  { min: 22, name: 'わかもの' },
  { min: 40, name: 'おとな' },
  { min: 70, name: 'ろうねん' },
];
```

`stageForAge(age)` は配列を後ろから走査して最初に `age >= min` となるインデックスを返します。**1 つの人生でステージ変化は 7 回**（3/7/12/16/22/40/70さい）。

`currentFormStageIndex()` は `state.infinite && state.infiniteForm` のときだけ `infiniteForm.stageIndex` を優先し、それ以外は `stageForAge(currentAge())`。

### C-3. へんしん

`rollTransformChance()` は `onStageChanged()` からのみ呼ばれます（**ステージ変化の瞬間だけ**）。

```
if (stage !== GROWING || transformOptions) return;
if (transformsThisLife >= transformLimit()) { transformMeter = 0; return; }
if (transformStageDone.includes(String(stageIndex))) { transformMeter = 0; return; }
chance = (transformMeter / 100) * (1 + sodachi / 200)
transformMeter = 0
if (Math.random() >= chance) return;
```

- `transformLimit()` = `3 + (hasPerk(60) ? 1 : 0)` → **1人生 3回（そだち60 で 4回）**
- 1 ステージにつき 1 回まで（`transformStageDone`）
- `transformMeter` はミニゲーム完了ごとに `+(15 + hatBonus) × (hasPerk(60) ? 1.2 : 1)`

`chooseTransform(line)`:
- **`state.speciesLine` だけを変更し、`ageTicks` は一切変更しません**
- `lifetime.transforms += 1`, `transformsThisLife += 1`
- `rerollIdentityAndBreakupIfNeeded(line)` で `gender` / `orientationId` / `attractedTo` を再ロールし、`traitCounts` を**半減**（`Math.floor(v / 2)`）

`pickTransformCandidates()`:
- `NORMAL_LINES` から現在種族を除いて `hasPerk(60) ? 3 : 2` 件を抽選
- `eased = hasPerk(60)` / `rareMixChance = hasPerk(80) ? 0.65 : 0.5`
- レア 4 種の条件:

| 種族 | 条件（基本 / `eased`） |
|---|---|
| `god` | `avgCare >= 90 / 82` （`careSum / careTicks`） |
| `mermaid` | `traitCounts.gentle >= 3 / 2` |
| `unicorn` | `traitCounts.brave >= 3 / 2` |
| `phoenix` | `sicknessCuredThisLife >= 5 / 3` |

- 条件を満たすレアがあれば `rareMixChance` で候補 1 枠を置換

### C-4. れんくんの特殊扱い

`ren` は上記 `rarePool` から**明示的に除外**されており、独立した判定を持ちます。

```js
const renEased = hasPerk(80);   // そだち60 の緩和はかからない
const renReady = state.speciesLine !== 'ren'
  && ((minigameCount >= 5 && avgSkill >= (renEased ? 78 : 85))
      || traitCounts.romantic >= (renEased ? 3 : 5));
if (renReady && Math.random() < (renEased ? 0.3 : 0.18)) { /* 候補1枠を ren に置換 */ }
```

`isHiddenTransformLine(line)` = `line === 'ren' && !discoveredStages.some(e => e.startsWith('ren:'))`。true のときへんしん候補ボタンは **`🕯️ ？？？`**（`.transform-choice-btn.mystery`）で表示され、選ぶと `？？？の しょうたいは 「〇〇」だった…!` というメッセージと専用の storyFlash が出ます。

---

## D. 図鑑・実績・長期進行

### D-1. 図鑑

- キー形式は `"line:stageIndex"`。`state.discoveredStages` に保存
- `recordDiscovery()` が `saveState()` から呼ばれ、`stage === GROWING` かつ `speciesLine` があるときに現在形態を記録
- ヘッダー表示は **種族 168 ＋ 通常なかま 10 ＋ こいびと 16 = 194** の合算（`combinedTotal`）
- **`dex-complete` 実績の判定は種族 168 のみ**
- 既知セルは `.dex-cell.known.tappable`。タップで詳細画面（`#dexDetailOverlay`）が開き、名前・種族・ライフステージ・説明文が読めます
- ♾️ のときだけ詳細画面に `#dexDetailTransformBtn`（「この すがたに なる」）が出ます
- レアなかまセクション（`#rareCompanionDexDivider` / `#rareCompanionDexGrid`）は `rareCompanionsRecruited.length > 0` のときだけ表示。ヘッダーの合算には**含みません**

### D-2. 実績

**75 件**（`ACHIEVEMENTS`）。`condition(lifetime, state)` で判定し、`checkAchievements()` が `saveState()` から呼ばれます。

主な条件の分類:
- `lifetime` の累計を見るもの（`evolutions`, `transforms`, `clears`, `deaths`, `minigamesPlayed`, `money`, `resets` など）
- `state` の 1 人生分を見るもの（`actionCounts.*`, `traitCounts.*`, `companions.length`）
- コレクション系（`regionsVisited.length >= REGIONS.length(8)`, `companionsRecruited.length >= COMPANIONS.length(10)`, `partnersRecorded.length >= ALL_PARTNER_CANDIDATES.length(16)`, `ownedShopItems.length >= 50`, `ownedConsumableItems.length >= 50`）

**`rareCompanionsRecruited` / `specialRegionsVisited` / `datesEnjoyed` / `legendsMet` を条件にする実績は存在しません。**

### D-3. ENDING_TIERS と ♾️ 解禁

| tier | アイコン | ラベル | 条件（`getEndingTier()`） |
|---|---|---|---|
| 0 | 🎉 | ふつうクリア | 上記以外 |
| 1 | 📖 | ずかんコンプリート | `dexComplete` のみ |
| 2 | 🏅 | じっせきコンプリート | `achComplete` のみ |
| 3 | 👑 | パーフェクトクリア | 両方 |

- `lifetime.endingTiersReached` に到達した tier が永続記録される
- tier 3 到達で `lifetime.perfectCleared = true` → `#gameClearFreePlayBtn`（「♾️ の せかいへ」）が出る
- `NAOTO_ITEMS` の解禁、`COLOR_THEMES` / `PATTERNS` の tier 解禁もこれに連動
- 4 tier すべて到達すると `unlockAll`（にじ）テーマが解禁

### D-4. 人生記録 / pastLives

`state.lifeLog` に `pushLifeLog(emoji, text)` で出来事を積み、`buildLifeCard()` がカードを組み立てます。カードに載る項目:

- 現在の姿と種族名 / 到達年齢 / さいごのそだち / さいこうのそだち
- ★① ★② ★③ のバッジ
- へんしん回数 / なかま人数 / けっこん・こいびと・ひとり
- デート回数 / でんせつに であった（該当時のみ）
- 病気を乗り越えた回数 / 図鑑の進捗
- `lifeLog` の直近 8 件

`archiveLifeAndReset()` が `lifetime.pastLives` に要約 1 件を push。**上限 100 件**を超えると先頭を捨てます。

### D-5. dreamEggs

```js
lifetime.dreamEggs = { normal: 0, rare: 0 }
```

- `normal` は **そだち100** で `+1`。`ot_dreamegg` の `available()` の第 2 条件（`lifeClears >= 1` との OR）としてのみ読まれます
- `rare` は **そだち90** で `+1`。`renderPicker()` の `dreamline` で `rare > 0` のときレア 5 種も選択肢に出す**永続フラグ**として読まれます
- **どちらも消費（デクリメント）されるコードはありません**（意図未確認 → Q章）
- `lifetime.nextEggLine` は `pickDreamLine()` で読まれ、使うと `null` に戻ります

---

## E. お世話・病気・死亡

### E-1. お世話操作（すべて `withFeedback()` でラップ、実行後 `saveState()` + `render()`）

| ボタン | 前提 | 効果 |
|---|---|---|
| 🍚 ごはん (`feedBtn`) | 睡眠中は不可 | `hunger +25`, `happiness +3`, `applyGrowth(4)`, `applyDecline(-4)` |
| 〃 たべすぎ（`hunger >= 80`） | | `happiness -4`, `applyDecline(8)`, 30% で病気（`raiseDeathMeter(4)`）, `checkStoryEvents('overfeed')` |
| 🎮 あそぶ (`playBtn`) | 睡眠中不可 / `energy < 10` 不可 | `pickRandomMinigame()` → `startMinigame()` |
| 🧹 そうじ (`cleanBtn`) | `poopCount === 0` なら `disabled` | `poopCount = 0`, `happiness +5`, `applyGrowth(4)`, `applyDecline(-5)`, `checkStoryEvents('poop-clean')` |
| 💤 ねる (`sleepBtn`) | — | `isSleeping` をトグル。起床時 `sleptTicks >= 20` なら `applyGrowth(3)`, `applyDecline(-3)` |
| 💊 くすり (`medicineBtn`) | — | 病気なら治療 + `health +20`, `energy -10`, `applyGrowth(8)`, `applyDecline(-12)`, `lifetime.sicknessCured += 1`, `sicknessCuredThisLife += 1` / 病気でないなら `happiness -10`, `health -5`, `applyDecline(10)` |
| 🤗 じゃれる (`playWithBtn`) | たまご中も押せる | たまご中: `applyGrowth(4)` ／ 通常: `happiness +5`, `applyGrowth(1.5)`, `applyDecline(-2)`, なかま全員の bond `+30 (+ hasPerk(40) ? sodachi/5 : 0)` |
| 〃 連打（`affectionStreak > affectionSpamThreshold()`） | | `happiness -5`, `applyDecline(6)` |
| 💘 きゅうあい (`courtBtn`) | 睡眠中不可 | `energy -6`。詳細は G 章 |
| 🌍 せかい (`travelBtn`) | — | 「せかい」オーバーレイを開く |

`markCared()` は `applyGrowth(amount > 0, !silent)` で呼ばれ、`recentActionTicks = RECENT_ACTION_TICKS (20)`（60秒）をセットします。

### E-2. うんち

- `tick()` 内で `Math.random() < 0.08 × poopFactor` で `poopCount += 1`（上限 `MAX_POOP = 4`）
- `poopFactor`: `poop3` 0.12 / `poop2` 0.35 / `poop1` 0.6 / なし 1
- `hasNaotoItem('naoto_lantern')` で**二度と溜まらない**
- `poopCount >= MAX_POOP` で毎 tick `happiness -2`

### E-3. 病気

- `SICKNESS_TYPES` は **10 種**（`{label, badge}`）
- 発症条件: `neglected = poopCount >= 2 || health < 50 || hunger < 30 || happiness < 30`
- `hasNaotoItem('naoto_charm')` を持つと**絶対に病気にならない**
- 確率 `0.09 × sicknessChance`（`scarf3` 0.12 / `scarf2` 0.3 / `scarf` 0.5 / なし 1）
- `oneTimeBoosts.sicknessShieldCount > 0` なら 1 回消費して回避
- 発症時 `totalSicknessCount += 1`, `applyDecline(10)`, `raiseDeathMeter(6)`

### E-4. 死亡条件

2 経路あります。

1. **低体力の継続**: `health <= 0` で `lowHealthStreak += 1` かつ `raiseDeathMeter(4)`。`lowHealthStreak >= max(6, 15 - totalSicknessCount)` かつ `!isImmortal()` で `triggerDeath()`
2. **死亡メーター**: `checkMeters()` が `deathMeter >= 100` を見て `triggerDeath()`

`state.miracleGuard`（90さいで 1 回チャージ）があれば、1 の経路で 1 回だけ `lowHealthStreak = 0`, `health = 40` に復帰します。

**死亡メーターの自然上昇**:
```
fromNeglect = lerp(0, 0.8, decline / 100)
fromAge     = (age >= 70 && !hasPerk(90)) ? lerp(0, 0.5, (age - 70) / 30) : 0
raiseDeathMeter(fromNeglect + fromAge)
```

**自動回復**: `wellCared`（病気でなく、おなか・ごきげん・げんき・けんこうがすべて 60 以上）なら毎 tick `deathMeter -2`

### E-5. おわかれの まえぶれ

`updateDyingWarning()`:
- `isImmortal()` なら `dying = false`, `dyingTicks = 0` で return
- `deathMeter >= 80` で `dying = true`, `dyingTicks = DYING_GRACE_TICKS (40)`（2分）。以後毎 tick デクリメント
- `deathMeter < 80` に戻ると `dying = false` と「もちなおした!」メッセージ
- `.screen.dying` クラスで画面演出

### E-6. そだち100 の不死

- `onSodachiMilestone(100)` で `deathMeter = 0`, `dying = false`, `dyingTicks = 0`, `lowHealthStreak = 0`
- `isImmortal()` が `maxSodachi >= 100` を含むため、以後 `raiseDeathMeter()` の正の上昇がすべて no-op
- 結果、いのちバーは 100%（緑）に固定され、警告色にもなりません

### E-7. 安定ボーナス

`wellCared && recentActionTicks > 0` のとき毎 tick `applyGrowth(0.1, {silent:true})`, `applyDecline(-0.3)`。**直近 60 秒にお世話していないと効きません**（`naoto_crown` で 4 ステータス満タンでも放置では育たない）。

### E-8. おとろえの上昇（tick）

```
isSick              → +0.4
poopCount >= MAX    → +0.5
hunger <= 0         → +0.3
happiness <= 0      → +0.3
起床中 energy <= 0  → +0.3
health <= 0         → +0.6
```

---

## F. そだちシステム

### F-1. コスト曲線

```js
SODACHI_COST_BANDS = [
  { max: 19, cost: 9 }, { max: 39, cost: 11 }, { max: 59, cost: 20 },
  { max: 69, cost: 38 }, { max: 79, cost: 55 }, { max: 89, cost: 75 },
  { max: 99, cost: 100 },
];
```

`sodachiCost(value)` は `value <= band.max` の最初の band の `cost` を返します。

### F-2. 増減

- 増: `gainSodachi(n)` → `sodachi += 1`, `lifetime.evolutions += 1`。`sodachi > maxSodachi` なら `maxSodachi` 更新 ＋ `lifetime.bestSodachi` 更新 ＋ `maxSodachi % 10 === 0` で `onSodachiMilestone()`
- 減: `loseSodachi(n)` → `sodachi -= 1`, `lifetime.devolutions += 1`, メッセージ ＋ `checkStoryEvents('devolve')`

**節目報酬は `maxSodachi` の更新時にのみ発火するため、下がって再到達しても二重取りできません。**

### F-3. そだち特典（`SODACHI_PERKS`）

| 節目 | 名前 | コイン | コード上の実効果 |
|---|---|---|---|
| 30 | 🪙 はじめての ごほうび | 100 | `coinMultiplier() ×1.25` / 誕生日ボーナス増 / `pickWeightedItem()` の rankBonus 1.0 / 10さいごとの「としの おくりもの」 |
| 40 | 🐾 なかまの わ | 150 | 出会い抽選 `30〜80秒`（通常 `45〜120秒`） / bond 減衰 ×0.5 / なかまミニゲームの `ageDifficulty()` ×0.7 / じゃれるの bond 回復に `+sodachi/5` |
| 50 | 💐 こいの きざし | 250 | きゅうあい成功率 `+0.1 + min(0.2, sodachi/500)` / `marriageBondThreshold()` `-2` / **デート解禁** / わかれ時 `applyDecline` ×0.5 |
| 60 | 🗝️ へんしんの ちから | 400 | 候補 2→3 / `transformLimit()` 3→4 / `transformMeter` 獲得 ×1.2 / **レア条件が 1 段緩和** |
| 70 | 🧭 たびだち | 600 | `coinMultiplier()` さらに ×1.4（累計 ×1.75） / たびの `happiness` ボーナス ×2 / **とくべつな たびさき解禁** |
| 80 | 🌈 レアの きざし | 900 | レア混入率 0.5→0.65 / `pickWeightedItem()` rankBonus 2.5 / `recoveryPotency()` に `+sodachi/400` / **レアなかま解禁** / **れんくんの条件緩和** |
| 90 | ✨ でんせつ | 1400 | `fromAge` の死亡メーター上昇が 0 / 全ステータス自然減 ×0.85 / **`dreamEggs.rare += 1`** / きんいろオーラ（`.legend-aura`） / **でんせつの であい解禁** |
| 100 | 👑 さいこうの そだち | 3000 | **＋即時 5,000 コイン** / `dreamEggs.normal += 1` / `deathMeter = 0` ＋ 以後不死 / にじオーラ（`.rainbow-aura`） |

`coinMultiplier()` = `(hasPerk(30) ? 1.25 : 1) × (hasPerk(70) ? 1.4 : 1)`

### F-4. オーラ

```js
el.screen.classList.toggle('rainbow-aura', state.maxSodachi >= 100 && !isOver);
el.screen.classList.toggle('legend-aura', state.maxSodachi >= 90 && state.maxSodachi < 100 && !isOver);
```

`maxSodachi` 基準なので、そだちが下がってもオーラは残ります。

### F-5. 誕生日（`onBirthday(age)`）

毎年: `applyGrowth(2, silent)`, `applyDecline(-5, silent)`, コイン `round((3 + maxSodachi/25) × coinMultiplier())`

| 条件 | 演出・報酬 |
|---|---|
| `age % 10 === 0 && hasPerk(30)` | `🎁 ○○さいの おいわい!` ＋ かいふくアイテム 1 個 ＋ コイン `round((60 + maxSodachi×1.2) × coinMultiplier())` |
| `age % 5 === 0` | `🎂 ○○さいに なった!` ＋ かいふくアイテム 1 個 |
| それ以外 | `setBirthdayToast('🎂 ○○さいに なった')`（操作を止めないトースト） |
| `age === 90` | `miracleGuard = true` ＋ `🌅 ここまで よく いきてきたね…` |

---

## G. 恋愛

### G-1. ジェンダー

`GENDERS = ['male', 'female', 'nonbinary']`、重み `[47.5, 47.5, 5]`
`GENDER_LABELS = { male: '男の子', female: '女の子', nonbinary: 'ノンバイナリー' }`

`speciesLine === 'man'` は `male` 固定、`'woman'` は `female` 固定。それ以外は重み付き抽選。

### G-2. 恋愛タイプ

`ORIENTATION_ROLL_POOL = ['straight','gay','bi','pan','aro','questioning']`、重み `[68, 8, 12, 5, 2, 5]`
`RESOLVED_ORIENTATIONS = ['straight','gay','bi','pan','aro']`（`questioning` の収束先）

`attractedToFor(gender, orientationId)`:

| タイプ | 結果 |
|---|---|
| `aro` | `[]`（**誰も恋愛対象にならない**） |
| `pan` / `questioning` | `['male','female','nonbinary']` |
| `bi` | シャッフルして 65% で 2 種、35% で 3 種 |
| `straight` | `nonbinary` → `['male','female']` / `male` → `['female']` / `female` → `['male']` |
| `gay`（その他） | `[gender]`（自分と同じジェンダー） |

`orientationLabel(orientationId, gender)` は `gay` のときだけジェンダーで表示を変えます: `male`→「ゲイ」/ `female`→「レズビアン」/ `nonbinary`→「恋愛対象：同じジェンダー」。

### G-3. クエスチョニング

- `questioningResolveThreshold()` = `isEquipped('questioning_fast') ? 2 : QUESTIONING_RESOLVE_THRESHOLD(4)`
- `checkQuestioningResolution()` は**きゅうあいを押すたび**に `questioningEncounters += 1`。しきい値に達すると `RESOLVED_ORIENTATIONS` から重み付き抽選で収束（`questioning` には戻らない）
- プロフィール表示: `クエスチョニング — さがしちゅう N/4`
- `#profileOrientationHelpBtn`（`？`）は `aro` と `questioning` のときだけ表示され、`#profileOrientationHint` に説明文が開閉します

### G-4. きゅうあい（`courtBtn`）

分岐は以下の順:

1. **睡眠中** → 「ねている… おきてから きゅうあいしよう」
2. `energy -6`, `affectionStreak = 0`, `travelStreak = 0`
3. **クエスチョニング収束** → `おおきな きもちの へんかを かんじた…`
4. **こいびとが すれちがい中** → G-6
5. **こいびとあり** → `happiness +3`, `reinforceRelationship()`。けっこん成立なら `applyGrowth(30)`, `applyDecline(-20)`, `lifetime.partnersMarried` に記録
6. **こいびとなし** → 相手抽選

相手抽選:
- `regionCandidates = findRegion(state.regionId).candidates || []`
- `state.guest` があれば 60% で `guestCandidate(state.guest)` を優先
- **候補が 0 人（とくべつな たびさき）なら** `happiness +2` と「ここには だれも いない… でも、ひとりの じかんも わるく なかった」で終了

相互マッチ判定 `candidate.attractedTo.includes(state.gender) && state.attractedTo.includes(candidate.gender)`:
- 不成立 → `happiness +2` ＋ `COURT_FRIEND_REACTIONS`（失敗扱いにしない）
- 成立 → 成功率:
```
traitBonus     = affinityTrait ? min(0.3, traitCounts[trait] × 0.03) : 0.1
happinessBonus = (happiness / 100) × 0.15
flowerBonus    = flower3 0.32 / flower2 0.2 / flower 0.12 / なし 0
sodachiBonus   = hasPerk(50) ? 0.1 + min(0.2, sodachi/500) : 0
successChance  = clamp(0.35 + 合計, 0.15, 0.85)
```
- 成功 → `partner` 生成（`affection: 100, married: false, bondCount: 0`）, `happiness +8`, `applyGrowth(10)`, `applyDecline(-5)`, `lifetime.partnersRecorded` に記録
- 失敗 → `happiness -3`, `applyDecline(2)`

### G-5. けっこん

- `reinforceRelationship()` が `affection += PARTNER_FLIRT_AFFECTION_BOOST (30)`, `bondCount += 1 + courtBoost`
- `marriageBondThreshold()` = `max(2, (isEquipped('marriage_fast') ? 4 : MARRIAGE_BOND_THRESHOLD(8)) - (hasPerk(50) ? 2 : 0))`
- 達成で `married = true`, `bondCount = 0`

### G-6. すれちがい

`rerollIdentityAndBreakupIfNeeded(line)` はへんしん時（および ♾️ の図鑑変身時）に呼ばれます。

- 相性が保たれている場合: すれちがい中なら `mismatched = false`, `repair = 0` に復帰し「また きもちが ぴったり かさなった!」
- 相性が崩れた場合: **即破局させず** `partner.mismatched = true`, `partner.repair = 0`

すれちがい中の挙動:
- `decayRelationship()` の減衰が `mismatchFactor = 2.5` 倍
- きゅうあいは `affection += 30`, `repair += 1`, `happiness +2` になり、**けっこんには進みません**
- `repair >= MISMATCH_REPAIR_NEEDED (3)` で `mismatched = false`, `applyGrowth(12)`, `applyDecline(-15)`, 「それでも いっしょに いる ことに した」
- 表示は `💔 🦊 もりの きつね(すれちがい)`

### G-7. 維持減衰と破局

```js
PARTNER_AFFECTION_DECAY_PER_TICK = 100 / (RELATION_DECAY_YEARS(28) × AGE_TICKS_PER_YEAR(20))
                                 ≒ 0.1984 / tick
```

`decayRelationship()`（`tick()` から）:
- `affectionDecayFactor`: `partner3` 0.1 / `partner2` 0.35 / `partner1` 0.6 / なし 1
- `affection -= 0.1984 × affectionDecayFactor × mismatchFactor`
- `affection <= 0` で破局: `partner = null`, `raiseDeathMeter(breakupPenalty(wasMarried))`, `applyDecline((married ? 20 : 12) × (hasPerk(50) ? 0.5 : 1))`

`breakupPenalty()`: `BREAKUP_DEATH_PENALTY = { dating: 10, married: 20 }` × (`breakup_ease` 装備で 0.5) × (`oneTimeBoosts.breakupShield` が `'full'` で 0 / `'half'` で 0.5、いずれも 1 回消費)

### G-8. デート（そだち50）

- 入口: `#worldDateBtn`（「せかい」オーバーレイ内）。`hasPerk(50)` でないと `hidden`
- `dateBlockReason()` が null 以外なら `.blocked` クラス ＋ `#worldDateHint` に理由表示（**`disabled` にはしない**）
- ブロック理由: 「まだ デートには さそえない」「いまは デートに いけない」「いま こいびとが いない」「ねている…」「さっき デートしたばかり…」
- 効果: `affection += DATE_AFFECTION_BOOST (45)`, `happiness +12`, `energy -6`, `hunger -4`, `applyGrowth(5)`, `applyDecline(-4)`, `datesThisLife += 1`, `lifetime.datesEnjoyed += 1`
- **コインもアイテムも出ません。`bondCount` も動かしません**
- `dateCooldownTicks = DATE_COOLDOWN_TICKS (60)`（3分）。tick でのみデクリメント
- 文章は `DATE_PLANS`（10）× 地域 × `DATE_TRAIT_LINES`（5 traits × 3 行）× `DATE_CLOSINGS`（6）

---

## H. なかま

### H-1. 通常なかま（`COMPANIONS`）— 10 人

| id | 表示 |
|---|---|
| `shiba` | 🐕 げんきな しばいぬ |
| `tanuki` | 🦝 いたずら たぬき |
| `penguin` | 🐧 おっちょこちょい ペンギン |
| `owl` | 🦉 ものしり ふくろう |
| `rabbit` | 🐰 すばしっこい うさぎ |
| `hedgehog` | 🦔 はずかしがり はりねずみ |
| `koala` | 🐨 のんびり コアラ |
| `otter` | 🦦 あそびずき カワウソ |
| `hamster` | 🐹 ほおぶくろ ハムスター |
| `squirrel` | 🐿️ おっちょこちょい リス |

### H-2. レアなかま（`RARE_COMPANIONS`）— 5 人

| id | 表示 | vibe |
|---|---|---|
| `punyu` | 🫠 とけかけの ぷにゅ | キモかわ |
| `sekizou` | 🗿 むひょうじょうの せきぞう | シュール・渋い |
| `hakuchou` | 🦢 こうごうしい はくちょう | 神々しい・美しい |
| `chameleon` | 🦎 サングラスの カメレオン | おしゃれ・かっこいい |
| `kinoko` | 🍄 しゃべる きのこ | 意味不明・笑える |

`allCompanionsById(id)` が両配列を横断して引きます。

### H-3. 出会い（`scheduleCompanionEncounter()`）

- 遅延: `hasPerk(40) ? 30,000〜80,000ms : 45,000〜120,000ms`（`setTimeout` で自己再帰）
- 発火条件: `!gameActive && stage === GROWING && !isSleeping && !transformOptions && !message && !pendingCompanionId && !isAnyMenuOverlayOpen()` かつ候補が残っている
- `rareRemaining` は `hasPerk(80)` のときだけ非空
- `useRare = rareRemaining.length > 0 && (remaining.length === 0 || Math.random() < RARE_COMPANION_CHANCE(0.35))`
- `openCompanionInvite(companion, isRare)` → **全画面オーバーレイ**（`#companionInviteOverlay`, z-index 8）で 62px のキャラと「○○が あそびに さそってきた!」／レアは「○○が じっと こっちを みている!」＋ `.rare` の夜空色演出
- 「あそぶ!」→ `startMinigame(pickRandomMinigame())` / 「また こんど」→ `pendingCompanionId = null` で解散

### H-4. 加入（`finishMinigame()` 内）

- `clampedScore >= COMPANION_RECRUIT_THRESHOLD (50)` で加入
- レアかどうかで記録先を分岐: `lifetime.rareCompanionsRecruited` / `lifetime.companionsRecruited`
- `state.companions` に `{ id, bond: 100 }` を push
- メッセージはレアなら `companion.joined`、通常なら `○○が なかまに なった!`

### H-5. bond と離脱・再会

```js
COMPANION_BOND_DECAY_PER_TICK = 100 / (28 × 20) ≒ 0.1786 / tick
COMPANION_PLAYWITH_BOND_BOOST = 30
```

- `bondDecayFactor` = (`bond3` 0.1 / `bond2` 0.35 / `bond1` 0.6 / なし 1) × (`hasPerk(40) ? 0.5 : 1`)
- `bond <= 0` でその仲間だけ `state.companions` から離脱。`applyDecline(8)` ＋ メッセージ
- **`lifetime.companionsRecruited` は消えない**ので、同じ人生でも再度出会いイベントで戻ってきます
- 周回すると `state.companions` は空に戻ります（永続記録は残る）

---

## I. 地域・季節・旅

### I-1. 通常地域（`REGIONS`）— 8 地域

| id | 表示 | こいびと候補 2 人 |
|---|---|---|
| `home` | 🏠 おうち | となりの ねこ (female/bi/gentle), こうえんの わんこ (male/straight/wild) |
| `sea` | 🌊 うみ | うみの にんぎょ (female/pan/romantic), なみのり カメくん (male/gay/calm) |
| `snow` | 🏔️ ゆきやま | ゆきの せいれい (nonbinary/pan/calm), やまごやの クマさん (male/bi/brave) |
| `city` | 🏙️ とかい | となりまちの ロボット (nonbinary/bi/calm), ビルの ねこ社長 (female/gay/brave) |
| `countryside` | 🌾 いなか | はたけの ひまわりさん (female/straight/romantic), のはらの うしさん (male/pan/gentle) |
| `forest` | 🌲 もり | もりの きつね (male/gay/wild), こだちの リス (female/bi/wild) |
| `desert` | 🏜️ さばく | さばくの さそりさん (nonbinary/bi/brave), オアシスの らくださん (male/straight/calm) |
| `tropical` | 🌴 なんごく | なんごくの インコ (female/pan/romantic), やしの きの リザードさん (male/gay/wild) |

`ALL_PARTNER_CANDIDATES = REGIONS.flatMap(r => r.candidates)` → **16 人**

### I-2. とくべつな たびさき（`SPECIAL_REGIONS`）— 2 か所

| id | 表示 | candidates |
|---|---|---|
| `star_stop` | 🌌 ほしぞらの ていりゅうじょ | `[]` |
| `memory_lake` | 🫧 きおくの みずうみ | `[]` |

- `REGIONS` には**含まれません**。`findRegion(id)` が両方を横断
- `renderTravelRegionGrid()` は `hasPerk(70)` のときだけ `#travelSpecialSection` を表示
- 記録先は `lifetime.specialRegionsVisited`（`regionsVisited` は増えない）

### I-3. たび（`travelToRegion(region)`）

- `region.special && !hasPerk(70)` なら拒否
- 睡眠中は不可
- `affectionStreak = 0`, `travelStreak += 1`
- `travelSpamThreshold()`（基本 `TRAVEL_SPAM_THRESHOLD = 3`、`travel_threshold` 装備で増加）を超えると「たびづかれ」: `happiness -3`, `applyDecline(5)`
- `oneTimeBoosts.travelGuarantee` があれば 1 回だけ「たびづかれ」を回避
- 通常時: `applyGrowth(初訪問 ? (special ? 12 : 6) : (special ? 4 : 2))`, `applyDecline(-2)`, `happiness += (5 + travelBonus) × (hasPerk(70) ? 2 : 1)`
- `travelBonus`: `travel3` 7 / `travel2` 4 / `travel1` 2 / なし 0
- 常に `energy -6`, `hunger -4`

### I-4. 季節

- `SEASON_MODE_ORDER = ['auto','spring','summer','autumn','winter']`（`lifetime.seasonMode`）
- `auto` は現在の月から自動判定
- `SEASON_INFO`: 🌸はる / 🌻なつ / 🍁あき / ❄️ふゆ
- `computeSeasonVisual(regionId, season)` が `{fx, decor, tint}` を返す。`SEASON_DECOR_OVERRIDES` に地域×季節の個別上書き 9 件
- 季節が実際に変わった瞬間だけ `celebrateSeasonChange()` の演出
- `body` に `region-<id>` クラスが付き、`style.css` の `body.region-*` で背景が変わります

---

## J. ミニゲーム

### J-1. 現在の総数（コードから再計測）

| 指標 | 値 |
|---|---|
| `MINIGAMES`（基本プール） | **124** |
| `MINIGAME_CATEGORY_GROUPS`（カテゴリ数） | **56** |
| `REGION_MINIGAMES`（地域限定） | 8 地域 / 計 34 件 |
| `SEASONAL_MINIGAMES`（季節限定） | 4 季節 / 計 11 件 |
| `buildMinigamePool()` の実プール（おうち・現在季節） | **117** |

**カテゴリ別の変種数**:
`catch 6, whack 4, timing 7, quiz 7, memory 2, math 5, reaction 3, stroop 3, janken 1, concentration 1, mash 3, balance 1, oddOneOut 2, numberOrder 1, compare 2, shapeMatch 1, silhouette 3, pattern 2, beat 3, maze 3, sort 5, highLow 1, tileSwap 2, bubblePop 2, spell 2, sumPair 2, jump 3, colorMix 1, findSelf 1, pose 1, road 3, stack 2, fight 4, rpg 3, chase 2, runner 2, shooter 2, comboInput 1, boxPick 1, matchupQuiz 1, steppingStones 1, targetAim 2, race 3, swipeThrow 2, powerMeter 3, pushContest 1, chop 1, stealth 1, comedyStealth 1, cuteHorror 1, roulette 1, breakout 1, sportsSwing 1, dragDecorate 2, miniPoker 1, miniEscape 1`

**地域限定の置換カテゴリ**:
`home`: mash, catch, concentration, maze ／ `sea`: catch, whack, maze, concentration, fishing ／ `snow`: jump, mash, whack, catch, downhill ／ `city`: whack, timing, road, mash ／ `countryside`: catch, mash, whack, concentration ／ `forest`: whack, bubblePop, maze, stack ／ `desert`: catch, jump, whack, road ／ `tropical`: catch, mash, whack, bubblePop

地域限定版が存在するカテゴリは、その地域にいる間**通常の変種が一切出ません**（プールから除外）。

### J-2. 抽選ロジック（`pickRandomMinigame()`）

- `minigameQueue` にプール全体をシャッフルして積み、pop で消費（**一巡するまで同じゲームが出ない**）
- `lifetime.minigamePlayCounts`（永続）で未プレイ優遇の重み付け
- 地域到着・季節変化の直後は `regionArrivalBoostLeft` / `seasonArrivalBoostLeft` により、その地域/季節限定ゲームを前方に引き寄せる
- 同一カテゴリが 3 連続しそうなら、近傍の別カテゴリと入れ替える（`recentMinigameCategories`）

### J-3. 結果処理（`finishMinigame(score, customMessage)`）

```
glassesBonus      = glasses3 22 / glasses2 14 / glasses 8 / なし 0
minigameBoostBonus = oneTimeBoosts.minigameBoost === 'big' ? 100 : 'small' ? 25 : 0
clampedScore = clamp(score + glassesBonus + minigameBoostBonus, 0, 100)
happiness += round(5 + clampedScore/100 × 20)
energy -= 12
transformMeter += (15 + hatBonus) × (hasPerk(60) ? 1.2 : 1)
```

| 区分 | 条件 | 効果 |
|---|---|---|
| 大成功 | `>= 70` | `applyGrowth(14)`, `applyDecline(-8)`, かいふくアイテム 1 個, コイン `round((5 + rand×6) × starFactor × coinBoost)`, `checkStoryEvents('minigame-great')` |
| ふつう | `40〜69` | `applyGrowth(7)`, `applyDecline(-3)` |
| 失敗 | `< 40` | `applyDecline(16)`, `raiseDeathMeter(5)`, `checkStoryEvents('minigame-bad')` |

`starFactor`: `star3` 2.6 / `star2` 1.8 / `star` 1.4 / なし 1

**失敗許容**: `oneTimeBoosts.safetyNet` があると失敗時のおとろえ・死亡メーター上昇をまるごと無効化（1 回消費）。

### J-4. 難易度（`ageDifficulty()`）

```js
base = clamp(currentAge() / MAX_DIFFICULTY_AGE(60), 0, 1)
return (pendingCompanionId && hasPerk(40)) ? base * 0.7 : base
```

### J-5. 時間設計の定数

| 定数 | 値 | 用途 |
|---|---|---|
| `MG_REVEAL_MS` | 480 | 判定と `onComplete` の最小間隔 |
| `MG_TIMED_CHOICE_GRACE_MS` | 700 | 問題を読む猶予（タイマー開始前） |
| `MG_TIMED_CHOICE_MIN_MS` | 2200 | 判断系の最低保証時間 |
| `MG_STEP_MIN_MS` | 2500 | めいろ／あしば系の最低保証時間 |
| `MG_ACTION_START_GRACE_MS` | 900 | アクション系の開始猶予 |

代表的な時間制限は `MG_TIMED_CHOICE_GRACE_MS + lerp(高難度前, 高難度後, difficulty)` の形。

### J-6. 全共通 UX ルール（コード内コメントとして明文化されているもの）

`script.js` の「ミニゲーム きょうつうの UXルール」コメントに 11 項目が記載されています。

1. 選択式は判定した瞬間に進めない。`revealAndProceed()` で結果を見せてから進む
2. 判定と `onComplete` を同一フレームで行わない（最低 `MG_REVEAL_MS`）
3. 誤タップを完全な無反応にしない
4. 回避／衝突系は判定成立と障害物消去のタイミングを分ける
5. 2 段階構成のゲームは最後の操作の後に必ず結果を見せる
6. 正解と不正解で同じ演出を使い回さない
7. 新カテゴリ追加時は `minigameCategoryOf` 登録ループを必ず通す
8. 色だけに頼らず ⭕/❌/✓ の記号でも正誤を伝える
9. 静止画面の判断系はタイマーを問題表示と同時に開始しない（`MG_TIMED_CHOICE_GRACE_MS`）
10. 高難度でも `MG_TIMED_CHOICE_MIN_MS` / `MG_STEP_MIN_MS` を最低保証する
11. （`makeSwipeThrowGame` にはスワイプ不成立時の時間制限あり）

### J-7. せいかくクイズ

`quiz` カテゴリ（7 変種）だけが `state.traitCounts[choice.trait] += 1` を行います。これが `mermaid` / `unicorn` / `ren` の解禁条件に直結する唯一の経路です。

---

## K. アイテム・ショップ・経済

### K-1. 件数と分類

| 配列 | 件数 | 性質 |
|---|---|---|
| `SHOP_ITEMS` | **50** | 購入して**装備**（同時に 1 つ）。`lifetime.ownedShopItems` / `lifetime.equippedItemId` |
| `NAOTO_ITEMS` | **4** | 購入すると**永続効果**（装備切替なし）。`lifetime.ownedNaotoItems` |
| `CONSUMABLE_ITEMS` | **50** | 購入した瞬間に 1 回だけ効果発動（所有物にならない）。`lifetime.ownedConsumableItems` / `lifetime.consumablesUsed` |
| `RECOVERY_ITEMS` | **9** | ミニゲーム大成功・誕生日で入手。`state.items`（**一人生データ**） |

### K-2. SHOP_ITEMS（50 件・全 ID / 価格）

3 段階（無印 → 2 → 3）の系列 13 本 ＋ 単発 5 本。

| 系列 | 無印 | 2 | 3 |
|---|---|---|---|
| おはな（きゅうあい成功率） | `flower` 15 | `flower2` 220 | `flower3` 5500 |
| リボン（ごきげん減衰） | `ribbon` 20 | `ribbon2` 180 | `ribbon3` 6000 |
| ちょうネクタイ（おなか減衰） | `bowtie` 20 | `bowtie2` 180 | `bowtie3` 6000 |
| トイレットペーパー（うんち） | `poop1` 20 | `poop2` 260 | `poop3` 8000 |
| マフラー（病気） | `scarf` 25 | `scarf2` 240 | `scarf3` 6500 |
| サングラス（ミニゲーム得点） | `glasses` 30 | `glasses2` 260 | `glasses3` 7000 |
| げんきドリンク（げんき減衰） | `energy1` 35 | `energy2` 300 | `energy3` 10000 |
| シルクハット（へんしん率） | `hat` 40 | `hat2` 320 | `hat3` 8000 |
| リュックサック（たびボーナス） | `travel1` 40 | `travel2` 300 | `travel3` 15000 |
| ふかふかまくら（睡眠回復） | `sleepboost1` 45 | `sleepboost2` 340 | `sleepboost3` 12000 |
| スターバッジ（コイン） | `star` 50 | `star2` 380 | `star3` 9000 |
| おともだちバッジ（bond 減衰） | `bond1` 60 | `bond2` 400 | `bond3` 20000 |
| らぶれたー（affection 減衰） | `partner1` 70 | `partner2` 420 | `partner3` 20000 |
| かんむり（いのち減衰） | `crown` 80 | `crown2` 450 | `crown3` 15000 |
| よつばのクローバー（ごほうび効果） | `itemluck1` 90 | `itemluck2` 380 | `itemluck3` 18000 |

単発: `pet_threshold` 850（じゃれる連打耐性） / `travel_threshold` 900（たびづかれ耐性） / `breakup_ease` 1400（わかれダメージ半減） / `questioning_fast` 1600（クエスチョニング半減） / `marriage_fast` 2200（けっこん回数半減）

**合計 178,220 コイン**

### K-3. NAOTO_ITEMS（4 件）

| id | 表示 | 価格 | 解禁 | 効果 |
|---|---|---|---|---|
| `naoto_charm` | 🧿 なおとの おまもり | 30,000 | tier0 | 病気に絶対にならない |
| `naoto_lantern` | 🏮 なおとの ランタン | 35,000 | tier1 | うんちが二度と溜まらない |
| `naoto_ring` | 💍 なおとの リング | 50,000 | tier2 | 死亡メーターが二度と上がらない |
| `naoto_crown` | 👑 なおとの かんむり | 80,000 | tier3 | 4 ステータスが常に満タン |

**合計 195,000 コイン**。`endingTiersReached` に該当 tier がないとロック表示（`🔒 ？？？`）。

### K-4. CONSUMABLE_ITEMS（50 件・全 ID / 価格 / `available` 条件）

**ゲートなし（22 件）**:
`ot_hunger` 40 / `ot_happy` 40 / `ot_energy` 40 / `ot_health` 60 / `ot_petstreakreset` 80 / `ot_travelstreakreset` 80 / `ot_hungerhappy` 90 / `ot_energyhealth` 90 / `ot_hungerhealth` 90 / `ot_happyenergy` 90 / `ot_sickshield` 90 / `ot_allstat` 150 / `ot_minigamewinsmall` 300 / `ot_sickcurebig` 240 / `ot_travelguarantee` 400 / `ot_megapack` 400 / `ot_safetynet` 450 / `ot_coinboost` 500 / `ot_minigamewinbig` 800 / `ot_perfectcare` 1200 / `ot_regionvisit` 5000 / `ot_dexpick` 8000

**ゲートあり（28 件）**:

| id | 価格 | `available` が false のときのメッセージ |
|---|---|---|
| `ot_poop` | 50 | うんちは たまっていない |
| `ot_companionpartial1` | 90 | いま そばに いる なかまが いない |
| `ot_partnerhalf` | 120 | いま こいびとが いない |
| `ot_evochip` | 150 | いまは つかえない |
| `ot_transformchip` | 180 | いまは つかえない |
| `ot_devoreset` | 200 | いまは つかえない |
| `ot_companionfull1` | 200 | いま そばに いる なかまが いない |
| `ot_partnerfull` | 250 | いま こいびとが いない |
| `ot_courtboostsmall` | 250 | いまは つかえない |
| `ot_evodown` | 250 | いまは とりもどす ぶんが ない |
| `ot_evoup` | 300 | いまは つかえない |
| `ot_breakupshieldhalf` | 400 | いま こいびとが いない |
| `ot_transform` | 400 | いまは つかえない |
| `ot_companionfullall` | 500 | いま そばに いる なかまが いない |
| `ot_partnerbigcombo` | 600 | いまは つかえない |
| `ot_devomega` | 700 | いまは とりもどす ぶんが ない |
| `ot_courtboostbig` | 700 | いまは つかえない |
| `ot_breakupshieldfull` | 900 | いま こいびとが いない |
| `ot_bigevo` | 900 | いまは つかえない |
| `ot_agejump` | 1200 | この 人生では もう つかえない（`sandUsed < 3`） |
| `ot_marriageprep` | 1800 | いまは つかえない |
| `ot_evomega` | 2500 | いまは つかえない |
| `ot_marriage` | 3000 | いまは つかえない |
| `ot_bigagejump` | 3000 | この 人生では もう つかえない（`bigSandUsed < 1`） |
| `ot_dreamegg` | 5000 | いっしょうクリアするか、そだち100まで そだてると つかえる |
| `ot_colorpick` | 8000 | もう ぜんぶの いろが 解放ずみ |
| `ot_patternpick` | 8000 | もう ぜんぶの がらが 解放ずみ |
| `ot_achpick` | 60000 | もう ぜんぶの じっせきを たっせいずみ |

**合計 117,870 コイン**。`picker` を持つ 6 件（`region` / `color` / `pattern` / `dex` / `dreamline` / `achievement`）は `#pickerOverlay` で対象を選んでから支払います。

`available()` が false の項目は `.locked` クラスとなり、`shop-item-status` に「つかえません: 〈理由〉」が赤字で表示されます。

### K-5. RECOVERY_ITEMS（9 件・2 段階）

**設計原則:** 日常4ステータス（おなか / ごきげん / げんき / けんこう）は通常のお世話で戻せるため、ごほうびとは役割を分離する。**ごほうびは「一生で蓄積するダメージ」を癒すアイテム**とし、全9件がおとろえに効き、上位3件はさらにいのちにも効く。

| tier | id | 表示 | rank | weight | effects |
|---|---|---|---|---|---|
| normal | `candy` | 🍬 あめ | 1 | 8 | `decline -8` |
| normal | `dogfood` | 🦴 ドッグフード | 2 | 6 | `decline -12` |
| normal | `catfood` | 🐟 キャットフード | 2 | 6 | `decline -12` |
| normal | `udon` | 🍜 うどん | 3 | 5 | `decline -18` |
| normal | `curry` | 🍛 カレー | 3 | 5 | `decline -20` |
| normal | `hotpot` | 🍲 なべ | 4 | 4 | `decline -28` |
| **special** | `shoulder` | 💆 かたたたき | 5 | 3 | `decline -35, life +10` |
| **special** | `hug` | 🤗 ハグ | 6 | 2 | `decline -45, life +25` |
| **special** | `kiss` | 💋 キス | 7 | 1 | `decline -65, life +45` |

- `normal` 6件も通常ステータス回復ではなく **おとろえ回復**。通常のお世話との差別化を優先
- `special` 3件は **おとろえ + いのち** を同時に立て直す
- rank / weight は維持し、上位ほど強く希少
- `pickWeightedItem()`: `weight × (1 + rankBonus × rank/7)`、`rankBonus = hasPerk(80) ? 2.5 : hasPerk(30) ? 1.0 : 0`
- `recoveryPotency()` = `1 + (itemluck3 0.4 / itemluck2 0.22 / itemluck1 0.1 / なし 0) + (hasPerk(80) ? sodachi/400 : 0)`（最大 ×1.65）
- `recoveryWouldHelp(item)` が false なら消費しない
- ♾️ 中は `decline` / `life` が停止しているため、これらのごほうびは原則「変わるところがない」となる
- 使用後メッセージは実際に動いた分だけ列挙する
- あいてむ画面の「ごほうび」セクションに9件を説明つきで表示し、所持中ならタップ使用できる

### K-6. 経済の総額

| 項目 | 額 |
|---|---|
| SHOP_ITEMS 50 件 | 178,220 |
| CONSUMABLE_ITEMS 50 件 | 117,870 |
| `item-all` 実績に必要な合計 | **296,090** |
| NAOTO_ITEMS 4 件 | 195,000（`naoto-1` 実績は最安 30,000 で成立） |

コイン獲得経路: ミニゲーム大成功 / 誕生日（毎年・5さい・10さい）/ そだち節目 / でんせつの であい（`LEGEND_COIN_GIFT = 200 × coinMultiplier()`）/ そだち100 の即時 5,000。

---

## L. 通信

### L-1. あいてコード（`GUEST_CODE_PREFIX = 'NAOTOCCHI1:'`）

- `encodeGuestCode()`: `btoa(encodeURIComponent(JSON.stringify(payload)))` にプレフィックスを付与
- `decodeGuestCode(raw)` で `state.guest` に読み込み
- `state.guest` がいると、きゅうあい時に **60% の確率で優先的に**相手候補になります
- ゲストとこいびとになると、その種族・形態を `recordDiscoveryKey()` で図鑑に記録します（`partnersRecorded` には入らない）
- `state.guest` は一人生データ（周回で消える）

### L-2. うそつきしょうぶ

| 定数 | 値 |
|---|---|
| `DUEL_QUESTIONS` | 150 問 |
| `DUEL_MATCH_QUESTION_COUNT` | 5 |
| `DUEL_RECENT_HISTORY_LIMIT` | 20 |
| `DUEL_LIE_BUDGET` | 2 |
| `DUEL_WEIGHT_MIX` | `[1, 2, 2, 3, 3]` |
| `DUEL_CATEGORY_LIMIT` | 2 |
| `DUEL_MAX_BET` | 999,999 |
| `DUEL_TOTAL_REVEAL_STEPS` | 6（5問 + いちばんあやしいボーナス） |

コード形式（3 種）:
- `DUEL_CHALLENGE_PREFIX = 'NAOTOCCHIDUELC1:'`（挑戦コード）
- `DUEL_GUESS_PREFIX = 'NAOTOCCHIDUELG1:'`（推理コード）
- `DUEL_REVEAL_PREFIX = 'NAOTOCCHIDUELR1:'`（開示コード）

`DUEL_TRAIT_LABELS`（8 種）: 慎重派 / 行動派 / 嫉妬深い / ロマンチスト / 秘密主義 / 甘えん坊 / マイペース / 現実派

`DUEL_CONFIDENCE_LABELS`: `maybe` 🤔たぶん / `certain` 🔥ぜったい

**永続統計（`lifetime` に 13 フィールド）**:
`duelTraits`（8 特性のカウント。正直に答えたラウンドのみ加算） / `duelMatchesPlayed` / `duelWins` / `duelLosses` / `duelDraws` / `duelLiesUsed` / `duelLiesSucceeded` / `duelLiesFacedAsGuesser` / `duelLiesDetected` / `duelHonestAnswersGiven` / `duelHonestMisread` / `duelLongestLieStreak` / `duelRecentQuestionIds`

`state.duel` は進行中の対戦状態で、**一人生データ**（周回で消える）。

---

## M. UI・演出

### M-1. 画面構成

`index.html` は id 付き要素 **264 個**、id 付き `<button>` **76 個**、オーバーレイ **19 個**。

**オーバーレイ一覧と z-index**:

| id | z-index |
|---|---|
| `gameClearOverlay` / `transformOverlay` / `minigameOverlay` / `storyFlash` | 5 |
| `dexOverlay` ほか `.dex-overlay` 系 | 6 |
| `farewellBar` | 7 |
| `companionInviteOverlay` | 8 |
| `dexDetailOverlay` | 10 |
| `lifeCardOverlay` | 20 |
| `wipeOverlay` / `wipeConfirmOverlay` | 30 |
| `pickerOverlay` | 50 |

その他: `dexOverlay`, `achOverlay`, `themeOverlay`, `itemOverlay`, `worldOverlay`, `seasonOverlay`, `travelOverlay`, `profileOverlay`, `commOverlay`, `duelOverlay`

### M-2. hidden 制御

**このプロジェクトには汎用の `.hidden { display:none }` ルールがありません。** `display` を持つ要素は個別に `.X.hidden` を書く必要があります。現在、`hidden` クラスを付ける要素で対応 CSS が欠けているものは **0 件**です（`#lifeMeterRow.hidden`, `.duel-choice-row.hidden`, `.companion-invite-overlay.hidden`, `.dex-detail-overlay.hidden`, `.world-date-hint.hidden`, `.ending-badge-tip.hidden` などが個別に定義されています）。

### M-3. メッセージ

- `setMessage(text)` → `#message`。`checkMeters()` が true（死亡）を返した場合は上書きしない書き方が全体で徹底されています（`if (!checkMeters()) setMessage(...)`）
- `#birthdayToast`: 毎年の誕生日。操作を止めない
- `#storyFlash`: 画面上部の帯（`pointer-events: none`、`STORY_FLASH_DURATION_MS = 4200`）。`STORY_EVENT_POOLS` は 8 プール計 36 件、発火率 `STORY_EVENT_CHANCE = 0.45`
- `IDLE_GREETINGS_STANDARD` 27 件 ＋ 方言・外国語プールの放置時ひとこと

### M-4. 人生イベントの演出強度

| 強度 | 対象 |
|---|---|
| トースト | 毎年の誕生日 |
| メッセージ欄 | 5さい／10さいのおいわい、たび、デート、でんせつの であい |
| 帯（storyFlash） | `STORY_EVENT_POOLS` の 8 コンテキスト、レア/通常なかまの紹介 |
| 全画面オーバーレイ | へんしん選択、なかまの さそい、ずかん詳細、人生記録カード、④⑤の祝い、完全リセット |

### M-5. オーラと ♾️ 表示

- `.rainbow-aura` / `.legend-aura` はいずれも `#pet` の `drop-shadow` フィルタ
- ♾️: `#ageLabel` = `ねんれい: ♾️`, `#sodachiLabel` = `そだち: ♾️`, `#lifeMeterRow` が `display:none`
- ゴールバッジ（`#endingBadges`）はタップで `#endingBadgeTip` に「🎉 ふつうクリア を たっせいずみ」等を 2.6 秒表示。タップ領域は `min-width/height: 34px`

---

## N. セーブ・旧セーブ移行・リセット

### N-1. SAVE_KEY

```js
const SAVE_KEY = 'naotocchi-save-v1';
```

`saveState()` は `state` 全体を `JSON.stringify` して保存し、その中で `recordDiscovery()` / `checkAchievements()` / `checkGrandGoals()` を呼びます。

### N-2. loadState()

```js
const merged = { ...freshState(), ...parsed };
merged.lifetime = { ...freshState().lifetime, ...(parsed.lifetime || {}) };
```

`lifetime` はネストしているため明示的に穴埋めします。→ **後から追加したフィールドは古いセーブでも `undefined` にならない**。

### N-3. 移行（migration）

**E. schemaVersion 4（1さい=1分化）** — v3 の `ageTicks` を `20/18` 倍して、表示年齢だけでなく「次の誕生日までの途中経過」も維持する。`infiniteReturn.ageTicks` も同じ比率で移行するため、♾️往復用に保存した人生も若返らない。

**A. 旧ステージ名の写像（`OLD_STAGE_MAP`）** — `adult_good` / `adult_bad` / `baby` / `child` / `teen` / `adult` / `elder` を `{stageIndex, species}` に変換

**B. gender 補完** — `stage === GROWING && !merged.gender` なら `rollIdentity()` で遡って生成

**C. companions 補完** — `parsed` に `companions` がなければ `lifetime.companionsRecruited` 全員を `bond: 100` で復元

**D. `schemaVersion < 3` の移行**:
```js
displayedAge = clamp(floor((parsed.age || 0) / 20), 0, 100)
merged.ageTicks   = displayedAge * 20        // 表示年齢を変えない
merged.stageIndex = stageForAge(displayedAge)
merged.growth = 0; merged.decline = 0
merged.sodachi = 50; merged.maxSodachi = 50  // 途中から始まる子は中間値
if (parsed.freePlay) { lifetime.perfectCleared = true; merged.infinite = true; }
if (parsed.stage === 'clear') { stage = FAREWELL; ageTicks = 100*20; stageIndex = stageForAge(100); }
merged.declineBaseline = lifetime.devolutions || 0
merged.schemaVersion = 3
pendingMigrationQuiet = true   // 移行時は演出を抑止
```

最後に旧フィールドを削除: `delete merged.age / evoMeter / devoMeter / freePlay`

例外時は `freshState()` を返します。

### N-4. 通常リセット（あたらしい たまご）

`#resetBtn` → A-7 のとおり。`lifetime` / `discoveredStages` / `achievementsUnlocked` を引き継ぎ、`lifetime.resets += 1`。

### N-5. 完全リセット（`doWipe()`）

`#softResetBtn` / `#wipeBtn` は「でざいん」画面の最下部（danger-zone）。

1. `#wipeBtn` → `#wipeOverlay`（失うものの実数表示 ＋「つぎへ」）
2. `#wipeNextBtn` → `#wipeConfirmOverlay`
3. `#wipeHoldBtn` を **3 秒長押し** → `doWipe()`

`doWipe()`: `localStorage.removeItem(SAVE_KEY)` ＋ `state = freshState()` ＋ 全オーバーレイを閉じる。

### N-6. ♾️ 往復スナップショット

`state.infiniteReturn` に `JSON.parse(JSON.stringify(state))` のディープコピーを格納し、`lifetime` / `discoveredStages` / `achievementsUnlocked` / `infiniteReturn` 自身を `delete` します。`state` の一部なのでセーブに乗り、リロードを挟んでも復帰できます。

`exitInfinite()` は `lifetime.resets` / `pastLives` / `clears` / 実績カウンタを**一切変更しません**。

---

## O. 数値・定数一覧

### O-1. 時間・年齢

| 定数 | 値 | 用途 |
|---|---|---|
| `TICK_MS` | 3000 | 1 tick = 3 秒 |
| `AGE_TICKS_PER_YEAR` | 20 | 1さい = 20 tick = 60 秒 |
| `GOAL_AGE` | 100 | 100さい = 1,800 tick = 90.0 分 |
| `MAX_DIFFICULTY_AGE` | 60 | ミニゲーム難易度が最大になる年齢 |
| `RECENT_ACTION_TICKS` | 20 | 「直近のお世話」判定（60 秒） |
| `DYING_GRACE_TICKS` | 40 | おわかれの まえぶれの猶予（2 分） |

### O-2. そだち

| 定数 | 値 |
|---|---|
| `SODACHI_START` | 20 |
| `SODACHI_MAX` | 100 |
| `HATCH_GROWTH` | 20 |
| `DECLINE_MAX` | 100 |
| `LIFE_CLEAR_SODACHI` | 70 |
| `SODACHI_COST_BANDS` | `≤19:9, ≤39:11, ≤59:20, ≤69:38, ≤79:55, ≤89:75, ≤99:100` |

### O-3. 恋愛・なかま

| 定数 | 値 |
|---|---|
| `RELATION_DECAY_YEARS` | 28 |
| `PARTNER_AFFECTION_DECAY_PER_TICK` | ≒0.1984 |
| `COMPANION_BOND_DECAY_PER_TICK` | ≒0.1984 |
| `PARTNER_FLIRT_AFFECTION_BOOST` | 30 |
| `COMPANION_PLAYWITH_BOND_BOOST` | 30 |
| `MARRIAGE_BOND_THRESHOLD` | 8 |
| `MISMATCH_REPAIR_NEEDED` | 3 |
| `QUESTIONING_RESOLVE_THRESHOLD` | 4 |
| `COMPANION_RECRUIT_THRESHOLD` | 50 |
| `RARE_COMPANION_CHANCE` | 0.35 |
| `BREAKUP_DEATH_PENALTY` | `{dating:10, married:20}` |
| `DEATH_METER_MULTIPLIER` | `{none:1, dating:0.75, married:0.5}` |
| `AFFECTION_SPAM_THRESHOLD` | 3 |
| `TRAVEL_SPAM_THRESHOLD` | 3 |

### O-4. デート・でんせつ

| 定数 | 値 |
|---|---|
| `DATE_COOLDOWN_TICKS` | 60（3 分） |
| `DATE_AFFECTION_BOOST` | 45 |
| `LEGEND_ENCOUNTER_CHANCE` | 0.012 / tick |
| `LEGEND_COIN_GIFT` | 200 |

### O-5. 体調・演出

| 定数 | 値 |
|---|---|
| `MAX_POOP` | 4 |
| `STORY_EVENT_CHANCE` | 0.45 |
| `STORY_FLASH_DURATION_MS` | 4200 |
| `MG_REVEAL_MS` / `MG_TIMED_CHOICE_GRACE_MS` / `MG_TIMED_CHOICE_MIN_MS` / `MG_STEP_MIN_MS` / `MG_ACTION_START_GRACE_MS` | 480 / 700 / 2200 / 2500 / 900 |

### O-6. コレクション件数

| 対象 | 件数 |
|---|---|
| 種族 | 21（通常 16 ＋ レア 5） |
| 形態 | 168（21 × 8） |
| 形態の説明文 | 168（すべて相異なる） |
| 地域 | 8 ＋ とくべつ 2 |
| こいびと候補 | 16 |
| 通常なかま / レアなかま | 10 / 5 |
| ミニゲーム（基本プール / カテゴリ） | 124 / 56 |
| 実績 | 75 |
| SHOP / NAOTO / CONSUMABLE / RECOVERY | 50 / 4 / 50 / 9 |
| いろ / がら | 40 / 40（各: 常時 21・tier0〜3 各 5/5/5/4・にじ 1） |

**でざいん実装ルール:** 本体の40柄と画面の40柄は、どの色テーマと組み合わせても視認できること。`.device.theme-*` の `background` shorthand は `background-image` を消すため、**本体柄の `background-image / background-size / background-position` は色テーマ定義より後で適用する**。
| 病気 | 10 |
| でんせつの であい | 5 |
| デートプラン | 10 |
| うそつきしょうぶの質問 | 150 |
| ストーリーイベント | 8 プール 36 件 |

---

## P. 現在 main に残る旧仕様・死にコード・到達不能処理

**修正していません。一覧のみです。**

### P-1. 移行専用コード（旧セーブのためだけに存在）

| 箇所 | 内容 |
|---|---|
| `OLD_STAGE_MAP` | `adult_good` / `adult_bad` / `baby` / `child` / `teen` / `adult` / `elder` の 7 種。現在のコードはこれらの値を書き込まない |
| `parsed.freePlay` | 現在は書き込まれない。読み取り後 `delete merged.freePlay` |
| `parsed.evoMeter` / `parsed.devoMeter` | 現在は書き込まれない。`delete` のみ |
| `parsed.age` | 現在は `ageTicks` を使う。`delete merged.age` |
| `parsed.stage === 'clear'` | `STAGE` に `CLEAR` は既に存在せず、この文字列は移行時にしか現れない |
| `companions` 欠落時の補完 | `parsed` に `companions` がない古いセーブ用 |
| `gender` 欠落時の遡り生成 | きゅうあい機能より前のセーブ用 |

これらはすべて `schemaVersion < 3` 系のパスにあり、**現行バージョンで新規に到達することはありません**。

### P-2. HTML にあるが `script.js` から一度も参照されない id（3 件）

| id | 用途（HTML 上） |
|---|---|
| `worldStatus` | `<div class="world-status">` — きせつ／ちいきラベルのラッパー。CSS からのみ使用 |
| `profileCompanionSection` | プロフィールのなかまセクションのラッパー。CSS からのみ使用 |
| `duelAnswerReviewLieRow` | うそつきしょうぶの「つかった うそコイン」行。子の `#duelAnswerReviewLieCount` は JS から更新されるが、行自体の id は未使用 |

いずれもレイアウト用のラッパーで、動作への影響は確認できません（**意図未確認**）。

### P-3. 書き込まれるが一度も読まれないフィールド

| フィールド | 状況 |
|---|---|
| `lifetime.dreamEggs.normal` | そだち100 で `+1` される。読み取りは `ot_dreamegg` の `available()` の OR 条件 1 か所のみ。**デクリメントは存在しない**（＝「1 個」ではなく永続フラグとして機能） |
| `lifetime.dreamEggs.rare` | そだち90 で `+1`。読み取りは `renderPicker()` の `rare > 0` 1 か所のみ。**デクリメントは存在しない** |

### P-4. `RECOVERY_ITEMS` の重複

`dogfood`（🦴 ドッグフード）と `catfood`（🐟 キャットフード）は同ランク・同効果のフレーバー違いとして意図的に残す。種族らしいごほうびの見た目の多様性を優先する。

### P-5. `STAGE.CLEAR` の完全撤去

`STAGE` オブジェクトに `CLEAR` は存在せず、生きたコードからの参照も 0 件です。移行コードの `parsed.stage === 'clear'` という文字列比較のみが残ります。

---

## Q. 過去アイデア棚卸し（2026-09-06 main照合）

過去チャットで「未実装かもしれない」と残っていた案を現mainへ逆引きした結果。**現行仕様と将来候補を混ぜないための台帳**であり、未実装欄は自動的な実装指示ではありません。

### Q-1. 実装済みを確認

- そだち50 **デート**: `DATE_PLANS` 10種、恋人の性格別リアクション、クールダウン、人生記録まで実装済み
- そだち70 **特別な旅先**: `SPECIAL_REGIONS` と専用表示・移動処理あり
- そだち80 **レアなかま**: `RARE_COMPANIONS` 5人、通常10人と別コレクションで実装済み
- そだち90 **でんせつの であい**: 5イベント、未見優先、1人生1回の抽選まで実装済み
- **人生記録 / おもいで**: `lifeLog`、人生記録カード、`pastLives` まで実装済み
- **アロマンティック / クエスチョニング説明**: プロフィールの説明導線と、クエスチョニングの進行表示・収束処理まで実装済み
- 変身後の恋愛 **すれちがい**: 関係修復回数を持つ処理まで実装済み

### Q-2. 一部実装だが完成形ではない

- **キャラが自発的に話す**: `IDLE_GREETINGS` に加え、メイン画面の `#speechBubble` へ本人・恋人・なかまの話者付き放置会話を表示する。`#message` はシステム通知専用として残す
- ミニゲーム側には `.mg-comic-bubble`（顔＋吹き出し）があるが、メイン育成画面には未転用
- 恋人/なかまの放置会話は**話者アイコン付きの会話UI**へ対応済み。操作時リアクションの全件移行は今後必要なら段階的に行う

### Q-3. 未実装・今後の候補

- **メイン画面の吹き出し会話システム**: ✅ 実装済み。なおとっち本人 / 恋人 / なかまを話者付き吹き出し、システム通知は従来のメッセージ欄へ分離。放置会話は本人を基本に、現在いる恋人・なかまも時々話す
- **過去の行動を覚えた会話**: `state.lifetime` / `lifeLog` の履歴を本人のセリフへ反映する仕組み
- **168形態の最終ドット絵**: 21×8の構造は実装済みだが、本番ビジュアル制作は不具合整理後に行う
- **図鑑説明文の最終リライト**: 現在168件の表示機能と文はあるが、最終ドット絵・正式名称確定後に内容を合わせる

### Q-4. 要判断として残すもの

- `IDLE_GREETINGS_DIALECT` は全地域共通プールに混ざっており、現在地でフィルタされない。地域演出として使うなら地域別化、単なるランダムな方言ネタなら現状維持

---

## R. 要確認事項（コードだけでは設計意図を判断できない箇所）

1. **`dreamEggs.normal` / `dreamEggs.rare` の「個数」の意味** — インクリメントのみでデクリメントがなく、実質「一度でも到達したか」の永続フラグとして機能しています。「1 個」という表現が在庫を意図したものか、永続解禁を意図したものかコードからは判断できません。

2. **`dogfood` と `catfood` の効果が完全同一である理由** — 種族によって出やすさを変える等の分岐は存在しません。フレーバーの差だけを意図したものか、片方が調整途中なのか判断できません。

3. **`aro`（アロマンティック）の人生でこいびとが作れないこと** — `attractedTo = []` により `mutualMatch` が常に false になります。プロフィールの説明文にはその旨が書かれていますが、`partnersRecorded` / `partnersMarried` を要する実績（`partner-1`, `married-1`, `married-3`, `perfect-life`）はその人生では進みません。これが意図された「その一生の個性」なのか判断できません。

4. **`phoenix` の解禁条件と「良いプレイ」の関係** — 条件は `sicknessCuredThisLife >= 5`（緩和 3）です。病気の発生自体は `neglected` 状態を必要とするため、4 ステータスを高く保ち続けるプレイでは病気がほとんど起きません。「レアごとに異なる育てかたを要求する」設計なのか、到達しやすさの調整途中なのか判断できません。

5. **`ren` の抽選率が `renEased`（そだち80）にのみ連動する理由** — 他の 4 種は `eased`（そだち60）です。隠しキャラとしての希少性を保つためと読めますが、コード上に根拠となる記述はありません。

6. **`worldStatus` / `profileCompanionSection` / `duelAnswerReviewLieRow` の id** — CSS セレクタとしても使われていません（クラスで指定されています）。将来の JS 参照を見越したものか、削除漏れか判断できません。

7. **`pastLives` の上限 100 件** — 超過分は `shift()` で捨てられます。`pastlives-10` 実績は 10 件で成立するため実害はありませんが、上限の根拠は不明です。

8. **`ot_regionvisit` の全地域訪問後の挙動** — 「好きな地域へその場でワープ」になります。`travelToRegion()` を通さないため `travelStreak` / `energy` / `hunger` / `happiness` が動きません。意図的な差別化か判断できません。

9. **`companion-active-5` 実績（そばにいるなかまが 5 人）** — bond 減衰があるため、5 人を同時に維持するには継続的な「じゃれる」が必要です。難易度の意図は判断できません。

10. **ミニゲームの `quiz` カテゴリだけが `traitCounts` を動かす設計** — 出現率は 56 カテゴリ中 1 つ（実測約 6%）です。他のカテゴリに性格を持たせない理由はコードからは読み取れません。

---

## S. コード → 仕様 逆引き監査

`script.js` / `index.html` / `style.css` に実在する要素が、本仕様書のどこかに記載されているかの確認結果です。

| 対象 | 実数 | 記載箇所 | 網羅 |
|---|---|---|---|
| id 付き `<button>` | 76 | E-1（お世話 9）/ A-7・A-9（reset・infinite）/ D-1（dex 系 3）/ G-8（date）/ H-3（invite 2）/ I-3（world・travel 系 4）/ L-1・L-2（通信・しょうぶ 30）/ M-1（各オーバーレイの ✕ 12）/ N-5（wipe 系 5）/ A-8（gameClear 2）/ G-3（orientationHelp）/ C-3（transformSkip）/ D-4（lifeCardNext・farewell） | ✅ 76/76 |
| オーバーレイ | 19 | M-1 に全 19 件を z-index 付きで列挙 | ✅ 19/19 |
| `state` フィールド | 62 + 2 恒久 | B-7 に全件列挙 | ✅ 64/64 |
| `lifetime` フィールド | 53 | B-7 に全件列挙 | ✅ 53/53 |
| `SHOP_ITEMS` | 50 | K-2（系列 15×3 = 45 ＋ 単発 5） | ✅ 50/50 |
| `NAOTO_ITEMS` | 4 | K-3 に全件 | ✅ 4/4 |
| `CONSUMABLE_ITEMS` | 50 | K-4 に全 ID（ゲートなし 22 ＋ ゲートあり 28） | ✅ 50/50 |
| `RECOVERY_ITEMS` | 9 | K-5 に全件（effects 込み） | ✅ 9/9 |
| 実績 | 75 | D-2 に件数と条件の分類（個別 ID は `ACHIEVEMENTS` 配列を参照） | ⚠️ 分類のみ |
| 種族 | 21 | C-1 に全 ID と表示名 | ✅ 21/21 |
| 形態 | 168 | C-1 / C-2（21 × 8 の構造） | ✅ |
| 地域 | 8 + 2 | I-1 / I-2 に全件（候補込み） | ✅ 10/10 |
| こいびと候補 | 16 | I-1 に全 16 人（gender/orientation/trait 込み） | ✅ 16/16 |
| なかま | 10 + 5 | H-1 / H-2 に全件 | ✅ 15/15 |
| ミニゲームカテゴリ | 56 | J-1 に全 56 カテゴリの変種数 | ✅ 56/56 |
| ミニゲーム総数 | 124 | J-1 | ✅ |
| 地域限定ミニゲーム | 8 地域 34 件 | J-1 にカテゴリ名 | ✅ |
| 季節限定ミニゲーム | 4 季節 11 件 | J-1 に件数 | ⚠️ 件数のみ |
| ストーリーイベント | 8 プール 36 件 | M-3 / O-6 | ✅ |
| でんせつの であい | 5 | （C 章外・F-3 の 90 / O-6） | ✅ 5/5 |
| 病気 | 10 | E-3 / O-6 | ✅ |
| いろ / がら | 40 / 40 | D-3 / O-6（tier 分布込み） | ✅ |
| `ENDING_TIERS` | 4 | D-3 に全件 | ✅ 4/4 |
| ジェンダー × 恋愛タイプ | 3 × 6 | G-1 / G-2 に全 18 通りの `attractedTo` | ✅ 18/18 |
| 主要定数 | 40+ | O 章に名前・値・用途 | ✅ |
| `hidden` 制御 | — | M-2 | ✅ |
| 未参照 id | 3 | P-2 | ✅ 3/3 |

**⚠️ の 2 項目について**: 実績 75 件の個別 ID・条件式と、季節限定ミニゲーム 11 件の個別名は、本文に列挙すると分量が本文の 3 割を超えるため分類・件数の記載に留めています。いずれもコード上の配列（`ACHIEVEMENTS` / `SEASONAL_MINIGAMES`）が一次情報です。

---

*この文書は `794e6f2` 時点のコードから機械的に抽出して作成しました。コードの変更は一切行っていません。*
