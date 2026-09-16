# Consumables V2 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完了済みのラッキーコインに残り11種を加え、使い切り12種を確定仕様へ統一し、旧在庫・予約を安全に移行する。

**Architecture:** 商品・永久在庫・一度きり移行は既存の `item-system.js` に置く。使用可否・選択・死亡・孵化・描画は `script.js` の既存経路へ接続する。新しい画面機構を増やさず既存pickerを拡張し、純粋な候補抽出や保存正規化は既存モジュール内の小さな関数に分ける。

**Tech Stack:** Vanilla JS/CSS、Node node:test、runtime harness、Playwright Chromium/WebKit、GitHub Actions。

**Spec:** `docs/superpowers/specs/2026-09-16-items-v2-decision-log.md` §§4–5、`2026-09-16-items-v2-final-migration-table.md` §§4–9・12、`2026-09-16-item-shop-copy-v2.md`。

## Global Constraints

- PR #274 / `chatgpt/items-v2-home-strip-20260915` はDraftを維持し、mainへマージしない。
- 基点HEADは `f94fcedb5e2b648607abcfd9485bdc740e6e8092`。通常装具10種・Star3倍・ゲームパス・ラッキーコインの完成済み仕様を維持する。
- 確定PNG4枚を変更・再生成しない。新アイテムのために画像を勝手に生成しない。既存の適切な共通アイコンを使い、名称・説明で区別する。
- 使い切り12種はすべて通常購入可能、複数所持、未使用在庫は人生をまたいで維持。購入上限を追加しない。
- 新価格との差額請求をしない。廃止品は旧価格で一度だけ返金。旧購入履歴から追加在庫・返金を作らない。
- 未使用在庫と発動前予約は返金。発動済み旧効果は返金せず終了。移行時の成長2倍解除は旧日次由来も含む（ユーザー追加承認）。
- 旧効果を新アイテムとして発動させない。保存互換の認識以外に旧販売・旧使用経路を残さない。
- Quick・日次の新しい報酬付与・伝説報酬・その他の通常コイン発生源は今回の対象外。移行後に日次が付与する既存成長ブーストまで毎回消さない。
- テーマシールパックは別系統として維持。なおとシリーズ4品も変更しない。
- テストを先に更新しREDを観測してから最小実装。各タスクはfocused GREENとコミット・レビューで閉じる。全体test→ブラウザ→CIは最後に実施する。
- 新仕様と保存互換の重大な矛盾はユーザーへ報告。通常の内部ID・関数分割等は実装判断とする。

## 共通IDと保存契約

| ID | 名前 | 価格 |
|---|---|---:|
| c_coin2 | ラッキーコイン | 300 |
| c_life | いのちのくすり | 300 |
| c_time_back | ときのチケット・まえ | 300 |
| c_time_forward | ときのチケット・あと | 300 |
| c_life_charm | いのちのおまもり | 1000 |
| c_friend | おともだちチケット | 3000 |
| c_match | おみあいチケット | 3000 |
| c_transform | へんしんチケット | 6000 |
| c_rare_friend | レアなかまチケット | 8000 |
| c_egg_normal | ふしぎなたまご | 8000 |
| c_egg_rare | レアなたまご | 10000 |
| c_dex | ずかんチケット | 10000 |

- `lifetime.itemInventory` が正本、`state.items` は既存の互換getterを維持。
- `lifetime.itemMigrations.consumablesV2 === true` と `dreamEggsV2 === true` で二重移行を防ぐ。
- `new_life_patch` → `c_life` 1:1、`new_transform_mirror` →80/個返金。
- 旧ゆめ在庫を `c_egg_normal/c_egg_rare` へ1:1移行。`lifetime.nextEggLine/nextEggKind` は予約済み旧種族を維持する。予約分は孵化まで在庫に含め、取消時の加算をしない。旧ゆめ欄は空にし二重所有しない。
- 次人生の新規予約も同じ2フィールドで保持し、1件だけ有効。消費は孵化成功時に1個。予約先がある間は再抽選せず、明示取消後に新予約。
- 一時姿は `state.itemLife.temporaryForm = {line,index,expiresAt,originLine,originIndex}`。表示だけを変え、実種族・年齢・性別・恋愛対象・成長等の判定には使わない。期限は実時間300000ms、再読込で延長しない。
- 新アイテムpickerは確定時に条件・在庫を再確認し、効果が成立する時だけ1個消費。取消・無効・候補なしでは不消費。いのちのおまもりは自動発動時消費。
- 既存仕様からの実装上の解釈：未加入は現在の加入一覧にいないこと。レアの自然遭遇確率・perk80は呼び出しチケットには課さず、呼出後の通常加入条件を維持する。
- おみあいの指定相手は現在地での求愛候補として保持する。新しい求愛回数制限や滞在タイマーは設けず、通常の求愛に従う。地域移動・交際成立・次人生で解除し、初対面の紹介だけでは解除しない。保存済みの来訪は再読込で継続する。
- へんしんチケットはgrowing中、既存の変身選択がない時にメーターを待たず使える。候補の合法性は通常変身に従う。メーターを任意に増減しない。
- 一時姿は上書き使用可能で、その都度1個消費・5分を新規計測。実年齢や実種族から前後を判定し、一時姿を足場に複数段階を飛ばさない。
- 「育てた種族」は新しい `lifetime.raisedSpecies` に実際の孵化・通常変身時の種族を記録する。旧保存では導入前の図鑑種族を初期値とし、導入後の一時姿の図鑑登録は加えない。`experiencedSpecies()` がこの集合を返し、変身候補の優先順とたまご抽選で共用する。

---

### Task 1: カタログと旧在庫・旧効果・ゆめの保存移行

**Files:** Modify `item-system.js`; Create `tests/consumables-v2-migration-test.cjs`; Modify `package.json` test command.

**Interfaces:** Consumes old `items/itemInventory/oneTimeBoosts/itemLife/dreamEggs`; produces final CATALOG, stable new IDs and migration flags; existing normalize/stock/grant/take signatures stay unchanged.

- [ ] **Step 1: RED tests**

Use the real module, not a replacement migration mock:

```js
const I = require('../item-system.js');
const s = {lifetime:{money:10,itemInventory:{c_safety:2,new_life_patch:3,new_transform_mirror:1},dreamEggs:{normal:2,rare:1}},oneTimeBoosts:{safetyNet:true},itemLife:{}};
I.normalize(s);
assert.equal(s.lifetime.money,150); // 10 +40 inventory +80 mirror +20 prepaid reservation
assert.equal(I.stock(s,'c_life'),3);
assert.equal(I.stock(s,'c_egg_normal'),2);
assert.equal(I.stock(s,'c_egg_rare'),1);
I.normalize(s); assert.equal(s.lifetime.money,150);
```

Add each old price, bad count/overflow, authoritative bag, live/snapshot duplicate reservations, no-refund active boosts, partial sickness shield, old tier court compatibility, flags, reloaded/new-life/infinite-return fixtures, and final catalog exact names/prices. Run `node --test tests/consumables-v2-migration-test.cjs`, record expected RED.

- [ ] **Step 2: implement migration before unknown-ID filtering**

```js
const RETIRED_CONSUMABLE_PRICES = Object.freeze({
 c_safety:20,c_mgsmall:40,c_mgbig:120,c_sickshield:60,c_growth:90,
 c_courtsmall:50,c_breakhalf:60,c_breakfull:100,c_travel:70,new_transform_mirror:80
});
```

Validate positive safe integer counts and sums. Merge old patch stock into new life stock without charging; deduplicate live/infinite snapshots through authoritative lifetime. Refund prepaid safetyNet, minigameBoost, greatReward, courtBoost, breakupShield, travelGuarantee only once per corresponding reservation. GreatReward and old big minigameBoost are one logical reservation. PendingItems still funded in bag add no extra refund. Fully unused three-charge sickness protection may recover one price; one/two remaining charges are active and end without refund. Clear obsolete fields in both live and return snapshots even when already marked, but clear shared boostTicks only during initial migration; subsequent legitimate daily boost is not wiped. Preserve prior legacy court-big350 compensation without double credit. Remove legacy catalog entries; retain theme pack and goals. New catalog can precede runtime handlers within this unpublished task sequence.

- [ ] **Step 3: GREEN and commit**

Run new migration test and existing migration/save-recovery tests; adjust only outdated fixture expectations affected by the new migration. Add the new test to npm test. Commit `feat: migrate final consumable inventory and catalog`.

### Task 2: 旧使用経路の撤去といのち系2品

**Files:** Modify `script.js`; Create `tests/consumables-v2-life-test.cjs`; Modify existing item/economy/relations tests covering removed behavior; add test to `package.json`.

**Interfaces:** Consumes Task1 catalog and normalized inventories; produces `useConsumableItem('c_life')`, automatic `c_life_charm` use inside `triggerDeath()`; remaining new IDs are bound by Tasks3–5.

- [ ] **Step 1: RED**

```js
const h=harness(),s=h.api.state();
s.items.c_life=2; s.deathMeter=75; s.health=23; s.hunger=7; s.isSick=true;
assert.equal(h.api.useConsumableItem('c_life'),true);
assert.equal(s.deathMeter,0); assert.equal(s.health,23);
assert.equal(s.hunger,7); assert.equal(s.isSick,true);
```

Test repeated medicine use across refill, full-life/egg/dead/farewell no consumption; auto charm via actual dying tick at death boundary (no death counter/log), two rescues in one life, depleted charm permits death,100-year farewell and infinite never consume. Snapshot causes (health/hunger/energy/sickness) unchanged. Add old-effect removal regression for game score/care/relationships/travel and no old sale/use/UI entries.

- [ ] **Step 2: minimal implementation**

```js
// At actual death entry, before death side effects:
if (state.stage === STAGE.GROWING && currentAge() < GOAL_AGE &&
    !isImmortal() && ITEM_SYSTEM.take(state,'c_life_charm')) {
  state.deathMeter=0; state.dying=false; state.dyingTicks=0;
  recordItemUse('c_life_charm'); return;
}
```

Follow the existing successful-use saving/rendering/message paths; medicine only sets deathMeter0 and clears dying warning. Auto item has no manual destructive-use button. Replace old CONSUMABLE_ITEMS entries; remove safetyNet/score bonus/greatReward/care protection/relationship charm/travel charm application and pending/cancel UI, mirror reroll control, old per-life patch limits. Keep normal repair conversations, recruitment, care, travel scenes and growth-boost machinery required by unchanged daily flow. Fresh saves need no obsolete boosts. Update old-behavior tests to final expectations, preserving their unrelated assertions.

- [ ] **Step 3: GREEN and commit**

Run life/migration plus item-care-game, item-inventory, relations/economy and Lucky tests touched. Commit `feat: replace legacy consumable effects with life items`.

### Task 3: 一時姿3品とへんしんチケット

**Files:** Modify `script.js`; Create `tests/consumables-v2-forms-test.cjs`; Modify `tests/helpers/runtime-harness.cjs` only to expose real functions if needed; add test to `package.json`.

**Interfaces:** Consumes IDs/time-form state contract; uses `pickTransformCandidates`, `chooseTransform`, `openPicker/resolvePickerSelection`, `currentVisualStage`, stage-change/load/render/timer paths.

- [ ] **Step 1: RED**

```js
const h=harness(),s=h.api.state();
s.items.c_time_forward=1;
const line=s.speciesLine,age=s.ageTicks;
assert.equal(h.api.useConsumableItem('c_time_forward'),true);
assert.equal(s.speciesLine,line); assert.equal(s.ageTicks,age);
assert.equal(s.itemLife.temporaryForm.expiresAt-Date.now(),300000);
```

Use harness clock-compatible now rather than host Date in the actual test. Test 1st/8th boundary guards, registration of target, expiry/reload remaining time, natural stage transition and actual transformation cancellation, no gameplay identity/age mutation, dex all ordinary+8 rare excludes ren and legends, picker cancel/stale choices do not spend. For transform: eligible3 choices favor unexperienced lines, supplement experienced when fewer3, preserve rare/unlock/age eligibility, choice consumes once, no-candidate/cancel no spend.

- [ ] **Step 2: implementation**

Add small helpers in script for valid temporary visual selection, expiry cleanup and candidate enumeration, and `experiencedSpecies()` backed by raisedSpecies. Keep actual `currentFormStageIndex` for gameplay; integrate temporary picture/name at presentation interfaces only. Register chosen visual in discoveredStages through existing discovery machinery without marking it raised; normal transform/stage changes clear temporary override. Existing picker handles dex/transform options. Transform ticket opens a funded selection using existing legal candidate pool, then existing chooseTransform path without old mirror reroll; no free meter refill or extra arbitrary growth. Revalidate before taking stock.

- [ ] **Step 3: GREEN and commit**

Run forms, minigame-lifecycle, growth-balance, clownfish-romance and UI illustration tests covering changes. Commit `feat: add temporary forms and transformation tickets`.

### Task 4: なかま・レアなかま・おみあい

**Files:** Modify `script.js`; Create `tests/consumables-v2-encounters-test.cjs`; add test to `package.json`.

**Interfaces:** Consumes c_friend/c_rare_friend/c_match; produces picker options integrated with existing companion invitation and normal partner encounter/court flow.

- [ ] **Step 1: RED**

```js
const h=harness(),s=h.api.state();s.items.c_friend=1;
const before=JSON.stringify(s.companions);
h.api.useConsumableItem('c_friend');
assert.equal(JSON.stringify(s.companions),before);
assert.equal(s.items.c_friend,1); // picker not confirmed
```

Test full eligibility lists: seen and unseen but unjoined, normal/rare separate, joined excluded, no-candidate/cancel no spend. Confirm selection creates encounter not direct join. Existing joining game/conditions still required. Match picker: only no-current-partner, mutual attraction for male/female/NB, seen allowed, called candidate temporary in current region without editing region tables/state region, normal courtship required. Revalidate stale joins/partner/stock on confirm.

- [ ] **Step 2: implementation**

Add three picker types to existing renderer/selection. Filter real companion/partner master records, excluding recruited IDs and invalid attraction. Use existing encounter screen and active partner candidate representation; do not add a parallel instant-join path. Consume on successful call exactly once. Cancel leaves stock. Represent temporary partner call using existing life-level encounter state, with normal encounter lifetime and no global world edits.

- [ ] **Step 3: GREEN and commit**

Run encounter tests and relevant item-relations/clownfish/dialogue tests. Commit `feat: add selectable companion and matchmaking tickets`.

### Task 5: 次人生たまご2品と旧予約継続

**Files:** Modify `script.js`, `index.html` only for old dream copy/controls; Create `tests/consumables-v2-eggs-test.cjs`; update related migration/egg tests and `package.json`.

**Interfaces:** Consumes Task1 egg stock migration and nextEggLine/Kind; integrates `pickDreamLine/hatchEgg`, reset/infinite return and existing dream controls.

- [ ] **Step 1: RED**

```js
const h=harness(),s=h.api.state();s.items.c_egg_normal=2;
const line=s.speciesLine;
assert.equal(h.api.useConsumableItem('c_egg_normal'),true);
assert.equal(s.speciesLine,line);assert.ok(s.lifetime.nextEggLine);
assert.equal(s.items.c_egg_normal,2); // reserved, consumed only on hatch
```

Test unexperienced pool defined by existing experienced/discovered species records, normal/rare split, ren excluded, no remaining pool blocks, one reservation, cancel no duplication, save/reload/new-life/infinite continuity, successful hatch consumes exactly1 and second hatch not again. Preserve funded legacy chosen species even already experienced. Invalid unfunded/malformed reservations never grant species or negative stock. Any existing milestone egg grants must target new stock so retired dream fields do not reappear.

- [ ] **Step 2: implementation**

Replace old unrestricted manual dream picker for NEW uses with eligible random reservation. Keep validated legacy selected line until hatch. Route visible egg controls and consumable use through the same helpers; cancel only clears fields. Update old names/help to final names and random-pool rule, show reserved species. Consume after validating actual hatch through existing hatch path. Do not change rare natural hatch probability or unlock ren.

- [ ] **Step 3: GREEN and commit**

Run eggs/migration/egg-hatching/item-collections tests covering edited paths. Commit `feat: add final next-life egg reservations`.

### Task 6: ショップ・全回帰・ブラウザ・PR

**Files:** Modify relevant `tests/*` fixtures, `script.js` final picker/copy defects, `tests/home-layout-browser.cjs`; Create `tests/consumables-v2-browser.cjs`; update this plan and PR description to final current state.

**Interfaces:** Consumes all12 completed runtime handlers, stable migration, actual public save/UI. Produces reviewed branch and verifiable results.

- [ ] **Step 1: RED browser and regression expectations**

```js
const expected=['c_coin2','c_life','c_time_back','c_time_forward','c_life_charm','c_friend','c_match','c_transform','c_rare_friend','c_egg_normal','c_egg_rare','c_dex'];
assert.deepEqual(await page.locator('#onetimeItemGrid .shop-item').evaluateAll(xs=>xs.map(x=>x.dataset.id)),expected);
```

Use existing browser module signature and fixed clock before navigation. At320/390 verify prices/copy, scrolling/picker controls, purchase and consume, cancel, life charm automatic display, no obsolete products, migration/refund reload idempotence, temporary-form reload/expiry, egg reservation/cancel and one real encounter. Seed legacy saves before next document after beforeunload; retain all existing layout assertions. Update stale old inventory/boost fixtures to final items without deleting unrelated coverage.

- [ ] **Step 2: focused then full then browser**

Run all six new runtime test files plus changed existing focused files. Run `npm test` once sufficiently integrated. Diagnose every failure; known Quick moleLv4 must be compared with baseline if it recurs. Run real Chromium browser modules locally and both engines in Home layout CI. Fix actual bugs with RED tests and scoped review.

- [ ] **Step 3: whole-change review and publish**

Review diff from f94fced to final code HEAD. Verify `git diff --check`, clean status and PNG hashes. Publish only reviewed commits to requested branch (fast-forward, no force). Confirm latest Runtime smoke and Home layout success and Draft/unmerged. Update outdated PR body with final3x/12-item status, completed scope and deferred Quick/daily/economy scope; never mark ready or merge.

- [ ] **Step 4: record results**

Append measured test counts, CI links, browser widths, migration and exclusion evidence, changed files and published SHAs to this plan; commit `docs: record consumables v2 verification`. Final response reports results and any remaining material limitation explicitly.
