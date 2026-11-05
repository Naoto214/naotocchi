# VERSION 5 Implementation Plan

Goal: approved dungeon tutorial 01–10; V4 controls/motion remain byte-identical except data binding/save identity and button CSS.
Spec: user request 2026-11-02 PR504 VERSION5, all work preapproved; no interim design gate.
Architecture: existing 8x8 D engine/session/replay; data-only stage and witness redesign, noncolliding CSS dungeon surround, new versioned persistence namespace.

## Constraints
- Never edit formal 01–20, shared painters/session/CSS, D priorities/engine, input or timing.
- No locks, keys, switches, bespoke exit rules, character-specific goals.
- Only existing exact/all exits, walls, spikes, actors, support/gravity and D splitting.
- Existing Draft PR504 only; no main merge/Pages deployment/force push; same owner-only Site.

## Tasks
1. Stage data/witness redesign: 01 movement 02 one birth 03 straight births 04 one turn 05 reunion 06 >=2 turns 07 companion redirects 08 diagonal/corner 09 gravity/recombine 10 synthesis. Test legal witnesses + concrete learning-event evidence. Preserve V4 full stages/solutions and T1–T8.
2. Save isolation/UI: V5 namespace and stage/rule/solution fingerprints; retain untouched legacy keys. New progress starts at 01, old progress stays recoverable. Minimal retry label fitting, CSS-only noncolliding dungeon surround. Regression against V4 protected hashes.
3. Test/review/publish: all new witnesses/replay/save/Undo/unlock, formal suites, CI Runtime/Card/Pages, browser QA where supported, owner-private deployment, hash verification, 22-item report.

## Review focus
- Shortcut to exit bypassing learning: require stage-specific witness learning plus geometry that encourages lesson; do not add hidden objectives.
- Old valid-looking actions replayed on new board: reject fingerprints and use new namespace.
- Reset example position on board or solution changes.
- 5 labels readable at 320 portrait and short landscape; no hit-area collapse.
- Art must not imply collision on walkable board squares or change actor readability.

## Progress
- Baseline verified remote f921fa29/tree9558a1f9; existing isolated worktree checkpoint uses same tree.
- V4 latest CI: chapter/runtime/card/pages passed. No re-audit.
