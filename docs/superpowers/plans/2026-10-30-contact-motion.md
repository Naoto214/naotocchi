# Contact and motion unification Implementation Plan

> For agentic workers: execute inline with superpowers:executing-plans.

Goal: independent contact-v2 comparison; same species merge including 8+8; different species exchange.
Architecture: opt-in movementRules `contact-v2` in shared engine, legacy remains unchanged. Event participant snapshots drive a contact-first timeline. Independent comparison app with A/B storage namespaces, identical scenes, original chapter2 boards and witnesses.
Tech Stack: existing ESM engine, ForestSession, canvas renderer, node:test, private Sites.
Spec: user instruction 2026-10-30 (all implementation/publication authorized, no intermediate approval).

## Global Constraints
Do not push PR436, PR482/V12, main, or update any existing Site. No chapter1 code or board redesign. Preserve contact-v1 byte semantics. Gravity retains stable support on a lower8 (repeating an identity-only 8+8 gravity contact would cycle); manual same-species contact always uses merge subject to existing terrain legality.

## Review Focus
- No-op saturated gravity must remain stable without cycles.
- Every merge/overflow participant uses explicit event identity; chained arrivals cannot guess from final positions.
- V11 saves reject V2 rule identity; A/B saves never mix.
- Number changes occur at actual contact; no swap arcs on overflow.
- Regrabbing/high-speed drag finishes at logical coordinates.

## Task 1: opt-in physics and witnesses
- [ ] New exhaustive contact tests fail on legacy engine, then implement contact-v2.
- [ ] Replay 10 original witnesses, preserve ID/mass/save/Undo and original regression.
## Task 2: contact-first timeline
- [ ] Tests for approach/contact/separation/number/swap/fall/split/endpoints fail, then implement.
- [ ] Legacy unchanged; reduced motion/fast drag verified.
## Task 3: independent A/B app and QA
- [ ] Same scenarios/directions, chapter11-20, playback, retry/Undo/save/restore, isolated keys.
- [ ] Responsive 320/375/390/430, private publish and distribution hashes.
## Task 4: review, GitHub, CI and delivery
- [ ] Fresh review, fixes with tests; stacked Draft PR; full regression CI; report verified limits.

Environment: root disk 0 bytes; own sparse clone in /dev/shm with read-only alternate object store. Do not delete any other Work artifacts. Baseline 55/55 contact/session tests pass. Latest main46349c36, PR436 ab937a22, V12 PR482 b69953ba protected.
