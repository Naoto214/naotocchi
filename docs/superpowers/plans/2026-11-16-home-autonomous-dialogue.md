# V5 autonomous dialogue repair implementation plan

> **For agentic workers:** Use superpowers:executing-plans for native execution. User has authorized implementation and conditional production integration; no additional design gate.

**Goal:** Restore real autonomous conversations without sacrificing V5 travel, collision safety, or UI.
**Architecture:** Keep the 100 native-pixel conversation predicate and existing route/movement solver. For approach/together only, choose a nearby destination inside that radius using the existing separation, visibility, terrain and bounds predicates. Keep random action selection and random consumption unchanged. Arrival still requires the actual chosen listener to be idle, unheld and outside manual control.
**Tech Stack:** Existing JavaScript model, Node test runner, Playwright Chromium/WebKit, GitHub Actions/Pages.
**Spec:** User's VERSION 5 integration autonomous dialogue regression repair request; prior evidence in docs/qa/home-v5-production.

## Global constraints
- Do not change V5 boundaries, collision ellipse, display size/depth/order, save schema, images, dialogue/UI, or add yielding.
- Do not weaken seed 1182, 180-second wait or existing test assertions.
- Keep PR #561 as integration branch; merge/deploy only after important tests pass.

## Approaches
1. Increase conversation range: rejected; obscures incorrect destinations and can cause distant conversation.
2. Change collision or V5 geometry: rejected; violates protection scope.
3. Constrain only social approach targets to safe conversation positions: selected as implementation judgement within the user's requested repair.

## Review focus
- Large/wide residents: a safe vertical/diagonal approach may exist while lateral approach does not.
- No feasible meeting position: refuse social approach, preserve normal actions and collision safety.
- Moving/manual/held listener: arrival must not force conversation or move the listener.
- Route compensation: actual arrival and real social event, not the requested point, determine success.
- Crowding/equipment: valid conversation opportunities are needed, not a guarantee every pair can meet.

## Task 1: Reproduce and repair social destination selection
- [ ] Add model regression using observed dog/shiba sizes, assert real social events after movement and unchanged ellipse separation throughout.
- [ ] Add wide, impossible, manual/held-listener and V5 manual endpoint preservation cases; run to establish failures.
- [ ] Implement a private social destination selector in home-production-model.js. Preserve valid original targets; otherwise search a bounded set of angles inside 100 with contact clearance. Use normal move/step unchanged.
- [ ] Run new and existing movement/terrain tests; run unchanged seed1182 actual browser test in both engines.

## Task 2: Verify and publish conditionally
- [ ] Record real social/arrival/distance and results for multiple seeds, combinations, equipment and 4/10/20/28 casts. Do not synthesize events.
- [ ] Compare manual movement endpoints to unmodified V5, rerun all npm test stages and Pages tests/build. Update only model/index cache hash and allowlist source pins.
- [ ] Save code, tests and report to #561; inspect all CI failures including generated-output separately.
- [ ] If important checks pass, merge exact reviewed head and confirm GitHub Pages deployment and live-site code/behavior. Otherwise preserve Draft and report blockers.
