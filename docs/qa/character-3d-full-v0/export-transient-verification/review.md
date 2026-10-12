# Export transient-failure robustness review

Scope: pending `character_qa_export.py`, its Python tests and `character-3d-recover-evidence.yml`. Runtime/scene diagnosis and model/image approval are excluded.

Spec verdict: PASS. Quality verdict: PASS.

Critical: 0. Important: 0. Minor: 0.

- `json_request` retries only HTTP 502/503/504, at most three attempts with one/two-second delays and the same request object/body. Permission, rate-limit, validation and other failures propagate immediately. Applicable POST operations create immutable content-addressed blobs/trees; replay cannot publish a commit or move a ref. Existing GET identity/provenance checks still evaluate the returned data.
- `complete_export` writes verified blob entries, source/job provenance and expected-head/base-tree information before requesting the tree. Its explicit `VERIFIED_BLOBS_TREE_PENDING_NOT_COMMITTED_NOT_APPROVED` checkpoint has no tree or approval and does not pretend the recovery succeeded. The main path invokes it only after all selected artifact digest/bytes/count/provenance checks and blob creation complete.
- A prepared result is written only after tree creation and the final branch-head equality check. A tree failure or moved branch leaves the non-approved checkpoint and fails the exporter. Initial and final expected-head checks remain; no commit/ref update or lease bypass is added. Manual publication still belongs to the controller's leased action.
- Workflow's `always()` upload makes the checkpoint available after a failure without converting the failed step/job to SUCCESS. Source-run failure, diagnostic/image approval status and pending publication remain distinct.
- Three new tests cover bounded transient retries with identical request and delay sequence, immediate permission/rate-limit rejection and exhausted transient failures, and retained entries/no-tree/non-approved checkpoint on tree failure. Existing 18 entrypoint/provenance/mode/digest/count/lease tests remain in the same 21-test suite. Inspected recorded old-script RED (eight subtest errors) and new 21/21 GREEN.

No broad tests, captures, retries against the live API, implementation edits or remote operations were repeated. The earlier recovery's final tree 502 remains a failure; this reviewed code enables a truthful retry/checkpoint rather than retroactively claiming its success.
