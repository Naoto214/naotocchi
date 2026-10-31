# V8 continuation, 2026-10-29

Start #462 HEAD fce64e0ab36a07f1684fd755bacec33f640d3553; inherited uncommitted QA/build changes retained.

- Existing isolated worktree: work/home-v8-20261029. Executing the existing plan inline; no rebuilding completed assets.
- Reclaimed 3.08 GB by sparse-removing 27,792 verified unchanged tracked copies under /workspace/scratch/65e64208f0d1/naotocchi/{docs,prototypes}. All hashes matched HEAD and every restore blob exists locally. Two untracked temporary files retained with identical SHA256. Git history retained; restore via git sparse-checkout disable.
- Deleted two incomplete generated gzip packaging temporaries only, after gzip validation failed; retained complete package and source tree.
- V7 CI connector first page still returns 30 queued jobs; not a full 35-job census.
- Cloud Chrome star-new 320: all six day/night × 1/6/28 tests pass with rotation, movement, visibility, fixed UI, save reload.
- Cloud Chrome star-new 375: first attempt timed out at browser protocol level; repeated in a fresh tab, all six conditions pass unchanged. Transient timeout is not a terrain failure and its root cause is unconfirmed.
- Ruling: restored all 34 inherited formatting-only modifications to prior Site files after AST-equality checks, preserving v7 served bytes. V8 packaging must not compact prior releases.
- Complete npm suite from inherited run: later 3177-test batch has 17 failures, several sparse missing fixtures/assets. Not reported as green. Further failure inventory follows.
