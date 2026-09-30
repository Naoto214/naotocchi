# Mushroom original and anchor independent review — 2026-09-22

Read-only at local535fab271357e454019f0b5a1b1e56ce92f158c9 / treeba517873c0c208953c42ae28ac9fa42c534b2e35; working tree clean at check. Every mushroom normal01–08 was displayed separately at native128×128, nearest-neighbor6x without grid, and its coordinate-grid6x view:24 actual image displays. Read actual mushroom growth descriptions in script.js and stage names in character-world-master.v1.js. No PNG generation, code/repository edit, marker implementation, collision test or expression production performed. No completed1680 expression re-review.

**Classification approved for prompt preparation.** No unresolved body-identity question. User's definitive01 B and08 A instructions take precedence over purely biological inference.

| Stage | Class and existing faces | Preserve precisely | Prompt edit scope |
|---|---|---|---|
|01|B: six particle bodies, all six protagonists,6 faces|Six cream/peach round particles: top, middle-left, middle-right, large lower-center, lower-left, lower-right. Different sizes, positions, highlights, outlines and pink cheeks. Existing gold sparkles stay decorative and retain their places.|All6 existing faces share each of10 state meanings with natural differences. No lone “main” largest particle. No new particle/face or duplicated state marks.|
|02|Single face, connected mycelial form|Cream round hub and numerous thin connected branching threads with peach/orange edges; keep all thin endpoints and gaps. No faces on branches.|Only hub eyes/mouth/cheek expression.|
|03|Single face on peach cap|Short rounded orange-peach cap with cream face, short cream stalk; brown/gold rocks, right purple rock and green leaf. Keep the cap-face location, not stalk.|Only existing cap face.|
|04|Single face on tall cream cap|Tall pointed cream cap, asymmetry and highlight, slender stalk, small rocks and green leaves. Keep eye perspective and whole pose.|Only existing cap face; natural brow changes allowed.|
|05|Single face on stem|Broad domed bright red cap with cream spots, visible radial pale gills, stout cream face-bearing stem, brown rocky base and greens.|Only stem face. Spots/gill lines are not faces.|
|06|Single face on stem|Wide upturned red/cream-spotted cap, pale gill fan, narrow neck and ruffled ring/collar over face-bearing lower stalk, base rocks/green leaves.|Only lower-stem face. Do not mistake collar shapes for extra face, appendages, or independent mushroom.|
|07|C: main mushroom1 + separate spores3;4 total faces|Leaning red spotted cap with gills; cream rooted main stem, rocky base. Exactly3 face-bearing detached cream spores at upper-right, middle-right and lower-right. Additional smaller golden/cream dots are faceless.|Main mushroom carries state;3 spores retain natural independent reactions, no forced sickness/hunger/fatigue/weakness/critical/sleep synchronization. No mandatory worried faces.|
|08|A: two fruiting bodies of same mycelium,2 faces|Large leaning amber/orange cap with pale gills, aged cream root-like stalk; smaller right orange-capped stalk/body; brown/gold rocky substrate. Preserve age, size disparity, pose and separation above substrate.|Both existing faces carry same physical state/emotion meaning with natural differences. Small mushroom is not separate companion C.|

Source corroboration:02 says threads connected and asks where self ends;07 says mushroom sends out powder to seek new locations;08 refers to continuing conversation underground. These support the instructed connected/independent distinction. Stage06 source mentions a bug under the cap, but the actual normal sprite has no independently drawn bug: do not add one. Likewise faceless decorative specks in01/07 do not become additional expressive organisms.

## Coordinate anchor decisions

Tuples use existing `[x,y,left,right]` format in normal128px coordinates. Positions are visual reference centers/envelopes, not pixel-exact anatomical segmentation. These proposals still require the existing union-of-silhouettes marker/sweat clearance generator and composite inspection once expression art exists. This review does not claim collision-free marks.

| Stage | Recommended tuple | Judgment |
|---|---|---|
|01|[62,64,9,117]|Accept proposed whole constellation anchor. Vertical extent is approximately15–112;64 is its envelope midpoint, not a specific particle's face y. Horizontal reference around62 is close to whole constellation center. Existing sparkle extents are preserved and should count for clearance, but not as extra faces.|
|02|[64,84,43,84]|Accept hub face center; thin branching threads extend far beyond face bounds and must be included in silhouette collision checks.|
|03|[61,57,23,100]|Accept cap face center and cap-width envelope.|
|04|[64,55,32,96]|Accept cream cap face region; tall pointed cap must remain in collision mask.|
|05|[64,90,42,86]|Accept lower stem face center/envelope; large cap above is separate silhouette constraint.|
|06|[64,88,48,79]|Accept lower stem face center; collar above is preserved.|
|07|[55,80,35,75]|Accept main mushroom center only for C. Do not move shared state anchor toward detached spores. Detached spores still count as visible obstacles, not marker recipients.|
|08|[78,85,37,119]|Refine proposed[70,86,37,119] toward true aggregate of both faces: approximate large-face center(53,82), small-face center(104,87), equal-face midpoint(78.5,84.5). Both faces share state; proposed70 is a possible size-weighted center but78 makes aggregate ownership explicit.|

For01, the six approximate face regions/centers from grids are top(53,32), middle-left(22,64), middle-right(97,57), lower-center(61,91), lower-left(22,102), lower-right(105,101). Their equal-face y centroid is lower than64; **the chosen64 is intentionally the full constellation-envelope center**, suitable for a group anchor, not a claim of arithmetic face centroid. Avoid labeling it a measured equal-weight face centroid. For08 the two faces share nearly one y band, so an actual aggregate facial midpoint is useful.

Do not install per-face SVG marks or sweat simply because01 has6 or08 has2 faces. Preserve the established one state-mark set and let shared expression PNGs convey collective state. Tiny generated eye/mouth intensity differences are acceptable within the same semantic state. Main07 should be edited without gratuitously copying its mouth/eyes onto all3 spores.

## Normal file hashes

| File | SHA256 |
|---|---|
| assets/characters/mushroom/01.png | `a12b080494b48c483cb10ac9300e53f9d08fc690860920163c7552c7c7a84f16` |
| assets/characters/mushroom/02.png | `4f21304d95f45cd1380b8560f206ddd6a3b82ac01705f0694f901077b7f96bb0` |
| assets/characters/mushroom/03.png | `55022b95a49cfaf8b43ec351019a7fdf733e724fc71e7e9e72b33e35675bcc1e` |
| assets/characters/mushroom/04.png | `74c4e1b86a7898b0c5534dfe997e36defb95c7b277eae8daf350600566ea7c5d` |
| assets/characters/mushroom/05.png | `20ebc6457d975c52c4f4beef38f5da855276d85d1a433e3a9e6be85f5b03e207` |
| assets/characters/mushroom/06.png | `1c165152179115c920c6c839992f295cb5513b980ca3ef1859bfb98f42ab5f06` |
| assets/characters/mushroom/07.png | `e621465e511a0234fcebfddf43c20a1d4b64dfaf7ccd79210ba3e577e52f3d3f` |
| assets/characters/mushroom/08.png | `9a431ab24c02560cf4240d50efea37663fdf8c29df6d50fa7908597fce74a52b` |
