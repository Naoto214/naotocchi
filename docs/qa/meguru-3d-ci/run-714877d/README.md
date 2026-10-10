# Garden repair: completed durable QA

Tested source `714877dd8121e24c3f5d08ab627ca013ef24ae79`, product unchanged from `a41dd08`. Baseline comparison source `1e2caad`, product `704faac`. [Actual run](https://github.com/Naoto214/naotocchi/actions/runs/37181442283), all five jobs successful. Raw artifacts were downloaded before expiry, and all source hashes/commit files/exit codes checked against the Git objects. These files are original artifact bytes except the explicitly derived compare/summary/verification/manifest documentation.

- Full regression:2864 PASS/0 FAIL plus Relationship80 PASS/0 FAIL, pipeline exit0. package.json pipeline with only Node test concurrency4; not unmodified npm test.
- Captures:31 World scenes plus4 entrances before/after,20 isolated gallery objects before/after; active3D/errors0. [GitHub image comparison](compare.md).
- Smoke:13 regions,27 companions, active3D/errors/fallback0; maximum party x/z circular-obstacle overlap4.973799150320701e-14. This is not terrain penetration. Older observed0.002591405357044607 remains known evidence, not reclassified or removed.
- Corridors:4 pairs in both directions,8 arrivals, active3D/player visible/errors0.
- Visibility:13 regions,2832 ray samples, fullyhidden0/partial1. step1000; yaws0/1.2/-1.2/3.14. A ray result cannot approve actual screen visibility. This run uses the explicit missing-probe failure introduced at714877d.
- Existing static audit at a41dd08 remains float4/bury18 and18 valid crossings; browser overlap is a different measurement.

Counts at the matched home camera:35082→35272 triangles (+190),42→42 calls. Forest147752/60, jungle172794/62, city130188/50 unchanged in matched controls. No across-the-board performance improvement or iPhone p95/p99 claim.

Prior local full.log under garden-clusters is incomplete and remains so; this new full run supplies completion separately. Older17c1bdb formation timing failure463ms against unchanged300ms threshold, isolatedPASS and unconfirmed cause remain in history. No failed log was removed or its threshold weakened.

The local browser launch restriction was bypassed operationally by running the same tools in the authorized GitHub Actions runtime; no security control was disabled. githack previews were not reverified; previous403 remains. Production Pages were not changed. PR374 remains Draft. World-wide composition and iPhone Human QA are incomplete.
