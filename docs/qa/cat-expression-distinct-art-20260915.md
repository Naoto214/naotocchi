# Adult-cat distinct expression art — 2026-09-15

User approved dedicated state faces and accents in chat. Generated individually using built-in image_gen (precise-object-edit), with original `assets/characters/cat/06.png` as the reference for every image. No contact-sheet slicing. Original and prior three portraits remain unchanged.

Shared prompt: edit only the face; preserve seated full body, gray fur, ears, tail, paws, proportions and framing; crisp outlined pixel art; genuine transparent background; no text, props, sweat or external accents (runtime supplies them); suitable for128×128 normalization. Generated body pixels are close to the original, not byte-identical.

|State / final file|Specific prompt|SHA-256|
|---|---|---|
|`assets/characters/expressions/cat/06-hungry.png`|Fully open expectant eyes, worried raised brows, tiny open round mouth; alert rather than sleepy.|`85eb48deb349bf9c374ad75900694a1f35afb9e3c6d88748320a60c5f1e8105f`|
|`assets/characters/expressions/cat/06-sick.png`|Pinched eyes, knitted brows, tightly closed wavy mouth, pale blue forehead; no baked-in sweat.|`aab6c564c6aa2f235d2209d3c6edba234815cc9494b45f11f03fb9a2a0abd3ff`|
|`assets/characters/expressions/cat/06-tired.png`|Half-lowered heavy lids with visible pupils, relaxed brows, tiny yawning mouth.|`7748f94642c1c1ddacd5189f3e522e5f095199a77d6dabb6c6ba45a6bec4a36d`|
|`assets/characters/expressions/cat/06-weak.png`|Downward-looking small pupils, drooping brows, downturned mouth and muted rosy cheeks.|`b1f1d0f9bf0ccbb3a54b0982f2999f5750039c7384255afc1fecd5111cc76388`|
|`assets/characters/expressions/cat/06-critical.png`|Eyes barely open, tiny pupils, slack mouth and pale cheeks; alive but very weak, no horror.|`10a4d9a61fd8b898f7a41ab9d7f36681c85656d688cc85584cc0d907f36b0c3d`|
|`assets/characters/expressions/cat/06-wantsPlay.png`|Wide sparkling eyes looking at viewer, lively raised brows, inviting closed cat-mouth smile.|`fb36a5a16d7b6ae74857c6f9b7353b416a11566d788b9919a73f1d652800fa21`|
|`assets/characters/expressions/cat/06-sleeping.png`|Fully closed relaxed curved eyes, content tiny smile and soft cheeks; peaceful, no pupils.|`b67ffaee0b25d2e9da68f0001934589802e836c1e228350fe283884c9a0eab63`|

Normalization: ImageMagick alpha threshold50%, trim transparent margins, nearest-neighbor resize to96×112, centered transparent128×128 canvas, quantize to64 colors including transparency, PNG32. All final images are RGBA128×128, alpha0/255, opaque bounds[16,8,112,120] matching the original. Root inspected original-resolution outputs and normalized sprites. iPhone clarity of this expanded set remains user acceptance pending.

## Joy and sleep differentiation follow-up

User requested both faces be improved: happy eyes open, sleeping face less smiley. Built-in image_gen precise-object-edit used separately on each prior portrait. Shared prompt: change only the face, preserve seated body/gray palette/ears/tail/paws/framing, transparent pixel art, no baked-in marks. Happy: wide open sparkling eyes, raised cheeks, small open smile. Sleeping: fully closed relaxed eyelids, neutral mouth without lifted corners, relaxed cheeks. Same ImageMagick normalization as above. New filenames avoid stale image caches; old assets retained. Generated body pixels are not byte-identical. Both normalized sprites visually inspected; iPhone acceptance pending.

- `assets/characters/expressions/cat/06-happy-v2.png`: SHA-256 `e60898a43446d9f4f1dbff2fa6d49c9c1cdf203e1a8bcdb59eb0210de3b8c675`
- `assets/characters/expressions/cat/06-sleeping-v2.png`: SHA-256 `d6d7d6e412a47007727dded002d4709ae98f0306662a4c8dc4d6a6d59791ef24`
