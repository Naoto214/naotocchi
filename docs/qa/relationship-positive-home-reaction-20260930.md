# Relationship positive — Home reaction visibility

## Authority and human feedback

Fresh remote starting HEAD: `6ea97072a9df83650e4968725d08720c08483750`.
Tree: `8976c5cc348294669b12c9b77d68436a7f6ce328`.
Main: `dd50ce4bc7b2bef1952ca52ab6157579598aacc1`; ahead/behind 16/0; open PR none.
Branch: `feat/relationship-expression-pilot-20260930`.

Human iPhone feedback: normal/positive/lonely images are good and remain approved (88/88). Hearts can hide faces and the shared play jump obscures which individual is positive. This record concerns Home cues, not reapproval of artwork. No main merge or Ready operation.

## Existing behavior and limited change

`cast-motion.js` previously applied GROUP_LIFTS to every non-idle speech beat, moving the entire cast up to 16px. Play lines mentioning everyone also animated other companions. These are presentation-only; no bond/progression logic depends on them.

Play-with and positive romance speech no longer trigger shared lift or listener/group celebration. The pet's existing care response remains, and other actions/negative feedback/idle retain their existing behavior. Relationship targets come from the same ephemeral reaction records used by Expression, not a second representative draw. Each gets a 900ms inward pulse (scale 1 → .84 → 1 → .94 → 1) with at most the existing local displacement budget (1px crowded, at most 2px otherwise). Clock/personal idle systems are not expanded.

Normal play uses the existing selected representative. Threshold rescue keeps every rescued individual plus any separately selected representative. Annoyed does not start or extend these records. After 2,500ms, the current bond/affection determines normal or lonely. Simultaneous expiries queue one Home render instead of one per individual. No state/save/schema/migration changes.

## Shared heart anchor

One ephemeral CSS heart per selected target, default policy A (all targets where a safe independent anchor fits). Policy B (one primary target) is exposed only through the QA bridge for comparison; it does not remove anyone's expression or motion.

`ART_BOUNDS` is machine-generated from the union of nontransparent pixels in each actor's existing normal/positive/lonely images. `tools/generate-relationship-bounds.cjs` only reads images and rewrites metadata; it never edits an asset. No hand-authored character coordinate exceptions. This metadata is used for cue clearance only: cast layout input/solver/positions are unchanged.

Shared anchor search chooses the nearest safe position above that union, avoiding other cast paint bounds, equipment, ring, conversation and already placed hearts. Nominal heart size is 16–24 CSS px; top-edge clearance can reduce it to 10–15px. Side margins account for idle sway; float distance is capped near the top edge. When displaced from directly overhead, a thin temporary stem behind cast art links the heart to the target's top. Neither element receives pointer input or occupies layout space. Heart is z-index 2 in the cast layer; stem is -1. Pet image/sweat/state-mark ordering is unchanged.

Heart: 2.5s, small pop to full size, up to 4px float and fade. No heart persists in normal/lonely. Reduced-motion mode retains the cue but omits animation. Ordinary dense representative coverage checks all 26 choices in two small/large stage regions. In extreme simultaneous rescue density, colliding extra hearts may be omitted; all positive expressions/motions remain. Human comparison must judge A/B information density and shifted-heart attribution.

Partner static flanking hearts are hidden during positive to avoid doubling. Existing date/movie presentation remains authoritative; Home cues are suppressed while movie-active, menus or a non-Home screen is active. No new romantic expression assets or event rules.

## QA page

Existing owner-private Site is reused:
https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site

Production renderer, layout, resolver, CSS and motion controller are used without a QA visual override. 12 prior fixtures remain; one derived 26-rescue case is added. Each play/return case offers:
- live: actual action and real 2.5s lifecycle;
- fixed before;
- fixed immediately after (actual production action, reaction expiry paused in the disposable QA bridge and actual animations paused at 450ms);
- fixed after expiry (same earned values, current-value resolution).

The fixed snapshots do not prove lifecycle. Live tests and the live selector retain real expiry. No recurring fixed-positive render timer. A/B heart selection is outside Home and uses the production cue renderer. User saves remain isolated in memory; fixture only. Existing standalone browser runners remain unchanged.

Required mapping: A/B ordinary before/positive; C/D/E single rescue before/positive/after; F/G/H multiple rescue before/positive/after; I return-lonely live/after; J/K bear/octopus positive; L normal Home. Dense mix and 26-rescue compare remain available. Parent controls do not shrink the Home iframe. Existing 390×844 / 320×568 references remain; actual iPhone viewport is used.

## Validation

Home/Relationship related command: 124 PASS / 0 FAIL. QA page tests: 18 PASS / 0 FAIL. Additional partner geometry probe: 18 partners × 2 stage regions = 36 cases, missing hearts 0. Final full repository `npm test` completed with exit 0: 2,789 repository tests + 69 Relationship tests = 2,858 PASS / 0 FAIL; cancelled 0, skipped 0. The 124 related checks overlap this total; the 18 QA page tests are separate. Validation used the exact published code checkpoint; the final follow-up commit changes this report only. Earlier interrupted runs are not PASS evidence.

Independent review initially found ordinary representatives with no safe heart; the anchor was revised and all 26 choices tested. Follow-up review independently exercised all 26 at 288×180 with a married partner: no missing hearts. No Critical/Important findings remained. Accessory clearance and batched expiry received a further review without Critical/Important findings.

Image SHA256 audit: all 3,430 baseline images unchanged, including Relationship88, companion/partner normal, normal31, Naoto and other images. No new raster assets. Production browser execution was not claimed; local blocked Chromium was not retried. Human iPhone judgment remains pending. This is not final Relationship GREEN.

## Human check

Reload the same URL. First use ordinary play, single rescue and multiple rescue in live mode. Look for which individual reacts, whether faces remain visible and whether other companions avoid the same strong reaction. Use fixed immediately-after to inspect briefly displayed cues. Compare A/B on multiple rescue and 26-rescue; then check bear, octopus and normal Home. Report: clear / too busy / still unclear / layout issue. No console or long gameplay required.

## Published QA provenance

Publication succeeded on the existing owner-private Site. GitHub code checkpoint: `38ee69b924c5fa9d669275287de805e0e79e0e33`, tree `b72a15f58fb7e89a6f990f8ac83bde98b1b3d633`. Site source commit: `987506b08a9d583537c9c2e892a6b04a551622f7`. Deployment: `appgdep_6abd28fd0d188191a79eb031c921bf87`, status `succeeded`. Saved Site version: `appgprj_6abd0706d5fc8191ba0292d2e91922f3~appgver_7c6a7e1473208191a5c2ef3eef303ea2`. Build manifest checks cover 3,032 source entries. Publication is not evidence of visual acceptance or browser performance.
