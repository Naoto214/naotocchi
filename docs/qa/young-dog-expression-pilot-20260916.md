# 若いいぬ：dog/05の10表情

Baseline PR HEAD 9210c2150c734fc53ad35eb8c26fb5c64b40e5f6; main 3f4bfda0b8c0d30098ebb68c4313abd370a8576a. Prior npm test 731 pass; Runtime smoke and Home layout CI success. User approved dog04 and requested next stage. PR #278 remains Draft, no main merge.

## Scope and art

Only dog05, ages16–21. Ten individual original-referenced image_gen precise-object-edit portraits. Preserve slim upright stance, four feet, upward-curled tail and tan/cream palette. Normal remains original dog/05.png. Generated non-face pixels are not guaranteed identical to original.
Normalize alpha50%, trim, nearest-neighbor98×108, position(15,12) on128×128 transparent canvas,64-color RGBA. Original bounds preserved. Shared outlined colors and care reactions unchanged; yellow food bowl for hunger. Initial anchors: strained(-12,3), wantsPlay(-29,7), general(-20,1). All previous stage anchors/images retained.

Preview youngDog uses disposable in-memory storage; real buttons trigger happy/strained without automatic clicks. No gameplay/save-schema change. iPhone expression readability and mark proximity await user review.

## Generation directions

Each call references only original dog/05.png: edit face only, retain upright slim standing pose with head at viewer left, cream muzzle/chest, straight front legs, hind legs at right and thin upward-curled tail; no pose change, sitting, extra marks, objects, text, shadow or background. Full body uncropped, crisp outlined pixel art.

critical: Almost closed exhausted eyes, weak expression, small weary closed mouth.

happy: Narrowed smiling eyes and a joyful open grin.

hungry: Expectant hungry wide eyes and a tiny round open mouth.

sick: Eyes squeezed shut in discomfort and tense wavy mouth. No sweat symbol; code supplies it.

sleeping: Relaxed completely closed eyelids with faint CLOSED mouth smile. No open mouth.

strained: Uneasy pleading eyes, raised inner eyebrows, small downturned mouth, uncomfortable refusal.

sulky: Annoyed lowered brows and sideways narrowed eyes, small pout.

tired: Droopy half closed eyelids and a small yawning mouth.

wantsPlay: Bright eager wide eyes, alert eyebrows and a small friendly closed smile.

weak: Fragile worried eyes and a small weak downturned closed mouth.

## Verification

TDD RED: 81 passed / 7 expected failures (new routing, anchors, runtime states, age boundaries, preview, achievement regression, missing assets). Focused GREEN: 171/171 passed. Unsupported-form fixtures moved from newly supported dog05 to dog02, preserving fallback coverage. Independent code review: no actionable findings. Full suite runs after all image assets exist.

Final npm test:737 passed /0 failed /0 skipped, exit0. PNG suite14/14 passed. All ten expressions visually inspected; transparent bounds match original. git diff --check passed. Existing-stage art/anchors and painted-bounds probe correction unchanged. Preview packages the same runtime and ten PNGs. User iPhone approval remains pending.
