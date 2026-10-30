# PR #426 — iPhone QA follow-up (2026-10-23)

The user's iPhone feedback is the acceptance input. This implementation remains a Draft until the owner tests it on iPhone Safari. No merge into GitHub main and no GitHub Pages deployment.

## Result

- Fix artwork-relative facing from movement direction. Dog/cat/turtle/fish and the left-facing companions have their native orientation accounted for; right-facing unicorn/eagle remain correct. Expression paths resolve to the same native character. Front-facing artwork is retained. Only the visual body reflects around its painted center: selection ring, speech/UI and equipment are outside the transform. Motion v2 retains its own response transform, including paused care.
- Expand the Home river half-width from 160 to 620 in the existing shared Meguru world. Relocate bank trees/rocks, keep the fixed camera, and extend the visible bank activity space. Actors remain within the foreground safe area; this is not a new general terrain navmesh.
- Remove the fish screen overlay. Add a fixed pool of up to eight three-fish schools inside the 3D scene, depth-tested below the water, with bed shadows and surface ripples. Fish center y=-17 (small vertical motion), water y=-11; water opacity .58. Canvas fallback has matching layer ordering. Reuse geometry/materials and dispose through the existing renderer lifecycle. Water waves and lighting use the common renderer.
- Retain existing size ratios and the existing number-aware cast solver. Add wider movement bounds, body-size-aware separation and approach distances, preserve the actor's side on approach, and prioritize an actual tapped body before another actor's padded hit box. Resize/roster changes re-clamp destinations.
- Integrate latest main `3d7a9e0812deb41eb7c2bb5196af1d14dbf01d81` (#420 minigame family streak) into this feature branch. Preserve its tests and behavior. Local verified runtime build commit: `25d0e2434de3f37859b9e7e57443f4c5aa4178d4`.

## Size decision

Compare 100/90/80% for 1, 2, 3, 4 and 6 official actors at 390px, using the same layout solver and alpha bounds. All 15 original frames and a contact sheet are saved here. The fixture also provides 70% for owner inspection.

**Default: 100% of the existing solver output**, with expanded activity space and separation. At this viewport the existing main image frame already changes from about 165px alone to 95–96px with a partner. Additional 80% makes the smaller partner and expressions unnecessarily difficult to read. No extra crowd shrink is applied. Species/stage proportions are unchanged. The comparison fixture includes baby/adult/large/old dog, turtle and plush selections, without altering saved state or visitor eligibility.

## Verification

| Check | Evidence |
|---|---|
| Final Home + new main integration | `final-focused.log`: 46/46 |
| Final care, growth, offline, relationship, expressions, Motion v2/L2 | `final-regression.log`: 135/135 |
| Asset/version and common 3D gates after token fix | `asset-gate-green.log`: 21/21 |
| Remaining official test-command group | `project-tail-green.log`: 137/137 |
| Python packaging | `packaging-tests.log`: 15/15 |
| Independent review fix pass | `review-green.log`: 15/15 |
| Final package | 4,047 runtime files; 1,662 static and 2,954 dynamic references validated |
| Site source match | `site-source-verification.json`: packaged preview bytes match pushed source |

The full official package test command was run with test concurrency=2. Its first groups passed 40, 26 and 24 tests; smoke/dialogue/visual checks completed. The large group ran 3,213 tests: 3,210 passed, and three asset-token checks failed because the new tokens lacked the required YYYYMMDD-8hex format. The format was corrected; the complete affected files then passed 21/21, and the previously unrun final group passed 137/137. This is a full run plus scoped fix reruns, **not a claimed single all-green rerun**. Latest-main integration and review fixes were separately covered by the final focused/regression runs. Raw initial failures are retained in `project-tests.log`; do not interpret intentionally injected error logs as failing assertions.

Independent review found two important issues: unicorn/eagle native facing and rear-body tap selection behind padded foreground hitboxes. Both were reproduced in failing tests and fixed. Partner transform-origin specificity was also corrected. No unaddressed critical review finding remains.

## Browser observations and limits

Cloud Chrome at 390×844, with Canvas 3D fallback (WebGL unavailable). Observed left/right dog motion in forest and water; shiba and other actors moved both ways in the multi-actor fixture. Verified care interruption, visitor departure/re-entry, selection and autonomous resumption; snapshots recorded walking, looking, approaching, together, sitting, resting and observation. On the real final game page, cleaning removed two poops, feeding updated the existing meters and conversation appeared. Also checked the 320px layout.

Water observation: life clock 16.15, spawned 7, active 6 of maximum 8; visible schools remain within the wide water band. Recorded average draw 10.73ms / p95 31ms in this cloud Canvas session. Browser updates were throttled to about 1fps, so these are neither iPhone performance measurements nor proof of Safari/WebGL fluidity. Automated geometry tests verify submerged depth, routes, pool bounds and resource reuse. Real iPhone transparency/occlusion and touch feel remain owner acceptance items.

Screenshots: `water-comparison.jpg` (version 3 before / wider river after), `size-comparison.jpg` (all 15 comparisons), `cast-*.jpg` (full frames), `forest-left.jpg`, `river-right.jpg`, `city-four.jpg`, `game320.jpg`. Size captures are paused for comparison, not proof of moving collision handling; movement is covered separately by browser observation and model/adapter tests. Water comparison captures differ in game time and care values.

## Owner trial

Use the existing private trial URL. The landing page offers the three regions; “複数キャラの操作見本” opens the count/size fixture. Try 1/2/3/4/6, 100/90/80%, select different actors and left/right movement, care interruption and visitor return. Final adoption is the owner's iPhone Safari decision. Original save data and production Pages are untouched.

Publication identifiers and access verification are in `PUBLICATION.md`.

## Late main update: #429

During final remote verification, main advanced to `acd4ece17c293c9365a41216b0ac4492174ffcf5` (quick postgame dialogue and scene-exit conversation cleanup). It was merged into the Draft branch, preserving both Home and quick behavior. Index/package/allowlist conflicts were resolved by retaining both sets of scripts/tests and recalculating only changed asset hashes.

Final local build commit: `65a99750b16f7aa92f26f2f2b22b2b0a7182b964`. `main429-integration.log`: **105/105**, including Home, quick, postgame, Motion, relationship runtime and asset integrity. `package-report6.json`: 4,048 runtime files, 1,663 static / 2,954 dynamic references. Prepared preview 4,053 files matches Site source exactly. Version 6 supersedes version 5. Existing visual comparisons remain valid for the unchanged Home renderer/layout. A final browser reload reached another app on the shared preview port, so no new browser pass is claimed after #429; its integration is covered by the 105 automated tests.
