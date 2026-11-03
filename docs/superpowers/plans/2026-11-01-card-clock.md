# CARD GAME Clock Implementation Plan
> **For agentic workers:** Use superpowers:executing-plans task-by-task.
**Goal:** View V17 A inside a match without changing it.
**Architecture:** Pure projection adapter, original renderer, lazy native modal.
**Tech Stack:** Existing ES modules, SVG/CSS, Node and DOM tests.
**Spec:** docs/superpowers/specs/2026-11-01-card-clock-design.md
## Constraints
452 cards, 10 rounds, CPU policies, save schema preserved. Draft and owner-private only.
## Review Focus
Pending CPU, stale load, queued close/reopen, resize/background, seat labels, 0/100 distinction.
## Tasks
- [x] Adapter tests RED→GREEN: canonical seats, explicit swapping, human B, frozen inputs, bounds, restore.
- [x] Renderer reuse and 324-state equivalence/angles/completion badges.
- [x] Toolbar and modal DOM tests RED→GREEN: CPU pause/resume, saved-byte equality, resize, focus, zoom, Escape, restore, hotseat, blur.
- [x] Queued native close regression RED→GREEN; offline retry.
- [ ] Independent review; full CARD GAME and DOM regressions; eight viewport browser checks.
- [ ] Byte-preserving runtime packaging, Draft PR, private Site, CI report.
## Execution record
Initial baseline 548/548 passed. Initial new 9 tests, application DOM and lifecycle tests passed. ENOSPC reset the transient workspace before final regression/preview. Restored same baseline/source, restored implementation and reran checks. Independent review noted short-portrait hand layout after close; onResume applies only hand visibility, without storage writes.
