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
- Deferred minor: closing a confirmation currently does not restore keyboard focus to its originating button. Touch controls remain available; keyboard polish is pending.
- Static asset references were verified locally. 289 catalog entries have existing sprite mappings (the pupa entry uses its approved art viewport instead); the remaining 163 use explicit replaceable placeholders. All 452 use the same current-data renderer.
- Physical iPhone/Safari and four viewport browser scripts remain unexecuted. Do not treat CSS implementation as a passed visual QA.
- The full catalog regeneration test needs the repository-wide audit dependency set; it was excluded from this isolated run. Canonical source text and SHA-256 checks pass, and the generated catalog is byte-identical to PR381.

## Manual iPhone QA before merge

1. Open the private trial in Safari, rotate landscape/portrait at 844×390, 932×430 and 667×375 equivalents. Check safe areas, page chrome, board/controls/hand separation and hand scrolling.
2. Tap own/opponent/hidden/prepared/discard cards; verify readable full text, one stage/cost number, seven-category back and 8 attribute colors. Inspect the pupa crop for any old printed text.
3. Complete birth, growth, equipment/trap, reaction and multi-target/payment selections; inspect final confirmation and cancellation. Confirm response actor changes show the handoff screen.
4. Hide, background, rotate, reload and import/export. No prior hand, peek or dialog should appear before 準備OK. Try rapid double taps.
5. Finish a game and reopen the deck editor; inspect the result and saved restore.
