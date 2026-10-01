# Final independent review — resource-value pilot

Read-only fresh-context review of416–428 implementation (all9 modules, all11 tests, plan/spec, design hook, reports and ledgers). Critical0, Important2, Minor1. No second review dispatched.

## Important findings and one fix pass

1. Full-state source lookup made public comparison evidence availability depend on hidden deck order. Reviewer reproduced41 valid-to-error changes across93 compared boundaries. Fixed with a separate public proof binding: owner/public view, public flags/counts, current response/activation context, actor/round/phase, event sequence and relevant public history; source raw signatures and complete fresh legal action/source/variant/target descriptors are independently verified. Actual continuation is used for execution. Full-state hashes remain replay identity. End-to-end93-boundary tests reverse both hidden decks and opponent hand ordering; both selection and proof wrapper remain identical. Public history tampering is rejected. RED/GREEN logs retained.
2. Candidate-set reporting compared only legal inventory compatibility. Fixed by additionally comparing post-tie selection pools and 116 lottery subsets, and splitting newly seeded decisions from context changes among both-seeded decisions. Synthetic fixed-legal-universe/different-subset test RED→GREEN. Actual selection pool differences84/93, newly seeded84/93, both-seeded context changes4/4, lottery subset differences0/4; legal compatibility differences0/93. Previous428 report/data are retained as history;429 supersedes its incomplete interpretation.

## Deferred minor

`hand_plays` names canonical action-card plays and intentionally excludes main/person/world placements (01 lines45–53). Rename or clearer display label deferred. Cost: readers may interpret it as all hand cards consumed; this report supplies the definition.

## Rulings on declined-to-judge items

- Regression verdict was pending during review. Primary requires a new complete manifest/run after fixes; interrupted908 run is not combined with new results. Cost if wrong: incomplete validation; final claim requires actual exit/coverage/status checks.
- Remote and protected inventory were not independently checked by reviewer. Primary verifies remote SHA/tree/blobs/PR and protected505 raw signatures. Cost if wrong: saved state or protected history mismatch; concrete checks are recorded separately.
- Policy strength/adoption/final-game outcomes are outside supported evidence. No adoption/strength claim; all8 stopped results have missing final growth/winner, balance0. Cost if wrong: missed policy improvement, not fabricated evidence.

## Task5 ruling

Reviewer accepts a bounded run/replay adapter with explicit unknown-handler stops, not completed-game evidence.0completed/8stopped/0unexecuted is disclosed. No general engine or full-game comparison is claimed.
