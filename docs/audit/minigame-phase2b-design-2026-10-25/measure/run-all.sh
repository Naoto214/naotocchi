#!/bin/bash
# 10本ずつ 別プロセスで 測る(メモリ対策)。cwd = リポジトリ。idle 5種・random 20種・mash 10種
P=${OUT:-/tmp/minigame-measure}  # 出力先(OUT で変えられる)
mkdir -p $P/raw
cd "$(git rev-parse --show-toplevel)"
for cond in idle random mash; do
  case $cond in idle) S=5;; random) S=20;; mash) S=10;; esac
  for a in 0 10 20 30 40 50 60 70 80 90; do
    : > $P/raw/$cond-$a.jsonl
    ( node --expose-gc --max-old-space-size=4096 $P/score-measure.cjs $a $((a+10)) $cond 1 $S $P/raw/$cond-$a.jsonl 2> $P/raw/$cond-$a.err ) &
  done
  wait
done
echo done
