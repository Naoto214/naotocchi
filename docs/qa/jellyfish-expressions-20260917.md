# Jellyfish expressions — 2026-09-17

## Scope and baseline

Production batch: jellyfish (クラゲ), eight stages × ten independent expressions = 80 new PNGs, targeting eleven lines / 88 stages / 880 expressions. Whole-species batches are authorized without stage approvals. PR278 remains Draft and unmerged.

Baseline GitHub HEAD b7d969e5c43c63fad46c0665d68642c84cfc01b4; local HEAD ede3cfb39c90d4dddda47a8fe4095216a3e4c4f7; identical tree e9830a8ec7af6eb91525d6c81c54c90e99c943b5. Main bcdd6a6811ce8255ef16895ffff26f53b89d1478. Local checkout was clean. The PR already had conflicts. Actions, statuses and check-runs were empty, not passing CI. Preserve all241 historical sparse-index entries.

## Artwork and placement

Every expression is a separate built-in imagegen edit referencing its original stage. Preserve early polyp rocks/stems, stacked disks, star-shaped ephyra, later bells and tentacles, blue/pink colors and decorative bubbles. Eight originals were inspected individually and on an actual coordinate grid; face anchors were overlaid and reviewed. Later stages have faces right of center. Existing transparent128×128 original-bounds normalization is unchanged. Generative shape variations remain; bodies are not pixel-identical composites.

The face-center-within-original-bounds regression passed after adding all eight observed anchors. Shared mark colors, outlines and reactions remain unchanged. Generate only jellyfish placements, preserving all80 previous placement records and prior81 requested corrections.

## Historical checkpoint verification (superseded below)

Independent integration review found no critical, important or minor issues. Independently rerun focused integration tests:26 passed,0 failed. Existing800 image routes and SVG outputs were identical to the fixed baseline. All80 separate images were generated successfully and normalized;80 unique sources and original/source/final hashes are recorded in the manifest. This is a WORK-IN-PROGRESS handoff checkpoint, not a completed release. Jellyfish placement generation, all80 marked-composite visual review, independent final art/hash review, full npm test, cache bump and Site update/deployment are pending. The published Site remains the validated800-expression hermit-crab version47 (hc-8394cd1f).

## Preview and limitations

Update only owner-private project appgprj_6aa908e9357c8191abb0f486be58697c. The gallery uses PNG/SVG/CSS static composites, not device screenshots; sweat is approximate. The user evaluates real-device appearance. Zero detected intersections does not establish ideal appearance. Keep normal images, gameplay numbers, romance conditions and save format unchanged.

## Handoff workspace and next actions

Workspace /workspace/scratch/da3674e89b1f; code emotion-code; Site emotion-site. Generated source records: jellyfish-records/*.json; original generated PNGs: generated_images/. The manifest is docs/qa/jellyfish-expressions-20260917-manifest.json. Do not regenerate all80 images. Sources were shown during generation, but all80 final marked composites have not yet been reviewed.

Helpers in workspace: finalize-jellyfish-art.cjs (already completed), check-jellyfish-preservation.cjs, prepare-jellyfish-site.cjs and check-jellyfish-site.cjs (the last two are prepared but not run). Integration reports: jellyfish-integration-report.md and jellyfish-review-integration.md. Face-coordinate overlay: jellyfish-anchor-grid.png.

Next: generate only jellyfish placements with tools/place-expression-marks.cjs jellyfish; run npm run bump; create gallery using tools/expression-review-gallery.cjs with jellyfish filter; check all880 marks/528 sweat envelopes; review all80 composites and fix clear defects; run full npm test and preservation check; independently verify80 manifest records/240 hashes. Then update the same Site, validate packaging/gzip, deploy, and save the final reviewed tree on the existing Draft branch. Do not merge main.

Last completed800-expression baseline:1043 tests passed,0 failed/cancelled/skipped,800 marks/480 sweat envelopes with0 issues. These results do NOT validate the new jellyfish checkpoint. Site source HEAD689ab180578178d3a56b63a06e0dd693b8a615fe, private version47, succeeded deployment appgdep_6aab280e05bc8191afcc46191c36b3b9.


## Final validation — resumed 2026-09-17

Resumed existing clean checkout at local8777e6ea1f99cd83a1ba68e802d6b1c82f50ffd0, matching GitHub e2d65c72893811b29dec9dfbcd75b41cc3e4cd44 tree ff3742989e755b34da846722a7cde576a8315086. Latest main observed cdbdc64cd9d60a7d58bc357b01b4e172565e6630; no main integration performed. PR278 remained Draft, unmerged, with pre-existing conflict. Checkpoint Actions/status/check-runs each0: not a passing CI result.

- Reused all80 generated PNGs without regeneration. Ran `tools/place-expression-marks.cjs jellyfish` only, then `npm run bump` (37 cache tokens).
- Root visually reviewed all80 final marked composites across jellyfish1–4 and5–8 overview sheets. No obvious overlap or malformed placement requiring correction. Rocks, stacked bodies, juvenile star shape, bells, tentacles and bubbles remain visible. Face-relative placement is constrained by tentacles and original bubbles; no claim of ideal spacing or pixel-identical body shape.
- `tools/check-expression-placement.cjs`:880 marks,528 sweat motion envelopes,0 issues.
- Preservation helper:800 prior asset routes,800 prior SVGs and80 placement entries identical;0 prior PNG changes.
- Independent final reviewer:80 unique stage/state records and80 unique generated sources; all240 original/source/final SHA256 hashes match; all80 final PNGs128×128 RGBA with transparency and original bounds. All1101 locally present baseline character PNGs byte-identical, including800 expressions. Gameplay/romance/save/shared styles/reactions unchanged. Focused suite42 passed,0 failed/skipped; no findings.
- Full `npm test`:1085 passed,0 failed,0 cancelled,0 skipped, exit0; Node test duration97787.878377ms. Smoke, dialogue and visual-route checks preceding the Node suite also completed successfully. This is the final jellyfish result, superseding the prior800-expression1043 result.
- `git diff --check` passed. Historical241 skip-worktree index entries preserved.
- Same Site package prepared with11 lines/88 stages/880 records, initial jellyfish filter and80 current-batch IDs. Image version jf-8b67e08b. Read-only Site verification matched all80 new PNGs,8 sheets and800 prior PNGs to validated source/baseline; tap/memo/copy behavior retained. Static composites and approximate sweat are not device screenshots. iPhone appearance remains user review.

### Published confirmation Site

Same owner-private Site version48, source1ccfa4fff0adde7988cca62f34bc281d316f2c96, image version jf-8b67e08b. Packaging completed with exit0; gzip integrity and required dist/.openai/hosting.json, index, image and sheet entries checked before upload. Deployment appgdep_6aab65310528819194f7a5f5f092da2d succeeded. Game: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site ; selectable gallery: /mark-review/. No new Site created or access change.
