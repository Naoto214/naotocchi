# Scene save observability and independent metrics review

Reviewed clean worker head `051e22ab513dfdb305ec7e3c8c8f99298e1bec26` against `494e426b` in `/workspace/scratch/150320e8a2fd/rollout-runtime-scene-save-observability`, plus root's separate two-line metrics-independence workflow correction and its test in the dirty main worktree. Read exact diffs, diagnostic report/audit, tests/control code and final/identity/restore logs. No implementation edits or broad replay.

**Diagnostic-slice result: C0 / I0.** Suitable for cause collection. This is not final scene gate closure; the constituent-boundary limitation below is material to any future acceptance.

## Diagnostic behavior

- Observations retain original raw saved state/storage before and after, full field/storage deltas, write counts, available key/time/stack events and event-cap disclosure. Every readiness/warmup/cycle phase and cleanup records differences in finally, including when natural entry/readiness throws. The scopes correctly include existing QA region assignments and natural application operations and do not label an unknown asynchronous write as presentation-safe.
- Every synchronous renderer draw and character flag call is bracketed by the existing read-only save boundary helper. Dirty proofs are retained and logged with phase and available call provenance, not filtered away. Save writes still invoke the normal storage call, and counters remain exact even after the256-event provenance limit. No save/getter replacement, normalization, pre-seeding, deleted fields or state reset is introduced.
- The original saved-state/storage/write baseline remains before baseline readiness and warmup. `validateRepeated` remains exact. A one-time warmup city initialization therefore still fails the existing whole-span save assertion; this diagnostic patch does not turn that failure into PASS. Existing exact roster, off cleanup, hidden city identity/cache, forest count, resource plateau and restoration requirements remain.
- Draw and flag methods are restored in nested finally even if cleanup observation fails. Step/region restoration and corresponding diagnostics remain. Browser helper globals are deleted in finally, including evaluate failure. Tests verify primary city-load/readiness errors retain their deltas and cleanup changes and do not leak adapters.
- The actual protected seed API test establishes that a first missing-city bag can change state and call normal storage, while repeated seed does not overwrite it or make a new write. This supports a possible source confounder, not attribution of the actualad96 failure. Actual phase deltas/stacks remain needed.
- Four worker files are QA-only. Exact diff and fourteen-function identity evidence preserve validators, functional45/Author, boundary helpers, storage collector and native animation/appearance metrics. No production/model/registry/Expression/animation/gameplay/renderer/World/Home/save/2D behavior changes.

## Material acceptance limitation — diagnostic boundaries are not an aggregate gate

The newly recorded scene `boundaries` are **diagnostic only**. Unlike the functional route, `validateRepeated` does not assert every constituent's save/storage/getter/write flags or the new draw/flag restoration fields. A transient renderer state mutation subsequently undone before the final whole-span comparison can leave `unchanged` true while a dirty constituent proof remains in the result. Dirty proofs also emit browser console errors, but that is not a substitute for an explicit constituent validation contract.

This is not a blocker to the explicitly authorized diagnostic capture, which preserves the evidence and changes no acceptance rule. It is a blocker to interpreting a later validator/CI PASS alone as proof that every presentation boundary is clean. Root must inspect every boundary now. Any subsequent warmup-contract adjustment or final scene acceptance must require every dirty constituent to remain fatal even if aggregate flags claim clean, and require restored renderer adapters. No unknown asynchronous delta is forgiven by its location outside a synchronous boundary.

## Separate root workflow correction

The existing repeated scene step gains `id: repeated_scene`. Native no-capture1/5/27 metrics run when the integration/runtime marker is active and either prior steps succeeded or that scene step concluded failure. A failed scene step remains failed: no continue-on-error or scene-verdict waiver is added. Failed setup/skipped or cancelled scene cases do not satisfy the tested condition. This permits separate metrics artifacts after a completed scene failure without treating them as scene evidence. Ordinary routing and capture commands are unchanged.

## Verification

Independent worker focused check:

```sh
node --test --test-reporter=tap --test-name-pattern='scene save diagnostics|scene browser helper|real first-city' tests/character-3d-runtime-scene-diagnostics-test.cjs tests/character-3d-runtime-save-boundary-test.cjs
```

**5/5 PASS, 263.582786 ms.** Real seed, phase evidence, dirty draw/flag proof retention, throwing transition cleanup and browser serialization/restoration checks pass. Reused worker final18PASS plus unchanged nine integrationPASS; four scoped assertion RED controls restore exact helper bytes. Independently checked helper SHA256 `beaf70bd332bb1594819e7f6b773819f4dbfe160eb74c1952c6fca83afe40d87`, clean worker status and diff check.

Root workflow independently parses with PyYAML: **18 jobs**. Focused native-metrics condition test: **1/1 PASS,197.100113 ms**, covering integration/runtime markers with success/failure/skipped/cancelled scene status and ordinary mode. Root's remaining unchanged seven routing-test PASS evidence is reused; no broad suite or capture rerun.

## Open gates

No cosmetic minor. Actualad96 save failure cause remains unproven; observed20→23 writes without prior deltas do not establish which API caused them. The new scene-only CI must retain and expose actual phase/raw/call evidence, then root must assess every boundary and the unchanged failed/success verdict. Native metrics remain separate, software-rendered observations; no image, Human, iPhone or final scene approval is inferred.
