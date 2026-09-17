# Jellyfish expressions — 2026-09-17

## Scope and baseline

Production batch: jellyfish (クラゲ), eight stages × ten independent expressions = 80 new PNGs, targeting eleven lines / 88 stages / 880 expressions. Whole-species batches are authorized without stage approvals. PR278 remains Draft and unmerged.

Baseline GitHub HEAD b7d969e5c43c63fad46c0665d68642c84cfc01b4; local HEAD ede3cfb39c90d4dddda47a8fe4095216a3e4c4f7; identical tree e9830a8ec7af6eb91525d6c81c54c90e99c943b5. Main bcdd6a6811ce8255ef16895ffff26f53b89d1478. Local checkout was clean. The PR already had conflicts. Actions, statuses and check-runs were empty, not passing CI. Preserve all241 historical sparse-index entries.

## Artwork and placement

Every expression is a separate built-in imagegen edit referencing its original stage. Preserve early polyp rocks/stems, stacked disks, star-shaped ephyra, later bells and tentacles, blue/pink colors and decorative bubbles. Eight originals were inspected individually and on an actual coordinate grid; face anchors were overlaid and reviewed. Later stages have faces right of center. Existing transparent128×128 original-bounds normalization is unchanged. Generative shape variations remain; bodies are not pixel-identical composites.

The face-center-within-original-bounds regression passed after adding all eight observed anchors. Shared mark colors, outlines and reactions remain unchanged. Generate only jellyfish placements, preserving all80 previous placement records and prior81 requested corrections.

## Verification in progress

Independent integration review found no critical, important or minor issues. Independently rerun focused integration tests:26 passed,0 failed. Existing800 image routes and SVG outputs were identical to the fixed baseline. All80 separate images were generated successfully and normalized;80 unique sources and original/source/final hashes are recorded in the manifest. This is a WORK-IN-PROGRESS handoff checkpoint, not a completed release. Jellyfish placement generation, all80 marked-composite visual review, independent final art/hash review, full npm test, cache bump and Site update/deployment are pending. The published Site remains the validated800-expression hermit-crab version47 (hc-8394cd1f).

## Preview and limitations

Update only owner-private project appgprj_6aa908e9357c8191abb0f486be58697c. The gallery uses PNG/SVG/CSS static composites, not device screenshots; sweat is approximate. The user evaluates real-device appearance. Zero detected intersections does not establish ideal appearance. Keep normal images, gameplay numbers, romance conditions and save format unchanged.

## Handoff workspace and next actions

Workspace /workspace/scratch/da3674e89b1f; code emotion-code; Site emotion-site. Generated source records: jellyfish-records/*.json; original generated PNGs: generated_images/. The manifest is docs/qa/jellyfish-expressions-20260917-manifest.json. Do not regenerate all80 images. Sources were shown during generation, but all80 final marked composites have not yet been reviewed.

Helpers in workspace: finalize-jellyfish-art.cjs (already completed), check-jellyfish-preservation.cjs, prepare-jellyfish-site.cjs and check-jellyfish-site.cjs (the last two are prepared but not run). Integration reports: jellyfish-integration-report.md and jellyfish-review-integration.md. Face-coordinate overlay: jellyfish-anchor-grid.png.

Next: generate only jellyfish placements with tools/place-expression-marks.cjs jellyfish; run npm run bump; create gallery using tools/expression-review-gallery.cjs with jellyfish filter; check all880 marks/528 sweat envelopes; review all80 composites and fix clear defects; run full npm test and preservation check; independently verify80 manifest records/240 hashes. Then update the same Site, validate packaging/gzip, deploy, and save the final reviewed tree on the existing Draft branch. Do not merge main.

Last completed800-expression baseline:1043 tests passed,0 failed/cancelled/skipped,800 marks/480 sweat envelopes with0 issues. These results do NOT validate the new jellyfish checkpoint. Site source HEAD689ab180578178d3a56b63a06e0dd693b8a615fe, private version47, succeeded deployment appgdep_6aab280e05bc8191afcc46191c36b3b9.
