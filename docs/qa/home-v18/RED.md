# V17 failure evidence (before production edits)

The new browser check reproduced horizontal glyph clipping at 320x568 for the real medicine notice: message right=296, final glyph right=302.015625. At 375x844, after a delayed 2px letter-spacing change, “いまのぼく、ちょっとできる子” ended at x=371.5 outside text right=345.5. This controlled late-metric change demonstrates stale nowrap sizing, not a claim that the user changed letter spacing. iPhone-specific trigger is not remotely proven.

The original 105-case suite did not test notification horizontal glyph rectangles or an actual post-fit metric change (it dispatched fonts.loadingdone without changing a font). Both supplied dialogue lines are now fixtures.

First npm test was started before cache token refresh and reported two asset-version failures; tokens were refreshed and the completed final run must be reported separately.
