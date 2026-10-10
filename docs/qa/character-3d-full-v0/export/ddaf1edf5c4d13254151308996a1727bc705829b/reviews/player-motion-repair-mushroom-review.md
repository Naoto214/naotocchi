# Replacement Mushroom image gate

Verdict: **REJECT — C0 / I1 / M0**. Mushroom **5 and 7 PASS** their full sampled image gate; Mushroom **6 remains REJECT**. The prior I1 is resolved for 5/7 and remains open for 6.

Actual `view_image` inspection covered only changed stages 5/6/7: **12 four-direction images, 96 motion cells on three boards, six normal-distance images**, three original source references, and five unchanged extracted raw JPEGs. All eight emotions were reviewed across idle/walk × normal/reduced motion. The 21 primary exported file hashes and sizes match the manifest. Exact paths, SHA256 values and per-stage records are in the adjacent JSON.

| Stage | Four views / source identity | Cap–stem join / distance silhouette | Complete face across 32 states | Gate |
|---|---|---|---|---|
| Mushroom5 | PASS | PASS | PASS | PASS |
| Mushroom6 | PASS | PASS | REJECT: sick forehead hidden in all four columns | REJECT |
| Mushroom7 | PASS | PASS | PASS | PASS |

The raised back tilt on 5/7 exposes the complete eye, brow and forehead footprint while retaining the red spotted cap, white stem and soil identity. Stage7 retains its three intentional floating spore companions. Their four directions and normal-distance images show coherent silhouettes and continuous cap/stem joins.

**I1, Important, OPEN for Mushroom6:** the white scalloped collar/cap underside still hides the blue sick forehead stress marks in sick idle-normal, walk-normal, idle-reduced and walk-reduced. Each raw 320×320 JPEG was extracted unchanged and actually viewed, confirming the obstruction. Visible eyes/mouth and improved dislike brows do not resolve the missing forehead footprint.

Minimum correction: clear the complete produced forehead footprint from both collar and cap underside for stage6 while preserving its source identity and attachment. Its replacement four views, all32 sampled states and two normal-distance images need actual inspection after that correction. No repeat capture of unchanged stages is required by this finding.

Evidence source: `ddaf1edf5c4d13254151308996a1727bc705829b`; source run `37931349651`, successful job `113823115627` (`stage-evidence (mushroom)`), artifact `11617275973`. Evidence root: `docs/qa/character-3d-full-v0/export/ddaf1edf5c4d13254151308996a1727bc705829b/motion-repair-mushroom`. Manifest remains `PENDING_VISUAL_REVIEW`; capture success is provenance, not visual approval.

The previous review is `player-motion-topology-review.json`. Unchanged stages were not re-reviewed. No continuous animation, Human or iPhone approval is claimed. No code/tests/captures were changed or run.
