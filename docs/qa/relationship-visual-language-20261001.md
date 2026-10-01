# Relationship Home visual language — 2026-10-01

## Authority / scope

Fresh branch `feat/relationship-expression-pilot-20260930`: starting HEAD `3cf021dd7247cbdcbc8379ffba8a286958d34b88`, tree `99987affccab27019612e1ac29eca685cb5e3a45`. Main `dd50ce4bc7b2bef1952ca52ab6157579598aacc1`; ahead/behind 18/0; open PR none. User approves images88/88 unchanged, requests owner-attached visual cues and representative screenshots. No main merge, PR creation or Ready action.

Human observation supersedes the previous proximity claim: in ordinary dense QA, `cat_friend` was positive but its heart looked attached to the owl. The old global free-space search and thin stem were inadequate. Tests of non-overlap alone did not establish ownership.

## Inventory and design

- Old partner display: two static `partner-heart` decorations, independent of affection; hidden only during positive. Replaced by a single state-specific heart attached to `.partner-emoji`.
- Previous positive: individual 900ms pulse plus heart in `castResponse`, globally displaced to free space. Remove that search and connector stem. Heart, aura and actual art now share the same actor parent and transform.
- Romance: existing court/formation/marriage response paths continue to start the same transient. Existing date/movie presentation remains authoritative; Home cues are suppressed during overlays/movie/non-Home.
- Ring: `.partner-ring` remains under `.partner-companion`; `cast-layout.js` reserves it at main's upper-left, between the couple, independent of affection. No solver/anchor changes. Review found a pre-existing cache defect: expression rebuilt the ring but cached layout skipped its position assignment. Reapply the exact cached ring frame on each cue render, with a before/lonely/positive/expiry coordinate regression test.
- Normal31 resolver/art/sweat/z-order and Naoto unchanged. No progression, thresholds, save schema, migration, or new runtime relationship parameter.

## Visual contract

| Actor/state | Heart | Aura | Motion |
|---|---|---|---|
| companion normal | none | none | existing idle |
| companion lonely | none | static faint blue/lavender ellipse behind art | existing idle only |
| companion positive | warm pink/red, immediately overhead | short warm halo | existing target-only pulse |
| partner normal | one small pink heart | none | existing idle |
| partner lonely | one pale blue/lavender heart with small internal crack | faint cold halo | existing idle only |
| partner positive | larger warm heart replacing ordinary/cracked heart | short warm halo | target pulse |
| married, any of above | same state heart | same state aura | same; permanent ring retained |

Aura is a child of the actual actor, z-index -1 within an isolated actor stacking context. No color filter or overlay wash on PNGs. Cold radial-gradient maximum alpha .21, outer .12, extent painted bounds +2px per side, no animation. Warm maximum alpha .5, local only, 2500ms opacity/scale fade. Heart z-index2 within actor, nominal positive16–26px vs partner normal/lonely10–15px. Shared inline vector shape; lonely adds a small crack without splitting the heart. No new image files.

Heart is horizontally centered on the existing union alpha bounds and 3px above them. Only stage-edge clamp/reduction applies; neighbouring cast cannot displace it. Slight overlap with nearby cast is explicitly preferable to lost ownership under this approved specification. No cast movement to make room. All cues inherit actor motion; upward float limited to3px. Top-edge overlap and ring/conversation separation remain visual QA checks.

positive has priority: cold cue is replaced, never stacked under warm. Existing 2500ms weak-map transient and current-value resolution remain. Normal play uses one representative; rescue includes every threshold-crossing companion plus any separately drawn representative. Annoyed does not start/extend positive. All26 expiry still coalesces one Home render. Reduced-motion omits cue animation; runtime expiry still removes transient cues.

## QA

Existing owner-private Site: https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site

20 cases: original13 plus companion normal/lonely/positive, married normal/lonely/positive, and all26 lonely. Existing live/before/immediately-after/after-expiry selector remains. Fixed companion positive invokes the real transient for its first companion. QA-only fixed snapshots pause actual animations; never substitute visual CSS. A/B hearts selects every target vs first target, expressions/auras/motion unchanged. Default A now means immediately above each actor, not available distant space.

Default viewport is actual device. Optional reference iframe sizes390x844 and320x568 make representative browser screenshots comparable; controls are outside Home, no production CSS override. No persistent save access; memory isolation unchanged. Browser probes updated to recognize the replacement partner heart.

## Validation checkpoint

Ring cache regression and positive-over-idle stacking assertion each verified RED→GREEN. Final related bundle149 PASS/0 FAIL = Relationship74 + QA22 + Home53. Home comprises cast-layout, cast-motion, home-touch and viewport-design. Final full npm test, started after the stacking change, remains in progress until the final result below is appended.

Image SHA256 audit compares all3430 tracked images to starting HEAD; result3430/3430 unchanged (SHA256), including Relationship88, companion/partner normal, normal31, Naoto and allothers. No image generation, rewriting or added raster assets.

## Human acceptance

Representative screenshots accompany reports from now on. Browser screenshots prove captured layout only, not iPhone Safari performance or complete lifecycle. Human iPhone check remains pending: owner attribution, face visibility, cold subtlety with26, warm strength, normal vs lonely vs positive partner hearts, ring coexistence and touch responsiveness. This implementation checkpoint is not Relationship final GREEN.


## Published representative browser check

Production code checkpoint `a97c18a782b735c2bf899e9bb4367e543e93a3da` is published to the existing owner-private QA Site (source commit `47929381c0fbcdf464abf3375f764706f0aef1c7`, deployment `appgdep_6abdf72b79808191b117e1902cf1f69d`, succeeded). Main game publication and audience were not changed.

Cloud Chrome was available for UI-driven representative checks; local Work Chromium runners were not retried. This is partial browser observation, not the complete saved automated browser suite and not iPhone Safari acceptance.

- 390x844 ordinary fixed-positive: DOM identifies only `cat_friend` as positive; its attached heart points to `companion:cat_friend`. Initial screenshot exposed a neighbour painting over that locally anchored heart. A scoped positive companion z-index1 fixes positive-versus-idle occlusion without moving cast; a second screenshot confirms the heart is visible. No normal31 stacking changes.
- 390x844 married normal/lonely/positive: one corresponding heart, ring remains at original solver placement; screenshots show separation from face and ring. Lonely DOM has crack, cold aura; positive larger warm heart.
- 390x844 multi-rescue fixed-positive: otter and clock have positive aura/heart; cat remains normal without aura/heart. Real Home play interaction also executed; post-expiry all3 normal was observed. The brief live positive interval was not conclusively captured by that tool sequence; use Node lifecycle evidence plus human live QA, not fixed snapshots as lifecycle proof.
- 320x568 all26 lonely: 26 lonely actors,0 companion hearts; faint separate cold halos, no full-screen blue wash. Existing compact buttons/cast remain visible.
- 390x844 all26 rescue:26 positive actors and26 hearts. Visually dense by definition; A(all)/B(representative-only) comparison remains available. Positive-versus-positive neighbours may still overlap (same z-index); no claim of universal heart non-overlap. Human judgement on acceptable amount remains pending; rescued expression/motion/aura are never reduced.
- 320x568 octopus positive: overhead warm heart, face/body visible, conversation and compact buttons remain separate in representative screenshot.
- Return-lonely fixed-after: partner DOM resolves lonely + lonely aura + cracked heart, with no warm cue.

Representative original browser screenshots (not production assets) are attached to the user report: ordinary-verified, married-normal/lonely/positive, dense-lonely-320, multi-rescue and dense-rescue, dated20261001. They are captured from the production-rendered QA page, not generated illustrations. Screenshot crop requests timed out in the browser service, so full viewport screenshots were retained. This does not establish Safari speed; observed action timing was variable, and iPhone touch performance remains a human check.

Human steps: open the same QA URL, retain “この端末”, choose case then “Homeを見る”. Use fixed before/just-after/after-expiry for comparison and “実遷移（2.5秒）” for lifecycle. Focus on owner attribution, visible face, cold subtlety, ring coexistence and touch response. Images88/88 remain approved; do not repeat art approval.

Full-suite attempt after stacking:2787 PASS/2 FAIL in asset-integrity (ui.css token used12 hash characters instead of required8). Corrected index token only; targeted asset-integrity11 PASS/0 FAIL (verify actual count in final result). Production logic/CSS and representative screenshots unchanged. Full npm verification restarted after token correction.
