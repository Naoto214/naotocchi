# Independent review and author resolution — entry history

Independent reviewer: /root/independent_review, gpt-6-astra, fresh context, read-only.
Reviewed local tree at d5c2d5da3a0591cf02df4718211736d9b844c185 against d755a14694d148d12ae9bead3a7c9a13d9db5ed4. Source publication after author fixes: 542ab53b6a9e273eaf84b1bb4a46c9c3b3261a2a, tree58a328b4f9a4b9ef9d8a5d41e5ff26326fc44a70. This is one independent review plus author TDD resolution, not an independent re-review of the fixes.

## Findings returned

Critical 0. Important 1. Minor 1.

Important: runtime require_history/capture stripped execution_contract_id and full-envelope before/after hashes. Two captured branches with identical continuation/raw events but different runtime.ability_uses could share proof. Passing branch A history with branch B envelope accepted; corrupt supplied full-envelope hash also accepted. Reviewer reproduced this with two unit_noop successor envelopes. Require selected full-envelope evidence; merely checking optional supplied hashes leaves raw-history ambiguity.

Minor: six-family native tests covered generation and arrival but seeded no old effects, usage, reservations. Existing low-level 100/105 test preserved reservations without outer wrappers. Requested explicit native nonmigration coverage.

## Resolution

Important reproduced by test_full_envelope_branch_collision_and_binding_tampering_stop (RED). Retain all validated full-envelope bindings; compare every supplied binding field exactly. For raw public events, require a unique captured full-envelope destination for that parent and raw event; ambiguity stops. A cache path cannot itself become selected history. Full history suffix, root prefix, exact current record hash and active identity remain mandatory. Test now passes including wrong branch, every mutated binding field, ambiguous raw branches, and valid bound branches.

The complete diagnostic initially exposed multiple valid annotations of the same native event. test_late_event_annotation_does_not_replace_captured_transition reproduced the overstrict collision stop (RED). Capture now retains each hash-validated annotation variant rather than overwriting earlier edges. No event or lifecycle validation removed.

Minor addressed in bounded native test test_native_reentry_keeps_old_usage_and_rejects_unresolved_old_reservations: new #2 instance, old usage row remains #1, unresolved old reservation fails without changing source. Native movement-lifetime tests also verify old stat/conditional targets expire, while 100/105 tests verify old reservation references do not migrate. Current107 rejects legacy reservations: they were not made executable merely to demonstrate nonmigration. Six-family tests verify new arrival identity for main/partner. No unresolved findings deferred.

## Scope

Only conditional synthetic cases and folding the saved275 events were used. Saved first-match result remains stopped. No production attempt, retry/resume, replacement seeds, approval consumption, gameplay ruling, or special C-bat/I-sleepboost1 branch. Final full-source suite/complete diagnostic/design results are separate artifacts and must pass before current preflight is claimed.

## Validation bookkeeping

The first regression process was invalidated when source changed after review. Attempted interruption did not terminate it under the process namespace; its continuing output is excluded from acceptance. The plan checkpoint's word "interrupted" describes the intent, not a successfully terminated process. No production process was involved. Its log is retained separately. Initial verification-summary serialization also rejected a floating elapsed time; final summaries use ordinary JSON, as the existing evidence format does. Neither initial/incomplete run is counted as PASS.

The first design check lacked two linked sparse-checkout files. Fetching the unchanged docs/qa and tests trees resolved the environment issue; final design check ran unchanged source and returned errors=[].

Review provenance patches (local reviewed checkpoint is not advertised as a remote commit):
- entry-history-542ab53-review-initial.patch SHA-256 895b08b9e81ad826e285508d683fad4f6af084de928393c2798c806d2aafa41d
- entry-history-542ab53-review-fixes.patch SHA-256 591df006b5871f7ae2e55b96ef371db19d05edfc6cc99ec8af68bba2e8d8d67c
