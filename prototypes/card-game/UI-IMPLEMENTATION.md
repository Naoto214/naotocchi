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

## iPhone QA round 2 — court and action flow reconstruction

Starting remote PR384 HEAD `cdea36541f8ce54df57d44cda94cf1b5a5a42637`, tree `afdbf26a422c41759e607e6cd339882e183638b9`. PR259/381/384 were freshly verified draft, open and unmerged. This section supersedes the earlier side-by-side board and arrow-first reorder descriptions.

### Actual evidence and reconstruction

Inspected the five owner-provided screenshots IMG_6578–6582. They show almost flattened landscape slots with Safari chrome open, an egg extending past its slot, card title/art overflow and a large unrelated action list. The images themselves are not published in the repository.

- The table now has a far opponent court above a larger near acting-player court. Handoff removes private content first; 準備OK reconstructs the view for the new actor, including response actor changes. Seat ownership stays A/B. The near court is focused initially; 奥/手前 buttons move the internal court scroller.
- Slot geometry is width-based with a stable aspect ratio. Limited viewport height scrolls the court instead of flattening its rows. The 3×3 arrangement, egg parking and discard/activation/deck order remain. Egg and character images use bounded contain sizing. Card face rows are explicit, preventing intrinsic image size from displacing titles or stats.
- Header, court, and hand tray occupy separate flow regions. Landscape starts with the hand tray collapsed; tap 手札 to open it. Portrait starts open. On very short screens the court scrolls internally; it is intentional that both complete courts are not simultaneously visible. Dynamic viewport and safe-area fitting remain in use.
- A card tap opens the whole card and only that card's legal actions. A sole legal action is emphasized. Mandatory card choices open that card's detail; target/payment/placement steps continue in the same modal workspace. Closing it returns to the board without committing or passing. The persistent header reopens unresolved work. Response/pass and non-card turn actions remain explicit. Chain/history are collapsed.
- Long press (350ms threshold) lifts a ghost of the card. Dragging changes only an instance-ID preview; neighboring cards animate, edge dragging scrolls the hand, and drop commits the display order. Early movement scrolls; cancellation, rotation, backgrounding and handoff cancel the drag. Synthesized clicks are suppressed after pointer release. Accessible arrows remain under 補助操作.
- Hand order still uses separate per-seat browser preferences; engine save, replay, deck order, ownership and legal IDs are unchanged. Same-browser save/restore preserves it. Exported engine saves do not transfer UI preferences between devices.
- Independent source review found the new menu made import unreachable on the welcome screen. A welcome-screen import opener fixes that without starting a throwaway match.

### Verification and limitations

Selected Node suite: **181 passed, 0 failed**. Command: `node --test --test-skip-pattern='regeneration is deterministic' prototypes/card-game/tests/*.test.mjs`. Includes the existing full-catalog, match completion, restore/replay, privacy, double-action protection and viewport calculations. Added tests verify card-specific mandatory actions, actor-relative court ordering, response/pass priority, long-press/pan/cancel state transitions and persistent display-only permutations. Existing rule/catalog/source assets are checked unchanged against the starting Git tree. Repository-wide catalog regeneration remains excluded as in prior UI work.

The current session reviewed actual user screenshots and source, but **did not render the updated UI in a browser or operate iPhone Safari**. Managed Sites requires the unavailable control-browser capability; no substitute browser was installed or launched. `tests/ui-layout.cjs` and `tests/browser.cjs` were adapted for the new workflow and syntax-checked, not executed. Pointer DOM behavior, browser layout, Safari address-bar animation and physical touch remain unverified. Node geometry and gesture-state tests are not visual or touch QA.

### Required next real-device checks

1. Open the UI trial in landscape with Safari bars expanded/collapsed. Open/close the hand, use 奥/手前, and confirm slot/egg/card bounds; repeat in portrait and during rotation.
2. Tap a hand card; read its full effect and use its own action. Complete opening egg choice, birth, placement, payment/targets and final confirmation. Verify response handoff changes the near seat, then continue or pass explicitly.
3. Long-press and drag in both directions, including the hand edges and duplicate-name cards. Test early swipe, cancelled drag, rotating/backgrounding mid-drag, and no accidental card use. Restore the same saved match and check order.
4. Check pupa and long-title/text cards for full card/art visibility. Scroll text/actions without moving the card. Check close/reopen retains unresolved mandatory work.
5. Hide/reveal, rapid double tap, import from a fresh welcome screen, export/restore and match completion. No hand, peek, ghost or prior detail may survive a handoff.

The owner-private UI Site alone is updated. Original trial and PR259/381 remain untouched. Deployment success does not establish browser or Safari QA success.

## iPhone QA round 3 — effect context and orientation-specific table

Starting remote HEAD `651e8658e66677f75791f7375f1cd07b6f4a43b1`, tree `5be78a6836116a7b71f951c0cf56ddb6fc9b1e7d`. PR259,381,384 were freshly verified Draft/open/unmerged. This section supersedes round2's vertical scrolling court, automatic priority dialogs and initially collapsed landscape hand.

### Evidence and changes

Inspected owner screenshots IMG_6585–6588. Portrait initially scrolled the opponent entirely away. Response dialogs occupied the whole screen without identifying the current effect; an unusable card required returning to another dialog to pass. Landscape retained the portrait-style vertical court.

- The normal table now contains the current operation panel. Mandatory options and trigger/response actions are direct buttons; automatic opening of intermediate dialogs is removed. The header's 操作を拡大 is optional. No choice or pass is automated, including single-option choices.
- `ui-context.mjs` is a read-only adapter over existing safe-view cards and existing effect/choice/chain metadata. It labels current work and preserves source-card context across choices, response handoffs and restored saves. It never calculates legality, executes an effect, changes state, or alters action IDs. Catalog descriptors outside the safe field/hand view are permitted only for exact already-public chain sources. Private inspection cards come only from the engine's viewer-authorized peek.
- Egg hand-bottom selection says 山札の下へ戻す; the egg remains identified during its start response window. Birth trigger, chain response and birth hand-bottom selection retain their source. Resolution choice takes precedence over queued chain links, whose history remains collapsed. Finished work clears instead of leaving a last-clicked source indefinitely.
- Declared payment/target destinations are shown without implying a target has already moved: e.g. 山札の下へ戻す対象に選ぶ. Unrecognized choice semantics retain the engine label. Supported legacy saves without source history safely use generic effect context rather than infer a source. No per-rejected-action reasons are supplied by the engine; no-action guidance explains the phase and suggests checking conditions, without asserting an invented failure cause.
- Detail still shows the complete card and independent readable text/actions. It includes current effect context and a direct engine pass button during response. Eligible cards/targets are highlighted from returned candidates. Existing payment/multi-target confirmation remains unchanged.
- Landscape uses three independent columns: opponent / own / current operation, with the hand beneath. Height does not squash card slots; courts and operation lists scroll internally. In short landscape, hand controls sit beside the hand strip and the redundant panel heading is removed to preserve action space.
- Portrait pins a compact opponent 3×3 overview at the top, with visible card names and inspectable cards. Own court is below, with its own scroll region. The current effect and action list share a compact lower panel; the hand is separate. No automatic scroll hides the opponent. Dynamic viewport/safe-area fitting remains in place.
- Approved face/back artwork and14 colors, deck editor, long-press display-only ordering, hidden handoff removal, save/restore, engine revisions and duplicate-action rejection are preserved.

### Verification

Selected Node suite:188 passed,0 failed. Command: `node --test --test-skip-pattern='regeneration is deterministic' prototypes/card-game/tests/*.test.mjs`. Log: `evidence/iphone-round3-tests.log`.

New regression cases cover egg choice→response→normal clearing, natural seed4 birth trigger→responses→hand-bottom and restore, single-choice direct actions without auto execution, pass inside card detail, separate board/operation regions and hidden handoff, multiple-chain focus→resolution selection, and declared activation target destinations. Existing match-completion,452-card, privacy, replay/restore and duplicate-action tests pass. Syntax and whitespace checks pass. Rule-engine/catalog/Python/art files are compared with the starting remote blobs. The repository-wide catalog regeneration audit dependency test remains excluded as in preceding UI work; it was not removed.

An independent source review found no P1/P2 blocker. Its generic activation-target wording finding was corrected and regression-tested. It also confirmed the safe generic fallback for legacy source-less choices.

**Updated browser rendering and real Safari touch are not verified.** Actual supplied screenshots were inspected, but managed Sites requires the unavailable control-browser capability, so no alternate server/browser was launched. Browser regression scripts were adapted and syntax-checked only. They cover portrait opponent pinning, landscape column/hand bounds, card rotation fit, direct operation, hand reorder/restore and handoff privacy when run in an approved browser environment. CSS/source inspection and Node tests are not visual QA.

### Next device checks

1. Portrait: opponent overview stays visible while scrolling own court and hand. Landscape: opponent/own/operation occupy separate columns; Safari bars and rotation do not cover actions. Check the shortest viewport with hand open and supplementary reorder buttons.
2. Initial egg: choose a hand card directly or inspect it then 山札の下へ戻す; confirm the egg context stays through both players' explicit responses and clears afterward.
3. Birth effect: activate, respond/pass, choose hand card, inspect final resolution. Also test two stacked effects, payment/multiple targets, cancellation and restore mid-effect. Confirm current source and chosen movement match the actual result.
4. Tap an unavailable card during response and pass directly. No additional priority screen should be required; 操作を拡大 remains optional.
5. Background/handoff/reload and rapid double taps: no private hand/peek/source from the wrong seat survives. Verify long-press ordering remains display-only.

Only PR384 and the existing owner-private UI trial are updated. Original trial/main and PR259/381 remain untouched. Publication is not a real-device QA pass.

## iPhone QA round 4 — compact notice and first-turn birth

Starting remote HEAD `f6ba92c8d9c28cfba3feb9589eceb42b27fe9b77`, tree `2bbd2dd5ecad0bf5af4e12b7bbbfb7603cae43de`. Fresh checks confirmed PR259/381/384 Draft/open/unmerged. Only PR384's UI branch is updated.

### Diagnosis and scope

Inspected supplied IMG_6590–6592. The portrait operation panel occupied 134px and listed hand choices separately from the hand. The second/third screenshots show A awaiting a response after egg exchange, with time1 and stage1 beetle still present. Chain length0 is not the same as an ended response window. The main card correctly has no ordinary birth action during that window; the UI did not make the remaining passes and return to normal actions clear enough.

Checked current design branch `docs/card-game/01-core-rules.md` (時 / 通常行動と反応 / ターンの開始と終了) and `02-main-system.md` (たまご／たんじょう / 通常のメイン移動の実行時点). The existing engine follows the required order. No engine, effect, state, Python, card definition or fixed400 asset was changed.

### UI changes

- Portrait now reserves a 60px notice row, instead of the 134px action panel (previous short portrait110px also becomes60px). Source/effect and current instruction are compact; tapping opens the complete explanation, choices and collapsed chain/history. The current actor's response wait and an explicit pass remain directly accessible. No response/choice is automated.
- Hand card tap remains the primary route for egg bottom selection and ordinary use/birth. The notice does not duplicate the hand card list. All non-card choices, private peeks, trigger choices and multi-target/payment controls retain the complete engine-action fallback via the notice/header. A single non-card operation has a direct button; multiple operations have a visible 選択肢を開く affordance.
- Normal action notification replaces the effect context when the engine returns to normal. The birth hint appears only when the engine actually supplies a birth candidate. No independent legality or failure reason is inferred from time/stage alone.
- Card detail removes the second source/effect block and shows its instruction once, retaining full card text, exact legal actions, response pass and existing payment confirmation. An unavailable main during response explains that ordinary birth follows both responses.
- Portrait own slots use54px rows with contained 2:3 card/egg content, reducing the court height while retaining3×3, egg parking and the discard→activation→deck column. Opponent overview remains pinned above; own court scrolls internally if the available viewport is short. Landscape retains opponent/own/current-operation columns with separate hand below. Existing viewport/safe-area, hand ordering, hide/reveal and save controls remain.
- Notice accessible names include the full source and instruction, including text visually truncated in a narrow viewport.

### Reproduction and verification

`tests/ui-opening.test.mjs` follows the real HotseatSession, safe-view action IDs and detail renderer, with natural seed4/default decks:

1. R1 A time1; seven cards after normal+egg draw, including M-beetle-01.
2. Tap a different hand card; its exact legal action says 山札の下へ戻す. It is placed at the deck bottom; stage1 remains in hand.
3. Response A, empty chain, time1. No ordinary birth candidate is exposed.
4. A explicitly passes; B receives the hidden handoff and explicitly passes. Save/restore remains hidden until reveal at each transition.
5. A normal action resumes; choice/chain/effect cleared, time1 remains. The detail renderer exposes the exact engine カブトムシ①をたんじょう（時1） action.
6. Existing payment confirmation quotes time1; execution places that instance in main and leaves time0. Repeated old action is rejected.

Selected Node suite: **191 passed,0 failed**. Command: `node --test --test-skip-pattern='regeneration is deterministic' prototypes/card-game/tests/*.test.mjs`. See `evidence/iphone-round4-tests.log`. Includes452-card/current-source verification, existing match completion, response/chain/birth-effect resolution, restore/replay, privacy, hand ordering and duplicate-action tests. Repository-wide deterministic catalog regeneration remains excluded because its full audit dependency tree is not materialized; no test is deleted. Updated browser helper/layout scripts are syntax-checked only.

**No updated browser rendering or real Safari touch test was run.** Managed Sites requires unavailable control-browser; no fallback browser/server was launched. Actual input screenshots were reviewed. Node tests establish behavior/projection/markup, not visual layout or physical tapping. The user performs final iPhone QA.

### Device QA

- Portrait with Safari bars expanded/collapsed: notice stays compact, both board regions and hand remain separate; own court can scroll to preparations. Repeat landscape and rotation.
- Return a non-main hand card through its detail action. Pass as A, hand off/reveal B, pass as B, hand off/reveal A. Confirm normal-action notice, then tap a stage1 main and confirm time1 birth. Do not spend time on optional responses during this check.
- Open notice details for non-card choices and private inspection; verify required choices cannot be skipped. Test birth trigger and stacked responses, long effects and payment confirmations.
- Save/restore mid-choice and mid-response, background/handoff, rapid repeated tap, long-press reorder. Verify private content disappears on handoff and display order persists.

Owner-private UI trial only; original trial/main and PR259/381 are untouched. Publication is not a real-device QA pass.


## iPhone QA round 5 — response priority and turn progress

### Fresh canonical baseline

| PR | HEAD | tree | state |
| --- | --- | --- | --- |
| 259 | 0a9df8f09b5ad657730f29d14e2d357241dace8c | 78677b98fdc229c7acf10e9112ca9744ae0fa7ba | Draft/open/unmerged |
| 381 | 3a987044513fdb6d5e69b52b8af40add5a45ccd4 | e86f089e6778061d7acd39492e96286656455702 | Draft/open/unmerged |
| 384 | cd19b6f7270834818a79b8abb521262298a73d76 | d9d375d5fd305e86d0ef60472a899ab3b27d57fc | Draft/open/unmerged |

GitHub connector supplied the exact source blobs into an isolated local checkout because direct Git access was unavailable. Local baseline blobs were verified against the remote tree. The current design PR's 01-core-rules, 02-main-system, 06-action-chain-checkpoint and 64-turn-boundaries-and-victory-timing match the UI branch copies byte-for-byte.

### Confirmed causes

1. `projectOperation` relabelled every `pass`, including the engine's normal `ターン終了を申し出る`, as a response pass. The compact notice then overwrote it again as `パスして進む`. After returning to normal, the same-looking button could therefore begin turn termination. The command itself was valid; its UI meaning was wrong.
2. `compactOperationMarkup` used `通常行動` whenever effect context was absent, even in an empty-chain response window. This reproduced `通常行動` and `応答待ち` together after resolving the birth ability and during termination.
3. Handoff only named the next operator. It did not explain that response priority can change while the turn owner stays A.

No rule-engine transition failure or duplicate initial response was reproduced. This is a deterministic investigation of the reported flow, not a replay of the user's unprovided saved game. UI-only corrections preserve all required passes and all action IDs, costs, choices and commands.

### Rules and exact pass order

01 specifies own-start time reset, initial A/B time0, and the first own-start time1. 02 requires normal draw followed by egg extra draw and hand-bottom choice. 06 requires alternating priority, two consecutive passes to resolve a chain, no interruption during resolution, and post-resolution response opportunities. 06 start/end section explicitly requires a fresh empty-chain pair after effects resolve. 64 preserves start and end boundaries.

Natural seed4/default decks, with no response card used:

| Boundary | Explicit operations | Result |
| --- | --- | --- |
| A start | time1, normal+egg draw, choose hand-bottom | A hand7/deck33 → hand6/deck34; B time0/hand5/deck35 |
| Start response | A pass → B pass | A normal; time1; no chain/choice/effect remains |
| Birth | A places beetle①, paying time1 | A time0; main placed; optional birth trigger |
| Birth ability | A activates; A pass → B pass | ability begins resolution and requires hand-bottom choice |
| After mandatory choice | A chooses; A pass → B pass | A normal again; B has not drawn or recovered time |
| End request | A requests end → B pass | A end window; still A's turn |
| End responses | A pass → B pass | B's first turn begins; time1, normal+egg draw → hand7/deck33 |
| B egg and start response | B returns one; B pass → A pass | B normal; time1, hand6/deck34 |

The opening egg exchange alone creates one response window, with exactly A then B passing if neither activates. If A instead plays its available time1 quick card, chain construction needs A/B passes, then the start window needs another A/B pair, as the rules require. A's time is then0, so a time1 birth is no longer available. Neither response handoff is B's turn start.

### Minimal shared UI changes

- Project only public response-window name, consecutive-pass count and pending-work presence. Choice/normal/finished phases discard that progress metadata. No engine/save schema changes.
- Shared turn/actor wording in board header, expanded operation, card detail and handoff, e.g. `Aのターン・Bの応答待ち`. Hidden mandatory choices stay labelled as selections without revealing their contents.
- Response notices name start/action/end/chain context and show consecutive passes0/2 or1/2. Details explain why responses are available and whether the current actor has any legal non-pass action, based exclusively on engine candidates.
- Pass labels describe the next step: other player's response, effect resolution, normal actions, end processing. Normal actions retain `ターン終了を申し出る` and show no response-wait notice. No automatic pass/selection added.
- Preserve source-card thumbnail/name during chain response, compact portrait panel, full choice fallback and all existing styling/artwork.

### Verification and evidence

- RED→GREEN for both original UI defects and public response/hidden-choice wording. Independent review caught a P2 aborted-challenge label: comparison may be skipped. Added a failing regression and changed the shared button to `パスしてちょうせんの処理を進める`; engine is unchanged.
- **199 passed / 0 failed**, including 8 new tests. Command: `QA5_TRACE=prototypes/card-game/evidence/iphone-round5-turn-trace.json node --test --test-skip-pattern='regeneration is deterministic' prototypes/card-game/tests/*.test.mjs`.
- Existing full452, match completion, restore/replay, private information and duplicate-operation tests pass. The new first-turn test checks exact18-step owner/actor/phase sequence, restore at every command, hidden handoff, stale-command rejection, actual time/hand/deck/main, birth and both starts. Separate tests cover opening quick-card responses and new-link pass reset/LIFO resolution with mandatory choice.
- `evidence/iphone-round5-turn-trace.json` records every phase, window, chain, time, physical hand/deck order and main in the deterministic test. It contains fixture data, not a user's save.
- `evidence/iphone-round5-tests.log` contains the complete selected-suite result. Catalog regeneration's full audit dependency test is excluded exactly as in rounds2–4; no test removed. Card source/hash checks run successfully.
- All four runtime modules pass syntax checks; `git diff --check` passes. The engine, all effects/rules/catalogs, canonical docs and fixed400 assets are unmodified. 90 materialized pre-existing files matched remote blobs before this report was appended; only4 runtime presentation files and2 wording assertions changed.
- No new browser rendering or real iPhone/Safari touch test: managed Sites has no available control-browser. No substitute browser or server was launched. Node markup/behavior tests are not visual/touch proof.

Only PR384 and the existing owner-private UI trial are updated. PR259/381/384 remain Draft/open/unmerged; main and the original trial are untouched. On iPhone, return a non-main card, pass as A then B, confirm `Aの通常行動`, then select a① main. Use the distinct end-request button only when ready to finish the turn.
