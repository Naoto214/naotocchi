# Menu UI QA — 2026-10-28

Based on main `0e0354b15ee8c29ad7e52dd0ba8c6993df80e643`; compared against existing menu branch `ebcfe960ee2187a85084c91adbb35edba9fa82c1` and private Site v3. No existing PR was found for that branch. This follow-up uses `work/menu-ui-final-20261028` from latest main. No main merge or GitHub Pages publication.

## Changes

The previous short-viewport grid pinned icons to a separate left column. The new shared `.menu-heading` centers the 28px icon slot and title together, with consistent description space below. Titles are 16–17px, descriptions 12–13px. Ordinary cards are 92–98px depending on viewport height; the story tile is 76px with a subtitle. Order, colors, artwork, actions and destinations remain unchanged. Only menu markup/CSS and the stylesheet cache hash change in runtime files.

Naopoyo copy is `くっついて、わかれて、救出！`, with phrase boundaries kept together at ordinary sizes. Large text uses emergency wrapping and content-sized rows instead of clipping.

## Browser measurements

These are Chromium iframe viewport simulations, not physical iPhone/WebKit certification. Heights represent available CSS viewport space; Safari bars and safe areas can reduce that space further. Existing `--app-height` uses dynamic/visual viewport updates. The close button remains 44px and visible while the menu grid scrolls.

| Viewport | Ordinary card | Story | Vertical scroll |
|---|---:|---:|---:|
| 320×568 | 92px | 76px | 82px |
| 375×667 | 94.59px | 76px | none |
| 390×664 | 94px | 76px | none |
| 430×760 | 98px | 76px | none |
| 390×568 | 92px | 76px | 82px |
| 390×844 | 98px | 76px | none |

All cases: eleven entries, no horizontal scrolling, no card/child bounds overflow, identical ordinary-card heights, heading horizontal center error below 1px. At 390×664, the previous card height was 98.4px and story height44px; the final heights are94px and76px. At 390×740, the previous normal tile was110px; the final cap98px is approximately11% lower. Readability takes priority over an exact percentage on shorter screens.

32px titles/24px descriptions at320×568 reproduced horizontal overflow before the review fix. After emergency wrapping and intrinsic row sizing, every tile's contents fit and only vertical scrolling remains. This is a CSS text-size stress fixture, not a browser zoom claim.

The story link was clicked in the real preview. `ゲームにもどる` is visible on the cover and retains `../../../index.html`.

## Evidence and validation

- [390px initial-state comparison](comparison-390.jpg): left is private v3, right is final layout, both390×664, unscrolled.
- [Measured DOM results](viewport-results.json), including failing and passing large-text measurements.
- `node --test tests/story-navigation-test.cjs tests/ui-integration-test.cjs tests/viewport-design-test.cjs tests/nav-a11y-test.cjs`:47passed,0failed.
- `git diff --check`:passed.
- Menu-exclusion comparison confirms all HTML outside the menu and stylesheet version is byte-identical to latestmain.
- Independent review identified large-text wrapping; reproduced and fixed, followed by the six viewport checks and47tests again.

Preview fixtures were temporary and removed from the deployment package. Other trial runtime files and all original binary assets are preserved.
