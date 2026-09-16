# Salmon Expressions Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans. The user already approved complete production batches without stage-by-stage approval.

**Goal:** Add salmon's eight stages and ten independent facial expressions per stage, preserving the completed 640 expressions.

**Architecture:** Extend the existing expression allowlist, canonical stage names and disposable preview. Reuse the normal sprites, state semantics, outlined accent colors and original-bounds normalization. Observe anchors from the original coordinate grid, then generate placement only for salmon.

**Tech stack:** Browser JavaScript, Node tests, PNG sprites, SVG accents, existing Sharp tooling.

**Spec:** docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md and the current production-first user handoff.

## Global constraints
- Keep PR278 Draft; never merge main. Preserve the pre-existing conflict.
- Baseline GitHub HEAD adbb5fc0ec262184694fa3c1212b867c3f4d2a86; verified tree64ec3a31414e662fbdb2fc5e3438cc7509cc6245. Latest main observed bcdd6a6811ce8255ef16895ffff26f53b89d1478. Latest HEAD Actions/status lists empty, not successful CI.
- Preserve prior640 PNGs, references, SVGs, all64 placement entries and the81 prior selected corrections.
- No changes to normal assets, gameplay numbers, romance conditions or save format.
- Use one original-referenced transparent image edit for each expression. Keep yolk sac, fins, stripes, silver/red/brown stages and the older hooked jaw.
- Existing sweat placement constraints remain documented; collision-free does not establish ideal real-device appearance.

## Task 1: Artwork and coordinates
- [x] Inspect all eight originals and their coordinate grid.
- [x] Generate80 separate PNGs for happy/strained/hungry/sick/tired/sulky/weak/critical/wantsPlay/sleeping.
- [x] Normalize to transparent128x128 and each original's bounds, using tools/normalize-expression-image.cjs.
- [x] Record exact prompts and hashes; inspect all80 facial variants for obvious malformed art.

## Task 2: Runtime and preview
- [x] Add meaningful RED tests for all8 salmon stages using existing routing and disposable-preview tests.
- [x] Extend pet-expression.js allowlist, tools/expression-stage-names.json, tools/cat-expression-preview.cjs, contact sheet/gallery species labels and runtime/PNG test matrices.
- [x] Reuse the existing yellow fish food accent; preserve shared semantics and every old SVG.
- [x] Run focused tests; defer image-dependent tests until all assets exist.

## Task 3: Placement and delivery
- [x] Add only salmon anchors to tools/expression-face-anchors.json. Run node tools/place-expression-marks.cjs salmon after images exist.
- [x] Inspect80 marked composites; fix clear overlaps while retaining existing64 placements.
- [x] Run tools/check-expression-placement.cjs, existing preservation checks, image tests and final npm test; record failures honestly.
- [x] Prepare QA/manifest and the verified tree for the same Draft PR; enforce the GitHub head/tree and CI delivery gate recorded in QA. Final remote verification is recorded in the PR update and handoff.
- [x] Refresh the same owner-private Site and mark-review gallery, starting at salmon with an80-image current-batch filter. Verify archive completion and gzip integrity before upload; confirm terminal deployment success.

## Execution notes
The prior code checkout was absent. Runtime/assets were recovered from the existing Site source and checked against GitHub blob hashes. Historical documentation binaries may remain sparse locally; their original tree entries must be preserved in every saved tree. No missing historical file is a deletion.
