# World Visual Quality v2 — composition and silhouettes, 2026-10-02

Work in progress on #374 (Draft). No main import, Ready, merge, production Pages,
save/schema, Resident Expression or Character 3D changes. Baseline is remote
17c1bdb6c108d97772b31f8ad37b1e6e764fc6c3. Fresh main was read only
(0b0a6b30e8e098472b2fa965604f4901874942e3).

## Visual changes

- Temperate big trees reuse the existing three crown masses at different heights;
  trunk height varies more and the sky opens between crowns. Jungle keeps a higher
  ceiling and a lower side crown; existing shrub masses are taller in jungle and
  flatter in forest. Landmark tree dimensions and object placements are retained.
- Cottage/single/cabin wall masses broaden within the canonical lots. Main roofs
  retain above-head clearance; whole-assembly vertical compression was removed
  after review found reachable low eaves. Porch slabs become shallow gables.
- Houses get three paired side/rear window panels (12 triangles per eligible
  house). Urban towers redistribute existing front window pairs onto a side;
  outward-facing normals are selected for either side. This is useful from alleys.
- Wood bridge underslung beams thicken; fewer, thicker rail posts expose water
  between supports. Crossing location, span, width, deck and abutments unchanged.
- Bicycle: connected triangle frame and fork. Vehicles: offset glazing and roof
  cap, taller tractor cabin. Waterwheel: spokes/paddles instead of an inner ring.
  Ferris wheel: A-frame and spokes instead of the inner ring. Decorative cafe/shop
  props get the canopy/window contract even when they have no collider.
- Isolated renderer inspection found statue heads were being placed on the ground:
  `nut` ignored `pt.y` and `pt.color`. Renderer now honors both (also nest eggs).
- Creek/river dry outer banks get small deterministic contour variation. Water
  width/level, stream placement, bed, crossings and irrigation geometry are intact.
  No new seasonal or regional semantics.

## Budget and protection

No world object count increase; no new production THREE geometry/material/texture allocation,
transparency pass, per-frame allocation or instance-update system. Geometry is
reused, but some prop parts and house panels increase triangles. Do not call this
free or a GPU performance improvement. Exact final browser numbers follow in the
evidence directory; initial latest city representative was about 130k, compared
with 127.7k at v1, well below the old 183k Human QA baseline. Forest is about 147.8k,
jungle 172.8k. Draw calls vary with view/fades; compare identical fixtures.

13-region baseline/new hashes for 2D worlds, world3D props/paths/spots/terrain,
object IDs/positions/collisions and object count are saved as protection evidence.
Parts are the intended variable. Formation implementation and its 300ms threshold
are unchanged. Initial v1 failure (463ms) is not erased by later passes.

## Verification ledger (frozen code b5f302e)

- Intermediate complete World contract run: 71 PASS / 0 FAIL.
- After house proportion pass, World + asset contracts: 77 PASS / 0 FAIL.
- After Ferris/decorative-shop changes: AD/GA/assets 31 PASS / 0 FAIL.
- Final statue correction: syntax + diff check, VQ tests 3 PASS; renderer close-up
  verified. Frozen full pipeline completed: **2860 + 80 PASS, 0 FAIL, exit 0**.
- VQ-3 added with observed RED then GREEN: bank contour changes are bounded,
  water lanes and triangle topology unchanged.
- GA-5 source contract updated with dated rationale: noncolliding decorative shops
  also require canopy/window. Existing colliding-shop requirement is retained.
- Initial full run began before cache-token update and recorded 2 asset failures;
  interrupted log retained. Updated asset gate: 6 PASS. Another early full run
  was interrupted for additional close-up findings, not counted as completed.
- Concurrent browser/full-suite run: home passed, city/countryside timed out;
  stopped current browser process trees. Retain these logs; later results must
  not silently overwrite the failed attempt.
- Isolated formation runs: 8 PASS each (one with background CPU load). This is
  evidence of load sensitivity, not proof of a root cause or final full GREEN.
- Final full package.json pipeline runs every test with Node test concurrency=4;
  no test selection or threshold changes. Product SHA256 values logged at start.

## Review artifacts and limits

31 same-camera world comparisons include all 13 regions, creek/river/pond,
bridges, mountain summer/winter and season views. 20 isolated family/prop pairs
use the actual production renderer and exact part descriptors, translated to a
plain stage, with a baseline-derived fixed camera distance. Actors/animation are
absent only in that QA fixture; it is not gameplay/performance evidence.

Source inventory covers all props in all 13 regions (v1 inventory). Isolated
representatives are not proof that every placement is attractive. Some structures
still read as deliberately simple low-poly props. Home/countryside openness and
river_lake/memory_lake layouts are retained; stronger composition and path framing
remain candidates for subsequent work. This checkpoint is not V1–V9 completion.

No iPhone Human QA yet: ghosts, disappearance, stutter, p95/p99/>60ms and overall
visual acceptance remain open. Headless screenshots are not substitute approval.

## Final browser and budget evidence

- `regions-smoke.json`: all 13 regions active in 3D, 27 companions, no page/console
  errors or 2D fallback; player and party terrain penetration = 0. Exit 0.
- `corridor-out.json` + `corridor-return.json`: four routes in both directions,
  eight successful traversals, 3D throughout, player visible, errors/fallback 0.
  The existing tool only traverses the specified direction; the earlier four-row
  report must not by itself be called four round trips.
- Reverse sea → city can have 41 visible fade copies. The exact same reverse
  fixture on baseline 17c1bdb also reaches 41 (`baseline-city-return.json`). This
  is not a new VQ2 increase, and neither result proves absence of real afterimages.
- 31 frozen World captures: active 3D, errors 0. `compare.html` provides Claude,
  lighting checkpoint and current views, six comparison groups and 20 fixed-camera
  isolated family/prop pairs. HTML rendered with Japanese fonts; all 147 image
  references resolve locally. World animation instants are not pixel-identical.
- `protection-checks.json`: all 13 regions preserve 2D world, canonical props,
  paths/spots/terrain, IDs/placement/collision and object counts. Geometry audit's
  existing residuals (4 floating, 18 buried parts) are unchanged; these are not
  player penetration. All 18 path-water crossings retain valid treatment.

| Same-camera view | Triangles v1 → v2 | Calls v1 → v2 |
|---|---:|---:|
| home | 36,998 → 37,188 | 41 → 42 |
| city | 127,740 → 130,180 (+1.91%) | 48 → 49 |
| forest | 147,752 → 147,752 | 60 → 60 |
| jungle | 172,854 → 172,794 | 61 → 61 |

All 31 pairs are in `performance-comparison.json`. No new material registry,
texture, transparency pass, per-frame allocation or update path. Extra geometry
is existing buckets/instances. Headless timings are not iPhone p95/p99 budgets.

## Formation timing investigation (separate from visual changes)

The previous v1 full failure used `Date.now()` around two 20,000-slot formation
calls, with an unchanged <300ms threshold. That measures elapsed wall-clock time
and includes scheduler delays. Both isolated runs passed (including one with
background work); the frozen complete pipeline also passes at four workers.
A load-sensitive/flaky explanation remains a hypothesis, not a proven root cause.
No formation code, threshold, test skip or pass criterion was changed. The earlier
failure and interrupted attempts remain in the evidence ledger.

## Reproduction

Use the repository root as cwd (the runtime harness loads from cwd). The final
full pipeline uses package.json's entire test command, replacing only
`node --test ` with `node --test --test-concurrency=4 `; all leading smoke scripts
and the final Relationship suite are included. Frozen SHA256 values are at the
start of `full-frozen.log`.

World shots use `shots-visual-quality-v1.json`; isolated shots use
`shots-visual-quality-v2-gallery.json` and `object-gallery.cjs` at each revision.
Playwright 1.51 / Chromium 134, SwiftShader, 390×844 World viewport. Local browser
binary is supplied with PLAYWRIGHT_CHROMIUM; the visibility script's hard-coded
binary path was replaced in a temporary copy only. No QA sampling logic changed.
The exploratory step=220 visibility run was interrupted after home to use a
1000-unit interval comparable to Claude's recorded sample density, keeping all
four yaw offsets and the same hidden/partial ray criteria. Its partial log is
retained; it is not a 13-region result. Final visibility results follow separately.

## Review correction checkpoint — 2026-10-03

The b5f302e implementation was saved before a second review found two defects:
whole-assembly compression lowered oversized eaves into the reachable player
head envelope, and brown base materials multiplied explicit gray/white colors.
The current correction removes the compression, broadens the wall mass within
existing lots and preserves the original roof base heights. VQ-4 fails before
this correction (home:10) and passes afterward across residential families.

Only new bicycle/Ferris tubes opt into `wtrunk`; colored nut parts use `wnut`.
Both aliases reuse existing geometry and the existing white wbox material.
Uncolored nuts, flower centers and all trees retain their old material paths.
This can add instance buckets/draw calls even though no new geometry/material
is allocated. Updated final budget must supersede the intermediate table above.

Read-only re-review found both code-level blockers resolved, no new findings.
Review does not approve merge, subjective visuals or iPhone behavior.
Targeted prototype/geometry/VQ regression: **26 PASS, 0 FAIL, exit 0**; asset
contract: **6 PASS, 0 FAIL**. The corrected full suite, refreshed images and
browser audits are being rerun. All preceding b5f302e full/browser evidence is
intermediate, not evidence for this corrected source. Visibility runs interrupted
for sample-density alignment or this correction remain explicitly incomplete.
