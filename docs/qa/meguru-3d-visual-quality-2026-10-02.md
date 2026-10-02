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

## Contact-depth checkpoint image result

Code saved remotely at `036c1d5be2375055543afdabf13acd5ecd8d2956`, tree
`33c9222093758caaa5f7ec46224c190ae8f62794`. 31 AFTER images generated, 31
BEFORE references verified. The comparison sheet labels this first unit as
incomplete. All 13 representative views were visually inspected after rendering.
Closeup review and broader V1–V9 work remain open.

Fresh representative triangles: home 36,998; forest 147,752; jungle 172,854;
city 127,740. Calls in the four-companion fixture: 41 / 60 / 61 / 48 respectively.
Do not compare these calls directly to the historical 27-actor smoke figures.

The grouped capture exited nonzero for a jungle entry-click timeout; a same-code
jungle-only retry exited 0, 3D active, page/shader errors 0, player visible.
The first forest capture also timed out during screenshot readback. Screenshot
QA now pauses RAF scheduling after a completed frame and restores queued
callbacks afterwards. This is excluded from performance claims and is not a
change to product runtime. Historical failure logs are retained.

Full-suite observation: `meguru-party-formation-test.cjs` test 4 failed its
`Date.now() - t0 < 300` wall-clock assertion under concurrent load (test duration
579ms; assertion's measured value must be read from final failure report).
`meguru.js` and that test are byte-identical to the Claude checkpoint. This is
not yet resolved or waived; isolated verification is pending. No threshold was
changed. Full regression is NOT GREEN.

## Final result for this first bounded checkpoint

- Full `npm test` exited 1: **2858 PASS / 1 FAIL** (2859 tests), 1641.7 seconds.
  Failure: party-formation test 4, measured 463ms against <300ms. The remaining
  Relationship group was not reached by npm's `&&` chain.
- Same-code isolated formation rerun: **8 PASS / 0 FAIL**, exit 0. No threshold,
  formation code or test was changed. This supports load sensitivity; it does not
  erase the failed full invocation or establish an iPhone performance result.
- Separately completed remaining Relationship group: **80 PASS / 0 FAIL**, exit 0.
- All 31 AFTER images inspected (13 representative + 18 closeups/season views).
  Improvements remain modest: better plane separation and grounding. The long
  flat road, repeated large trunks and blank city walls remain major next work.
- iPhone Human QA, fresh 27-actor browser smoke, corridor round trips and full
  ray-walk visibility audit have NOT been rerun in this bounded unit. Existing
  tools/contracts are preserved; rerun them before the overall VQ handoff gate.
- No Ready, merge, production Pages, main import, save/schema, Expression or
  Character 3D changes. Product diff is World renderer + its cache token only.
