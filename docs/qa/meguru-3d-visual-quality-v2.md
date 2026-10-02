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
- Small cottage/single/farmhouse/cabin assemblies compress vertically as a unit
  when their wall proportions are slender. All roof/window/porch joins scale
  together; footprint/collision stay canonical. Porch slabs become shallow gables.
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

No world object count increase; no new production geometry/material/texture type,
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

## Verification ledger (checkpoint; final regression still pending)

- Intermediate complete World contract run: 71 PASS / 0 FAIL.
- After house proportion pass, World + asset contracts: 77 PASS / 0 FAIL.
- After Ferris/decorative-shop changes: AD/GA/assets 31 PASS / 0 FAIL.
- Final statue correction: syntax + diff check, VQ tests 3 PASS; renderer close-up
  verified. Full frozen-source pipeline is running, not yet GREEN.
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
