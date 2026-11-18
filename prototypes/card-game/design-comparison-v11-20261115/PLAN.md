# VERSION 11 Implementation Plan

> For agentic workers: use executing-plans task-by-task. Research is delegated independently; UI implementation remains with the owner.

Goal: Preserve the existing UI, enlarge and normalize numeric information, restore the formal egg face text, audit current names and historical art provenance.
Architecture: V11 references V10 assets and renderer; a narrow card adapter, CSS and fitting helper override only the requested card internals. Existing UI is reused. Egg-only duplicate external copy is removed from the preview under explicit user instruction. No production changes.
Tech Stack: native ESM, HTML/CSS, existing Sites static build, Node assertions, Chromium UI QA.
Spec: user's VERSION 11 instruction in this thread (2026-11-15).

## Constraints
V1–10, PR498, main, formal data/names/IDs/rules/CPU/clock/save remain unchanged. Owner-private publication only. Images reused. Numbers text based; no hand/brain asset deletion. No new detail UI.

## Review focus
- Two-digit stats, zero and narrow digit 1: equal scale and ink-centered values.
- Reduced hand widths and detail transforms: digit centering uses unscaled measurements.
- Egg normal/details: no normal body, formal printed short effect only in card; no outside duplicate.
- Long main effects: enlarged stats do not narrow body region or hide its last line.
- History claims: commit/path evidence and current runtime resolution, distinguish naming from drawing drift.

## Tasks
- [x] Recover V10 Site, inspect latest main/PR state and source provenance.
- [x] Name/art history audit with full affected-series list and recommendations; no renaming.
- [x] Reproduce small/uneven numbers and egg copy duplication; add behavior checks.
- [x] Implement V11 adapter/CSS and existing UI integration, baseline/current comparison.
- [x] Validate 459 cards+egg, 4 widths, real selection/flip/back; targeted regression.
- [x] Save to PR551, publish privately without altering V1–10, report evidence and limitations.

Validation completed; source save and owner-private deployment are the final steps. See REPORT.md for measured scope and limitations.
