# PR #471 menu QA — 2026-10-29

Existing PR implementation retained. Merged remote main `f1d3d6b99d658beec71480afdf1ba9ab803c4b15` without conflicts. Main's meteor/input updates remain intact. PR #461 and other branches are untouched. The open home-layout and chapter-2 PRs remain independent; future merges must recheck shared index/CSS changes.

## Corrections in this handoff

- Short viewport CSS retains 15px titles, 12px descriptions, 24px icons and >=44px targets. At 480px height with simulated 47px top / 34px bottom safe areas, all cards are 53px tall and all six rows fit.
- Native prepared dialog stops Escape propagation to the existing global overlay closer. Native cancellation closes only this dialog, leaving the menu available.
- Menu regression test added to `npm test`; runtime publication source hashes and CSS cache token refreshed.

## Actual browser validation

Cloud Chrome, real app rendered in sized iframes, normal text settings. This is **not an iPhone Safari/WebKit run**. The safe-area case reserves 47px top and 34px bottom through QA-only CSS; it does not emulate Safari browser chrome or prove actual `env()` values. Available heights are CSS viewport heights, not device physical screen heights.

| Width | Height 480 | Height 600 | Height 740 |
|---|---|---|---|
|320|PASS|PASS|PASS|
|375|PASS|PASS|PASS|
|390|PASS|PASS|PASS|
|430|PASS|PASS|PASS|

All above include the 81px safe-area reservation. Final numeric evidence: [matrix](menu12-final-matrix.json). All 12 items, six rows/two columns, no grid scrolling or card content overflow, all targets >=44px, last row fully visible. Paired heights match; at 320×600 intrinsic wrapped content yields 69–74px rows. At 480 the 12 cards are uniformly 53px. Screenshots confirm centered content and normal colors/rounding.

The original matrix without the additional reservation also passed at these widths/heights before the short-height correction (the correction only reduces gaps/padding at <=540px). No page-scale transform was introduced.

**Known limit:** 320×430 with an additional 81px reserved fails: grid clientHeight 290px, scrollHeight 322px, last row clipped by the grid. Intrinsic content requires scrolling in this condition; it is not represented as passing. Increased accessibility text and physical iPhone Safari still require owner review. Preserve readable content instead of hiding overflow or reducing tap targets below 44px.

## Actual taps / regression

| Entry | Observed result |
|---|---|
|せかい|World time/weather/season settings opened|
|あいてむ|Inventory/shop opened|
|ずかん|Collection opened|
|じっせき|Achievement records opened|
|シールちょう|Sticker album opened|
|でざいん|Appearance settings opened|
|ゲームをえらぶ|Game selection opened|
|クイック|Existing egg gate preserved; after hatching a preview-only egg, quick game started (lives, 0/20, Lv1, quit control)|
|なおぽよ。|Published CHAPTER 01, stage 1 / 10 and opening instructions loaded|
|CARD GAME|Existing game title, match preparation, CPU mode and 40/40 deck loaded|
|ものがたり|Reader opened with six chapters and signature; game return restored the home|

Menu entry/startup tests are not full playthroughs. Games, reader text, signature and save code were not edited. Preview uses a different origin and does not access the production save. Existing time-pause, overlay, UI, story navigation and asset version regressions pass (33 tests total including menu tests). Pages packager unit tests: 16 pass.

Naokoro: requested title/two lines/close button rendered; three open-close cycles restored menu; attempted background Story tap did not navigate, dialog remained `:modal`; close and Escape both restore menu. No external trial URL or game implementation linked.

## Images

- [Before (latest main, 390×600)](menu12-before.jpg)
- [After (390×600, simulated safe areas)](menu12-390-final.jpg)
- [After (320×480, simulated safe areas)](menu12-320-final.jpg)
- [Prepared dialog](menu12-dialog-final.jpg)

Before/after images use the same width/height but the after image additionally reserves safe areas. Gray space to the right is the QA harness, not the game viewport. Reproduce via `/tools/menu12-viewport-qa.html?w=390&h=600&safe` on a local repository server. The optional `before` flag expects separately extracted main `before.html` / CSS in the server root. QA harness is excluded from the deployed runtime.

Draft remains pending owner iPhone Safari acceptance. No main merge or production GitHub Pages deployment.
