# VERSION 4 implementation ledger

Historical implementation ledger. For current release validation see VERSION-4.md. Approved specification: user request dated 2026-11-03, sections 0–28.

## Baseline and protection

- PR #461: `work/life-sugoroku-20261028`, `68067cbb42cd75bb2fc6e376f8ceeb531a1346c3`, open Draft.
- V3 recovery: `wip/naokoro-v3-20261030` at the same commit.
- Main observed: `81c044a9977dbd013f1632372a72785b540fb463`.
- Isolated lightweight checkout: 4,617 files / 219,070,067 bytes; no original assets or evidence removed.
- V3 baseline: 87 dedicated tests passed. Its five GitHub workflows are now all successful.
- Local checkout started clean. Other Work environments' uncommitted changes are not available here and have not been inspected or changed.
- Existing private V3 deployment remains unchanged until the entire V4 release is validated.

## Architecture and order

Keep V2/V3 engine, save validation and data as the compatibility implementation. Add versioned V4 definitions/reducers before switching the new-game entry point. The UI and engine must consume the same V4 tile definitions. Reuse existing terrain coordinates, graph, movement, art and animations. Do not merge main.

1. [x] `tiles-v4.mjs`: 15 definitions and exact 48-ID mapping; graph/coordinate compatibility tests.
2. [x] `rules-v4.mjs`: deterministic choice/relationship/time/transformation reducers; reroll lifecycle and saved candidates; positive and negative tests. Runtime/UI integration remains below.
3. [x] `numeric-text-v4.mjs`: 60 region-aware texts; no immediate repeats. Companion comments are still pending.
4. [ ] Engine/UI integration: preserve old engine routing; max 20 followers, fixed candidate selection, dice confirmation, landing-only shop; migration and reload tests.
5. [ ] Official games: inspect pinned latest main, create isolated host and deterministic per-game CPU adapters; validate real controls, scoring, timing, replay/resume and no main-save access. Do not substitute fake random CPU scores or simplified copies.
6. [ ] Audit all 46 event IDs and choices; preserve IDs, author causal outcomes and 5-unit rewards; remove special-tile role overlap.
7. [ ] Complete fixed-seed 2/3/4-seat simulations for 10/15/20 rounds, before/after metrics; browser QA 320/375/390/430 portrait/landscape; save QA images and evidence.
8. [ ] Review, push V4 to PR #461 only when complete, confirm CI, package exact saved HEAD, update the existing owner-private Site. Do not update main or Pages.

## Implementation rulings

- A previously acquired friend may be met again but never replenishes rerolls a second time. Track reward-granted IDs separately from current followers; partner protection resets on a new relationship as specified.
- At stage boundaries, time draws are conditioned on outcomes that actually change the stage; magnitude is clamped to stages 1–8.
- Keep existing item prices/effects, including non-5-unit seed/clock bonuses, per the explicit item protection requirement. Ordinary tile/event rewards use 5-unit values.
- No intermediate V4 UI is published. Tests of standalone reducers are not claims of completed gameplay, browser QA or game balance.

## Review and resumption

Fresh read-only review found three important save-validation holes: malformed item bookkeeping, unearned reroll balances / contradictory grants, and impossible turn counts. Seven negative tests failed before fixes and passed after fixes. Restore now validates item records, replays the reroll ledger and checks turn counts against the current round/seat. Actual final-round completion is also tested for 2, 3 and 4 seats.

Minor deferred: non-finite externally supplied `now` can create an invalid dice deadline in this disconnected engine. Normalize with the legacy `Number.isFinite` policy before UI integration. The UI will provide `Date.now()`, but direct API misuse still needs a negative test.

Other review test gaps remain: every-item parity across 10/15/20 rounds; full core sequence snapshot replay; dice mode/count and choice type/landing tile agreement. These must be addressed before release.

`engine-v4.mjs` implements saved edge movement, roll/stop/settle/optional reroll, choice application, item reuse, landing-only shop, round transitions and relationship/numeric/time landing. It intentionally stops at `v4-game-request` / `v4-event-request`; there is no automatic score or event placeholder. The V3 UI still imports the untouched `engine.mjs` and `data.mjs`.

Next executor should start with official-host proof-of-concept and event authoring, not redo completed board/rule/text work. Read `V4-MINIGAME-PREFLIGHT.md`; pin the observed main or recheck only its game hashes. Add tournament and event adapters before connecting `main.mjs`, then complete follower display and CPU. Keep current private V3 until all gates pass.
