# 134 全proxy回帰検証

134保存HEAD `4247537c30c465f4c108d3eacebdce0b3f807197`、tree `dab8993fe4910aa919ba64afe6c2d30ca9021ab6`を基準に、全proxyテストを改めて検出・実行した。最初の実行では110系の`setUpClass`がエラーとなり、`check-design-data.py --catalog`の歴史的119・120件数検査が134の新テスト5件を含めてしまうことを特定した（119は226対221、120は268対263）。119・120の3か所の除外集合へ134専用テストファイルを加え、過去の検査基準221・263は維持した。ゲーム仕様・カード本文・数値・登録区分は変更していない。

修正後の`check-design-data.py --catalog`および設計データ全体検査はいずれも終了コード0、errors空、歴史的120 proxy件数263。134生成物の`proxy_board_response_134.py --check`も終了コード0。全proxy検査は`test_proxy_*.py`の33ファイルをファイル単位の独立プロセス（最大4並列）で実行し、各ファイルの終了コード・件数・失敗名を集約した。

| 指標 | 実測 |
| --- | ---: |
| 全proxy検出・実行 | 407件／33ファイル |
| PASS | 406件 |
| FAIL | 1件 |
| ERROR | 0件 |
| 134専用 | 5件PASS |
| 133専用 | 6件PASS |

唯一のFAILは`test_proxy_normal_decision_seeded_restart.SeededRestartTests.test_population_and_checkpoint_112_boundaries_remain_unchanged`（117旧テスト）。同テストの期待proxy件数190に対し、現行の正準検査値は263。134以前から分離していた既知の古い期待値であり、新規失敗は0件。この旧期待値は今回変更しない。**134の新規回帰はGREENだが、全proxyは406/407で全件GREENではない。**

126〜133の保存済み停止証拠・state/hash、112の未実施fixture、134の生成JSONに変更はない。PR #259はDraft・open・未マージ、main未マージを維持する。新HEADのworkflow run数とcommit status数は別途実測し、0件ならCI成功としない。
