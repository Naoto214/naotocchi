# Approved UI implementation — 2026-10-15

Base: PR #381, `3a987044513fdb6d5e69b52b8af40add5a45ccd4`, tree `e86f089e6778061d7acd39492e96286656455702`.
Independent branch: `feat/card-game-approved-ui-20261015`. PR #259 and #381 remain untouched.

## Scope and boundary

Implement the user's approved pupa face structure, exact blue/silver botanical back, eight attribute colors, six category colors, landscape B layout, 3×3 slots, discard/activation/deck column and display-only egg parking.
Consume `view()` and its opaque action IDs. Never inspect raw state to invent UI legality, targets, prices or hidden-card identities. Current catalog controls all text/numbers. Reference face is only an illustration source; its baked text is never displayed.

## Implementation sequence

1. Red tests for all 452 faces, non-main omissions, hidden cards, board ordering/egg display and significant action confirmation.
2. Pure presentation module and swappable art registry; responsive CSS. Reuse existing character PNGs when present, clearly mark temporary art.
3. Integrate detail/action dialogs, priority panel, handoff removal and existing deck/save controls.
4. Run existing engine/match tests and UI regression. Verify engine/catalog files against base blob SHAs.
5. Save incremental GitHub commits and dedicated Draft PR; publish a separate owner-private Site.

## Verification limits

The managed Sites environment requires the control-browser capability for browser QA. It is not available in this session. No browser preview is started. Node tests and source/asset checks run here; Safari/iPhone layout and touch QA remain explicitly pending.

## Artwork provenance

- `ui-assets/card-back-approved.png`: original Library file `libfile_7e655f9bfd20819191828ceb578fdeaa` (青い背景の銀箔植物紋章カード). No pixel changes.
- `ui-assets/pupa-reference-approved.png`: original Library file `libfile_8d6dc0c037f48191bc1f990a4da53b05` (かわいいカブトムシのさなぎカード). SVG viewport displays only the central illustration, excluding all obsolete text/numbers.
- Existing character PNGs: base repository `assets/characters/`. Card-specific final illustrations can replace registry entries without changing rule data.
- Icons: code-native, replaceable line-art components using attribute motifs; not asserted to be exact recovered icon images.

Approved colors and management order come directly from the current user request; they supersede older drafts. Card aspect ratio follows the approved face reference (2:3), not a newly asserted physical-print size.

## Review and verification result

- Independent whole-branch review found two important confirmation gaps. Fixed with failing-then-passing regression tests: paid reactions/replacement choices, and final automatic multi-selection commits with accumulated payment/target labels.
- UI session reads engine `legalActions()` payment metadata and previews the selected transition through unchanged `act()`. Preview is never assigned to live state. This detects auto-committing selections without duplicating selection rules. Only names already in the safe view are displayed; unknown/face-down identities become `非公開のカード`.
- Normal incremental selection and opening a selection draft do not add redundant confirmation. Final payment/target summary survives hide/reveal because it is reconstructed from the engine draft through safe names.
- Confirmation cancellation returns to the selected card detail or restores focus to the originating board action.
- Static asset references were verified locally. 289 catalog entries have existing sprite mappings (the pupa entry uses its approved art viewport instead); the remaining 163 use explicit replaceable placeholders. All 452 use the same current-data renderer.
- Physical iPhone/Safari and four viewport browser scripts remain unexecuted. Do not treat CSS implementation as a passed visual QA.
- The full catalog regeneration test needs the repository-wide audit dependency set; it was excluded from this isolated run. Canonical source text and SHA-256 checks pass, and the generated catalog is byte-identical to PR381.

## Manual iPhone QA before merge

1. Open the private trial in Safari, rotate landscape/portrait at 844×390, 932×430 and 667×375 equivalents. Check safe areas, page chrome, board/controls/hand separation and hand scrolling.
2. Tap own/opponent/hidden/prepared/discard cards; verify readable full text, one stage/cost number, seven-category back and 8 attribute colors. Inspect the pupa crop for any old printed text.
3. Complete birth, growth, equipment/trap, reaction and multi-target/payment selections; inspect final confirmation and cancellation. Confirm response actor changes show the handoff screen.
4. Hide, background, rotate, reload and import/export. No prior hand, peek or dialog should appear before 準備OK. Try rapid double taps.
5. Finish a game and reopen the deck editor; inspect the result and saved restore.

## Saved trial

- Draft PR: https://github.com/Naoto214/naotocchi/pull/384
- UI trial (owner-private): https://naotocchi-card-ui-trial.kerzion214.chatgpt.site/
- Runtime GitHub HEAD: `e4839229d23c70aff57aa8b5cdf4992810311376`
- Runtime tree: `686216e288a78ff339f5380b9784670de55bb720`
- Selected Node suite: 169 passed / 0 failed. Command: `node --test --test-skip-pattern='regeneration is deterministic' prototypes/card-game/tests/*.test.mjs`.
- Original trial and PR #259/#381 remain unchanged, draft/open/unmerged.
- Deployment success confirms publication only, not Safari or real-iPhone QA.
- Exact deployment IDs and verification scope: `evidence/approved-ui-deployment.json`.


## iPhone QA fixes — 2026-10-15, PR #384

Starting remote HEAD `b19eea772aa0d62ef6e62aa28d0d4a637c8a71b8`, tree `de8c86cc9166713d53cc2803eff2abdd86f40148`. The three related PRs were freshly checked as draft/open/unmerged.

### Evidence and causes

Read nine owner-provided iPhone screenshots, IMG_6558, IMG_6560–6567. Portrait screenshots show the sticky hand covering the opponent board and priority actions; IMG_6567 shows a landscape card extending below its dialog. Detail size was width-driven, the entire modal scrolled, and mandatory-choice details led to a separate panel behind the modal.

### Changes

- Card details use a 320×480 logical face, uniformly scaled by both available viewport dimensions. `visualViewport` resize/scroll, orientation changes, dynamic viewport units and safe-area padding feed the fit. Landscape places the card left and readable information right. Portrait caps the card at216px high and uses the remaining area for information.
- Ability text and legal-action lists scroll separately. Very short viewports additionally allow the information column to scroll; the whole card stays fixed. The outer card detail never scrolls or clips its scaled card.
- Priority choices and triggers are actionable inside card detail, including initial egg-bottom selection. Only engine-provided opaque legal action IDs are submitted. Safe choice-instance IDs, target IDs and placement hints are projected from existing legal actions; no new eligibility, cost or target rules are created.
- Selected cards, engine-selected destinations and visible targets are highlighted. Every placement action labels its destination. No-action guidance explains the current priority/response state; the engine does not expose a per-rejected-action reason, so the UI does not invent one.
- Hand ordering uses44px touch arrow buttons (hand reorder mode or card detail). `ui-hand.mjs` stores instance ordering in a separate localStorage key scoped to seed/decks and seat. It never changes engine state, replay, ownership, deck or action IDs. It survives same-browser reload/restore; game exports remain engine-format-only, so preferences do not transfer to another device. New/removed cards reconcile by instance ID.
- The playing viewport allocates separate status, board/action, hand and utility regions. No sticky hand overlay. Landscape preserves opponent / own / controls. Portrait shows both boards above the priority panel; hand and utilities remain separate below. Very short screens use compact cards. The panel and its action list scroll locally.
- Card face follows the approved pupa composition more closely: large attribute medallion with label plaque, title plaque and species, thin double gold frame, leaf sprigs, large art and neutral stat panels. The14 approved base colors and exact blue/silver back pixels are unchanged. Botanical/icon SVGs remain replaceable code components, not an assertion of pixel-identical reference reproduction. All452 descriptions and stats remain canonical.
- Existing blur/visibility/pagehide and actor-change handoffs remove both dialogs, hand, choices and highlights before the next viewer. Confirmation, revision rejection and engine saves are retained.

### Verification

- Selected Node suite:176 passed,0 failed. Includes existing full-452/match/replay tests, source hashes, hidden information and double-action rejection; new presentation ordering, viewport geometry, mandatory choices,452 details and natural UI-session match completion/result/restore tests.
- Command: `node --test --test-skip-pattern='regeneration is deterministic' prototypes/card-game/tests/*.test.mjs`; log: `evidence/iphone-ui-tests.log`.
- Catalog regeneration's repository-wide audit dependency test remains excluded as in the preceding UI work. Engine/effect/catalog/Python baseline files are byte-identical; fixed400 assets are untouched.
- Independent review caught and fixed a null-viewer projection crash at game end and short-viewport action clipping; regression and source review completed.
- `tests/ui-layout.cjs` now covers six browser sizes including844×280,390×664 and320×480; card bounds, hand separation, touch-arrow order, unchanged engine save during reorder, and mandatory action from detail. **Not executed here:** managed Sites requires control-browser, which is unavailable. Geometry tests are calculations, not browser screenshots or Safari proof.

### Remaining real-iPhone QA

1. Reload the UI trial, open the pupa and a longest-text card. Toggle Safari bars and rotate both ways; verify the entire card and close button, and scroll ability/actions independently.
2. Complete the initial mandatory hand choice directly in detail. Test birth, placement/equipment, response/chain, multiple target/payment confirmation, cancellation and pass. Check highlighted placement and actual resolution.
3. Reorder duplicate-name cards with arrows, leave/return to detail, hide/reveal, reload/restore, and verify instance order. Reordering must not advance the game.
4. Verify both players' boards, current actor versus turn, resources and chain; ensure no hand/control overlap with bars expanded, collapsed and in small-screen reorder mode.
5. Background Safari, switch actors, rapidly tap twice and restore a finished game. No private card/peek/detail appears before 準備OK.

The original trial URL and PR #259/#381 are untouched; this patch updates only existing owner-private UI trial and PR #384. Publication success is not visual QA success.
