# Landscape camera adjustment — 2026-10-12 / 13 JST

Parent: `44a1415f73860620f06a88a1736a6b55f2196d13`.

The user confirmed the parent's landscape controls on iPhone, reported a low
viewpoint, and authorized this adjustment. Exact device/OS remains unspecified.

## Change

- Only the 3D camera projection/pose in meguru-3d.mjs changes: above canvas aspect
  3:2, retain that reference elevation and add local downward pitch after yaw.
  Keep the camera target ground point at 80% canvas height. Existing terrain
  height following remains active; narrow/portrait projection is unchanged.
- CSS/control layout, meguru.js, character-3d/, assets/, simulation, saves,
  Expression/Motion/Relationship are untouched by this checkpoint.
- index.html updates the module content hash and fixes the prior CSS cache token.

## Verification

- RED: new real-Three-matrix test against old shipped camera fails because the
  wide camera sinks toward the ground (red.log).
- GREEN: camera/startup/cache tests: 17 PASS, 0 FAIL, exit 0 (focused.log).
  Includes several yaw angles and terrain heights, foot projection, portrait
  equivalence and continuity at the aspect threshold.
- Existing foundation/terrain/integration/2D-protection tests: 37 PASS, 0 FAIL,
  exit 0 (renderer.log).
- Chromium browser: 28 PASS, exit 0, same viewport/mode/input checks as the
  landscape checkpoint. Default and billboard paths actually use WebGL;
  both explicit 2D modes use Canvas. Software WebGL is not iPhone performance.
- Landscape default-3D screenshot visually inspected: elevated view, ground,
  player/party and right-side controls visible. No physical camera retest yet.

## Prior CI, preserved honestly

At parent 44a1415: Home run 38261127609 succeeded. Runtime run 38261127633
and World regression run 38261121359 failed: each reports 3139 PASS / 2 FAIL,
caused by style.css cache token `20261012-landscape` not containing its required
content hash `43b2a1f0`. Both cache assertions now pass locally, without weakening
tests. World character integration and all four browser jobs succeeded at that
parent. These outcomes do not certify this new camera commit.

Previous local full npm-test session has no recoverable final status and is not
counted as PASS. New-commit CI is pending after save. Local WebKit unavailable
(host dependencies); no local WebKit success claim. Missing physical measurements
remain unmeasured. Keep Draft, no main merge or production deployment.
