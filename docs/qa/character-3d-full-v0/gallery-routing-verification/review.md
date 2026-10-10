# Gallery routing review

Scope: pending changes to `character-3d/gallery.html`, `character-3d/full-gallery.html`, `tools/character-3d/gallery-smoke.cjs` and new `tests/character-3d-gallery-routing-test.cjs`.

Spec verdict: PASS. Quality verdict: PASS for the corrected slice.

Critical: 0. Important: 0 remaining. Minor: 0.

## I1 addressed — Nonplayer source-description dereference

The initial change admitted approved role-prefixed keys while `syncUi()` still dereferenced `SPEC.ARCHETYPE_REUSE[st.id].basedOn` for every nonplayer. An independent read-only evaluation confirmed TypeError for all 42 current approved role keys, before gallery readiness. Root added an explicit approved `SPEC.NON_PLAYER` source-description branch, retaining the player and legacy descriptions. Independent diff inspection confirms the narrow fix; no approval, registry or source-authority scope is widened.

The new regression executes the actual whole `syncUi()` function with a stub DOM for every production-approved nonplayer, both legacy IDs and a player stage. It also verifies the source reference path. The approved-key loop automatically includes Author after promotion. Recorded new-test RED was the actual TypeError (two existing tests PASS/one FAIL); the corrected run is 3/3 PASS, no skips/failures. Finding ADDRESSED.

## Other scoped assessment

The full-gallery links correctly use `specKeyFor` to preserve namespaced model IDs, legacy plain IDs and exact player stages. ALL includes only approved runtime keys, so unreviewed factory rows remain excluded. The new smoke traversal filters all exact nonplayers, follows their generated href, and asserts actual selected ID, stage zero and successful template status before writing PASS. Its count assertion should include a future approved Author; current filters produce exactly 44 uniquely matched nonplayer rows. It does not recapture their image gates or claim iPhone results.

## I2 addressed — Require all five selected nonplayer images

The bounded follow-up correctly scrolls lazy images into view, awaits decode and requires nonzero dimensions. Its missing-URL control requires rejection, restores the valid URL and decodes again before PASS. Review identified that only cat initially required all five images, allowing selected nonplayer missing boxes to escape the decode loop. Root added `article img` count equal to five before each selected nonplayer decode; independent source inspection confirms this guard. Finding ADDRESSED. Missing references and broken URLs now both prevent a smoke PASS, while the UI still presents absent evidence explicitly.

The new legacy caption correctly states that the four columns show the same comparison board and only its rightmost four tiles are reviewed; it does not claim separate raw views. Browser execution of decoding and its negative control remains pending CI.

Inspected recorded initial routing RED2 to GREEN2, combined 8/8 focused PASS before the additional syncUi test, and the subsequent syncUi RED/GREEN described above. Browser smoke is explicitly unrun locally without Chromium and remains a final-integration gate; these unit results are not browser/image approval. No implementation, repeated tests/capture or remote operations were performed.
