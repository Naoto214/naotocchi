# World 3D continuation — evidence recovery checkpoint

## Scope and source of truth

- Repository `Naoto214/naotocchi`; branch `feat/meguru-3d-geometry-terrain-v1`; PR #374 open / Draft; base `feat/meguru-3d-art-direction-v1`.
- At resumption read fresh remote HEAD/tree and PR state; use latest remote if advanced. Do not use old scratch as authority.
- Product source restored here is `dea2f17668958ee37dcd6e557e9b2243f34710dd`, tree `c296d5715a504de5c4c1aab3cc70ad6d9c22b255`. This evidence-only descendant does not modify product code.
- Earlier checkpoints: Claude `908656170c46f12457235db14692e4618093a087`; contact/light `17c1bdb6c108d97772b31f8ad37b1e6e764fc6c3`; VQ2 initial `b5f302ece31af57ae585c36b2deac9a6277cec0f`; reviewed VQ2 `dea2f17`.

## Boundaries

World Visual Quality / Art Direction only. Preserve Claude Geometry/Terrain and Astra source. Do not rebuild runtime architecture. No main import or merge, PR Ready, production Pages, save/schema, Resident Expression, Character 3D changes. Protect 2D source, collision, terrain/stream placement and bridge-crossing semantics. Existing season/weather source only; no new 3D season meanings. Decoration positions are not universally frozen.

Proceed autonomously on existing-source visual decisions. Ask only for new game rules, new season meanings, new regional settings, or conflict with 2D source. Prioritize silhouette, overlap, height hierarchy, negative space, cluster/layering over increasing object count.

## What the saved product already changes

Forest lower/varied crown levels; jungle tall canopy plus low side crown and taller shrubs. Existing crowns/placement/landmarks retained. Side/rear residential window rhythm; some city windows redistributed to sides; shallow gable porch roofs. Cottage/single/cabin wall mass broadens within lots. Whole-house vertical compression withdrawn after review; main roof head clearance protected. Farmhouse mass unchanged.

Wood bridge lower beams thicken downward with original upper edge; fewer/thicker rail posts. Deck/span/crossing preserved. Bicycle triangles/fork/saddle/handle; vehicle cabin/roof/front-back hierarchy; waterwheel spokes/paddles; Ferris A-frame/spokes; decorative cafe/shop windows/canopy; statue nut y/color corrected. White-material aliases reuse existing geometry/materials. Dry outer bank has bounded deterministic contour variation; water/bed/level/ditch unchanged.

## Evidence repair completed in this checkpoint

The old workspace survived and was copied intact into `/workspace/scratch/9a73a007e273/world`. Original remains `/workspace/scratch/090ca97d6a99/world` untouched. Do not blindly upload that old directory: it contains b5f302e records, interrupted logs and unproven image provenance. Old verification.json was stale (2860+80, visibility pending).

Fresh `recovered-dea2f17/` contains recaptured 31 World shots, 20 before/after gallery pairs, 13-region smoke, eight corridor directions and full visibility raw results. Refer to `verification.json` for exact observed totals, not a conversational recollection. The report corrects `pen`: x/z circle overlap, not terrain penetration. New smoke has jungle party max0.002591405357044607, player0. Do not copy the previous handoff's ~4.26e-14 claim onto this run; stdout rounds to0.0 but raw JSON does not. Cause not determined, party code unchanged. Static audit preserves float4/bury18 and valid18 crossings. Baseline protection hashes preserve 2D/canonical layout/collision/object counts across all13 regions.

Full previous-session regression log is retained losslessly as `history/full-reviewed.log.gz`; its product SHA256 hashes were checked against dea2f17. Result 2861+80 PASS / fail0 / PIPELINE_EXIT0. Full package pipeline with only Node test concurrency4; never describe as unmodified npm test. No need to rerun this exact unchanged product merely because a new tab starts.

V1 historical full failure remains: 2858 PASS /1 FAIL, wall-clock formation463ms against unchanged <300ms. Isolated rerun passed. Scheduler/load sensitivity remains hypothesis. No threshold weakened. Other interrupted/intermediate raw logs retained under history, not recast as final results.

`compare.md` is GitHub-viewable (31 Claude→lighting→reviewed triples and 20 isolated family/prop pairs); `compare.html` has regional/water/season groups. Car uses distance112 before AND after. Historical images come from existing tracked evidence; current images are new. Animation instants differ. Headless system lacks some speech glyphs; boxes are a QA font limitation. No character code changed.

## Reproduction

Cwd must be the intended repo root (runtime harness uses cwd). Local Playwright1.51.1: `/tmp/q2-browser-runtime/node_modules`. Chromium134: `/tmp/q2-oldbrowsers/chromium-1161/chrome-linux/chrome`. Use `NODE_PATH` and `PLAYWRIGHT_CHROMIUM`. Runs need a permitted local HTTP listener/headless browser. Visibility's runner hardcodes the old binary; a temporary copy changes only executablePath to the env override. Sampling remains step1000 (NOT default220), yaws0/1.2/-1.2/3.14, 13 regions, four companions, ray probe.

World shots: `tools/meguru-3d-qa/shots-visual-quality-v1.json`; gallery: `shots-visual-quality-v2-gallery.json`. Baseline checkout used17c1bdb. Screenshot RAF pause only for image capture; exclude from performance claims. Smoke uses27 companions. Corridor has four pairs in both directions: home↔forest, forest↔mountain, city↔sea, countryside↔forest.

Current compare home triangles36998→37106 calls41→42; forest147752→147752 calls60→60; jungle172854→172794 calls61→62; city127740→130188 calls48→50. City +1.92%, not universal performance improvement. New captures may vary in fade buckets; retain raw exact fixture observations. No iPhone p95/p99/>60ms conclusion.

## Remaining visual work and next candidate

Inspect latest comparison first. The scene-by-scene assessment is in `next-visual-audit.md`. Remaining: foreground/midground/background and terrain framing; negative space and visual anchor; receding path/river composition; house-yard-road connection; stronger home/countryside and forest/jungle distinction; river_lake/memory_lake identity; bank/water/terrain integration; still box-like stalls/signs.

Read-only investigation found `gardenDressing3d` independently estimates the entrance (`D+14`, `-W*.45*.9`) while residential archetypes already emit actual `door:true` parts with family-dependent width/depth/annex offsets. Garden steps/fence opening can therefore drift from the displayed entrance. Candidate bounded next unit: derive garden approach from actual door descriptors, align existing low fence/flower-bed framing with the entrance, and validate against canonical collisions and paths. This is a candidate, not an implemented or visually approved fix. Do not special-case house IDs. Consider still box-like shop props as a separate cohesive unit after viewing closeups.

Goal: lush, floral, bright, colorful, small diorama, gentle volume; preserve desert/snow/deepsea/memory quietness. Maintain Foundation/Art Direction/Geometry/Terrain/Geometry Audit tests, smoke/corridor/visibility. Add meaningful RED→GREEN contracts for changed behavior, never relax thresholds for GREEN. Save cohesive units, not every cosmetic edit.

## Still unapproved

No iPhone Human QA approval: ghost/afterimage, player disappearance, stutter, p95/p99/>60ms, final beauty. Headless GREEN is not a resolution. Do not call World3D or Art Direction complete / production ready. Commit-pinned githack links are listed, but external preview was not confirmed reachable (previous403). No production Pages change.

When work becomes heavy/context risky, save a verified checkpoint and a complete continuation before stopping. At handoff no claim of background execution unless a live process actually remains.

## Stop state for this recovery unit

The recovery unit grew to71 recaptured source images plus contact sheets and all browser audits. Stop only after final evidence tree/commit/branch update and PR body verification. Additional product geometry changes have not been implemented in this unit. Next visual unit is documented in next-visual-audit.md; continue from fresh remote. All recovery processes exited successfully before finalization. No background QA execution remains at this checkpoint.
