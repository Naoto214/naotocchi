# 214 New Seed Followup Replay Implementation Plan

> **For agentic workers:** Execute with TDD and preserve source state/hash.

**Goal:** Apply four unique response passes to 212 saved states.

**Architecture:** Verify 213's canonical complete candidate sets and invoke existing transitions for placement, chain, and end windows. Independently replay and verify every event/snapshot hash boundary.

**Tech Stack:** Python unittest and existing proxy response transitions.

**Spec:** `docs/card-game/213-new-seed-followup-audit.md`.

## Global Constraints

PR #259 remains Draft and unmerged. Preserve prior states and card text. Independent balance sample count stays zero.

## Review Focus

- Preserve source raw SHA and canonical bytes.
- Chain pass begins reverse resolution.
- Placement pass advances priority.
- End passes close to turn-end state.
- Tampered continuation hash fails replay.

### Task 1: Replay four response passes

**Files:** `tools/test_proxy_new_seed_followup_replay_214.py`, `tools/proxy_new_seed_followup_replay_214.py`, `data/proxy-new-seed-followup-replay-214-20260925.json`, `214-new-seed-followup-replay.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing tests for four events and hash mutation.
- [x] Observe missing module failure.
- [x] Implement four transitions and independent hash validation.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
