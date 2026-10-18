# Execution rebinding independent review

Reviewer: independent agent rebinding_review, gpt-6-astra. One read-only review, no tests or edits by reviewer. Range 2cfc1ca3..0e45c957. Critical 0 / Important 2 / Minor 0.

1. Important: build froze every old data file, including mutable status.md. Actual old/current Git blobs differ, so valid rebinding was impossible. Existing current_preflight.PROGRESS already designates the mutable document.
2. Important: original source predates generation/launch claims and the stopped run. Old source data plus seven package blobs did not protect those later files against a future edition rewriting/deleting them. HEAD currently preserved them; future acceptance was a static inference, not a reviewer-executed test.

Other inspected boundaries were coherent: independent old checkout re-runs original auditors without consuming approval; immutable binding is reconstructed; canonical comparison freezes non-source manifest fields; Python and generator closure frozen; v2 request and supervisor/worker forwarding bind the same context. Final evidence was intentionally pending and not itself a finding.

Author resolution (not an independent re-review): added explicit source-bound preservation policy, anchored at pre-repair 2cfc1ca3/tree0de92cad. All existing data and numbered rules are frozen except the already designated three progress documents. Policy ancestry requires original package <= baseline <= new edition. New proof records baseline and protected-map hash; no caller-supplied arbitrary baseline. Mutation/deletion tests cover claims and all stopped-run files; actual old/status bytes demonstrate the allowed progress change. Tests first failed for missing gate, then four focused tests passed. Later fixed-source full regression is recorded separately. Reviewer has not re-read the fixes.

Interrupted full/connection verification at 0e45c957 is not PASS. Both tool exits were 130; 158 individual PASS lines had been observed in the partial full run. Orchestrator interruption prevented final PIPE-log persistence; no completed raw log is claimed. Metadata is preserved separately. Production matches were not executed.
