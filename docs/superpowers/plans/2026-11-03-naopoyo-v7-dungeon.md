# Naopoyo V7 dungeon presentation

Goal: Strengthen the dungeon outside the board, preserving V6 gameplay byte-for-byte.
Specification: User's V7 request (2026-11-03). Background masonry, barred arch, warm lamps and cold recesses; no new obstacles or black overlays. Always show ↓ 重力あり on gravity stages.
Approach: Noninteractive inline SVG scenery behind the existing page, with CSS frame and readable gravity badge. No raster downloads, physics or layout algorithm changes.

- [x] Add decorative room to index.html and CSS; label V7. Keep app.mjs and all board/session/input/replay sources unchanged.
- [x] Run existing 98 tests and DOM integration; compare changed paths to V6.
- [x] Check short portrait/landscape viewport rendering with existing QA harness when preview is available.
- [x] Review diff, update Draft PR #504 and owner-private preview. Do not merge or alter main/Pages.

Review focus: decorative elements never receive input; canvas remains unobscured; no control layout changes; gravity label fits narrow screens; replay canvas retains original styling.
Baseline: 98/98 tests pass after fetching the exact missing v5 protected-hashes fixture. New isolated sparse checkout (no full repository download).
