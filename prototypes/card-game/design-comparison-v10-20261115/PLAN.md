# VERSION 10 — implementation and preservation plan

Base: PR #551 d3eb6631. Formal game source: origin/main 408c72e6.

1. Isolate the formal game in the private comparison build. Preserve app, engine, controller, collection, CSS, dialogs and all interaction markup. Only dispatch cardMarkup/eggCardMarkup to the candidate renderer; resolve existing assets. Formal renderer remains selectable.
2. Reuse V9/B3-A normal faces. Add full text within the existing 320×480 detail card canvas. Fit one-line titles with transforms accounted for. Projected current stats must win over catalog data; hidden cards must never resolve catalog identity.
3. Add review navigation outside the game, a separate 459-card catalog using the formal collection component, all-card measurement fixtures, and name/kanji research pages. Extra seven stay outside the formal engine/CPU.
4. Verify source hashes, all card payloads and effects, name ID/image hashes, viewport rendering and actual existing interactions. Record unavailable tests explicitly.
5. Save only the independent V10 directory to PR #551 and owner-private Site; retain V1–9 and all formal source bytes.

Rulings: Existing formal collection and egg explanation panels remain, because removing them would change the UI. No new external effect panel is introduced. The comparison-only 459-card collection uses a catalog adapter; the actual game retains its formal 452-card engine. Names remain research proposals, never runtime replacements.

## Completion ledger

- Built actual formal UI; 89 files unchanged, 7 BGM dependencies unchanged. Renderer dispatch + entry asset paths only.
- RED: isolated build absent → GREEN: 459-card/full-text/hidden/projected/egg checks.
- RED: legacy marriage leaked via catalog → GREEN: suppress when projected legacyRules is true.
- Review fixes: missing BGM dependency assertion RED→GREEN; catalog-only unsupported deck/stats disabled, page bound derives from count; responsive detail minimum scales with card width.
- Chromium 9,200 views: zero detected geometry/text issues. Formal/candidate UI element dimensions match in eight portrait/landscape conditions. Existing input flows exercised.
- Name research: 32 stages / 19 differences / 14 kanji proposals. No formal rename.
- Regression: 37/37 pass. WebKit and physical iPhone unavailable; explicitly report.
