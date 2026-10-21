# 212 New Seed Choice Replay Implementation Plan

> **For agentic workers:** Execute in this session with TDD and verify all source hashes.

**Goal:** Apply four 211 choices to 209 saved states and preserve event/snapshot hash links.

**Architecture:** Read-only source verification precedes distinct existing transition functions for chain pass, free person placement, and normal pass. A replay validator checks all four event boundaries and canonical output.

**Tech Stack:** Python unittest and existing proxy transition modules.

**Spec:** `docs/card-game/211-new-seed-choice-audit.md`.

## Global Constraints

Keep PR #259 Draft and unmerged. Protect past state/hash and card text. Seeded fallback matches contribute zero independent balance samples.

## Review Focus

- Reject mismatched selection and source hash.
- Verify chain pass moves to the other priority actor.
- Verify free partner placement's single event.
- Verify paid versus pass comparison is preserved in decision record.
- Reject mutations to resulting snapshot/hash linkage.

### Task 1: Replay selected decisions

**Files:** `tools/test_proxy_new_seed_choice_replay_212.py`, `tools/proxy_new_seed_choice_replay_212.py`, `data/proxy-new-seed-choice-replay-212-20260925.json`, `212-new-seed-choice-replay.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing assertions for four new events and mutation rejection.
- [x] Observe missing module failure.
- [x] Implement transitions from saved state and independent replay/hash checks.
- [x] Run targeted unittest GREEN and check canonical JSON.
- [ ] Save to GitHub and re-fetch remote HEAD/tree.
