# Hermit crab expressions — 2026-09-16

## Scope and baseline

Added hermit_crab (ヤドカリ), eight stages × ten independent expressions = 80 new PNGs, bringing the completed set to ten lines / 80 stages / 800 expressions validated. The user authorized whole-species production batches without stage approvals. Keep PR278 Draft and unmerged.

Baseline GitHub HEAD: 7c7f2c90298813ced153a04a7f7451ff4287c38d. Local HEAD: faa5a67fef20f4994244a03728fbce994d0b27af. Both trees: 67ad3080ab0de356a6091a66fb7571981d52b459. Main at start: bcdd6a6811ce8255ef16895ffff26f53b89d1478. Local checkout was clean; PR was already conflicting. Workflow runs, statuses and check-runs were empty, not passing CI. Preserve the 241 historical sparse-index entries unchanged.

## Artwork and placement

Each expression uses a separate built-in imagegen edit referencing its original stage. Preserve the two eye stalks, antennae, claws, legs, age-specific shell colors/patterns and stage03's separate empty shell. All eight originals were viewed individually and with a coordinate grid before adding face anchors. Existing transparent 128×128 original-bounds normalization remains unchanged. Generative shape variations remain; these are not pixel-identical body composites.

The initial stage03 happy and strained variants incorrectly added a second pair of eyes on the orange face below the eye stalks. Both were regenerated with explicit stalk-tip-only eye instructions. The replacement source paths and prompts are recorded in the manifest. Independent early review of the other 28 stage01–03 source images found no clear extra eyes or missing shell/claw/leg features.

Generated only hermit_crab placement entries with `node tools/place-expression-marks.cjs hermit_crab`. All previous72 placements, including prior81 requested adjustments, are identical. Shared mark colors, outlines and reactions remain unchanged; hunger uses the default yellow fish and small circles.

## Verification

- Focused integration RED: 26 expected failures before implementation; focused GREEN:93 passed after routing/preview integration.
- Final `npm test`:1043 passed,0 failed,0 cancelled,0 skipped; exit0;80373.777487ms.
- Placement checker:800 marks,480 sweat-motion envelopes,0 issues.
- Preservation check:720 prior image routes/SVG strings and72 placement records identical; no existing character PNG changes.
- Root and independent final review inspected all80 marked composites. No critical or important findings. Stage03 replacement eyes and separate empty shell are correct.
- Independent manifest verification:80 records and240 original/source/final SHA256 hashes match actual files;24 focused hermit_crab tests pass.
- Site verification:10 species/800 records,80 unique current-batch IDs,initial hermit_crab,all8 sheets match generated gallery,all80 new PNG hashes and pet-expression.js match tested code. Existing720 PNGs in both code and Site match the fixed baseline Git blobs. Gallery JavaScript parses and referenced local scripts exist.
- `npm run bump` changed only the pet-expression.js cache token; `git diff --check` passed.

## Preview and limitations

Same owner-private project: appgprj_6aa908e9357c8191abb0f486be58697c.

Source commit:689ab180578178d3a56b63a06e0dd693b8a615fe. Site version47, image version hc-8394cd1f. Packaging exited0; gzip integrity,hosting configuration,80 new PNGs and8 sheets were checked before upload. Archive contains1292 files. The first validation assertion used the wrong configuration path; inspection confirmed the helper puts it at dist/.openai/hosting.json, and corrected validation passed without modifying the archive. Deployment appgdep_6aab280e05bc8191afcc46191c36b3b9 reached succeeded.

Game: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/
Gallery: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/

The preview uses disposable game state. The tap-select gallery retains notes/copy and current-batch filtering. Its PNG/SVG/CSS composites are not device screenshots; sweat is approximate. The user assesses real-device appearance. Large shells place sweat outside the shell and some silver strained marks above the shell, farther from the face. Expression differences are subtle on the smallest early stages; existing cat03/dog04, turtle, tadpole and fish limitations remain. Zero detected intersections is not a claim of ideal appearance. Normal images, gameplay numbers, romance conditions and save format are unchanged.

## GitHub delivery gate

Only save reviewed additions on the current feature branch. Require the remote tree to match the verified local tree, preserve Draft/unmerged status, and report pre-existing conflict and absent CI separately from local test success. Final GitHub SHA/tree and CI state belong in the PR update and handoff.
