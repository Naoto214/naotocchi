# Normal Equipment V2 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR #274で通常装具を最終10種へ統一し、旧5装具の一度きり返金移行、ゲームパス、スターバッジ3倍、ショップ表示、実績条件までV2仕様へ完成させる。

**Architecture:** `item-system.js` を通常装具カタログの正本、`script.js` を保存移行・装備効果・ミニゲーム結果・UI統合の実装点として使う。既存IDを維持する9種は所有を保ち、新規 `gamepass1` だけ追加する。ゲームパスは通常成功結果を再利用するが実プレイ由来の記録・勧誘・日次・スコア系副作用を通さない専用経路に分ける。旧5装具の返金は保存状態に一度きりの移行済み印を残して冪等化する。

**Tech Stack:** Vanilla JavaScript / CSS / Node.js `node:test` / existing runtime harness / GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-16-normal-equipment-v2-completion-design.md`

## Global Constraints

- PR #274はDraftのまま維持し、mainへマージしない。
- 最終通常装具は10種で打ち止め。
- 価格は `1000 / 3000 / 3000 / 3000 / 3000 / 3000 / 5000 / 5000 / 8000 / 10000`。
- `bowtie`→おべんとうばこ、`ribbon`→おもちゃばこ、`scarf`→きゅうきゅうばこは既存所有を維持する。
- 継続ID: `poop1`, `sleepboost1`, `bowtie`, `ribbon`, `scarf`, `travel1`, `partner1`, `bond1`, `star`。
- 新規ID: `gamepass1`。
- 廃止・返金: `flower` 120、`energy1` 360、`hat` 540、`crown` 900、`glasses` 360。
- `glasses` をゲームパスへ変換しない。
- 廃止装具が装備中なら移行時に外す。
- 返金は保存ごとに一度だけ。再読込・次人生・無限復帰で二重返金しない。
- ゲームパスは通常成功固定。通常成功と同じげんき消費、せいちょう、ごきげん、へんしんメーター進行を与える。
- ゲームパスは実プレイ回数、自己ベスト、高得点実績、今日のチャレンジ、なかま勧誘、人生記録・年表、点数依存処理、大成功、レア報酬を発生させない。
- ゲームパス使用後は5秒だけ「あそぶ」を再使用不可。
- スターバッジは通常ミニゲームのコインだけ3倍。通常成功30→90、大成功60→180、失敗0。
- スターバッジはQuick、ゲームパス、ラッキーコイン、うそつきしょうぶ、日次等には掛けない。
- 確定PNG4枚は再生成・再加工しない。

---

### Task 1: 最終10種カタログ契約をテストで固定する

**Files:**
- Modify: `tests/ui-illustrations-test.cjs`
- Modify: `tests/item-inventory-test.cjs`
- Modify: `tests/scoring-shop-test.cjs`
- Reference: `item-system.js`
- Reference: `script.js`

**Interfaces:**
- Consumes: `NaotocchiItems.CATALOG`, `SHOP_ITEMS`, `buyOrEquipShopItem()`
- Produces: 最終10種・価格・表示文・画像の回帰契約

- [ ] **Step 1: 10種だけを期待する失敗テストを書く**

`SHOP_ITEMS` のID順を次で固定する。

```js
const ids = ['poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','gamepass1','star'];
```

ショップに旧 `flower/energy1/hat/crown/glasses` が出ないことを確認する。

- [ ] **Step 2: 最終価格を固定するテストを書く**

```js
const prices = {
  poop1:1000, sleepboost1:3000, bowtie:3000, ribbon:3000, scarf:3000,
  travel1:3000, partner1:5000, bond1:5000, gamepass1:8000, star:10000,
};
```

`item-system.js` の `CATALOG[id].price` とショップ表示の両方を検証する。

- [ ] **Step 3: 最終表示文を固定するテストを書く**

```js
const desc = {
  poop1:'うんちが3個たまると、自動できれいにする。',
  sleepboost1:'ねると、すぐに元気が満タンになる。',
  bowtie:'おなかがへると、自動で満タンにする。',
  ribbon:'ごきげんが下がると、自動で満タンにする。',
  scarf:'病気になると、自動で治してくれる。',
  travel1:'たびで、おなかと元気が減らなくなる。',
  partner1:'こいびとの仲良し度が下がると、自動で満タンにする。',
  bond1:'なかまの仲良し度が下がると、自動で満タンにする。',
  gamepass1:'ミニゲームを遊ばず、通常成功にできる。',
  star:'通常ミニゲームでもらえるコインが3倍になる。',
};
```

- [ ] **Step 4: focused testを実行してREDを確認する**

```bash
node --test tests/ui-illustrations-test.cjs tests/item-inventory-test.cjs tests/scoring-shop-test.cjs
```

Expected: 旧14種・旧価格・ゲームパス未販売のためFAIL。

- [ ] **Step 5: テストだけをコミットする**

```bash
git add tests/ui-illustrations-test.cjs tests/item-inventory-test.cjs tests/scoring-shop-test.cjs
git commit -m "test: define final normal equipment catalog"
```

---

### Task 2: カタログとショップを最終10種へ切り替える

**Files:**
- Modify: `item-system.js`
- Modify: `script.js`
- Test: `tests/ui-illustrations-test.cjs`
- Test: `tests/item-inventory-test.cjs`
- Test: `tests/scoring-shop-test.cjs`

**Interfaces:**
- Consumes: Task 1のID・価格・表示文契約
- Produces: `CATALOG` と `SHOP_ITEMS` の最終10種

- [ ] **Step 1: `item-system.js` の通常装具を10種へ整理する**

保持するIDは9種、新規で次を追加する。

```js
"gamepass1": {
  "label": "ゲームパス",
  "price": 8000,
  "kind": "equipment",
  "desc": "ミニゲームを遊ばず、通常成功にできる。",
  "guard": "実プレイ条件・点数条件・勧誘・日次・記録には数えず、通常成功固定。使用後5秒だけ再使用待ち。"
}
```

`star` は価格10000、説明を3倍へ変更する。その他9種も正本価格へ揃える。

- [ ] **Step 2: `script.js::SHOP_ITEMS` を10種へ変更する**

旧5種を削除し、`gamepass1` を追加する。`gamepass1` の画像は既存 `NORMAL_EQUIPMENT_PICTURES.gamepass1` を使う。

- [ ] **Step 3: 旧IDの表示用マッピングは移行互換に必要なものだけ残す**

`glasses` の旧サングラス画像は保存移行前の旧データ表示以外に流用しない。`game-pass.png` と結びつけない。

- [ ] **Step 4: focused testをGREENにする**

```bash
node --test tests/ui-illustrations-test.cjs tests/item-inventory-test.cjs tests/scoring-shop-test.cjs
```

- [ ] **Step 5: コミットする**

```bash
git add item-system.js script.js tests/ui-illustrations-test.cjs tests/item-inventory-test.cjs tests/scoring-shop-test.cjs
git commit -m "feat: finalize normal equipment catalog"
```

---

### Task 3: 旧5装具の一度きり返金移行を実装する

**Files:**
- Modify: `script.js`
- Modify: `tests/migration-test.cjs`
- Modify: `tests/item-inventory-test.cjs`

**Interfaces:**
- Consumes: `state.lifetime.ownedShopItems`, `state.lifetime.equippedItemId`, `state.lifetime.money`, `normalizeStateShape()`
- Produces: 冪等なV2装具移行

- [ ] **Step 1: 返金表の失敗テストを書く**

```js
const refunds = {flower:120, energy1:360, hat:540, crown:900, glasses:360};
```

5種すべて所有の旧セーブをロードし、合計2280コイン加算、所有から5種削除、装備中旧IDは `null` になることを確認する。

- [ ] **Step 2: 継続9種の所有維持テストを書く**

`bowtie/ribbon/scarf` を含む9種が同じIDのまま残り、値上げ差額を引かれないことを確認する。

- [ ] **Step 3: 二重返金防止テストを書く**

同じ状態をsave/load、`normalizeStateShape()` 再実行、次人生初期化、`infiniteReturn` 正規化の各経路で通しても追加返金されないことを確認する。

- [ ] **Step 4: 移行済み印を保存状態へ追加する**

`state.lifetime.itemMigrations.normalEquipmentV2 = true` の形を使う。`itemMigrations` が無い旧セーブでは正規化時に空objectを作る。

- [ ] **Step 5: 移行関数を追加する**

`normalizeStateShape()` の後、通常プレイ開始前に一度呼ぶ関数を作る。

```js
function migrateNormalEquipmentV2(s) {
  const mark = s.lifetime.itemMigrations.normalEquipmentV2;
  if (mark) return 0;
  const refunds = {flower:120, energy1:360, hat:540, crown:900, glasses:360};
  let total = 0;
  s.lifetime.ownedShopItems = s.lifetime.ownedShopItems.filter(id => {
    if (!Object.hasOwn(refunds,id)) return true;
    total += refunds[id];
    return false;
  });
  if (Object.hasOwn(refunds, s.lifetime.equippedItemId)) s.lifetime.equippedItemId = null;
  s.lifetime.money += total;
  s.lifetime.itemMigrations.normalEquipmentV2 = true;
  return total;
}
```

実装時は既存の所有配列重複除去ルールに合わせ、同一旧IDを重複計上しない。

- [ ] **Step 6: focused testを実行する**

```bash
node --test tests/migration-test.cjs tests/item-inventory-test.cjs
```

Expected: PASS。

- [ ] **Step 7: コミットする**

```bash
git add script.js tests/migration-test.cjs tests/item-inventory-test.cjs
git commit -m "feat: migrate retired normal equipment"
```

---

### Task 4: 全装具所持・実績条件を10種へ揃える

**Files:**
- Modify: `script.js`
- Modify: `tests/item-collections-economy-test.cjs`
- Modify: `tests/post-integration-audit-test.cjs`

**Interfaces:**
- Consumes: 最終10種ID配列
- Produces: 廃止5種を要求しない全装具条件

- [ ] **Step 1: 10種だけで全装具条件を満たす失敗テストを書く**

`ownedShopItems` に最終10種を入れると達成、旧5種を持っていても不足分の代わりにならないことを確認する。

- [ ] **Step 2: 実績・コレクション側のID集合を最終10種へ変更する**

`SHOP_ITEMS.map(item=>item.id)` を正本にできる箇所はそれを使い、別の旧固定配列を残さない。

- [ ] **Step 3: focused testを実行する**

```bash
node --test tests/item-collections-economy-test.cjs tests/post-integration-audit-test.cjs
```

- [ ] **Step 4: コミットする**

```bash
git add script.js tests/item-collections-economy-test.cjs tests/post-integration-audit-test.cjs
git commit -m "fix: align equipment collection with final catalog"
```

---

### Task 5: 通常ミニゲーム報酬を30/60へ統一しスターバッジ3倍を実装する

**Files:**
- Modify: `script.js`
- Modify: `tests/item-care-game-test.cjs`
- Modify: `tests/economy-test.cjs`
- Modify: `tests/scoring-shop-test.cjs`

**Interfaces:**
- Consumes: `startMinigame()`, `finishMinigame()`, 開始時装具snapshot
- Produces: 通常成功30、大成功60、Star時90/180

- [ ] **Step 1: 通常成功・大成功・失敗のREDテストを書く**

装具なしで `finishMinigame()` の結果が0/30/60になる点を固定する。テストのスコア閾値は現行の通常成功・大成功判定をそのまま使う。

- [ ] **Step 2: Star snapshotのREDテストを書く**

開始時 `star`、終了前に装具を外しても90/180になること、開始時Star無しで途中装備しても倍率が乗らないことを確認する。

- [ ] **Step 3: Star対象外経路の回帰テストを書く**

Quick、ゲームパス専用経路、ラッキーコイン、うそつきしょうぶ、日次はStar倍率を使わないことを各既存テスト群で固定する。

- [ ] **Step 4: 通常ミニゲーム報酬計算を1箇所へ集約する**

```js
function ordinaryMinigameCoins(result, equipmentId) {
  const base = result === 'great' ? 60 : result === 'success' ? 30 : 0;
  return equipmentId === 'star' ? base * 3 : base;
}
```

既存の2/4コインや大成功のランダムコイン分岐をこの経路から除去する。

- [ ] **Step 5: focused testを実行する**

```bash
node --test tests/item-care-game-test.cjs tests/economy-test.cjs tests/scoring-shop-test.cjs
```

- [ ] **Step 6: コミットする**

```bash
git add script.js tests/item-care-game-test.cjs tests/economy-test.cjs tests/scoring-shop-test.cjs
git commit -m "feat: apply final ordinary game coin rewards"
```

---

### Task 6: ゲームパスの通常成功専用経路を実装する

**Files:**
- Modify: `script.js`
- Modify: `tests/item-care-game-test.cjs`
- Modify: `tests/minigame-lifecycle-test.cjs`
- Modify: `tests/quick-mode-test.cjs`
- Modify: `tests/item-relations-travel-test.cjs`

**Interfaces:**
- Consumes: `gamepass1` 装備、通常成功の育成結果関数、`transformMeter`, `energy`, `growth`, `happiness`
- Produces: 実プレイ副作用の無い通常成功固定処理、5秒再使用待ち

- [ ] **Step 1: 基本結果のREDテストを書く**

`gamepass1` 装備で「あそぶ」を選んだ際、実ゲーム `start()` を呼ばずに通常成功結果を適用する。期待値は通常成功と同じげんき消費、せいちょう、ごきげん、へんしんメーター進行、30コイン。

- [ ] **Step 2: 実プレイ副作用が無いREDテストを書く**

使用前後で以下が増えないことを確認する。

```js
state.actionCounts.play
state.lifetime.minigameRecords
state.minigameScoreSum
state.lifeLog
```

実装に別の実プレイカウンタがあれば同様に固定する。

- [ ] **Step 3: 日次・勧誘・点数条件が発生しないREDテストを書く**

`setPendingCompanion()` 済みでも加入しない。今日のチャレンジ対象ゲームでも達成しない。自己ベスト・高得点実績・Sランク・点数依存加入を更新しない。

- [ ] **Step 4: 常に通常成功固定のREDテストを書く**

環境・幸運系・旧大成功補助の状態を最大にしても大成功報酬60やレア報酬へ上がらず30コイン固定であることを確認する。

- [ ] **Step 5: 5秒待ちのREDテストを書く**

`TICK_MS=3000` に依存して曖昧にならないよう、ミリ秒時刻または既存readyAt機構のどちらか1つを使い、実時間5秒未満は「あそぶ」不可、5秒以上で再使用可をテストする。

- [ ] **Step 6: ゲームパス用関数を通常プレイ結果から分離して実装する**

専用関数名を `applyGamePassSuccess()` とする。

```js
function applyGamePassSuccess() {
  // 通常成功の育成結果だけを適用する。
  // minigameRecords / lifeLog / daily / recruitment / score achievements は呼ばない。
}
```

通常成功の共通部分が現状 `finishMinigameInner()` に密結合なら、先に `applyOrdinarySuccessRewards({recordPlay:false, score:null, source:'gamepass'})` のような小さな共通関数へ切り出し、実プレイ専用副作用を別ブロックに残す。

- [ ] **Step 7: `あそぶ` ボタン分岐へ接続する**

装備snapshotが `gamepass1` のときだけゲーム選択/ゲーム起動を飛ばし `applyGamePassSuccess()` を呼ぶ。Quick入口やうそつきしょうぶには適用しない。

- [ ] **Step 8: focused testを実行する**

```bash
node --test tests/item-care-game-test.cjs tests/minigame-lifecycle-test.cjs tests/quick-mode-test.cjs tests/item-relations-travel-test.cjs
```

- [ ] **Step 9: コミットする**

```bash
git add script.js tests/item-care-game-test.cjs tests/minigame-lifecycle-test.cjs tests/quick-mode-test.cjs tests/item-relations-travel-test.cjs
git commit -m "feat: add game pass normal-success shortcut"
```

---

### Task 7: 旧5装具の旧効果コードを削除する

**Files:**
- Modify: `script.js`
- Modify: `tests/item-care-game-test.cjs`
- Modify: `tests/items-v2-ease-automation-test.cjs`
- Modify: `tests/post-integration-audit-test.cjs`

**Interfaces:**
- Consumes: Task 3の移行で旧所有が消えること
- Produces: `flower/energy1/hat/crown/glasses` の効果参照が通常ゲームから消えた状態

- [ ] **Step 1: 旧効果が無いことを固定するテストを書く**

コード/実行契約として、求愛+10、げんき軽減、変身34、かんむり死亡緩和、サングラス+10が通常プレイで発火しないことを確認する。

- [ ] **Step 2: `isEquipped()` 参照とsnapshot分岐から旧5IDを削除する**

旧セーブ読込直後はTask 3移行で外れるため、通常プレイ経路に互換分岐を残さない。

- [ ] **Step 3: 旧専用状態を新規プレイで作らない**

`crownUsed` 等、別の現行システムが使っていない旧装具専用状態は新しい人生で依存しないようにする。保存互換のため古いfieldの読込自体は無害に残してよい。

- [ ] **Step 4: focused testを実行する**

```bash
node --test tests/item-care-game-test.cjs tests/items-v2-ease-automation-test.cjs tests/post-integration-audit-test.cjs
```

- [ ] **Step 5: コミットする**

```bash
git add script.js tests/item-care-game-test.cjs tests/items-v2-ease-automation-test.cjs tests/post-integration-audit-test.cjs
git commit -m "refactor: remove retired equipment effects"
```

---

### Task 8: ショップ表示・装備・画像・5秒待ちUIを仕上げる

**Files:**
- Modify: `script.js`
- Modify: `ui-illustrations.css` only if required by existing layout
- Modify: `tests/ui-illustrations-test.cjs`
- Modify: `tests/ui-integration-test.cjs`
- Modify: `tests/viewport-design-test.cjs`

**Interfaces:**
- Consumes: 最終10種、`gamepass1`画像、ゲームパスready状態
- Produces: iPhone幅でも崩れない最終ショップ/装備表示

- [ ] **Step 1: 10種ショップ表示のブラウザテストを追加する**

320px/390px相当で10商品が表示され、旧5商品が存在せず、ゲームパスPNGが表示されることを確認する。

- [ ] **Step 2: 5秒待ち中の「あそぶ」状態を表示する**

既存ボタンを無効化し、残り秒数表示は追加しない。5秒後に自動で通常状態へ戻す。YAGNIとして新しいゲージやカウントダウンUIは作らない。

- [ ] **Step 3: 装備は常に1枠だけを確認する**

ゲームパス装備後にStarを装備するとゲームパスが外れ、逆も同様。保存後reloadでも1IDだけ。

- [ ] **Step 4: focused testを実行する**

```bash
node --test tests/ui-illustrations-test.cjs tests/ui-integration-test.cjs tests/viewport-design-test.cjs
```

- [ ] **Step 5: コミットする**

```bash
git add script.js ui-illustrations.css tests/ui-illustrations-test.cjs tests/ui-integration-test.cjs tests/viewport-design-test.cjs
git commit -m "feat: finish normal equipment shop ui"
```

---

### Task 9: 全回帰とPR状態を検証する

**Files:**
- Verify only
- Update: `docs/superpowers/plans/2026-09-16-normal-equipment-v2-completion.md` with execution verification after all checks pass

**Interfaces:**
- Consumes: Tasks 1-8の完成状態
- Produces: merge前の検証証跡

- [ ] **Step 1: 通常装具周辺のfocused regressionを実行する**

```bash
node --test \
  tests/migration-test.cjs \
  tests/item-inventory-test.cjs \
  tests/item-care-game-test.cjs \
  tests/items-v2-care-automation-test.cjs \
  tests/items-v2-ease-automation-test.cjs \
  tests/item-relations-travel-test.cjs \
  tests/item-collections-economy-test.cjs \
  tests/economy-test.cjs \
  tests/scoring-shop-test.cjs \
  tests/minigame-lifecycle-test.cjs \
  tests/quick-mode-test.cjs \
  tests/ui-illustrations-test.cjs \
  tests/ui-integration-test.cjs \
  tests/viewport-design-test.cjs \
  tests/post-integration-audit-test.cjs
```

Expected: PASS。

- [ ] **Step 2: 全テストを実行する**

```bash
npm test
```

Expected: PASS。Quick `mole (Lv4)` の既知不安定失敗が再発した場合は、今回の変更由来かログで切り分ける。新規FAILは本変更内で解消する。

- [ ] **Step 3: ブラウザ実機相当確認をする**

確認項目:
- 10種だけ表示
- 価格・説明一致
- 3つの新箱画像とゲームパス画像が正しい
- 旧5種は表示されない
- 旧5種所有セーブは一度だけ返金
- ゲームパスは通常成功固定、5秒待ち、げんき消費あり
- ゲームパスで日次・勧誘・記録・自己ベストが増えない
- Starは30→90、60→180だけ
- QuickはStar/ゲームパスの影響を受けない

- [ ] **Step 4: PR #274がDraft・未マージであることを確認する**

- [ ] **Step 5: 差分を確認する**

```bash
git diff --check
git status --short
git log -8 --oneline
```

- [ ] **Step 6: 計画書末尾へ実行検証を追記してコミットする**

追記内容は実測値のみを書く: focused件数、`npm test`件数、CI結果、ブラウザ確認幅、最終HEAD、Draft/未マージ状態。

```bash
git add docs/superpowers/plans/2026-09-16-normal-equipment-v2-completion.md
git commit -m "docs: record normal equipment v2 verification"
```

## Acceptance Criteria

- 通常装具ショップは最終10種のみ。
- 最終価格・表示文が正本と一致。
- 継続9種の旧所有は維持される。
- 旧5種は一度だけ正しい金額で返金され、装備中なら外れる。
- `glasses` は `gamepass1` へ変換されない。
- ゲームパスは通常成功固定で、通常成功のげんき消費・せいちょう・ごきげん・へんしんメーターだけを得る。
- ゲームパスは実プレイ記録、日次、自己ベスト、高得点実績、勧誘、人生記録・年表、大成功、レア報酬を発生させない。
- ゲームパス使用後5秒だけ「あそぶ」再使用不可。
- Starは通常ミニゲームコインだけ3倍で30→90 / 60→180 / 失敗0。
- Quick・ゲームパス・別枠収入へStar倍率が掛からない。
- 全装具実績は最終10種だけを要求する。
- 旧5装具の通常プレイ効果コードが残らない。
- 確定PNG4枚は変更しない。
- focused tests、全テスト、CIが成功する。
- PR #274はDraft・未マージのまま。

## 追加承認: ラッキーコイン最終仕様への統一（2026-09-16）

ユーザーの追加指示により、今回の対象へラッキーコインを追加する。他の使い切りアイテムV2は対象外のまま。

- `c_coin2` の在庫IDは維持。価格300、表示文「ルーレットでコインがもらえる。」。
- 使用時に即時抽選・即時支給。額と確率は10:15%、20:20%、50:25%、100:20%、500:12%、1000:7%、10000:1%。
- Star・ゲームパス・Quick・うそつきしょうぶ・通常ミニゲーム結果とは独立。
- 旧「次の大成功2倍」効果・待機表示・予約・発動処理を削除。互換効果は残さない。
- 旧在庫は1:1で継続。保存済み旧予約は効果を消し、新在庫1個として一度だけ救済。
- 再読込・反復正規化・次人生・無限復帰で救済を重複させない。現在状態と無限復帰スナップショットに同じ予約があっても二重計上しない。
- 通常成功・失敗・大成功、ゲームパスのいずれもラッキーコインを発動・消費しない。

### 追加タスク L（Task 4後、Task 5前）

1. economy / item-inventory / migration / item-care-game等の関連テストを先に更新。価格・即時抽選の全境界・在庫1個消費・空在庫無効・各装備からの独立・旧予約1個救済と再読込/次人生/無限復帰の冪等性・旧効果文言削除を固定しRED確認。
2. item-system.jsのカタログと保存正規化、script.jsの使用経路・待機表示・旧報酬発動処理を最小変更で統一。抽選の仕様を定数化し、表示と金額が一致することを確認。
3. focused testsをGREENにしコミット。Task 5は旧2倍処理のない状態を前提に通常報酬・Starへ進む。
4. 最終全体・ブラウザ・CI検証にラッキーコインの購入・使用・旧予約救済を含める。
