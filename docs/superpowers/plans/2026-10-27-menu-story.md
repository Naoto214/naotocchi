# Menu and story integration

> Execute inline using executing-plans. User supplied the complete design and authorized implementation, tests, Draft PR and owner-only preview without intermediate approvals.

**Goal:** Reorder the ten existing entries and add a full-width ものがたり entrance to the approved version 19 reader.
**Architecture:** Preserve existing controls and handlers. Add an optional navigation adapter to the reader, leaving manuscript, CSS and reader logic unchanged. Publish the canonical reader path through the existing exact Pages allowlist.
**Tech:** Static HTML/CSS/JS, Node runtime tests, Python Pages validation.
**Spec:** User request of 2026-10-27 in this task.

## Constraints and review focus
- Two columns: world/item, games/quick, naopoyo/cards, dex/achievements, design/stickers, story spanning both columns.
- Story colors #FCFBF9 / #414C50 / #D8D8D2; label only; existing height and radius.
- Same-origin relative navigation under both / and /naotocchi/.
- Enter at cover without deleting bookmark; return after multiple chapter transitions without relying on history.back().
- Direct reader visits and reload/back restoration retain version 19 behavior.
- 320/375/390/430 widths, short viewport scrolling, existing menu functionality, save integrity.
- No main merge or public deployment.

## Task 1: menu and reader navigation
- [x] Test cover initialization, reload/back preservation, safe fixed return URL and direct-visit behavior.
- [x] Move existing menu elements, append story link/style, add optional reader adapter.
- [x] Run focused runtime tests and reader position tests.

## Task 2: release integration and QA
- [x] Add exact reader/runtime files and reviewed hashes to Pages allowlist; build/verify runtime package.
- [x] Run existing regression suite; browser QA and screenshots at requested sizes.
- [x] Review diff independently, save branch, create Draft PR, deploy a separate owner-only menu preview from latest main.

## Execution ledger
- Isolated sparse checkout at main 55c33221571faf16cea518cb9d91fc033d018631. Disk full; own checkout uses available memory filesystem and reads existing Git objects. No other work modified.
- Reader was merged but absent from Pages allowlist. Add its HTML/CSS/JS/TXT dependencies to make the requested public-relative path valid after approval.

- Final independent review: no Critical/Important issues. Navigation tests were added to npm test after reviewer noted CI coverage gap.
- Browser bookmark roundtrip verified with native clicks (paragraph86/y6599). Locator automation auto-scrolled the sticky toolbar; no product change was needed.
