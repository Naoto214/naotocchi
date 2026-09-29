# 386 4経路response監査・再生計画と実施記録

1. 385保存stateのraw SHA256・4経路game/continuation hashを照合。
2. 01-BのB盤上C-chicken開始時能力をturn_start窓で列挙し、他源・手札の除外理由を監査。残り3窓の唯一passを証明。
3. 既存応答seedで01-Bの2候補を選択し、他3件の唯一passとともに適用。
4. 専用テストRED→GREEN、監査・再生の正準JSON、event/snapshot各4と前後hashを検証し、README・報告・計画・テスト・生成JSONを保存。

次は終了2経路とresponse2経路の横断監査。全proxy回帰・CI成功は未確認。独立balance標本0。
