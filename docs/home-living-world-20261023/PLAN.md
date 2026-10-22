# Living Home Implementation Plan

> Execute inline with superpowers:executing-plans; final independent review.

**Goal:** A visible living 3-region Home, on existing Draft #426 and private preview.
**Architecture:** Shared Meguru renderer and geometry; Home composition/camera; separate visual simulation and DOM cast control.
**Tech Stack:** existing JavaScript, Three 0.170.0, Node tests, cloud-browser QA.
**Spec:** DESIGN.md

## Global Constraints
No main merge, Pages update, care rules, saved traits, relationship or attendance changes. Keep owner-only Site and isolated preview save keys. No duplicated PR.

## Review Focus
- Rerenders or busy motion permanently starving autonomy.
- Drag selection triggering legacy click/conversation or losing pointer capture.
- Water/road motion outside permitted domain, cast entering background props.
- Async world load/context loss or hidden resume leaking renderers/timers.
- Visitor departure, resizing, and equipment/poop depth.

### Task 1: Shared environment and Home composition
- [x] Test pure layouts and ecology routes, immutable Meguru inputs, bounded population and inactive time.
- [x] Implement home-world.mjs and world-life.mjs; add opt-in environment-only renderer, fixed camera and ambient hook.
- [x] Integrate full-viewport canvas with home adapter; remove old SVG/background for Pilot only.
- [x] Run Node environment tests and inspect actual browser renderer, including fallback visibility.

### Task 2: Cast autonomy and direct manipulation
- [x] Reproduce deadline starvation and select/drag interruption with runtime/adapter tests.
- [x] Add per-actor activities, temperament copies, anti-repeat memory, social spacing, explicit priority and recovery.
- [x] Compose gestures with Motion v2; correct input routing and foreground poop.
- [x] Test actual care, Conversation v2, visitor conditions and state immutability.

### Task 3: Evidence and delivery
- [x] Run focused and project regression suites; regenerate version tokens and runtime allowlist.
- [x] Capture before/after and >=60s per-region visible metrics/frames; test hidden recovery and bounded model memory. Actual Safari hidden recovery and long-run GPU memory remain unverified.
- [x] Independent review, fix material findings, commit/push existing branch and update Draft description.
- [x] Package exact source into existing owner-private Site and deploy version 2; verify deployment success and anonymous sign-in gate.
- [ ] Authenticated post-deployment display/motion: blocked by sign-in; not counted as passed.
- [ ] Human iPhone Safari acceptance: all real-device gates remain unverified.
