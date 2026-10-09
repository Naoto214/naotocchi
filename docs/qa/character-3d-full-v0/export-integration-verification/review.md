# Artifact-job evidence export review

Scope: pending `.github/scripts/character_qa_export.py`, its existing Python test file and `README-character-qa-export.md` against `ae9c9ffe`. Runtime diagnosis and other QA changes are excluded.

Spec verdict: PASS. Quality verdict: PASS with one minor wording correction.

Critical: 0. Important: 0. Minor: 1.

- The explicit `artifactJobEvidence: true` mode remains separate from `successfulCaptureJobId`; absent opt-in keeps the original full-run SUCCESS requirement. New mode accepts only completed SUCCESS/FAILURE source runs. Exact source SHA, branch and run identities are preserved; unfinished/cancelled/timed-out outcomes are rejected.
- Every selected artifact requires its own positive integer job ID and known evidence mode. Recognized source-suffixed artifact names bind to exact existing job names, including family-specific `stage-evidence (<family>)`. Artifact/job IDs, source run/SHA/branch, name and completed conclusion are checked. The names agree with the existing workflow artifact/job routes. A successful job from a failed run does not convert the overall run to success.
- Diagnostic mode is restricted to failed `meguru-wave`/`full-rollout-meguru` evidence, filters selected content to JSON, requires JSON to remain and applies required counts after filtering. Manifest/README say `DIAGNOSTIC_NOT_APPROVED`; successful-job image exports remain `PENDING_VISUAL_REVIEW`. Raw selected bytes and per-file SHA/size provenance are retained.
- Existing official archive digest, size/path/duplicate/source metadata, expiration/count, branch and both expected-head guards remain in place. Per-artifact provenance is freshly copied, preventing one artifact's job verdict from leaking into another. The exporter only creates Git blobs/tree and a `PREPARED_NOT_COMMITTED_NOT_APPROVED` result; it creates no commit or ref update. Publication remains the controller's leased action.
- Six added tests exercise real entrypoint validation/packaging with mocked transport: successful stage bytes from failed source; JSON-only failed runtime diagnostics; wrong bindings/source/branch/status/outcomes; invalid explicit identity/mode and mixed-mode rejection; retained archive/count/lease guards. Inspected recorded 18/18 GREEN and the old-script RED (three failures/two errors). No test or remote export was repeated.

Minor M1: generated diagnostic README's ZIP link still says `All original selected images` although the archive is JSON-only. Use neutral `All original selected evidence` for both modes. Status/provenance already prevent approval confusion, so this is not a blocking gate defect.
