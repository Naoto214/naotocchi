# 165 新seed4経路の次手番たまご交換

[165 TDD計画](plans/2026-09-25-new-seed-egg-restart-165.md)に従い、164の4経路で116の合法候補集合とseeded fallbackを再適用した。01-A/Bと02-Aは7候補、02-Bは8候補。各経路で手札1枚を山札下へ戻し、次の開始時誘発・response窓へ進めた。C-chickenの開始時発動候補は次の横断監査に残し、先回りして選択・解決していない。

新decision/event/snapshot各4、completed0、独立balance標本0。source raw SHA、seed proof、event seq、game/continuation hash連鎖、最終state/hash、canonical bytes、専用2テストと設計データerrors空を確認する。カード本文・数値・登録区分変更0。

全proxy回帰は別の不変158 snapshotで54ファイル・458件を完走、457 PASS／1 FAIL／ERROR 0。唯一のFAILは既知の117旧テストで`proxy_test_count`期待190・実測263。159〜165の追加専用テストは各checkpointで通過したが、165 HEADの全proxy回帰は未実施として区別する。
