#!/bin/sh
# VERSION 7 runs on the main-based builds (build-main/, integration/build-candidate.mjs). Records go to runs-v7/ (not committed;
# their SHA-256 are listed in results/runs-v7-index.json). Usage: sh integration/run-v7.sh NAME [NAME...]
cd "$(dirname "$0")/.." || exit 1
for name in "$@"; do
  for k in 0 1 2 3; do LIFE_BUILD=build-main LIFE_UNMAP=1 node lib/run.mjs runs-v7/$name-manifest.json runs-v7/$name-shard$k.jsonl $k 4 2> runs-v7/$name-shard$k.log & done
  wait
  for k in 0 1 2 3; do gzip -kf runs-v7/$name-shard$k.jsonl; done
done
