# Home diorama Implementation Plan

> Execute inline using superpowers:executing-plans. User expressly authorizes continuous design-through-private-publication without intermediate approval.

**Goal:** 3 official regions with living scenery and care-safe individual movement.
**Architecture:** Pure ephemeral model + DOM/SVG adapter; existing WorldScene and Meguru read-only profiles.
**Tech Stack:** Vanilla JavaScript, SVG, CSS, Node test runner.
**Spec:** DESIGN.md

## Global Constraints
No main merge / production Pages updates. No care/stat/save/relationship changes. Preserve official art and attendance. No Three.js dependency. No duplicated conversation subsystem.

## Review Focus
- Actor departs or expression replaces DOM during a drag: cancel stale input and keep present actors only.
- Resize/short viewport: bounds and painted feet stay valid; no teleport caused by repeated layout.
- Care action and relationship animation during movement: stop walking without cancelling approved animation.
- Hidden tab, menu and reduced motion: no autonomous work/catch-up; controls remain usable.
- Dense cast and obstacles: reject impossible destinations, prevent overlap and water entry.

### Task 1: model
- [x] Add tests/home-diorama-test.cjs, run RED.
- [x] Implement home-diorama-model.js: supported(region), createModel({random,onEvent}), sync(actors,scene), select(key), move(key,point,source), step(dt,flags), cancel(), snapshot(). Only plain visual actor descriptors.
- [x] Run model tests GREEN and verify (one reviewed integration commit at delivery).

### Task 2: adapter + landscape
- [x] Test adapter input/lifecycle and Motion v2 gesture guard RED.
- [x] Implement home-diorama.js / home-diorama.css. Reuse meguruMod.REGION3D/WORLDS via bridge; tag-driven local landmarks. Bind existing homeCastActors wrappers and layout frames. Add minimal script.js/index.html hooks, no original game rules.
- [x] Run targeted tests, browser QA and regression suite. Fix observed failures.

### Task 3: delivery
- [x] Document coverage and Safari checklist; update asset tokens/Pages allowlist.
- [x] Fresh whole-branch reviewer; address material issues and verify.
- [ ] Commit/push isolated branch and create Draft PR.
- [ ] Build exact runtime into new owner-private Sites preview; verify deployed status; report actual URLs and limits.
