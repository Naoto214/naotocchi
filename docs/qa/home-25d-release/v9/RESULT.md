# V9 UI correction — validation in progress

Base: 837a8de18d52e65731f9bdcdf280d9c7e18aaf40. PR490 remains Draft. No main merge or Pages deployment.

User evidence: IMG_7408–IMG_7414 (7 screenshots). Multiple independent comment producers stacked in the V7 dock; parameters remained inside the scrolling center. V8 measured innerHeight and did not pin the meters. Screenshot landscape showed the old full-width controls; the exact client loading/caching cause has not been established. V9 has an explicit versioned entry and content-hash asset URLs.

Changes are presentation-only: visualViewport-height layout, portrait information/meters/dock/control bands, existing landscape rail and actor navigation, CSS arbitration of simultaneous comments, current-stage home display names, event-appropriate notice icons, neutral Safari theme color. Existing world model, navigation, ground projection, collision and save schema are unchanged. Comment timers and authored text remain independent: selected reply/action takes precedence, then story, then ambient speech. This is not a new FIFO queue.

V9 is enabled only by the private generator; the repository default and V8 QA entry remain unchanged. Private normal V9 uses the same origin/save; QA uses the V9 namespace and is separate.

Validation so far:
- Relevant unit/runtime tests: 24 passed, 0 failed (name regression first failed with おんなのひと).
- Managed Chromium iframe UI: portrait 375×667, landscape 844×280; 42px notice, 76px dock, fixed 5+4 buttons; real producer overlap displayed only homeActionComment, choice reply only homeChoiceResult.
- V8 matrix retained; V9 Chromium/WebKit matrix added to existing CI job (not yet run).
- Full npm test running. iPhone Safari dynamic browser bars and physical touch are not verified by desktop checks.

Safari's own status/address bars are not page pixels. Theme color is supplied, while the original region cover paints the page edges. No guarantee of a background image inside Safari chrome.
