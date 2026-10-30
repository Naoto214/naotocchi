#!/bin/sh
# Runs both manifests in 4 shards each (from this directory). Output: runs/<E>-shard<k>.jsonl (gzipped afterwards).
set -e
for E in X TR; do
 M=runs/$E-manifest.json; [ $E = X ] && M=../deck-balance-20261025/runs/X-manifest.json
 for k in 0 1 2 3; do node lib/run.mjs $M runs/$E-shard$k.jsonl $k 4 2> runs/$E-shard$k.log & done; wait
done
