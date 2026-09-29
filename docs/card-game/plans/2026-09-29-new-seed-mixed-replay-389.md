# 389 4経路response監査・再生計画と実施記録

1. 388保存stateのraw SHA256と各game/continuation hashを照合。
2. 01-Aの開始時C-chicken盤上能力を合法候補へ列挙。ほか3窓の手札・盤上源と除外理由を確認。
3. 既存応答seedで01-Aの能力起動を選択し、唯一response-pass3件と合わせて再生。
4. 専用テストRED→GREEN、監査・再生の正準JSON、event/snapshot各4と前後hashを検証。README・報告・計画・テスト・生成JSONを保存。

次は連鎖応答・終了証明・残り応答を横断監査。全proxy回帰・CI成功は未確認。独立balance標本0。
