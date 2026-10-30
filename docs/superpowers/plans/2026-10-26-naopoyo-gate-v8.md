# Naopoyo gate VERSION 8 implementation plan

> Use superpowers:executing-plans. User explicitly authorizes end-to-end implementation without intermediate approval.

**Goal:** Equal upper-surface support for stages 1–8, matching-only interior passage, centered gate numbers, valid chapter 2 solutions and owner-private deployment.
**Architecture:** Opt in through `terrainRules: magic-gate-v2`; preserve legacy engine branches. Separate terrain occupancy from vertical contact. Model diagonal clearance using the two orthogonal routes around a corner and gate upper-surface contact. Keep stage geometry unless real-engine search requires a minimal revision.
**Tech stack:** Existing JavaScript ESM, Node tests, Canvas, Sites static distribution.
**Spec:** User's VERSION 8 handoff; canonical semantics recorded in `docs/naopoyo-gate-v8-20261026/README.md`.

## Constraints
No main merge, production Pages, chapter1/runtime/CARD/image source edits. Keep PR445. Old board snapshots/Undo are never reinterpreted. Preserve clear/unlock records read-only on migration. No iPhone QA claim without user execution.

## Review focus
Reverse exchanges crossing gate roofs; overflow qualification at origin; diagonal split children; legacy saves and unknown versions; queued animation/reduced motion after undo.

## Tasks
1. Physics (`prototypes/naopoyo-v2/engine.mjs`, chapter2 stages/progress, new `gate-support.test.mjs`): RED tests for 1–8 roof landing/climb, matching lateral passage, enclosed 19 fixture, transactional exchanges/overflow and save isolation. Implement versioned upper-surface contact shared by support, falling and diagonal clearance; GREEN plus legacy suites.
2. Presentation (`gate-art.mjs`, `gate-effects.mjs`, `render.mjs`, gate tests): RED draw-call test comparing occupied/unoccupied text coordinates. Always draw central number before actors; remove anchor relocation and front labels; preserve art/pulses. Update visible copy/version.
3. Solutions (`search.mjs` existing real-engine solver; new reproducible audit script and solutions JSON): replay old witnesses explicitly; fresh search 11–20 including 19/20; bounded shortcut checks with honest limits. Update session replay tests to new evidence. Minimal geometry changes only if needed.
4. Verification/delivery: chapter1+2+v2+rescue+world tests, full npm/CARD/Pages; browser visual and input QA where available; fresh reviewer of full change; commit/push same PR branch; latest HEAD CI completion; private Sites source packaging/deploy/hash check and PR description. Record all limits.

## Validation commands
`node --test prototypes/naopoyo-chapter2/tests/gate-support.test.mjs` (RED then GREEN); `node --test prototypes/naopoyo-*/tests/*.test.mjs`; `npm test`; repository CARD/Pages commands; real-engine solver/replay; package hashes; GitHub HEAD workflow status.
