# World Visual Quality — fresh audit / work log, 2026-10-02

This is an in-progress visual pass, not Human QA approval. No Ready, merge,
production Pages, schema, actor presentation or other lane integration.

## Fresh upstream

| Branch | HEAD | tree |
|---|---|---|
| Geometry / Terrain #374 | 908656170c46f12457235db14692e4618093a087 | abe92f63ea919c788f07a2e29db8f0dde4a51dbb |
| Art Direction #371 | 69a8857bacfa597fa65dcb433536b2f603f26b7d | a9fbd6c942e372e39f55cccb61b5233d0b01ea43 |
| Foundation #369 | cbafd678875997ba754b5abe6bbb006db135731c | 77e3d037b6c14a06aa634f0ffdd71f1b544a5260 |
| main (read only) | cc4dce9eae9c6cd6997606213271d63540413ad8 | 0a3b232d38e75affd9abdd05080d3c5200ab3d59 |

All three PRs open / Draft / mergeable / clean at retrieval. #374 base is #371,
#371 base is #369. 9086561 adds the handoff and reproducible QA tools to 8752315;
it does not alter the rendered checkpoint. main was not imported.

Read: Claude handoff, HQ-1–15, QA tool instructions and current comparison
sheet references. Inspected all 13 `*-ga.jpg` representative images, plus house,
creek, bridges, city streets, oasis, slope and mountain summer/winter closeups.

## Visual diagnosis from the actual images

| Region | Strong existing cue | Remaining weakness / priority |
|---|---|---|
| home | fences, garden clusters, central great tree | long empty road dominates; garden and houses have weak ground contact |
| countryside | open village, windmill, farmhouses | village entry looks suburban; field views must join the representative set |
| forest | cool canopy, mushrooms, creek | repeated vertical trunks; little grounding shadow; insufficient mid-height transition |
| jungle | high canopy, palms, humid distance | large columns dominate foreground; broadleaf understory should read more clearly |
| city | low/high massing, shop awnings | blank side walls and wide flat street; window rhythm disappears at play distance |
| river_lake | continuous river, lush banks | overly regular parallel bank edges; bridge often occluded by near trees |
| memory_lake | pale trees, blue-violet fog | scene is mostly a path; lake/negative-space anchor needs a useful camera |
| mountain | layered cliffs, conifers | repeated cliff stacks with flat green caps; weak slope-foot integration |
| snow | open snow, dark pines | very uniform white depth; contact and soft tonal separation matter more than props |
| sea | palms, shoreline, sand | flat sandy expanse; tree/shore contact weak |
| deepsea | dark blue atmosphere, kelp/coral | midground collapses into darkness; preserve quiet rather than add flowers |
| desert | warm dune relief, cactus, oasis | repeated cliff blocks; oasis banks need less regular silhouette |
| star_stop | violet ground, luminous accents | generic daytime sky dominates; check existing 2D sky before any change |

Common cause: ambient illumination is broad, but world objects cast no ground
contact shading (the existing shadow batch is for actors only). The path uses a
single uniform material. Terrain relief exists; increasing geometry alone does
not address these large uninterrupted color fields.

## Prop audit: source + available closeup evidence

This is an inventory, not a claim that every prop passed visual QA. Dedicated
closeups remain required for the items below.

| Prop | Current construction / risk | Proposed visual work |
|---|---|---|
| bicycle | two standing rings and mostly vertical/horizontal pipes | diamond frame, fork and wheel hub readability |
| car / tractor | two boxes, two axle cylinders | body taper/windows; tractor-specific wheel ratio and hood |
| telescope | three tilted legs and tilted tube | lens rim/eyepiece and leg joint clarity |
| statue | plinth, box torso, round head | shoulder/torso silhouette without character assets |
| stall | box, canopy slab, front panel | open counter and leg hierarchy |
| waterwheel | two rings and post | paddles, hub and bearing/support |
| Ferris wheel | rings, single post, eight gondolas | paired support and structural spokes |
| ruins | broken walls/pillars/rubble | broken skyline and contact shading |
| signs | physical post/board | depth, thickness and orientation at walking distance |

## First bounded implementation: contact depth

Retain placement, collision, terrain, creek/bridge contracts and all actor code.
Bake a single 1024-square scalar contact field from roots, foundations and major
crowns at scene construction. Share it between existing terrain/path/bank
materials through world-space coordinates. No extra geometry, draw calls,
transparent shadow meshes or per-frame matrix updates. Clamp combined darkness
to preserve the bright miniature palette. This is ambient contact, not a new
season/weather state or dynamic sun simulation.

Cost to measure: one RGBA texture (4 MiB, no mipmaps), one sample on receiving
ground/path/bank fragments; scene construction work and shader variants. Triangle
parity alone does not prove GPU time parity. Headless timings are not iPhone
performance evidence.

## Baseline / gates

Claude measurements remain historical: city ~127k, jungle ~173k, forest ~148k;
13-region smoke and visibility, four corridor round trips, 2857 + 80 tests.
They are not labeled as freshly rerun here.

New run: Playwright 1.51.1 / Chromium 134.0.6998.35 / SwiftShader, 390×844,
DPR 2. The default bundled Chromium download returned an invalid ZIP; a fixed
release from the alternate official distribution installed successfully. Local
server/browser and Node test workers need sandbox escalation in this runtime.

Human gates remain open: visual appeal, afterimage, player disappearance,
stutter and iPhone p95/p99/>60ms. The full V1–V9 pass is not yet complete.

## Verification ledger (in progress)

- Contact-only implementation: 70 World tests passed, 0 failed (prototype,
  Foundation, AD, GT, GA and VQ). This precedes the subsequent light rebalance.
- Updated lighting: AD-14 passes in the running full suite; full-suite completion
  remains pending until its final exit status is recorded.
- Cache-token gate: 2 passed. Only the changed World module token is updated;
  unrelated date-only changes from the bump command were removed.
- Same-camera home: before and contact-only after both 41 calls / 36,998 triangles.
  Updated-light home also 41 / 36,998; shader visibly renders, page errors 0.
- Forest contact/light candidate: 60 calls / 147,752 triangles; same as the fresh
  local baseline. These four-companion shots are not the 27-actor smoke scenario.
- One initial baseline city capture timed out clicking the enter button; not a
  visual pass or a runtime success. No iPhone performance conclusion is drawn.
- `shot.cjs` now reuses adjacent same-region/environment contexts, records shader
  console errors and returns nonzero for an exception, fallback or page error.
- Japanese system font was missing in this environment (tofu in early local
  images). Final QA uses the repo's M PLUS WOFF2 converted to a temporary TTF via
  fontTools + Brotli, loaded with a temporary fontconfig file. No product font or
  actor code was changed.
- `prop-inventory.json` enumerates every current object type/kind/part count in
  all 13 regions. This is complete source inventory, not all-props visual approval.

Next visual unit: composition at road edges / mid-height tree silhouettes, then
water edges and actual prop closeups. In particular, dedicated building-family
and prop comparison images are still outstanding; the existing Claude shot list
is not sufficient to declare the user's final deliverable set complete.
