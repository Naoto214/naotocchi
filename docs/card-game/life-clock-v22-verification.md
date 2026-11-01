# V22 — portrait and landscape clock pinch

Baseline/restoration: V21 `699bc1a4320de66657a1bd082df696812c7e438c`. V20/V19/V18 artifacts and reports retained. Draft PR #501 only; no main merge or production Pages.

Clock now supports two-finger pinch out/in around the midpoint, sharing the current zoom and button state with double tap, keyboard and toolbar. Normal size is the minimum; maximum is 3× normal or the existing 720px inspection size, whichever is larger. Within 5% of normal it returns to whole view, matching the card threshold. Existing card pinch code is unchanged. One-finger drag pans an enlarged clock; normal horizontal swipe still flips it. The scene alone owns touch gestures to avoid native page-zoom interference. Scrollbars and wheel remain available. Resize centers the enlarged clock as in V21; close resets inspection state.

Runtime changes: `prototypes/card-game/life-clock-view.mjs` and `life-clock.css` (touch-action only). No renderer, artwork, hand values, card/game/CPU/deck/save changes. Additional files: reviewed allowlist hashes, pinch regression test, plan and this record.

## Verification

- New DOM test failed against V21 at “pinch out must continuously enlarge clock”, then passed after implementation.
- Seven modeled stage sizes (520×180, 550×140, 296×220, 288×390, 343×470, 358×600, 398×680): continuous 2×→1.5×→normal; midpoint; pan; button/double-tap sync; front/back; resize; cancellation/third finger; close/reopen; non-reduced animation return and subsequent button zoom.
- Independent review found stale tiny-pinch scale after interruption; fixed reset path and added regression. Normal zoom after interrupted tiny pinch passes.
- Existing V21 geometry, V20 common card/clock inspection, clock DOM, turn DOM and lifecycle tests passed, including mandatory card choice preservation, CPU pause/resume and restore.
- CARD GAME: 572/572 passed, zero fail/skip/cancel; 95,802ms.
- Package unit checks: 16/16. Allowlisted runtime: 4,120 files / 220,852,220 bytes. Site static source matches every packaged file hash; QA-only files removed before publication.
- Chrome managed browser: rendered clock pinch-out/in using synthetic PointerEvents from a temporary QA fixture, at iframe viewport 390×844 and 844×390. Enlarged front, enlarged back, orientation change, visible scrollbars and whole-view label synchronization observed. Fixture adds test-only buttons; it is not shipped and these are not native multi-touch inputs.
- **Actual iPhone Safari/WebKit native pinch, inertial scrolling and safe-area behavior remain unverified.** Browser tooling here exposes Chrome and no native two-touch input. No claim that synthetic pointers substitute for real-device verification.

Main-game `npm test` was also started; the full main-game suite is separate from the CARD GAME checks above. Its final outcome and publication identifiers are recorded in PR #501.
