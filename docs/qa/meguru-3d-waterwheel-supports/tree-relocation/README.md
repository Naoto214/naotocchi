# Single river tree relocation — approved option 2, 2026-10-11

Baseline ebec89db9add8d0de28dbf07d8416f61868dc9e3 / tree c64ab4b93b2d4433b5d0f9cae9454c0f890dfed4. User approved an exception only for tree river_lake:68: move its appearance and collider together, preserve its trunk/branches/leaves/size and all waterwheel geometry/axis/behavior/location. No general relocation policy or other-object placement changes. Compare candidates, implement/verify/save without another approval unless a major new conflict or scenic issue appears.

## Candidate and scope

Selected offset (+64,-144), distance157.581725; tree center (1456.3585151506252,3185.7790468973562). About1.08 times nominal tree size146.5505. This is the shortest passing sampled candidate on a2-unit grid within180, using conservative enclosing geometry, not a claim of continuous/exact global optimality. Short side42 approaches tree76/decorations; +z80 approaches the road; -z80 intersects conservative grass envelopes. Short diagonal(-8,-68) clears wheel/trees but puts roots over grass343. Leftward candidates cause the existing obstacle builder to shift/shrink the collider and are rejected. Broad AABB-only tree tests were too conservative; cylinder/ellipsoid support bounds avoid those false positives. Bounds cannot prove that every rejected candidate actually intersects a triangle.

Search uses production terrain grounding, enclosing cylinders for trunks/soft plants, ellipsoids for crowns, full360-degree wheel sweep box (half axial10, radial R+5), and posts/axle bounds. Required separation: wheel/support/tree/solid collider>=5; soft decorations>=0.5; road collider>=25. All solid colliders checked; visual neighbors whose original centers are within400 checked. The renderer currently builds static wheel instances; behavior remains unchanged. Full-sweep proof is geometric across every hypothetical rotation angle, not a newly animated runtime wheel or physical performance result.

Reproduce with `node compare-candidates.cjs <clean baseline checkout> <output JSON>` from this directory. Baseline commit is guarded; production harness cwd is bound before initialization. candidates.json retains source SHA256, actual bounds, comparisons and limits. Source inspection and independent review found no blocking geometry/code issue. Final image QA remains pending at this implementation checkpoint.

## Implementation and protection

A guarded authored correction runs after generic3D placement and before obstacle/grid construction. Region, tree index/kind/layer/size/original coordinates and neighboring wheel identity/original prop coordinates must match. It cannot affect2D, another tree or another region, nor cascade into generic relocation. Future generation changes that invalidate the identity fail closed and VQ30 exposes the unresolved conflict. No renderer/runtime architecture, Character3D, Expression, save/schema or season changes.

13-region comparison: every2D world unchanged;12 complete3D worlds/descriptors unchanged. In river_lake, reversing only tree68 prop/collider coordinates and rebuilding its collision grid restores the entire original world byte-for-byte; rendering differs only for tree68 x/z and collider x/z. All parts, other object descriptors, counts and residents identical. See protection.json.

VQ30 catches the original collider overlap (RED). Initial implementation guard incorrectly compared the pre-collider wheel prop to its adjusted collider position and remained RED; guard-failure.log is retained. Fixed to actual wheel prop coordinates; GREEN1/0. No test weakening. Related suite80PASS/1FAIL/exit1: AD-17 failed because sparse checkout omitted the saved comparison sheet. Restored exact tracked compare.html; AD-17/18 recheck2PASS/0FAIL/exit0 is retained separately. Raw failing logs retain Node whitespace unchanged. Four seasonal mode spot checks returned the same translated tree/collider, radius24.913585. Full CI and image QA remain pending. Cache token uses existing assetHash contract.

Local Chromium download failed with invalid/truncated ZIP; no local browser PASS is claimed. Dedicated Actions captures four actor-free complete-scene angles plus two normal gameplay views before/after, using exact baseline and source-bound tree/wheel checks. Actor-free views disable fade/animation and are not Human QA/performance evidence. Normal views retain normal actors/fade and record actual camera distance.

PR374 remains Draft/open/unmerged. No Ready/main/production Pages changes. WQ-WHEEL-TREE stays OPEN until target images and verification are reviewed; Human QA, physical iPhone performance and historical smoke-overlap variation remain unresolved. World incomplete.

## Verified target images — c010bf2

Implementation saved c010bf266c64b0db0bbc99e53a491b21c42c6185/tree4eb206e19ee86c2925889af52e53bd55e693f8a3; remote/local HEAD/tree matched and clean. Dedicated CI38148933408/artifact11706600660 succeeded. ZIP SHA2561f8ed63ffb0476e986812ef194320e8e77c2ce7866f9df0e06a41e9fab8e3108, exact before/after commits, three source file hashes and exit0 verified. Six pairs/twelve originals retained in inspection-c010bf2; no duplicate ZIP saved.

All4close complete-scene pairs show the former trunk removed from the hub/spokes/rim/supports. Normal reverse view shows a separate readable wheel; normal-road view retains partial occlusion from an unchanged foreground tree. Relocated tree keeps its original branching/crown form and appears grounded; no obvious new structural interference, road blockage or conspicuous scenic gap. Independent code/geometry and all6pair image reviews found no blocking/new major issue. This supports the narrow automated visual fix; Human QA remains unapproved.

Four close views have identical triangle/draw-call counts. Normal-road is -14triangles/-1call, reverse unchanged; normal camera distances436.097962–447.438830 and actor/fade/culling variation mean no performance improvement is established. WQ-WHEEL-TREE geometry/target-image checks pass for this candidate; final regression/CI still pending. Historical smoke-overlap variation remains a separate unresolved issue.

## Final verified CI and unit outcome

CI38148933340 all5jobs SUCCESS. Regression artifact11705847766 ZIP SHA256575321c7f579af4bdf329f5ab50c1f0beb495f68b9d4ae21e5089e206dbb00ee; commit c010bf2, three local product hashes, exact package command, raw TAP totals and exit verified:2887+80PASS/0FAIL/0cancelled/0skipped/exit0. Node concurrency4 package pipeline, not unmodified npm test. See regression-verification.json. Compact source/command/result evidence remains in git after the original artifact expires2026-11-10; no duplicate successful regression ZIP stored.

Browser decoded logs confirm smoke13/corridor8issues[], visibility2832/hidden0/partial1/issues[], captures86world+50gallery outputs/no exceptions/no nonzero error lines. Broad browser ZIPs not downloaded or newly reviewed. Dedicated six target pairs are retained separately. Bridge38148933323SUCCESS without a fresh bridge-image review claim. Smoke overlap4.973799150320701e-14 is recorded; historical variation is not explained by this result.

WQ-WHEEL-TREE is resolved as this bounded implementation/automated-QA unit. No new major issue found. Prior pending statements above describe earlier checkpoints. Human QA/physical iPhone remain unapproved; World incomplete. No generalized relocation exception. See remaining.md for further gates. PR374 Draft/open/unmerged and correct base rechecked; no Ready/main/production Pages change.
