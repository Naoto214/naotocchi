# Eight-stage motion repair capture plan

Use the existing family capture tools for **only Mushroom and Clownfish**, with commit marker **`[qa:motion-repair]`**. No new runner, CLI selector, factory, or capture configuration is necessary. This plan permits capturing all eight stages of those two affected families for four views and normal distance; only the repaired eight need new acceptance review. It does not authorize Pilot 1/4/8 implementation edits.

Repair keys: `mushroom:5,mushroom:6,mushroom:7,clownfish:2,clownfish:3,clownfish:5,clownfish:6,clownfish:7`.

## Exact existing commands

Run at repository root under the committed repair source, with CI's existing `GITHUB_SHA`, Node 22, npm dependencies and Playwright Chromium/SwiftShader setup.

```bash
node tools/character-3d/meguru-qa.cjs --rollout --species-only --line mushroom --out test-results/full-rollout/stages/mushroom
node tools/character-3d/wave-review.cjs test-results/full-rollout/stages/mushroom/repair-four-views --topology --line=mushroom
node tools/character-3d/wave-motion.cjs test-results/full-rollout/stages/mushroom/missing-motion mushroom:5,mushroom:6,mushroom:7

node tools/character-3d/meguru-qa.cjs --rollout --species-only --line clownfish --out test-results/full-rollout/stages/clownfish
node tools/character-3d/wave-review.cjs test-results/full-rollout/stages/clownfish/repair-four-views --fish --line=clownfish
node tools/character-3d/wave-motion.cjs test-results/full-rollout/stages/clownfish/missing-motion clownfish:2,clownfish:3,clownfish:5,clownfish:6,clownfish:7
```

These flags already exist. `meguru-qa.cjs` uses production specs and renders each selected family's eight actual player stages in Meguru, front/back. `wave-review.cjs` selects the exact family via `--line=`, emits front/34/side/back JPEGs and a comparison board. Its factory-family flags select topology/fish; its served `character-3d/wave-review.html` uses the real builders/rig/motion. `wave-motion.cjs` already accepts an exact comma-separated stage list and emits all eight emotions × idle/walk × normal/reduced = 32 cells per repaired stage.

Do not pass candidate overlays to the production distance commands, `--no-capture`, or `--focus`. The two-family capture is related-factory coverage, not a request to repair or reapprove unchanged Pilot stages.

## Minimal root patch

Implementation changes are limited to:

- `.github/workflows/character-3d-rollout.yml`: add the marker routing below, reuse existing `stage-matrix`/`stage-evidence`, artifact names and setup.
- `tests/character-3d-integration-workflow-test.cjs`: add focused routing/command assertions for repair mode while preserving existing ordinary, integration, runtime and family-marker expectations. No capture tool changes are needed.

Routing:

1. Repair marker takes precedence over combined capture markers. In repair mode, `stage-matrix` emits exactly `["mushroom","clownfish"]`; otherwise keep the current `Object.keys(SPEC.ROLLOUT)` expression.
2. Enable `stage-matrix` and `stage-evidence` for the repair marker. Existing per-family production Meguru command remains unchanged.
3. Add a repair-only four-view step inside `stage-evidence`, selecting `--topology --line=mushroom` or `--fish --line=clownfish` from the exact two-line matrix. Output to the family artifact's `repair-four-views` child.
4. Permit the existing Missing plan-minimum player motion step in repair mode. In that mode, use the two literal comma lists above; in integration mode retain the current 86-entry JSON filtering unchanged. Keep the existing child output `missing-motion`.
5. Exclude repair mode from `stage-coverage`: the existing aggregator requires all 248 stages/31 shards at one source. Two repaired-family shards cannot satisfy or be described as that gate.
6. Exclude repair mode from all other capture/runtime/performance jobs: `conflict-audit`, `human-performance`, `fish-performance`, `meguru-wave`, `wave-review`, the four candidate-distance jobs, four family-wave-review jobs and `nonplayer-candidate-review`. This prevents unrelated image recapture and runtime work. Preserve their old conditions when the new marker is absent.
7. Keep `dedicated` as the existing validation job; do not silently turn skipped checks into passing evidence. Its current ordinary mechanism-mutation routing applies unless root deliberately adds a separately reviewed repair-specific validation scope. This capture plan does not require broad local reruns.

A narrow routing assertion should confirm repair marker alone and repair marker combined with integration/runtime/family markers still select exactly the two capture shards, skip the full aggregate and unrelated capture jobs, and do not change old marker behavior.

## Outputs and provenance

| Family | Related-family four views | Related-family normal distance | Repaired motion |
| --- | --- | --- | --- |
| Mushroom | stages 1–8 × 4 = 32 JPEGs | stages 1–8 × front/back = 16 PNGs | stages 5, 6, 7 × 32 = 96 JPEGs |
| Clownfish | stages 1–8 × 4 = 32 JPEGs | stages 1–8 × front/back = 16 PNGs | stages 2, 3, 5, 6, 7 × 32 = 160 JPEGs |

Total emitted produced images: 64 four-view + 32 distance + 256 motion = **352**, plus two family four-view comparison boards and eight motion boards. The repaired eight acceptance scope is **32 four-view + 16 distance + 256 motion = 304 produced cells/images**. Source-reference columns and comparison boards are not extra produced states.

Reuse existing artifact names:
`full-rollout-stages-mushroom-${github.sha}`,
`full-rollout-stages-clownfish-${github.sha}`.
Keep existing `stage-evidence (mushroom)` and `stage-evidence (clownfish)` job names and family-root artifact paths. The existing exporter closed binding in `.github/scripts/character_qa_export.py` already recognizes these exact names, so successful artifact-job export needs no exporter extension. All three children retain the same source SHA; partial/failed capture remains pending and cannot count as acceptance.

Relevant evidence inside each family artifact:

- `meguru-qa.json` plus `player-<family>-<stage>-{front,back}.png`
- `repair-four-views/evidence.json`, `<family>-<stage>-{front,34,side,back}.jpg`, `<family>-stages.jpg`
- `missing-motion/motion-evidence.json`, eight repaired-stage `*-motion.jpg` boards in total and all 256 raw motion JPEGs

Export to a fresh source-specific repair label; do not overwrite the rejected ae9 evidence or claim its repaired stages passed. `artifactJobEvidence:true` with the exact two successful stage job IDs can recover these artifacts even if unrelated validation fails; preserve that overall source-run failure in the manifests.

## Remaining acceptance gates

Repair production/code review and protected Pilot/default preservation remain prerequisites. Then verify exact source/branch/job/artifact digest and counts; actually inspect the changed eight's four views, all 256 motion cells and 16 normal-distance captures. Confirm the Mushroom eye/brow/forehead/mouth clearance and Clownfish attachment repair in the new actual pixels. Raw ZIP frames resolve board ambiguity. Unaffected related-family images need no repeated acceptance review if prior source input/geometry identity is independently established; merely capturing them does not approve them.

After image acceptance, update only the repaired-stage evidence references/coverage paths and retain other approved captures. The complete integration runtime/248-stage aggregation, Human and iPhone gates remain separate and open as applicable. No tests, captures or implementation changes were performed for this preflight.
