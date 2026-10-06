# Ordinary entry and decision projection review

Independent read-only reviewer: /root/review474_bundle. Initial findings: Critical0 / Important2 / Minor1.

- Important: native priority_unique has a minimal choice without legal_candidates; requiring that field rejected valid native records. RED reproduced and corrected: only that native mode may omit the field, present candidate lists must match exactly.
- Important: response seed identity checked only four fields, leaving window/origin/contract coordinates unbound. RED reproduced; now all ten119 context fields canonically match actual entry.
- Minor: normal safe-free subchoice kind was ignored. RED reproduced; only existing safe-free markers admit zero_cost_person_placement, otherwise the ordinary context choice kind is required.

Same review cycle confirmed all findings resolved, no unresolved findings. Reviewer did not run tests or verify the final20-turn connected result. Initial25-test connected run failed the completion assertion due to the priority_unique rejection; it is not a passing verification. Standalone final5 tests passed; subsequent connected validation is recorded separately.

Hashes, entry identity and record projection do not prove candidate legality, effect semantics, whole-rule coverage, strategy or admission. Supplied response context tests isolate coordinate binding and do not fabricate strategic proof.
