# Envelope-bound field-entry history implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline TDD, then an independent review.

**Goal:** Pass the current envelope and its reconstructed lifecycle explicitly through the shared six-family instance boundary.
**Architecture:** Reuse 100/105, life.observe and Connection.capture/finish. Bind each cached lifecycle to its complete conditional event path; compare that path against the caller's actual public history before entry. A candidate cache is never evidence of selection. Keep source authentication and full selected-transcript audits separate.
**Tech Stack:** Python unittest, existing source-bound validation and Git edition binding.
**Spec:** User approval 2026-10-14; canonical starting commit d755a14694d148d12ae9bead3a7c9a13d9db5ed4.

## Global constraints
- Six entry families; no card, match, seed or fallback-policy exceptions.
- Never change existing data, numbered rules, input packages, old editions, approval consumption or stop artifacts.
- No production execution, retry or resume. New launch needs separate owner approval.
- PR259 stays Draft/open/unmerged on design/card-pool-master-20260914.

## Review focus
- A hypothetical branch with identical metadata must not prove a selected history.
- Missing, reordered, truncated or tampered event/hash paths fail closed.
- Retired instances and foreign full envelopes fail closed.
- Reentry must allocate exactly one new incarnation and preserve only new arrival obligations.
- Old targets, usage and reservations must never migrate to the successor.

### Task 1: Shared entry proof
Files: tools/proxy_population_instance_boundary.py, tools/proxy_population_incarnation_runtime.py, tools/proxy_population_departure.py; new tools/test_proxy_population_entry_history.py.
Interface: require_initial_entry(action, history, envelope=None); Connection requires matching full envelope and captured event suffix, never a scope-order-dependent stack.
- [x] Write six-family native reentry tests with production outer guard, observe RED.
- [x] Add missing/wrong history, hypothetical cache, retired identity and hash mutation tests; observe RED.
- [x] Implement smallest shared proof connection; run dedicated/related tests GREEN.
- [x] Non-production saved-history fold and boundary diagnostic; original remains immutable.

### Task 2: Verification and publication
Files: new verification evidence and current-preflight report selector; no old evidence overwrites.
- [ ] Run full current population/mandatory suite, complete synthetic diagnostic, design checker; bind exact source fingerprints.
- [ ] Independent read-only review; resolve material findings with RED/GREEN.
- [ ] Save source and evidence to existing branch; verify remote/local HEAD/tree and clean state.
- [ ] Capture new edition, use existing binding builder and historical package audit, append binding/manifest only.
- [ ] Audit published binding and present new owner launch request without consuming it or starting games.

## Implementation record
- Six native outer-guard cases reproduced the original failure, then passed.
- Missing/tampered history and hypothetical-cache tests RED→GREEN.
- Independent review of local checkpoint d5c2d5d: C0/I1/M1. Full-envelope branch collision reproduced RED, corrected by retaining full bindings and rejecting ambiguous raw-event paths. Late native annotation variants are retained, not overwritten (separate RED→GREEN).
- Added native old-usage preservation and unresolved-reservation rejection. Existing movement-lifetime tests cover old stat/conditional target expiration; existing 100/105 tests cover reservation nonmigration. No unresolved reservation is silently permitted just to construct a successor.
- Dedicated final suite: 8 tests including six-family subtests and saved275-event fold. No saved attempt transition was resumed; the saved diagnostic stops at the guard.
- Initial full regression interrupted after review finding; initial complete diagnostic stopped at20 events due to an overly strict cache-event uniqueness check. Neither is PASS. Fixed by retaining validated annotation variants; final source will be rerun.
- Source checkpoint is not execution authorization. Existing report is retained; new append-only preflight report selected.
