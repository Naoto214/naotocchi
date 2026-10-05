# 467 Initial response window implementation plan

> Use executing-plans inline with sequential TDD and one final independent review.

Goal: connect 466's initial response inventory to 119 selection evidence and, only when pass is uniquely legal, the existing 138 pass transition through the opponent's opportunity to the first normal boundary.
Spec: 119, 454–460, approved 463, 464–466. Python; additive modules only under docs/card-game.

## Constraints and design

No new comparison semantics, hidden outcome inspection, MRP response dispatch, seed/root sampling, actual population lock or game execution. No old files except README index changed. Old fallback still excluded; no past record reclassification. Local synthetic evidence and historical in-memory bundle only. All whole-match admission/readiness remains null/false.

The first priority actor has time1 and a six-card hand; the other actor has time0 and five cards. 466 verifies the full initial boundary. For the other actor all 107 quick-use templates cost at least1, with empty board/prepared/reservations and no challenge. Enumerate all of that actor's hand sources, retaining reasons. No zero-cost or unknown action is silently excluded. Both owners remain fixed when first player changes.

Singleton response-pass uses the existing119/120 response_unique branch. Multiple candidates are recorded as strategically unproved, no selected candidate or seed proof; never call the legacy numerical-default comparator for these candidates. Unknown card effects are not valued at zero. This is a bounded proof/transition adapter, not a new execution policy: a real119 fallback would remain excluded.

## Task 1: candidate and selection boundary

Create tools/proxy_population_start_window.py and test_proxy_population_start_window.py. `assess_initial_response(game, first_player, actor, root=ROOT)` derives a complete conditional inventory and selection basis; it does not authenticate origin. Tests first: singleton actual119 response_unique; hit/coin/mixed alternatives remain unselected; opponent all41 ID inventory; hidden deck/opponent hand permutation independence; invalid actor/resources/unknown card rejected. Run unittest class AssessmentTests RED then GREEN.

## Task 2: pass transition and bundle binding

`reconstruct_initial_window(game, first_player, root=ROOT)` reconstructs a conditional local prefix: multiple candidates stop unchanged at seq2; unique pass gives events3/4, both opportunity records, snapshots2/3/4, v1 envelope, first normal boundary. Keep runtime/hash conventions and full card lookup binding. `build_start_window(bundle, match_id, root=ROOT)` first reconstructs466 and binds its whole hash, then local window. No caller-supplied choice or context/ordinal. Tests WindowTests RED→GREEN: both seats, resource/identity preservation, hash chain, mandatory lookup binding; no partial result presented as whole-match eligible.

## Task 3: validator and non-executing CLI

`audit_start_window(record,bundle,match_id,root=ROOT)` canonical-rebuilds all fields, including blocked multiple-candidate records. Verified blocked record is not a progressed window. Tamper tests for omission, bool/int, hashes, actor, runtime, card lookup, fake eligibility, altered selected candidate. CLI strict JSON/read-only, pending exit1 / invalid2, no execute/generate switch. Test AuditTests RED→GREEN. Related suite and npm, source/blob protection, final independent review once, save GitHub and verify remote HEAD/tree/PR.

Review focus: second actor time0 and all hand/board families; closed pass transition cannot skip own/opponent opportunity; multiple alternatives remain unselected with no score/seed; source pin transitive reuse and mutable continuation scope; all-field canonical audit versus old hashes excluding card lookup. Later response/normal/effect/turn coverage remains unproved.

Completion: Tasks1–3 dedicated12 RED→GREEN; final independent review C0/I0/M0. See verification summary for final related-suite and source/blob results.
