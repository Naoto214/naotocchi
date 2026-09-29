# 372 新seed混合4経路の選択

[372計画](plans/2026-09-29-new-seed-mixed-choice-372.md)。[371監査](371-new-seed-mixed-audit.md)と370保存stateを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-372-20260929.json)に4経路を記録した。371監査JSONのraw SHA256は`cc7e815a2ee7359fa0c311e5ce940f0028ae818b4801f040cb5f5c9753b85b85`、選択JSONは`af55c3a32955c9d858e746e04904cc86b3b7b5d4d56567711eb167ca971f6c16`。

| 経路 | 選択 | 根拠 |
| --- | --- | --- |
| 01-A | `turn_end` | 六段階終了集合が完全、stop codeなし |
| 01-B | `response-pass` | turn_start連鎖中のB優先responseで唯一の候補 |
| 02-A/B | 各`response-pass` | 終了前のB優先responseで各唯一の候補 |

新event0、completed0、独立balance標本0。次は370保存stateへ4選択を適用し、event/snapshot・hashを検証する。01-BのE-first-dateは未解決。全proxy回帰とCI成功は未確認。
