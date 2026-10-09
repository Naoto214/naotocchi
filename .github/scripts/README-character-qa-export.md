# Character QA evidence recovery

Use the existing `Recover Character wave evidence` workflow when artifact download from an executor fails. This is transport and durable presentation, not image acceptance or a new capture pipeline.

1. Set `.github/character-3d-qa-export.json` to an exact successful Character run, source commit, artifact IDs, official SHA256 digests, selected family names, and required image counts. Export only what needs review.
2. Save the request through Git Data API on the existing Draft rollout branch. Request-only changes trigger recovery without the full Character capture matrix.
3. The workflow downloads original artifacts inside Actions, validates archive provenance/digests, retains selected original bytes and raw JSON, and prepares Git blob/tree objects. No `git push`, ref update, main change, Pages deployment or review approval occurs.
4. Fetch the `recover` job log through the GitHub connector. Parse the JSON after `QA_EXPORT_RESULT=`; do not paste binary/base64 into chat. The small result also exists as an artifact.
5. Confirm the live rollout HEAD equals `expectedHead`. Inspect the prepared tree difference: every changed path must be within the returned immutable source-specific `docs/qa/character-3d-full-v0/export/<sourceCommit>/` directories. Commit it with parent `expectedHead`, then use the connector ref update with `force=false, expected_sha=expectedHead`. If moved, stop and rebase only the listed evidence entries onto a newly checked head; never force.
6. Fetch that commit normally. Verify local/tree/remote identity. GitHub renders each README with the original four-view and state boards plus normal-distance images. Extract `raw-evidence.zip` for full-resolution individual images and verify its files against `manifest.json`.
7. Perform the actual visual review and save its outcome separately. Export success never changes coverage, runtime registration, or Human/iPhone gate status.

By default, the source run must be completed with conclusion `success`. To recover existing nonplayer images when an unrelated job failed, explicitly add `"successfulCaptureJobId": <exact job ID>` to the request. The exporter fetches that job through `actions/jobs/<id>` and requires the requested ID, run ID, source SHA and rollout branch to match; its name must be exactly `nonplayer-candidate-review`, with status `completed` and conclusion `success`. The overall run must be completed with conclusion `success` or `failure`; cancelled or unfinished runs are rejected. This option accepts only artifacts whose API name and request name are exactly `full-rollout-nonplayer-review-<sourceCommit>`, from the same run, SHA and branch. Existing expiry, official digest, safe ZIP, count and branch lease checks still apply.

Every prepared result and exported manifest records `sourceRun` and `sourceRunConclusion`. When the option is present, both also record `successfulCaptureJobId`, `successfulCaptureJobStatus` and `successfulCaptureJobConclusion`. A failed overall run stays recorded as `failure`; the manifest stays `PENDING_VISUAL_REVIEW` and the result stays `PREPARED_NOT_COMMITTED_NOT_APPROVED`. Review the original images before accepting them, and close unrelated CI failures separately before promotion. Recovery does not rerender unchanged images or approve the test gate.

The workflow token is ephemeral, scoped to repository contents-write/actions-read; it is used only for GitHub API requests. The signed archive redirect receives no GitHub Authorization header. Each output manifest records the original artifact ID/name/digest and source commit plus selected file hashes. Prepared trees remain unpublished until the leased connector update.

For candidate-only Phoenix visual fixes, commit marker `[qa:phoenix]` keeps the full dedicated job but scopes capture to Phoenix four views, all32states/stage and normal distance. Unrelated capture jobs are SKIPPED, never counted as passed integration. Ordinary commits (including promotion) retain the complete matrix. Use only when runtime registration is unchanged.

Four-view originals are also published directly beside the contact boards, so coverage records and visual review can link to individual images without ZIP extraction. All32-state raw cells remain in the byte-preserving archive.

`[qa:god]` likewise scopes candidate captures to all eight God stages. Either scoped marker runs full dedicated regression plus that family’s factory/stage mutation suite. Ordinary commits still run all mechanism mutations; scoped success is not full integration acceptance.

### Completed integration runs with mixed outcomes

When an integration run completes with an unrelated failed job, set `artifactJobEvidence: true` and supply `jobId` plus `evidenceMode` on every artifact selection. `successful` requires the exact completed SUCCESS job bound to the artifact name (family-specific stage job, stage aggregate, gallery, human/fish performance, dedicated, Meguru, or nonplayer capture). A failed overall run stays recorded as `sourceRunConclusion: failure`; image exports remain `PENDING_VISUAL_REVIEW`.

`diagnostic` is restricted to the existing `full-rollout-meguru-<source>` artifact from the exact completed FAILURE `meguru-wave` job. It retains JSON only, marks `DIAGNOSTIC_NOT_APPROVED`, and never exports or approves images. Use it to inspect failed runtime evidence without treating the job as successful. Required-file counts, source/branch/job/artifact identity, archive SHA256/size/path checks and both expected-head checks remain mandatory. In-progress, cancelled and timed-out runs/jobs are rejected. This mode cannot be mixed with the older `successfulCaptureJobId` option and never updates a branch ref.

## Transient Git API failures

JSON API calls retry only HTTP502/503/504, at most3 attempts of the same request with1s/2s backoff. Permission errors, rate limits, source/digest/count failures and moved leases are not retried. POST calls here create immutable Git blobs/trees only; this helper never creates or updates refs.

After all requested artifacts and blobs are verified, `qa-export-result.json` and `QA_EXPORT_BLOBS` retain `VERIFIED_BLOBS_TREE_PENDING_NOT_COMMITTED_NOT_APPROVED` before the final tree request. The result artifact is uploaded even on failure when this checkpoint exists. A caller can reuse those exact verified entries to prepare a tree against the recorded base and then perform its ordinary path/provenance comparison and fresh expected-head lease. This status has no tree or commit and is not image approval. The final `QA_EXPORT_RESULT` still requires the post-tree head check and remains PREPARED_NOT_COMMITTED_NOT_APPROVED.
