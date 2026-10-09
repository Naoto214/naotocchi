# Character QA evidence recovery

Use the existing `Recover Character wave evidence` workflow when artifact download from an executor fails. This is transport and durable presentation, not image acceptance or a new capture pipeline.

1. Set `.github/character-3d-qa-export.json` to an exact successful Character run, source commit, artifact IDs, official SHA256 digests, selected family names, and required image counts. Export only what needs review.
2. Save the request through Git Data API on the existing Draft rollout branch. Request-only changes trigger recovery without the full Character capture matrix.
3. The workflow downloads original artifacts inside Actions, validates archive provenance/digests, retains selected original bytes and raw JSON, and prepares Git blob/tree objects. No `git push`, ref update, main change, Pages deployment or review approval occurs.
4. Fetch the `recover` job log through the GitHub connector. Parse the JSON after `QA_EXPORT_RESULT=`; do not paste binary/base64 into chat. The small result also exists as an artifact.
5. Confirm the live rollout HEAD equals `expectedHead`. Inspect the prepared tree difference: every changed path must be within the returned immutable source-specific `docs/qa/character-3d-full-v0/export/<sourceCommit>/` directories. Commit it with parent `expectedHead`, then use the connector ref update with `force=false, expected_sha=expectedHead`. If moved, stop and rebase only the listed evidence entries onto a newly checked head; never force.
6. Fetch that commit normally. Verify local/tree/remote identity. GitHub renders each README with the original four-view and state boards plus normal-distance images. Extract `raw-evidence.zip` for full-resolution individual images and verify its files against `manifest.json`.
7. Perform the actual visual review and save its outcome separately. Export success never changes coverage, runtime registration, or Human/iPhone gate status.

The workflow token is ephemeral, scoped to repository contents-write/actions-read; it is used only for GitHub API requests. The signed archive redirect receives no GitHub Authorization header. Each output manifest records the original artifact ID/name/digest and source commit plus selected file hashes. Prepared trees remain unpublished until the leased connector update.

For candidate-only Phoenix visual fixes, commit marker `[qa:phoenix]` keeps the full dedicated job but scopes capture to Phoenix four views, all32states/stage and normal distance. Unrelated capture jobs are SKIPPED, never counted as passed integration. Ordinary commits (including promotion) retain the complete matrix. Use only when runtime registration is unchanged.

Four-view originals are also published directly beside the contact boards, so coverage records and visual review can link to individual images without ZIP extraction. All32-state raw cells remain in the byte-preserving archive.

`[qa:god]` likewise scopes candidate captures to all eight God stages. Either scoped marker runs full dedicated regression plus that family’s factory/stage mutation suite. Ordinary commits still run all mechanism mutations; scoped success is not full integration acceptance.
