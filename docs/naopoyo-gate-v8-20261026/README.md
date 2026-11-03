# VERSION 8 — gate interior and upper surface

## Canonical rules

Only chapter2 opts into `terrainRules: magic-gate-v2` (revision 5). V7 and older engine selectors retain their semantics. No board geometry was changed.

A gate at integer cell `(x,y)` has two distinct properties:
- Interior occupancy: an actor's number must match the gate, before entry AND after merge/overflow/exchange/split.
- Upper contact face: the boundary between cell `(x,y-1)` and `(x,y)` is solid for every number. An actor in `(x,y-1)` stands on the gate. A matching actor in `(x,y)` is inside, not on top, and can leave laterally or fall through its open bottom. The solid roof cannot be crossed directly from either side.

Upward movement requires support below both the departure and destination, excluding the moving actor itself. Rock, board boundary, another actor, or a gate roof can supply support. Stars and spikes do not. Normal gravity resolves actors after entry, exchange, merge and split.

Diagonal corner clearance tests two orthogonal routes between the adjacent cells. At least one complete route must be open. Each route checks terrain occupancy and the same upper gate boundary. This generalizes the previous two-blocked-sides rule: a matching gate is open sideways but its roof closes the route through the arch's upper edge. A neighboring rock can close the other route. No stage number, screen edge or actor number exception exists.

For the reported stage19 pocket `(7,7)`, rock `(7,6)` prevents going straight up; gate `(6,7)` plus that rock prevents the diagonal to `(6,6)`. The 8 may enter `(6,7)` from the side, leave left to `(5,7)`, and climb around the open corner onto `(6,6)`. A 1–7 cannot enter the gate, but can climb the same open corner from `(5,7)`.

The same face predicate is used by support and movement/falling. There is no stored 'on gate' flag or directional gravity exception. A settled state above the gate remains settled; a matching actor inside it remains a valid distinct position. Existing cycle detection and transactional rollback are retained.

## Appearance

The adopted stone arch A, pillar joints, colors, 240 ms veil and reduced-motion behavior are preserved. The central number is always drawn at local `(0.50,0.57)`, size `0.49` cell, once behind actors. Occupancy changes stone translucency but never glyph coordinates/size. Actor head numbers retain their existing foreground position. Pillar/lower-anchor relocation and the second foreground gate-number pass are removed.

## Compatibility

Chapter1, main Runtime, CARD GAME, original images and PR445 are not directly edited. The shared engine is opt-in. Pages allowlist updates only the reviewed hash of the engine, with no new runtime dependency. This is preparation on the Draft branch; production Pages is not deployed.

New normal/QA save namespace: `naopoyo.komorebi.gate-surface.20261026.v1[.qa]`. Old pilot/supported/contact/magic-rock clear and unlock markers are read and retained byte-for-byte. Old in-progress boards and Undo snapshots stay in their old namespace and are not reinterpreted. New snapshots require the exact terrain rule. Formal integration must retain this version isolation and rerun the same chapter1/legacy regressions.

## Verification and limitations

- Baseline chapter2: 201/201. New physics RED and central-number/save-migration RED evidence retained.
- The old witnesses were replayed explicitly: 11–19 still complete; 20's 60-move witness is rejected at index 12 (`corner`).
- Fresh searches and bounded shortening are reproducible with `design/gate-v8-{search,workshop,adopt,quality}.mjs`. See `solutions.json` and `evidence/` for exact outcomes and limits. Bounded greedy/shortening do not prove shortest paths.
- The user's textual stage19 reproduction is encoded as a regression fixture; the original iPhone screenshot was not attached in this Work. Actual iPhone Safari QA remains for the owner.
- Machine rendering/browser observations and Node session tests are not iPhone device QA.

## iPhone checks

Open the existing owner-private QA URL; confirm VERSION 8. Choose 19. Check that matching 8 can pass sideways and all numbers can stand on a gate roof; the right pocket cannot escape through the overhead rock or the closed diagonal. Observe unchanged central digits during passage/climbing; actor occlusion is expected. Try continuous drag, Undo, retry and reload. Choose 20 and check normal gravity. QA records are isolated from normal play and production.

## Current witness results

|Stage|Accepted moves|Shortest proven|
|---|---:|---|
|11|5|yes|
|12|5|yes|
|13|10|yes|
|14|11|yes|
|15|23|no|
|16|25|no|
|17|26|no|
|18|20|no|
|19|71|no|
|20|71|no|

19/20 fresh search used no old-witness seed. Feature-removal BFS exhausted19 without splitting (69states),20 without splitting (80states), and20 without merging/overflow (1state each). These demonstrate mechanics still matter, not human difficulty. Other19 restrictions and under20-move searches reached limits; absence of a shortcut is NOT proved.

Independent read-only review found no Critical/Important defect;62 focused tests and all10 witnesses passed independently. Local chapter2 231/231. Some legacy/CARD wall-clock limits failed under this environment; original evidence is retained and latest GitHub CI must resolve before completion. Deployment and final CI evidence are added to the PR after they finish.
