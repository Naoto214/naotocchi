# Card collection verification — 2026-10-20

## Source and scope
- PR402 was open/Draft, mergeable, base main `2a73e91526f85263580d8fab9a8fd0d502676ee3` (tree `8b4e01e66423b5b560bfad2fb5eaec297c71d2f6`). Starting PR HEAD `ad898ddab191b53359ddf7121e660a156bc7a51c`, tree `d0f6d13154ccc14cc8f11cdb0515eb68ee43579e`.
- Same branch continued. No main merge or Pages deployment. Pages allowlist, canonical452 catalog/effects, engine, CPU policies, Python, immutable400, main game/3D untouched.
- 453 display types = 452 canonical cards + collection-only egg. No egg inserted into engine catalog. Ordering: egg; main grouped by species ID, stages1–8; companion/partner/world/play/item/event. Exactly51 pages of9 (last3 +6 empty pockets).
- Separate preferences key `naotocchi-card-collection-v1`; favorites and browsing/notice state independent from deck quantities. Extra future fields survive writes. Existing deck schema/key unchanged; shared in-memory DeckLibrary.change/save is used. Save failures roll back the attempted addition; stale conflict rejection retained.
- No matching approved-back SVG exists in current repository. Cover reuses original `ui-assets/card-back-approved.png` with a cover-only SVG color filter; identical botanical geometry/corners, no redraw. Detailed backs all use the unmodified PNG without filter.

## Implementation
Nine mounted small thumbnails only, lazy decoding; one large face per detail, released when closed. Green/gold cover/spine, transparent pockets; name/effect/type/attribute/species/stage/rarity/favorite filters; reset restores unfiltered page. First-use notice persists after acknowledgement. Pointer horizontal-intent threshold48px and 1.6x vertical dominance; post-swipe clicks suppressed450ms; page swipes and card swipes have separate surfaces. Flip400ms and reduced-motion. Keyboard arrows, labels and modal focus return.

Collection entry exists on welcome, MyDeck editor, and match menu. CPU scheduling stops while open; catalog contains no state-derived private data. Opening releases editor thumbnails; closing during match does not repopulate the hidden editor. Editor-origin navigation resets the add target to currently edited deck. Partial decks remain legal drafts; original match validation still requires40.

## Evidence
- `node --test prototypes/card-game/tests/*.test.mjs`: **359 total /358 pass /1 known fail**. The only failure is catalog regeneration: `ValueError: Cannot find current array FUN_ITEMS` (unchanged, separate issue). Full log `card-suite.log`.
- New collection unit suite5/5, existing MyDeck unit9/9. New cases first failed before implementation, including failed-save rollback and HTTP randomUUID compatibility.
- `collection.dom.mjs`: passes production app handlers for notice,9 pockets, filters/page restore, original back, favorite sharing, egg refusal, legal addition/reload, normal limit, swipe click suppression, editor destination reset, active-match catalog return, no hidden452 reload, private hand hiding.
- Prior `my-decks.dom.mjs` in CPU and hotseat modes: both pass after final edits, including CRUD, limits, selected deck match start/restore, hidden hands, legacy/match save separation.
- Root `npm test` attempted: unavailable because unrelated root test files are outside this sparse checkout. No full-repository pass claimed. Protected source paths verified unchanged via Git diff.
- Independent reviewer identified stale destination selection on editor-origin reopen; reproduced with failing DOM assertion and fixed. No other important reviewer findings. Additional hidden452 repaint issue reproduced/fixed with DOM assertion.
- HTTP preview revealed pre-existing `crypto.randomUUID` secure-context dependency. Added `crypto.getRandomValues` fallback IDs (same string schema) and tested20 unique deck IDs. HTTPS path retains randomUUID unchanged.
- Managed Chromium: opened real app; cover, all nine first-page images decoded; portrait390x844 iframe shows9 pockets, page counter/buttons; detailed face and approved back flip; landscape844x390 iframe detailed layout/deck chooser and40-card refusal confirmed. Browser screenshots in this directory. These are responsive Chromium checks, NOT physical iPhone/WebKit results.
- Original art WebP files reused. No new image generation or new library dependency in application. JSDOM exists only at /tmp/collection-dom for testing.

## Outstanding human QA / limitations
Physical iPhone Safari portrait/landscape, browser-bar expansion, touch swipes vs scrolling, low-memory decode/long-session performance, SVG filter and backface rendering remain user QA. Landscape binder can scroll; detail has two columns. Favorites are local to this browser/origin; same trial URL preserves previous decks. localStorage is not a transactional multi-process database; existing stale detection does not guarantee fully serializable simultaneous writes.

Do not merge into Pages yet: new runtime files must be added to the protected Pages allowlist in separately authorized post-iPhone work (as with PR402's existing two new modules).
