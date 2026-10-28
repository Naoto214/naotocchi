# SDD ledger — plan: docs/superpowers/plans/2026-10-28-naopoyo-v10.md

Pre-flight: common engine rule identity is consumed by stages, session validation and preview. Transient context never enters saves. Current witnesses replace only current test inputs; historical V9 visual cases explicitly preserve old rule.

Task 1: complete — baseline 416/416. physics-red.txt captures missing recombination/once/validation; physics-green.txt 6/6.
Task 2: complete — integration-red.txt captures old rule/witness/save incompatibility; integration-green.txt 14/14. Existing timeline already supports B-once; retain rather than duplicate. No production animation rewrite was necessary.
Task 3: in progress — audit 30,528 inputs/835 preview matches/0 cycles; puzzle 805/805 before added explicit stage20 visual test; CARD 412/412; Runtime running; Pages guard correctly rejected stale engine hash, reviewed unchanged imports/dependencies and updated only its allowlist SHA.
Task 4: pending — independent review, GitHub push/CI, private publication/hash comparison.
Ruling: approval gates are already covered by user's explicit batch authorization. Work in a separate detached worktree, preserve existing dirty checkouts and recheck PR HEAD before fast-forward push.
Ruling: 11–14 intentionally have no split challenge, so no-split impossibility applies to 15–20 only. State this scope rather than claim all ten require splitting.
Ruling: keep stage geometry unchanged; 19/20 witnesses are feasible upper bounds, not proofs of shortest length or fun. Human difficulty assessment remains explicit.
