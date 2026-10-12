# Task 10 independent code/spec review

Reviewed clean worktree `/workspace/scratch/150320e8a2fd/nonplayer-author`, exact base `634dbf50ac27019b1387f57a9069ae255cc319c5` through head `e67902df19c7b9781b8743b3d867fec35380f901`. Read the brief/report, ten-file diff, candidate/factory/route/legacy/default tests and controls, actual simulation/renderer routing, supplied execution logs and default audit. Opened actual singular `assets/characters/author/naoto.png`. Performed a targeted read-only actual runtime-harness staging probe; no implementation edits, broad test/control replay or screenshots.

**Current scoped code/spec PASS after the root correction below. Critical: 0. Outstanding Important: 0. Original worker Important: 1, resolved. No additional actionable minors. Actual author image gate and human/iPhone approval remain OPEN.**

## Root I1 follow-up — resolved

Reviewed the root's correction in assembled main, current HEAD `d7dc8973d7acfadb9298712505bb8735ffdbf0ce` plus the integrated uncommitted Task 10 files. Compared the capture helper directly with exact worker head `e67902df`: the only capture-tool additions are a comment and initial placement of the same actual actor at QA player + `[85,15]`, with matching target coordinates, front heading and bounded idle pose. The original coordinates/pose are captured before placement; existing restoration remains unchanged. No production region or actor identity change is added.

Independent real-runtime harness probe now measures initial author distance **86.313383**, below the renderer's 1500 near-3D threshold. Original provenance remains `[-160,4300]`; release restores the same actual object's original coordinates. Thus the causal readiness defect is resolved before the browser wait, without bypassing presenter readiness.

The route regression adds the actual pre-readiness distance assertion. Its exception handler now rethrows unexpected assertions instead of replacing them with the injected-failure expectation. Inspected `author-near3d-red.tap`: old placement fails the new range assertion; `author-near3d-green.tap`: affected route/HTTP/planner **3/3 PASS**, 1.361 seconds. `author-near3d-mutation.log` records the uniquely scoped omitted-placement control **1/1 RED → restored selected baseline GREEN**, exact bytes restored. Current capture-tool SHA256 independently matches that final log: `f25ed7ddfc4d9358d030b5a4c885b92fe45caa802bcb28510c7e1e4de3c2af87`.

`author-root-integrated.tap` records the complete corrected assembled author baseline **11/11 PASS**, no skips/failures, 20.612 seconds; root confirms it was run after the near-3D correction. The affected route/HTTP/planner checks also pass separately as above. Whitespace check passes. No further code findings remain in this follow-up. Root's separate promotion/selector boundary evidence is outside this narrow route closure. Actual browser front/back, rendered yaw and image/source fidelity must still pass the controller capture gate.

## I1 — author distance readiness wait precedes required nearby placement

**Location:** `tools/character-3d/nonplayer-review.cjs:18–22,41–42`.

`stageAuthorResident` moves the actual memory-lake actor into the new forest resident list but leaves its original coordinates unchanged. `run` then waits up to 60 seconds for `char3dPresenter.has(actor)` before entering the distance loop that calls `installDistancePose` and places it next to the forest player. The existing renderer only places resident meshes below a 2600 distance and only supplies Character 3D information below 1500 (`meguru-3d.mjs:537–546`).

The read-only probe used the real legal `saveFor({kind:'author',id:'naoto'})`, existing runtime harness, existing `buildRegistry/createSimulation` and the exact exported staging helper. Immediately after staging it reports:

| Actual object | x | z |
| --- | ---: | ---: |
| Same original author resident | -160 | 4300 |
| Forest QA player | 0 | 190 |

Distance is **4113.113176**, beyond both renderer thresholds. The author is fixed and does not wander near the forest player while waiting. Its 3D instance therefore cannot be created at this point. The prescribed real normal-distance author capture times out before reaching the code that would make it drawable. Current unit tests verify the view/identity/owner route but never test this pre-readiness distance, and the reported PASS evidence did not execute a browser capture.

**Required correction:** place the same actual resident within the existing forest near-3D range before the presenter readiness wait, or install the first bounded distance pose before waiting. Preserve exact kind/id/key/asset, original-coordinate provenance, save/getter isolation, source resident-list index and final restoration. Do not broaden production regions, fabricate a new author actor or bypass the actual presenter readiness check.

**Meaningful regression:** with the real legal runtime harness, stage the actual memory-lake resident through the exact helper/order used before the readiness wait and require the actor-to-QA-player distance to satisfy the renderer's near-3D condition. The current implementation must fail this assertion. Verify the same object still returns to original coordinates/list index and draw/step adapters restore after a failure. A later controller browser capture must still prove real front/back yaw and a live exact author instance; a distance assertion alone cannot grant image PASS.

## Candidate and shared factory assessment

The new explicit `author:naoto` row points to the correct singular asset. Actual source inspection supports the youthful human, medium-short center-parted brown waves, white zip hoodie over dark shirt, slim navy trousers and dark sneakers with pale soles represented here. Source proportions and rendered silhouette remain the actual-image gate.

Closed torso, closed hair cap/eight curved locks, neck/zip/soles and optional details reuse the established humanoid builder. The default branches remain intact. New paths opt into outward physical caps; the produced regression checks terminal vertex normals, every indexed fan triangle and full radial fan counts. Rest floor, all-constituent physical contact graphs, canonical-face ownership, sibling isolation and nonempty actual eye/mouth rays cover all 32 states. Maximum actual expression count is reported **9376**, comfortably below 18000.

Permanent default tests freeze two factory reference inputs and the former humanoid function rather than mutable candidate rows. The supplied independent audit compares precise base/new implementations on **35 actual humanoid/celestial-humanoid inputs**, with exact geometry attribute/index bytes, owners/transforms/rest states, metadata and face target/spec. Its script enumerates affected existing Pilot/ROLLOUT stages and removes its temporary base module in `finally`. Independent deep-strict comparison against the base confirms **all 40 prior candidate rows identical, including signed zero**, with only `author:naoto` added. Root must preserve separately integrated Task 9/Spider corrections when assembling this older-base patch.

## Alias, bounded QA route and legacy capture

The production alias is narrowly gated by exact `kind:'naoto',id:'naoto'` and canonical `NON_PLAYER['author:naoto']` presence. Canonical and actual author identities remain null in production during candidate phase; the QA overlay resolves both to the same exact key. Other role/id spellings do not alias. Existing unreviewed production sentinel expectations are untouched.

The author QA save uses the existing legal dex unlock and natural memory-lake resident, never party membership. Staging preserves the actual actor object/identity and wraps only the QA session's existing renderer draw and simulation step. Production memory-lake remains 2D and `WORLD3D_REGIONS` remains forest-only. Metadata distinguishes original region/spot/coordinates, natural 2D and forest QA placement. Cleanup uses `finally`, restores draw/step/list/pose, is idempotent, and closes the browser context in a nested `finally`. These scope/cleanup choices are sound, subject to correcting I1 before readiness.

The explicit legacy option appends only cat_friend/shiba, preserving canonical companion role keys while using their actual legacy model keys. Existing SPEC stage/reference assets and archived reviewed comparison metadata are reused. Planning and execution skip legacy four-view shots and boards, append 32 states plus two distance views each, and count 36 candidate versus 32 legacy wave shots accurately. Default candidate selection is unchanged. Workflow pass-through is gated by config boolean `includeLegacyStatesDistance === true`; capture config and mutation selectors remain controller-owned.

## Inspected evidence and limits

Final supplied baseline: **11/11 PASS**, no skips/failures, 20.769 seconds. Supplied affected capture/HTTP/legal checks: **3/3 PASS**, 1.429 seconds. Inspected the three mutation transcripts: five original controls, eight resumed controls and four final controls demonstrate **17 intended RED controls** with restored baselines. An initially still-connected neck mutation was calibrated to truly detached geometry; the cloned-actor failure token was corrected to its actual identity assertion. Those adjustments did not weaken production assertions.

The final capture-tool hash differs from earlier mutation logs only after the disclosed coordinate-provenance additions; the final 11-test baseline covers those changes. Independent current SHA256 values match the report:

- candidate source: `581d9b5149338c1519ee321295b736661dc94ecc32b6907e38be12582bf68383`
- archetypes: `5af0d1e418b8223afa7c44d07c2c2f3a53c031a994342d874699d573c133a8d3`
- spec: `b0203e9dc2e2d9b1f64f4384ed2d6be770cb2d3adbcaa2e2da1bbec0268ae73b`
- capture tool: `5a298443b144e3e427114ffb559c41352bb57c926d28153340a69d73b070ab6e`

The reviewed commit has a clean worktree and whitespace check passes. Supplied execution results were inspected, not broadly replayed. No actual browser route/image result was available, so the capture readiness defect above was resolved as a concrete uncertainty through the targeted runtime distance probe. Re-review the scoped I1 correction before author distance capture; image/registration/save gates remain root responsibilities.
