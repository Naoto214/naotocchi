# 222 New Seed Mixed Audit Implementation Plan

> **For agentic workers:** Execute with TDD and preserve saved 221 state/hash.

**Goal:** Prove complete legal candidates in four different reached opportunities.

**Architecture:** Verify canonical 218/220/221 artifacts, reconstruct the held placement event boundary, enumerate two turn start responses, and audit one normal action. Exclude G-animal-shogi only after proving its target absent in the actual saved discard.

**Tech Stack:** Python unittest and existing proxy candidate enumerators.

**Spec:** `docs/card-game/221-new-seed-egg-replay.md`, card text 83 and response contract 119.

## Global Constraints

Keep PR #259 Draft and unmerged. Preserve prior state/hash and card text. Independent balance remains zero.

## Review Focus

- Held placement event links to current response state.
- Board ability uses the approved response ID namespace.
- G-animal-shogi cannot target an absent own discarded companion.
- All hand and board exclusions are recorded.
- Normal legal candidate projection is exact and complete.

### Task 1: Audit four opportunities

**Files:** `tools/test_proxy_new_seed_mixed_audit_222.py`, `tools/proxy_new_seed_mixed_audit_222.py`, `data/proxy-new-seed-mixed-audit-222-20260925.json`, `222-new-seed-mixed-audit.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing test for four candidate sets and mutation rejection.
- [x] Observe missing module failure.
- [x] Implement canonical source checks and opportunity enumeration.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
