# PR #426 iPhone QA follow-up implementation plan

Goal: correct sprite facing, make water visibly distinct, and retain readable, movable groups.
Architecture: keep official 2D art/Motion v2 and the shared Meguru renderer. Only Home presentation changes. Author implements inline, then independent final review.
Spec: user request of 2026-10-23; existing ../DESIGN.md. GitHub base 703a1a06; current main 3d7a9e08. No main merge or Pages deployment. Existing private Site only. Draft stays.

- [x] Facing: home-diorama.js resolves native art direction and sets a body-only CSS variable. script.js supplies current asset; asymmetrical alpha bounds mirror around painted center. Test dog, opposite-facing fish/companion, expression paths, restoration and Motion ownership before implementation.
- [x] Water: home-world.mjs widens only Home river; world-life.mjs keeps bounded schools underwater; world-ambient.mjs supplies pooled 3D fish/ripples, meguru-3d.mjs integrates them before rendering with water translucency/depth. Delete fish overlay. Test fish below water and inside shared river, paused clocks, no scene resource growth.
- [x] Group layout: uniform scaling of official cast layout around each actor's painted foot (including attachments), available as a preview comparison; compare 1/.9/.8 and 1/2/3/4/6 actors through official layout. Broaden walking area while keeping bank behind it; use body-dependent separation, distributed social approach and safe hit priority. Test ratios, no save mutation, arrival/exit, resize, narrow screen, taps and autonomy.
- [x] Compare actual browser frames before/after and all sizes/counts. Run focused tests, official package test command, packaging tests. Save images/results and honest browser limits.
- [x] Commit/push this existing PR branch, update body, package same tested runtime to existing owner-only Site, verify terminal deployment status and remote SHA.

Review focus: positive/lonely/sleep images; hearts/rings/accessories outside reflection; portrait/short viewport; repeated roster changes without shrinking twice; actual underwater occlusion rather than screen overlay.

Decisions: preserve original illustration style. Comparison controls are preview-only, not game settings. Initial hypothesis was 90% (two) / 80% (three+); superseded by the measured ruling below. Original relative size ratios retained within every composition. Existing clone is already isolated in this task workspace.

Ruling after visual comparison: 1/2/3/4/6 actors fit at existing solver size with expanded walking bounds and body-aware separation. Reject automatic extra .9/.8: the original solver already reduces main 165px to 95–96px when partner appears (390px QA). Adopt 100% default and retain 90/80/70 comparison controls in the private fixture. No change in species/stage proportions.
