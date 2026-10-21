# Official art and required passages implementation plan

Goal: preserve Rescue mechanics while integrating approved official art and meaningful guardian passages.
Spec: user handoff 2026-10-21; design reference ../../docs/naopoyo-rescue-design-20261021/README.md.
Architecture: shared sprite module for canvas actors/fixtures, existing condition engine, minimal stage walls. No changes to move/release mechanics. GitHub API snapshot from 20aa647dbe705bd09eef34e14b673e320a4cd474.

Constraints: no main merge, Pages, other games, or PNG writes. Save key and version stay v1. Existing fish ID maps to clownfish.

Review focus: prior gate-stage saves; unsupported sprite loads; split/merge mass; gravity during drags; condition strip versus occupying actor.

- [ ] Task 1: tests for four-species save/Undo and legacy stage preservation; extend validation and restore only recognized previous 07/10 geometry, preserving exact old session until retry.
- [ ] Task 2: engine-driven search with permanent closure, victory gate requirements disabled, every cardinal step and release; test negative proof detects old bypass and new fixtures exhaust without rescue. Stage 07 fence, stage 10 fence + fish route; two optional stages 11/12 for penguin/frog. Save/replay all solutions with mass assertions.
- [ ] Task 3: sprites.mjs loads original 32 PNG + owl, padded alpha crop, reports missing images. Render existing actors with official PNG and stage numbers. Replace fixtures with star arch and owl gate, common strip A. Add short rescue particles and preserve reduced motion.
- [ ] Task 4: run full isolated test suite; asset hashes; browser at phone width; independent final review; save only prototype changes to PR412 and update existing owner-private Site.

Ledger: baseline 81/81 passed. Latest main 79d59aece7c91d52387345da737354927df7dc8f; PR CI four successes. Isolated API snapshot because direct GitHub transport unavailable. No main checkout edited.
Ruling: legacy valid 07/10 saves retain their original layout until retry; this preserves progress instead of silently resetting. New starts use required passage layouts.
Ruling: implementation is pre-authorized; no additional planning approval. Use local commits for work checkpoints and API parent/tree for exact upstream save.

Task 1: complete — four-species validation and legacy save tests pass.
Task 2: complete — 12 solutions replay; sealed searches exhausted: 171 / 2754 / 171 / 170 states, zero rescue. Old bypass positive control passes.
Task 3: complete — original 33 PNG SHA256 verified; 32-stage display and fixtures checked at 42px. Owl enlarged after visual QA. Stage11 initially re-split the rear 03 on its return; moved spike one tile right and saved a safe upper route. Engine rules unchanged.
Task 4: verification complete — 127/127 tests, Cloud Chrome pointer/keyboard QA of 07,09,11,12, save reload, Undo; real iPhone pending. GitHub/private deployment follows.
Final review: independent reviewer found no critical/important issues.
Final: minor (deferred): sprite-load warning can be cleared by a successful interaction; reload is needed if a network error hides sprites.
Final: minor (deferred): rescue ring currently flashes all exits on multi-exit stages.
Final: Ruling: keep legacy stage bypass only for recognized existing sessions — protects progress; users must retry to test new terrain.
Final: Ruling: real iPhone Safari cannot be certified by desktop Chrome — explicitly leave touch feel and legibility to owner QA.
Final: Ruling: preserve owner-private access and use successful native deployment status as availability evidence — hosted URL is not reachable from the managed QA browser.
