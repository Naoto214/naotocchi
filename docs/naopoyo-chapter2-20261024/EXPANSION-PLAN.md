# Chapter 2 14–20 implementation plan

Goal: preserve chapter one and the 11–13 Pilot, repair gate occupancy, add seven insight puzzles with real-engine witnesses and a private iPhone trial.
Architecture: keep v2 as the single engine, ForestSession/ForestProgress as the isolated Pilot. Gate legality covers both sides of overflow before mutation. Stage design uses authored mechanisms plus bounded exact search, with no new gameplay rules.
Tech: buildless ES modules, Node tests, GitHub CI, private Sites.
Spec: user request in this Work, 2026-10-24; existing DESIGN-AND-AUDIT.md and NEXT-14-20.md.

## Constraints
- No main merge, production deployment, chapter-one stage/UI/save modifications.
- Destination-only eight directions; known gravity/spike/split/overflow rules unchanged.
- All seven boards need replayable all-rescued witnesses. Human difficulty remains provisional.
- Normal/QA storage separate; permanent IDs and previous unlocks retained.
- Isolated fix branch first; integrate into existing #436 only after regression.

## Approach
Authored structural candidates + exact real-engine search is selected under the user's autonomous authorization. Random board generation would optimize search effort rather than insight. BFS proves shortest paths for bounded boards; larger candidates use a bounded best-first witness search and separately report lack of optimality proof. IDA* without a strong admissible heuristic repeats expensive transitions; constraints-only solving would duplicate engine semantics.

## Tasks
- [ ] 1. Gate repair. `prototypes/naopoyo-v2/engine.mjs`, new `tests/gates.test.mjs`: RED for overflow returning 4 to exact-8 source gate, manual/external/fall/diagonal paths, save validation, resulting merge on gate. GREEN with common gate predicate and preflight; existing puzzle suite.
- [ ] 2. Search/design. `prototypes/naopoyo-chapter2/solve.mjs`, candidate generator/auditor and fixtures. Verify canonical state keys against ID-sensitive fall order, bound exploration, replay positional witnesses. Compare structurally distinct stage-20 candidates and mechanism ablations; retain rejected candidates.
- [ ] 3. Stages 14–20. `stages.mjs`, witness JSON and tests. Distinct core insights, stable initial states, invariant mass/gate legality, complete witness, three hints, constrained artwork. No new later-chapter mechanics.
- [ ] 4. Pilot progression and layout. Existing dynamic stage list plus regression for 13→20, restored unlocks, QA separation, interrupted drag/Undo/Retry, narrow viewport and safe area. Keep prior saves, backup invalid gate snapshots.
- [ ] 5. Validation/review. All puzzle suites, npm test, CARD, Pages, existing CI. One independent final review; fix material findings with RED→GREEN. Record exact limits and iPhone hardware not tested.
- [ ] 6. Save/deploy. Commit/push #436, update body/CI. Rebuild private Site through supported Sites flow, preserve owner-only audience and URL; verify version/hash and stage entry.

## Review focus
Overflow-induced source gate changes; restored invalid gate snapshots with valid history; solver state equivalence under dynamic child IDs; apparently difficult but optional mechanisms; mobile title/button overflow and uninterrupted drag.

## Ledger
- Latest main 92ac654; #436 cd66a7a, draft and mergeable; no AGENTS.md found.
- Reproduced: 8 enters (2,7), merges right into 4, remainder 4 placed on exact-8 gate; validState accepts. No diagonal corner-rule change needed.
- Ruling: use fresh isolated checkout + fix branch, then integrate existing PR; user explicitly authorized isolated engine fixes and no intermediate approvals.
