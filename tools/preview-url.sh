#!/bin/sh
# branch / PR を main に merge せずに iPhone で ためす ための URL を 出す。
#   sh tools/preview-url.sh <commit または branch>
# production(GitHub Pages = main)は さわらない。公開 repo の その commit の ファイルを、
# GitHub の ファイルを そのまま くばる CDN が text/html で 返す(commit で 固定 = ずっと おなじ 中身)。
# どれか 1 つが ひらかなければ つぎを ためす。中身は 3 つとも おなじ commit。
set -e
REF="${1:?commit or branch}"
REPO="naoto214/naotocchi"
SHA=$(git rev-parse "$REF" 2>/dev/null || echo "$REF")
for base in "https://cdn.jsdelivr.net/gh/$REPO@$SHA" "https://rawcdn.githack.com/$REPO/$SHA" "https://cdn.statically.io/gh/$REPO/$SHA"; do
  echo "# $base"
  echo "  2D (flag なし): $base/index.html"
  echo "  forest 3D + perf: $base/index.html?meguru3d=1&perf=1"
  echo "  おなじ branch の 2D: $base/index.html?meguru3d=1&perf=1&m3d2d=1"
done
