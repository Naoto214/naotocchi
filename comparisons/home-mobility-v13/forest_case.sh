#!/usr/bin/env bash
set -euo pipefail

IFS=- read -r width seed order layout repeat <<< "$PROFILE"
arm="$POLICY"
if [[ "$layout" == reference ]]; then arm="$arm-reference"; fi
out="$RUNNER_TEMP/forest/$PROFILE-$POLICY"
dist="${FOREST_DIST:-$RUNNER_TEMP/v13}"
browser="${CHROMIUM:-/usr/bin/google-chrome}"
port="${FOREST_PORT:-8377}"
base="http://127.0.0.1:$port"
python -m http.server "$port" --bind 127.0.0.1 --directory "$dist" > "$RUNNER_TEMP/forest-http-$PROFILE-$POLICY.log" 2>&1 &
server=$!
trap 'kill "$server"' EXIT

here=comparisons/home-mobility-v13
python -B "$here/forest_native.py" live --url "$base" --arm "$arm" --width "$width" --seed "$seed" --order "$order" --chromium "$browser" --out "$out"
python -B "$here/forest_native.py" directions --url "$base" --chromium "$browser" --out "$out"
for snapshot in initial-checkpoint checkpoint; do
  python -B comparisons/home-mobility-v11/forest_touch.py --url "$base" --arm "$arm" --width "$width" --order "$order" --seed "$seed" --chromium "$browser" --snapshot "$out/$snapshot.json" --out "$out/touch-$snapshot.json"
done
python -B comparisons/home-mobility-v10/forest_metrics.py "$out/forest28.json.gz"
python -B "$here/forest_native.py" fixed --url "$base" --chromium "$browser" --out "$out"
