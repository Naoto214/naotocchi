# Home v7 — original background recovery (2026-10-29)

Status: originals identified and verified; v7 implementation pending.

Starting PR #462 HEAD: 3e7955ee055242ba1ba0cc762899b1f140676236 (experiment/home-art-25d-20261028, Draft).
Read-only main: 7a59eff0dbde6700efc0e21a4ccf9ca0785b5dc1.
Protected PR #426 HEAD: 8ba4ef1cb2030979664589d2e36423f58c4dedbd.

## Authoritative originals

| Region | Existing repository path | Git blob SHA | Bytes |
|---|---|---|---|
| star_stop | assets/world/star_stop-v1.webp | f36093795da9cadc10140c90777b5c15f0d9c9d3 | 331246 |
| memory_lake | assets/world/memory_lake-v1.webp | 4bfc480940c3451ec2aab02a091531f1028f423e | 388912 |
| memory_lake winter variant | assets/world/memory_lake_winter-v1.webp | cf894ba206c501e6f1dd117dcfc335d8cc5928e8 | 372132 |

Verified latest main assets/world tree d8f411499b6369f82dcc974701b6ee24d1ebd3ab through GitHub API; matching original blobs also exist in PR462. Visual inspection confirms colorful nebula/floating ruins/stone plaza and quiet lake/large tree/sandy shore. No originals were generated or overwritten.

## Production rendering path

world-scene.js SCENES -> resolveScene(environment) -> assets/world/(definition.asset || seasonalAssets[season] || region)+'-v1.webp' -> createRenderer.update -> #worldBackdrop.style.backgroundImage. star_stop forces night and uses light=1, shade=0. memory_lake chooses the winter variant in winter. Both are static 1024x1536 artwork with separate presentation overlays (particles, foliage, water, weather/light); not dynamic 3D terrain. Original image and complete production rendering are distinct comparisons.

PR426 home-world.mjs/home-scenery.mjs introduce separate 3D scenery. V6 selectRecoveredScene returns no painting for these two regions and delegates to that renderer. The V6 label 'v22 maintained' therefore did not mean the original formal artwork was displayed.

## V7 implementation contract

Reuse existing v6 runtime and navigation, add v7-only manifest/build/gallery and isolated save families. Keep original art immutable and separately labeled. Six candidates: sea A/B, star original/new, lake original/new. Original/new use identical character fixture, viewport and UI; disclose that 2.5D adaptation uses original raster but does not recreate all formal background CSS overlays/crop. Add background-only, 1/6/28 actors and interactive views. No adoption decision. Preserve v6, all other ten regions, PR426, main and production.

## Environment

Initial overlay df available=0; shared memory available about 44 MiB. Do not delete existing material. A small workspace write succeeded despite df available=0; actual filesystem free blocks must be checked before each large operation. New work uses its own checkout, without deleting prior files.
