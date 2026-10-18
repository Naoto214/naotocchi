# 221 New Seed Egg Replay Implementation Plan

> **For agentic workers:** Execute with TDD and preserve the saved 220 states.

**Goal:** Apply mandatory seeded egg choices on two reached next turns.

**Architecture:** Verify canonical 220 source, reuse the established 205 seeded mandatory choice transition, and independently check the event/snapshot/hash links while carrying two other routes unchanged.

**Tech Stack:** Python unittest and existing proxy seeded fallback.

**Spec:** `docs/card-game/220-new-seed-turn-end-replay.md`.

## Global Constraints

Keep PR #259 Draft and unmerged. Preserve source state/hash, card text, and zero independent balance samples.

## Review Focus

- Mandatory choice uses current actor hand and turn index.
- Seed proof validates against the complete hand.
- Selected card goes to deck bottom.
- Two held routes remain unchanged.
- Mutated decision cannot pass replay validation.

### Task 1: Apply two egg choices

**Files:** `tools/test_proxy_new_seed_egg_replay_221.py`, `tools/proxy_new_seed_egg_replay_221.py`, `data/proxy-new-seed-egg-replay-221-20260925.json`, `221-new-seed-egg-replay.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing tests for two choices and mutation rejection.
- [x] Observe missing module failure.
- [x] Implement transition reuse and hash checks.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
