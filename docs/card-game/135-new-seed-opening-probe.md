# 新seedの初手基盤耐性探索（135）

保存元: 134と独立新seed移行監査を含むブランチHEAD `dd29d39606bd582ccb7742377ceead821623b40b`。新seedプローブには旧4経路を再投入しない（全proxy回帰検査では既存テストを実行）。探索の設計は `plans/2026-09-24-new-seed-opening-probe.md`、再生成器は `tools/proxy_independent_seed_probe.py`、保存証拠は `data/proxy-independent-seed-probe-20260924.json`。

107のA/B各40枚の個体を保持し、115と同じshuffleで新seedを2組事前固定した。各順序につき先後を交換した4経路をすべて保存した。元fixtureのcanonical SHA-256は `30c1bbb67fbc762c94a78c05bfc14c8a12c1418b39eab161b3366560a59aeac8`。7候補のR1たまご交換は116のseed証明と114の意思決定・公開情報検査を通し、イベントseq 1、2とスナップショットseq 0、1、2を連鎖させた。

| 経路 | A/B seed | 選択copy | R1終了state SHA-256 | 停止 |
| --- | --- | --- | --- | --- |
| probe-01-a-first | 2026092401 / 2026092402 | A-026 | `591f9cc38e48f73fa35b6ee84b966de82f541a61a6154962be409689bf540e8a` | post-egg response |
| probe-01-b-first | 2026092401 / 2026092402 | B-007 | `551dbe269f9d2e78a93d2a62fdbd6e276ca58007bff335677c6c122654b04ef9` | post-egg response |
| probe-02-a-first | 2026092403 / 2026092404 | A-040 | `8ba16050e14986509bd6155b49985de8bae4ec0dd1cd51adf30006f3d0a72e86` | post-egg response |
| probe-02-b-first | 2026092403 / 2026092404 | B-011 | `6d4398b6bcf4980e2823ecfca8b2543689c8a8138bd4ecbae1f671f8ad80ba38` | post-egg response |

集計: planned 4、completed 0、rules stop 4 (`unproved_post_egg_response_window`)、winner 0、独立balance標本0。R1交換後のresponse候補完全性とターン進行を未知順では証明できず、先回りして解決していない。初手7候補が完全でも、対戦全体の候補完全性・勝率・先後差は主張できない。既存134の4経路completedは履歴として維持し、これらの新経路とは合算しない。カード本文・数値・登録区分変更0、既存停止証拠/state/hash変更0。

検証: 専用テスト4件PASS（任意の将来seed受付、改ざん拒否を含む）、保存JSONの `--check` 一致、設計データ検査errors空、`git diff --check` 異常なし。全34 proxyテストファイルを個別プロセスで実行し、合計411件中410件PASS、FAIL 1件、ERROR 0件。唯一のFAILは117旧テスト `test_population_and_checkpoint_112_boundaries_remain_unchanged` の件数期待値差（期待190、実測263）で、134検証時からの既知問題。新規failureは0件。全件GREENとは扱わない。134の保存JSON検査は全proxy内の該当テストでPASSを確認した。
