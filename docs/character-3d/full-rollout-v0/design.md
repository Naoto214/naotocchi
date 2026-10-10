# Full Character 3D Rollout v0 — design / binding scope

2026-10-04 Human QA approved Pilot → Full Rollout v0, not final adoption or merge.
Baseline Pilot d12ad70550b29c125f44ac2b32d7195905fb15f0 (tree cf2fb37e88704e7963b82af9c763875cbacbfee5); main 0b0a6b30e8e098472b2fa965604f4901874942e3 (tree aceec6a5ea4a5c94922b60ea90e1b08ea02e42b0).

## Intent and boundaries
Existing 2D PNGs are the only design source. Keep species → archetype → species/stage parameters → attachments/markings/material → rig → locomotion → canonical emotion → expression → presenter. No save/gameplay, Home/Relationship Expression PNG, World art, or other-lane design changes. Keep QA URL opt-in, actor-local fallback, lazy templates. No Ready/main merge. Finish at full v0 Human QA, not v1 polish.

## Branch and implementation approach
Use feat/character-3d-full-rollout-v0 stacked on feat/character-3d-pilot, separate Draft PR. Preserve #372. Inline TDD in reusable-family waves; independent review at the completed rollout. The user explicitly authorizes ordinary implementation without intermediate approval. This supersedes routine skill approval pauses. Stop only for the user's five material ambiguity/semantics/performance conflicts.

Do not generate generic specs from names, palettes or scaled Pilot templates. Each stage requires inspection of its original and explicit shape/pose notes. Shared defaults are numerical conveniences; never count a nearest-stage model as exact coverage. Keep Pilot definitions unchanged as the reference baseline.

## Registry and data interfaces
Build auditInventory(root, master, options) from the current master plus filesystem, not SPEC.inventory. active rows have key/kind/id/stage/label/asset/hash. supplemental records distinguish egg presentation and retired assets. Unknown files and missing originals fail audit. Expression files are protected variants, not additional species. Retired aliases remain retired; do not revive gameplay entries. Egg assets are Home startup presentation, not actor species. Record their scope separately; optional gallery representation cannot imply Meguru actor coverage.

Keep immutable Pilot data in spec.js. Rollout data is a separate UMD module loaded by spec-esm.mjs and browser spec entry points. Exact lookup prefers reviewed rollout specs and preserves Pilot fallback behavior for the legacy pilot page. Full gallery and runtime coverage must explicitly require exact specs for every active row. Family builders remain shared. New family modules extend BUILDER dispatch without world changes. Add only the modifiers demanded by inspected originals.

## Waves (grouped by reusable responsibility)
FR-0 inventory, original contact sheets, Visual Translation Rules, conflict audit, this plan.
FR-1 existing-family completion: original Pilot missing stages; quadruped/avian/fish/humanoid/blob/larva relatives. Species with new topology wait for the relevant family wave.
FR-2 articulated shell family: hard-shell insects/crustaceans/spider/scorpion; representative before expansion.
FR-3 tentacle/branching aquatic family: jellyfish, octopus, coral, mycelium.
FR-4 botanical family: rosettes, traps, flowers, tree canopies/trunks.
FR-5 rigid/object and luminous/unusual families: original-driven silhouettes; no billboard-only shortcut counted as 3D.
FR-6 remaining relationship/author/hidden designs and full stage gaps. Respect signature poses.
FR-7 full exact expression/motion/presenter/cache/integration QA and bounded cache if required.
FR-8 performance, full regression/mutations/CI, filtered mobile gallery, contact sheets, roadmap, final Human QA package.
A wave may be split only at a real representative gate; avoid one-commit-per-character bookkeeping.

## Validation and review focus
Every inventory row: finite geometry, valid rigs/materials/attachments, all canonical emotions, idle/moving/reactions/reduced motion, exact actor lookup, original + four views. Check normal Meguru distance and outliers manually. Mesh/stage difference is evidence, not aesthetic approval. Detect missing faces, identical shapes across stages, extreme bounds/tris/materials, absent motion, fallback. Coverage success cannot replace identity QA.
Runtime: every actor role, failure isolation, repeated region/2D switching, cleanup/cache growth, no state mutation. Measure 1/5/27 actors including build/hitch/load/material/texture/cache/memory and presentation/animation CPU. Preserve baseline SwiftShader; actual iPhone remains final Human QA gate.
Critical review cases: non-player ID namespace collision; metamorphosis exact-stage lookup; alternate face/no-face semantics; transparent layers and occlusion at normal distance; repeated scene changes/cache disposal while shared geometry remains in use.

## Completion contract
All active master designs/stages built and visually audited; supplemental scope explicit. No undeclared fallback. Updated architecture/roadmap, inventory-driven tests and mutations, npm/Runtime/Home/Character evidence CI, immutable image/measurement provenance, lazy/filterable full gallery and scan sheets. Known outliers and unrun iPhone checks explicit. Draft and Human QA pending at completion.
