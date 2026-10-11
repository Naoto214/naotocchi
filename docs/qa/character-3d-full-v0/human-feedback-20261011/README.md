# Human feedback: grove_deer / naoto

Baseline: `216887bd2613b36838d1ba641d616a6d5aa08aee`. User approves the overall direction but requests these two source-likeness corrections. Overall Human QA and actual iPhone QA remain OPEN.

Candidate: deer leg length .50→.43 and radius .023→.025, proximal taper and small joint on existing leg owners. No thick dog-like paws or new gait. Author uses the existing closed-volume/path hair parameters for overlapping downward fringe, rounded crown, temples and posterior coverage. The user-rejected wide symmetric forehead opening and bare rear are superseded; old tests requiring that appearance are updated, while actual closed-surface, attachment, face visibility and winding tests remain.

Only `character-3d/nonplayer-spec.js` production code changes. Builder, archetype, runtime, Motion, Expression, fallback and save/schema files are untouched. 293 baseline/current spec+geometry+transform hashes show exactly the two requested changes; other291 unchanged. Pilot28 animation/geometry hashes and11 protected groups match. Focused33 tests PASS, new4 destructive controls detected and restored exact bytes. New assertions first failed on the unchanged baseline.

Initial capture and archive completed at `4faa3e3f5293c6993bad8e385a8fc2156d82e056`; raw evidence is preserved under `../export/4faa3e3f5293c6993bad8e385a8fc2156d82e056/human-feedback/`. Actual review accepted deer four directions,32 states and2 normal-distance boards. Author was REJECTED: rear coverage improved, but fringe/crown looked helmet-like.

Author refinement: elevated crown, staggered curved fringe, ten connected waves including three posterior waves. Only author geometry differs from the first candidate; deer evidence remains reusable. Shape4 + author regression11 + workflow23 tests PASS;4/4 destructive controls detected with exact restoration. Independent review Critical0/Important0. **Refined author technical image QA ACCEPTED after actual review at `fe2acd989f5d6f611a8251133795f83ae737800c`**. Existing Actions nonplayer capture is scoped to these two rows. `human-feedback-review.cjs` reuses the existing server/wave renderer and `before-specs.json` copied from baseline to capture before/after four directions with the same lighting/pose and per-model framing. Each board repeats the single original2D at left; it does not fabricate unseen original views. After-state32 and normal-distance2 captures use the unchanged nonplayer QA runner. Terminal Chromium installation failed; no local rendering or iPhone PASS is claimed.

Historical pre-feedback image approvals remain historical evidence. These modified appearances require their own actual image review before being called complete. No Ready/main/Pages changes.

## Final comparisons and review

[Deer: original / before / after](partner-grove_deer-comparison.jpg) · [Naoto: original / before / after](author-naoto-comparison.jpg). Both include front,3/4,side,back.

[Structured actual review](visual-review.json). Each accepted model was reviewed in4directions,32states and2normal-distance scenes. Deer4faa evidence is reused after exact unchanged hash verification; authorfe2acd9 archive51files verified against manifest size/SHA256. Source CharacterCI38131052301 SUCCESS, scoped author mutations plus4/4 destructive controls detected/restored. Previous full dedicated regression at4faa passed and remains applicable outside the author-only refinement.

Overall Human QA and actual iPhone QA remain **OPEN**. This is an automated-render technical review, not user/device acceptance.

Latest source Runtime38131058037 andHome38131058046 remain IN_PROGRESS at publication preparation, not PASS. Previous4faa fullnpm3022+80PASS andHomeSUCCESS are separate; author refinement has its own scoped dedicated/mutation/image success.
