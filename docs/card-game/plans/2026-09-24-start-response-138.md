# 138 Start Response Implementation Plan

**Goal:** Approve A as the general response ID namespace, enumerate complete R1 start-response candidates, resume the four immutable 135 states without guessing unproved effects.

**Architecture:** Add a checkpoint 138 adapter alongside protected 119/120 code. Verify the saved 135 raw bytes and state/event hashes; classify each actor's hand from 114 and card text; generate canonical response IDs independent of card-copy/path. Reuse 119 priority/pass/seed policy where its transition is applicable, with a start-specific phase boundary. Stop before any unproved activation or next normal-action resolution.

**Sources:** 01, 02, 06, 64, 114, 116, 119, 128, 135, 136, 137. Keep 112 and 119/120 saved evidence unchanged. Every source copy in scope is evaluated from the current owner/public view; unknown affordable quick-use actions fail closed.

### Task 1: ID and source gate

- [ ] RED: generic response IDs reject duplicate/missing/unregistered variants and never use `candidate-` namespace.
- [ ] GREEN: `response-use-{play|item|event}-{source_instance_id}` plus `-variant-{registered_variant}` when declaration is part of the action; preserve 119 target ID and `response-pass`.
- [ ] RED: corrupted 135 source raw bytes, event chain, snapshot, state hash are rejected before continuation.
- [ ] GREEN: immutable saved-state adapter validates raw SHA, event seq and start-of-response prerequisites.

### Task 2: candidate completeness

- [ ] RED: probe-02-a-first returns seven distinct G-hit-blow declarations plus pass, probe-02-b-first returns I-c_coin2 plus pass; probe-01 first actors return pass only.
- [ ] RED: unknown affordable quick-use cannot be labeled `normal_action_not_response`; deck top and opposing hand cannot affect the audit.
- [ ] GREEN: use 114 timing/conditions and card-text quick-use, not normal-action template timing as a response ban; classify every card or stop.

### Task 3: resume and verification

- [ ] RED: four results start from identical saved game hash and continue event/continuation hashes, keep balance samples zero, and stop before unproved action/next normal action.
- [ ] GREEN: produce canonical plan/evaluation/route JSON and a `--check` mode. Apply 119 decision order; if a quick-use resolution lacks a proved handler, save a rules stop before applying it. The 119 normal-action-after-response adapter is protected.
- [ ] Check dedicated tests, saved JSON, design checker, all proxy tests; separate only 117 expected190/actual263. Verify protected files unchanged, diff check, remote HEAD/tree, PR draft/open/unmerged, workflow/status counts after push.
