# Author hair source correction

Base: `5be8349be8f73401eb8c56d4f7dc27f74ab930d3`.
Head: `711f2dcb6836f27370b8155483f466ea312458df`.
Branch: `work/author-hair-source-fix`.
Worktree: `/workspace/scratch/150320e8a2fd/nonplayer-author-hair-source-fix`.
Clean local commit; no push, capture, runtime promotion or shared factory changes.

## Inspected evidence and scope

Actually inspected `assets/characters/author/naoto.png` and the complete source-e16963da export's `author-naoto-views.jpg` and `author-naoto-motion.jpg`. The source has a centrally exposed forehead, parted brunette waves sweeping outward/down to ear level. Captured geometry instead showed a smooth horizontal bowl; existing eight waves were buried in the broad crown cap.

Only `author:naoto` hair input changes: the closed crown ellipsoid becomes a rear crown (size .28/.155/.21, center 0/.145/-.09), and the existing eight closed outward-capped paths sweep from the divided crown toward the sides, descending to approximately -.052 through -.082 relative to skull center. Their radii, taper, tessellation, brown color, owner and count remain unchanged. Head proportions, canonical face and all clothing remain unchanged.

Files:

- `character-3d/nonplayer-spec.js`: author hair volume/path coordinates only.
- `tests/character-3d-author-hair-test.cjs`: assembled indexed-surface visible-hair and skull-contact regressions.
- `tools/character-3d/author-hair-remove-it.cjs`: three scoped meaningful old-hair controls with exact restoration.
- `tools/character-3d/author-remove-it.cjs`: stale author cap-position anchor updated to the new exact position, retaining its original face-occlusion mutation.

No registry, gameplay, renderer, World/Home, save, Expression, 2D, workflow, QA route or factory/default edit. All prior nonauthor rows preserved.

## Meaningful geometry checks

The new front-ray test examines the complete head mesh, not isolated path coordinates or bounds. Nine central-forehead rays must hit skin; both visible side sweeps must reach from crown to ear level and extend beyond the former cap silhouette; at least six individual path constituents must be first-visible surfaces. A second test builds a contact graph from actual indexed closed volumes and requires every hair and ear shell to reach the skull. The head remains 12 closed constituents (skull, two ears, rear crown, eight waves). Existing 32-state multi-azimuth eye/mouth clearance, expression triangle budget, actual contact graph, grounding, anatomy and indexed outward terminal winding remain passing.

## Validation and logs

Before correction:

```sh
node --test --test-reporter=tap tests/character-3d-author-hair-test.cjs
```

Meaningful RED: central forehead covered by old hair. `author-hair-fix-before.log`.

Affected existing tests:

```sh
node --test --test-reporter=tap --test-name-pattern='runtime-isolated|one canonical|resting produced|every source shell|naoto original|terminal indexed' tests/character-3d-author-candidate-test.cjs tests/character-3d-author-hair-test.cjs
```

Six selected existing tests PASS in 23.280 s, including all 32 states. The TAP total is seven because the hair file had no matching test name and emitted an empty file-level PASS; this is not counted as a seventh geometry assertion. `author-hair-fix-affected.log`.

```sh
node --test --test-reporter=tap tests/character-3d-author-hair-test.cjs
```

Two new tests PASS, 1.264 s. `author-hair-fix-topology.log`. The initial visible-hair design run also passed (`author-hair-fix-design.log`). Total substantive affected tests: eight PASS.

```sh
node tools/character-3d/author-hair-remove-it.cjs
node tools/character-3d/author-remove-it.cjs '--case=source hair occludes canonical face'
```

Three new controls RED: old cap plus buried waves, old cap alone (forehead assertion), and buried old waves alone (visible ear-level sweep assertion). Two-test restored baseline GREEN. Updated existing face-occlusion control RED and restored face baseline GREEN. Four scoped controls total detected, exact production bytes restored; source SHA-256 `0c08eb13de00257777206d2c40f9b74d4233414ebde000d52216761eddf9d1fe`. `author-hair-fix-controls.log` and `author-hair-fix-face-control.log`. No replay of unchanged controls.

The first new-control run correctly detected all three geometry failures but expected the wrong text for the third; its expected text was corrected to the observed ear-level-sweep assertion before the successful final run. Production bytes were restored in both runs.

Exact input/geometry audit:

```sh
node /workspace/scratch/150320e8a2fd/character-rollout/.superpowers/sdd/1772ca6d6997/author-hair-fix-identity-audit.cjs
```

Run from the worktree. All 42 nonauthor source rows compare exactly with the base, then produce byte-identical attributes/indices, mesh/bone transforms, owners, canonical face specs and targets on the same runtime. Author nonhair inputs, nonhead produced geometry, all bones/transforms and canonical face defaults also compare exactly. Shared factory bytes equal base. `author-hair-fix-identity.log`. The audit uses V8 serialization to preserve -0 while normalizing VM realm prototypes; initial JSON normalization lost -0 and was corrected. Previous unchanged player-family/default evidence is reused because no factory or player input changed. No mutable candidate tables frozen into permanent tests.

Staged diff check passed; no broader suite, full npm, screenshots, remote operations or unrelated edits.

## Remaining actual image gate

Geometry and controls prove the intended exposed part and visible swept surfaces; root must recapture and review actual author images before promotion. No image PASS or approval is claimed here. Existing author actual-resident QA identity/adapter and natural memory_lake 2D fallback are unchanged.
