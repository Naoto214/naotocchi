# Local regression attempts
Sparse checkout omitted historical documents/assets/runtime modules. No failing tests were deleted or disabled. Full-checkout GitHub CI is authoritative for these unchanged dependency trees.

## formal-tests.log
```
Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ prototypes/naopoyo-chapter2/tests/example-replay.test.mjs (108.960552ms)
✖ 14 real session pointer steps, save/undo/retry and all-rescued witness (0.958984ms)
✖ 15 real session pointer steps, save/undo/retry and all-rescued witness (0.173832ms)
✖ 16 real session pointer steps, save/undo/retry and all-rescued witness (0.316307ms)
✖ 17 real session pointer steps, save/undo/retry and all-rescued witness (0.167613ms)
✖ 18 real session pointer steps, save/undo/retry and all-rescued witness (0.128384ms)
✖ 19 real session pointer steps, save/undo/retry and all-rescued witness (0.103326ms)
✖ 20 real session pointer steps, save/undo/retry and all-rescued witness (0.145679ms)
✖ shipped stage19 transient child is visible between its birth and absorption (1.699449ms)
✖ V12 11: old/new complete, normal input, mass, exact Undo/reload, answer identity (2.315557ms)
✖ V12 12: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.185199ms)
✖ V12 13: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.118629ms)
✖ V12 14: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.18577ms)
✖ V12 15: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.136566ms)
✖ V12 16: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.137788ms)
✖ V12 17: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.114081ms)
✖ V12 18: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.163797ms)
✖ V12 19: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.245389ms)
✖ V12 20: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.237408ms)
✖ witnesses exercise split/merge/overflow/swap/rescue/fall Undo (0.529467ms)
✖ all shipped witness split/merge/overflow/rescue/gate outcomes use exact engine results (0.602848ms)
✖ a gravity-triggered split waits until the animated body reaches its actual spike (2.076727ms)
✖ coincident split and later merge keep the intermediate number until the donor arrives (0.655337ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/source-witnesses.json'
✖ prototypes/naopoyo-chapter2/tests/v10-integration.test.mjs (104.18777ms)
ℹ tests 1223
ℹ pass 1199
ℹ fail 24
✖ failing tests:
✖ prototypes/naopoyo-chapter2/tests/example-replay.test.mjs (108.960552ms)
✖ 14 real session pointer steps, save/undo/retry and all-rescued witness (0.958984ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ 15 real session pointer steps, save/undo/retry and all-rescued witness (0.173832ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ 16 real session pointer steps, save/undo/retry and all-rescued witness (0.316307ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ 17 real session pointer steps, save/undo/retry and all-rescued witness (0.167613ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ 18 real session pointer steps, save/undo/retry and all-rescued witness (0.128384ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ 19 real session pointer steps, save/undo/retry and all-rescued witness (0.103326ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ 20 real session pointer steps, save/undo/retry and all-rescued witness (0.145679ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ shipped stage19 transient child is visible between its birth and absorption (1.699449ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ V12 11: old/new complete, normal input, mass, exact Undo/reload, answer identity (2.315557ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/11.json'
✖ V12 12: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.185199ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/12.json'
✖ V12 13: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.118629ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/13.json'
✖ V12 14: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.18577ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/14.json'
✖ V12 15: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.136566ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/15.json'
✖ V12 16: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.137788ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/16.json'
✖ V12 17: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.114081ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/17.json'
✖ V12 18: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.163797ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/18.json'
✖ V12 19: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.245389ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/19.json'
✖ V12 20: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.237408ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/20.json'
✖ witnesses exercise split/merge/overflow/swap/rescue/fall Undo (0.529467ms)
✖ all shipped witness split/merge/overflow/rescue/gate outcomes use exact engine results (0.602848ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
✖ a gravity-triggered split waits until the animated body reaches its actual spike (2.076727ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-gate-v8-20261026/solutions.json'
✖ coincident split and later merge keep the intermediate number until the donor arrives (0.655337ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-gate-v8-20261026/solutions.json'
✖ prototypes/naopoyo-chapter2/tests/v10-integration.test.mjs (104.18777ms)
```

## formal-tests2.log
```
✖ V12 11: old/new complete, normal input, mass, exact Undo/reload, answer identity (1.397272ms)
✖ V12 12: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.134582ms)
✖ V12 13: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.117858ms)
✖ V12 14: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.169926ms)
✖ V12 15: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.169616ms)
✖ V12 16: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.127262ms)
✖ V12 17: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.139319ms)
✖ V12 18: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.110336ms)
✖ V12 19: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.124277ms)
✖ V12 20: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.216025ms)
✖ witnesses exercise split/merge/overflow/swap/rescue/fall Undo (0.647524ms)
ℹ tests 1247
ℹ pass 1236
ℹ fail 11
✖ failing tests:
✖ V12 11: old/new complete, normal input, mass, exact Undo/reload, answer identity (1.397272ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/11.json'
✖ V12 12: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.134582ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/12.json'
✖ V12 13: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.117858ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/13.json'
✖ V12 14: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.169926ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/14.json'
✖ V12 15: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.169616ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/15.json'
✖ V12 16: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.127262ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/16.json'
✖ V12 17: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.139319ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/17.json'
✖ V12 18: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.110336ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/18.json'
✖ V12 19: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.124277ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/19.json'
✖ V12 20: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.216025ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-v12-quality/original/20.json'
✖ witnesses exercise split/merge/overflow/swap/rescue/fall Undo (0.647524ms)
```

## formal-tests3.log
```
Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/naopoyo-rescue-design-20261021/source-manifest.json'
✖ prototypes/naopoyo-rescue/tests/sprites.test.mjs (71.880452ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/assets/characters/partners/rock_octopus.png'
✖ preview includes complete relative module graph (76.486589ms)
ℹ tests 1497
ℹ pass 1495
ℹ fail 2
✖ failing tests:
✖ prototypes/naopoyo-rescue/tests/sprites.test.mjs (71.880452ms)
✖ preview includes complete relative module graph (76.486589ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/assets/characters/partners/rock_octopus.png'
```

## card-tests.log
```
✖ every source is real, exact text is preserved, and content hashes match (0.29886ms)
✖ regeneration is deterministic and read-only in check mode (53.124008ms)
✖ historical design sources reject tampering and do not depend on live item arrays (34.238376ms)
✖ jintori text, time and method match the immutable official source (1.302452ms)
✖ 15 searchable chapters retain canonical examples, glossary and exact official sources (3.376676ms)
✖ each provenance heading exists in its untouched source document (0.65066ms)
ℹ tests 572
ℹ pass 566
ℹ fail 6
✖ failing tests:
✖ every source is real, exact text is preserved, and content hashes match (0.29886ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/card-game/72-companion-26-card-text-draft.md'
✖ regeneration is deterministic and read-only in check mode (53.124008ms)
✖ historical design sources reject tampering and do not depend on live item arrays (34.238376ms)
✖ jintori text, time and method match the immutable official source (1.302452ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/card-game/85-play-batch-4-card-text-draft.md'
✖ 15 searchable chapters retain canonical examples, glossary and exact official sources (3.376676ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/card-game/01-core-rules.md'
✖ each provenance heading exists in its untouched source document (0.65066ms)
  Error: ENOENT: no such file or directory, open '/workspace/scratch/8bb2671955f3/naotocchi/docs/card-game/01-core-rules.md'
```

## runtime-tests.log
```
ℹ tests 32
ℹ pass 32
ℹ fail 0
✖ presenter turns body and head only as presentation and reduced motion suppresses it (1.214959ms)
ℹ tests 24
ℹ pass 23
ℹ fail 1
✖ failing tests:
✖ presenter turns body and head only as presentation and reduced motion suppresses it (1.214959ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/workspace/scratch/8bb2671955f3/naotocchi/character-3d/runtime.mjs' imported from /workspace/scratch/8bb2671955f3/naotocchi/tests/social-expression-integration-test.cjs
```

## pages-tests.log
```
Ran 16 tests in 0.039s
FAILED (failures=1)
```

## pages-tests2.log
```
Ran 16 tests in 0.032s
OK
```
