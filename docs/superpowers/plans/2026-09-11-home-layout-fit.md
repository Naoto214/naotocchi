# Home layout fit implementation plan

> Execute inline using Superpowers systematic-debugging and verification-before-completion.

**Goal:** Keep the home header, narration and care controls within the visible phone viewport, without covering each other.

**Architecture:** Give narration its own grid row outside the scrolling central panel. The central panel alone absorbs excess height; explicitly bound its nested flex children. Constrain header badges and temporary notices to the available width.

**Tech stack:** Existing HTML, CSS, viewport synchronization; Node runtime tests and CI Chromium/WebKit layout checks.

**Spec:** User screenshot and request of 2026-09-11: narration and upper content must fit and remain fixed. Keep the existing frameless information and transparent buttons. Preserve narration's live region and keyboard/scroll access, cast minimum size, minigame and farewell behavior.

- [x] Add `tests/home-layout-browser.cjs` and `.github/workflows/home-layout.yml`; run against unchanged production files. Assert viewport bounds, 44px controls, narration hit visibility and stable narration/header/buttons during central scroll. Save screenshots and measured bounds.
- [x] Move `#message` immediately before `#careActions` in `index.html`, preserve its ID/ARIA attributes, and add its own auto row to the home grid. Hide it whenever home is hidden. Update world narration selectors to its new device ancestor.
- [x] Bound `.screen-frame`, `.screen` and `.screen-normal` height explicitly, allowing the central panel to scroll when minimum cast/text space cannot fit. Keep header/badges and temporary notices within the available width and honor all safe-area edges.
- [ ] Run `npm run bump`, `npm test`, `git diff --check`, and the CI browser checks. Inspect saved screenshots and test narration scrolling, viewport resizing, long text, maximum companions/badges and non-home transitions. Fix actual failures before claiming completion.
- [ ] Review the diff, recheck main/open PRs, and save the fix in a reviewable PR. Do not merge or publish.

Baseline: main `12cf968e22ca95bf515e939cedae664331b4ad1e` includes #239/#240/#241; only unrelated #92 was open. Runtime baseline: 297 passed. Browser preview connection returned `ERR_BLOCKED_BY_CLIENT`; do not claim local visual verification or retry via alternate routes. CI runs repository-local automated tests independently.

## Verification checkpoints

- Before implementation, [Home layout #1](https://github.com/Naoto214/naotocchi/actions/runs/34602424847) at `fd1dddcf6718c4bc4747a0fe6f6d50a22c479c37` reproduced narration clipping in 320×568 and 320×640 on both Chromium and WebKit (4 failures). Six larger scenes passed. At 320×568 the notice ended at 635.94px, below the central panel's 449px boundary.
- Production fix is `c10661ff927ce986b7c86b362f79bcd88f69b127`. Its fresh local runtime suite passed all 297 tests. [Home layout #2](https://github.com/Naoto214/naotocchi/actions/runs/34603377580) passed the original failing conditions, long narration scrolling, play/quit and simulated safe-area layouts in both engines (14 cases). Only the two farewell cases failed the overly strict hit test for a deliberately empty/invisible notice.
- The farewell screenshots and bounds confirm a reserved 43.19px notice row at y=275.81–319 and care buttons starting at y=322. The record button remains on screen. The test now requires hit visibility only for actual text/art; it still checks fixed space/separation for empty notices and injects long text to verify scrollability on farewell too.
- Independent source review found no critical or important production issues. The corrected test and final branch CI must complete before declaring all browser checks successful; the authoritative current status and run links are in [PR #242](https://github.com/Naoto214/naotocchi/pull/242).
- Physical iPhone Safari, real safe-area sensors and pinch-zoom interaction were not exercised by these desktop CI engines. Simulated safe areas replace CSS env inputs only. Existing viewport zoom exemption remains unchanged.
