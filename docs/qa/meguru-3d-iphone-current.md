# World current-source Human / iPhone QA handoff

Prepared 2026-10-12 JST. Status: NOT EXECUTED / NOT APPROVED.
Source: a0124f35e1ade1a2f2e007bb520cedb61de72b4d (product bytes c010bf2); PR374 Draft/open/unmerged. This document does not change product code, deploy anything, or grant Human QA approval.

## Access

[Current-source 3D + perf](https://rawcdn.githack.com/Naoto214/naotocchi/a0124f35e1ade1a2f2e007bb520cedb61de72b4d/index.html?meguru3d=1&perf=1)

[Current-source normal 3D](https://rawcdn.githack.com/Naoto214/naotocchi/a0124f35e1ade1a2f2e007bb520cedb61de72b4d/index.html?meguru3d=1)

[Same-source 2D comparison](https://rawcdn.githack.com/Naoto214/naotocchi/a0124f35e1ade1a2f2e007bb520cedb61de72b4d/index.html?meguru3d=1&m3d2d=1)

Reachability NOT confirmed: curl HEAD with redirects from the agent environment returned HTTP403 from Cloudflare at 2026-10-11 16:32:28 UTC. This does not establish whether physical iPhone Safari can open it. Do not substitute old PR-body preview links: they pin older product sources. If Safari also fails, record access blocked; do not call QA failed/passed and do not change production Pages. A separately authorized nonproduction host or a developer's complete pinned checkout served on the same LAN would be needed; neither is provisioned here. Existing QA servers bind 127.0.0.1 and cannot directly serve a remote iPhone.

Tracked workflows were inspected: World QA captures/regression upload Actions artifacts; no preview deployment was identified. Stored images can support appearance review, not interactive device performance approval.

## Suggested manual sequence (not a new numeric acceptance threshold)

1. Record iPhone model, iOS/Safari version, exact URL/source, time, low-power mode, screen orientation, party count and device temperature impression. Record screen capture on/off; capture may affect performance. Use the preview origin's own test session; do not overwrite a production save. Record inaccessible regions or unavailable party counts as untested.
2. Open 3D + perf, enter めぐる through the normal UI, and confirm the overlay actually says 3D. A loaded page or silent 2D fallback is not a 3D pass.
3. Walk/turn/stop in home, forest, jungle and city; include dense objects and foreground occluders. Observe residual images, player disappearance, obvious stutter, touch movement and camera response. Record visual failures even when diagnostics say player ok.
4. Visit river_lake: check the relocated tree and waterwheel from normal road/reverse views, walk past them and confirm no new obstruction. Another unchanged foreground tree still partly obscures the road-side view; do not treat that known limitation as the original trunk/hub intersection. Compare forest/river bridges and home/countryside identity. Review remaining regions and seasonal/weather views only when available; no unobserved coverage claims.
5. Traverse available corridor routes in both directions; record origin/destination and whether arrival, player visibility and party follow-through are normal. Capture transition stalls separately from steady walking.
6. Record the perf panel while continuously walking and again when an issue occurs, including region/party count and elapsed time. Repeat without perf for appearance if needed. Explicit Human appearance and physical performance decisions remain separate; no pass is inferred from screenshots or CI counts.

## What the panel measures (source inspected)

- meguru-3d.mjs perfText: avg/p95/p99 and >60 count/denominator use a rolling window of at most600 render intervals, not whole-session statistics. Record snapshots promptly; old stalls leave the window. Background/resume intervals can contaminate it, so label those separately. Do not report a session-wide p99 from one screenshot.
- calls/tris/js/dpr: js drawMsAvg is not total frame interval; do not replace p95/p99 with it.
- ghost/player/ray: diagnostic observations, not substitutes for what the human sees.
- adaptive resolution: adaptDpr uses groups of90 accepted intervals (<250ms); median>22ms lowers DPR by0.25 to a floor of1.5, with no automatic increase in that renderer. Record dpr and dpr→ history. These are implementation thresholds, not newly approved acceptance criteria.
- The diag long-frame counter uses >50ms and <1000ms, while the perf first-line >60 uses >60ms. They are different counters and must not be conflated.

## Result template

Source / URL:
Device / iOS / Safari / date:
Conditions / party count / recording:
Access and 3D active:
Regions/routes actually checked:
Ghost / player disappearance / stutter observations:
Region + elapsed time + avg/p95/p99 + >60 numerator/denominator:
DPR start/end/history:
Appearance decision and specific remaining issue:
Physical performance decision:
Untested coverage / evidence links:

All result fields remain pending. Preserve HQ-1–15 in meguru-3d-art-direction-v1-human-qa.md and the gates in meguru-3d-waterwheel-supports/tree-relocation/remaining.md. This preparation closes no Human/device gate and explains no historical smoke-overlap variability. No product modification, repeated full CI, Ready/main import/merge or Pages change.
