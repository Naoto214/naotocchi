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

Related initial run149 PASS/0 FAIL; ring cache regression subsequently added and verified RED→GREEN. Dedicated Relationship plus QA after ringfix95 PASS/0 FAIL. Final related and full repo runs in progress at this checkpoint; not yet full-suite GREEN. Final results and publication/screenshot evidence will be appended before handoff.

Image SHA256 audit compares all3430 tracked images to starting HEAD; expected unchanged including Relationship88, companion/partner normal, normal31, Naoto and allothers. No image generation, rewriting or added raster assets.

## Human acceptance

Representative screenshots accompany reports from now on. Browser screenshots prove captured layout only, not iPhone Safari performance or complete lifecycle. Human iPhone check remains pending: owner attribution, face visibility, cold subtlety with26, warm strength, normal vs lonely vs positive partner hearts, ring coexistence and touch responsiveness. This implementation checkpoint is not Relationship final GREEN.
