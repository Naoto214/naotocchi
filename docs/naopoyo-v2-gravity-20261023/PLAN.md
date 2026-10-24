# NAOPOYO v2 gravity implementation plan

> Native execution using superpowers:executing-plans. User authorized all steps without intermediate approvals.

**Goal:** Complete continuous addition/splitting and deterministic gravity in an independent playable prototype.
**Architecture:** Reuse #427 pointer/session/render structure. Isolated event context owns temporary split protection and processed spikes; nothing transient is persisted.
**Tech Stack:** Browser ES modules, Canvas, Node test, buildless private Sites.
**Spec:** SPEC.md

## Global constraints
Only prototypes/naopoyo-v2 and docs/naopoyo-v2-gravity-20261023 are added to latest main. No existing rules, assets, saves, stages, Pages or PR branches change. New Draft and new owner-private Site.

## Review focus
Active actor below a falling actor must keep its ID. A saturated lower 8 must not oscillate. Outside split contact must re-enable merging. Fast diagonal paths must equal slow input. Restored suspended split stacks must not settle on load.

### Task 1: Engine
- [x] Add completion.test.mjs: all 64 sums, overflow positions, lower active ID, saturation, split family and foreign contact, repeated spikes, mixed gravity and seeded mass/uniqueness/termination.
- [x] Run new tests RED against #427 engine.
- [x] Update engine.mjs move(s,id,dx,dy), settle(s,context) and internal entry/merge/split event functions; preserve result.ok/id/merged/split/children/falls.
- [x] Update explicitly superseded old assertions; run all engine/allocation tests GREEN and commit.

### Task 2: Playable interaction and scenes
- [x] Add actual app/session cases for overflow chains, gravity active ID, full-drag Undo, independent save, top-row label/face separation. Observe RED.
- [x] Update session/store/app/render; new comparison scenes and help copy; deterministic replay scripts for every scene.
- [x] Verify slow/fast/coalesced equivalence, complete scene rescues, label bounds, storage roundtrip; commit.

### Task 3: Delivery
- [x] Run existing 12-scene tests, npm test, independent reviewer and respond to important findings with RED/GREEN.
- [x] New private Site. Actual browser drag screenshots 375/390/430, pointer down/merge/split/edge. Report Safari gap honestly.
- [x] Commit/push new branch, Draft PR, deploy and verify response/content. Preserve evidence, final HEAD/tree and migration plan.
