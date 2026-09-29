# Item System V2 Implementation Plan

## 2026-09-15 最新決定（旧案より優先）

この文書の以下の旧案は検討履歴であり、そのまま実装しない。特に専用「ごほうび」・クローバー・旧再会ゲーム・旧スターバッジ集計は廃止済みで、復活させない。

- 装備は1枠。15品に揃える必要はない。
- poop1: うんち3個以上で全掃除。待ち時間なし、手動掃除・成長・実績を増やさない。
- sleepboost1: 「ねる」で即げんき100。通常の睡眠状態は維持。
- bowtie / ribbon: おなか / ごきげんが25以下になると100へ。自然減軽減なし。
- scarf: 病気を通常の薬と同じ効果で自動治療。手動medicine回数を増やさず、発病・冬雪補正なし。
- travel1: 旅のげんき・おなか消費0。連続旅行の疲れ、ごきげん、訪問記録、特別地域条件は維持。
- star: 通常成功の2コインだけ4コインへ。大成功・日次・その他のコインは変えない。旧3ゲーム集計・5分待ち・15コイン支給は撤去。
- partner1 / bond1: なかよし度 / なかまのbondが25以下になると100へ。通常の自然減は維持。交際・仲直り・結婚、手動操作や加入・シール・実績は自動化しない。手紙の思い出は維持。
- flower / glasses / energy1 / hat / crown は未確定。現在の効果を維持し、再設計は次の判断を待つ。変身装備は良い効果がなければ削除も可。
- 使い切り候補: ラッキーコイン、へんしんチケット、ときのチケット・まえ／あと、ずかんチケット、おともだちチケット、レア遭遇チケット、おみあいチケット、いのちのおまもり、ふしぎなたまご、レアなたまご、でんせつチケット。探検チケットは削除方針。今回の安定化では未実装。
- お楽しみ7品の入手・使用・ホーム列・専用演出と実績を撤去し、旧在庫・所有道具を一度だけ返金する。詳細は [お楽しみ廃止仕様](../specs/2026-09-15-fun-items-retirement.md) を優先する。
- 旧専用ごほうび在庫を増やす案は不採用。通常コインは維持。FUN ITEMS（お楽しみ7品）は最新の承認により全廃する。


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire all fun items and their home shortcut row, and replace weak/opaque item effects with clear, strong effects that cannot be trivially replicated by free care actions.

**Architecture:** Keep `item-system.js` as the static catalog/inventory/migration module and keep gameplay hooks in `script.js`. Make each behavior change through the existing item IDs where practical; retired IDs remain migration-only. `meguru.js` receives lantern exploration hooks only after the base item migrations and equipment changes are stable.

**Tech Stack:** Vanilla JavaScript, DOM, Node built-in test runner, existing runtime harness, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-15-items-v2-design.md`

## Global Constraints

- Preserve existing saves, permanent ownership, memories, stickers, dreams, achievements and money except explicit one-time refunds for retired consumables.
- Do not change the one-equipment-slot rule.
- Do not make ordinary care, BGM settings, world settings or life cards paid features.
- Retired IDs remain recognized for legacy saves and cannot refund twice.
- Record/rank/S-rank/achievement scoring continues to use real minigame score unless the spec explicitly says otherwise.
- New lantern/light collection must not count as natural environment observation or unlock rare/legend characters.
- Every production behavior change starts with a failing test and finishes with scoped tests plus full `npm test`.

---

### Task 1: Home strip restoration superseded by retirement

The earlier visibility fix was verified and is historical. The approved retirement now removes the strip and its reserved space. Follow [the retirement plan](2026-09-15-remove-fun-items.md); do not restore the strip.

---

### Task 2: Retire weak consumables safely

**Files:**
- Modify: `tests/item-inventory-test.cjs`
- Modify: `tests/migration-test.cjs`
- Modify: `tests/economy-test.cjs`
- Modify: `item-system.js`
- Modify: `script.js`

**Interfaces:**
- Retire new sales for `c_safety`, `c_mgsmall`, `c_sickshield`, `c_breakhalf`.
- Add a lifetime migration marker such as `itemV2RetiredRefunded`.
- Preserve legacy IDs in `ITEM_SYSTEM.CATALOG`.

- [ ] **Step 1: Write migration tests**

Create a legacy state containing 2×`c_safety`, 3×`c_mgsmall`, 1×`c_sickshield`, 2×`c_breakhalf`. After normalization, assert one-time refund `2*20 + 3*40 + 1*60 + 2*60 = 340`, zero sellable stock for these IDs, and a persisted migration marker. Reload and assert money does not change again.

- [ ] **Step 2: Write shop tests**

Assert `buyConsumableItem()` rejects each retired ID while unrelated consumables remain purchasable.

- [ ] **Step 3: Verify RED**

Run inventory/migration/economy tests and confirm failures are specifically from missing V2 migration/sales rules.

- [ ] **Step 4: Implement migration and shop filtering**

Normalize legacy stock once, credit the explicit refund, clear only unreserved retired stock, and leave prepaid/armed legacy effects to resolve once without a second debit.

- [ ] **Step 5: Verify GREEN**

Run scoped tests, then full suite.

---

### Task 3: Make game consumables strong and obvious

**Files:**
- Modify: `tests/item-care-game-test.cjs`
- Modify: `tests/economy-test.cjs`
- Modify: `item-system.js`
- Modify: `script.js`

**Interfaces:**
- `c_coin2`: next real great result multiplies ordinary minigame coins by 10 and guarantees one `reward`.
- `c_mgbig`: next valid completed minigame, regardless of score, grants exactly one `reward` and doubles that game's normal positive growth award; it never changes real score/rank/recruitment.
- `c_growth`: arm three successful minigames with ×2 growth; failed/interrupted games do not consume a charge; multiplier never stacks above ×2.

- [ ] **Step 1: Write Lucky Coin tests**

Use deterministic base reward and assert ×10 ordinary coins plus one reward; ensure non-game income is unchanged.

- [ ] **Step 2: Write Great Charm tests**

Assert a low real score still receives the item reward/growth effect, while records and recruitment use raw score.

- [ ] **Step 3: Write Growth Drink tests**

Assert exactly three successful completions consume charges and failures/interruptions do not.

- [ ] **Step 4: Verify RED**

Run game/economy tests.

- [ ] **Step 5: Implement minimal effect-state changes**

Use explicit fields in `state.oneTimeBoosts`/`state.itemLife`; avoid overloading score bonuses.

- [ ] **Step 6: Verify GREEN**

Run scoped then full tests.

---

### Task 4: Rebuild social/travel consumables

**Files:**
- Modify: `tests/item-relations-travel-test.cjs`
- Modify: `item-system.js`
- Modify: `script.js`

**Interfaces:**
- `c_courtsmall`: show up to three mutually compatible candidates from visited regions and invite one; normal court resolution still decides relationship.
- `c_breakfull`: automatic once-per-partner rescue to affection 50 plus 100 activity ticks (5 min) of natural-decay pause.
- `c_travel`: next legal trip costs zero hunger/energy, ignores travel fatigue, and exposes every legal detour for one selection.
- `new_life_patch`: no longer purchasable; existing stock remains usable and future acquisition comes from reward/event supply.

- [ ] **Step 1: Write candidate invite tests**
- [ ] **Step 2: Write relationship rescue tests**
- [ ] **Step 3: Write zero-cost/full-detour travel tests**
- [ ] **Step 4: Write life-patch shop rejection and stock-use tests**
- [ ] **Step 5: Verify RED**
- [ ] **Step 6: Implement**
- [ ] **Step 7: Verify GREEN**

---

### Task 5: Replace weak equipment effects one group at a time

**Files:**
- Modify: `tests/item-care-game-test.cjs`
- Modify: `tests/item-relations-travel-test.cjs`
- Modify: `tests/item-experiences-test.cjs`
- Modify: `item-system.js`
- Modify: `script.js`

**Interfaces and expected behavior:**

Care automation:
- `ribbon`: when happiness first crosses below 30 and cooldown is ready, restore to 60; 100-tick cooldown.
- `bowtie`: when hunger first crosses below 25 and cooldown is ready, restore to 55 without overfeed; 100-tick cooldown.
- `poop1`: at 3 poops, remove all poops; 60-tick cooldown; no clean/growth/achievement credit.
- `scarf`: cancel only extra winter/snow hunger/energy/sickness burden.
- `sleepboost1`: 5 sleeping ticks (15 sec) are sufficient to restore energy to 100; keep the item as wearable.

Game/travel:
- `glasses`: normal Play opens three eligible minigame choices instead of random start.
- `energy1`: halve game energy cost (12→6) and reduce normal awake decay by 25%.
- `hat`: keep current 34 transform-meter behavior.
- `travel1`: halve normal travel hunger/energy cost and add one extra legal detour choice.
- `star`: ordinary minigame coin earnings ×2 while equipped, no milestone/daily/sticker/gambling multiplier.

Social/survival/luck:
- `flower`: normal court opens up to three mutually compatible local candidates to choose from.
- `bond1`: every 200 activity ticks, choose one previously recruited normal companion across past lives for a legal reunion attempt.
- `partner1`: stop natural partner-affection decay while equipped and preserve letter memories.
- `crown`: 25% life-damage reduction plus one health-side rescue to 40 per life.
- `itemluck1`: reward chance 25%; after three misses next great result guarantees one reward.

- [ ] **Step 1: Add one failing test per equipment behavior**
- [ ] **Step 2: Verify RED for each group**
- [ ] **Step 3: Implement care automation group**
- [ ] **Step 4: Verify care group**
- [ ] **Step 5: Implement game/travel group**
- [ ] **Step 6: Verify game/travel group**
- [ ] **Step 7: Implement social/survival/luck group**
- [ ] **Step 8: Verify all equipment tests and full suite**

---

### Task 6: Retire all seven fun items and reusable tools

The previous reaction redesign is cancelled. Follow [the retirement plan](2026-09-15-remove-fun-items.md) for runtime/UI removal, once-only refunds, removal of exclusive achievements and preservation of shared memories. No replacement fun-item subsystem is introduced.

---

### Task 7: Turn the Naoto Lantern into real Meguru exploration

**Files:**
- Modify: `tests/item-relations-travel-test.cjs`
- Modify: `tests/meguru-test.cjs`
- Modify: `tests/meguru-audit-test.cjs`
- Modify: `meguru.js`
- Modify: `script.js`
- Modify: `item-memories.js` only if regional progress needs display metadata

**Interfaces:**
- Meguru receives lantern ownership plus discovered light keys in run configuration.
- Each visited ordinary region has 1–3 stable light IDs/locations.
- Reaching a light records it once in `itemMemories.lights` and never pays coins or natural-observation credit.
- The item overlay no longer exposes the old direct region-button light collection action.

- [ ] **Step 1: Add deterministic Meguru light placement/discovery tests**
- [ ] **Step 2: Add save/reload deduplication test**
- [ ] **Step 3: Add regression test that direct button collection is gone**
- [ ] **Step 4: Verify RED**
- [ ] **Step 5: Implement world light nodes and discovery callback**
- [ ] **Step 6: Verify GREEN**

---

### Task 8: Expand Ring and Naoto Crown rewards

**Files:**
- Modify: `tests/item-relations-travel-test.cjs`
- Modify: `tests/item-experiences-test.cjs`
- Modify: `script.js`
- Modify: `meguru.js` if the plaza/secret place is implemented through Meguru

**Interfaces:**
- Ring: partner-specific secret-place route with a dedicated memory, no forced relationship state.
- Naoto Crown: unlock a plaza populated from already-discovered characters, 8–12 visitors per visit, without adding new PERFECT requirements.

- [ ] **Step 1: Test partner-bound secret place**
- [ ] **Step 2: Test discovered-only plaza population and size bounds**
- [ ] **Step 3: Verify RED**
- [ ] **Step 4: Implement**
- [ ] **Step 5: Verify GREEN**

---

### Task 9: Rebalance prices and verify the economy

**Files:**
- Modify: `tests/economy-test.cjs`
- Modify: `tests/item-collections-economy-test.cjs`
- Modify: `item-system.js`
- Update: `docs/superpowers/specs/2026-09-15-items-v2-design.md` with final simulated prices if any provisional price changes

**Interfaces:**
- Run the existing fixed play profiles with V2 effects/prices.
- Permanent shop should require meaningful multi-life saving; it must not be completable in one ordinary 100-year life.
- Fun items are retired; their once-only legacy refunds must not repeat across reloads or lives.

- [ ] **Step 1: Encode expected price table in tests**
- [ ] **Step 2: Run fixed economy simulations and capture balances**
- [ ] **Step 3: Adjust only prices/supply, not effects, until targets are met**
- [ ] **Step 4: Run full `npm test` and both GitHub Actions workflows**
- [ ] **Step 5: Update PR body with exact test counts and unresolved manual visual checks**
