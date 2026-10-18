# サクラ独立レビュー記録

単独80枚とマーク付き80合成を全件確認。06-sickの中間指摘は修正後に解消。最終Spec/codeレビューは後続に追記。


---

# Independent sakura original-art review

Reviewed all eight originals individually with `view_image`, first at 6× nearest-neighbor enlargement and again with a coordinate grid. Original assets match baseline `de5b7cb9bf9605b78559fc1992c13b3dae0d15c6` (`git diff` empty for assets/characters/sakura). No repository changes made.

Canonical labels come from `character-world-master.v1.js`. Existing `tools/expression-face-anchors.json` encodes each stage as `[faceCenterX, faceCenterY, headLeftX, headRightX]`, using original 128×128 coordinates. The center is a practical center of eyes-and-mouth, not a whole-sprite center. Head extents below are intentional anatomical regions for mark placement, not claimed segmentation masks.

| Stage | Canonical name | Main face | Suggested anchor |
|---|---|---|---|
| 01 | 芽ぶきのたね | Face on the lower-left portion of the large diagonal seed | `[51,85,17,100]` |
| 02 | ふたばのサクラ | Cream circular seedling base below two leaves | `[65,85,37,94]` |
| 03 | 小さなサクラ | Cream face at center-bottom of branching trunk | `[64,95,49,80]` |
| 04 | 育ったサクラ | Cream face on lower trunk beneath blossoms | `[64,87,50,78]` |
| 05 | サクラのつぼみ | Center upright bud | `[65,69,51,79]` |
| 06 | サクラの花 | Left large open flower | `[46,76,19,74]` |
| 07 | サクラの実 | Center-lower cherry | `[58,94,36,81]` |
| 08 | 年を重ねたサクラ | Cream face on central lower bare trunk | `[62,89,46,80]` |

## Main-face choices

Stage 05: Agree with center upright bud. It is front-facing and centered on the converging stems. Exactly four secondary faces must remain unchanged: upper-left, upper-right, lower-left, lower-right. The upper-right bud is bigger than the chosen bud, so prompts must identify the target by position, not by size. Target face features occupy roughly x60–73, y63–74; cheeks extend farther. The green calyx is identity-bearing anatomy and should remain unchanged.

Stage 06: Agree with left large flower. Both large flowers have equally readable face centers, so the choice needs explicit wording in every prompt. Preserve the right large flower and the small lower-right bud face. Additional buds toward upper/left areas are flower anatomy but do not have readable faces. Target eyes-and-mouth occupy about x39–53, y70–82. Its whole pink flower is x19–74; the yellow central face disk is narrower, around x36–55. Use the whole flower as the mark-placement head extent, consistent with the dandelion flower precedent, but restrict image editing to the central face.

Stage 07: Agree with center-lower cherry. It is frontmost and contains the strongest central expression. Preserve left cherry's wink and right cherry's surprised/open-mouth expression. Target facial features occupy about x46–70, y86–102. Preserve stems, shared leaf, and detached pink petals.

## Concerns for implementation and QA

- These are three multi-face images, not three opportunities to apply an expression to every face. Independent inspection of each result must compare all secondary faces to the original.
- The selected face centers are small at 128px; sleepy, tired, weak, and critical must remain visually distinguishable after normalization.
- Stage 03, 04, and 08 faces are part of a trunk, with branches above and roots below. Head extents mean local trunk, not total tree width. Exact alpha collision testing must still include all branches and roots.
- Stage 05–07 surrounding faces/anatomy may push generated overlay marks far from the selected face. Inspect placement visually after collision-free computation; absence of overlap alone does not establish association with the selected face.
- Some original images already contain isolated magenta-colored pixels at outline tips (visible in 03, 05, 08). These are baseline art details; do not classify unchanged pixels as new expression-generation artifacts, and do not broadly recolor original images as part of this batch.


---

# Independent sakura stages 01–02 expression review

Result: PASS, no blocking defects in the reviewed 20 files.

All 20 final normalized PNGs were viewed individually at 6× nearest-neighbor scale on a dark background, against the separately inspected original stages. This is visual acceptance at the requested tolerance, not a claim of pixel-identical preservation. Stage01 retains the tilted brown grooved seed and green sprout; stage02 retains two green leaves, stem, cream circular face/base and surrounding soil rocks. No missing parts, added faces, embedded symbols, text, droplets, or obvious anatomical distortions were observed. These stages have no secondary faces.

I normalized only the 19 initially absent finals using the unchanged existing normalize-expression-image.cjs helper and each recorded generated source. 01-happy already existed. No source, tool, code, git or Site changes were made.

Minor nonblocking observations: the generated seed shell grooves, leaf outlines and rock details drift modestly between expressions, as expected from standalone generated assets. 01-tired looks close to eyes-closed exhaustion, but its flat mouth and heavy lids distinguish it from smiling sleep. Sick and weak are related expressions; sick has stronger worried eyebrows, while critical has a clearly more depleted open mouth and nearly shut eyes.

## Per-file findings

| File | Result | Face assessment |
|---|---|---|
| 01-critical.png | PASS | Nearly shut horizontal eyes, raised distressed brows, small open strained mouth; distinctly more depleted than weak. |
| 01-happy.png | PASS | Upturned closed smile-eyes and broad open grin; clearly joyful. |
| 01-hungry.png | PASS | Round pleading open eyes and small vertical open mouth; reads wanting/asking. |
| 01-sick.png | PASS | Pained lowered eyes, worried brows and downturned mouth; clearly unwell. |
| 01-sleeping.png | PASS | Gently closed eyes and relaxed small smile; calm sleep, distinct from tired. |
| 01-strained.png | PASS | Tightly squeezed angular eyes and tense wavy mouth; clear discomfort. |
| 01-sulky.png | PASS | Asymmetric/sideways half-lidded eyes and pout; clearly annoyed. |
| 01-tired.png | PASS | Heavy lowered/half-lidded eyes and short flat mouth; subdued and tired. |
| 01-wantsPlay.png | PASS | Bright large highlighted eyes, raised asking brows and smile; eager attention. |
| 01-weak.png | PASS | Drooped eyes and tiny frown, subdued; less distressed than critical. |
| 02-critical.png | PASS | Nearly shut horizontal eyes, raised distressed brows, small open strained mouth; distinctly more depleted than weak. |
| 02-happy.png | PASS | Upturned closed smile-eyes and broad open grin; clearly joyful. |
| 02-hungry.png | PASS | Round pleading open eyes and small vertical open mouth; reads wanting/asking. |
| 02-sick.png | PASS | Pained lowered eyes, worried brows and downturned mouth; clearly unwell. |
| 02-sleeping.png | PASS | Gently closed eyes and relaxed small smile; calm sleep, distinct from tired. |
| 02-strained.png | PASS | Tightly squeezed angular eyes and tense wavy mouth; clear discomfort. |
| 02-sulky.png | PASS | Asymmetric/sideways half-lidded eyes and pout; clearly annoyed. |
| 02-tired.png | PASS | Heavy lowered/half-lidded eyes and short flat mouth; subdued and tired. |
| 02-wantsPlay.png | PASS | Bright large highlighted eyes, raised asking brows and smile; eager attention. |
| 02-weak.png | PASS | Drooped eyes and tiny frown, subdued; less distressed than critical. |

## Geometry and SHA-256 snapshot

Coordinates in alpha bounds below are PIL exclusive-right/bottom format. Every image is 128×128 RGBA, has only alpha values 0 and 255, matches its original alpha bounds exactly, and has transparent canvas edges.

| File | Alpha bounds | SHA-256 |
|---|---|---|
| 01-critical.png | `(16, 8, 111, 120)` | `148a17a36d2965956c709a534ee6d025c9213118df1ced8f9f59888d5a7cb9b7` |
| 01-happy.png | `(16, 8, 111, 120)` | `abe6ffb2c98da81e19dfc6fc9965c38649662221452cea747656fafd5fc0df2e` |
| 01-hungry.png | `(16, 8, 111, 120)` | `f24b7941521fd1ea96a91e8f1b0609332bd86f23a5f61d8f33e9b712ed38360c` |
| 01-sick.png | `(16, 8, 111, 120)` | `72c0f0cf3c26409fd6ee1901d262822ce519c4792ed872a2f639d95364cd42a1` |
| 01-sleeping.png | `(16, 8, 111, 120)` | `73da495a29c8c1968cefda7cdb9163c12f3b58c44d8b7acb45cdf040f9b28b32` |
| 01-strained.png | `(16, 8, 111, 120)` | `908631fdeb63bbf7e81ed711b4390046b926b5041dcbb6c6b377a7d2738e73cd` |
| 01-sulky.png | `(16, 8, 111, 120)` | `24b4a711dbfedce53f32a5f9fb5b4bc4646783df3de779938f747b92bc2722f7` |
| 01-tired.png | `(16, 8, 111, 120)` | `b22cfdcf31f26b14c1a2fc5d3186908b566c38e362ffc8278647726594175825` |
| 01-wantsPlay.png | `(16, 8, 111, 120)` | `f0e1c70484e339c5c5e13cc9dfc7db624b37f6b72027ce1406a949286e1f9e5e` |
| 01-weak.png | `(16, 8, 111, 120)` | `a2aeac74b2306e5383201f54d8ce4d5f5e803f6eb4ba0bb2287a0fd69b8145cd` |
| 02-critical.png | `(9, 8, 118, 120)` | `ec065c66ffdfa1f8bda38fd848ffba60bca858626453bd3de6c22826787ecc8d` |
| 02-happy.png | `(9, 8, 118, 120)` | `0a9675f20ad566a7b25cf000655b3e82b44005a1b12fc660629e5a2c699f4d19` |
| 02-hungry.png | `(9, 8, 118, 120)` | `2c87c058f7bdab18b46ad35586e97c4fe5cdfb261bc069a4218a5c9983be1c45` |
| 02-sick.png | `(9, 8, 118, 120)` | `8e9aa39f41d62678dff73996683b13c46d176e4c3c5769faa21677d58c9659db` |
| 02-sleeping.png | `(9, 8, 118, 120)` | `a066c2773d37fc0cc3859ae73d93808ca1854db6c39fac222c4765b264938c19` |
| 02-strained.png | `(9, 8, 118, 120)` | `e4db1f23dfee6abbb0c58a6a1d760ff5f54a05647aea82dd2930750f4962e3e4` |
| 02-sulky.png | `(9, 8, 118, 120)` | `ccc2524548466ef9a9b0d7e9491e0a8a310d4e089c11763fad9769c41859d9b2` |
| 02-tired.png | `(9, 8, 118, 120)` | `4016f939b68baef090354d6ef6489c35595e853a1333969d1f016fcf5b1f429b` |
| 02-wantsPlay.png | `(9, 8, 118, 120)` | `837c183893add34c1264b1f2129290747a6a958d178a93afd4c6f29990306ae7` |
| 02-weak.png | `(9, 8, 118, 120)` | `dce8f88a9f9049d3f447dce8234f78fda4445f27c950043b06374ccdb8a2bb83` |


---

# Independent sakura stage03 review

Result: PASS for all 10 final PNGs. No blocking defects.

Inspected each PNG individually at 6× nearest-neighbor enlargement on dark background, and reinspected original 03.png separately. The small leafy branching tree identity is retained: central trunk face, leaf clusters, brown branch network and broad rooted base. There are no secondary faces. No embedded effect marks, added text, missing principal limbs/branches, unintended objects or obvious distortions were observed. Minor leaf-tip, root-tip and shading drift is present across generated images; it is not a blocker at the requested visual-review tolerance. Happy and sleeping have slightly broader/coarser branch/root shapes than the reference but preserve the original tree character.

Normalized only the three absent finals (critical, sleeping, wantsPlay) from existing recorded sources with the unchanged normalize-expression-image.cjs helper. No other repository files changed and no generation performed.

## Individual assessment and SHA-256 snapshot

All files are 128×128 RGBA with alpha values exactly 0 or 255, transparent outer canvas edges, and alpha bounds matching original stage03. Alpha bounds use exclusive right/bottom coordinates.

| File | Verdict / assessment | Bounds | SHA-256 |
|---|---|---|---|
| 03-critical.png | PASS. Nearly shut straight eyes, raised worried brows and strained open mouth. Clearly more depleted than weak. | `(8, 27, 120, 120)` | `3e45462d6cc0c143fcb174e46bbc392be3eee1121eed696b81c4bd9fc7226843` |
| 03-happy.png | PASS. Upward smile-eyes and large joyful open mouth. | `(8, 27, 120, 120)` | `cc9f7fd1021734f402528e9397e1cb58912d0c2da6f5668ffab29e3f9871dbbd` |
| 03-hungry.png | PASS. Large rounded pleading eyes and small round open mouth. | `(8, 27, 120, 120)` | `390d6cd6016d3d3993a02a478905bcddbe3fd9711d62ef96e21a64782bd5ce4b` |
| 03-sick.png | PASS. Droopy partly open eyes, worried brows and a downturned mouth. | `(8, 27, 120, 120)` | `5259ae8efba778d856589ff833d95d0cdd0b34227291521f5b9a5aaea3252aee` |
| 03-sleeping.png | PASS. Soft closed eyes and relaxed small smile. | `(8, 27, 120, 120)` | `dbfabd54b4a97b268d9e9131d112bc0dc11258f55f6240200d9ab6e92b9d840d` |
| 03-strained.png | PASS. Squeezed angular eyes and strongly tense wavy/downturned mouth. | `(8, 27, 120, 120)` | `a89970ce67a88a0945851f490b46f014a5c6319f52fefb27b634cba78615f0c1` |
| 03-sulky.png | PASS. Narrow sideways eyes, lowered brows and tiny pout. | `(8, 27, 120, 120)` | `bdd8f0bdcb18bfb93e20ffad4198ebd915a657615761efba908a202551c7a563` |
| 03-tired.png | PASS. Heavy half-closed eyes and slack flat mouth. | `(8, 27, 120, 120)` | `2c66accf0f051f600d43b0d337e0fe5aa7d828456089272c8779fbe2e0a46be4` |
| 03-wantsPlay.png | PASS. Large bright pleading eyes, lifted brows and joyful asking mouth. | `(8, 27, 120, 120)` | `dc1155c37d3584fbffef9443f5344eea063263785fa3ee22834f948354bf92be` |
| 03-weak.png | PASS. Drooping eyes and a small downturned mouth; less distressed than critical. | `(8, 27, 120, 120)` | `99495082c3df3361a26847cbee77f3b1bec469b7b56d25c2288c4c91ceceda7a` |


---

# Independent sakura stage04 review

Result: PASS for all 10 final PNGs. No blocking defects.

Viewed all 10 final images separately at 6× nearest-neighbor scale and separately reinspected original stage04. All retain the mature pink-blossoming tree, central trunk face, branch layout and root base. No missing principal parts, extra faces, added symbols, text or embedded droplets. No secondary faces exist in the original. Pink buds/petals near branches are original anatomy, not expression effects.

There is modest leafless branch/root-tip and blossom-cluster detail drift among standalone generated sprites, but no obvious identity distortion. The face is small and tired/weak/sick share the intended subdued family; mouth shape and eyebrow intensity distinguish them. Critical reads more distressed than weak, and relaxed smiling sleep remains distinct.

Normalized all 10 previously absent stage04 finals with unchanged normalize-expression-image.cjs from the recorded sources. No other repository content changed. No generation performed.

## Per-file review and SHA-256 snapshot

All files are 128×128 RGBA with binary alpha, fully transparent canvas edges, and original-matching alpha bounds. Bounds use exclusive right/bottom coordinates.

| File | Assessment | Bounds | SHA-256 |
|---|---|---|---|
| 04-critical.png | PASS. Nearly closed eyes, steep worried brows and small strained open mouth. More distressed than weak. | `(8, 19, 120, 120)` | `ba784e0de9cba44b6090952dd46555e1b5bd22bad5b57bd02f26c9bb9364f901` |
| 04-happy.png | PASS. Upturned smiling eyes and open joyful mouth. | `(8, 19, 120, 120)` | `a2ba804b636016da0f95499fb0b973eb09d95ab8a77e89fc28fe6ff9ca0a53de` |
| 04-hungry.png | PASS. Large bright pleading eyes and a small round open mouth. | `(8, 19, 120, 120)` | `1ebe3d87cc336c3aa3b437277d7ad322b9694a9bc296b4f98c70edfa137e6a44` |
| 04-sick.png | PASS. Heavy pained eyes, worried brows and a small downturned mouth. | `(8, 19, 120, 120)` | `191504802bf013176654212dd5e15fcefc060630cf351c91e8514a24e0f6d49b` |
| 04-sleeping.png | PASS. Relaxed closed eyes and small contented smile. | `(8, 19, 120, 120)` | `9c1d9b6b3c3931f06851529cc102dd25c033c10279a696ef577429911c25bc02` |
| 04-strained.png | PASS. Strongly squeezed eyes and tense pinched/wavy mouth. | `(8, 19, 120, 120)` | `f9f4a38019076f4a11975daced406a6dc4a1dc2dadcefe746dab5b08604a18e2` |
| 04-sulky.png | PASS. Sideways narrowed eyes and little flat pout; reads annoyed. | `(8, 19, 120, 120)` | `b723089b67e7bb56f66c21d30def066ad34355fe8ae47f6111e77232c5151ae8` |
| 04-tired.png | PASS. Low heavy lids and short flat slack mouth. | `(8, 19, 120, 120)` | `a6138a4fded5410454de18a9c3ecc6fad3dc0e5caae906d2739594351146a13c` |
| 04-wantsPlay.png | PASS. Large highlighted eager eyes, lifted brows and small inviting smile. | `(8, 19, 120, 120)` | `6306a738c2b546986daed5640b7586fe651053442d723bf5dad7134944c6152c` |
| 04-weak.png | PASS. Drooping eyes and tiny frown; subdued, less strained than critical. | `(8, 19, 120, 120)` | `0a81e9ffb2e82e5f1283100676d6ed75c972c72eb4f4460ea932abea1d13af3d` |


---

# Independent sakura stage05 review

Result: PASS at the specified visual-preservation tolerance for all 10 finals. No blockers.

Viewed original stage05 separately and each of the 10 final PNGs individually at 6× nearest-neighbor enlargement. All preserve the five closed pink buds, green calyxes, branching green stems and bottom leaves. All ten apply the requested emotion to the center upright bud. No extra faces, open blossoms, objects, text, tears/sweat or other embedded expression marks were observed.

## Secondary-face check

For each image, checked all four peripheral buds: upper-left remains an open-eyed smiling face; upper-right remains an open-eyed smiling face; lower-left retains squeezed/closed joyful eyes and open smile; lower-right retains an asymmetric wink/open-eye face with little open mouth. Their expressions are not converted to the requested center emotion. Pixel shapes, mouth sizes, highlight locations and tilt vary modestly from the original, so this is perceptual preservation, not pixel identity. Sleeping has particularly coarse lower-right eye rendering but still reads as the same asymmetric wink/open-eye expression; it does not copy the center sleeping face. No secondary-face change rises to an obvious expression-change blocker.

Main-face wantsPlay uses a tiny asking mouth instead of a broad smile; the large bright eyes and brow still distinguish eagerness from hungry. Tired and weak are distinguished by flat versus downturned mouth. Critical adds distressed brows and open mouth, remaining stronger than weak.

Normalized all ten absent finals from existing records using unchanged normalize-expression-image.cjs. No other repository content was edited; no generation or git/Site changes.

## Individual findings and SHA-256 snapshot

Every final is 128×128 RGBA, has only alpha 0/255, transparent canvas edges and original-matching alpha bounds. Bounds use exclusive right/bottom convention.

| File | Assessment | Four secondary expressions | Bounds | SHA-256 |
|---|---|---|---|---|
| 05-critical.png | PASS. Center bud has almost-shut eyes, worried brows and tiny distressed open mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `336dc1c74074cbedcdb7a96b0dff0a9365d7d94a1123b08de7e783ad5f4301fd` |
| 05-happy.png | PASS. Center bud has upturned smile-eyes and a cheerful open mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `7a0becd9612aa0dc44f85bca44f06eacf8d7f3ce4fb7093f5119ebdb37ca9f31` |
| 05-hungry.png | PASS. Center bud has pleading drooped/open eyes and a small vertical open mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `4486d366004c827d42510527c1ea6de9af79a8537dc8d7c8d86ffa2cf2c8abbe` |
| 05-sick.png | PASS. Center bud has pained lowered eyes, worried brows and a downturned mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `5e34ffef047abfc44beb92895a9d8a3dede8891b1bd9d3269bfb00d7684555ee` |
| 05-sleeping.png | PASS. Center bud has gently closed eyes and a tiny relaxed mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `4d72be3e3e15702f4ed8ad72e61a9db9ac37e575c30c7cbee5596e8b0bb39bfa` |
| 05-strained.png | PASS. Center bud has tightly squeezed angular eyes and a tense mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `df6328542be053e2ccbaa09f9cbe5c5e2dfc5ad3766c688819bf1feb62d40b9c` |
| 05-sulky.png | PASS. Center bud has asymmetric narrowed side-looking eyes and a pout. | Preserved perceptually | `(8, 29, 120, 120)` | `06775c0c223d68896e0750ec3b03d4bf51e125c14046f1f8e53b67818cc8cd20` |
| 05-tired.png | PASS. Center bud has low heavy eyelids and short flat mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `aba3dd6e4ebc715521a889cc00ec990fd87a0291ce6743e87221cbd94e0f16ee` |
| 05-wantsPlay.png | PASS. Center bud has large highlighted eager eyes, lifted asking brow and tiny asking mouth. | Preserved perceptually | `(8, 29, 120, 120)` | `c54b4c5644eb413f9d2b2f5ecb1f276503fa95705d0730b78b3505656fd6460e` |
| 05-weak.png | PASS. Center bud has drooping eyelids and a tiny frown, less distressed than critical. | Preserved perceptually | `(8, 29, 120, 120)` | `de90a70bb657e5cfb3e2f32495208b82833216f1b4a8e8aea8c5dec462960a72` |


---

# Independent sakura stage06 review

Final result after repair re-review: 10 PASS. Original review below documents the rejected pre-repair 06-sick.png; see repair acceptance and current hash at the end.

Individually viewed all ten final PNGs at 6× nearest-neighbor scale and original stage06 separately. Also inspected separate 30× right-secondary-face crops for original and all ten, plus detailed lower-right bud crops for the initial eight. All retain the two large pink flowers, yellow face disks, small closed buds, leaves and green stem structure. Main expressions consistently target the left large flower.

## Required repair

06-sick.png: right large secondary flower changes from two compact filled open eyes to two clear upside-down-U closed smiling eyes. This is an unintended expression change, not merely a one-pixel outline variation. Repair only that secondary eye pair, approximately x88–99 and y72–75 in the final 128px image, using the original reference to restore compact vertically filled open eyes. Keep the right flower’s open smile, cheeks, petals and stamens, and the intended left sick expression. Reinspect the normalized result.

## Secondary-face comparison

The other nine right-flower faces retain filled open-eye clusters. Happy initially looks curved at ordinary preview size, but detailed crops show vertical filled eye shapes. Strained/weak have cross-like stepped dark clusters; critical has explicit highlights; those are raster/style drift rather than a categorical closed-eye expression. Sulky is borderline on the viewer-left eye hook, but only sick unambiguously changes both eyes to closed smile arches. No additional secondary repair is required at the stated obvious-change threshold.

All ten lower-right buds retain the original joyful/open-mouth expression. Mouth width, tongue size, and eye-to-mouth pixel connection drift, especially tired, but no bud becomes sick, sleeping, strained or otherwise adopts the selected left emotion. No missing buds/major petals, new faces, external effect marks or text were found. The left sulky eyebrows are cross-like and could be softened in an optional polish pass, but this is not a blocker.

Normalized only absent stage06 finals using the unchanged helper and existing record sources. No generation or other repository edits.

## Per-file findings and SHA-256 snapshot

All files are 128×128 RGBA with alpha values exactly 0/255, transparent outer edges, and original-matching alpha bounds. Bounds use exclusive right/bottom coordinates. The sick hash below records the rejected pre-repair version.

| File | Finding | Bounds | SHA-256 |
|---|---|---|---|
| 06-critical.png | PASS: distressed left face; right flower retains two filled open eyes. | `(8, 44, 120, 120)` | `223e0343e8baacecc0abe20473498b422f5d7579b7dd4a177be2f6fdc171f330` |
| 06-happy.png | PASS: smiling left face; right secondary eyes are still filled vertical clusters, not closed arches. | `(8, 44, 120, 120)` | `18a3629a00ef7740be8aad09ca4afa23ce1092c283cc280abe07ca490f13d0a6` |
| 06-hungry.png | PASS: pleading left face and small open mouth; right open-eye geometry has minor raster drift. | `(8, 44, 120, 120)` | `ff8c3424e10d4c08c8aded87c829ed999fe1b740d579328246774433fbdffc80` |
| 06-sick.png | REPAIR REQUIRED: left sick face is appropriate, but BOTH eyes of right large flower are now upward closed smiling arches instead of the original compact filled open eyes. | `(8, 44, 120, 120)` | `a7ee687a08ce4913164f54d433fbea701ffbe52ad4ee1c904c8ba3bb5a20c9e7` |
| 06-sleeping.png | PASS: left eyes gently closed; right flower keeps open eyes and smile. | `(8, 44, 120, 120)` | `e19d3ada1f59ec6a5bd07ec7d303df8131abcabde97e560cc7d8f283cb279d48` |
| 06-strained.png | PASS: left eyes squeezed and mouth tense; right eyes are compact cross/stepped filled clusters, not closed arcs. | `(8, 44, 120, 120)` | `9a7bba3087be929973364767bd2954d4e9cf34bce67b4ad1c95796376be23874` |
| 06-sulky.png | PASS with minor caveat: left half-lidded eyes and pout read sulky; upper brow shapes are unusually cross-like. Right left-eye silhouette is more hooked than original, but does not show the obvious pair of closed smile arches seen in sick. | `(8, 44, 120, 120)` | `4de5ede699ff1592ba15e28b782dccd9deb8c21b5b1241792aaebf489a6b9c84` |
| 06-tired.png | PASS: left heavy lids and flat mouth; right open eyes retained. | `(8, 44, 120, 120)` | `867004dac36b6a46ac67325245b50a738cf1e1b1fd6c558f68b78cfd13cde72b` |
| 06-wantsPlay.png | PASS: left large highlighted pleading eyes; right eyes are compact filled clusters, with modest shape drift. | `(8, 44, 120, 120)` | `27f9b4bb60f9b72ee0766440b49016bfec95c80d5422e53bc737624a5db1f48d` |
| 06-weak.png | PASS: subdued left eyes and small frown; right eyes have cross/stepped filled clusters, acceptable at the requested tolerance. | `(8, 44, 120, 120)` | `5f464e3332a963bf609eb9438cace59e33f5f505270271025512398883eaf394` |

## Repair acceptance — 06-sick

Re-normalized only 06-sick from updated recorded source `exec-2ec6fadc-80a4-4f98-ab8b-d50c9341028f.png`. Independently viewed final whole image at 6× and right-face crop at 30×. PASS: both right secondary eyes are now compact vertically filled open-eye clusters, no longer closed smiling arches. Right open smile and lower-right bud joyful expression remain. Intended left sick face retains droopy eyes, worried brows and downturned mouth. Principal flower/bud/leaf/stem anatomy remains intact. Geometry/alpha checks pass again.

Current accepted 06-sick SHA-256: `b231eb826d290eed8352dc074a0932c0a802a140d9ce797a52710c96a0d0d79f`.


---

# Independent sakura stage07 review

Result: PASS for all 10 final PNGs. No blocking defects.

Individually inspected all10 final PNGs at 6× nearest-neighbor scale and reinspected original07 separately. Every final retains three red cherries, their joined stems, one large green leaf and the three detached pink petals. All requested emotion changes apply to the center-lower cherry. No major missing parts, unintended props, text, embedded effect marks or obvious distortions.

For every file, checked that the left cherry retains its one-open-eye/one-wink expression and smile; the right cherry retains two open eyes and a small surprised open mouth. Both secondary expressions remain consistent across all10. There is minor outline, mouth-size, highlight, leaf-vein and stem-shape drift; this is perceptual preservation rather than pixel identity. None of those differences changes the secondary expression category.

Normalized only absent stage07 finals with unchanged helper and existing records. No generation or other changes.

## Individual findings and SHA-256 snapshot

Every file is 128×128 RGBA, binary alpha (0/255), transparent at canvas edges, and matches original alpha bounds. Bounds use exclusive-right/bottom format.

| File | Main-face assessment | Secondary faces | Bounds | SHA-256 |
|---|---|---|---|---|
| 07-critical.png | PASS. Nearly shut horizontal eyes, distressed brows and small strained open mouth. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `f85564d2c85fab044ac8bcd4879d901f76608a84534e345176542ee22376cde7` |
| 07-happy.png | PASS. Clear upturned smile-eyes and joyful open mouth. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `2e6e6bcdd5437f2f0ecba4fd2c31d442b5b63f527236d6702fc5dfd53b277dea` |
| 07-hungry.png | PASS. Large pleading eyes and small round open mouth. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `db15f3076303510a0d16fd8c2a797320b574395bf6c0ed3443f11a151940f9a4` |
| 07-sick.png | PASS. Droopy pained eyes, raised worried brows and downturned mouth. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `c97110225c9ca7e2d64764b4fb5cede1ef760ac886f6b2285ef2e4cab2603fa5` |
| 07-sleeping.png | PASS. Relaxed closed eyes and small content smile. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `298ab4aa11261d7ffc96476ad21dd47498c538e3297e0d2943bec079af47a7ab` |
| 07-strained.png | PASS. Tightly squeezed eyes and tense wavy mouth. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `0b9664fbd0fe8ea6fe674a2b045e25b57a685a18f26e0353cc8d3ddcd266097d` |
| 07-sulky.png | PASS. Annoyed asymmetric brows, half-lidded eyes and pout. White lower-eye areas remain inside eyes, not tears. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `a66fa01e5336f927a2470e7127350949db7b283a0ed0bd289d02946e5eea0d3e` |
| 07-tired.png | PASS. Heavy lids and flat slack mouth; white eye areas remain contained, not droplets. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `865c0baf783e67ff943187dba0156be5fe133f6fe34cb16eab2e4d41c6a5af5a` |
| 07-wantsPlay.png | PASS. Large highlighted eager eyes, raised brows and inviting small smile. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `e6f21eebaf9526465b91541bc396860ba80aeb53bfd74bf4c2e21b3c6af67cd0` |
| 07-weak.png | PASS. Low drooping eyes and small frown; clearly less distressed than critical. | Left wink/right surprise preserved | `(8, 13, 120, 115)` | `41c2bf28a9bce477febe49ec717ed711fa26639f51f3e4779367a1da0a8d2025` |


---

# Independent sakura stage08 review

Result: PASS for all10 final PNGs. No blockers.

Viewed each final PNG individually at 6× nearest-neighbor enlargement, plus original08 separately. Elder-tree identity is preserved: broad bare branching crown, brown trunk with pale central face patch, rooted base, sparse orange tip details and detached orange falling leaves. No unintended new faces, missing major limbs, text, embedded expression symbols or obvious anatomical distortions. This stage has no secondary faces.

Minor thin-twig, root-tip, leaf-shape and shading drift is present across independent generated sprites. Original already includes orange fragments near branches and floating leaves; retained orange marks are anatomy/scenery from the original, not expression accents. All main expressions remain identifiable, including weak versus critical and sleeping versus tired.

Normalized only absent stage08 finals using unchanged helper and recorded sources. No generation or other repository edits.

## Per-file review and SHA-256 snapshot

All10 files are 128×128 RGBA, have only alpha0/255, transparent canvas edges, and original-matching alpha bounds. Bounds use exclusive right/bottom coordinates.

| File | Assessment | Bounds | SHA-256 |
|---|---|---|---|
| 08-critical.png | PASS. Almost-shut flat eyes, strongly worried brows and strained open mouth; more depleted than weak. | `(8, 29, 120, 120)` | `d50ecd53f7624f322784c77266c41651cfd9833fe517238c140b9f103dd2d568` |
| 08-happy.png | PASS. Upturned joyful eye arches and broad open smile. | `(8, 29, 120, 120)` | `0999e2aeb512bfb3f02b6caedb8e647c6b922b1805ff5f2fc26d04735cd67a47` |
| 08-hungry.png | PASS. Bright pleading open eyes and small open mouth. | `(8, 29, 120, 120)` | `93b753b9a3ccf321400f88098e33f529703067b3a976b8079540f201191e8632` |
| 08-sick.png | PASS. Heavy pained eyes, worried eyebrows and downturned mouth. | `(8, 29, 120, 120)` | `ece8ce5fb30c87f2a057d7427985c6ce9d9cacdd35e4702338fc75798733bdfa` |
| 08-sleeping.png | PASS. Softly closed eyes and tiny calm smile. | `(8, 29, 120, 120)` | `ff0de08730c8035bd1e1d4f1c159e785e243c626d2a21f23af389b30eb4f5ae5` |
| 08-strained.png | PASS. Squeezed angled eyes and small tense wavy mouth. | `(8, 29, 120, 120)` | `51ecde7db46e8ea80b509a87ddac9b58f5c35a588716c85744eec9c3b31970cf` |
| 08-sulky.png | PASS. Asymmetric narrowed eye/brow pose and tiny pout. | `(8, 29, 120, 120)` | `90b2753cc1185fce1e9c3a9b2e04c6fcb7575678bbca61d5b435d3bfcc144741` |
| 08-tired.png | PASS. Heavy half-lidded eyes and flat mouth; visibly awake but exhausted. | `(8, 29, 120, 120)` | `a37fd03b11091cafb7b3a3f0bc0c76a33205c6d0c3752033544a3a212b546adb` |
| 08-wantsPlay.png | PASS. Large eager highlighted eyes, raised asking brows and cheerful small mouth. | `(8, 29, 120, 120)` | `d1d43a99a0a947284b24d1cf029c1fea5d4fd011ce4d684cdaf4453aa2a03ecb` |
| 08-weak.png | PASS. Drooping eyes and small frown; quieter than critical. | `(8, 29, 120, 120)` | `f5d818e1fd7c375084c0472440262da30432d8ae0c4293522cc53fb291d647e6` |


---

# Independent sakura composite review

Result: PASS for all 80 static expression/effect composites. No blocking overlap, clipping, label or wrong-effect issue found.

Inspected sakura01.png through sakura08.png separately (10 cards each), then both grouped overviews sakura-1-4.png and sakura-5-8.png. This follows individual enlarged review of all 80 PNGs and explicit acceptance of the stage06 sick repair. This review concerns static composites, not device interactions or runtime animation.

## Checks and observations

- Japanese titles and all ten labels render as readable Japanese glyphs; no tofu boxes. The eight stage titles match the canonical names reviewed earlier.
- All 80 face/effect pairings match their labels: gold sparkles for happy; gray zigzag for strained; gold food-thought fish for hungry; green stacked illness mark with two green side drops for sick; purple bubbles for tired; cyan cloud for sulky; smaller pink downward arrows for weak; larger red arrows for critical; orange rays for wantsPlay; blue Z symbols for sleeping.
- No visible effect crosses a face, silhouette, detached original petal/leaf, adjacent card, or text. No obvious clipping. Side drops visibly clear the sprites in all eight sickness cards.
- Stage01 seed and stage02 seedling faces remain readable. Stages03,04,08 trunk faces remain the facial targets while marks sit outside their broad crowns.
- Stage05 keeps the center upright bud expression and all four peripheral faces. Stage06 keeps the intended left-flower expression and right-flower/lower-bud faces, including repaired right open eyes in the sick card. Stage07 keeps the center-lower cherry expression, left wink and right surprise.
- Context caveat, nonblocking: in stages05 and07, upper-right effects can visually sit closer to the upper/right secondary bud or the shared leaf than to the selected central face. Stage06 effects often sit over the cluster or central upper bud. This follows clearance around the whole multi-face sprite. The intended main-face expressions remain clear; the effects read as status of the complete character cluster. It should not be described as precise adjacent-to-main-face placement for every multi-face card.
- The charts explicitly label themselves as static placement composites and note that illness sweat is approximated. No runtime clicking, animation timing or animated-drop trajectory was visually tested here. Parent-provided automated results (1600 mark frames / 960 sweat frames with no issues, and preservation of 152 prior placements) are separate evidence; this report does not claim to have independently rerun those checks.

## Stage coverage

| Stage | Cards inspected | Result |
|---|---:|---|
| 01 芽ぶきのたね | 10 | PASS |
| 02 ふたばのサクラ | 10 | PASS |
| 03 小さなサクラ | 10 | PASS |
| 04 育ったサクラ | 10 | PASS |
| 05 サクラのつぼみ | 10 | PASS; group-level mark association caveat |
| 06 サクラの花 | 10 | PASS; repaired sick secondary eyes present |
| 07 サクラの実 | 10 | PASS; group-level mark association caveat |
| 08 年を重ねたサクラ | 10 | PASS |

## Reviewed gallery SHA-256 snapshot

| File | SHA-256 |
|---|---|
| sakura-1-4.png | `1f47a7bc24eb3cdd7c3c0fb145f96f48c48fb6b64fe753ffb149c8350b7ce9b8` |
| sakura-5-8.png | `20b06ec9720bcb0c3b653308d01b8d2cfd7ea750bea50c300b7abe47b80dd887` |
| sakura01.png | `76162126fdd311da0e1b6ebb3384921a773518defc5c6cd54777a7e1e0e70b37` |
| sakura02.png | `707c2e2aa8b16aef9d5a23823c61ea9345ccc80e49ba3bfa4573fdf0a5e542ee` |
| sakura03.png | `17f0eeb6466d9a8728111c4763bc92d42f00c1d51238d3cee65ff8ed40173fd7` |
| sakura04.png | `a33cf0c1e08552533ab8140dc70a51b52f25b5124ccc6d359331482edeab4f5a` |
| sakura05.png | `c59ccf434b00804d421ffc2bf24926accd9b9c084694e10e9dfc5a5f00ee2ecf` |
| sakura06.png | `c6583ae7de62396713c0bceedbb5c8e4306b17b4e1b95f3f7329cc1cbb194ceb` |
| sakura07.png | `7699c305e8eebd16725fcfb04d020c97e77d262803d3579afbae54c084ac2f4d` |
| sakura08.png | `86aef8564243a64cf704561e2db6a40c1b0d5a29652a87f185dc68ec7f94562a` |


---

# Independent sakura code and specification review

Review date: 2026-09-19. Target: working tree of `sakura-code`, compared with `de5b7cb9bf9605b78559fc1992c13b3dae0d15c6`; also inspected prepared `emotion-site` diff and verification helper. Checkout, index and HEAD were not modified by this reviewer.

**Spec: PASS. Code quality: PASS.** No critical or important implementation finding. This is readiness review for saving the existing Draft PR and publishing the existing owner-private confirmation Site, with the final full test gate now passed. It is not merge approval; PR #278 must remain Draft/open/unmerged.

## Evidence and scope

- Read the canonical design specification, sakura continuation plan, QA notes, manifest and independent original/single-image/composite review records. Inspected every production source/test/tool diff. Production behavior changes are limited to eight sakura placement entries and adding sakura to the established asset allowlist. Resolver, reactions, SVG construction, fallback, game state, save and romance logic are unchanged.
- Inspected and reran `check-sakura-preservation.cjs`: all 1520 prior PNGs, routes and accent SVG outputs, 152 placements, 297 normal PNGs (248 stages), 24 other runtime JS files and expression CSS are preserved. Separately proved the helper's baseline JS file equals `git show` at the specified baseline, avoiding reliance on an unverified scratch baseline.
- Inspected and reran `check-sakura-art.cjs`: 80 complete records, 80 unique generated source paths, all 240 recorded original/source/final SHA-256 values verified, 128×128 alpha images with original bounds. Separately checked the exact eight-by-ten record grid and exactly 80 final files. Recorded 06-sick repair and independent re-review are present. Visual acceptance relies on the supplied independent per-image/composite reviews; I did not repeat all 160 visual inspections.
- Prior 152 placements remain structurally equal, including the 81 earlier corrections. Placement algorithm and existing exceptions are untouched. Read the completed placement output: 1600 marks, 960 sweat envelopes, issues `[]`; did not independently rerun this expensive check.
- Test edits correctly move unsupported-species assertions from newly supported sakura to unsupported venus_flytrap. Existing generalized asset, routing, preview-isolation and real-runtime/state-immutability cases now include all eight sakura stages. The added canonical Japanese-label test checks source names and stage selection. No assertions were weakened.
- Inspected and reran `check-sakura-site.cjs`: exactly 20 species, 1600 records, 80 current-batch records, eight correctly dimensioned sheets, production-matching sakura PNGs, 1520 preserved prior PNGs, initial sakura selection, existing selection/copy UI hooks and consistent `sa-957a8d12` image/script identity. This validates prepared files, not remote deployment or authenticated browser interaction.
- Independently proved production `index.html` is baseline with only the expression cache token changed to `20260919-acdb6cb9`; the hash matches final JS. Other 36 identifiers remain untouched. `git diff --check` passes.

## Findings

Critical: none.

Important: none in the reviewed implementation.

Minor / finalization note: the original plan and QA record described final verification/publication/GitHub saving as pending. The parent is appending the verified final test result. Append actual delivery results before presenting remote saving/publication as complete. The baseline 1405-pass result is distinct from the final 1439-pass result.

## Remaining gates and limitations

The final full `npm test` completed on its first run. I independently read the ending of `sakura-npm-test.log`: tests 1439, pass 1439, fail 0, cancelled 0, skipped 0, todo 0, duration 295845.118284 ms. The parent reports process exit 0 and confirms no code/art changes after the test began. The full-suite gate is cleared; this reviewer did not launch a duplicate suite.

Device/iPhone visual acceptance, live touch/copy interaction, remote Site access scope/version and GitHub write result were not verified here. Save/publish only to the same requested Draft branch and owner-private Site, then verify those remote outcomes separately. Existing main conflict is not resolved by this batch and does not authorize merging.

The accepted visual caveats remain: generated non-face pixels can drift; small tired/weak faces may be similar; in multi-face stages 05–07 collision-free marks can read at whole-cluster level. Existing QA accurately distinguishes static production-data composites and approximate sweat from device screenshots/animation verification.
