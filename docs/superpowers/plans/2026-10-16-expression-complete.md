# Character expression completion implementation plan

Goal: connect current care/life/relationship inputs to all293 existing models and consistent fallback.
Architecture: shared presentation resolver/controller, minimal bridge and renderer hooks, existing face atlas and archetype posture.
Spec: docs/superpowers/specs/2026-10-16-expression-complete-design.md
Execution: inline; user explicitly requests continuous execution through Draft PR.

Constraints: no main merge, no AI/path/frequency/save/schema/Motion v2/model changes. Preserve Home 2500ms behavior and image bytes.
Review focus: protected state arriving mid-cue; stale region/actor delivery; module/build failure; same-emotion distinct events; hidden time and duplicate renderer preparation.

1. Add tests/character-expression-complete-test.cjs. RED on four missing states and controller API. Extend resident-expression.js and add expression-presentation.js (resolvePlayer, resolveActor, createSession). Test 29/30 boundary, current input after expiry, normal afterglow, event duplicates/retrigger/cleanup.
2. Extend character-3d/spec.js, animate.mjs, runtime.mjs using existing rig atlas. RED/GREEN all293 x12 and reaction token, protected-state cancellation, shared geometry and reduced-motion. Keep model definitions untouched.
3. Add bridge input to script.js, presentation preparation hook to meguru.js and both render paths, index load order. Tests use runtime harness and simulation/view to verify live player and relationships, party reaction expiry, fallback assets, no gameplay mutation.
4. Run focused and npm test, inspect browser representative snapshots and fallback cases. Save contract, mappings, results, image QA and physical checklist. Review branch, fix important findings with regression tests, commit/push and create Draft PR.
