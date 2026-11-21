# Local regression attempts

These failed attempts are retained; CI on the complete checkout is authoritative for completed regression jobs. No production code was changed in response to missing local files.

## puzzle initial wrong cwd

```text
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
  code: 'ENOENT',
✖ naotocchi/prototypes/naopoyo-chapter2/tests/example-replay.test.mjs (82.371727ms)
✖ 14 real session pointer steps, save/undo/retry and all-rescued witness (0.628846ms)
✖ 15 real session pointer steps, save/undo/retry and all-rescued witness (0.246056ms)
✖ 16 real session pointer steps, save/undo/retry and all-rescued witness (0.19182ms)
✖ 17 real session pointer steps, save/undo/retry and all-rescued witness (0.179933ms)
✖ 18 real session pointer steps, save/undo/retry and all-rescued witness (0.14188ms)
✖ 19 real session pointer steps, save/undo/retry and all-rescued witness (0.171401ms)
✖ 20 real session pointer steps, save/undo/retry and all-rescued witness (0.197899ms)
✖ shipped stage19 transient child is visible between its birth and absorption (1.002963ms)
✖ V12 11: old/new complete, normal input, mass, exact Undo/reload, answer identity (1.321312ms)
✖ V12 12: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.124305ms)
✖ V12 13: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.084339ms)
✖ V12 14: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.855906ms)
✖ V12 15: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.14181ms)
✖ V12 16: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.082126ms)
✖ V12 17: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.136312ms)
✖ V12 18: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.082747ms)
✖ V12 19: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.166805ms)
✖ V12 20: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.216105ms)
✖ witnesses exercise split/merge/overflow/swap/rescue/fall Undo (0.48999ms)
✖ all shipped witness split/merge/overflow/rescue/gate outcomes use exact engine results (0.534576ms)
✖ a gravity-triggered split waits until the animated body reaches its actual spike (2.123261ms)
✖ coincident split and later merge keep the intermediate number until the donor arrives (0.373773ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v10-20261028/source-witnesses.json'
✖ naotocchi/prototypes/naopoyo-chapter2/tests/v10-integration.test.mjs (77.17428ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-rescue-design-20261021/source-manifest.json'
✖ naotocchi/prototypes/naopoyo-rescue/tests/sprites.test.mjs (80.058443ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/assets/characters/partners/rock_octopus.png'
✖ preview includes complete relative module graph (78.751111ms)
ℹ tests 1473
ℹ pass 1447
ℹ fail 26
✖ failing tests:
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
    code: 'ENOENT',
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/11.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/12.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/13.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/14.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/15.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/16.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/17.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/18.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/19.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/20.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-gate-v8-20261026/solutions.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/assets/characters/partners/rock_octopus.png'
```

## puzzle sparse

```text
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
  code: 'ENOENT',
✖ prototypes/naopoyo-chapter2/tests/example-replay.test.mjs (69.952152ms)
✖ 14 real session pointer steps, save/undo/retry and all-rescued witness (0.52471ms)
✖ 15 real session pointer steps, save/undo/retry and all-rescued witness (0.1128ms)
✖ 16 real session pointer steps, save/undo/retry and all-rescued witness (0.151037ms)
✖ 17 real session pointer steps, save/undo/retry and all-rescued witness (0.10629ms)
✖ 18 real session pointer steps, save/undo/retry and all-rescued witness (0.075413ms)
✖ 19 real session pointer steps, save/undo/retry and all-rescued witness (0.100201ms)
✖ 20 real session pointer steps, save/undo/retry and all-rescued witness (0.281063ms)
✖ shipped stage19 transient child is visible between its birth and absorption (1.204334ms)
✖ V12 11: old/new complete, normal input, mass, exact Undo/reload, answer identity (3.316175ms)
✖ V12 12: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.250407ms)
✖ V12 13: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.124557ms)
✖ V12 14: old/new complete, normal input, mass, exact Undo/reload, answer identity (4.662221ms)
✖ V12 15: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.243677ms)
✖ V12 16: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.122725ms)
✖ V12 17: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.114142ms)
✖ V12 18: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.110286ms)
✖ V12 19: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.207423ms)
✖ V12 20: old/new complete, normal input, mass, exact Undo/reload, answer identity (0.244648ms)
✖ witnesses exercise split/merge/overflow/swap/rescue/fall Undo (0.687135ms)
✖ all shipped witness split/merge/overflow/rescue/gate outcomes use exact engine results (0.75605ms)
✖ a gravity-triggered split waits until the animated body reaches its actual spike (2.522801ms)
✖ coincident split and later merge keep the intermediate number until the donor arrives (0.568327ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v10-20261028/source-witnesses.json'
✖ prototypes/naopoyo-chapter2/tests/v10-integration.test.mjs (82.970872ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-rescue-design-20261021/source-manifest.json'
✖ prototypes/naopoyo-rescue/tests/sprites.test.mjs (84.16563ms)
Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/assets/characters/partners/rock_octopus.png'
✖ preview includes complete relative module graph (86.359845ms)
ℹ tests 1473
ℹ pass 1447
ℹ fail 26
✖ failing tests:
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v10-20261028/solutions.json'
    code: 'ENOENT',
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/11.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/12.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/13.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/14.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/15.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/16.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/17.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/18.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/19.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-v12-quality/original/20.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/naopoyo-gate-v8-20261026/solutions.json'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/assets/characters/partners/rock_octopus.png'
```

## CARD sparse

```text
✖ every source is real, exact text is preserved, and content hashes match (0.317267ms)
✖ regeneration is deterministic and read-only in check mode (52.497705ms)
✖ historical design sources reject tampering and do not depend on live item arrays (28.42049ms)
✖ jintori text, time and method match the immutable official source (0.952354ms)
✖ 15 searchable chapters retain canonical examples, glossary and exact official sources (3.178286ms)
✖ each provenance heading exists in its untouched source document (0.759654ms)
ℹ tests 572
ℹ pass 566
ℹ fail 6
✖ failing tests:
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/card-game/72-companion-26-card-text-draft.md'
    code: 'ENOENT',
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/card-game/85-play-batch-4-card-text-draft.md'
  Error: ENOENT: no such file or directory, open '/workspace/scratch/7233e688232e/naotocchi/docs/card-game/01-core-rules.md'
```

## Runtime sparse

```text
ℹ tests 32
ℹ pass 32
ℹ fail 0
✖ presenter turns body and head only as presentation and reduced motion suppresses it (1.955056ms)
ℹ tests 24
ℹ pass 23
ℹ fail 1
✖ failing tests:
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/workspace/scratch/7233e688232e/naotocchi/character-3d/runtime.mjs' imported from /workspace/scratch/7233e688232e/naotocchi/tests/social-expression-integration-test.cjs
```

## Pages sparse

```text
FAIL: test_legacy_runtime_is_not_published_but_sources_are_retained (test_naopoyo_publication.NaopoyoPublicationTests.test_legacy_runtime_is_not_published_but_sources_are_retained)
Ran 16 tests in 0.035s
FAILED (failures=1)
```