# 403 Bの4ターン・C-chameleon無料配置

[403計画](plans/2026-09-30-new-seed-mixed-replay-403.md)。402保存state raw SHA256 `c9ab8f8515a1baa4823e088d488b35835809bbd619673e6ed268044f0f21ec2e`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-403-20260930.json) raw SHA256 `3f48600eaeedec769167a4c562e3f5bb826ace7c7ab5a2f24007a899d5f668f8`。[保存state](data/proxy-new-seed-mixed-replay-403-20260930.json) raw SHA256 `0c385e99ebc38392b1845e0eda9b34aff640eaf404e14da5b548e6265f76b436`。

| 経路 | 再生内容 | 次局面 |
| --- | --- | --- |
| 01-A | Bの116交換でE-first-dateを山札下へ。開始時C-chicken/passはseeded pass、通常pass、終了・Aドロー（7 event） | seq142、R9、Aのたまご交換 |
| 01-B | Bの交換、開始時seeded pass、通常pass、終了・Aドロー（7 event） | seq151、R9、Aのたまご交換 |
| 02-B | Bの交換、開始時2応答、通常pass、終了・Aドロー（7 event） | seq150、R9、Aのたまご交換 |
| 02-A | Bの交換、開始時2応答、無料C-chameleon配置、配置後2応答、通常pass、終了・Aドロー（10 event） | seq139、R9、Aのたまご交換 |

02-Aは全合法候補（C-chameleon、W-countryside、M-antlion-01、I-poop1、pass）を保持した。既存157・398の6安全条件を再検証し、時0配置に対する有料3件の107・114比較と116安全無料盤面化を記録した。配置後もC-chameleonは継続能力で、応答起動候補へ混ぜていない。次のAの交換候補は4経路で完全列挙済み。

新decision23、event/snapshot各31、completed0、独立balance標本0。専用テストRED→GREEN、正準JSON、全中間event/snapshotと前後game/continuation hash連鎖、各六段階終了監査を確認した。過去state/hash・カード本文・数値・登録区分・保護対象は非変更。

全proxy回帰は継続実行中で完了未確認。途中の`test_proxy_board_combination_pilots.BoardCombinationPilotTests.setUpClass` errorを個別再現し、`proxy_record_validator.load_current_catalog`が`check-design-data.py --catalog`のexit1を受けたものと確認した。設計検査のerrorsは既知の`119 total proxy test count`、`120 total proxy test count`（2件）であり、新しいゲーム遷移failureではない。117期待190/実際263、112 catalog参照は既知問題として保持。CI成功は未確認。404へ続行する。
