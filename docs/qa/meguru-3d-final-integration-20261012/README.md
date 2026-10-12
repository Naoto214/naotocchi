# World → main final integration gate — 2026-10-12

## User approval (supersedes earlier prohibitions for this operation)

Current World forms/scenery are generally accepted by the user. Minor artistic improvements may move to a post-merge Quality Pass. World PR374 may be retargeted to main, made Ready and merged only after final integration against a freshly verified main containing Character Full Rollout, dedicated tests/mutation/full regression and Runtime/Home/World CI, with no unresolved major defect. Existing2D/save/schema and URL-only3D opt-in must be protected. iPhone physical performance is NOT_RUN, explicitly deferred by the user to post-merge Human QA; it is no longer a pre-merge blocker and must never be labeled PASS.

## Fresh-state blocker

GitHub exact-ref and independent git ls-remote agree: main is0b0a6b30e8e098472b2fa965604f4901874942e3/treeaceec6a5ea4a5c94922b60ea90e1b08ea02e42b0 (Resident Expression merge), not Character Full Rollout.

PR376 is merged into feat/character-3d-pilot via d10a432b3375d5a462529b9923602737aea15c8e. Its parent PR372 targets main but is still Draft/open/unmerged. Pilot advanced to f5a9ede3a887143eb23f8a3c33cc285fa60fd2f6/tree13940fa7685a6073bc860a106d927732e296f10f: a contemporaneous CI baseline-test-count correction. Character38192518168/Runtime38192524862/Home38192524819 were in_progress, not successful results. Do not interfere with this active Character lane, equate merging into pilot with merging into main, or silently replace the user's required base with pilot.

World input is b020655d568aebfd48814221a07d9c52ff699049/treef1cb3c7d23633ddc0e39beb676f721c9cb763cd2, PR374 Draft/open/unmerged, existing base feat/meguru-3d-art-direction-v1.

Workspace maintenance removed the earlier checkout. A dedicated partial clone was restored at /workspace/scratch/e038a3340537/world-integration; no saved implementation was rebuilt. npm ci completed exit0. No product code edits or actual merge into the worktree/remote were performed.

## Read-only preflight

`git merge-tree --write-tree HEAD origin/feat/character-3d-pilot` confirms four conflicts: index.html, meguru.js, package.json, meguru-3d.mjs. The hypothetical unresolved tree is3752f16db543d3596e5dc14bcb60a06942dbfe4f; it is NOT a tested integration candidate and is not a branch update. This is preparatory evidence only; repeat the comparison against actual Character-integrated main once available.

The saved Character contract at51abcbfa, docs/qa/character-3d-full-v0/premerge-20261012/README.md, has been read. It supplies groundY presenter input and a QA active-representation diagnostic; it explicitly does not prove World integration. No previous Character-only or World-only CI is counted as combined-source success.

## Execution plan after the prerequisite lands

1. Fresh-confirm main SHA/tree and ancestry of Character rollout/groundY/QA corrections, PR374 and PR372 state. Fetch exact main; review AGENTS if introduced. Keep World Draft until every gate below passes.
2. Merge exact main into the isolated World checkout. Resolve index.html tokens from actual final bytes; union package.json test commands without dropping either side; retain World map APIs and main Expression APIs in meguru.js. For meguru-3d.mjs combine presenter lifecycle and World terrain/ghost/adaptive-DPR lifecycle without wholesale ours/theirs selection.
3. Add failing integration checks first: healthy3D must be diagnosed through its real instance, not its intentionally hidden2D billboard; hidden/detached/zero-scale/empty3D remains failure. Preserve camera/frustum/fog/ray checks for the active representation. Feed identical finite walkY ground height to presenter,3D foot shadow,2D fallback and its shadow. Cover bridge/slope placement, individual fallback, actor removal, region/corridor switching,2D opt-out, save invariance and resource disposal. Reuse existing production helpers and actual presenter; do not reimplement approved character models.
4. Run dedicated World/Character/integration tests; execute existing applicable mutation suites plus new integration remove-it controls and verify exact source restoration. Fix reproducible failures without weakening assertions. Check source-bound all13region layout/collision protection, preserving only the already-approved river_lake:68 exception relative to original World baseline.
5. Full regression on combined source, then Runtime/Home/World CI and Character runtime integration evidence against that source. Keep failed attempts and distinguish Node simulation, desktop browser and physical iPhone evidence. Retarget DraftPR374 to main when needed to trigger Runtime/Home PR checks; do not Ready/merge until their success is verified. Independent final review must cover the four conflict resolutions and runtime boundaries.
6. Before merge, recheck main has not moved beyond the tested base, exact PR head/tree, CI and unresolved findings. If needed integrate/test the new base. On success use expected_head_sha when merging PR374 into main. Recheck resulting main HEAD/tree, World/Character/URL-gating state and post-merge CI. If any major gate remains unresolved, keep Draft/unmerged and report it.

## Gate status at this checkpoint

| Gate | Status |
|---|---|
| Current World appearance acceptance | USER_ACCEPTED; minor polish deferred |
| Physical iPhone performance | NOT_RUN; explicitly post-merge follow-up |
| Character Full Rollout in main | BLOCKED: only pilot merged, PR372 still open |
| Four conflicts resolved against final main | NOT_RUN; read-only conflicts confirmed against pilot |
| Combined-source visibility/ground/occlusion/collision/cleanup/region switching | NOT_RUN |
| Combined-source dedicated tests/mutation/full regression | NOT_RUN |
| Combined-source Runtime/Home/World CI | NOT_RUN |
| PR374 Ready/main merge/post-merge checks | NOT_RUN; Draft/unmerged maintained |

No new artistic changes, collision redesign, Character-lane merge, production Pages configuration or Card-lane operations were performed. These statuses record the prerequisite blocker, not a failed final implementation or an iPhone-related refusal to merge.
