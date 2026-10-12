# Default World + Character 3D — iPhone Human QA handoff

PR: #379 (Draft). Base: `e98b35e148ba6fa84a1013946f29ec2b3a0f585b`.
Main merge and production deployment are **not authorized before physical QA**.
The PR body records the final tested commit, tree, CI runs and commit-pinned preview links.

## Scope and URL contract

| URL | World data | Rendering |
| --- | --- | --- |
| No flags | Existing World 3D | World + Character 3D |
| `?meguru3d=1&char3d=1` | Same | Explicit request, all safety fallbacks still enabled |
| `?meguru3d=0` | Legacy 2D | Canvas 2D; no 3D module request |
| `?m3d2d=1` | Same World 3D | Canvas 2D; no 3D module request |
| `?char3d=0` | Same World 3D | World 3D + character billboards |

An explicit 2D value wins over conflicting/duplicated parameters. No settings UI,
localStorage preference or schema field is added. `perf=1` shows existing 3D metrics.
The legacy runtime test harness now explicitly requests `meguru3d=0`; separate real
startup and browser tests cover the unflagged production path.

The module preloads once. Entering before it is ready shows a high-contrast status
and cancel button. After a provisional 5 seconds, Canvas starts. A token rejects
stale completions/cancelled entries; a session failure locks out automatic retries.
Late module load cannot replace an already running Canvas simulation.

WebGL absence, module failure/timeout, constructor/shader/draw/resize errors and
context loss use Canvas. Runtime fallback retains the exact simulation, world,
player, party and collision arrays. A character-specific failure remains a billboard
inside the 3D world. This does not regenerate the world or change save/gameplay.

## Automated evidence

Run from the repository root:

- `node --test tests/meguru-default-3d-test.cjs tests/world-character-routing-test.cjs tests/asset-integrity-test.cjs`
- `node tools/meguru-3d-qa/default-remove-it.cjs` (isolated copy; mutation cannot race the checkout)
- `node tools/meguru-3d-qa/integration-remove-it.cjs` (run without concurrent checkout tests)
- `npm test`
- `node tools/meguru-3d-qa/default-startup.cjs --out qa-artifacts/default-startup`
- `node tools/meguru-3d-qa/character-integration.cjs --out qa-artifacts/character-integration`

World CI also runs the existing capture, visibility, corridor and smoke audits.
Runtime and Home CI remain required. Home's static test servers now serve `.mjs`
as JavaScript; Safari page-error assertions remain intact.

The browser runners record failures, 13 regions, actor cleanup, player visibility,
terrain/billboard ground planes, reduced motion, URL modes, and a normal-URL
27-actor (player + 26 companions) portrait/landscape fixture. Shader injection uses
invalid GLSL; context loss uses the browser's actual WEBGL_lose_context extension.
Software WebGL numbers are **not iPhone performance measurements**.

## Physical iPhone observations — 2026-10-12, initial candidate `6c9f4ca`

The user opened the commit-pinned preview and confirmed display. After being asked
to walk/travel, rotate portrait → landscape → portrait, and exit/re-enter, the user
reported: 「横にすると操作パッドなど表示されない あとは問題ない」.
Their snow-region screenshot shows the 3D world/player, with the lower controls
outside the visible landscape area. These are user observations, not measurements
of all 13 regions, 27 actors, fallback, or sustained performance. Exact device/OS
and standalone Safari versus an in-app Safari view have not been confirmed.

The landscape issue is reproduced by `tests/meguru-landscape-browser.cjs` on the
production HTML/CSS: at 852×320, the pad extends to y≈444. The existing 220px canvas
minimum plus a vertically stacked HUD/hint/pad cannot fit the short viewport.
The fix uses a landscape-only two-column layout, retaining the canvas minimum,
putting the pad/actions beside the world and removing the redundant app title
only while exploration is running. Portrait, startup/cancel UI, other games,
World/Character renderers and simulation code retain their existing paths.

The regression test checks control bounds/hit targets, scroll overflow, preserved
simulation identities through rotations, real pad movement, map, exit and reentry
across default 3D, billboard, same-World Canvas and legacy 2D. It is wired into
Home CI for Chromium and WebKit. Linux WebKit's renderer mode is recorded; Canvas
fallback there must not be reported as physical Safari 3D validation.

The user retested candidate `44a1415` and confirmed 「ボタンなど配置問題なし」.
They reported a low viewpoint and authorized camera adjustment. The new camera
candidate holds elevation at a 3:2 reference for wider canvases and adds downward
pitch while keeping the camera target's feet at 80% height. Portrait projection
and both Canvas renderers are unchanged. See `camera-adjustment/README.md`.

**Camera retest and full physical QA remain incomplete. Keep Draft; do not merge
or deploy production.**

## Remaining physical iPhone Safari steps

Use the commit-pinned candidate URL from PR #379 in Safari. Do not use the mutable
branch URL or production main for acceptance. The CDN returned HTTP 403 to this
automated environment; verify accessibility on the physical device first. If it
remains blocked, serve the exact commit from an approved QA host; do not merge to
main to obtain a preview.

1. Record iPhone model, iOS/Safari version, viewport, power mode, battery/thermal
   state and network. Use a QA Safari profile. Keep any existing save code before
   importing fixtures: preview revisions on the same host share browser storage.
2. Open **without any URL flags**. Enter めぐる immediately after a cold load.
   Confirm loading text is readable and cancel is reachable. Try cancel/re-enter
   and rapid repeated entry. Confirm one world/canvas, no delayed second start.
3. Use ordinary travel controls through all 13 regions: home, city, countryside,
   forest, mountain, snow, sea, deepsea, river_lake, jungle, desert, star_stop,
   memory_lake. Check player, companions, ground contact, slopes, bridges,
   occlusion, collision and old-region cleanup. Exit/re-enter multiple times.
4. Import `27-actors-save.txt` via the existing menu's save-code import UI in the
   QA profile. It is a synthetic current-schema save, not a production migration.
   Confirm 1 player + 26 companions. Rotate portrait → landscape → portrait and
   continue walking/travelling for at least 10 minutes. Record disappearing actors,
   tab reloads, increasing stutter, heat, canvas leftovers and memory growth.
5. Open the same candidate with `?meguru3d=0`, `?m3d2d=1`, and `?char3d=0`.
   Confirm each mode above, including conflicts such as `?meguru3d=1&meguru3d=0`.
   Reload without flags to restore default 3D; no saved preference should remain.
6. With Safari Web Inspector connected, enter normal 3D and run
   `__meguruRun.renderer.loseContext()`. Confirm Canvas resumes at the same place,
   with the same companions and region, and movement/collision/save remain usable.
   Exit/re-enter: it must remain Canvas until page reload. Use Inspector network
   blocking/throttling for module failure and >5-second cold load. Do not count
   untested fault paths as PASS.
7. Enable iOS Reduce Motion, reload, and confirm restrained animation/camera.
   Verify existing PNG/Expression behavior in explicit 2D and billboard modes.
8. Compare baseline commit `499eee66714ad7f33ba7ecd881aa757ba92d0bd7`
   (`?meguru3d=1&char3d=1&perf=1`) with the candidate (`?perf=1`) on **the same
   device, save, region, camera, actor count and thermal/network conditions**.
   Separate cold and warm runs; collect at least three runs. Record load-to-play,
   frame avg/p95/p99, >60ms frames, calls/triangles/textures and Safari memory if
   available. Missing measurements remain 未測定; `performance.memory` is not
   evidence of Safari's total memory.

| Physical metric | Baseline | Candidate |
| --- | --- | --- |
| Cold / warm load-to-play | 未測定 | 未測定 |
| Frame avg / p95 / p99 | 未測定 | 未測定 |
| >60ms frames / samples | 未測定 | 未測定 |
| 27-actor sustained play | 未実施 | 未実施 |
| Safari memory / growth | 未測定 | 未測定 |
| Physical fallback / orientation | 未実施 | 未実施 |

## Protection / release hold

No change to `meguru.js`, `character-3d/` (all 293 forms), `assets/` (2D and
Expression PNG), gameplay, save/schema, Expression, Motion or Relationship modules.
Only startup/presentation, their tests/QA runners, cache tokens and the narrow World
CI branch/path selection change. Vending-machine geometry remains deferred.
Final automated success does not imply physical QA success. Keep PR #379 Draft.
