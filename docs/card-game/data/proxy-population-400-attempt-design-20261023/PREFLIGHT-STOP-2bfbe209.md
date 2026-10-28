# C案 launch edition preflight — stopped on a material finding (2026-10-23)

Tested commit T `2bfbe209215a142b96dea1038adade043cb3039a` (tree `ae915f2f694b974b15ead0d36ccb2116bad06ed1`) — preflight selector `fixed400-checkpoint-preflight.json`.

| Check | Result |
|---|---|
| design check | exit 0, errors [] (`verification/preflight-2bfbe209-design-summary.json`) |
| test-1A connected run | completed, 328 events, 639 s; runtime identical to the f1025fdd edition (`verification/preflight-2bfbe209-connected-summary.json`) |
| checkpoint + gate related tests | 98 OK (`verification/checkpoint-gate-related.log`) |
| full population/mandatory suite | stopped after the material finding below (no result) |
| independent review | **1 material**, 11 minor (`verification/independent-review-2bfbe209.md`, `…-findings.json`) |

## Material finding M1 (reproduced)

`tools/proxy_population_checkpoint_supervisor.py` `_Worker`: the request is written to the child's stdin and the pipe is closed; `finish()` then calls `Popen.communicate()`, which on Python 3.12 (the edition's 3.12.14) raises `ValueError: flush of closed file`. Every completed row would be marked `record_unverified` after the approval was consumed; 0 rows would be saved. Reproduced with the supervisor's own `_Worker` and a trivial child on 3.12.14. The scenario tests used a fake worker and did not reach this path. Fail-closed, but no real launch could succeed.

Per the owner's instruction (stop on a new material problem; only the minimum procedural changes are allowed in this task), no edition E, no publication P and no approval request were created. No claim, supervisor, main merge or Pages update.
