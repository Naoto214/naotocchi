#!/usr/bin/env bash
# Run from the current source checkout. The before checkout is a sibling.
# This orchestration changes no runner sampling, geometry or game semantics.
set -euo pipefail
root="$PWD"
out="$root/qa-artifacts"
mkdir -p "$out"
git rev-parse HEAD > "$out/commit.txt"
sha256sum meguru.js meguru-3d.mjs index.html > "$out/source-sha256.txt"
node --version > "$out/node-version.txt"
node -p 'JSON.stringify({playwright:require("playwright/package.json").version,chromium:process.env.PLAYWRIGHT_CHROMIUM,yaws:process.env.YAWS,visibilityStep:1000})' > "$out/browser-environment.json"
case "$WORLD_QA_AUDIT" in
  captures)
    before="$(cd "$root/../before" && pwd)"
    git -C "$before" rev-parse HEAD > "$out/before-commit.txt"
    cp tools/meguru-3d-qa/shots-visual-quality-v1.json "$out/world-recipe.json"
    node - <<'JS'
const fs=require('fs');
const scenes=require('./docs/qa/meguru-3d-garden-clusters/plan-before.json').scenes;
const shots=scenes.map(s=>({region:'home',x:s.x+Math.cos(s.collision.ang||0)*140,z:s.z-Math.sin(s.collision.ang||0)*140,yaw:((s.collision.ang||0)-Math.PI/2)*180/Math.PI,dist:260,name:'entrance-'+s.id.split(':')[1],jpg:1,env:['day','sunny','summer']}));
fs.writeFileSync('qa-artifacts/entrance-recipe.json',JSON.stringify(shots,null,2));
JS
    # Both sides use identical recipes, camera and production runners.
    node tools/meguru-3d-qa/shot.cjs "$root" "$out/after" "$(cat "$out/world-recipe.json")" 2>&1 | tee "$out/world-after.log"
    node tools/meguru-3d-qa/shot.cjs "$root" "$out/after" "$(cat "$out/entrance-recipe.json")" 2>&1 | tee "$out/entrance-after.log"
    (cd "$before"; node "$root/tools/meguru-3d-qa/shot.cjs" "$before" "$out/before" "$(cat "$out/world-recipe.json")") 2>&1 | tee "$out/world-before.log"
    (cd "$before"; node "$root/tools/meguru-3d-qa/shot.cjs" "$before" "$out/before" "$(cat "$out/entrance-recipe.json")") 2>&1 | tee "$out/entrance-before.log"
    node tools/meguru-3d-qa/object-gallery.cjs "$root" "$out/gallery-after" "$root/tools/meguru-3d-qa/shots-visual-quality-v2-gallery.json" 2>&1 | tee "$out/gallery-after.log"
    (cd "$before"; node "$root/tools/meguru-3d-qa/object-gallery.cjs" "$before" "$out/gallery-before" "$root/tools/meguru-3d-qa/shots-visual-quality-v2-gallery.json") 2>&1 | tee "$out/gallery-before.log"
    ;;
  smoke)
    node tools/meguru-3d-qa/regions-smoke.cjs "$root" "$out/smoke" 2>&1 | tee "$out/smoke.log"
    ;;
  corridor)
    node tools/meguru-3d-qa/corridor-qa.cjs "$root" "$out/corridor" 'home|forest|home,forest|mountain|forest,city|sea|city,countryside|forest|countryside,home|forest|forest,forest|mountain|mountain,city|sea|sea,countryside|forest|forest' 2>&1 | tee "$out/corridor.log"
    ;;
  visibility)
    node tools/meguru-3d-qa/visibility-audit.cjs "$root" "$out/visibility" '' 1000 2>&1 | tee "$out/visibility.log"
    ;;
  *) echo "Unknown WORLD_QA_AUDIT: $WORLD_QA_AUDIT" >&2; exit 2 ;;
esac
if [[ "$WORLD_QA_AUDIT" != captures ]]; then
  node tools/meguru-3d-qa/ci-summary.cjs "$WORLD_QA_AUDIT" "$out" | tee "$out/summary.log"
fi
# A job exit is execution status, not Human QA approval. Inspect raw JSON/logs.
printf '0\n' > "$out/runner-exit-code.txt"
