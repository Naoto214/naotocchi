# SDD ledger — plan: docs/card-game/plans/2026-10-02-continuation-contract-implementation.md
Base: bb1a6b6e927c63aaa209b63385d623873ed9891b; separate clean clone, branch continuation-audit-432-verified. Existing 431 fresh8/protected baseline passed in preceding turn; remote freshly unchanged.
Ruling: User explicitly authorized inline implementation and no intermediate approvals; proceed from saved plan without a second permission gate — no unresolved game ruling — cost if wrong: implementation scope mismatch.
Pre-flight: Task1 envelope/visible/hash -> Task2 evidence, Task3 actions, Task4 replay: all use dict envelope, runtime remains outside legacy payload.
Pre-flight: Task2 audit/problem/select -> Task3 apply -> Task4 runner: selected candidate is validated against regenerated inventory, full runtime hash travels in events.
Pre-flight: Task3 legacy handler boundary -> Task4: only proved runtime-preserving transitions are accepted; unhandled effects stop.
Task 1: complete (commits bb1a6b6..2633979, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_continuation_state.py -v → OK)
Task 2: complete (commits 2633979..b913827, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_continuation_rules.py -v → OK)
Task 3: complete (commits b913827..f5a5815, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_continuation_actions.py -v → OK)
Ruling: Reuse historical comparison certificates only when current public view and full action identities match; generic post-main proofs otherwise — source-bound reuse avoids inventing priorities — cost if wrong: hidden-data-dependent choice or incomplete candidate evidence.
Ruling: Stop runtime-bearing forced/end adapters and unknown main/world effects; do not suppress legal actions — approved design permits explicit unconnected boundaries — cost if wrong: narrower coverage, never inferred completion.
Ruling: Optional inputs argument added to problem/select for source-bound certificate reuse; callers all updated — cost if wrong: interface mismatch covered by integration replay.
Ruling: Full old913 is not rerun because old engine modules unchanged; related97 and new dedicated suite plus design/npm gates required — cost if wrong: unrelated regression not freshly exercised, historical913 clearly labelled.
Ruling: Historical pilot decisions lack event_seq; align ordered normal snapshots/decisions with emitted choice, reconstruct saved inventory and verify IDs — cost if wrong: falsely aligned historical difference; covered by eight-route comparison.
Ruling: Preserve fixed21 historical scope denominator (17 shadow +4 stop427), independently audit each actual board without choices/events — cost if wrong: omitted mismatch or policy-effect inflation.
Review: one independent read-only final review completed; Critical0 Important1 Minor1. Important mandatory partner arrival bypass and Minor cost-only audit mismatch reproduced and corrected RED/GREEN. No second review requested per user.
Ruling: Reject egg-only placement classification when actual main exists, through shared certificate used for scoring and execution; canonical74 requires mandatory trigger — cost if wrong: narrower continuation coverage, avoids skipping effect.
Ruling: Historical cost absent remains unproved, not assumed zero; include payment/modifiers in both audits — cost if wrong: evidence additions reported as semantic differences, explicit before/after enables interpretation.
Ruling: All three reviewer declined-to-judge boundaries accepted with root verification responsibility; full details in verification/independent-review.md.
Task 4: complete (commits f5a5815..b7546a8, tests: env PYTHONPATH=docs/card-game/tools python -m unittest test_proxy_continuation_runner.CandidateMeaningTests -v → OK)
