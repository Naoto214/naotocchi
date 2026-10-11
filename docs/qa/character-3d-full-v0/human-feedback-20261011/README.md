# Human feedback: grove_deer / naoto

Baseline: `216887bd2613b36838d1ba641d616a6d5aa08aee`. User approves the overall direction but requests these two source-likeness corrections. Overall Human QA and actual iPhone QA remain OPEN.

Candidate: deer leg length .50→.43 and radius .023→.025, proximal taper and small joint on existing leg owners. No thick dog-like paws or new gait. Author uses the existing closed-volume/path hair parameters for overlapping downward fringe, rounded crown, temples and posterior coverage. The user-rejected wide symmetric forehead opening and bare rear are superseded; old tests requiring that appearance are updated, while actual closed-surface, attachment, face visibility and winding tests remain.

Only `character-3d/nonplayer-spec.js` production code changes. Builder, archetype, runtime, Motion, Expression, fallback and save/schema files are untouched. 293 baseline/current spec+geometry+transform hashes show exactly the two requested changes; other291 unchanged. Pilot28 animation/geometry hashes and11 protected groups match. Focused33 tests PASS, new4 destructive controls detected and restored exact bytes. New assertions first failed on the unchanged baseline.

Image status: **PENDING actual review**. Existing Actions nonplayer capture is scoped to these two rows. `human-feedback-review.cjs` reuses the existing server/wave renderer and `before-specs.json` copied from baseline to capture before/after four directions with the same lighting/pose and per-model framing. Each board repeats the single original2D at left; it does not fabricate unseen original views. After-state32 and normal-distance2 captures use the unchanged nonplayer QA runner. Terminal Chromium installation failed; no local rendering or iPhone PASS is claimed.

Historical pre-feedback image approvals remain historical evidence. These modified appearances require their own actual image review before being called complete. No Ready/main/Pages changes.
