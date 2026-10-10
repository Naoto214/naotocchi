# Player motion image blockers code/spec review

Reviewed clean head `e30be553bb14225ed6f173282bcacae37ed05c0a` against `9528525d3a83b677e92e9fde99fe59c2447f4ee7` in `/workspace/scratch/150320e8a2fd/player-motion-image-blockers`. Read source image rejection reports, exact seven-file diff, implementation/test/control code, final report and identity/control logs. No implementation edits, full suite or actual capture performed.

**Result: C0 / I0; one nonblocking whitespace/report minor.** Numerical geometry is suitable for bounded replacement captures. Existing actual-image REJECT remains until fresh evidence is inspected.

## Spec and quality

- Exactly five nonPilot clownfish stages2/3/5/6/7 add `fins.rootFactor:.80`. The shared factory changes only the pectoral bone root coordinate expression; `rootFactor ?? (spread ? .94 : .8)` retains both old default branches exactly when the new option is absent. Existing spread angle, body/fin shape/color, source palette, face target/placement and topology remain. Stage5 child fish inherit the correction under the existing owning actor hierarchy.
- Mushroom5/7 add cap tilt−.55; Mushroom6 adds−.32. These use the established cap transform option. Cap profiles/radii/heights/spot/gill geometry, stem, stage7 roll/lean/spores, stage6 collar, face ownership, attachments and motion remain. The cap/stem contact checks use actual produced volume overlap under those rotations. No geometry or triangles are added, and no Expression/rig/animation behavior is changed.
- The mushroom regression assembles actual hybrid faces, covers all32 emotion/motion/reduced combinations, advances30 frames and samples6/15/30. It casts through the produced cap from front and both3/4 directions, testing produced eye-front vertices and mapped forehead/brow/mouth footprint. It independently checks actual cap/stem contact and full expression triangle count<18000. It tests the diagnosed obstruction rather than merely checking tilt values.
- The fish regression tests both fins and stage5's child rigs. Two-direction parity against the actual closed body target requires root penetration>0.004; at least three actual indexed root-fan triangle interior samples must overlap body volume. All32 states and frames6/15/30 are covered. This is stronger than bone ownership or overlapping bounds and directly detects the former detached root.
- Frozen default tests compare independent original fish factory and four original input fixtures on the same runtime, using exact geometry attributes/indices, transforms, ownership, metadata and canonical face defaults. Pilot inputs and one spread-fin branch are represented. No mutable prior candidate rows are frozen by the new tests.
- Worker identity audit explicitly compares38 unique unaffected assembled rigs, including the28 Pilot roster (26 player definitions and two legacy role inputs), all11 unaffected fish stages and all5 unaffected mushroom stages. It does not rebuild all285 other registered rows. Preservation of those remaining rows follows from unchanged input definitions, unchanged helpers and entire shared factory identity after reversing the single opt-in expression; only the five edited rows contain the new option. All other factory functions are byte-identical. This scope proof and sampled exact assemblies support preservation without misrepresenting a285-rig replay.
- Source identity remains bound to unchanged assets/role/stage registrations. The changed cap transform can alter projected silhouette/bounds and the fin inset can change visible join appearance; source fidelity requires the upcoming images. No runtime registration/promotion, gameplay/renderer/World/Home/save/2D/workflow/exporter changes are included.

## Verification

Independent focused command:

```sh
node --test --test-reporter=tap tests/character-3d-player-image-blockers-test.cjs
```

**9/9 PASS, 8868.60311 ms.** The actual shared builders, expression geometry and animation run in this check.

Reused worker25/25 PASS (new nine plus existing five fish and eleven fungus tests), initial eight meaningful defect REDs, eight scoped former-stage assertion REDs and final legacy-default RED/restored nine-test GREEN. The first default-control harness expected the wrong diagnostic string and failed despite the correct model/default RED; the retained log and corrected single-control run establish it honestly. No test or production invariant was weakened to correct that label. Together these establish nine distinct controls; no broad mutation replay was performed.

Independently checked clean worktree and exact final production hashes against restore evidence:

| File | SHA256 |
| --- | --- |
| archetypes.mjs | `6b95503c5ab853ee3d936150a639ea05327d0f5a83acd10790117c8d58a3d01b` |
| fish-spec.js | `50a104845360e2c2e1161a4b8f268070ba9175496ea22e5e4d53a4a4dabd6edf` |
| topology-spec.js | `59fc26091db352ba7fd467a79579ab53652934ca99176735f162a3b3891e7111` |

## Minor and remaining gates

Nonblocking minor: base-to-head `git diff --check 9528525d e30be553` reports new blank EOF lines in the new test file (line55) and frozen fish factory (line89). A clean-worktree `git diff --check` tests no committed difference, so the report's clean diff claim needs that qualification. Worker was notified; no review implementation edit made.

**Actual images OPEN/previous REJECT retained.** Root must inspect replacement four views, all32 motion/state cells and normal distance for the eight changed stages. Numeric sampled contact/visibility does not certify source silhouette, visible joins, every instant of continuous animation, runtime QA, Human approval or iPhone performance. Unchanged input/geometry rows may retain their prior source-qualified acceptance; this review grants no new image PASS.
