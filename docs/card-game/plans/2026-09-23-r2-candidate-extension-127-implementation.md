# 127 R2 Candidate Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reprove 126's four current opportunities, extend only approved exclusion and single-target ID contracts, compare the five complete candidates, and restart independently until the next genuine boundary.

**Architecture:** New 127 adapter consumes immutable 126 stop raw/hash and delegates 121/125 source enumeration, adding evidence to only the two approved gaps. It compares 01-B's fully enumerated candidate set with 107/114/116 and uses existing transition handlers. Each route's new raw stop, plan and evaluation are canonical and reconstructed by an independent validator.

**Tech Stack:** Python 3 unittest, canonical UTF-8 JSON, hashlib SHA-256; existing docs/card-game/tools modules.

**Spec:** `docs/card-game/plans/2026-09-23-r2-candidate-extension-127-design.md`.

## Global Constraints

- `design/card-pool-master-20260914`, PR #259 Draft/open/unmerged; never merge main.
- Preserve all files from checkpoints 112–126 and every 126 stop raw, current game/continuation hash.
- Only single-target candidate grammar `candidate-{action_type}-{source_instance_id}-target-{target_instance_id}`; no speculative no-target or multi-target grammar.
- Incomplete route means winner null and independent balance sample zero.
- Existing 117 test expecting 190 while current baseline is 263 is separate and may remain failing; never edit the test to hide it.

## Review Focus

- A board-count variant at exactly 8 versus 9 must change disposition without using private deck knowledge.
- A target must remain an instance identity, not a card name or another player's private zone.
- Other applicable reasons, including insufficient time, must remain visible alongside board-count failure.
- All five legal candidates remain recorded when the two safe placements enter 116's lottery subset.
- A later unsupported no-target world action must stop with intact hash, never silently disappear.

---

### Task 1: Current-state candidate evidence

**Files:** Create `docs/card-game/tools/proxy_r2_candidate_extension_127.py`; create `docs/card-game/tools/test_proxy_r2_candidate_extension_127.py`.

**Interfaces:** `load_sources(data_dir=DATA) -> dict` verifies 126 raw/hash; `audit_current(route, table) -> dict` returns independent 12-check candidate audit; `validate_current(audit, route, table) -> list[str]` rebuilds it.

- [ ] **Step 1: Write failing tests** for board count 0, 6, 7, 8, 9, simultaneous insufficient time; single-target I-bowtie with C-chameleon; two legal targets generating two distinct IDs; absent target and no-target world remain unadmitted or stop; changed 126 raw/hash rejected. Assert actual source inventory and dispositions, not implementation helper calls.
- [ ] **Step 2: Run** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_r2_candidate_extension_127.py' -q`; expected failure from missing 127 adapter.
- [ ] **Step 3: Implement** checked 126 input, current state projection through 125, 121 original units, board-count predicate with canonical count evidence, target ID only when 114 action has exactly one legal target and proof of eligibility; reuse 125 inventory and exclusion handling, preserving all 121 checks and independent validator. Do not write into prior modules.
- [ ] **Step 4: Rerun** dedicated tests and assert GREEN; use comparison of full audit to independently rebuilt audit and never trust `candidate_set_complete` from source.

### Task 2: Five-way choice and safe placement continuation

**Files:** Modify `docs/card-game/tools/proxy_r2_candidate_extension_127.py`; modify the dedicated tests.

**Interfaces:** `compare_normal_action(route, audit, source) -> dict` returns a 116-valid decision or a typed genuine rules stop; `run_route(path, inputs) -> dict` applies only supported transitions.

- [ ] **Step 1: Add RED tests** that rederive the five IDs for 01-B; record four priority axes and actual time (free/pass 2, paid birth 1); establish safe conditions for both placements; retain all five in `legal_candidates` and only two in `seeded_fallback_candidates`, then verify 116 seed proof and no balance sample. Include a counterexample where an earlier priority difference or safety failure prevents fallback.
- [ ] **Step 2: Run** the dedicated unittest, expect comparison or run-route failure.
- [ ] **Step 3: Implement** full-candidate comparison using 107/114 priority order and 116 safe placement preconditions and resolver, with actual current round/actor turn index 2. Reuse 125 placement transition and 119 response handlers, re-auditing each new state and stopping at first unsupported effect or ID. No branch by path or card copy; the test's path selects input, not behavior.
- [ ] **Step 4: Run** dedicated tests; all should be GREEN with validated event/snapshot dual hashes.

### Task 3: Canonical evidence, documentation and regression

**Files:** Modify 127 module/tests; create `docs/card-game/127-r2-candidate-extension.md`; create 127 plan/evaluation and four stop JSON files in `docs/card-game/data/`; modify `docs/card-game/README.md` and PR body to reflect actual results.

**Interfaces:** `run_all`, `validate_outcomes`, `expected_outputs`, `write_outputs`, `check_outputs`; four routes start at exact 126 game/continuation hash.

- [ ] **Step 1: RED tests** for byte drift, forged route ID/event hash/selected candidate/false balance, per-route independence, and preservation of SHA-256 of all four 126 raw stop files.
- [ ] **Step 2: Run** dedicated tests and confirm expected missing output or validator rejection failure.
- [ ] **Step 3: Implement** canonical JSON builders and validators, write output once, document measured route results and new genuinely unsupported boundaries, update README and PR body accurately.
- [ ] **Step 4: Run** dedicated tests, 127 `--check`, all proxy tests, `check-design-data.py` and `git diff --check`; report exact counts, including the known 117 mismatch. Verify 126 raw/hash and non-modification of protected paths before commit.
- [ ] **Step 5: Commit/push** only 127 files and README; verify remote HEAD/tree, four saved stops, PR Draft/open/unmerged, and new HEAD's workflow run/status without interpreting absence as success.
