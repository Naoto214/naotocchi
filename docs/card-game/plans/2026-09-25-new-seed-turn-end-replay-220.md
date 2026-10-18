# 220 New Seed Turn End Replay Implementation Plan

> **For agentic workers:** Execute with TDD and preserve 219 six-stage proof.

**Goal:** Advance only the two proved turn ends through next turn draw.

**Architecture:** Verify canonical 218/219 artifacts, reuse the established 204 turn-end and two-card draw transition for proved routes, and carry two active routes unchanged. Independently check every new event and snapshot hash.

**Tech Stack:** Python unittest and existing proxy turn-end transition.

**Spec:** `docs/card-game/219-new-seed-turn-end-proof.md`.

## Global Constraints

Keep PR #259 Draft and unmerged. Preserve protected event/hash history and card text. Independent balance count remains zero.

## Review Focus

- Only six-stage complete routes end the turn.
- Next actor and round are derived from first-player order.
- Next turn draws exactly two deck cards.
- Held routes retain state/hash unchanged.
- Tampered event/snapshot hashes fail validation.

### Task 1: Replay two turn ends

**Files:** `tools/test_proxy_new_seed_turn_end_replay_220.py`, `tools/proxy_new_seed_turn_end_replay_220.py`, `data/proxy-new-seed-turn-end-replay-220-20260925.json`, `220-new-seed-turn-end-replay.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing tests for two routes drawing and two held, with hash mutation rejection.
- [x] Observe missing module failure.
- [x] Implement replay and independent chain checks.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
