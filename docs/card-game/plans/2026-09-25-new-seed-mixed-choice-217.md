# 217 New Seed Mixed Choice Implementation Plan

> **For agentic workers:** Execute with TDD and preserve 216 candidate completeness.

**Goal:** Select the reached 01-A normal action under 107/114/116 without changing state.

**Architecture:** Verify canonical 215/216 sources and current turn event/hash chain, compare one safe free person placement with two paid options and pass, and retain other routes.

**Tech Stack:** Python unittest and existing normal decision comparator.

**Spec:** `docs/card-game/216-new-seed-mixed-audit.md`, card texts 74/77/89.

## Global Constraints

PR #259 stays Draft and unmerged. Preserve past state/hash and card text. No independent balance samples.

## Review Focus

- Current turn has no card play before W-city.
- W-city requires the second played card for its immediate effect.
- I-poop1 requires a later opposing removal activation.
- Safe free P-cat_ceo placement dominates pass.
- Paid time costs lose to equal certain growth at zero cost.

### Task 1: Prove normal priority

**Files:** `tools/test_proxy_new_seed_mixed_choice_217.py`, `tools/proxy_new_seed_mixed_choice_217.py`, `data/proxy-new-seed-mixed-choice-217-20260925.json`, `217-new-seed-mixed-choice.md`, `README.md`, `tools/check-design-data.py`.

- [x] Write failing tests for unique selection and mutation rejection.
- [x] Observe missing module failure.
- [x] Implement saved history and priority comparisons.
- [x] Run targeted unittest GREEN and canonical bytes check.
- [ ] Save to GitHub and verify remote HEAD/tree.
