# 211 New Seed Choice Audit Implementation Plan

> **For agentic workers:** Execute in this session with TDD and review each checkpoint against protected source state.

**Goal:** Prove all four reached selections from saved 209 states and complete 210 candidates.

**Architecture:** A read-only audit loads canonical 209/210 artifacts, verifies raw SHA and replay, compares each paid action to pass under 107/114, and delegates safe free development to the existing 157 selector. It writes one canonical JSON artifact and changes no match state.

**Tech Stack:** Python unittest and existing proxy decision modules.

**Spec:** `docs/card-game/210-new-seed-chain-normal-audit.md` and the approved 211 selection requirements.

## Global Constraints

PR #259 remains Draft and unmerged. Preserve protected state/hash and card text. Seeded fallback matches never count as independent balance samples.

## Review Focus

- Modified source bytes must fail the source SHA check.
- Missing candidate completeness must stop selection.
- A changed selection must fail independent replay validation.
- The world effect requires both a main and hand count at most two; current states satisfy neither.
- Empty world placement does not trigger P-cliff_goat's different-world replacement ability.

### Task 1: Audit four decisions

**Files:** `tools/test_proxy_new_seed_choice_audit_211.py`, `tools/proxy_new_seed_choice_audit_211.py`, `data/proxy-new-seed-choice-audit-211-20260925.json`, `211-new-seed-choice-audit.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write assertions for four selected IDs and independent rejection of mutation.
- [x] Run targeted unittest and observe the missing implementation failure.
- [x] Implement canonical source checks, hash checks, paid score comparisons, and existing free placement selection.
- [x] Run targeted unittest GREEN and generate/check canonical JSON.
- [ ] Run design data validation, save to GitHub, verify remote HEAD/tree.
