# ad96 repeated-scene save scope audit

**Diagnosis OPEN; no production cause or fixed/PASS claim.** Read-only source audit at ad96bc539b8bfc2799d1ad8e9790fa5360c0f4ac. Controller reports Character37929709480 / Meguru113817149491 completed FAILURE after all three cycles reached forest READY, then `validateRepeated` rejected `unchanged save`. Artifact11615707537 is not yet recovered in this audit. No code edits, reproduction, tests, capture, or protected-gameplay changes.

## Established source observations

- `tools/character-3d/runtime-integration.cjs:175–177` captures state JSON, stored-save JSON and write count before baseline readiness and natural warmup. It holds `run.sim.step`, not application timers, queued saves or region-load APIs.
- At193–194 each warmup/cycle directly sets saved region to city, calls normal `run.enterWorld('city')`, then restores forest via normal enterWorld and restores the fixture player/camera/party placement. Returning the region field to forest does not undo other natural region-load effects.
- `meguru.js:8316–8322` enterWorld calls `loadMapRecords(regionId)`. At7898–7903 that function calls bridge.seedMapRecords when zones/paths/marks records are missing and persistence is enabled. Normal QA route has persistOk=true (`meguru.js:7889`); it is not the special expression-QA persistence-disabled route.
- `script.js:14628–14631` reports absent per-region map bags as null. `script.js:14680–14688` seedMapRecords adds missing lifetime.meguru zones/paths/marks region arrays and calls normal saveState when any were added, including empty seeded arrays. This is an explicit protected application migration path, independent of sim.step and Character renderer.
- Existing makeSave (`tools/character-3d/meguru-qa.cjs:24–37`) supplies the normal saved actor/region fixture without explicit city-map pre-seeding. Actual pre-warmup runtime map contents remain unknown until evidence is available; this source observation does not establish that city bags were absent in the failed run.
- Protected app has queued map saves (`script.js:14548–14555`) and its own interval (`script.js:18890`). Holding Meguru simulation alone does not prove whole asynchronous save immutability.
- Resource baseline already occurs AFTER completed warmup (`runtime-integration.cjs:210`), whereas save/storage/write baseline occurs before it. All three strict resource cycles follow at211. Validation at60–77 checks readiness, exact composition, off cleanup, city cache identity, forest live/holder count, no fallback, warm plateau, created/removed balance, then save/storage/getter/write invariance and restoration.
- `git diff ae9 HEAD` for script.js, meguru.js, meguru-3d.mjs and character-3d/runtime.mjs is empty. This audit finds no protected production change to attribute the failure to.

## Strong hypothesis, still unproven

First city entry may legitimately initialize missing lifetime.meguru map records and write the save during warmup. This would fail the current pre-warmup whole-span state/storage/write assertion after all renderer/resource checks succeeded. The first natural transition is a concrete possible confounder, not proof that the observed failure came from it. Application timers, earlier queued saves, saveState side effects or an actual synchronous/deferred presentation mutation remain distinguishable alternatives.

## Evidence gap and questions for recovered artifact

The repeated callback currently returns unchanged flags, write counts, phase snapshots and restored flags, but not full before/after state/storage values, saveDelta or the installed save-event call stacks. Phase snapshots contain savedRegion only. Therefore the recovered JSON can establish which flags/resources failed, but may still lack causal field/write provenance.

1. Does the artifact retain all three samples and final after/restored records, with all composition/cleanup/cache/plateau checks satisfied? Retain the actual failed source verdict.
2. Which unchanged flags are false, and did write count increase? Were getter/step/region restored? A save-only delta and a persisted write are distinct failures.
3. Are city zones/paths/marks already present before warmup? What exact state/storage fields changed, and at which warmup/cycle phase? Do saved call stacks point to loadMapRecords→seedMapRecords→saveState, normal timer/record work, or presentation?
4. Are any deltas/write calls produced synchronously inside draw, renderer flag changes, cache/disposal or reset boundaries? Clean synchronous boundaries cannot by themselves attribute a later asynchronous write.
5. Did warmup finish its normal migrations/queued save before a strict-cycle snapshot, or is an application operation still pending? No blanket attribution of unknown asynchronous changes to normal gameplay is warranted.

## Conditional assessment of proposed warmup contract

Design.md:7 protects save/gameplay/World; design.md:33 requires runtime no-state-mutation evidence. Plan.md:11/42 likewise protects inputs and shared actor/save contracts. They do not require suppressing normal application region migration to manufacture a renderer result.

Subject to actual failed-artifact diagnosis, aligning strict save/storage/write baseline with the existing POST-warmup resource baseline is a truthful scoped contract: record the warmup original before/after field/storage deltas and write-event provenance explicitly, then require unchanged state bytes, stored bytes, getter identity and write count across all three identical subsequent cycles. Keep every exact-composition, cleanup, city-cache, plateau, actor-count and restoration check.

Conditions: strict synchronous presentation-boundary proofs must cover warmup as well as subsequent cycles, including all actual renderer draws/flag effects; dirty constituent evidence must remain fatal even if aggregate flags claim clean. Natural enterWorld/application operations must be labelled separately from presentation. Preserve warmup mutations in evidence rather than restoring or deleting their save fields. No suppression of writes, bridge-getter replacement, state normalization, city-data pre-seeding or protected changes. An unresolved asynchronous warmup delta must not be declared presentation-safe merely because its timing is outside a synchronous proof. Continued strict-cycle changes must fail and be diagnosed, rather than waived.

This is a conditional contract assessment, not an implementation recommendation or confirmed cause. Recover the failed artifact first; if it lacks causal deltas/events, a narrow read-only diagnostic observation is necessary before attributing or resolving the failure. Human/device/image decisions remain unaffected.
