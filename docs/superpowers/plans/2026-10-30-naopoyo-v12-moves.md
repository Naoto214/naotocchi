# VERSION 12 Move Display Implementation Plan

> Execute inline with executing-plans. The user supplied the full design and authorized implementation, PR482 update and private republication without interim gates.

**Goal:** display the current legal-cell move count while preserving one-stroke Undo.
**Architecture:** render existing `q.state.moves` beside the stage heading. Never derive moves from history length or add saved state. Keep engine/session/progress/examples unchanged.
**Tech Stack:** existing ES modules, HTML/CSS, Node test runner, Sites.
**Spec:** user VERSION12 additional instructions, 2026-10-30.

## Constraints and review focus

One legal cell = one move, one stroke = one Undo. Selection/blocked input/gravity/examples consume no extra moves. Retry zero; save/restore and clear retain existing moves. Preserve 97-move stage20, all other answers and physics. Never write PR436/main/other branches or V11 Site. Check large counts, 320px width, safe areas, grouped/coalesced pointer input, reopened example and persisted active stroke.

## Task: display and verification

- [ ] Extend real app-handler tests: 0→5 in one stroke, grouped Undo, consecutive Undo, rejected input, retry, reload, example isolation, no misleading one-move Undo copy. Run RED.
- [ ] Render a separate count span from `q.state.moves` beside `#title` in index/qa, 13px tabular digits, no wrap and no extra row; remove one-move Undo status wording. Run GREEN.
- [ ] Assert every old/new witness step increments once regardless of split/merge/swap/rescue/fall; completion count equals answer length. Keep originals unchanged.
- [ ] Run chapter/puzzle regression, Pages, full CI (Runtime/CARD), review and mobile browser QA at320/375/390/430 and safe-area inset simulation. Keep exact byte comparisons for protected files.
- [ ] Save to current PR482 with expected-HEAD protection, rebuild from saved commit, update existing owner-private Site and verify all HTTP hashes. Record remaining real Safari limits and final HEAD/tree.
