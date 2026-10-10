# World planting clearance Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. User authorizes implementation and meaningful branch checkpoints without intermediate confirmation.

**Goal:** Separate existing residential ground planting from decks while preserving its grouping and safe road/entrance space.
**Architecture:** One build-time descriptor pass after existing garden dressing. Translate existing ground flower groups and individual shrubs only when they intersect low structural boxes; bounded candidates must clear canonical paths/colliders/spots, structural boxes and entrance stones. No renderer or canonical world changes.
**Tech Stack:** Existing JavaScript descriptors, Node tests, existing World CI.
**Spec:** `docs/qa/meguru-3d-flower-height/continuation.md`, especially Next concrete visual work and user World lane instructions.

## Global Constraints

Draft PR374; no Ready/merge/Pages/save/schema/Character/Expression changes. Preserve all canonical semantics and geometry counts. Human QA remains unapproved. Maximum translation60 world units; retain original group unchanged if no safe candidate.

## Review Focus

Rotated houses: use box-local distance.
Blocked road-side plots: retain group when no candidate fits.
Elevated window flowers: never move them.
Home garden approaches: preserve stones and entrance clearance.
Repeated descriptor generation: deterministic, canonical world unchanged.

### Task 1: Shared ground planting clearance

Files: modify `meguru.js`, `tests/meguru-3d-visual-quality-test.cjs`, cache token in `index.html`; update existing World workflow BEFORE to f7ffdff; evidence in `docs/qa/meguru-3d-plant-clearance`.
Interface: `clearHousePlanting3d(world, objects)` mutates only ground flower/shrub dx/dz in house descriptors after garden dressing; no exported API.
- [ ] Write regression for representative farmhouse deck clearance; run and retain RED.
- [ ] Implement bounded grouped translations with actual box orientation and clearance checks.
- [ ] Verify representative clearance plus unchanged counts/shapes/elevated flowers, bounded translation, road/collider/spot/stone exclusions and deterministic generation across13regions.
- [ ] Run World suites, protection snapshot, geometry audit; independently review diff.
- [ ] Freeze cache hashes, run full npm test, save product commit/push; collect existing CI captures/smoke/corridor/visibility/regression and source-fixed evidence.
- [ ] Inspect matched images and performance, record residual intersections and Human QA limitations, save evidence checkpoint.
