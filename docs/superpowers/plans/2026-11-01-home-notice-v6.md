# Home notice VERSION 6 implementation plan

> Execute inline using systematic debugging and TDD; preserve the user's authorized scope.

**Goal:** Readable complete Japanese notices without persistent care icons contaminating events.
**Architecture:** Keep the 42px measured lane and existing queue. Isolate the notice presentation from care state; use bounded Japanese word groups and a separate speaker row. No game or save changes.
**Tech Stack:** Existing vanilla JS/CSS, Node tests, Chromium/WebKit CI.
**Spec:** User's VERSION 6 request, 2026-11-01.

## Constraints
Draft #490 only; no main merge or Pages deployment. Preserve 13 backgrounds, geometry, 28 actors, birth, 76px speech, fixed controls, save format and reduced motion. Publish privately only after all required gates. J2 deferred until notices pass.

## Review focus
Long names; words wider than the available width; missing Intl.Segmenter; hungry state during unrelated events; expiry after font or viewport changes.

## Tasks
- [ ] Add failing runtime tests for hungry-event icon isolation and Japanese groups (all input characters preserved, reported fragments kept together, long tokens may wrap).
- [ ] Modify home-diorama.js noticeChunks(text), script.js notice rendering and home-production-layout.css. Scope changes to production terrain; retain event art and care recommendations.
- [ ] Extend actual-source corpus QA generator and browser test with line rectangles, speaker/icon bounds, full text, expiry, queues and simultaneous speech. Preserve old tests.
- [ ] Run npm test, production contracts and package integrity. Push without force after checking remote HEAD.
- [ ] Run Chromium/WebKit CI, inspect screenshots, full 13-region interaction and birth suites; fix genuine failures without weakening checks.
- [ ] Preserve V5 saved version; deploy private V6 only after passing gates, verify source/access/save isolation. Keep Draft and main unchanged. Document limitations and J2 deferral.
