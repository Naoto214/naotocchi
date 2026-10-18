# 375 新seed混合4経路の選択

[375計画](plans/2026-09-29-new-seed-mixed-choice-375.md)。[374監査](374-new-seed-mixed-audit.md)と373保存stateを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-375-20260929.json)に4経路を記録した。374監査JSONのraw SHA256は`fccfc33cb7396b86e56d4491c2e80cd8ddd00213501f75f2ca0ae7709f51ecd2`、選択JSONは`bdd369048790591a835b3af1bd0d128a844c23334d6076c66e752e5b4ea69724`。

| 経路 | 選択と根拠 |
| --- | --- |
| 01-A | 9候補から既存116のseeded fallbackでB-032を選択。たまご交換は未適用 |
| 01-B | 前提が証明されたE-first-dateの必須`resolve_event`。効果は未適用 |
| 02-A/B | 六段階終了集合が完全なため各必須`turn_end` |

新event0、completed0、独立balance標本0。次は373保存stateに4選択を適用してevent/snapshotと前後hashを監査する。全proxy回帰とCI成功は未確認。
