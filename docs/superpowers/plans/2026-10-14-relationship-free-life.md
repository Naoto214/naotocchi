# Relationship free life Implementation Plan
> Execute inline with superpowers:executing-plans. User authorized implementation through Draft PR, no merge.
Goal: independent relationship residents with optional short companionship.
Architecture: session budget + existing life AI + same-actor party transfer; Home visit projection.
Tech: vanilla JS, node:test/runtime harness.
Spec: ../specs/2026-10-14-relationship-free-life-design.md

## Global constraints
No Character/World renderer, Expression/Motion internals, save/schema changes. No merge.
## Review focus
Observer errors cannot break simulation; stale invitation cannot recruit distant or removed relationships; exit resets physical state; Home absence cannot speak offscreen; existing geometry tests must remain nonvacuous with explicit party fixtures.

## Task 1: budget and semantic contract
Files: relationship-life.js; tests/relationship-free-life-test.cjs; index.html; tests/helpers/runtime-harness.cjs.
Interface: createSession({random}), advance(dt), attempt(kind,key), emit(type,key,meta), subscribe(fn), now.
- [x] Tests RED: shared spacing, per-kind rolling cap, invitation interval, observer isolation, invalid delta.
- [x] Implement ephemeral bounded session and subscription; load before meguru.
- [x] Run dedicated test GREEN.
## Task 2: regional actor lifecycle
Files: meguru.js; tests/relationship-free-life-runtime-test.cjs; existing party fixture tests.
Interface: related metadata; sim.startAccompany(key,activity), endAccompany(reason), invitation; shared session.
- [x] Tests RED: no automatic party; registry completeness; voluntary start cap, duplicate rejection, expiry and region reset, AI return.
- [x] Reuse life actor, routing and party collision; add nonblocking optional button.
- [x] Run runtime/geometry/life tests GREEN.
## Task 3: Home visit projection
Files: script.js; dedicated runtime tests.
- [x] Tests RED: absent cast/speakers, visitor expiration, unchanged relationship state.
- [x] Project one timed visitor into existing cast layout; share session budget and event contract.
- [x] Run Home/relationship regressions GREEN.
## Task 4: measurement and integration
Files: tools/relationship-free-life-measure.cjs; docs/qa/relationship-free-life-20261014/.
- [x] Seeded frequency and runtime spatial/CPU measurement; mobile UI if available.
- [x] Whole-suite test and independent review; fix significant defects.
- Publication: dedicated branch and Draft PR only; verify remote HEAD/tree. Final identifiers are recorded in the PR and delivery report. No main merge.
