# Card Collection Implementation Plan

Goal: Browse all 453 types in a green/gold nine-pocket binder and add legal cards to the existing My Deck library, at the existing owner-private trial URL.
Architecture: collection.mjs owns ordered catalog and independent preferences; collection-ui.mjs owns a modal binder and detail/flip UI. my-decks-ui exposes a narrow transactional add API over its existing DeckLibrary. All match and canonical card code stays untouched.
Tech: buildless ES modules, CSS, existing renderer/assets, node:test, JSDOM and managed browser QA.
Spec: user's 2026-10-20 full request in this Work (authorizes implementation, tests, PR402 push and private trial update without intermediate approvals).
Constraints: 452 engine cards + display-only egg; 9/page, 51 pages; max20 decks, max40 cards, normal3/rare1; same storage schema; no main/Pages/allowlist/rule changes. Original back PNG unchanged. No exact back SVG exists in the repository: recolor the original image at render time on the cover only.
Review focus: failed storage write must not report successful deck addition; stale tab must not overwrite decks; swipes must not flip/open accidentally; filter reset restores original page; live match must pause while binder open without exposing state.

## Task 1 — Data and storage
- [x] Tests first: 453 IDs, egg-first, 31 species x8 contiguous, 51 pages, each filter, favorites persistence, corrupt storage preservation, future fields preserved, page clamp and filter restoration.
- [x] Implement collection.mjs catalog/filter/page API and CollectionPreferences; separate key from deck/match saves.
- [x] Test atomic addToDeck(DeckLibrary,deckId,cardId): limits, egg reject, save failure rollback, stale conflict, valid reload. Reuse change/save.

## Task 2 — UI integration
- [x] Add real-app DOM integration tests first, then binder modal, cover, grid, filter controls, detail carousel, accessible flip, favorites and deck destination picker.
- [x] Expose current edited deck/list/add through existing MyDeck UI; refresh via same onChange; do not recreate editor.
- [x] Bind welcome/menu/editor navigation; suspend CPU with modal open; restore focus; display errors; render nine thumbnails only and one large detail.
- [x] CSS responsive portrait/landscape, svh/dvh, 400ms flip, reduced motion, transparent pockets and original back with cover-only green/gold filter.

## Task 3 — Verify and deliver
- [x] Run node card suite, prior CPU/hotseat DOM test, new unit/DOM tests, root npm test (report environment limits).
- [x] Managed browser visual/function QA and screenshot cover/internal/details; actual iPhone remains human QA.
- [x] Fresh review, necessary fixes, verify protected paths unchanged; commit/push PR402 Draft.
- [x] Open existing Sites source, overlay changed runtime assets only, package/source sync, deploy privately preserving owner audience; record SHA/tree/URL and limits.

Verification and review decisions: see prototypes/card-game/collection-evidence/verification.md. Publication is recorded separately after successful deployment.
