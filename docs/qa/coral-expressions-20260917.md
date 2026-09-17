# Coral expression batch — final validation

Approved production-first continuation: eight coral stages × ten expressions = 80 new portraits; 13 species / 1040 active expressions total. Completed 960-expression baseline: GitHub 640539d5a9817eeac0634c3ae337ecb440421be3, local adb83f0664cf42f177505096ab420429da86e2f6, shared tree 672a7e5a01ab82e8c7ed8a3b9fb18690a76716fc. Intermediate62-image checkpoint: GitHub d4a43cc231bd05766225d736c46fcd23217e6c29, local5b0cccf333f4b22d6d352bedee08c84b01689054, shared tree bfdcfc4c7dbf3560eb314162ae6ff1511b70ab63.

## Art and placement

All eight originals inspected individually and on exact-coordinate face-anchor overlays. All80 portraits generated individually from their respective original, normalized by tools/normalize-expression-image.cjs to transparent128×128 matching original drawing bounds. Manifest records80 prompts, source paths and240 verified original/source/final SHA-256 values. Coral06 wantsPlay had an unintended face on the purple branch; one targeted imagegen correction removed it. Previous source and correction prompt retained in manifest. Existing960 expressions were not regenerated.

Preserved pink infant, stones, pink/orange branching forms and multicolored colonies. Stage06 targets main yellow face,07 upper orange face,08 large yellow polyp face; secondary faces remain visible. Generated shape/details vary: non-face pixels are not promised identical.

Ran tools/place-expression-marks.cjs coral only. Initial run reproducibly failed No placement coral/03 sick: branching silhouette fills the allowed head-width band. Relaxed only coral's sick-mark horizontal upper bound; angles, collision masks, sweat avoidance, radius/distance scoring and other species' conditions retained. Rerun succeeded without changing prior96 placements. npm run bump updated one expression-script cache reference.

Root and independent reviewer inspected all80 marked composites. No obvious overlap or malformed placement requires correction. Branches can move marks/sweat outward or above the face; zero collision does not mean universally ideal aesthetic spacing. PNG/SVG/CSS static composites and approximate sweat are not device captures. User checks actual-device appearance.

## Verification

- Full npm test:1169 passed, failures/cancelled/skipped/todo all0;122770ms. Log /workspace/scratch/da3674e89b1f/coral-npm-test.log.
- Geometry:1040 marks,624 sweat motion envelopes, issues0.
- Preservation:960 prior references/SVGs,96 placements,81 selected corrections unchanged; no existing PNG changes.
- Independent Git-blob checks:960 old portrait PNGs and248 normal stage PNGs unchanged;288 sweat comparisons at64/80/104 sizes match.
- All80 final PNG bounds exactly match original nontransparent bounds; alpha and240 hashes verified independently.
- Normal art, gameplay numbers, romance conditions, save format and shared palette/reactions unchanged.
- Independent final review:spec PASS/code quality PASS, no blocking technical findings; see coral-expressions-20260917-review.md. Its pending QA update is resolved by this final document.
- Historical241 skip-worktree entries and their baseline blob identities preserved.

## Published review Site

Same owner-private project appgprj_6aa908e9357c8191abb0f486be58697c, version50, image version co-dfabc6d2. Source HEAD00fb38b99fd04a48ee927887e58c5401c34305da pushed successfully. Package completed; gzip integrity and required files checked before upload, including dist/.openai/hosting.json. Deployment appgdep_6aab8ae0bf8c81919aa1b19b8059ac6b confirmed succeeded.

Game: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/
Gallery: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/

Site checker independently passed:13 species/1040 records, exactly80 current coral IDs, coral initial selection,8 sheets,80 new PNGs matching code, prior960 Site PNGs matching fixed-baseline Git blobs. Tap selection, notes and copy code preserved. No separate Site created; audience unchanged.

## GitHub boundary

Keep PR278 Draft and unmerged. Last observed main before final save290735518f7746f616d2b570686c351c9565c6b1; existing conflicts remain outside this batch. Successful local tests do not establish GitHub CI success. Final remote/local tree equality and latest HEAD/main/Actions/status/check-runs are recorded in the PR completion update after saving; zero runs is not CI success.
