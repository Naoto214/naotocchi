# Naopoyo split priority implementation plan

> **For agentic workers:** Use superpowers:executing-plans. User authorizes execution and private publication without intermediate approval.

**Goal:** Predictable split-placement comparison, with production A intact.
**Architecture:** New experiment directory only; generated engine copy changes candidate dispatch and optional observations. Official engine, stages, witnesses, storage and Pages allowlist remain byte-identical.
**Tech Stack:** Native ES modules, Node test, canvas, buildless private Sites.
**Spec:** User handoff dated 2026-10-30; decisions and detailed evidence in docs/naopoyo-split-priority-20261030/REPORT.md.

## Global Constraints
- Base main 851cf09a80c7ed41ba7293888084272917e4582c, independent experiment branch and Draft PR. Never merge or deploy Pages.
- No production save APIs or service worker. Browser data is memory only.
- Same initial state and action for A/B/C, distinguish spawn from gravity snapshots.
- No stage or official solution edits. Limits are not impossibility proofs.

## Review Focus
- Gate top and corner legality versus occupied intermediary cells.
- B has 16 ray candidates, not a silently filled 24-cell BFS.
- C fixed rank remains fixed when an earlier path is blocked.
- Seven simultaneous children can occupy intermediary cells because the candidate list is computed before spawning.
- A differential state/events equivalence and byte protection of official files.

### Task 1: Engine policies and observations
- [ ] Tests first: official A differential in all directions and randomized boards; B no jump; C alternate routes, stable ranks; mass and gravity.
- [ ] Implement priorities.mjs, generated engine.mjs and sync-engine.mjs with exact source guard.
- [ ] Run node --test prototypes/naopoyo-split-priority/tests/*.test.mjs.

### Task 2: Evidence and compatibility
- [ ] Fixtures for ten obstacle situations, eight directions and two gravity modes.
- [ ] Audit all 30 stored witness replays, first divergence, split/merge/overflow metrics.
- [ ] Bounded alternative witness search and engine replay, save experimental witnesses only.
- [ ] Generate machine-readable rank/path atlas and standalone diagrams from candidateDetails.

### Task 3: Interactive comparison
- [ ] Model tests for phases, reset, obstacles and prediction scoring.
- [ ] Build 8x8 touch UI, formal sprite/terrain renderers, A/B/C, eight headings, seven-child steps, prediction and tutorial.
- [ ] Package only referenced assets; browser verify controls and responsive widths where environment permits.

### Task 4: Review, verification and delivery
- [ ] Regression puzzle/CARD/runtime/Pages; protection and standalone tests; independent whole-branch review.
- [ ] Commit/push only new branch, Draft PR with CI evidence. Private Sites save/deploy and URL.
- [ ] Final report with honest unresolved search/device verification limits and exact HEAD/tree.
