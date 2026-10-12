# Spider/Snowman and Author QA integration review

Reviewed pending main integration against `d7dc8973d7acfadb9298712505bb8735ffdbf0ce`: two promotions, coverage, test expectations, previously reviewed synthetic fixtures, exact Author selector, legacy capture configuration/workflow pass-through and the root Author readiness correction. Already reviewed Author geometry/shared defaults and the pending Eagle geometry correction are outside this review.

Spec verdict: PASS. Quality verdict: PASS for the inspected corrected integration.

Critical: 0. Important: 0 remaining. Minor: 0.

## Addressed integration finding

The initial integration retained null registration expectations for promoted Spider and Snowman in the first aquatic/distinct candidate tests. Root's dedicated run confirmed exactly those two failures (tests 9 and 114), with 448/450 passing. Root corrected aquatic registration to exact for all five approved candidates, and distinct registration to exact Snowman/null Eagle. Independent diff inspection confirms only those expectations changed: stable names and geometry/ground/closure/triangle/ownership checks remain intact. The recorded `two-promotion-expectations-green.tap` confirms both corrected tests PASS, exit zero. Finding ADDRESSED. This is not a claim that all 450 tests were rerun after correction; the upcoming source CI owns that full result.

## Other scoped conclusions

- The allowlist adds exactly `partner:knitting_spider` and `partner:snowman`, preserving prior approvals and exact stage-zero/role boundaries. Eagle and both canonical/actual Author identities remain null in production. Promotion-test pairs match the full allowlist; permanent synthetic unreviewed-factory and isolated HTTP-overlay checks remain intact. Real Author-null assertions are correct until actual promotion.
- Generated/saved coverage agrees at 291/293 exact, 2 pending and 291 four-view records. Exactly two saved rows change, referencing `export/73a1b4e384b1a636a1f2f557edd3afd1cd19dfe6/spider-yarn-eagle-snowman`. Prior waves/legacy mappings are retained. The source record and independent image review support Spider/Snowman PASS and Eagle REJECT; Author has no image approval.
- Mutation selection adds only exact `author:naoto` to `author-remove-it.cjs`; aliases remain unsupported and duplicate selection runs once. Capture config selects Eagle and Author with `includeLegacyStatesDistance: true`. Workflow passes that explicit boolean into the existing route. Legacy cat/Shiba retain role/model-key separation and skip four-view recapture while collecting 32 states and two distance views.
- The root correction addresses Task10's documented readiness-order defect: original Author pose is saved before the same real resident is placed near the forest QA player, and this happens before the live presenter wait. Original-coordinate provenance and draw/step/list/pose restoration remain intact. A focused regression now checks near-3D distance immediately after staging and restoration after injected failure. Legal unlock, natural memory-lake 2D presentation, nonparty identity and unchanged production region policy remain enforced; only the QA session adapts its rendered view. Actual browser front/back readiness, yaw and image acceptance remain capture gates.
- The changed paths are confined to the authorized character model/spec, QA tools/workflow, tests and evidence records. No 2D/Expression/save/gameplay/World/Home file change is introduced. Checkpoint preserves two pending image gates, historical verification and open legacy/full integration/Human/iPhone gates.

Independent read-only assertions checked exact additions and retained roles, boundaries, pending identities, promotion-list equality, Author selector/config, generated/saved coverage and exactly two changed source rows. Accepted root's recorded seven role mutations detected/restored, 28 identical Pilot hashes and exact protected groups. No tests, mutation replay, images, implementation or remote operations were performed. Actual capture and a fresh complete source-CI result remain open.
