#!/usr/bin/env bash
set -euo pipefail
release=$1
arm=$release
if [[ $LAYOUT != fixed ]]; then arm=$release-$LAYOUT; fi
IFS=- read -r width seed order <<< "$PROFILE"
root=comparisons/home-mobility-v10
out="$RUNNER_TEMP/forest/$release"
base=http://127.0.0.1:8377
python -m http.server 8377 --bind 127.0.0.1 --directory "$RUNNER_TEMP/$release" > "$RUNNER_TEMP/forest-http-$release.log" 2>&1 &
server=$!
trap 'kill "$server"' EXIT
python -B "$root/forest_live.py" --url "$base" --arm "$arm" --width "$width" --seed "$seed" --order "$order" --attended --chromium /usr/bin/google-chrome --out "$out"
python -B "$root/forest_rays.py" --url "$base" --chromium /usr/bin/google-chrome "$out/forest28.json.gz"
for snapshot in initial-checkpoint checkpoint; do
  python -B "$root/forest_touch_v10.py" --url "$base" --arm "$arm" --width "$width" --order "$order" --seed "$seed" --snapshot "$out/$snapshot.json" --out "$out/touch-$snapshot.json" --chromium /usr/bin/google-chrome
done
python -B "$root/forest_metrics.py" "$out/forest28.json.gz"
