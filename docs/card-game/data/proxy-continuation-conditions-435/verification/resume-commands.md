# 435 fresh verification commands

Basis: d0cc91394a62ac2c93b21f82d8b3accc1fa3c818 / tree 85f62b98b3e52095ec30b0a31fa9c27f955c0639.
Fresh clone; no previous local workspace was available. Previous local byte comparison cannot be claimed. GitHub saved source was syntax checked and executed directly; no production/tool/test code changes.

- `python -m compileall -q` on the four 435 source/test files.
- `python docs/card-game/tools/proxy_continuation_condition_runner.py --output docs/card-game/data/proxy-continuation-conditions-435`
- Same runner into a separate scratch output; paired compressed bytes and manifest identical.
- Combined unittest modules: the 22 named in 434 verification/combined-tests.log plus test_proxy_continuation_conditions and test_proxy_continuation_condition_runner; PYTHONPATH=docs/card-game/tools, -v.
- `npm test`
- `python docs/card-game/tools/check-design-data.py`
- `python docs/card-game/tools/check-design-data.py --catalog`
- validate_protected against protected-data-baseline.json (505 entries); all historical tracked data compared with git HEAD; manifest execution sources SHA256; 82 proofs independently revalidated against full saved snapshots.

No additional independent review: the recorded one review and fixes are preserved. 112 remains unexecuted, independent balance 0, policy not promoted, PR259 Draft/open/unmerged.
