# Menu UI final polish implementation plan

> Execute inline; one final independent review. User approved implementation, QA, GitHub Draft PR, and owner-private publication. Never merge main or publish GitHub Pages.

Goal: unify the eleven existing menu tiles while preserving their order, behavior, artwork, colors and rounded borders.

Architecture: an inline-flex icon/title heading, centered as one group, above a shared two-line description area. Use 28px icon slots, 16–17px titles and 12–13px descriptions. Normal tiles use viewport-responsive heights around 92–98px; the full-width story tile is 76px. A bounded, scrollable grid preserves readability when the viewport is too short.

Base: latest main 0e0354b15ee8c29ad7e52dd0ba8c6993df80e643. Existing branch ebcfe960 differs in these menu files only by the earlier 22-line fit override and CSS version. Use a new branch from main to avoid unrelated old branch history. Preserve the trial's other runtime bytes.

- [x] Record baseline at 390px, including compact layout and title/icon centers.
- [x] Modify only index.html menu markup/copy and ui.css menu rules; update stylesheet hash.
- [x] Verify 320, 375, 390, 430px widths; short/tall viewports; all tile contents, alignment, tap size, natural scrolling; story return link.
- [x] Save comparison screenshot and QA measurements; run relevant existing regression checks.
- [ ] Independent review, GitHub Draft PR, update existing owner-private Site.

Review focus: narrow title wrapping; enlarged text and short viewports; Safari visible-height/safe-area behavior; nested icon sprites and SVG sizing; preserved menu actions and reader return navigation.
