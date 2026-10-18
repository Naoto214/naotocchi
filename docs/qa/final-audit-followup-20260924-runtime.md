# Targeted independent runtime review — 2026-09-24

## Scope and provenance

Read actual working files in `/workspace/scratch/768fc4e0e9ad/expression-audit`; no repository files changed, images generated, full expression audit rerun, merge, or production action performed. Root investigator confirms these files are the tree of GitHub PR 278 HEAD `81e9fafd896f8cb3a8d01d589beb15a9d49e5a09`; local history intentionally has a different HEAD, `2e84a52937a135ab59b890abe369f8a07525c9a0`. This subreview did not independently retrieve the remote tree; root handles fresh remote/tree identity verification. Local missing alternate object store prevents history-based verification, but not reading/running working files.

Evidence: source inspection plus `probe.cjs` and its `probe.json` output (35 targeted production-harness observations; command exited 0). This uses the existing substitute DOM/clock harness, which explicitly does not measure browser rendering/FPS (`tests/helpers/runtime-harness.cjs:8–9`). No claim of new browser screenshot validation. All source references below refer to the actual files reviewed.

## Exact layer order for visual review

Back to front, within the protagonist:

| Layer | Actual DOM / CSS | Paint position |
|---|---|---|
| Character image (or visible emoji fallback) | `#petSprite > .character-visual > img.character-asset` | Image is position:relative with z-index:auto; CSS shifts its top by `--cast-art-offset-y` |
| Exactly one expression accent | `.character-visual > .pet-expression-accent > svg` | position:absolute; inset:0; z-index:1 |
| Disease sweat, left | `#petSprite::before` | position:absolute; z-index:3 |
| Disease sweat, right | `#petSprite::after` | position:absolute; z-index:3; after the before pseudo-element if their painted pixels intersect |

**Correct composite order is character → accent → sweat. Sweat is above the expression accent.** `pet-expression.css` loads after `care-attention.css`, but this does not reverse the numeric z-index order (`index.html:15–16`).

Evidence: generated HTML `script.js:11231–11245`; `.character-visual` is position:relative with no z-index in `style.css:3639–3646`; actual hero image is position:relative/top-offset in `ui.css:80–83`; accent z-index is `pet-expression.css:1–15`; both sweat pseudo-elements have z-index:3 in `care-attention.css:37–46`.

The DOM is `cast-stage > cast-sway > cast-response > #pet > .pet-core > #petSprite > .character-visual` (`index.html:81–89`). `.pet-core` is display:contents and position:static (`ui.css:75`). `.cast-stage` has isolation:isolate; `.cast-sway` normally has will-change:transform plus an animated transform (`ui.css:68–71`). Neither the positioned `#petSprite` nor positioned `.character-visual` alone creates a stacking context because neither has a non-auto z-index. There is no default opacity/filter/transform on `.character-visual` isolating its accent from the sibling sweat pseudo-elements. Speaking/emote filters on `#petSprite` (`ui.css:93–97`) and production Web Animations transforms applied to the `#petSprite` actor (`script.js:13961–13963`, `cast-motion.js:118–128`) can create a protagonist stacking context; all three layers remain inside it and retain the above ordering. `cast-response` is a shared parent motion layer. Egg effects are separate temporary inner image/wrapper animations (`egg-hatching.css:3–20`), not a second expression marker.

Shared parent motion translates/rotates the image, accent, and sweat together. The image's static art-offset is image-only, while the sweat top explicitly includes artOffsetY (`script.js:14047–14062`, `pet-expression.js:392–404`); the accent SVG uses its own registered offset (`pet-expression.js:376–388`). A compositor must reproduce these distinct placements instead of applying the image top-offset to every layer.

## Expression and sweat are separate selection routes

Expression: `renderPetVisual` derives current emotion, computes visibility, resolves one expression string, and obtains one asset plus one accent (`script.js:11262–11282`). `setStageVisual` replaces the inner visual keyed by asset/fallback/emoji/accent/size; it does not accumulate accents (`script.js:11248–11254`). `accentFor` emits one span for a recognized expression and registered base asset (`pet-expression.js:373–389`). Several SVG paths/circles inside that single span, including outline under-strokes and three Z glyphs, are components of one mark, not simultaneous expression states.

Emotion priority (`emotion-state.js:25–39`): unplayable/sleeping → normal emotion; life critical → critical weak profile; life warning → mild weak; illness → sick; health low → weak; energy → tired; hunger → hungry; happiness → unhappy/wantsPlay; otherwise normal. Expression resolution then applies blocked → normal, sleeping → sleeping, critical weak → critical, temporary reaction, persistent state (`pet-expression.js:355–364`). Sleeping therefore wins over critical for the face even while a critical care alert remains possible.

Sweat: `renderCareAttention` sets `device.dataset.careIllness` from `effectVisible && state.isSick` (`script.js:3599–3606`); the CSS attribute selector adds both sweat drops. It does not check the selected expression or require the care notice kind to equal sick. Sweat is not itself an expression SVG. A life-critical notice can coexist with disease sweat when isSick is true; critical without illness does not produce sweat.

| Current conditions / route | Chosen expression mark | Disease sweat |
|---|---|---|
| Sleeping + critical | sleeping only | Only if also isSick |
| Hungry + sleeping | sleeping only | Only if also isSick |
| Critical + low health / weak | critical only | Only if also isSick |
| isSick, no higher life/sleep state | sick only | Yes |
| isSick + life warning (deathMeter 60) | weak only | Yes |
| isSick + low health 25, no life warning | sick only | Yes; illness beats health-weak |
| isSick + hungry / tired / wantsPlay values | sick (or higher life/sleep state) | Yes; no hungry/tired/wantsPlay mark |
| isSick + active play_with reaction | happy only | Yes |
| isSick + active play_with_annoyed reaction | sulky only | Yes |
| isSick + overfeed reaction | strained only | Yes |
| isSick + active feed/wake normal reaction | no expression mark; normal original | Yes |

Thus **sleeping+critical, hungry+sleeping, and critical+weak are not expression-mark-plus-expression-mark combinations in this runtime**. The states may coexist in game values; only one expression mark is rendered. Mark-plus-disease-sweat is a real, separate coexistence case.

Current reachable sweat coexistence set is sick / sleeping / critical / weak / happy / sulky / strained / normal. Hungry, tired, and wantsPlay are below sick in persistent priority and are absent from the temporary event mapping, so they do not form stable visible sweat+expression routes here. This is a route statement, not a restriction of the reusable `accentFor` function when called directly with arbitrary arguments.

The probe verifies the first three exclusive-state examples, sick+sleep, sick+critical, sick+life-warning, sick+health-weak, sick+hunger/tired, and semantic reaction/expiry routes. Source supports wantsPlay's same priority conclusion. Semantic reactions use the actual `setSpeechBubble` production route; they are not all independent button-click tests. Real successful feeding while sick was separately exercised (below). Play button source permits illness and maps successful/spammed play to the two semantic events (`script.js:16887–16920`); overfeed has its own event (`script.js:16660–16666`).

## Normal+sweat, afterglow, and expiry

`reactionFor` maps play_with → happy, play_with_annoyed → sulky, overfeed/medicine_wrong → strained, and feed/medicine_cure/sleep/wake → normal (`pet-expression.js:344–352`). Only pet semantic speech begins the temporary expression (`script.js:3907–3909`), lasting `SPEECH_DURATION_MS=2500` (`script.js:3709`). No normal SVG exists in `ACCENTS` (`pet-expression.js:332–343`), so normal+sweat means the original character image plus two sweat pseudo-elements.

The real feed click probe, with a sick pet at hunger 60 and a deterministic valid result, produced:

| Observation time | Standard motion | Reduced motion |
|---|---|---|
| 1 ms after feed | normal original + sweat, no accent | same |
| 2700 ms | happy accent + sweat | same |
| 4000 ms | sick accent + sweat | same |

This confirms that normal+sweat is not merely hypothetical API reachability. Feeding does not cure illness; the food afterglow predicate only requires hunger to be none (`script.js:16681`). Cure afterglow instead requires !signals.sick (`script.js:16856`). Both pass validation in `scheduleCareAfterglow`: current serial, playable, awake, noncritical, visible care/expression context and the predicate; busy speech/conversation/motion delays retry by 120 ms (`script.js:3787–3805`). It requests happy for the returned motion duration; reduced motion gets a static 1000 ms happy even with zero motion duration (`script.js:3800–3803`).

Temporary records are replaced, not queued/stacked. They are invalidated by life identity, species, stage, expiry, hidden context, sleep or critical status (`script.js:3730–3768`). Expiry redraws from current state. Therefore an ordinary render cannot extend a transient, and an old happy mark cannot linger under a later sick/critical/sleeping mark. The probe's semantic reactions returned to sick after 2501 ms.

## Suppression and fallbacks

Expression context requires growing, visible document, no game/meguru, no transform chooser/menu/story/life-card (`script.js:3816–3825`). It resolves to normal when blocked. Sweat visibility has its own gates: growing, no game/grand goal/transform/menu/life-card, visible document, and story hidden (`script.js:3592–3605`). The probe verified normal/no-accent/no-sweat for menu, story, hidden tab, dead, farewell, transform, and life-card states. The visibilitychange handler explicitly clears afterglow/expression/motion and care effects (`script.js:18580–18586`).

The gate predicates are not literally identical: expression explicitly checks meguru; care explicitly checks grandGoalPending. Actual home content is also display:none for game, meguru, grand goal and life-card (`script.js:11713–11715`, `style.css:346–348`). `startMeguru` initially calls paused world rendering and hides screenNormal (`script.js:14645–14659`). Consequently a retained underlying dataset is not proof of a visible mark behind these screens. No additional hidden-screen visual combinations should be inferred from data attributes alone.

Asset fallback does not choose a second expression. Unknown base assets keep base art and have no accent (`pet-expression.js:367–374`). Missing expression PNG falls back to original PNG first; if original also fails, renderer shows emoji (`script.js:11276–11280`, `11327–11342`, `style.css:3662–3664`). The expression accent is generated independently and is not removed by these image error handlers or failure CSS. Sweat likewise remains governed by illness/visibility. Therefore **original/emoji + selected accent + sweat** can occur on image failure; this is distinct from normal expression/no accent. This fallback behavior is source-inspected here, not newly browser-tested.

## Motion details needed for faithful compositing

The SVG accent itself has no CSS animation and no SVG animate element in its generator. It inherits parent actor/shared cast motion. Sweat is animated independently: 2.6 s ease-in-out, top travel from 0 to `--care-sweat-travel` at 65%, rotate(18deg) throughout, opacity .65 at 0/100% and 1 at 65%. Left drop has -1.3 s delay; right has zero delay (`care-attention.css:39–46`). A single still sample with both drops at the same phase is not the simultaneous production frame; an envelope can intentionally include both swept paths but must be labeled as such.

Drop width is clamp(6px,10%,11px), height clamp(9px,15%,16px), border-box includes the 1px border, radius 65% 35% 60% 40%, fill #a5d934, border #689d15, shadow 0 1px 4px #466819b3 (`care-attention.css:39–42`). Shadow and anti-aliased stroke pixels are part of visual proximity even if a numeric solid-shape collision mask excludes them.

For reduced motion or low performance care-motion=still, sweat animation is none!important (`care-attention.css:77–84`). Crucially the default rule supplies opacity .85 but supplies **no static transform**: these still drops are unrotated and unshifted, rather than a paused rotate(18deg) animation frame. In forced-colors mode they are also unanimated and use CanvasText/Canvas (`care-attention.css:86–90`). The targeted low-performance probe confirmed careMotion=still.

`ui.css:77` cancels legacy #petSprite CSS idle/sick/sleep animations. Shared cast sway remains a parent animation (`ui.css:69–73`; world overrides `world-scene.css:149–152`), with reduced-motion suppression in `ui.css:219` and `world-scene.css:353–354`. Web Animations actor reactions are separately suppressed by reduced-motion media preference (`cast-motion.js:100–104,118–124`). Thus the relevant collision-changing local motion is the sweat's relative motion; shared actor/group motion does not change relative image/accent/sweat positions.

## Review implication

The existing 346 union candidates must be judged as conservative candidates, not automatically visible defects. For actual view reproduction, respect reachable routes, one selected accent, character→accent→sweat paint order, border/shadow/opacity, art-offset separation, left/right animation phase, and the distinct still geometry. This targeted review neither recomputes that candidate count nor asserts visual approval of those candidates.
