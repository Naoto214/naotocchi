# 387 混合4経路の監査・再生計画と実施記録

1. 386保存stateのraw SHA256と各game/continuation hashを照合。
2. 01-A・02-Aの終了証明を既存六段階契約と連続event/snapshotで延長し、01-B・02-Bの次優先者応答を完全列挙。
3. 終了2件と次手番ドロー2件、唯一response-pass2件を再生。
4. 専用テストRED→GREEN、正準JSON、event/snapshot各6と前後hashを検証。README・報告・計画・テスト・生成JSONを保存。

次は2件のたまご交換と2件の通常行動を監査。全proxy回帰・CI成功は未確認。独立balance標本0。
