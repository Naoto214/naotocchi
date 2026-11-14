# Home movement V1 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. User authorized continuous implementation without further design review.

**Goal:** Expand individual safe movement ranges without shrinking characters or changing UI.
**Architecture:** Freeze existing presentation fitting inputs; compute per-actor visible-foot limits through that presentation, retaining terrain safety. Keep all test controls in disposable QA output.
**Tech Stack:** Existing JavaScript/CSS, Node tests, project browser runner, static Sites hosting.
**Spec:** docs/superpowers/specs/2026-11-15-home-movement-v1-design.md

## Global Constraints
- No main merge or production deployment; independent Draft and owner-only comparison.
- No asset, character size, evolution, save, UI or 76px speech-lane changes.
- Preserve autonomous/drag/selection behavior and maximum 28 residents.

## Review Focus
- Resizing/orientation and late image load must invalidate boundary caches safely.
- Facing and walking animation must not clip asymmetric attachments.
- Small screens must not silently shrink bodies to gain movement space.
- Multiple actors must preserve shared collision routing.
- Unknown or invalid geometry must fail conservatively.

### Task 1: Baseline and comparison harness
- [ ] Build disposable A/B entries from pinned baseline 408c72e and branch runtime; isolate saves.
- [ ] Add screenshot-inspired fixtures and boundary measurements in tools/home-movement-v1.
- [ ] Record baseline geometry and test failures demonstrating unnecessary limits.

### Task 2: Individual display boundaries
Files: home-production-diorama.js, home-production-model.js only if required, tests/home-movement-bounds-test.cjs.
Interface: pure displayWalkingBounds({base,ink,presentation,stage,safe,navigation}) returns safe bounds or original base on invalid/unsupported inputs.
- [ ] Write failing tests for asymmetry, fixed body scale, vertical limits, missing geometry, and shared autonomous/drag use.
- [ ] Run RED, implement minimal boundary calculation, run GREEN plus existing home regression.
- [ ] Keep baseline presentation envelope inputs unchanged to avoid a fit/bounds feedback loop.

### Task 3: Full comparison and verification
- [ ] Add controls, debug toggle, exact old/new bounds and measured viewport dimensions.
- [ ] Sweep requested widths, characters, items, UI visibility, multiple actors and input modes; preserve numeric evidence.
- [ ] Run project suite, diagnose failures against baseline, review whole diff.
- [ ] Commit/push independent branch, create Draft PR, publish only new owner-private comparison and report results/limits.
