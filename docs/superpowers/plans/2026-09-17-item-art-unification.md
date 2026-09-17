# Item Art Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish all 27 item images as one character-compatible set, including shared sizing and actual-screen review.
**Architecture:** A dedicated item image manifest and item-only renderer isolate changes from shared UI atlases. Normalized PNG masters share transparency, footprint and render sizing. Existing motifs are retained, with four imagegen replacements and seven native light revisions.
**Tech Stack:** Vanilla JS/CSS, Node tests, PNG assets, existing visual QA fixtures.
**Spec:** docs/art/item-art-unification-spec-20260917.md

## Global Constraints
- All 27 existing images are in scope; 16/7/4 measures effort, not exclusion.
- Character, partner and companion art is the highest reference.
- Names/effects/prices/save schema and non-item UI symbols remain unchanged.
- Transparent 128px masters; visible long-side extent 104–112px, with shape-appropriate optical correction.
- Shop frame 40px; home frame and collision/ring layout unchanged.
- Do not merge or publish. Preserve unrelated work.

### Task 1: Dedicated assets and item-only rendering
**Files:** create assets/items/unified/*.png, assets/items/unified/manifest.json, tools/build-item-art.cjs (if needed), tests/item-art-unification-test.cjs; modify script.js, ui-illustrations.css, existing affected tests and version references.
**Interfaces:** parent supplies assets/items/unified/sources/{bento-box,toy-box,first-aid-box,game-pass}.png after imagegen. Manifest maps all 27 IDs to assets/items/unified/<id>.png. Renderer handles ordinary equipment/goal/consumable/sticker pack paths without altering generic icon mappings.
- [ ] Read spec, current item renderer, sticker rendering, fallback loading and relevant tests.
- [ ] Write a failing behavior test that captures all 27 dedicated item identities, distinct time directions/egg classes, source files, and fallback behavior; verify RED.
- [ ] Normalize the 16 retained images from existing atlas crops using Node image tooling, retaining approved artwork. Edit native light-revision symbols for the seven, with character-compatible fine contours/shading and distinguishable motifs. Parent handles four raster redraws; don't create placeholders for those finals.
- [ ] Route all item-specific contexts, including shop, home equipment and sticker item visual callback, through the dedicated assets. Ensure regular sticker-pack button uses its own art. Fix shop frame to 40px, isolate from home/other icons.
- [ ] Run focused tests then full npm test after final assets exist. Update version references via existing bump tool. Document provenance and per-item changes.
- [ ] Commit code and asset changes made by implementer only. Report spec and quality concerns.

### Task 2: Image generation and visual convergence (controller)
**Files:** four imagegen source files above; docs/art/item-art-unification-review-20260917.md.
- [ ] Redraw the four priority images, using existing motifs and character/atlas references; transparent background, fine pixel texture, shallow light from upper-left, no glossy vector style.
- [ ] Inspect each image, refine if visibly inconsistent, and give exact source paths to Task 1.
- [ ] Inspect the complete 27-item sheet and actual shop, each equipped item with pet, and full cast at representative phone dimensions.
- [ ] Make additional targeted adjustments for observed outliers. Rerun only impacted tests plus required complete gate at final head.
- [ ] Independent review, persist exact head/tree/test evidence and open Draft PR. No merge.
