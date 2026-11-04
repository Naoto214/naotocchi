# Home v13 inactive controller CI follow-up

> Execute inline using superpowers:executing-plans. User authorized implementation, validation, GitHub saving and private preview publication without intermediate approval.

**Goal:** Close the remaining v13 Home layout CI failure without repeating the completed layout work.
**Architecture:** The terrain controller owns presentation only while enabled with an initialized scene. Legacy Home owns its poop row when terrain is inactive. Guard painting at that ownership boundary, preserving pause cancellation and reentry.
**Spec:** `docs/superpowers/specs/2026-10-24-home-v13-design.md` and the user's v13 handoff.
**Constraints:** Continue PR #426, retain all existing test assertions, no main merge/Pages deployment/care or save changes. Existing private preview audience and save keys stay unchanged.

## Task 1 — Lifecycle correction
- [ ] Reproduce with adapter tests: interruption/backgrounding before first terrain activation and after exit with four poop nodes; legacy styles remain untouched, reentry restores safe terrain positions.
- [ ] Guard `paint()` in `home-diorama.js` against disabled, destroyed or uninitialized controllers.
- [ ] Run focused Home tests and `npm test`; review the previously missing card catalog check in a complete checkout.
- [ ] Verify focused browser cases through managed preview and retain existing Chromium/WebKit CI assertions.
- [ ] Update asset tokens and the one changed dependency hash; save evidence and push only the existing PR branch.
- [ ] Check GitHub CI, patch the existing private Site from its current source, verify deployment and update PR report.

## Review focus
Initial unsupported region; interruption with nonempty poop row; exit/background/return; enabled paused scene; unchanged production/preview save separation.

## Progress
Initial evidence: head e42da308, Home layout run 40072656842 failed in Chromium and WebKit conversation-small/small-full/small-large-text with null scene.width. Other seven workflows passed. Private Site v13 source 1a35e608 is deployed. Fresh isolated clone, no AGENTS.md found. No original v13 feature implementation is repeated.

Ruling: latest main advanced to f16e0f37 via PR #423/#424 and conflicts in index.html/package.json/allowlist.json. Integrate those already-published commits into the PR branch only so pull-request CI can run. Retain the v13 test command plus both new main tests, preserve main game/style files byte-for-byte, and refresh only affected dependency hashes. No merge to main.

Lifecycle RED: two new cases failed on the unmodified adapter (null scene.width; hidden legacy poop after exit). GREEN: 34 focused tests pass. Independent review: no Critical/Important findings; reviewer separately confirmed 36 adapter/runtime/v13/cache tests. Game regression: 938/938 including deterministic card catalog regeneration.
Managed browser limitation: the returned terminal.local:4173 route showed the separate Naopoyo page after one reload, not this checkout. No screenshot from that page is treated as Home evidence. Keep existing v13 visual artifacts; use existing GitHub Chromium/WebKit workflow for follow-up browser verification.
