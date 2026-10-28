# fixed400 final preflight — review resolution (tested commit f1025fdd)

Independent review of the runtime diff 873e8cd2..f1025fdd (25 files, tests excluded): `UNRESOLVED MATERIAL FINDINGS: 0`.

Two minor findings were reported. Both are fail-closed (they can only stop a match, never let a wrong result pass). They are accepted without a code change, because changing code now would create a new, undiagnosed edition:

- F1 `tools/proxy_population_history_replay.py:313` — the history-replay scope replaces, instead of chaining, the chain-resolution history verifier. Past I-c_coin2 / G-hit-blow resolutions then end as unresolved provenance, which is a stop. Possible liveness cost only. On the diagnosed edition 44d54844 (identical runtime to f1025fdd except the one-line preflight selector), all 400 fixed matches completed, so no fixed-400 row hits that stop.
- F2 `tools/proxy_population_trigger_connection.py:65` — the start-effect origin check is a bounded range bound to the captured start group, the turn player and the turn_start window, instead of exact equality. The reviewer found no path where a wrong result passes.

Neither finding changes a legal candidate set or a game rule. They remain recorded here for later regression work.
