# 219 New Seed Turn End Proof Implementation Plan

> **For agentic workers:** Execute with TDD and preserve the 218 saved states.

**Goal:** Prove complete six-stage turn ends for the two reached end states.

**Architecture:** Continue the protected 184 baseline event/hash chain across checkpoints 185–218, then reuse the canonical current board turn-end completeness audit. Retain the other two routes without advancing them.

**Tech Stack:** Python unittest and existing proxy turn-end provenance validator.

**Spec:** `docs/card-game/218-new-seed-mixed-replay.md` and `203-new-seed-turn-end-proof.md`.

## Global Constraints

PR #259 remains Draft and unmerged. Preserve all source event/hash records and card text. Independent balance samples remain zero.

## Review Focus

- Every checkpoint event links to prior snapshot hash.
- Growth trace remains connected.
- No pending trigger or expiring effect is hidden.
- Both end routes satisfy all six stages.
- Held routes do not count as proved turn ends.

### Task 1: Prove two turn ends

**Files:** `tools/test_proxy_new_seed_turn_end_proof_219.py`, `tools/proxy_new_seed_turn_end_proof_219.py`, `data/proxy-new-seed-turn-end-proof-219-20260925.json`, `219-new-seed-turn-end-proof.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing test for two complete ends and mutation rejection.
- [x] Observe missing module failure.
- [x] Extend verified event chain through 218 and reuse six-stage audit.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
