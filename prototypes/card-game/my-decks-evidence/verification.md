# My decks trial verification — 2026-10-20

Base main: `2a73e91526f85263580d8fab9a8fd0d502676ee3`, tree `8b4e01e66423b5b560bfad2fb5eaec297c71d2f6`.

Implemented: up to 20 named decks, CRUD/confirmed deletion, independent edited deck and A/B selections, CPU and hotseat reuse, all 452 approved card faces, name/effect/type/attribute/species/stage filters, per-card +/- counts, fixed count bar, lazy thumbnails, shared enlarged detail, synchronous autosave with quota/error notice. Closed editor renders zero catalog images; match start releases catalog DOM references. Selection copies arrays into the existing engine boundary. Rules, CPU policy, effects and match serialization unchanged.

Storage: `naotocchi-my-decks-v1` only. Old `naotocchi-deck-drafts-v1` never modified. Reads legacy A/B on first use. Drafts may have 0–40 cards; match entry uses original validateDeck requiring 40. Normal3/rare1 constraints unchanged. Names 1–48 characters. Duplicate deck IDs, unknown card IDs, invalid counts/version/selections rejected before mutation. Default JSON import appends with fresh deck identities. Explicit confirmed full restore supports 20-deck backups and selections; malformed imports leave existing state unchanged. Snapshot check and storage-event notice prevent stale-tab overwrite. localStorage is not a transactional multi-tab database; simultaneous cross-process writes are not guaranteed serializable.

- `node --test prototypes/card-game/tests/*.test.mjs`: **353 pass / 1 fail / 354 total**. Only failure: catalog regeneration `ValueError: Cannot find current array FUN_ITEMS` (known separately tracked source audit; unchanged).
- New persistence suite: **9/9 pass**, including full20 restore and stale writers.
- `node prototypes/card-game/tests/my-decks.dom.mjs` and `TEST_MATCH_MODE=hotseat ...`: both pass. JSDOM27-compatible test harness installed externally in `/tmp/mydeck-dom` (no application dependency). Actual app handlers cover CRUD, filter counts, lazy markup, stable catalog DOM and scroll on +/- edits, selected deck start, match restore and hidden hands. DOM test does not prove visual geometry, rendering, decode timing or Safari behavior.
- Full repository `npm test` attempted but unavailable in this sparse runtime checkout (missing root tests). No full-repository pass claimed. Unrelated source files remain byte-identical in Git.
- Managed preview failed before application startup: `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`; supervisor status stopped. Browser/WebKit/iPhone portrait/landscape, Safari bar, decode speed and memory remain **unverified**. Updated `tests/deck-ui.cjs` for future browser QA; not run here.
- Twenty standard decks with 48-character Japanese names: pretty JSON 23,359 UTF-8 bytes / 43,222 UTF-16 bytes. Actual compact storage is smaller. Images are never stored in localStorage. These are payload sizes, not claims about available Safari quota.
- Code review found and verified fixes for full-backup restore, stale writer detection and name-blur click-target detachment. No remaining important findings.

## Trial-only publication and merge gate

This branch remains Draft. Main, existing private trial URLs, Pages workflow and `tools/pages/allowlist.json` are unchanged. New trial is separate and owner-private. It includes the two new modules explicitly. **Do not merge as-is into Pages:** adding those two runtime paths to the Pages allowlist requires later authorization; the requested protected allowlist was not edited. iPhone human QA and the separate known FUN_ITEMS audit are outstanding.

## iPhone check

1. Open the new trial, open マイデッキ, duplicate a standard deck and rename it.
2. Filter/select cards, tap artwork for detail, use +/- and confirm counts stay visible in portrait and landscape.
3. Choose the deck in A/B; try CPU (both human seats) and two-player handoffs.
4. Reload and verify name/cards/selection. Export and import JSON; use full restore only when intentionally replacing all drafts.
5. Existing production-origin localStorage cannot automatically cross to a different private trial origin. Export A/B from the old URL and import here. Existing URL saves are untouched.
