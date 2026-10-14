# Scoped descriptor review

Reviewed remaining-rules.mjs, equipment-rules.mjs, advanced-inspection.mjs and costs.mjs against full-catalog text, with reservation/trigger helpers checked only where needed. This is not an exhaustive 452-card audit. Known in-progress handler wiring was excluded.

## Actionable finding

- **P-knitting_spider — remaining-rules.mjs:** the two `progress` / `marriage` triggers use `onceName:true` and independent `limit:'round'` indices. Catalog says only `1ラウンドに1回` (individual limit), not same-name aggregate. `effects.mjs` checks `onceName` by cardId and current serial, so two different spider individuals cannot both activate during the same turn, contrary to the per-individual rule. Its round check also includes trigger index, which does not share the limit across progress/marriage. Minimal fix: remove `onceName` and give both triggers a shared per-source/generation round-limit key; use that key in round checks and record/consume handling. Verify two individuals may each activate once, and a single individual cannot activate both event forms in one round.

## Withdrawn / no issue

- P-snowman `!!board.main` is the non-egg guard because egg is represented by an empty main slot; no finding.
- Reservation challenge-result actor handling is correct: engine emits one actor-relative challengeResult event per participant.
- No additional definite translation mismatch found in this scoped pass; inspection exhaustion behavior and individual generation semantics were not claimed exhaustively verified.

# Narrow runtime integration review

Read-only review of the new engine/effects hooks and adjacent cost, copy, reservation and replacement implementations. Focused on critical crashes, conservation, false application and progress stalls; excluded broad accepted-326 review and in-progress integration tests.

No additional definite critical defect identified in this pass. The prior P-knitting_spider descriptor finding is addressed by the shared `limitGroup:'relationship'` and removal of `onceName`; engine consumption and effects enumeration now use that group.

Verification run:

`node --test prototypes/card-game/tests/continuations.test.mjs prototypes/card-game/tests/ability-copy.test.mjs prototypes/card-game/tests/costs.test.mjs`

Result: 18 tests passed, 0 failed. This verifies the existing focused fixtures for departure identity, automatic next-challenge / next-win work, copied snapshots and expiry, and cost modifiers; it does not establish complete 452-card behavioral coverage.

Checked contracts include actor-relative challengeResult events, source/generation-bound target references, source departure preserving resolved reservations, copied acquisition avoiding immediate re-execution, and cost quoting before normal main placement changes board slots. No speculative findings are promoted to defects.

## Final bounded rereview after 130faaf4

Reviewed only the requested post-checkpoint diff in engine/effects/replacements/ability-copy/event-effects/advanced-effects. No new critical regression identified. Checked retained trigger event through activation selection, copied same-name scope consumption/filtering, interruption guards, protection allocation choice/resumption, and automatic draining additions. No expansion into an unrelated card audit.

Ran `node --test prototypes/card-game/tests/finish452-runtime.test.mjs prototypes/card-game/tests/reservation-boundaries.test.mjs prototypes/card-game/tests/ability-copy.test.mjs`: **30 passed, 0 failed**. This includes the parrot event-retention regression, copied same-name separation, mandatory protection and simultaneous owner allocation, interrupted-reservation rejection, and owner ordering fixtures. Browser evidence was supplied by the parent and not independently rerun in this review.

## Final implementation verification

- P-knitting_spider finding fixed with one per-source relationship round limit; regression fixtures cover separate individuals and shared progress/marriage usage.
- Browser found C-parrot activation losing the triggering event before target selection. RED reproduced the missing options; activation now retains that event. The full browser replay completes after the fix.
- Additional RED/GREEN regressions protect copied same-name limits, aborted challenges, mandatory move protection and simultaneous owner allocation.
- Final fruit-slice regression confirmed ordering opened before queued growth. Shared inspection continuation now applies growth before opening remainder ordering; focused 10 tests and full 158 tests pass.
- Full final Node run: 158 passed, 0 failed. Canonical catalog --check passed. Python oracle regeneration is byte-identical (717 representative cases, not all new effects).
- Mobile Chromium browser: 429 commands, 291 handoffs, R10 A65/B45, no page errors; save/reload and double-click single commit pass. Browser evidence predates the final fruit-order correction; the final full-match Node replay passes with that correction.
- Deck UI: 452 catalog entries, copy limits, draft persistence, separate seats, match-save isolation, no mobile overflow, handoff privacy, no page errors.
- No full 452-card interaction audit or strategy proof was performed. Real iPhone Safari QA remains with the user. Fixed400 inputs, approval/stop archives, and canonical docs are unchanged.
