#!/bin/sh
# Same-position branches (PLAN-V4 §5): runs lib/fork.mjs on a field manifest in 4 shards, then gzips. Usage: sh lib/fork-all.sh <OUTNAME> <manifest-name>
cd "$(dirname "$0")/.." || exit 1
for k in 0 1 2 3; do node lib/fork.mjs runs/$2-manifest.json runs/$1-shard$k.jsonl $k 4 2> runs/$1-shard$k.log & done
wait
for k in 0 1 2 3; do gzip -kf runs/$1-shard$k.jsonl; done
