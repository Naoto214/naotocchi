# Task 2 report: legacy runtime removal and life items

## Status

Implemented and committed-ready.

## Changes

- Replaced the runtime consumable list with the final 12 catalog IDs. Task 2 binds Lucky, life medicine, and automatic life charm; Tasks 3–5 IDs remain visible, purchasable, and disabled for use until their handlers land.
- Added `c_life`: usable only in a finite growing life with missing life, resets `deathMeter`, `dying`, and `dyingTicks`, consumes one, and leaves health, hunger, energy, and sickness unchanged.
- Added automatic `c_life_charm` at the actual death entry. Existing `miracleGuard` retains precedence. Successful rescue consumes once, records use, clears only the death countdown/warning, saves/renders, and exits before death count/log/audio/stage side effects.
- Removed retired sale/use entries, minigame score/insurance/reward effects, sickness prevention, relationship reservation/shield/repair bonuses, travel guarantee/scene, age-66 retired stock reward, mirror reroll control, per-life patch limit, pending/cancel grid controls, and fresh obsolete boost defaults.
- Preserved daily growth boost display/mechanism, Quick rewards, ordinary care/relationships/travel, normal equipment, Game Pass, Star, and Lucky behavior.
- Added `tests/consumables-v2-life-test.cjs`, wired it into `package.json`, and updated old behavior tests while retaining unrelated ordinary behavior assertions.

## TDD evidence

Initial RED command:

`node --test tests/consumables-v2-life-test.cjs`

Result: 5 tests, 2 pass, 3 expected failures. Missing medicine returned false; charm allowed death; old catalog/UI crashed against removed metadata.

Focused GREEN command:

`node --check script.js && node --test tests/consumables-v2-life-test.cjs tests/consumables-v2-migration-test.cjs tests/item-care-game-test.cjs tests/item-inventory-test.cjs tests/item-relations-travel-test.cjs tests/economy-test.cjs tests/lucky-coin-test.cjs tests/midlife-test.cjs`

Result: 149 tests, 149 pass, 0 fail; syntax check passed.

## Review notes

- `rg` over `script.js` finds none of the retired IDs or retired effect field names.
- Confirmed the four approved PNG assets were untouched.
- Full suite is intentionally deferred to Task 6. A broader exploratory run including Task 3–5 suites exposed expected failures in unimplemented egg handlers and pre-existing migration expectation updates; these are outside Task 2 focused GREEN and are not represented as Task 2 regressions.

## Review follow-up: real tick boundaries

Added two runtime-level tests that call `tick()` rather than `checkMeters()` directly:

- A real dying tick at `deathMeter=100`, `dyingTicks=0` consumes exactly one charm, records one consumable use, clears the death warning, and leaves the pet growing without a death.
- The tick that advances age 99 to 100 enters farewell first and preserves the charm, with one clear and no death.

Mutation evidence:

- Temporarily disabling the charm take branch made the real dying tick test fail (`dead !== growing`).
- Temporarily consuming a charm before the 100-year branch made the farewell test fail (stock `0 !== 1`).
- `script.js` was restored byte-for-byte after both mutations.
