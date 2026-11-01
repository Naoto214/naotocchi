# VERSION 21 — clock disappears after landscape zoom

## Scope

Clock positioning fix only on Draft PR #501. No main merge or production Pages update.
V20 restoration point: `bddda69004630bcccfbcf83be56c08957c0cc772` (implementation `5cf54a65f8b138d2219bcf592cc764d8c2d649b7`). V20 Site source: `88b0febc1b27db0a04d82fe1633f31fa41d6accd`; saved Site version ends `appgver_5f09cb0685a08191aa9b68dceda9bd15`.

## Cause

`toggleZoom` received a coordinate for double taps, but button/keyboard calls had no coordinate. It enlarged the rectangular scene and left scrollLeft/scrollTop at zero. The square SVG uses its default xMidYMid meet placement in that larger rectangle. In sufficiently wide/short landscape stages, its centered artwork is entirely outside the viewport at scroll origin. The screenshot's intact toolbar, info panel and top/left-positioned scrollbars are consistent with this defect.

Reproduced using the actual view controller and an explicit model of the existing CSS geometry (not a browser measurement):

| Stage / state | Scene size | Square SVG bounds relative to stage | Scroll |
| --- | --- | --- | --- |
| 520×180 normal | 520×180 | x=170..350, y=0..180 | 0,0 |
| V20 button zoom, 4× | 2080×720 | x=680..1400, y=0..720 | 0,0 |
| V21 button zoom, 4× | 2080×720 | x=-100..620, y=-270..450 | 780,270 |

V20's zoomed SVG has no intersection with the 520px-wide stage. V21 keeps the clock center at the visible stage center (260,90).

A related case was retained zoom state after portrait/landscape resize: dimensions changed but the old scroll position could again leave the clock outside view. V21 recenters only while the clock view is open and enlarged.

## Minimal change

- `prototypes/card-game/life-clock-view.mjs`: default button/keyboard anchor from stage.getBoundingClientRect plus half its client width/height; existing double-tap anchor path reused. Recenter enlarged scroll on existing resize handler. Label V21.
- `tools/pages/allowlist.json`: reviewed hash for that runtime file only.
- `prototypes/card-game/tests/life-clock-v21.dom.mjs`: regression test.
- `life-clock/README.md`, `life-clock/provenance.json`, this report: history and verification.

No CSS, SVG, render asset, central hand stacking, 180° rotation, 2×2 parameter layout, common gesture helper, card logic or game/save/CPU code changes. Relative coordinates come from the current stage rectangle rather than fixed screen offsets, so modeled safe-area/viewport offsets do not move the zoom center.

## Validation

- Regression failed against V20: `button zoom must not hide clock`; passed after the fix.
- Seven modeled stage sizes, portrait/landscape offset changes: normal → button zoom → pan bounds → whole view → double tap zoom → front/back → rotate → whole view. Artwork DOM and supplied game values unchanged.
- Non-reduced animation endpoints: existing 260ms motion, uniform scale(4) with translate(-780px,-270px), correctly centered at commit. This is endpoint math, not a real animation/rendering test.
- V20 inspection DOM and existing clock DOM, turn DOM and lifecycle DOM passed: button/double-tap state, close during motion, mandatory choices, CPU pause/resume and save restoration.
- Independent review found no concrete defect or scope violation.
- First broad CARD GAME run: 571/572 pass, one existing timing assertion `selection.test.mjs: 40 physical cards use bounded existence checks` exceeded 1000ms (1571ms). Isolated rerun: 6/6 pass, timed test 311ms, with no code or threshold change. Reduced-concurrency full rerun is recorded below.

## Screenshot evidence and limitations

Before: the owner's original [IMG_7393.png](https://chatgpt.com/library?file_id=libfile_61430b020b7481919ec3afdbbd6f598a&account_id=personal), preserved as the V20 failure screenshot. It shows V20, 全体表示, blank clock stage, and four visible parameters. The original remains in its existing restricted location; browser chrome was not copied into this repository.

After: **not captured**. The cloud browser again failed to initialize with `failed to start node_repl backend: Connection closed`. No real WebKit/iPhone Safari run, rendered before/after comparison, native touch-pan, visual-viewport event timing or safe-area screenshot verification was possible. No simulated rendering has been labeled a screenshot. The code-level cause is reproduced and corrected; device confirmation remains outstanding.

## Package and private deployment

- Pages package unit checks: 16/16 passed. Runtime package: 4,120 files / 220,849,516 bytes; HTTP validation: 452 card IDs / 904 card images, seven entrypoints, zero missing files or hash mismatches.
- All 4,120 Site static files match the verified runtime manifest exactly.
- Site source: `01905b86feb617568365914cab0189946b2a3d32`.
- Saved version: `appgprj_6ae71faa85448191977d6f89971d5d0b~appgver_9f110f3a59108191aea10e47cf0a24d6`.
- Deployment: `appgdep_6ae75065ad3c81918144cf640134e337`, succeeded at 2026-11-01 14:45:58 UTC; owner-only access preserved.
- [Owner-only trial](https://naotocchi-card-clock-v17a-20261101.kerzion214.chatgpt.site). No main merge or production GitHub Pages deployment.
- Local deployment-archive packaging repeatedly failed with ENOSPC; deployment therefore used the supported remote build of the exact pushed static source. No alternate source or reduced asset set was used.

## Final regression result

`node --test --test-concurrency=2 --test-reporter=tap prototypes/card-game/tests/*.test.mjs`: **572/572 passed**, zero fail/cancel/skip, exit 0, 154,338ms. Before that final run, a workspace-only sparse checkout omitted one linked QA document and caused the catalog regeneration check to fail; restoring the original tracked document resolved it. No catalog, test threshold or game code was changed. The V21 geometry DOM check was rerun and passed after publication; `git diff --check` passed.
