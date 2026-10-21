# 3D System — bounded major-development closeout

Authority: user instruction, 2026-10-13 JST. Final integration record: [PR #379](https://github.com/Naoto214/naotocchi/pull/379); its live merge state and exact-HEAD CI links determine whether integration gates are complete. This document does not predeclare a pending merge or CI run successful.

## Fixed scope

- All 293 Character 3D models and all 13 World regions are implemented. Preserve approved Naoto/deer forms and the existing architecture.
- Normal URL starts World + Character 3D. No settings switch. Explicit legacy2D/same-world Canvas/billboard QA flags remain.
- Failure/timeout/WebGL absence/shader/draw/resize/context loss retain the same simulation, world, player, party, collision and save in Canvas. No automatic 3D retry until reload.
- Landscape pad **184×120 CSS px**, current placement/input, lower whitespace: formally Human-approved. No adaptive/140/160px work.
- Portrait, accepted camera and canvas, gameplay/save/schema, PNG/Expression/Motion/Relationship are protected.

## Integration and verification record

- Character rollout PR #376 is merged. World/Character integration PR #377 is merged at `499eee66714ad7f33ba7ecd881aa757ba92d0bd7`; #378 records that integration. Parent World #374 was closed after inclusion in #377, not separately merged. Do not reopen those integration lanes.
- PR #379 is both the default-3D PR and landscape camera/pad candidate; no second standard-display PR is required. Starting HEAD `75218480e537c68536ffd4ae0bd412879b8d0102`, tree `0974f48244e3bc6b472d15fa7f4a27cb5df1aa4f`; main `e98b35e148ba6fa84a1013946f29ec2b3a0f585b`.
- Freshly inspected starting CI: Runtime 38355686593, Home 38355686617 (two jobs), World 38355679535 (six jobs), all SUCCESS on exact starting HEAD.
- This closeout changes documentation and CI coverage only. Product bytes stay identical to the accepted candidate. World CI now also runs on main and explicitly runs the existing 9-case integration mutation runner in sequence.
- Before merge: full npm test, focused startup/routing/2D-protection/Character coverage, startup mutation 12, camera mutation 3, integration mutation 9; Home includes pad mutation 3 and paired canvas/camera/input checks. World browser gates cover 13 regions, visibility/contact/occlusion/collision/cleanup, 27 actors, startup races, real shader/context faults and state-preserving Canvas fallback.
- Required final gates: Runtime/Home/World success on the final PR candidate, then on merged main; expected-SHA merge; fresh main HEAD/tree and protected-file comparison. Exact run outcomes and SHAs are recorded in PR #379 to avoid a self-referential evidence commit loop.

## Physical QA and remaining limits

The [physical status table](default-3d-20261012/README.md) is authoritative. Pad approval and favorable appearance reports are real observations. Full 13-region/27-actor/fault-injection/repeated-rotation/10-minute physical matrices and memory/thermal/performance metrics remain NOT_RUN/unmeasured. Desktop software WebGL is not iPhone performance evidence.

No major unresolved defect is identified in the accepted candidate and its saved automated evidence; final gates must still pass. Any fresh failure must be investigated and cannot be relabelled PASS. Historical cancelled/failed CI remains historical evidence.

## Stop condition and optional future work

Once #379 is merged and final main CI passes, mark major 3D System development complete and stop. Unperformed physical QA remains explicitly listed; it is not claimed completed. Do not add new completion gates for minor art differences or small preference adjustments.

Optional future Quality Pass: vending-machine face/readability and other minor art refinements, only upon a new request. Performance changes require measured evidence. Adaptive pad sizing is explicitly declined, not an active backlog item. Continue other systems independently; PR #380/card-game work is outside this closeout.
