# Full Character 3D Rollout v0 Implementation Plan

> For agentic workers: use superpowers:executing-plans inline; steps use checkboxes.

**Goal:** Expand the Human-QA-approved presentation architecture to every current character and stage with reviewable visual evidence.
**Architecture:** Master-driven audit, explicit original-derived family specs, shared family builders, unchanged canonical/presenter semantics.
**Tech Stack:** JavaScript/Three.js/Node tests/Playwright/SwiftShader/GitHub Actions.
**Spec:** design.md

## Global Constraints
- Existing 2D is the only design source; protected assets/save/gameplay/World remain unchanged.
- Draft only; no Ready/main merge; iPhone not inferred from CI; stop at v0 Human QA.
- Inspect originals before creating parameters. No uniform-scale-only stages or generic auto-fill.

## Review Focus
- Role namespace collision: exact companion/partner/author lookup must not become a player alias (Task 3).
- Metamorphosis: absent exact stage must be reported instead of nearest-stage success (Task 3).
- Unusual/no-face designs: expression must not assign identity to ambiguous organs (Task 2/3).
- Transparent layers: normal-distance halo/occlusion and render cost (Task 2/4).
- Cache disposal: live shared geometry survives travel/presentation switching (Task 3).

### Task 1: Fresh inventory and binding translation rules (FR-0)
Files: tools/character-3d/inventory.cjs, tests/character-3d-rollout-inventory-test.cjs, docs/character-3d/full-rollout-v0/*.
Produces auditInventory(root, master, {assets?}) → {active,supplemental,protectedVariants,missingAssets,unclassifiedAssets,counts}; stable keys and SHA256 source identity.
- [x] Test all current master entries/stages, hypothetical master addition, missing and unclassified assets. Run node --test tests/character-3d-rollout-inventory-test.cjs; observe RED.
- [x] Implement filesystem/master intersection and explicit legacy/egg classification. Run same test; expect 3 PASS.
- [x] Generate inventory.json + original source sheets, inspect topology and assign waves; preserve unclear interpretation in notes.
- [x] Save rules/design/plan/fresh conflict audit; checkpoint + separate stacked Draft PR.

### Task 2: Family waves (FR-1…FR-6)
Files: character-3d/rollout-spec.js, character-3d/archetypes*.mjs, geometry.mjs, rig.mjs, animate.mjs only as needed; tests/character-3d-rollout-test.cjs; docs/character-3d/full-rollout-v0/families/*.
Consumes inventory active rows; produces exact stage specs following existing builder input and rig output interfaces.
- [ ] For each wave inspect original stage strips and record silhouette/volume/pose/marking/side-back interpretation before parameters.
- [ ] Add failing tests for representative exact spec/template finite geometry and required reusable mechanism; expect RED.
- [ ] Implement representative(s), render original + front/3/4/side/back + normal-distance; fix clear failures before family expansion.
- [ ] Expand explicit remaining stage/species data; test all family canonical emotions and motion/reduced motion, meaningful shape changes, max-cost outliers.
- [ ] Mutation new mechanisms; run dedicated suite; save wave coverage/performance/outliers/remaining work and immutable images; checkpoint.

### Task 3: Exact full coverage and runtime contract (FR-7)
Files: spec.js/spec-esm.mjs, runtime.mjs, gallery adapters, inventory-driven test/browser harness. Meguru integration edits only when presentation adapter requires it.
Consumes all exact specs; produces exact specKeyFor/ref lookup for all active kinds and finite lazy cache/presenter behavior.
- [ ] Add RED tests for all master rows, kind/ID boundaries, metamorphosis, all 8 emotions, reduced motion, no-face special parameters, flag not saved, shared actor state, cache reuse/disposal/scene switching and isolated fallback.
- [ ] Connect reviewed exact specs; retain legacy Pilot archive. Add bounded unused-template policy only if repeat-travel evidence needs it.
- [ ] Run inventory-driven Node/browser suite and new mechanism mutations; expect all pass and mutations RED.

### Task 4: Final performance and Human QA package (FR-8)
Files: tools/character-3d/full-qa.cjs, character-3d/full-gallery.html, dedicated workflow, docs/qa/character-3d-full-v0/*, architecture.md, full-rollout roadmap.
Consumes inventory + immutable renders/results; produces lazy filtered gallery, all/family/stage sheets, coverage/outlier report.
- [ ] Gallery fixture tests for filters and lazy page bounds; missing-render failure test; observe RED then implement.
- [ ] Capture every active row four-view/5 emotion/idle+locomotion plus runtime integration; tag technical flags without pretending aesthetic approval.
- [ ] Measure identical baseline/revised 1/5/27; save raw timing/cache/material/texture/build/hitch/fallback data.
- [ ] Run full npm, Runtime/Home/Character/Quality CI, protected asset and save regressions; separate environment/base failures.
- [ ] One independent review; fix concrete defects; push evidence/docs and confirm exact remote/tree/Draft.
- [ ] Present required links + representative images and explicit untested iPhone/known gaps; stop Human QA. No v1.
