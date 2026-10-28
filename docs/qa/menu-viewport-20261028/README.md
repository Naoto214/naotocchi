# Menu viewport fit QA

Base: d11e6c894db030cbe8ff5c895cc4245c71c4f0d5 (main, checked 2026-10-28).

The former 92px minimum for five rows plus a 76px story row overflowed a
390x600 CSS viewport: grid scrollHeight 572 vs clientHeight 522; story bottom 633.
The fix distributes available dynamic viewport height over six intrinsic-minimum
rows, retains text sizes and 44px minimum tap targets, and removes reserved empty
second description lines. Naopoyo copy: 合体・分裂で救出！.

Browser QA uses real index.html in same-origin iframes of the requested CSS sizes,
via tools/menu-viewport-qa.html copied temporarily beside index.html. Chrome,
not physical iPhone Safari. No attached screenshot bytes were available in this
request; identical-device comparison remains for the owner.

| CSS viewport | Grid client/scroll height | Story bottom | Result |
|---|---|---|---|
| 320x480 | 403/403 | 463 | PASS |
| 375x540 | 463/463 | 523 | PASS |
| 390x600 | 522/522 | 583 | PASS |
| 430x740 | 598/598 | 659 | PASS |

Each checks 11 items, no clipping/overlap, >=44px hit targets, and close/reopen.
At 320x400, scrolling is retained. At 390x600 with 32px titles/24px descriptions,
scrollHeight 695 > 522; content remains accessible. This simulates enlarged text,
not a claim of testing Safari text settings or device safe-area values.

Related automated tests: 51/51 passed (story-navigation, overlay, ui-integration,
nav-a11y, viewport-design). Runtime allowlist package: 4057 files, 213538522 bytes,
1685 static references and 2954 dynamic references checked successfully.
Full npm test was attempted; environment disk exhaustion interrupted the log,
so no complete-suite success is claimed. No main merge or production deployment.
