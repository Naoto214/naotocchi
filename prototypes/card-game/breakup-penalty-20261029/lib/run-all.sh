#!/bin/sh
# Runs the fixed manifests in 4 shards each (resumable: finished matches are skipped).
# Usage: sh lib/run-all.sh N1 N2 F P
cd "$(dirname "$0")/.." || exit 1
for name in "$@"; do
  for k in 0 1 2 3; do node lib/run.mjs runs/$name-manifest.json runs/$name-shard$k.jsonl $k 4 2> runs/$name-shard$k.log & done
  wait
  for k in 0 1 2 3; do gzip -kf runs/$name-shard$k.jsonl; done
done
