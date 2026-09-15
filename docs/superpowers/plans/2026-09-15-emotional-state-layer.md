# Emotional State Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面でメインキャラ自身の動きから病気・空腹・疲れ・不機嫌・いのち低下・じゃれたさを読み取りやすくし、世話の直後にはその行為に合った短い反応を返す。

**Architecture:** `care-status.js` を状態閾値の唯一の正本として読み取り専用の `signals()` を追加し、新しいDOM非依存 `emotion-state.js` が表示用の感情状態と低頻度モーションプロフィールへ変換する。`cast-motion.js` は既存モーションを再利用しつつ、空腹・不機嫌の区別に必要な小さな2モーションと「メインだけ動かす」APIを追加する。`script.js` は状態を保存せず、その都度 resolver で導出し、persistent cue と既存の一時リアクションが重ならないよう調停する。

**Tech Stack:** Vanilla JavaScript / UMD, Web Animations API, HTML, Node built-in test runner, existing VM runtime harness, Vite.

**Spec:** `docs/superpowers/specs/2026-09-15-emotional-state-layer-design.md`

## Global Constraints

- 基準mainは `e789e61e60973da631d6f26a5bc1e1ee385d955c`。作業ブランチは `design/emotional-state-layer-20260915` を起点にし、実装時は専用feature branch/worktreeへ分ける。
- 第1段階はメインキャラのみ。恋人・仲間の社会リアクション、求愛しぐさ、仲間性格係数、表情PNG量産、AI会話連動は追加しない。
- 感情状態はlocalStorageへ保存しない。既存のゲーム数値・死亡条件・回復量・恋愛条件・セーブ形式を変更しない。
- `care-status.js` が状態閾値の正本。`emotion-state.js` や `script.js` に同じ数値境界を複製しない。
- 既存の「!」、care alert、critical表示、病気の汗を残す。感情表現はそれらを置き換えず補完する。
- persistent state は低頻度。temporary reaction が常に優先し、同時に二つの演技を走らせない。
- いのち低下・強い疲労は悪化するほど動作量を増やさない。critical life はメインをほぼ静止させる。
- reduced-motionでは新しい動きを発火させない。既存の静的care UIで情報を失わない。
- 26体の仲間がいる時もpersistent cueはメインと装備だけ。`castResponse`全体や仲間群を持ち上げない。
- iPhone実機の最終合否はユーザー確認前に「確認済み」としない。自動テストは動作競合・優先順位・保存非依存を保証し、感情の伝わりやすさは実機QAで判定する。

---

### Task 1: care-statusへ表示用の正規化シグナルを追加する

**Files:**
- Modify: `care-status.js`
- Modify: `tests/care-status-test.cjs`

**Interfaces:**
- Existing: `assess(state, options)`, `snapshot(state)`, `changes(before, after)` の挙動は維持。
- Produce: `signals(state, options) -> CareSignals`
- `CareSignals` shape:

```js
{
  playable: boolean,
  life: 'none' | 'warning' | 'critical',
  health: 'none' | 'strong',
  sick: boolean,
  hunger: 'none' | 'mild' | 'strong',
  energy: 'none' | 'mild' | 'strong',
  happiness: 'none' | 'mild' | 'strong',
  sleeping: boolean,
  petAvailable: boolean,
}
```

Canonical display bands:
- life critical: 現行と同じ `dying || deathMeter >= 80 || health <= 0 || (health < 20 && lowHealthStreak > 0)`、immortal時は無効。
- life warning: 現行と同じ `deathMeter >= 60`、critical未満、immortal時は無効。
- health strong: `health <= 25`。
- hunger strong: `<=25`、mild: `>25 && <=50`。
- energy strong: awakeで`<=25`、mild: awakeで`>25 && <=50`。
- happiness strong: `<=25`、mild: `>25 && <=50`。
- egg/dead/farewellは `playable:false`。数値は読んでもUIモーション対象にしない。
- `petAvailable` は `options.petAvailable` が指定されればそれ、未指定ならtrue。

- [ ] **Step 1: `signals()` の失敗テストを追加する。** 既存のwindow API期待値を `['assess','changes','signals','snapshot']` に更新し、境界値と非破壊性を具体的にテストする。

```js
test('signals exposes canonical mild/strong display bands without changing assess', () => {
  assert.equal(careStatus.signals(growing({hunger:50})).hunger, 'mild');
  assert.equal(careStatus.signals(growing({hunger:25})).hunger, 'strong');
  assert.equal(careStatus.signals(growing({hunger:50.1})).hunger, 'none');
  assert.equal(careStatus.signals(growing({energy:50})).energy, 'mild');
  assert.equal(careStatus.signals(growing({energy:25})).energy, 'strong');
  assert.equal(careStatus.signals(growing({happiness:50})).happiness, 'mild');
  assert.equal(careStatus.signals(growing({happiness:25})).happiness, 'strong');
  assert.equal(careStatus.assess(growing({hunger:50})), null, 'mild display must not create a new warning notice');
});

test('signals keeps life and stage semantics identical to current care rules', () => {
  assert.equal(careStatus.signals(growing({deathMeter:60})).life, 'warning');
  assert.equal(careStatus.signals(growing({deathMeter:80})).life, 'critical');
  assert.equal(careStatus.signals(growing({deathMeter:90,infinite:true})).life, 'none');
  assert.equal(careStatus.signals(growing({stage:'egg',deathMeter:90})).playable, false);
});
```

- [ ] **Step 2: REDを確認する。** Run: `node --test tests/care-status-test.cjs`. Expected: `signals is not a function` またはwindow API差分でFAIL。

- [ ] **Step 3: `signals()` を最小実装する。** `numeric()` と現行life判定を再利用し、`assess()` のnotice生成・文言・優先順位は変更しない。lifeリスク計算が二箇所で別式にならないよう小さな内部 helper に抽出して両方から使う。

```js
function band(value, strongMax, mildMax) {
  if (value <= strongMax) return 'strong';
  if (value <= mildMax) return 'mild';
  return 'none';
}

function signals(input, options) {
  const state = input || {};
  const stage = String(state.stage || '').toLowerCase();
  const playable = !['egg','dead','farewell'].includes(stage);
  const config = options || {};
  const immortal = Object.prototype.hasOwnProperty.call(config, 'immortal')
    ? Boolean(config.immortal) : Boolean(state.infinite);
  const petAvailable = Object.prototype.hasOwnProperty.call(config, 'petAvailable')
    ? Boolean(config.petAvailable) : true;
  const health = numeric(state, 'health', 100);
  const risk = lifeRiskOf(state, health);
  return {
    playable,
    life: !playable || immortal ? 'none' : risk.critical ? 'critical' : risk.warning ? 'warning' : 'none',
    health: playable && health <= 25 ? 'strong' : 'none',
    sick: playable && Boolean(state.isSick),
    hunger: playable ? band(numeric(state,'hunger',100),25,50) : 'none',
    energy: playable && !state.isSleeping ? band(numeric(state,'energy',100),25,50) : 'none',
    happiness: playable ? band(numeric(state,'happiness',100),25,50) : 'none',
    sleeping: playable && Boolean(state.isSleeping),
    petAvailable,
  };
}
```

- [ ] **Step 4: GREENと既存care回帰を確認する。** Run: `node --test tests/care-status-test.cjs tests/care-status-integration-test.cjs`. Expected: PASS、既存notice文言・death traceに差分なし。

- [ ] **Step 5: Commit.** `git add care-status.js tests/care-status-test.cjs && git commit -m "feat: expose canonical care emotion signals"`

---

### Task 2: 純粋なemotion resolverを追加する

**Files:**
- Create: `emotion-state.js`
- Create: `tests/emotion-state-test.cjs`
- Modify: `index.html`
- Modify: `tests/helpers/runtime-harness.cjs`
- Modify: `package.json`

**Interfaces:**
- Consume: Task 1 `CareSignals` only。生の `hunger` 等を resolver へ渡さない。
- Produce: UMD/CommonJS `window.NaotocchiEmotionState` / `require('../emotion-state.js')` with `resolve(signals)`.
- `resolve()` return:

```js
{
  state: 'normal' | 'hungry' | 'unhappy' | 'tired' | 'sick' | 'weak' | 'wantsPlay',
  severity: 'none' | 'mild' | 'strong' | 'critical',
  motion: null | 'hungry' | 'sulk' | 'doze' | 'shake' | 'droop' | 'curious',
  cueMinMs: number,
  cueMaxMs: number,
  gentle: boolean,
  suppressPetIdle: boolean,
}
```

Exact priority and profiles:

```js
const NORMAL = {state:'normal',severity:'none',motion:null,cueMinMs:0,cueMaxMs:0,gentle:true,suppressPetIdle:false};

// priority: life > sick > health > energy > hunger > happiness > wantsPlay > normal
life critical -> weak/critical, motion:null, suppressPetIdle:true
life warning  -> weak/mild,     motion:'droop', 9000..14000, gentle:true
sick          -> sick/strong,   motion:'shake', 5000..8000,  gentle:true
health strong -> weak/strong,   motion:'droop', 8000..12000, gentle:true
energy strong -> tired/strong,  motion:'doze',  6000..9000,  gentle:true
energy mild   -> tired/mild,    motion:'doze',  8000..12000, gentle:true
hunger strong -> hungry/strong, motion:'hungry',4500..7500,  gentle:false
hunger mild   -> hungry/mild,   motion:'hungry',7000..11000, gentle:true
happiness strong -> unhappy/strong, motion:'sulk',6000..9000,gentle:true
happiness mild && petAvailable -> wantsPlay/mild, motion:'curious',6000..10000,gentle:true
happiness mild && !petAvailable -> unhappy/mild, motion:'sulk',8000..12000,gentle:true
```

- [ ] **Step 1: resolverのREDテストを書く。** 優先順位、境界後のカテゴリ、normal、non-playable、入力非変更を表形式で確認する。

```js
test('resolve follows the approved visible priority', () => {
  const base={playable:true,life:'none',health:'none',sick:false,hunger:'none',energy:'none',happiness:'none',sleeping:false,petAvailable:true};
  assert.equal(resolve({...base,hunger:'strong'}).state,'hungry');
  assert.equal(resolve({...base,hunger:'strong',energy:'mild'}).state,'tired');
  assert.equal(resolve({...base,health:'strong',sick:true}).state,'sick');
  assert.equal(resolve({...base,life:'critical',sick:true}).state,'weak');
  assert.equal(resolve({...base,happiness:'mild',petAvailable:true}).state,'wantsPlay');
  assert.equal(resolve({...base,happiness:'mild',petAvailable:false}).state,'unhappy');
});
```

- [ ] **Step 2: REDを確認する。** Run: `node --test tests/emotion-state-test.cjs`. Expected: module missing / `resolve` missingでFAIL。

- [ ] **Step 3: `emotion-state.js` を実装する。** DOM・timer・Date・localStorageを参照しない。プロフィール定数をfreezeし、毎回返すobjectはコピーして呼び出し側の変更が定数を汚さないようにする。`playable:false` と `sleeping:true` は `normal` を返し、睡眠そのものの見た目は既存sleep/doze処理へ任せる。

- [ ] **Step 4: production/test loaderへ接続する。** `index.html` で `care-status.js` の直後、`script.js` より前に `emotion-state.js?v=...` を追加。runtime harness sandboxへ `NaotocchiEmotionState: require('../../emotion-state.js')` を追加。`package.json` のnode test列へ `tests/emotion-state-test.cjs` を追加。

- [ ] **Step 5: GREEN。** Run: `node --test tests/emotion-state-test.cjs tests/care-status-test.cjs`. Expected: PASS。

- [ ] **Step 6: Commit.** `git add emotion-state.js tests/emotion-state-test.cjs index.html tests/helpers/runtime-harness.cjs package.json && git commit -m "feat: add pure pet emotion resolver"`

---

### Task 3: cast-motionへメイン専用persistent cue APIを追加する

**Files:**
- Modify: `cast-motion.js`
- Modify: `tests/cast-motion-test.cjs`

**Interfaces:**
- Keep existing `speak`, `emote`, `idle`, `clear`, `clearSpeaker` behavior for current callers.
- Produce controller methods:
  - `pet(mood, options = {}) -> number` : pet + accessoryだけを再生し、実際の予定時間msを返す。再生不可なら0。
  - `isActive(speaker = {kind:'pet'}) -> boolean`
  - `idle({excludePet = false} = {})` : `excludePet:true` の時はpet/accessoryをidle候補から除外。
- Add only two reusable motion names: `hungry`, `sulk`。

- [ ] **Step 1: 新モーションとpet-only APIのREDテストを書く。** `motionFrames` の1px/3px envelope一覧にも `hungry`,`sulk` を追加する。pet-only cueがgroup/partner/companionsを動かさず、装備はpetと同じframesになることを確認する。

```js
test('persistent pet cue moves only pet and accessory', () => {
  const h=harness(); cast(h);
  const beforeGroup=h.get('castResponse').animations.length;
  const beforePartner=h.get('partnerCompanion').querySelector('.partner-emoji').animations.length;
  const ms=h.api.petMotion('hungry',{gentle:true});
  assert.ok(ms>0);
  assert.equal(h.get('petSprite').dataset.reaction,'hungry');
  assert.deepEqual(h.get('petAccessory').animations.at(-1)?.frames,h.get('petSprite').animations.at(-1)?.frames);
  assert.equal(h.get('castResponse').animations.length,beforeGroup);
  assert.equal(h.get('partnerCompanion').querySelector('.partner-emoji').animations.length,beforePartner);
});
```

Test-only `petMotion` exposureはTask 4でruntime harnessからcontrollerを経由して追加してもよいが、production globalは増やさない。controller単体テストでも同じobservableを確認する。

- [ ] **Step 2: RED。** Run: `node --test tests/cast-motion-test.cjs`. Expected: `hungry/sulk` fallbackまたは`pet is not a function`でFAIL。

- [ ] **Step 3: 2モーションだけ追加する。** 既存のbounded transform方式を使い、新しいanimation基盤やCSS keyframesを作らない。

```js
hungry: [REST,[0,.9,-.6,.55],[.35,.7,.45,.7],[-.25,.9,-.35,.45],REST],
sulk:   [REST,[.4,.7,1.1,.35],[.6,.9,1.4,.45],[.3,.6,.8,.25],REST],
```

`DURATION` は `hungry:1250`, `sulk:1500`。既存 `motionFrames()` のbudget計算を通すため、crowded 1pxでも自動的に縮む。

- [ ] **Step 4: controller APIを実装する。** `play()` が `motion.duration + delay` を返すようにし、`pet()` は `play(find({kind:'pet'}),...)` のみを呼ぶ。`emote()` は従来どおりgroup responseを含めるので意味を変えない。

```js
function pet(mood, options={}) {
  if (!allowed()) return 0;
  return play(find({kind:'pet'}), mood, options) || 0;
}
function isActive(speaker={kind:'pet'}) {
  const actor=find(speaker);
  return !!actor && active.has(actor.node);
}
function idle({excludePet=false}={}) {
  if (!allowed() || active.size || speaking) return 0;
  const actors=getActors().filter(a=>a.kind!=='accessory' && !(excludePet && a.kind==='pet'));
  if (!actors.length) return 0;
  const actor=actors[idleTurn++ % actors.length];
  return play(actor,idleTurn%2?'curious':'nod',{gentle:true}) || 0;
}
```

- [ ] **Step 5: GREENと既存会話モーション回帰。** Run: `node --test tests/cast-motion-test.cjs`. Expected: 既存court/play/group liftテストを含め全PASS。

- [ ] **Step 6: Commit.** `git add cast-motion.js tests/cast-motion-test.cjs && git commit -m "feat: add pet-only emotion motion cues"`

---

### Task 4: persistent emotional stateをホームへ接続する

**Files:**
- Modify: `script.js`
- Modify: `tests/helpers/runtime-harness.cjs`
- Create: `tests/emotion-integration-test.cjs`
- Modify: `package.json`

**Interfaces:**
- Consume: `CARE_STATUS.signals(...)`, `window.NaotocchiEmotionState.resolve(...)`, `castMotion.pet()`, `castMotion.isActive()`, `castMotion.idle({excludePet})`.
- Produce internal transient functions only:
  - `deriveHomeEmotion()`
  - `syncHomeEmotion()`
  - `scheduleEmotionCue(delayMs)`
  - `cancelEmotionCue()`
  - `canShowEmotionCue()`
- Test-only lifecycle exposure: `homeEmotion: () => homeEmotion`。production window APIは追加しない。

- [ ] **Step 1: runtime integrationのREDテストを書く。** 実stateを変更して `render()` し、resolver状態・pet dataset・低頻度cueの対象を確認する。

```js
test('home derives emotion without persisting it', () => {
  const h=harness();
  Object.assign(h.api.state(),{hunger:40,happiness:80,energy:80,health:80,isSick:false,deathMeter:0});
  h.api.render();
  assert.equal(h.api.homeEmotion().state,'hungry');
  assert.equal(h.get('petSprite').dataset.emotionState,'hungry');
  assert.equal(Object.hasOwn(h.api.state(),'emotion'),false);
  const saved=JSON.parse(h.storageValue('naotocchi-save-v1') || JSON.stringify(h.api.state()));
  assert.equal(Object.hasOwn(saved,'emotion'),false);
});
```

加えて以下を実データでテストする。
- `deathMeter:80` => weak/criticalでpersistent animationを発火しない。
- `isSick:true` + hunger low => sickが優先。
- energy mild + hunger strong => tiredが優先。
- happiness 40 + petAvailable => wantsPlay。
- happiness 40 + affection spamでpetAvailable false => unhappy。
- egg/farewell/dead/sleeping/menu/minigame/hidden tab中はcueなし。
- stateがnormalへ戻ったらtimerが再び旧状態を発火させない。

- [ ] **Step 2: RED。** Run: `node --test tests/emotion-integration-test.cjs`. Expected: `homeEmotion` / emotion datasetなしでFAIL。

- [ ] **Step 3: resolver接続を追加する。** `script.js` 冒頭へ `const EMOTION_STATE = window.NaotocchiEmotionState || null;`。保存対象外のmodule localだけを持つ。

```js
let homeEmotion = {state:'normal',severity:'none',motion:null,cueMinMs:0,cueMaxMs:0,gentle:true,suppressPetIdle:false};
let emotionCueTimer = null;
let emotionCueKey = '';

function deriveHomeEmotion() {
  if (!CARE_STATUS?.signals || !EMOTION_STATE?.resolve) return homeEmotion;
  return EMOTION_STATE.resolve(CARE_STATUS.signals(state, {
    immortal:isImmortal(),
    petAvailable:state.affectionStreak < affectionSpamThreshold(),
  }));
}
```

- [ ] **Step 4: `syncHomeEmotion()` をrenderから呼ぶ。** pet spriteへ `data-emotion-state` と `data-emotion-severity` を表示情報として付けるが、saveへコピーしない。profile keyが変わった時だけ既存timerを破棄し、新しい非normal状態は最初のcueを `350ms` 後に予約する。normal/critical motion nullならtimerなし。

- [ ] **Step 5: cue schedulerを実装する。** `canShowEmotionCue()` は最低限、home visible、growing、awake、tab visible、not game、not transform、not menu、not story/life card、not conversation/speech、`Date.now() >= petBusyUntil`、`!castMotion.isActive({kind:'pet'})` を要求する。blocked時は1000ms後に再確認し、許可時だけ `castMotion.pet(homeEmotion.motion,{gentle:homeEmotion.gentle})`。再生後は同じprofileの `[cueMinMs,cueMaxMs]` から次回を乱数で予約する。

```js
const randomCueDelay = profile => profile.cueMinMs + Math.random() * (profile.cueMaxMs-profile.cueMinMs);
function scheduleEmotionCue(delayMs) {
  cancelEmotionCue();
  if (!homeEmotion.motion) return;
  const key=emotionCueKey;
  emotionCueTimer=setTimeout(() => {
    emotionCueTimer=null;
    if (key!==emotionCueKey || !homeEmotion.motion) return;
    if (!canShowEmotionCue()) { scheduleEmotionCue(1000); return; }
    const duration=castMotion?.pet(homeEmotion.motion,{gentle:homeEmotion.gentle}) || 0;
    if (duration) petBusyUntil=Math.max(petBusyUntil,Date.now()+duration);
    scheduleEmotionCue(randomCueDelay(homeEmotion));
  },Math.max(1,delayMs));
}
```

- [ ] **Step 6: 通常idleと競合させない。** `scheduleIdlePerk()` はnon-normalまたは `suppressPetIdle` 時にメインを候補から外し、可能なら仲間だけの既存idleを続ける。病気・dyingで既存条件が全idleを止めている場合はそのまま維持し、Phase 1で仲間に心配リアクションを追加しない。

- [ ] **Step 7: GREEN。** Run: `node --test tests/emotion-state-test.cjs tests/emotion-integration-test.cjs tests/cast-motion-test.cjs tests/care-status-integration-test.cjs`. Expected: PASS。

- [ ] **Step 8: Commit.** `git add script.js tests/helpers/runtime-harness.cjs tests/emotion-integration-test.cjs package.json && git commit -m "feat: show persistent pet emotional state"`

---

### Task 5: 世話直後のtemporary reactionを意味どおりに固定する

**Files:**
- Modify: `script.js`
- Modify: `tests/emotion-integration-test.cjs`
- Modify only if regression requires: `tests/cast-motion-test.cjs`

**Interfaces:**
- Existing semantic `speakEvent()` reaction mapping is authoritative for immediate care animation:
  - feed -> `munch`
  - play_with -> `wiggle` or existing bounce depending text
  - play_with_annoyed -> `settle`
  - medicine_cure -> cure-specific reaction
  - medicine_wrong -> `shake`
  - sleep -> `doze`
  - wake -> `stretch`
- Persistent scheduler must wait while speech/reaction is active, then use freshly derived state.

- [ ] **Step 1: actual care button RED testsを追加する。** `speakEvent()` 単体ではなく本物のbutton handlerをdispatchして、後続のgeneric `emotePet()` が意味のあるreactionを上書きしないことを確認する。

```js
test('real feed keeps munch as the immediate reaction', () => {
  const h=harness(); Object.assign(h.api.state(),{hunger:60,happiness:80,energy:80}); h.api.render();
  h.dispatch(h.get('feedBtn'),'click'); h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'munch');
});

test('real wake keeps stretch instead of a generic happy bounce', () => {
  const h=harness(); const s=h.api.state();
  Object.assign(s,{isSleeping:true,sleptTicks:20,energy:80}); h.api.render();
  h.dispatch(h.get('sleepBtn'),'click'); h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'stretch');
});
```

追加で medicine wrong=`shake`、play_with_annoyed=`settle` を実handlerで確認する。

- [ ] **Step 2: 状態再評価のREDテストを書く。** hunger 30からfeed(+25)でmild hungerを抜けてnormalへ、hunger 10からfeedで35になった場合は一時`munch`の後にpersistent hungryへ戻ることを確認する。一時reactionのduration中にhungry cueが割り込まないことも確認する。

- [ ] **Step 3: RED。** Run: `node --test tests/emotion-integration-test.cjs tests/cast-motion-test.cjs`. Expected: 現状の末尾`emotePet('happy'/'angry')`により少なくともfeed/wake等がgeneric reactionへ上書きされFAIL。

- [ ] **Step 4: 重複するgeneric emoteだけを除去する。** 以下のhandlerで、すでに `speakEvent()` がsemantic motionを開始している直後の `emotePet(...)` を削除する。
  - feed
  - medicine cure / medicine wrong
  - wake
  - play_with / play_with_annoyed

sleepはすでに `speakEvent('sleep')` がdozeを担当する。`emotePet()` 関数自体や、他イベントでの利用は削除しない。`checkMeters()` が別の成長/死亡演出を選んだ場合は、その既存演出を優先して新しいcare animationを無理に追加しない。

- [ ] **Step 5: temporary reaction優先を確認する。** `withFeedback()` 後の `render()` で `homeEmotion` は最新値へ更新されても、`canShowEmotionCue()` が `speechActive` / `conversationIsBusy()` / `castMotion.isActive()` を見ているためpersistent motionは待機する。reaction終了後に古いbefore stateではなく現在stateからcueが出ることをテストする。

- [ ] **Step 6: GREEN。** Run: `node --test tests/emotion-integration-test.cjs tests/cast-motion-test.cjs tests/care-status-integration-test.cjs`. Expected: care eventごとの正しいreactionと再評価がPASS。

- [ ] **Step 7: Commit.** `git add script.js tests/emotion-integration-test.cjs tests/cast-motion-test.cjs && git commit -m "fix: preserve semantic care reactions"`

---

### Task 6: reduced-motion・26体・キャッシュ・全回帰と実機QA handoff

**Files:**
- Modify: `tests/emotion-integration-test.cjs`
- Modify: `package.json` only if test registration is incomplete
- Modify: `index.html` via `npm run bump`
- Create: `docs/qa/emotional-state-phase1-20260915.md`

**Interfaces:** No new production API. This task proves Phase 1 behavior and records what remains for user iPhone QA.

- [ ] **Step 1: safety RED/GREEN testsを完成させる。** 以下をliteral outcomeで確認する。
  - reducedMotion=trueではpersistent `petSprite.animations` が増えないが、既存care warning/`!` は残る。
  - motion preferenceを途中でreduceへ切り替えると現在のpersistent cueが停止する。
  - 26 companion fixtureでpersistent hungry/sulk cueを出しても `castResponse` とcompanion nodesのanimationsが増えない。
  - menu/story/minigame/hidden tabでtimerが勝手に動きを発火しない。home復帰後は現状態から再開。
  - `JSON.stringify(state)` 前後で感情専用fieldが増えない。
  - critical lifeでは通常pet idleもpersistent cueも出ず、既存critical UIは表示される。

- [ ] **Step 2: focused suiteを実行する。** Run:

```bash
node --test tests/care-status-test.cjs tests/emotion-state-test.cjs tests/cast-motion-test.cjs tests/emotion-integration-test.cjs tests/care-status-integration-test.cjs
```

Expected: all PASS。

- [ ] **Step 3: cache tokenを更新する。** `npm run bump`。`emotion-state.js` のscript tagを含め、変更したJSの `?v=YYYYMMDD-<hash>` が実内容に一致することを確認する。bump toolは存在するfileのSHA-1先頭8桁を使うため手書きtokenを残さない。

- [ ] **Step 4: full regressionを実行する。** Run: `npm test`. Expected: PASS。失敗時は既存flakyとして決めつけず、今回触った `script.js`, `cast-motion.js`, loader/harnessとの因果を先に切り分ける。

- [ ] **Step 5: QA文書を作る。** `docs/qa/emotional-state-phase1-20260915.md` に自動確認結果と、ユーザーのiPhone確認用チェックを固定する。

```markdown
## iPhone実機チェック（未確認のままPRへ載せる）
- 通常: 何も困っていない時に動きがうるさくない
- 空腹 mild / strong: 数秒以内の仕草で空腹らしさの強弱が分かる
- げんき低下: dozeが空腹と見分けられる
- 病気: 汗 + 弱いshakeで病気と分かる
- いのちwarning / critical: warningは弱り、criticalはむしろ静かになる
- ごきげん mild: じゃれられる時は「かまって」感、連打後はsulkで距離を取りたそうに見える
- ごはん: munchが見え、直後にbounceへ上書きされない
- じゃれる: 楽しい/うんざりの結果が違って見える
- 薬: 治癒と間違い投薬の反応が混同しない
- 睡眠: doze / wake stretchが自然
- 26体: メインの状態だけで全員が一斉に跳ねない
```

結果欄は `未確認 / OK / 要調整` の三値にし、自動テストでOKへ書き換えない。

- [ ] **Step 6: final diff review.** 基準main `e789e61e...` と比較し、Phase 2項目、画像追加、恋愛条件、save schema、gameplay数値が混入していないことを確認する。`git diff --check` も実行する。

- [ ] **Step 7: Commit.** `git add index.html package.json tests/emotion-integration-test.cjs docs/qa/emotional-state-phase1-20260915.md && git commit -m "test: verify emotional state phase one"`

- [ ] **Step 8: Draft PR handoff.** 実装専用branchからmainへのDraft PRを作る。本文にspec、plan、focused/full test結果、iPhone QA未確認を記載する。ユーザーの実機確認前にはReady化・mergeしない。

## Completion Gate

Phase 1は次の全条件を満たした時だけ「実装完了」とする。

1. `signals()` と `resolve()` の単体テストが境界・優先順位を固定している。
2. persistent cueはメイン+装備だけ、低頻度で、temporary reactionへ割り込まない。
3. feed/play/medicine/sleep/wakeの実handlerが意味に合うreactionを残す。
4. life criticalほど静かになり、強い疲労も動きが増えない。
5. reduced-motion、overlay、hidden tab、26 companionsで安全に停止/再開する。
6. 感情専用save fieldを追加していない。
7. `npm test` が通る。
8. Draft PR上でiPhone実機QAは明示的に未確認のまま残し、ユーザーが確認後にのみPhase 2や表情差分の要否を判断する。
