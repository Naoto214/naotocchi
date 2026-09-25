# 215 New Seed Ability Resolution Implementation Plan

> **For agentic workers:** Execute with TDD and preserve the saved 214 boundary.

**Goal:** Resolve one reached C-chicken board ability while retaining three unrelated states.

**Architecture:** Verify canonical 214 artifact and reuse the previously proven board ability resolution with independent hash replay validation.

**Tech Stack:** Python unittest and existing proxy state transitions.

**Spec:** `docs/card-game/214-new-seed-followup-replay.md`, `72-companion-26-card-text-draft.md#C-chicken`.

## Global Constraints

Keep PR #259 Draft and unmerged. Preserve old state/hash and card text. Independent balance count remains zero.

## Review Focus

- Only the linked board source is resolved.
- Revealed noncompanion stays at deck top.
- Other three route hashes remain unchanged.
- Chain and activation zone close together.
- Altered result hashes fail validation.

### Task 1: Resolve reached ability

**Files:** `tools/test_proxy_new_seed_ability_resolution_215.py`, `tools/proxy_new_seed_ability_resolution_215.py`, `data/proxy-new-seed-ability-resolution-215-20260925.json`, `215-new-seed-ability-resolution.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing tests for one event, three retained states, and hash rejection.
- [x] Observe missing module failure.
- [x] Implement canonical source verification and ability resolution.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
