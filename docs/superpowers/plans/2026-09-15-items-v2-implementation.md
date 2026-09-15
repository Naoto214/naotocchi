# Item System V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the home fun-item shortcut row and replace weak/opaque item effects with clear, strong effects that cannot be trivially replicated by free care actions.

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

### Task 1: Keep the home fun-item strip visible

**Files:**
- Modify: `tests/home-touch-test.cjs`
- Modify: `home-touch.js`

**Interfaces:**
- Consumes: existing `#itemsRow`, `#screenNormal`, `device.dataset.homeFixed`.
- Produces: a shortcut row pinned inside the visible fixed home while retaining the existing `renderItemsRow()` inventory logic.

- [x] **Step 1: Write a failing regression test**

Assert that running `home-touch.js` pins `#itemsRow` to the bottom of the visible screen and reserves bottom space on `#screenNormal`.

- [x] **Step 2: Verify RED**

PR CI on commit `c521f65` must fail because the old `home-touch.js` does not set these layout properties.

- [x] **Step 3: Implement the minimal layout fix**

Set `itemsRow.style.position = 'absolute'`, left/right `8px`, bottom `6px`, z-index `8`, and reserve `38px` bottom padding in `screenNormal`.

- [ ] **Step 4: Verify GREEN**

Run the scoped home-touch test and full runtime/home-layout CI. Confirm the row remains empty when there are no fun items or tools because `renderItemsRow()` still owns content visibility.

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

### Task 6: Remove stat-heal identity from fun items and reusable tools

**Files:**
- Modify: `tests/item-experiences-test.cjs`
- Modify: `item-system.js`
- Modify: `script.js`
- Modify: `audio.js` only if home-BGM selection requires an exposed controller entry point

**Interfaces:**
- `fun_candy`: no stats; character-specific taste scene/memory.
- `fun_bubbles`: no stats; group scene based on active companions.
- `fun_balloon`: retain invitation behavior.
- `fun_fireworks`: no stats; environment/cast-dependent special memory.
- `fun_camera`: retain photo behavior.
- `fun_musicbox`: no decline heal; collected tunes can be selected as home music without restricting existing free BGM settings.
- `fun_surprise`: no stats/cash/growth; choose from a larger pool of visual/dialogue events on cooldown.

- [ ] **Step 1: Rewrite experience tests to assert no stat changes**
- [ ] **Step 2: Add diversity tests for scene outputs**
- [ ] **Step 3: Verify RED**
- [ ] **Step 4: Implement**
- [ ] **Step 5: Verify GREEN**

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
- Cheap fun items remain usable regularly without crowding out all permanent purchase goals.

- [ ] **Step 1: Encode expected price table in tests**
- [ ] **Step 2: Run fixed economy simulations and capture balances**
- [ ] **Step 3: Adjust only prices/supply, not effects, until targets are met**
- [ ] **Step 4: Run full `npm test` and both GitHub Actions workflows**
- [ ] **Step 5: Update PR body with exact test counts and unresolved manual visual checks**
