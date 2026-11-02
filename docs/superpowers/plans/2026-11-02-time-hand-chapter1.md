# Time Hand Chapter 1 Implementation Plan
> Execute inline with superpowers:executing-plans. User explicitly approves design, implementation, draft PR and owner-private publication without intermediate approvals.

**Goal:** Playable independent dungeon chapter, ten stages, lover rescue and all-actor escape.
**Architecture:** Copy PR503's isolated D engine byte-for-byte. Add chapter session wrapper for objectives, cage/pads, action replay and gesture Undo; retain production imports read-only for art and fixtures. Separate origin and save key.
**Tech Stack:** Buildless ES modules, Canvas, Node test runner, private Sites.
**Spec:** User request (2026-11-02), summarized below.

## Global Constraints
No main or published stage/save/solution changes. No push to PR494/503. Ten stages only; 100-stage roadmap is documentation. No gender or romance-profile writes. Stage10 sample actors are interchangeable representation, not canonical identities.

## Design
Reuse PR503 physics rather than fork formal production or replace physics. Draw on existing sprite/stone/gate/exit assets; procedural dungeon surround varies across four chapter phases. Explicit rune goals teach each mechanic before the exit opens, with progress visible. Stage10 level-qualified seal opens the cage; released partner activates second seal, everyone then exits. Undo replays whole gestures, including cage/goal state. Witnesses contain actual actor IDs/directions and are verified by the same session class. Persist actions; never trust saved arbitrary board state. Replays have separate sessions and position fingerprinted by solution.

## Review Focus
- Saving mid-gesture must retain valid undo groups.
- Captive cannot move/swap/escape before release.
- Undo and retry reverse rescue and switch state.
- Demo never writes progress/unlocks.
- Narrow/short/landscape layouts keep all controls reachable.

### Task 1: chapter state and stages
- [x] Tests fail for missing chapter session/stages.
- [x] Add stages.mjs, session.mjs; exact D dispatch retained.
- [x] Verify objectives, cage/partner seal, atomic restore and gesture Undo.
### Task 2: ten legal witnesses
- [x] Add solutions.mjs and replay.mjs. Verify each move, per-species mass, all-actor escape and objective events.
- [x] Check known witnesses for naturalness; label confirmed, not shortest.
### Task 3: playable presentation
- [x] Add app.mjs, index.html, style.css; adapt draw.mjs with dungeon scene/cage/switches.
- [x] Persistent sequential unlock, tap/drag/stroke, replay previous/next/autoplay/pause/position retention.
### Task 4: validate and deliver
- [x] New physics/session/replay suite, published puzzle and CARD/runtime/Pages checks, independent review.
- [x] Browser QA sizes + pointer interactions; record device limitations.
- [x] Add independent CI; commit/push new branch, create Draft PR.
- [x] Package private Site, verify delivery bytes and access; report all remaining limits.

## Execution ledger
Task1-3 complete: 32/32 tests, ten normal and demo browser clears. Review fixed live selection changed by demo; browser RED→GREEN. Task4 private deployment and byte verification complete; full runtime CI pending at report time. Local sparse regression failures retained in LOCAL-ATTEMPTS.md. User supplied explicit execution/publication approval.
