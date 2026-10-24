> 2026-10-23 iPhone QA追補：最新のB（波必須）・E（役割変更）・入力/表示・検証結果は [qa-update/REPORT.md](qa-update/REPORT.md) と [qa-update/DELIVERY.md](qa-update/DELIVERY.md) を参照。以下は初回Pilot公開時の記録です。

# Verification and iPhone QA

## Browser layout measurement
Real Chromium iframes with actual viewport sizes. Values measured from canvas DOM rect; these are not iPhone Safari measurements. 8×6 uses the same UI with lower2 rows cropped, static/no input; old stages are not converted.

|CSS viewport|8×8 cell px|8×6 cell px|8×8 board|scroll|controls|
|---|---:|---:|---|---|---|
|375×667|43.375|43.375|347×347|none|84.25×46|
|390×664|45.25|45.25|362×362|none|88×46|
|430×740|50.25|50.25|402×402|none|98×46|
|375×568|43.375|43.375|347×347|none|84.25×46|
|390×500|37|45.25|296×296|none|88×46|
|667×375 landscape|43.875|51.25|351×351|none|47.75×46|

At 390×500 the cells shrink18.2%; landscape also differs. **Do not adopt8×8 formally yet.** Need Safari addressbar/safearea/rotation user QA. CSS uses100dvh, env safe-area, viewport resize; simulation has no hardware safearea. The required controls remain. Header/side controls landscape were corrected after observing inactive media rule; final measured values above.

Digits normal32% of cell, held50%; character72% ×70% / held1.4x, lifted above foot ring. At375 width: digit13.88px/21.69px. Pointer finger遮蔽 cannot be proven with desktop mouse. Beam paints whole tile + thin core; gold warning then bright active. Wave paints row and arrows. Existing art used without modifying originals.

## Automated checks
`node --test prototypes/naopoyo-world/tests/*.test.mjs prototypes/naopoyo-v2/tests/*.test.mjs` = 186/186 at current code. Formal rescue205/205. Evidence log stored. Each of5 stages has an actual engine constructive witness, stored `solution-X.json`; these are legal timed commands, not claims of human solve times or global shortest paths. No route search reached its40000 cap. A/D each mandatory gate is an8-neighbor structural cut even if numeric conditions are ignored. B/E intentionally permit moving without wave; wave necessity not proven/required in comparison prototype. C has no split source except light.

Independent review3 Important findings reproduced and fixed RED→GREEN: Undo replay, chamfer sampling, corrupt terrain saves. All v2 tests remain. Full project suite is run with test concurrency2 for environment memory; final status will be in DELIVERY.md, not inferred from prior PR.

## iPhone checklist — all pending user verification
1. Open private new URL, A: hold dog2, drag through1 and3門 to double spike. Release nowhere during sequence. Confirm new1s and1star rescue.
2. B: hold fish through wave warning and push; continue dragging without releasing. Dog must not enter blue water, including push. Fish1+2 can exit3star.
3. C: enter light column and wait. Confirm warning, split once during irradiation, lifted number/foot ring, continuous movement.
4. Undo after a wave: state and clock rewind, paused overlay appears. Resume▶. Retry restores starting board.
5. Switch apps30s, return: no backlog of waves. Reload mid-drag: snapshot resumes safely and whole gesture can be undone.
6. D:3門 then split then1門, no diagonal bypass. E: guest has no number and cannot be grabbed; wave and light trial, noHP/death.
7. Check375/390/430 physical devices if available, Safari bar expanded/collapsed, safearea, landscape, short screen, all buttons visible without scrolling. Use8×6 button only for static size comparison.
8. Difficulty/fun/shortcuts: report which puzzle insight felt satisfying. A/D similar and E is an early comparison, not finished boss content.

## Not complete
Current/foam/wind/ice/warp, operable guest, guest rescue goals, two-guest coordination, large boss silhouette, formal100-stage balance, Safari hardware QA. No stage uses gravity yet; runtime+v2 gravity tests cover interaction behavior. No claim that all requested future features are already shipped.

## Browser interaction and deployment evidence
375px iframe: actual pointer drag from dog2 through dog1 and3門 to double spike produced3 separate1 actors while staying one gesture. Screenshot `evidence/mobile-layout.jpg`. This is desktop Chromium input, not touch hardware.
Dedicated GitHub CI `Naopoyo World Pilot` run39901057719 succeeded on implementation HEAD86852681. Its command includes Pilot30 + v2 156 + formal205. No production deploy job exists in the new workflow.
Private Site version1 deployment succeeded;48 runtime manifest hashes match packaged archive. Anonymous version.json returns401. Native access policy is owner1, editors/groups/external visitors0. Authenticated HTTP byte fetch was not independently performed (no new bypass token was requested or created). Do not overclaim byte-for-byte remote response verification.

## Final full regression
Full package.json test chain completed exit0, concurrency2, no omitted tests. Node test totals3390/3390, failures/skips/cancelled0. Additional smoke/dialogue/visual scripts also exited0. Elapsed summed runner time921057ms. Complete log: evidence/full.log.gz; command: evidence/full-test-command.sh.
