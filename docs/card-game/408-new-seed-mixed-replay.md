# 408 — 残るR10 Bターンと4経路の最終比較

407のremote HEAD `e6ad92c028ac7e52e9ea3a1a69c6d1fb2f6077eb`、tree `312226c51b03c7dd6d61b66aa5af4a11f9935aff`、PR259 Draft/open/unmergedをfresh確認して再開した。保存407 raw SHA256を固定し、394〜407のevent/snapshot履歴を既存の履歴検証へ接続した。新しい裁定は追加していない。

| 経路 | 今回のevent/snapshot | 最終seq | 最終結果 |
|---|---:|---:|---|
| 01-A | 11 | 181 | completed、A25/B20、A勝利 |
| 01-B | 0 | 182 | 407のcompleted stateを保持、A25/B20、A勝利 |
| 02-B | 0 | 181 | 407のcompleted stateを保持、A25/B20、A勝利 |
| 02-A | 6 | 173 | completed、A25/B20、A勝利 |

追加17組、4経路completed。独立balance標本は0のまま。完了済み2経路には選択・event・新しいターンを追加せず、最終state/resultを完全保持した。残る2経路にもR10比較後のドロー・R11は生成しない。

01-AのBたまご交換は合法12候補を116で比較し、B-039のE-final-timeを山札下へ置いた。開始時はC-chicken能力とpassの2候補から既存seedで能力を選択。A側のG-hit-blowはpassと7種類の宣言を完全列挙し、なかま宣言を選択した。連鎖はG-hit-blow→C-chickenの逆順解決。実際に公開したA-008はメインで不一致、山札下へ置きA-035を引く。そだち増加0。公開前の山札上を選択判断に使わない。

01-Aの通常行動はW-city配置・I-poop1準備・passの3候補を107/114で最後まで比較し、時を残すpassを一意に選択した。終了前の唯一応答passと六段階終了を適用してR10最終比較へ進んだ。

02-AのB交換も12合法候補を116で評価し、B-034を山札下へ置いた。開始時は両者唯一pass。通常行動はI-bowtieの対象B-012/B-013/B-014/B-018それぞれを対象付きIDとして列挙し、W-countryside、誕生2件、passを合わせた8候補を107/114で比較した。通常passを一意に選択し、終了前唯一passと六段階終了から最終比較へ進んだ。

実装は407 runnerへ明示的なhistory loaderを渡す最小接続。既定loader・過去407の正準JSONは保持する。開始時・通常・終了前・逆順解決は既存407/406/405/401/142等の検証済み接続をそのまま利用する。候補不足や新裁定を理由とする未解決停止はない。

[監査JSON](data/proxy-new-seed-mixed-audit-408-20260930.json) raw SHA256 `006624f87ecb4b10b08f87d782a3c521dba02059637f69e10ce93ece2619724a`。[保存state](data/proxy-new-seed-mixed-replay-408-20260930.json) raw SHA256 `6623cc9b68a5a9375b0d02df081b56f42046c40e801b3ed937c3f38863018d4b`。

専用5/5 PASS（adapter不在RED→GREEN）。400〜408回帰34/34 PASS、npm test exit0。source改変・履歴actor改変・候補漏れを拒否し、407正準出力不変を確認。fresh reviewerはCritical/Important/Minor各0、17組のhash連鎖・候補・完了済み経路保持を独立に確認した。

共有応答回帰42件は41 PASS、既知119/120の固定件数検査1件のみFAIL（477 != 263）。catalog検査exit1も既知件数検査3件。全proxy discoveryは180秒timeout（exit124、4件進行表示）で未完了。CI成功は未確認。112未実施fixture6件、既存カード本文・数値・登録区分・イラストを保持する。
