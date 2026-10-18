# World Visual Quality — first checkpoint handoff, 2026-10-02

## Resume from remote

Repo `Naoto214/naotocchi`, branch `feat/meguru-3d-geometry-terrain-v1`, Draft PR
#374, base `feat/meguru-3d-art-direction-v1`. Fresh-check remote HEAD/tree and PR
before any work. Code checkpoint: `036c1d5be2375055543afdabf13acd5ecd8d2956`,
tree `33c9222093758caaa5f7ec46224c190ae8f62794`. This handoff and the 31 images are
in a following docs/evidence-only commit; use that latest remote as canonical.

Do not merge main, Ready, publish production Pages, change save/schema or 2D
semantics. Resident Expression #368 and Character 3D are separate lanes. Keep
terrain, collision, path, creek crossings, Bridge v4, Building v4, Tree v4,
season/weather and runtime fade architecture. No rebase / force-push.

## What this session actually did

1. Fresh lineage audit: Geometry advanced from 8752315 to Claude's final
   9086561; #374/#371/#369 all Draft/open/clean. main cc4dce9e was read only.
2. Read Claude handoff and HQ-1–15. Viewed 13 region images and key closeups.
3. Inventoried all current props: `docs/qa/meguru-3d-visual-quality-v1/prop-inventory.json`.
4. Added bounded static ambient-contact texture in `meguru-3d.mjs`:
   `contactFootprints` derives roots/foundations/major crowns; one 1024² RGBA
   texture shared by existing ground/path/bank materials; `contactMaterial`
   samples world coordinates, including instanced roads. No new geometry,
   draw calls, transparent shadow meshes or per-frame updates. Added 4MiB GPU
   texture and one texture sample on those surfaces. Accumulation clamped at .64.
5. Rebalanced existing lights: hemi 1.2 / sun 1.55 / ambient .22. Existing
   weather and season multipliers unchanged. AD-14 re-contract rationale dated.
6. Added VQ-1/2 tests (observed missing-function RED then GREEN), wired to npm.
7. QA `shot.cjs`: reuse adjacent same-region/env contexts; capture a completed
   frame by pausing RAF scheduling and then restoring all queued callbacks;
   collect shader console errors; nonzero on exceptions/fallback/errors.
   Paused screenshot intervals are NEVER performance measurements.
8. Produced 31 before/after pairs, inspected all AFTER images. They show a
   modest first improvement, NOT fulfillment of V1–V9 or Human acceptance.

## Verification truth

- Full npm: 2858 PASS / 1 FAIL, exit 1, ~27min. Party-formation test 4 measured
  463ms against <300ms; target source/test byte-identical to Claude baseline.
- Same-code isolated formation: 8 PASS / 0 FAIL. No threshold change.
- Relationship tests omitted by the failed npm && chain: separately 80 PASS / 0 FAIL.
- Contact-only earlier World run: 70 PASS / 0 FAIL. Latest full run also passed
  the World tests including rebalanced AD-14.
- Asset gate: 2 PASS. Only World module hash token changed in index.html.
- 31 images generated. One jungle entry-click timeout; same-code retry passed.
  Forest screenshot readback timeout motivated RAF capture; failed logs retained.
- Home 36998 triangles / 41 calls; forest 147752 / 60; jungle 172854 / 61;
  city 127740 / 48 (4 companions; not historical 27-actor smoke fixture).
- No new 27-actor smoke / corridor / full visibility audit this unit. No iPhone
  proof for ghosts, disappearance, stutter, p95/p99/>60ms. Do not claim GREEN
  for the initial full suite or overall completion.

Evidence: `docs/qa/meguru-3d-visual-quality-2026-10-02.md` and
`docs/qa/meguru-3d-visual-quality-v1/` (compare.html, images, logs and inventory).
Comparison links resolve relative to the commit-pinned URL, so previews and
images remain on the same immutable artifact commit.

## Highest-value remaining work

1. Composition/depth: long uniformly flat path fields dominate home/countryside;
   repeated large vertical trunks dominate forest/jungle. Improve silhouettes,
   mid-height layers and edge grouping without adding object count or touching
   2D placement/collision. Assess main landmark framing at several yaw angles.
2. Terrain/water: less regular bank silhouette, better pond/river distinction,
   cliff-foot transitions; preserve stream cross sections, clearance and gameplay.
3. Tree silhouette variation; cooler temperate forest vs humid broadleaf jungle.
4. Buildings: blank city side walls; roof/entrance hierarchy and distinguishable
   families. Need dedicated family contact sheet, not just existing home-house shot.
5. Bridge/props: dedicated label-free closeups for bicycle, car, tractor,
   telescope, statue, stall, waterwheel, Ferris wheel, ruins and signs. Current
   audit identifies ring-only waterwheel, bike frame, generic vehicles and blank
   sidewalls. This session did NOT redesign them.
6. Stronger home/countryside, forest/jungle, river_lake/memory_lake comparisons.
7. Final all-regions smoke, corridor and ray visibility, performance deltas
   (draw calls, material/texture count, upload traffic and allocation as well as
   triangles), before/after and required family/bridge/water/season sheets.
8. Human QA previews: normal3D, perf3D, 2D comparison. Keep Draft and await human
   judgment for final appearance and actual iPhone performance.

No new game/season/region meaning without clarification. Ordinary improvements
within approved contracts need no further permission. Prioritize a meaningful
visual unit and checkpoint it, not one commit per tiny adjustment.

## Runtime / reproducibility

Local checkout `/workspace/scratch/090ca97d6a99/world`. Local code commit d430b16
has the exact same tree as remote 036c1d5; connector authored the remote commit
because CLI has no GitHub push credential. Do not push the local divergent
metadata; fresh-fetch/checkout the remote in a new isolated checkout for future
work. Local images are preserved in that checkout and remote evidence commit.

QA dependencies: `/tmp/world-browser/node_modules` Playwright 1.51.1;
`/tmp/world-pw/chromium-1161/chrome-linux/chrome` Chromium 134, SwiftShader.
Default CDN returned invalid ZIP; official alternate downloaded successfully.
Set NODE_PATH and PLAYWRIGHT_CHROMIUM to those paths. Server/Chromium and Node
--test workers require sandbox escalation. Product files require none.

Japanese font: converted repo `assets/fonts/mplus-rounded-1c-regular.woff2` to
`/tmp/world-qa-fonts/mplus.ttf` with fontTools and `/tmp/world-qa-python` Brotli;
`FONTCONFIG_FILE=/tmp/world-qa-fonts/fonts.conf`. No system/product font edits.

Capture definition `tools/meguru-3d-qa/shots-visual-quality-v1.json` retains the
Claude positions/yaw/env. Use the existing shot.cjs invocation from its README.
One region retry is allowed with recorded failure; do not erase failed evidence.
