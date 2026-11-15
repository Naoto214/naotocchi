# Home movement VERSION 3 implementation plan

> Execute inline with superpowers:executing-plans. User waived repeated design approval.

**Goal:** Improve actual pointer/autonomous reach from PR #555 while preserving safe V2 endpoints.
**Architecture:** Keep display bounds, camera and collision predicates. Compare city polygon proposals separately from route-search changes. Adopt only evidenced safe expansions. Pin previous runtimes in disposable comparison fixtures.
**Tech Stack:** Existing JS model, ES module navigator, Playwright pointer tests, static owner-private comparison.
**Spec:** User VERSION 3 request; baseline docs/qa/home-movement-v2/README.md.

## Global constraints

No changes to #554/#555, main, game production, 52 backgrounds, art sizes, UI, 76px speech lane, camera or saves. Preserve fixed grid and V2 safe paths. Unsafe expansion is rejected with evidence.

## Review focus

- A nearer but unreachable endpoint must not hide reachable detours.
- A narrower grid must not permit collision crossings.
- Added polygon territory must not change existing depth/camera fit.
- Equipment/speech/reflow must keep ink in the protected frame.
- Dense initial layouts and transient occupants must not cause overlap or unbounded retries.

## 1. Investigation (commit/push)
- [x] Read baseline and route/bounds code; run baseline tests.
- [x] Overlay existing geometry on all 52 backgrounds; compare city unchanged / small extension / shaped extension.
- [x] Record active lower/left/upper constraints from identical pointer fixtures.

## 2. Prototype (commit/push)
- [x] Add failing navigator tests for missed detours, unreachable nearest candidates, collision barriers and preserved V2 routes.
- [x] Add bounded route/candidate fallback in home-route-navigation.mjs and home-production-model.js; preserve old successful routes as fallback.
- [x] Prototype polygon choices only in QA until their naturalness is checked. Keep depth and display bounds unchanged if no safe extra margin is evidenced.
- [x] Run tests and record rejected proposals.

## 3. Verification (commit/push)
- [x] Pin A/B/C runtime revisions and D current source in tools/home-movement-v3.
- [x] Run same pointer trials at widths320/375/390/430; assert no V2 directional regression; record feet and ink.
- [x] Exercise autonomy, 28 residents, equipment/speech/notice toggles and all region/daypart transitions. Record limitations.
- [x] Refresh changed asset hashes and run relevant existing checks.

## 4. Comparison and delivery (commit/push)
- [x] Owner-only four-version overlay with polygon proposal comparison, foot/ink/bounds visibility and equipment/speech controls; include disposable playable fixture if feasible.
- [x] Independent Draft PR with numeric actual reach results, constraints and provenance.

## Execution ledger

Investigation saved401df137/1656a022; prototype bed6e96f and city triangle commit. Fixed-grid supplement passed real-pointer regression replay for all8cases. 52region/daypart cases passed. Important review fixes: retained new-ground sync RED→GREEN, missing legacy candidate fallback RED→GREEN. Review Minor: old polygon ablation cache unsupported, excluded from evidence. Publication and final Draft PR recorded in QA README.
