# Madoromi signature implementation plan

**Goal:** Append one independent white signature page containing 豊田直人 to the approved reader, without editing its manuscript.
**Spec:** User request in this task; latest main 85a59bb3. PRs #453/#454 are merged.
**Architecture:** Keep the existing continuous vertical reader. Append a separate non-manuscript section, with at least one viewport of separation between ending and signature. Include its stable anchor in existing reading-position storage, without renumbering manuscript nodes. Quiet the persistent chrome while viewing the signature; scrolling back restores it.
**Tech stack:** Existing static HTML/CSS/JS and Node tests.

## Constraints and decisions
- The actual version 19 ends with 今日もまた、一日が始まっていた。 The quoted user ending differs; preserve all actual formal text, as requested, and disclose this.
- Current reader is scrolling, not discrete pagination. Preserve ordinary swipe/scroll and browser history.
- Dark gray Mincho signature, slightly smaller than current prose. No heading, decoration or illustration.
- Existing game return link remains on the cover. No main merge or production GitHub Pages deployment.
- Isolated branch and Draft PR; separate owner-private trial only.

## Task 1
- [x] Read formal state and baseline tests (6/6).
- [x] Add regression for signature bookmark/resume/reload; observe failure.
- [x] Update dist/index.html, white-reader.css and white-reader.js only in runtime.
- [x] Verify all six chapter sections byte-identical to main; original source/illustrations unchanged.
- [x] Run reader/navigation and publishing checks; browser QA at phone widths, screenshot, back/resume and game return.
- [x] Independent final review, commit/push branch and open Draft PR; owner-private trial.

## Review focus
Existing bookmarks, signature reload, scrolling back restoring controls, size/orientation changes, formal text preservation and game return.
