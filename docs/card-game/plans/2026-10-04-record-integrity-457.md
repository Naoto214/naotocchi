# 457 Record Integrity and Remaining Eligibility — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Inline sequential TDD; one final independent review.

**Goal:** Validate saved event/snapshot/explicit decision anchors without running a policy, then distinguish implementation evidence from unapproved balance conditions.

**Architecture:** A read-only audit checks existing serialization/hash invariants directly. The fixed447 loader authenticates saved inputs; no execution, scope monkeypatch, or inferred choice anchor is used. Missing decision anchors remain visible gaps.

**Tech Stack:** Python standard library, existing canonical hash conventions and455 projection validator.

**Spec:** ../454-all-judgment-evaluation-design.md §§2,5,6; ../456-saved-replay-evidence.md limitations; user's456 handoff.

## Global Constraints

Only docs/card-game;114/A/116/505/history unchanged; no new rules, policy edits or new matches. Replay count0. policy_promoted=false; balance_admitted=null; independent_balance_sample_count=0. opportunity_scope=existing_executor_only remains unchanged. Missing evidence is not false, zero, or a strategy solution.

## Review Focus

- Equal but internally broken saved/replayed records must not pass this direct chain audit.
- Legacy game hash omits card lookup; full continuation/envelope hash must still bind it.
- Bool sequences, malformed arrays, missing endpoints, and contract mismatch must be rejected.
- Missing explicit decision anchors must remain unverified; no parsing effect IDs or guessed adjacent events.
- Hash/anchor success must not imply legal candidate completeness, full opportunity coverage, or balance eligibility.

## Task 1: Direct record linkage and saved adapter

Files: tools/proxy_record_integrity_audit.py; tools/test_proxy_record_integrity_audit.py; data/proxy-record-integrity-457/reproduce.py, summary.json, verification/;457 report; README index.

Interface: audit_record(run) returns canonical-source-bound structural evidence and one explicit-anchor status per recorded decision. ValueError on structural mismatch. Consumes existing continuation_run.v1 and envelope.v1/v2; validates recorded event/snapshot edges only, not rule transitions or envelope semantic validity. Source authentication occurs in the fixed saved loader, not audit_record.

- [x] Write tests for: legitimate record/no mutation/non-admission; all six edge hashes; omitted/reordered/extra shots/events; nonconsecutive/bool sequence; mismatched initial/final/last sequence; contract mismatch; missing/dangling/partial/incorrect explicit anchors; changed nested runtime and card lookup; malformed run collections.
- [x] Run unittest; expected missing module failures (RED).
- [x] Implement direct checks using existing canonical algorithms, without run_route or bind_event. Explicit event_seq denotes pre-event state where present. Validate present pre_game/pre_continuation hashes, but do not invent missing hashes or call sequence-only references semantic proofs.
- [x] Run dedicated tests GREEN, then apply to pinned4paths/12saved runs with455 exclusion evidence retained. Save compact per-decision gap locations; no replay.
- [x] Run relevant455/456 and serialization tests; npm at final milestone; design data checker and protected-file check. No claim of full proxy regression.
- [ ] Write cross-cutting gap/approval matrix with concrete alternative inference scopes. One independent review, TDD fix if needed, GitHub save and fresh HEAD/tree/PR verification.

## Execution ledger

- Start: remote456 ef415baa41e29afd5f9f3ae3f9df038ccb6cf343/tree75c18ea247d5008730eb459137b67361e3629b9d. Dedicated fresh clone on requested branch, clean; no AGENTS.md found. PR259 Draft/open/unmerged, mergeable=false (base conflict, not modified).
- Scope choice: bounded read-only extension of approved454 audit. User authorizes unique existing-contract additions without intermediate approval; final balance/meaning choices remain gated.

- Implementation: direct auditor and saved reproducer complete.10 dedicated RED→GREEN; related48 PASS; npm406 PASS; design errors empty. No new match/replay. Final review/save pending.

- Final verification:5 JSON regeneration byte-equal;3559 existing repository files excluding README blob-equal. Independent review1:Critical0/Important0/Minor0. Declined semantic/statistical/authorization judgments remain unverified/unapproved, not overridden. Live remote confirmation is performed by root after push.
