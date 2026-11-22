#!/usr/bin/env bash
set -euo pipefail

# Each job owns its own runner and one continuous household.
IFS=- read -r width seed order layout repeat <<< "$PROFILE"
arm=$POLICY
if [[ $layout == reference ]]; then
  arm=$POLICY-reference
fi
out="$RUNNER_TEMP/forest/$PROFILE-$POLICY"
dist="$RUNNER_TEMP/v11"
if [[ $POLICY == v12 ]]; then dist="$RUNNER_TEMP/v12"; fi
browser="${CHROMIUM:-/usr/bin/google-chrome}"
port="${FOREST_PORT:-8377}"
base="http://127.0.0.1:$port"
python -m http.server "$port" --bind 127.0.0.1 --directory "$dist" > "$RUNNER_TEMP/forest-http-$PROFILE-$POLICY.log" 2>&1 &
server=$!
trap 'kill "$server"' EXIT
root=comparisons/home-mobility-v11
prior=comparisons/home-mobility-v10
python -B comparisons/home-mobility-v12/forest_watch.py --url "$base" --arm "$arm" --width "$width" --seed "$seed" --order "$order" --attended --chromium "$browser" --out "$out"
python -B "$prior/forest_rays.py" --url "$base" --chromium "$browser" "$out/forest28.json.gz"
for snapshot in initial-checkpoint checkpoint; do
  python -B "$root/forest_touch.py" --url "$base" --arm "$arm" --width "$width" --order "$order" --seed "$seed" --snapshot "$out/$snapshot.json" --out "$out/touch-$snapshot.json" --chromium "$browser"
done
python -B "$prior/forest_metrics.py" "$out/forest28.json.gz"
