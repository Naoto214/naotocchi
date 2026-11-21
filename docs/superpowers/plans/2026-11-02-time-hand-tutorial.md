# Time Hand Tutorial Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. User authorized implementation and publication without intermediate approval.

**Goal:** Eight playable lessons before any production adoption.
**Architecture:** Copy PR494's isolated D engine and placement policies, preserving official dependencies read-only. A tutorial session records legal moves and replays them for save/Undo; lesson success comes from real split observations and resolved states. Canvas uses official sprites and fixtures.
**Tech Stack:** Buildless ES modules, Node tests, Sites private static hosting.
**Spec:** `docs/naopoyo-time-hand-tutorial-20261102/SPEC.md`

## Global Constraints
- Do not change main, PR494, production levels/physics/solutions/save format or Pages.
- D retains heading after clockwise 90-degree turns, blocks generated actors, max seven.
- 8 lessons, tap/drag/stroke, Undo/retry, lesson navigation, path/settled views, independent storage.

## Review Focus
- Failed move and Undo during pointer gestures must never add moves or resume stale gestures.
- T4 must require moving the frog; target cannot pass from unrelated movement.
- T8 cannot pass just by reaching the exit without splitting and recombining.
- Corrupted save cannot inject a changed physical rule or arbitrary clear state.
- Small landscape must keep controls and board accessible.

### Task 1: Engine provenance and lesson sessions
Files: Create `prototypes/naopoyo-time-hand-tutorial/{engine,priorities,abc-priorities,lessons,session}.mjs`, `tests/tutorial.test.mjs`.
Interfaces: `lessons`, `TutorialSession(index)`, `step(id,dx,dy)`, `undo()`, `reset()`, `preview(id,dx,dy)`, `serialize()` and `restore(raw)`.
- [x] Write failing behavior tests for lessons, clear guards, save and Undo.
- [x] Copy proven D engine and implement eight boards and action replay session.
- [x] Run Node tests and verify literal paths, conservation and all witnesses.
- [x] Commit isolated implementation.

### Task 2: Playable UI
Files: Create `index.html`, `style.css`, `app.mjs`, `draw.mjs` and input tests.
- [x] Test actual pointer-to-cell route consumer, including stale gesture cancellation.
- [x] Implement tap, drag/stroke, selection, eight-direction buttons, step count, lesson tabs, hints and split/settled views.
- [x] Verify real preview at requested widths and landscape; distinguish unavailable checks.

### Task 3: Delivery
Files: Create dedicated workflow, build script and REPORT.md.
- [x] Run tutorial, official puzzle, CARD, Runtime, Pages checks; report all failures.
- [x] Fresh review, fix material findings; verify only new files changed.
- [x] Commit and push independent branch, create Draft PR.
- [x] Publish owner-private Site, compare package hashes, inspect CI and record final HEAD/tree/limitations.

## Execution record

Implemented inline with one independent read-only reviewer. Native git push was unavailable; GitHub connector created the identical tree, commit and dedicated branch. No force push.

Ruling: preserve existing official physics and copy PR494 engine byte-identically. No change to official files.

Ruling: short viewports may scroll vertically; all controls remain reachable and horizontal overflow was absent in seven real browser iframe sizes. Native iOS device checks remain unverified.

Ruling: gate-corner test corrected to place the gate roof on the crossed edge; original expected blocked route was in fact legal under unchanged official physics.

Review fixes: real frog steering required, failed pointer-down cancels, callback cancellation cannot rearm gesture. Each reproduced RED then GREEN. Final dedicated suite36/36. No deferred reviewer minor findings. Reviewer deferred actual native device QA, reported explicitly.

CI: tutorial, puzzle1529, CARD572, Pages build success. Full Runtime/Home/World status recorded in REPORT.md.
