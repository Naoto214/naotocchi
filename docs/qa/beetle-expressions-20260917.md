# Beetle expression QA — 2026-09-17

## Scope

Added beetle stages 01–08, ten original-referenced expressions each: 80 new portraits, 1,200 total across 15 lines. This is one batch, not completion of all character lines. PR #278 remains Draft and must not be merged.

## Artwork and preservation

- All eight original sprites were individually inspected with a real-coordinate grid; anchors are recorded in `tools/expression-face-anchors.json`.
- 80 separate original-reference imagegen calls, 80 unique sources. Final manifest: `beetle-expressions-20260917-manifest.json` (`complete: true`, 80/80 records).
- All80 PNGs verified at 128×128 with alpha and exact original drawing bounds; all240 original/source/final SHA-256 values matched actual files.
- Stages01–03 are larvae,04 is a pupa,05–08 are adults. Faces stay beneath the horn; horn, wing-case color and major legs retain their identity. Generative shape/detail differences remain; this is not a pixel-identical face-only edit.
- All80 standalone sprites received independent visual review; all80 marked composites were visually inspected by root and independent reviewer.
- Only beetle placements were generated. No algorithm change or new exception was needed. Full checker:1,200 marks,720 sweat envelopes,zero issues. Existing coral exception is unchanged.
- Horns, body and spread legs can push marks above the head or sweat outward. Zero detected overlap is distinct from ideal subjective placement. Review images are static PNG/SVG/CSS compositions with approximate sweat, not physical-device captures.
- Against local baseline `def3025a9fcd392850807eee269c54f0f43b2ae5` / shared tree `77091a279588814f3cebba58a7a5937bc11a5866`: all1,120 prior PNGs/routes/SVG accents and112 placement entries (including81 prior user adjustments) preserved. All248 canonical normal-stage sprites preserved, along with all297 non-expression character PNGs checked. The24 other top-level runtime JS files and `pet-expression.css` are unchanged; gameplay, romance conditions and save format untouched.
- Cache updated by `npm run bump`: `pet-expression.js?v=20260917-bd481be3`. Only one index asset token changed.

## Verification

Use `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES"` for sharp commands.

- `/workspace/scratch/371b634ec59d/check-beetle-art.cjs`: PASS,80portraits/240hashes.
- `/workspace/scratch/371b634ec59d/check-beetle-preservation.cjs`: PASS,1,120 priorPNG/routes/accents,112 placements.
- `tools/check-expression-placement.cjs`: PASS,1,200marks/720sweat envelopes/0issues.
- `/workspace/scratch/371b634ec59d/check-beetle-site.cjs`: PASS,15lines/1,200records/80current-batch records,eight sheets,all1,120 priorPNG preserved.
- Focused integration suites:473passed. Full final-version `npm test`:1,253passed,0failed/cancelled/skipped/todo,165286.633776ms. Log:`/workspace/scratch/371b634ec59d/beetle-npm-test.log`. Full suite includes final cache bump and all80 assets.
- `git diff --check`: PASS.
- Independent final review:Spec PASS / Code quality APPROVE, no blocking finding. See `beetle-expressions-20260917-review.md`.

## Delivery

Prepared same owner-private Site `appgprj_6aa908e9357c8191abb0f486be58697c`, image identity `bt-bd7ad9f3`, default beetle and current-batch filter80. Tap/select,memo/copy source and data behavior retained and independently reviewed. Source/state evaluation does not claim physical-device clicks. Published successfully as owner-private version52. Source commit: `9209237caef6ff53a5d65c13c2d8d3cbdfb05a1a`. Version ID: `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_700e4b17709c81919d6920e2454b409c`. Deployment ID: `appgdep_6aabdf1adc98819184af3d2aca8ef66a`. URL: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/ . Packaging completed before upload; gzip integrity and required archive entries including `dist/.openai/hosting.json` were checked.

GitHub save must use the existing feature branch and remote base_tree, preserving241 historical skip-worktree entries and requiring remote/staged-local tree equality. Final SHA/tree and post-save Draft/main/CI checks are recorded in PR#278 after save. Initial live check: remoteHEAD `3d648226048c76c0d21dc4094aeaff927e77f1b4`, main `5d39eea915d09be3900d92fa879a9e9f1ecf6091`; Draft/open/unmerged with preexisting conflicts; no Actions/status/check-runs and combined pending. This is not CI success.

Latest pre-save main observed: `c77587b7488670d27af1e7f0fdb8a477a386e1c2` (advanced independently during production); not merged or rebased into this feature branch. Feature HEAD remained the original remote baseline, Draft/open/unmerged with existing conflicts.
