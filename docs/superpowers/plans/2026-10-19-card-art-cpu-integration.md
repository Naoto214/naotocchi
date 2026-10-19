# CARD GAME art + CPU integration plan

Goal: Combine approved PR396 art and PR398 CPU on main fe6fd8a3 in an independent Draft PR and owner-private Site.
Spec: User integration brief, 2026-10-19. Execution is inline, already authorized through publication.
Constraints: No main/Pages/source-PR mutations; no original art generation; no rules, canonical definitions or fixed-400 evidence modifications/execution.

- [x] Integrate CPU d5e37861 then art 07a73475 using their existing tests. Resolve presentation, app and CSS conflicts by preserving CPU input tickets, turn styling, effects and newest-first history while using approved art, 14 colors, AB-soft, history thumbnails and lazy image loading.
- [x] Run existing card-game suite and art verifier. Add focused regression for art + CPU rendering, private views, newest-first illustrated history and guarded deck preview. Compare catalog regeneration failure with unchanged main source; do not rewrite evidence.
- [x] Verify protected files, 12 independent CPU R10 completions/replay/restore and hotseat tests. Package only runtime + optimized art. No browser QA without supported control-browser in managed runtime; report device performance/layout limits.
- [x] Save independent branch/Draft PR, deploy new owner-private Site, record deployed source and hashes, confirm source PRs/main protected.

Review focus: stale gestures after image-backed redraw; history private card leakage; CPU turn CSS vs art cascade; detail image loading; full-match history image memory.
