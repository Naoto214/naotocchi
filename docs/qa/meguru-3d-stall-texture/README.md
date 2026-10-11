# City stall texture — approved A (2026-10-11)

Baseline:26778f69a791983da7618ae0bf73ae6719b44b56.
Six city stalls:336,340,348,524,556,557. Preserve counter/posts/basic form/dimensions/placement/collision. Cream canopy with restrained muted-green fabric edges; shallow counter plank joints. One common design, no merchandise or extra decoration. Existing static primitives only. Front/oblique/normal-play-distance comparisons and related/existing regression required. Implementation and QA pending. Waterwheel/tree interference, Human QA and physical iPhone performance remain OPEN; World incomplete.

Candidate: original canopy volume partitioned into cream21-unit center and two muted-green2-unit edges; no overlapping surface overlays. Counter2-unit top partitioned into1.8-unit support plus three0.2-unit planks with two0.18-unit joints. Base/posts unchanged; no other objects/descriptors changed. Existing geometry/materials only; +5parts per stall. Initial theoretical +60triangles was an overestimate: existing wbox omits its bottom, so actual +54 per stall / +324 for six. No renderer change.

VQ-29 RED: expected missing three-panel cloth treatment; then related71PASS/0FAIL/exit0. Existing Node module-type warning retained. All13region world2d/canonical3d/collision/object-count hashes match. Descriptor diff is exactly six IDs; base/posts and remaining object metadata identical. Independent read-only review: no Critical/Important issues; transforms/grounding/abutting geometry checked. Rendered appearance remains pending.

CI recipe: baseline26778f6, six front + six oblique gallery comparisons, six normal-play views with lateral player offset95 to reduce party occlusion. Gallery actor-free/static, not gameplay performance evidence. Actual normal camera distance comes from logs. Human QA/iPhone remain unapproved.

## Verified target capture

Product8b228fea786cdb187655f9755b3bc1dd7d53a1d9 / tree20f59c5d5c59635900a2c66dc7f245e21876e104 saved with expected parent and force=false; remote and local matched/clean. CI38129380378/artifact11699066689 succeeded. Exact ZIP SHA2569097ccef04eb60f6af5f786270dee57741965a274e62b3d8b6c826e40e8d13b4, both source commits/three-file SHA256 and runner exit0 verified. 36 originals retained (18 pairs); no duplicate ZIP.

All six front/oblique pairs inspected: unchanged silhouette, posts and counter; restrained cream canopy and muted-green edges, close oblique shows two fine shallow plank joints. Normal-play six pairs inspected: cream canopy reads at the original small scale; green edges and joints are too fine for assured normal-distance readability. Existing building ghost overlay affects348/556/557, retained as a fixture limitation rather than removing buildings. Not pixel-identical: natural camera easing yields before/after distance430.10–442.87 (exact values in verification.json); actors vary slightly. No appearance break attributable to this patch found. This is automated image inspection, not Human friendliness/appeal approval or physical iPhone validation.

Matched isolated12views each +54triangles /0calls; six normal-play views each +324triangles/0calls. Geometry cost, not measured frame-time improvement. The intended design has no need for visible deep joints at long distance. FullCI38129380354 pending; do not call it passed before verification.

Independent image review inspected all18pairs plus selected full-resolution views: no blocking visual issue; confirmed tiny normal-distance joints and existing overlay limitations.

FullCI browser4 jobs SUCCESS. Decoded job logs verified source8b228fe: smoke13/corridor8issues[]; visibility2832samples/hidden0/partial1/issues[]; broad captures136active outputs/no captured exception or nonzero error line. Browser archives were not downloaded or byte-verified; do not call broad images freshly reviewed. Dedicated18stallpairs are the appearance evidence. New smoke maximum0.0023790025392855796 remains nonzero, cause of historical differences unconfirmed. BridgeCI38129380359 SUCCESS, without fresh bridge-image QA claim.

## CI failure and token recovery

FullCI38129380354 finished FAILURE: regression2884PASS/2FAIL/exit1, subsequent80not executed; browser4SUCCESS. Both failures are in asset-integrity-test: the manually chosen `20261011-stall-a` token violates the existing YYYYMMDD-assetHash rule. This is an implementation mistake, not an obsolete test premise. Failed regression ZIP/source/commit/exit/counts verified and retained as anomaly evidence; never report the original run as success.

Fix: use exported bump-versions.assetHash for meguru.js, yielding20261011-61e68d0a. Only index cache token changes; meguru.js/meguru-3d.mjs byte-identical to8b228fe, so targeted visual evidence remains applicable. Independent review confirms formula and exact equivalence. Asset integrity + version checks8PASS/0FAIL/exit0. Initial local continuation80failed76/4because sparse assets missing; partial restores yielded78/2then79/1. These failures are retained; restoring exact tracked character/atlas/clear assets does not change product code or test premises. Future index token edits must include asset-integrity-test in the related suite.

Final local continuation80PASS/0FAIL/exit0 after exact tracked assets restored. This is a separate continuation, not a successful rerun of the original full pipeline. Cache-token correction will trigger new CI; pending verification.
