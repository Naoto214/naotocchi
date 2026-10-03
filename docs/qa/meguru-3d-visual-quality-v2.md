# World Visual Quality v2 — evidence restored

Product commit: `dea2f17668958ee37dcd6e557e9b2243f34710dd`. Branch `feat/meguru-3d-geometry-terrain-v1`, PR #374 remains open / Draft, base `feat/meguru-3d-art-direction-v1`. No main import, Ready, merge or production Pages change. This is a documentation/QA checkpoint, not World completion or Human QA approval.

[GitHub comparison: 31 World triples + 20 family/prop pairs](meguru-3d-visual-quality-v2/compare.md) · [HTML](meguru-3d-visual-quality-v2/compare.html) · [Machine ledger](meguru-3d-visual-quality-v2/verification.json) · [Continuation](meguru-3d-visual-quality-v2/continuation.md)

## Implemented source retained

- Forest lower/varied crowns and jungle upper/lower layers reuse existing crown counts and placements; shrub heights distinguish regions.
- Cottage/single/cabin walls broaden inside existing lots; main roof heights retain player clearance. Whole-house vertical compression was withdrawn after review. Side/rear window rhythm, city side windows, shallow gable porches.
- Wood bridge underslung beams thicker, fewer/thicker rail posts; deck/span/crossing semantics unchanged.
- Bicycle frame/fork; car/tractor cabin/roof; waterwheel spokes/paddles; Ferris A-frame/spokes; decorative shop canopy/windows; statue nut height/color. White material aliases reuse existing geometry/materials.
- Small deterministic contour variation on dry outer stream banks only. Water/bed/level/ditch/crossings retained.

## Provenance repair

The previous workspace survived and was copied intact before edits. Its old verification.json identified b5f302e (2860 + 80, visibility pending); old browser records/images could not reliably be attributed to the reviewed source. They were not relabeled or blindly committed.

All 31 current World images and both sides of all 20 gallery pairs were recaptured. Current output lives in `recovered-dea2f17/`; before gallery uses 17c1bdb. Car uses camera distance 112 on both sides. Historic Claude and lighting images remain the original checked-in references. All 147 HTML image references resolve. Shot position/yaw/environment definitions are shared; animation instants differ. Gallery is an isolated production-renderer fixture, not gameplay/performance evidence. Some headless speech glyphs are missing; World geometry remains inspectable.

Only original raw historical logs are preserved under `history/` (lossless gzip). No raw log was reconstructed from conversation totals. The corrected full log's product hashes match all three current files.

## Verification

- Preserved corrected full package pipeline: **2861 + 80 PASS / 0 FAIL, PIPELINE_EXIT 0**. Only Node test concurrency was set to 4; this is **not an unmodified npm test invocation**. Revalidated existing completed log; not rerun this session.
- Newly captured World: **31/31 3D active, errors 0**. Gallery: **20/20 pairs**, all active, both exits 0.
- Newly rerun smoke: **13/13 regions**, party 27, errors/console errors/fallback 0.
- Smoke `pen` is **x/z circular-obstacle overlap**, player max 0, party max 0.002591405357044607; it does not measure terrain-height penetration. This new run records a jungle party overlap about0.00259, above the previous handoff's floating-point-only value. The console rounds to one decimal and prints0.0; the raw JSON is authoritative. Cause not established; no party/collision change made.
- Newly rerun corridor: **8 directions / 4 return pairs**, all arrived, 3D active, player visible, errors/fallback0; inspect raw per-direction result and samples in `recovered-dea2f17/corridor/corridor-qa.json`.
- sea→city corridor max visible fade copies=41; this is not proof of real-device afterimage absence. Historical baseline reverse-run evidence also recorded41.
- Newly rerun visibility: **2832 samples**, fully hidden **0**, partial **1**, errors **0**. step=1000, yaw=0/1.2/−1.2/3.14; not default step220. Four companions; ray test, not screen or iPhone visibility proof.
- Recomputed protection: 13 regions preserve 2D world / canonical props-paths-spots-terrain / IDs-placement-collision / object counts against 17c1bdb.
- Recomputed terrain audit: existing **4 floating / 18 buried** residuals; **18 crossings**, all valid=True. Do not call this zero terrain penetration.

## Same-camera budget: 17c1bdb → dea2f17

| View | Triangles | Draw calls |
|---|---:|---:|
| home-vq | 36,998 → 37,106 | 41 → 42 |
| forest-vq | 147,752 → 147,752 | 60 → 60 |
| jungle-vq | 172,854 → 172,794 | 61 → 62 |
| city-vq | 127,740 → 130,188 | 48 → 50 |

Full 31-view table in `recovered-dea2f17/performance-comparison.json`. Baseline values are preserved v1 capture data; latest values are from newly captured raw shots.log (named shots-retry.log). City triangles increase about 1.92%; not a performance improvement. No new THREE geometry/material registry, transparency pass, per-frame allocation or instance update method; some buckets/calls increase.

## Historical failures and limits

V1 at 17c1bdb: 2858 PASS / 1 FAIL, party formation wall-clock 463ms against unchanged <300ms gate. Isolated rerun passed; scheduler/concurrent-load sensitivity remains a hypothesis, not a resolved root cause. Original v1 full-regression.log.gz remains checked in. Intermediate asset failures and interrupted full/browser/visibility attempts are retained as historical logs, not successful completed final runs. Initial new screenshot launch hit local-server EPERM; its raw log is retained beside the successful retry. No product threshold weakened.

No iPhone Human QA approval: ghost/afterimage, player disappearance, stutter, p95/p99/>60ms, final aesthetics remain open. Headless long-frame and ghost counters do not resolve them. External githack links previously returned HTTP403; listed links are not claims of verified reachability. Production Pages unchanged.

## Remaining visual work

Depth/composition, terrain framing, negative space, path/river perspective, house-yard-road connection, stronger home/countryside and forest/jungle separation, river_lake/memory_lake differentiation, water-bank-terrain integration, and still box-like stalls/signs. Preserve quiet desert/snow/deepsea/memory character. Prioritize silhouette/overlap/height/cluster/layering over object accumulation. Decoration placement is not universally frozen; protect 2D/collision/terrain/stream semantics. Use existing season/weather semantics only.
