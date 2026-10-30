# VERSION 12 normal-play pause removal Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this bounded update.

**Goal:** Remove normal-play manual pause and white cover; retain example playback controls.
**Architecture:** Delete userPaused, its UI writes/click handler and both HTML nodes. Keep session.paused for hidden pages, dialogs and example playback. Resume the existing animation queue without replaying elapsed background time.
**Tech Stack:** Buildless JavaScript modules, node:test, browser QA.
**Spec:** User instruction 2026-10-30, recorded below.

## Global Constraints
Only feature/naopoyo-v12-quality / PR482 and its existing owner-private Site may be updated. No changes to PR436, PR483, main, Pages, shared physics or example answers/controls. Keep one cell = one move, stroke Undo, persistence and progression.

## Review Focus
- Background interruption during a held stroke: commit once, release pointer, retain Undo.
- Return during split/fall/merge animation: same logical state, finish retained visual queue.
- Dialog/example open on return: normal board remains internally suspended until close.
- Reload after interruption: moves, board and history retained.
- Small screens after button removal: no clipping or unused fixed control slot.

### Task 1: Remove manual pause and verify lifecycle
Files: prototypes/naopoyo-chapter2/{app.mjs,index.html,qa.html,tests/contact-app.test.mjs}.
- [x] Run baseline contact-app and quality-v12 tests. Expected: 22 pass.
- [x] Make DOM harness omit removed pause/paused elements; assert Undo, next move and save/reload still work. Expected before change: initialization fails on removed UI.
- [x] Add lifecycle cases for visibility/pagehide/pageshow, real pointer/animation/Undo and dialog/example isolation.
- [x] Remove normal HTML controls, userPaused and click handler. Keep pauseState internal gating; reset fractional clock and draw on page return.
- [x] Run all puzzle suites, Pages tests, audit/design/build; use CI for full runtime and CARD regression. Expected: no failures.
- [x] Browser QA at 320/375/390/430 plus landscape; test real input, Undo, reload, example playback/position and all answers. Record actual Safari limits.
- [x] Review, commit and push only PR482, update private Site and compare deployed hashes. Record HEAD/tree/CI/deployment in report.
