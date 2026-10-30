# Time Hand Implementation Plan

> Execute inline using executing-plans; user explicitly authorized design decisions, independent push, Draft PR and private publication without intermediate approval.

Goal: A/B/C/D playable comparison and evidence for predictable continuous split placement.
Architecture: Reuse PR492 unchanged. New `prototypes/naopoyo-time-hand` directory imports ABC priorities and renders with reused official assets. Generate an isolated engine from the pinned official blob, replacing only candidate dispatch and adding observation. No production import of experiment code.
Tech: buildless ES modules, Node test runner, canvas, static private Sites.
Spec: user handoff 2026-10-31 (18 sections), summarized below.

## Constraints and design
- Base main 851cf09a; reuse ABC head 814af477. No existing file edits, no main/492 writes, no force push.
- D starts (-dx,-dy), continues last heading, rotates (-vy,vx) only on rejection, tests at most four headings per hop, stores actual trace.
- Generated children block future destinations. Ordinary-empty and official corner/entry policy apply. Children generated as a batch then unchanged settle/merge/overflow.
- At most seven children; min(level-1,power,reachable prefix). Terminate at four rejections. Candidate computation is pure.
- Compare reset-heading vs retained-heading; pass-through generated cells (explicit nonrecommended variant); route-edge caps 2/3/7. Pass-through uses repeated traversal-state detection.
- Atlas and reports calculated from engine, never hand-authored outcomes. Preview has no production storage access. Undo restores experiment inputs only.
- Existing replay failures are compatibility observations, never impossibility proofs. Bounded searches report limits.

## Review focus
- Diagonal corner uses shipped semantics (both orthogonal routes blocked); cardinal and diagonal families never mix.
- Post-turn heading retained; blocked attempt count distinguished from successful path length.
- Rank/route not shown as final landing locations after gravity.
- Power input affects actual split, not only labels; reset/Undo restore editors and predictions.
- Production files byte-identical; ABC baseline results identical; deploy private and verify actual manifest bytes.

## Tasks
- [ ] 1: Add failing `tests/time-hand.test.mjs` for eight headings, straight/turn/closed paths, caps, collisions, mass, gravity, official dispatch. Implement `priorities.mjs`, generate `engine.mjs`, adapt `model.mjs`. Run Node tests and provenance.
- [ ] 2: Reuse comparison UI in new directory; D controls, power, variants, routes/turn/rejection traces, Undo, eight tutorial presets, atlas before/after. Test model and UI contract; browser QA at 320/375/390/430 if available.
- [ ] 3: Generate scenario/atlas data and stage01-20 replay/search witnesses using isolated engine. Validate conservation and each found witness. Record bounded failures honestly.
- [ ] 4: Protection hash audit, ABC tests, official puzzle/CARD/Pages relevant checks. Fresh whole-branch review. Commit/push independent branch; create Draft PR. Package private Site, verify audience/files/QA, record HEAD/tree/CI and final report.
