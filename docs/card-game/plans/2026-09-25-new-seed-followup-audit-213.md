# 213 New Seed Followup Audit Implementation Plan

> **For agentic workers:** Execute with TDD and preserve the saved 212 source boundary.

**Goal:** Verify complete candidate sets at four reached response windows.

**Architecture:** Reuse the mixed response audit with explicit hand source exclusions and P-cliff_goat's world replacement condition; validate the canonical source and replay independently.

**Tech Stack:** Python unittest and existing proxy response enumerator.

**Spec:** `docs/card-game/212-new-seed-choice-replay.md` and canonical card text 74/83.

## Global Constraints

Keep PR #259 Draft and unmerged. Preserve source state/hash and card text. No independent balance samples.

## Review Focus

- G-animal-shogi requires an own discarded companion.
- P-cliff_goat does not trigger on initial world placement.
- Source zones distinguish hand use and installed response.
- Current response pass must remain complete.
- Tampered candidate lists fail independent validation.

### Task 1: Audit four response opportunities

**Files:** `tools/test_proxy_new_seed_followup_audit_213.py`, `tools/proxy_new_seed_followup_audit_213.py`, `data/proxy-new-seed-followup-audit-213-20260925.json`, `213-new-seed-followup-audit.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write tests for complete pass-only opportunities and mutation rejection.
- [x] Observe the missing module failure.
- [x] Implement source verification and target/trigger exclusions.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
