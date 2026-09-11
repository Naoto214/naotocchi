# Home layout fit implementation plan

> Execute inline using Superpowers systematic-debugging and verification-before-completion.

**Goal:** Keep the home header, narration and care controls within the visible phone viewport, without covering each other.

**Architecture:** Give narration its own grid row outside the scrolling central panel. The central panel alone absorbs excess height; explicitly bound its nested flex children. Constrain header badges and temporary notices to the available width.

**Tech stack:** Existing HTML, CSS, viewport synchronization; Node runtime tests and CI Chromium/WebKit layout checks.

**Spec:** User screenshot and request of 2026-09-11: narration and upper content must fit and remain fixed. Keep the existing frameless information and transparent buttons. Preserve narration's live region and keyboard/scroll access, cast minimum size, minigame and farewell behavior.

- [ ] Add `tests/home-layout-browser.cjs` and `.github/workflows/home-layout.yml`; run against unchanged production files. Assert viewport bounds, 44px controls, narration hit visibility and stable narration/header/buttons during central scroll. Save screenshots and measured bounds.
- [ ] Move `#message` immediately before `#careActions` in `index.html`, preserve its ID/ARIA attributes, and add its own auto row to the home grid. Hide it whenever home is hidden. Update world narration selectors to its new device ancestor.
- [ ] Bound `.screen-frame`, `.screen` and `.screen-normal` height explicitly, allowing the central panel to scroll when minimum cast/text space cannot fit. Keep header/badges and temporary notices within the available width and honor all safe-area edges.
- [ ] Run `npm run bump`, `npm test`, `git diff --check`, and the CI browser checks. Inspect saved screenshots and test narration scrolling, viewport resizing, long text, maximum companions/badges and non-home transitions. Fix actual failures before claiming completion.
- [ ] Review the diff, recheck main/open PRs, and save the fix in a reviewable PR. Do not merge or publish.

Baseline: main `12cf968e22ca95bf515e939cedae664331b4ad1e` includes #239/#240/#241; only unrelated #92 was open. Runtime baseline: 297 passed. Browser preview connection returned `ERR_BLOCKED_BY_CLIENT`; do not claim local visual verification or retry via alternate routes. CI runs repository-local automated tests independently.
