# PR #403 iPhone QA revision — 2026-10-20

## GitHub baseline and scope

Fresh GitHub checkout of `feat/card-rulebook-tutorial-20261020`, HEAD `d0d46adae7ed5609840e10751a7827a9110fbbf9`, tree `8a3cb67d43ba83d88cddd11bfc6f3fca5446e5b9`.
Remote main/base `db9ea8e8d86c632a68ed8ab4880968803f78a243`, tree `b24d11f8af167b57bcc5da674f07bcdec6db6e1d`. Remote rechecked before saving; unchanged. PR remains open Draft and unmerged.
Initial CI: runtime smoke, home layout, World visual quality passed; Pages runtime package failed, deploy skipped. Production allowlist remains intentionally unchanged.

## Implemented

- Preserved 15 basic chapters and 79 current detailed ruling sections with exact source-heading provenance. Both levels searchable globally and within a chapter. Original historical source strings/documents and approval history retained. Historical raw document duplicates are no longer rendered as current rules. Coverage is in `rulebook-current-audit.md`.
- Both levels state all 452 ordinary cards are available for viewing/deckbuilding from the start, with no main-story discovery gate. Collection includes the special egg for 453 total; egg excluded from deckbuilding.
- Formal documents, canonical card catalog and engine agree: companion + partner share **one normal person placement per own turn**, base time 0; relationship progress/marriage uses separate once-per-turn allowance and base time 1. Concrete examples and replacement/trigger sequence retained. No verified card grants additional person placement; the friendship ticket adds to hand, not to the field. No rule amendment was made.
- All 9 tutorial lessons use production `gameMarkup`, card details, actual card art, two 3×3 fields, hidden CPU hand and the canonical engine. Human acts only as A; scripted B CPU performs legal card placement, activation and passes. Engine resolves all state changes, costs and chains. Fixed scene changes are explicitly labeled; automatic administrative responses are shown in engine history. No alternate rules/effects.
- Tutorial command tickets reject stale/incorrect actions. CPU timer is canceled by nested help, closing, blur and backgrounding; progress stores only separate lesson coordinates. Resume/restart/lesson selection and CPU-beginner preparation preserved. Shared hand toggle works; unsupported tutorial reorder controls are omitted.
- Removed invisible 44px result-button reservation in normal match header. Four-second results, replay, facing fields and slot IDs unchanged. Normal header-to-board gap measured 4px at 390×844.
- Removed only title/caption background paints from the collection cover; leather appearance, original botanical art, gold frame and binder depth preserved.
- Main menu uses なおとっち CARD GAME and six requested routes; start/restore paths retained.

## Automated verification

- Full card suite: **370 tests, 369 passed, 1 known failure**. `catalog.test.mjs` regeneration audit fails with `Cannot find current array FUN_ITEMS`. Protected definitions/history hashes were not edited to satisfy it.
- Focused final unit suite: **11/11 passed** (learning, current rulings, actual CPU tutorial).
- Full learning DOM suite passed: 15 chapters, all nine lesson operations, nested card/book/collection navigation, resume/restart/skip, CPU timing, ordinary match and deck save isolation.
- Tutorial shared-board DOM passed: 18 slots, production detail, hand toggle, wrong-card inspection, CPU lifecycle and reverse chain, save isolation.
- Main menu DOM passed; collection DOM passed; my-decks CPU DOM passed. Existing feedback timing/replay/handoff tests passed.
- Independent reviewer found an inert tutorial hand control; corrected, then reverified. Reviewer confirmed exact canonical legal-ID mapping for every human step including egg return; stale pointer after nested help is rejected and a fresh pointer succeeds. No outstanding blockers.
- Generator rerun byte-identical; `git diff --check` clean.
- Additional root `npm test`: initial 24/24, smoke, dialogue and numerous main-game/World cases passed. The optional repository-wide run was interrupted after roughly 8 minutes while `meguru-phase3b4-test.cjs` was CPU-bound. No full-repository success claim; no World or related test edits.

## Browser verification and limits

Managed Chromium, actual iframe viewports 390×844, 844×390 and 320×568; resized 390×700→390×844 with completed lesson state preserved. Tested real pointer birth, CPU chain response, read-only inspection, nested help, chapter search, collection cover and normal match header.

At 390×844: tutorial width/scrollWidth 370/370; own field height/scrollHeight 230/230. At 844×390: width/scrollWidth 604/604 and both fields 169/169; all 18 slots present. Chapter-scoped search “人物” returned one chapter and two detailed rulings with no horizontal overflow. Both cover text backgrounds computed transparent. Short portrait screens use vertical scrolling of the complete practice surface, preserving reachable fields and hand; 320×568 birth completed via actual card detail and command.

Screenshots: `tutorial-portrait.jpg`, `tutorial-landscape-and-cover.jpg`, `normal-match.jpg`. These are responsive Chromium checks, **not iPhone Safari hardware QA**. Safari bar/keyboard/safe-area and reduced-motion hardware behavior remains for owner confirmation; visualViewport and reduced-motion support are present.

## Protected assets / deployment boundary

No edits to formal source rules, 452 card definitions/effects/numbers/art, engine, CPU beginner/intermediate logic, hotseat, response/chain/auto-pass, save/schema, Python canonical implementation, fixed-400 assets, main game/Naopoyo/Character/World 3D, or Pages package allowlist. No merge or production GitHub Pages publication. Existing owner-private trial is updated separately and its exact version recorded in `publication.json`.
