# Cat expression pilot design

User approved the four-expression cat concept and a one-form pilot in this conversation. This document records that approved scope; implementation continues without another approval round.

## Baseline and scope
Latest main: `3a86fe8e52c449681e02f203fc815d069c6b8a1c`. Phase-one PR #275 HEAD: `dab89b129efc38bb0db70d6b75f795d9c2bf52d5`, already includes that main. Pilot branch starts from that HEAD; neither main nor the phase-one branch is changed by this pilot.
Only adult cat `assets/characters/cat/06.png` gets optional expressions. Normal is the original PNG. Three individually generated, transparent 128×128 PNGs are added at `assets/characters/expressions/cat/06-{happy,strained,sulky}.png`. The approved comparison sheet is a concept only, never sliced for production. The original artwork and all other characters remain unchanged. Keep pose, body proportions, placement, fur and silhouette close to the original; iPhone acceptance remains with the user.

## Meaning and ownership
A small DOM-free `pet-expression.js` consumes the existing emotion profile; it must not contain gameplay thresholds. `resolve(emotion, {sleeping=false,reaction=null}={})` returns one of normal/happy/strained/sulky. Sleeping or non-playable rendering uses normal. Critical weak overrides any happy reaction with strained. Otherwise an explicit temporary expression wins; hungry/tired/sick/weak map to strained, unhappy to sulky, normal/wantsPlay to normal.
`assetFor(baseAsset, expression)` returns an allowlisted variant only for cat/06 and known non-normal expressions; otherwise baseAsset. `reactionFor(event)` maps play_with→happy, play_with_annoyed→sulky, overfeed/medicine_wrong→strained, feed/medicine_cure/sleep/wake→normal, other events→null. Semantics, not dialogue-text guessing, drive reactions.
`script.js` owns one transient expression record/timer. A pet semantic speech beat starts its expression for the existing speech duration; partner/companion speech never changes it. Food and real-cure happiness starts only at the already validated afterglow callback, never on a bite or dose alone. Its duration is the actual afterglow duration, or 1000ms for static reduced-motion feedback. Expiry recomputes from the latest current state and re-renders only the pet visual. Invalidation covers newer care, new life, form changes, sleeping, menus/story/minigames/hidden tab, death/farewell. Critical is reflected immediately even during a temporary happy face. No expression state is saved.
The existing pet/accessory motion layers and base-art layout metrics remain the owners of position. Rendering a face must not move companions, change equipment geometry, or cancel an ongoing Web Animation. Only the home main pet changes; catalogue, transformation thumbnails and social actors continue to use the base portrait. Variant load errors return to the original PNG; a broken original retains the existing emoji fallback.
Reduced-motion still permits immediate static face swaps and must start no new animation. Existing !, care alerts, illness sweat, critical UI and button recommendation behavior remain. Existing care resolver continues to choose appropriate actions; this pilot does not invent new cure rules or buttons.

## Verification and demonstration
Pure resolver tests cover every mapping, unsupported assets, unknown reactions, sleep and critical precedence, and input immutability. Runtime tests cover actual feed/cure/play buttons, spam/wrong medicine, delayed conversations, latest-state return, render stability, interruption/new life/form changes, reduced-motion static happiness, image error fallback, save equality, and no social/layout interference at 26 companions.
A separate preview-only HTML page starts a disposable adult-cat session with in-memory localStorage before loading the unchanged game scripts. It exposes preset links for normal, hunger, sickness, fatigue, sulk and critical; real game care buttons still run actual logic. Its memory storage must not read or write the user's normal preview save. It is produced by a tool from runtime-harness freshState and current index.html and is not loaded by the normal game. This lets the user test the pilot without waiting for the cat to reach adulthood.
Run focused expression/emotion/care/motion/time-pause tests, npm run bump and npm test. Record exact image hashes, alpha/dimensions, automated results and unconfirmed iPhone items in docs/qa. Publish a separate Draft PR and update the existing private confirmation Site only after tests/review. Do not merge to main or mark PR ready.

## Approved continuation — adult dog, 2026-09-16

The user reports all eight cat stages complete and explicitly approves only the adult dog (`assets/characters/dog/06.png`, age 22–39) as the next ten-expression pilot. This supersedes the original cat-only scope for this single form; the existing cat art, anchors, palette, outlines and reactions remain the baseline. Later-stage details are recorded in `docs/qa/emotion-visual-approved-baseline-20260915.md` and stage QA notes. Normal remains the original dog PNG. Add happy, strained, sulky, hungry, sick, tired, weak, critical, wantsPlay and sleeping. Dog hunger uses a yellow food bowl instead of the cat fish, following the established species-appropriate food rule. Static marks follow the adult dog's head. Other dog stages, companions, partners, game values and save schema are out of scope. The existing disposable preview gains an adult-dog option; real care buttons trigger transient happy/strained reactions. Keep PR #278 Draft and never merge main. iPhone visual acceptance belongs to the user.

## Approved continuation — puppy, 2026-09-16

Following the user's approval of adult-dog visuals and request to continue, add only `dog/03.png` (こいぬ, 7–11 years). Keep the original small stepping pose with one raised front paw, ten-expression semantics, outlined palette, yellow food bowl and disposable-preview isolation. Adapt anchors to the smaller puppy head. Preserve the confirmed adult-dog silver anchor (-12,1), all other adult-dog assets/anchors and all cat stages. Further dog stages are not part of this iteration. Keep PR #278 Draft, no merge; user reviews the puppy on iPhone.

## Approved continuation — playful young dog, 2026-09-16

User approved puppy dog/03 and asked to continue. Add only dog/04 (わんぱくいぬ, 12–15 years), ten expressions. Preserve the original forward-leaning stepping pose and golden tan palette. Keep all confirmed cat/adult dog/puppy portraits and anchors. Reuse state/reaction logic and outlined colors, yellow dog food bowl, and isolated preview. Adapt marks to this head position. Keep Draft PR #278, no main merge. User reviews iPhone appearance.

## Approved continuation — young dog, 2026-09-16

User approved dog/04 and asked for the next stage. Add only dog/05 (若いいぬ, 16–21 years), ten expressions with the original slim upright standing pose. Preserve all confirmed cat/dog assets and anchors; inherit palette, outlined marks, yellow food bowl and care reactions. Initial dog05 anchors: strained (-12,3), wantsPlay (-29,7), general (-20,1). Extend isolated preview with youngDog. No gameplay/schema changes; keep PR #278 Draft without merging main. User performs iPhone visual acceptance.

## Approved continuation — calm dog, 2026-09-16

User approved young dog05 including final orange anchor(-33,7), then requested continuation. Add dog07 落ちついたいぬ (ages40–69) only, ten expressions. Preserve rounded seated posture, one upright and one floppy ear, low curling tail. Shared palette, outlined marks, dog food bowl and care reactions remain. Initial anchors strained(-7,5), wantsPlay(-28,10), general(-17,4). Existing cat/dog portraits and anchors unchanged. Extend isolated preview calmDog age40. Keep Draft PR #278, no main merge; user reviews iPhone appearance.

## Approved batch — remaining dog stages, 2026-09-16

User approved calm dog07 and explicitly accepted batching the remaining three dog stages to reduce repeated review. Add dog01 あかちゃんいぬ (0–2), dog02 よちよちこいぬ (3–6), dog08 おとしよりのいぬ (70+) with ten expressions each. Preserve original newborn prone pose, toddler seated proportions, elderly hunched pose/cream age markings respectively. Inherit state colors/outlined marks/dog food bowl/care reactions. Preserve all confirmed prior dog/cat art and anchors. Initial anchors strained/wantsPlay/general:01(2,46)/(-30,50)/(-16,45);02(-2,23)/(-27,28)/(-13,23);08(-10,14)/(-31,18)/(-20,12). Isolated preview adds babyDog/toddlerDog/elderDog. One combined user review after all three, no intermediate approval gates. No other species expansion or gameplay/save changes. Keep PR278 Draft and do not merge main.

## Approved visual review — all cat and dog stages, 2026-09-16

After approving the last dog01/02/08 spacing, the user requested ten-expression images with every mark and authorized agent-side positioning before user review. The latest request explicitly reopens all eight cat and eight dog stages for this review. Inspect all160 state portraits with production marks; retain approved silver/orange positions as the baseline and adjust other marks individually when their larger shapes crowd the face/head. Preserve PNGs, palette, outlines, reactions, game values and saves. Present static comparison images, clearly labeled as production-data composites rather than device screenshots; sweat is an approximation, background and animation are omitted. Keep Draft PR278 and do not merge main. Human man/woman batches remain authorized but deferred until this requested cat/dog review is complete.

## Approved batch — human man/woman lines, 2026-09-16

After approving the cat/dog contact-sheet review, the user requested continuation for both human lines, all8 stages each. Add10 facial variants per stage using the original hair/clothes/pose/accessories, and a yellow rice-bowl hunger symbol. Keep all existing cat/dog assets and numeric anchors unchanged, share state colors/outlines/reactions. Review and tune all160 human composites before presenting four-stage overviews and individual-stage sheets. No stage-by-stage approval; real-device visual acceptance remains with user. Draft PR278, no main merge.

## Approved face-relative marker policy — 2026-09-16

The user explicitly reopened marker placement for all eight stages of cat, dog, man and woman (320 expressions). This policy supersedes every earlier frozen silver/orange/general numeric anchor; facial PNGs remain approved and unchanged. Marks must avoid the entire character silhouette while staying as close as practical, with directions measured from the face.

| State | Mark | Position |
| --- | --- | --- |
| happy | gold sparkles | upper right |
| strained | silver bent line | upper left |
| hungry | yellow food and thought bubbles | upper right |
| sick | yellow-green lines and sweat | lines upper right; sweat brackets head left/right |
| tired | purple circles | upper right |
| sulky | cyan cloud | upper right |
| weak | pink down arrows | upper right |
| critical | red down arrows | upper right |
| wantsPlay | orange rays | directly above face center |
| sleeping | blue Zzz | upper right |

Use observed per-stage face anchors, outlined mark silhouettes and the union of normal/expression character silhouettes. Allow angular adjustment within the designated quadrant to avoid ears, hair, bodies and tails. Maintain a two-logical-pixel clearance in the placement generator. Include sweat rotation and falling motion in collision checks. Preserve colors, outlines, reactions, PNG expressions, gameplay and saves. Review all composites autonomously and provide combined sheets; no stage-by-stage approval gate. Actual device appearance remains a separate user check. Keep PR #278 Draft; never merge main.

## User-selected marker revision — 2026-09-16

The user identified 81 specific placements in image version 959afaea. The exact selection is stored in tools/expression-placement-review.json. Reopen these positions: side marks must look diagonally above the face rather than merely pass a positive horizontal/vertical offset check. Keep other marks and all facial PNGs unchanged. Center selected orange rays against the perceived head center; allow selected sick lines a steeper upper-right angle to stay near the head rather than the raised tail. Maintain collision clearance. Refresh the touch-selectable review page with the new image version and distinguish the prior requested set from new selections. Draft PR278 remains unmerged.

## Approved production-first continuation — 2026-09-16

The user asked to stop endless placement tuning and make as much of the remaining expression set as practical. Continue in complete multi-stage batches without per-stage approval. The next delivery batch covers penguin and turtle, eight stages and ten expressions each (160 independent original-referenced PNG edits). Preserve existing four lines and the latest 81 placement adjustments. Keep the common color/outline/reaction semantics, non-overlapping face-relative marks, original normal sprites, gameplay and saves. Agent performs composite review and updates the touch-selectable gallery; do not hold production for tiny placement differences. No main merge; PR278 stays Draft.

## Approved production-first continuation — frog and clownfish, 2026-09-16

The user explicitly requests continuing remaining lines in complete batches, preserving all six completed lines and81 selected marker revisions. Next batch: frog and clownfish, each eight stages and ten original-referenced expressions. Preserve tadpole tails/developing legs, adult frog poses, clownfish fins/stripes/age, and the small companion fish in clownfish05. Only the main figure receives facial expression edits. Extend existing face-relative outlined mark policy and isolated preview/gallery; no gameplay, romance or save schema changes. Agent reviews obvious overlaps and malformed art without stage-by-stage approval. Existing cat03/dog04/turtle sweat constraints remain separately documented. Keep PR278 Draft and do not merge main.

## Approved production-first continuation — salmon, 2026-09-16

The user explicitly authorized autonomous selection and production of the next complete remaining line. Add salmon, eight stages and ten original-referenced facial expressions per stage. Preserve the newborn yolk sac, juvenile parr stripes, silver adult coloration, red/brown mature coloration and hooked jaw. Reuse shared outlined accents and yellow fish hunger artwork. Observe face centers from an original-coordinate grid and generate only salmon placements. Preserve prior640 expression assets/references/SVGs, all64 placement entries and the81 prior selected corrections. No gameplay, romance or save changes. Extend the same disposable preview and tap-selectable review gallery. Keep PR278 Draft and do not merge main; real-device review stays with the user.


### 承認済み一括展開: ヤドカリ（2026-09-16）
制作優先の継続依頼に基づき、hermit_crab全8段階・80表情を追加する。元画像の目の柄・はさみ・脚・貝殻の形と模様、03の空の貝殻を保持。原画の座標から顔を観測し、新規系統だけマーク配置を生成する。既存720表情・72段階配置と過去81件の修正は不変。通常画像・数値・恋愛条件・セーブ形式も維持し、PR278はDraft・main未マージを守る。


### Approved continuation: jellyfish batch (2026-09-17)
Under the existing production-first authorization, extend all8 jellyfish stages to10 expressions each. Preserve polyp rocks, stacked juvenile disks, star-shaped juvenile, translucent bells, tentacles, bubbles and age differences. Retain completed800 expressions/80 placements and81 user corrections. Same Draft PR and owner-private preview; normal art/gameplay/save unchanged.


### Approved production-first continuation: starfish (2026-09-17)
Following the user's continuation request, add all8 starfish stages×10 original-referenced expressions. Preserve original rounded juvenile, star shapes, colors/textures/bubbles and existing880 expressions/88 placements. Same marks, reaction semantics, Draft PR and owner-private Site. No main merge or gameplay/save changes.


### Approved production-first continuation: coral (2026-09-17)
Under the continuation authorization, add coral8 stages×10 expressions while preserving960 existing expressions/96 placements. Preserve branches, polyps, rocks, colony colors and secondary faces. Change only each stage's dominant face; in06 the central yellow coral,07 upper orange coral,08 large yellow polyp. Same face-relative marks, reactions, Draft PR and owner-private Site. No main merge or gameplay/save changes.


### Approved production-first continuation: butterfly (2026-09-17)
Under the user's continuing batch authorization, add butterfly8 stages×10 original-referenced expressions. Preserve prior1040 expression assets/routes/SVGs and104 placements including81 selected corrections. Preserve green caterpillar segments, twig/leaf, chrysalis and blue wing patterns. Stage06 changes only the emerged butterfly face on the left; retain right-side chrysalis artwork. Observe original-coordinate face anchors. Shared face-relative marks and state semantics; same Draft PR278 and owner-private Site. Normal art248, gameplay, romance and save unchanged. No main merge.


### Approved production-first continuation: beetle (2026-09-17)
Continue authorized batch production with beetle8 stages x10 independently original-referenced expressions. Preserve1120 existing portraits/routes/SVGs,112 placements and81 user corrections. Observe face anchors from originals and coordinate grid; preserve larval segmentation, golden pupa, forked horns, elytra colors, six legs and aged textures. Generate only beetle placements. Normal sprites248, gameplay, romance, saves unchanged. Same owner-private Site and Draft PR278; never merge main.


### Approved production-first continuation: stagbeetle (2026-09-17)
Continue the authorized batch with8 stages x10 original-referenced edits. Preserve1200 completed portraits,120 placements and81 selected corrections, all normal art and gameplay/romance/save behavior. Preserve cream larvae, golden pupa, pale/red/blue-black adult colors, mandibles, legs and age scratches. Anchors observed on original coordinate grid. Generate only stagbeetle placements. Same owner-private Site and Draft PR278; no main merge.

### Approved continuation: cicada (2026-09-18)
Add8x10 original-referenced cicada expressions, preserving1280 existing portraits/128placements/81 corrections. Preserve nymphs, dirt, transparent wings and the empty shell in05; only main living face changes. Same marks/reactions/privateSite/DraftPR278, no main merge or gameplay/save changes.

### Approved production-first continuation: antlion (2026-09-18)
Continue authorized eight-stage batch with80 original-referenced expressions. Preserve1360 completed expressions/136placements/81corrections and normal art/gameplay/romance/save. Keep sandy pits, jaws, closed cocoon04 with existing face, pupa05 and adult wings/trails. Face anchors observed on originals and coordinate grid. Only new8 placements, same marks/reactions/owner-private Site and DraftPR278; no main merge.
