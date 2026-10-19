# 452-card art + CPU integration candidate — 2026-10-19

## Provenance and scope
Main fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7, tree 00f8ce47b39c76e25440c54d349a0e83d483dd76.
Art PR396 07a734757fc9fddc229414756d55cb62a4a070d0, tree 046d0839320dd82b91f6f77fb019686898be2e05.
CPU PR398 d5e37861a075575c1cf3aeeec938b43c96392ddf, tree 5260a37ce8be93d5f91ee3cdd6b45b37cfca010f.
Originals PR393 a6ad1a9689335f0379d5c6795d1da8652f02ac0d, tree 78acf7646be2967c330f79b54fa53379b304039d.
Color study PR397 0f6f9bcb4a355edcb217f0c6ee398ca820ec734c, tree 4a9bf5e1e9dc015e7d4addca0db740cf24484930.
All four source PRs were Draft/open/unmerged at start. Source branches/main/Pages untouched.

## Conflict resolution
Only app.mjs, style.css and ui-presentation.mjs conflicted.
- Keep CPU input.stamp on detail opening; add guarded font-ready art text fit.
- Keep CPU newest-first history, actor and actual result notes; insert audience-filtered artwork thumbnails.
- Keep CPU cost size, turn fields, opponent egg placement, pass rails and milestone rules; append approved AB-soft artwork rules without replacing geometry.
CPU policy, engine/rules, catalog, save format and canonical docs unchanged. Original artwork and fixed400 evidence unchanged. No image generation or fixed400/supervisor execution.

## Verification
- CPU baseline 327/328; integrated 340/341. Sole failure: regeneration is deterministic and read-only in check mode (FUN_ITEMS absent). All other tests passed.
- 13 focused art/integration tests passed; initial missing illustrated-history assertion failed then passed after integration.
- 12 independent CPU scenarios (3 decks, 2 seeds, both human seats) all R10; midgame restore, legal commands and full replay verified. Completion JSON byte-identical to CPU parent. Beginner/intermediate tested by policy/session suites and four art+CPU start/restore combinations.
- 452 cards: 248 main, 26 companion, 18 partner, 13 world, 100 play, 26 item, 21 event. 904 optimized images decoded and checked against approved manifest hashes, dimensions and unique mappings. No missing/duplicate derivatives.
- Original art tree retained byte-identically to PR396; original regeneration/decoding not repeated. Existing 80/110px previews retained; current rendered dimensions not browser-measured.
- Fourteen classifications, AB-soft, marks, botanical ornament and blue-silver back covered by existing tests. Hand/board/detail/discard/activation/editor/notice/history share renderer. Hidden views do not embed art URLs.
- Fresh independent review: no critical/important defects, 49 focused tests passed.

## Existing catalog audit issue
Current checker expects historical FUN_ITEMS in current script.js (lines 785–788); script.js no longer defines it. Checker, script, catalog and canonical docs are identical to main. This is not introduced by integration.
Prior PR397/396 evidence identifies eight form mismatches (M-sakura-01, M-unknown-02..08), because historical card sources and current growth master differ, plus hashes 96/97. Current unmodified audit stops before those checks. Historical hashes are not rewritten; complete causal reproduction of both hash mismatches remains unresolved. Broader 19-form comparison in design-adoption is a different scope, not 19 new failures.

## Performance and device limits
Thumbnails total 17,128,656 bytes, detail images 120,446,468 bytes. Lazy 384x256 thumbnails decode to 393,216 bytes each; only opened detail uses 1152x768 (3,538,944 decoded bytes). Full archive is not an eager download of all art. No runtime memory/network timing measurement; extensive history still needs real-device observation.
Managed environment has no control-browser skill. Browser screenshots and iPhone Safari portrait/landscape QA were not performed. Remaining: 80/110px legibility and cost, continuous response taps, orientation/background/restore, 7 declarations, egg return, challenge/courtship, milestones, long-match scrolling and memory/network performance.

## Publication
New owner-private Site only: appgprj_6ad5dde4cb288191a4a7c366a3217b22.
Deployed URL: https://naotocchi-card-integrated-20261019.kerzion214.chatgpt.site/
Deployment succeeded. Site source 42859308e4fd8670a39da913616882e545dabdc9; deployment appgdep_6ad5e03a83dc8191bcaadd70c6e075e1. Exact metadata and 947-file package hash manifest are in integration-evidence/publication.json and package-verification.json. GitHub Draft PR: https://github.com/Naoto214/naotocchi/pull/399.
Main merge and production Pages require separate approval after user iPhone QA.
