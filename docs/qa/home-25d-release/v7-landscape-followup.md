# V7 landscape choice containment follow-up

Starting GitHub HEAD: `f6a6e2a7f0a2da56664018a69d9fa3069b45b990`.

The Chromium fixed-controls job in run `41300394540` fails the existing
`rotated choices remain tappable above care controls` assertion. The previous
rotation placement fix reaches this later assertion but does not solve it.

Reproduced in the managed cloud Chromium browser with the exact V7 private QA
runtime in a 320x844 iframe, rotated to 844x320. The three choices inherit a
single-column layout: choices bottom 214.59375, controls top 204; the dock ends
at 200 with a 196px maximum height. The last choice extends below the clipped
dock. This is content overflow, not a stale control-position measurement.

The narrow fix uses available horizontal room for question choices only at
landscape widths >=640px. CSS auto-fit tracks retain a 140px minimum width,
native wrapping and the existing 44px minimum button height. No character,
world, save, timer, story or conversation rules change. Existing assertions
are retained, with geometry included in the failure message.

After the CSS change, the same managed browser shows choices bottom 200,
controls top 204, three buttons of height 44, all hit-testable. Answering a
choice closes the choice panel. This is desktop Chromium iframe evidence,
not WebKit or physical iPhone evidence.

Validation before this candidate is pushed:
- Focused runtime/scroll/cache checks: 22 passed, 0 failed.
- Package/HTTP: 4,123 files, 220,221,925 bytes; missing 0, hash mismatch 0,
  excluded paths returning 404: 7.
- Read-only code review: no blocking findings in the scoped change.
- Full local npm test and fresh GitHub Chromium/WebKit/13-region CI must be
  checked separately. No V7 deployment is authorized by these partial results.

Keep private live V6 and its saved version
`appgprj_6ae5bc78994481919b5d33849da61d0f~appgver_171565716e948191b37bcb864566cd1e`
available. No main merge, Pages publication, force push, or access changes.
