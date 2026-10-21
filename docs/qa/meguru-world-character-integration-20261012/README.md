# World × Character 3D — combined-source integration candidate (2026-10-12 JST)

Status: **QA CANDIDATE, NOT APPROVED FOR MAIN.** Physical iPhone: **NOT_RUN**.

## Frozen inputs
- main Character merge: `249a954f09f70f124eb5e7243283c0fd4f8a4098`
- World stack tip PR #374: `e56332de0e400af6377f28c0a0afe9ac42e2da1d`
- merge base: `591b9def6a88733721249f80d3138087d00764f0`
- isolated integration branch: `integration/world-character-3d-20261012`
- immutable resolved source blobs: index `9062d7d5834ced9e7035b20bd0336134ee9f4075`, 3D `de1eb17db4c13801a49710010e37bc20310b64a8`, meguru `68c85de985c3b57f8212cb258665c3b8a364152d`.
- combined test: `tests/world-character-integration-test.cjs` + union of both npm test lists.

## Merge construction
The three-way Git tree comparison (base, main, World) identifies exactly four common changed files: `index.html`, `meguru-3d.mjs`, `meguru.js`, and `package.json`. Nonconflicting changes from main and World were preserved using content-addressed Git objects, not blanket ours/theirs. Merged recursive-tree audit verified 18,163 nonconflicting blobs unchanged against their appropriate main/World source. Explicitly combined 4 overlapping files.

- `index.html`: both runtime script dependencies retained; meguru and meguru-3d cache tokens point to resolved source SHA prefixes.
- `meguru.js`: World quietMark/mapSpotShown + main Resident Expression/QA API retained; 27 additional nonoverlapping main hunks.
- `package.json`: World + main test union plus dedicated combined integration tests. Do not delete either lane's regression tests.
- `meguru-3d.mjs`: World terrain/ground, ghost/fade/adaptive-DPR, visibility and region/corridor logic + Character presenter, face control, fallback, actor cleanup and diagnostic features. Uses one `walkY` value for presenter groundY, 3D footprint shadow and 2D billboard/foot shadow. World player-visible probe examines active 3D body when intentionally hidden 2D billboard, but never claims pixel/occlusion is measured; World ray diagnostics remain distinct.

**Important:** Source-level syntax audit was done, but actual combined Node/browser tests, mutation, Runtime/Home/World CI and device QA were **NOT_RUN at candidate creation**. GitHub PR CI must supply source-bound evidence before merge. Tests must not be treated as PASS solely because they are authored.

## Acceptance gates
- Dedicated World/Character/integration tests + relevant mutations, full regression, Runtime/Home/World CI.
- Active 3D visibility true only for valid body; hidden/detached/degenerate fail; fallback to 2D; camera/frustum/ray/occlusion keep semantics.
- Ground-contact on terrain/bridge, World/Character scene reset/despawn, corridor and region switching, collision/13 regions, 2D URL opt-out and save/schema stability.
- Independent review of all 4 resolved files; recheck fresh main and PR heads before final merge.
- iPhone Safari performance remains **NOT_RUN**, explicitly deferred for post-merge Human QA. Do not mislabel it PASS.
- Parent World PR stack (#367, #369, #371, #374) must not be mechanically merged into main without satisfying combined-source gates.

## Non-goals
Do not modify production Pages, card game, Character models, image assets or 2D/save/schema contracts as part of conflict resolution.
