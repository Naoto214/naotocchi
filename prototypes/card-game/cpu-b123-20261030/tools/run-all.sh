#!/bin/sh
# Runs every arm of PLAN.md in 4 shards each (resumable: finished matches are skipped).
cd "$(dirname "$0")/.."
for ARM in base E1 E1b E2 E2b E3; do
 for k in 0 1 2 3; do node tools/exp-run.mjs runs/T-manifest.json $ARM runs/$ARM-shard$k.jsonl $k 4 2> runs/$ARM-shard$k.log & done; wait
done
