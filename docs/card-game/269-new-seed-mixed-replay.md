# 269 新seed混合再生

[269計画](plans/2026-09-27-new-seed-mixed-replay-269.md)。[268監査](268-new-seed-mixed-audit.md)の完全候補と267保存state/hashに接続し、01-A・02-Aで証明済みターン終了および次プレイヤー2枚ドロー、01-Bで2回目の配置後response-pass、02-Bで起動中コイン連鎖に対するAのresponse-passを適用した。

[生成JSON](data/proxy-new-seed-mixed-replay-269-20260927.json)は新event/snapshot各6、response decision2。各event/snapshotの連続seq、前後game/continuation hash、最終state/hashを照合した。01-A・02-Aはたまご交換入口、01-Bは通常行動入口、02-Bはコイン起動域を保持したまま次優先者Bの連鎖中response入口。コインの山札公開と効果解決は未実行。completed0、独立balance標本0。全proxy回帰・CI成功は未確認。
