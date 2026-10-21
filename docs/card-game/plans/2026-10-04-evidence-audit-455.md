# 455 Evidence Audit Implementation Plan

> Inline sequential TDD; one final independent review. User authorizes implementation of uniquely determined454 boundaries without intermediate approval.

Goal: source-bound, read-only sidecar contract/validator for all saved decision kinds, never balance admission.
Architecture: compare sidecar with deterministic projection of original run; separate mechanically checked record structure from unproved game legality/comparison and unapproved experiment. Preserve original record hash and source SHA. No boolean supplied by a caller certifies strategy or sample eligibility.
Tech: Python standard library. Spec: ../454-all-judgment-evaluation-design.md.

Constraints:114/A/116/past data immutable; no selection/policy changes, games, retrospective flag changes, new comparison semantics or admission. Unknown stays null/not_reverified. Full opportunity completeness cannot be proved from a decision list alone; explicitly not_reverified. A valid sidecar means source projection equality only.

Files: tools/proxy_judgment_evidence_audit.py; tools/test_proxy_judgment_evidence_audit.py; data/proxy-judgment-evidence-455/{contract.json,reproduce.py,audit.json,verification/};455report; README index.

Review focus: forged statuses/omission/duplication; singleton seeded; missing flags; nested414/A wrappers; missing decision kind/candidate identity; schema validity vs source validity vs admission.

1. RED tests for immutable projection, all three kinds, explicit flag preservation, singleton seeded exclusion, nonseeded unresolved experiment, canonical source binding, missing/duplicate candidate/unknownkind/flag types. Run unittest discovery. Implement build_sidecar(run), validate_sidecar(value,run) and contract() with pinned454/116/119 hashes. GREEN.
2. RED saved447 integration: manifest-pinned 4files/12run inventory, validate each full sidecar, omission/tamper fail, all12excluded, source records unchanged. Implement deterministic reproduce CLI with empty output requirement, source hashes and canonical JSON. GREEN. Summaries distinguish mode-seeded from metric fallback rate (N>1), unknown explicit flag from inferred reason evidence.
3. Related116/119 and dedicated tests, npm once, design check, two independent generations byte equal, protected file hashes. Final independent review once; fix concrete findings with RED/GREEN if needed. Commit via GitHub, verify remote tree/PR.

Execution log to be appended after checks. No runtime/admission validator is promised: legality/selection proof adapters, event-to-opportunity reconciliation, independent sampling plan require future work; this contract cannot issue accepted samples.

## Execution ledger
- 10 tests RED missing module→GREEN; three new failures (nested kind/candidates and saved adapter)→14PASS.
- All saved44712runs/2378records projected; 12excluded, no sample admitted.
- Related11636/11931PASS; npm406PASS; design errors0. Two independent generations byte equal. Existing2691files unchanged exceptREADME. Final review: Critical0/Important1/Minor0; outer exclusion-field conflict fixed after six RED cases. Final15 tests PASS, two final generations byte-equal, no second review.
