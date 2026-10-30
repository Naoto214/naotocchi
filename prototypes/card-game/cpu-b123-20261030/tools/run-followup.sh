#!/bin/sh
# Follow-up (PLAN.md 追補計画, approved 2026-10-30): E4, E14, and the stall-metric re-measurement of base/E1
# (baseM/E1M must reproduce the stored save sha256 of base/E1 exactly). 4 x 672 matches, 4 shards each.
cd "$(dirname "$0")/.."
for ARM in E4 E14 baseM E1M; do
 for k in 0 1 2 3; do node tools/exp-run.mjs runs/T-manifest.json $ARM runs/$ARM-shard$k.jsonl $k 4 2> runs/$ARM-shard$k.log & done; wait
done
