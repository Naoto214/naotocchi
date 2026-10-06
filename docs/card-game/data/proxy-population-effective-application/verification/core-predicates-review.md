# Independent read-only review

Reviewer: /root/review474_bundle. One review of the core normal predicate module, tests, actual challenge-window binding and plan; no edits or reviewer test execution.

Initial findings: Critical0 / Important1 / Minor1.

- Important: relationship predicate treated printed time1 as actual payment, rejecting existing P-cliff_goat same-partner discounted time0. Reproduced in core-predicates-discount-red.txt using native activation/resolution and current candidate inventory. Extracted the existing effect filter/payment expression to shared relationship_effects/relationship_payment in the current trigger_effects module; both existing adjudicator and audit use it, including exact effect IDs. No change to effect value, target scope, usage or transition.
- Minor: active challenge was looked up in runtime instead of game_state. Reproduced in core-predicates-phase-red.txt and fixed to actual game_state.

Implementer verification: both reproductions and native trigger-effect tests PASS (10 tests in core-predicates-review-green.txt). Dedicated6PASS includes extra full-capacity and transform-modifier evidence corruption tests added after review. The initial capacity fixture incorrectly assumed three I-poop1 copies; corrected to existing set/attachment inventory and retained failure log. No second independent review is claimed. Final multi-turn integration is recorded separately.

Scope remains local core disposition predicates; no full legal-set, actual-information-use, rule-opportunity or balance admission promotion.
