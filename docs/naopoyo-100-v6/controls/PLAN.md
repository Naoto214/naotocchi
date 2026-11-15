# V6 formal input restoration and gimmick comparison

User specification: 2026-11-15 request in this conversation; explicitly authorizes input restoration and independent visual candidates, not adoption.
Base: fb921fa70b3d73a5e3ce6b4e4cded2df2034fb07. Existing isolated prototype checkout/branch retained; no new checkout required. Draft/base unchanged.
Execution: inline using executing-plans/TDD, one fresh final reviewer. Existing cloud skill scripts are not mounted; use this tracked ledger and normal commands as the equivalent record.

## Design decisions within requested scope
- Reuse unchanged TouchController, BoardInput, GestureHistory, ComparisonPresentation, canonical actor/terrain painters. Add a V6 lab adapter, never route experimental moves through formal physics.
- F1/F2 movement and D1/D2 rules remain authoritative in their existing step functions. Return presentation events from successful flight paths, without changing state or legal moves.
- D2 target soil => dig; a later operation targets opened soil => move. A single pointer event must not dig and move twice. Formal adjacent tap and relative-drag cursor behavior retained.
- Gesture Undo groups transient lab snapshots using the formal GestureHistory. Existing experiment JSON remains byte-format compatible. Optional local-storage sidecar stores gesture boundaries bound to the exact JSON. Old JSON without sidecar restores one action per Undo, since prior format has no gesture information.
- Visual comparison defaults to old art, independent of adopted editor. Candidate only clarifies crate labels, updraft direction, burrow roles, switch-door links and lab terrain affordances. Approved exits/arches/warp/sign and natural environments stay unchanged.

## Tasks
1. RED tests for four variants: taps, drags, regrab, one-stroke Undo/reset, D2 two actions, reduced motion, save compatibility. Implement lab playback/touch adapter and presentation route events; remove direction controls. Full regression, commit/push.
2. Audit seven gimmick categories against atlas/current paint. Build independent old/candidate interactive 8x8 comparison using formal play plus lab adapter; minimal candidate overlays, external readable legend. 36/48 px images and protection/physics-equality checks. Full regression, commit/push.
3. Synthetic real-handler touch tests at iPhone widths; actual browser only if supported tooling exists. Review/fix, CI, package preserving unrelated bytes, owner-private Site update, final report and commit/push.

Review focus: D2 pointerup accidental second move; animation route through rock; visible regrab after long F2 motion; save sidecar tampering/staleness; action grouping across variant/Undo/restore; exact protection of editor and formal renderer.

## Ledger
Research: latest remote matches base; clean checkout. Missing shared input/session in labs reproduces user issue directly. No browser tools/cua_repl.js available in managed environment; no alternate server/browser workaround.
Task 1 complete: shared-input adapter, gesture history and route-only presentation events; no direction buttons. RED missing adapter → GREEN six input/equivalence tests. Full regression 282/282; actual UI synthetic touch at 16 variant/viewport combinations and all four witness playbacks passed. All 1611 reachable fixed-stage states / 17552 move-dig transitions match fb921fa hashes. Existing JSON fields unchanged; local stroke metadata isolated in a sidecar.
