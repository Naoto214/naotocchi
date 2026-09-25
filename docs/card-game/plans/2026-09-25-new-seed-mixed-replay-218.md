# 218 New Seed Mixed Replay Implementation Plan

> **For agentic workers:** Execute with TDD and preserve 217 source hashes.

**Goal:** Apply one selected free placement and one unique response pass.

**Architecture:** Verify saved choice/audit/state artifacts, invoke established person placement and response pass transitions, independently replay and check both event/snapshot chains.

**Tech Stack:** Python unittest and existing proxy transitions.

**Spec:** `docs/card-game/217-new-seed-mixed-choice.md` and `216-new-seed-mixed-audit.md`.

## Global Constraints

Keep PR #259 Draft and unmerged. Preserve source state/hash, card text, and zero independent balance samples.

## Review Focus

- Free placement uses the selected legal action.
- Response candidate set is still complete at saved state.
- Response pass closes the window to normal action.
- Two turn ends remain byte-for-byte state-equivalent.
- Tampered event/snapshot hashes fail replay validation.

### Task 1: Replay selected actions

**Files:** `tools/test_proxy_new_seed_mixed_replay_218.py`, `tools/proxy_new_seed_mixed_replay_218.py`, `data/proxy-new-seed-mixed-replay-218-20260925.json`, `218-new-seed-mixed-replay.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing tests for two events and mutation rejection.
- [x] Observe missing module failure.
- [x] Implement transitions with replay and hash checks.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
