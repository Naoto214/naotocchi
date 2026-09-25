# 216 New Seed Mixed Audit Implementation Plan

> **For agentic workers:** Execute with TDD and retain the 215 source hashes.

**Goal:** Audit one normal opportunity and one second priority response, carrying two turn ends to provenance verification.

**Architecture:** Reuse normal action completeness and the response enumerator with explicit hand target and partner trigger exclusions. Preserve end routes without declaring their six-stage histories complete.

**Tech Stack:** Python unittest and proxy candidate enumerators.

**Spec:** `docs/card-game/215-new-seed-ability-resolution.md`, card text 74/83.

## Global Constraints

PR #259 remains Draft and unmerged. No card text changes. Balance samples remain zero.

## Review Focus

- Normal candidate source inventory and stable IDs are complete.
- G-animal-shogi lacks an own discarded companion.
- P-anglerfish requires own main initiating a challenge in deepsea.
- Two turn ends retain their source hashes for later history verification.
- Mutation to a candidate list fails independent replay.

### Task 1: Audit mixed opportunities

**Files:** `tools/test_proxy_new_seed_mixed_audit_216.py`, `tools/proxy_new_seed_mixed_audit_216.py`, `data/proxy-new-seed-mixed-audit-216-20260925.json`, `216-new-seed-mixed-audit.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing test for one normal, one response, two retained ends, and mutation rejection.
- [x] Observe missing module failure.
- [x] Implement canonical source/hash checks and candidate enumeration.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
