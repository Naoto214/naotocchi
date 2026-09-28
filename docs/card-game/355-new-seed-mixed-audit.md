# 355 新seed混合4経路の候補・終了集合監査

[355計画](plans/2026-09-29-new-seed-mixed-audit-355.md)。[354保存state](data/proxy-new-seed-mixed-replay-354-20260929.json)のraw SHA256 `c650e9ef2b74f1bbe0261c760a9f1d74e0b2522dde7d72b7df07292832f390db`、正準JSONと各経路のgame/continuation hashを照合した。[監査JSON](data/proxy-new-seed-mixed-audit-355-20260929.json)に候補・除外根拠と終了6段階を記録した。

| 経路 | 現局面と監査結果 |
| --- | --- |
| 01-A | 通常行動4候補：C-box配置、W-countryside配置、I-poop1設置、pass。 |
| 01-B | 終了前responseは唯一のpass。 |
| 02-A/B | 現盤面と履歴hash鎖を再検証し、既存6段階の終了集合が完全。C-cat_friendは起動能力、C-boxは能力なし。 |

新event0、completed0、独立balance標本0。次は01-Aの4候補を既存107/114/116で比較し、01-Bの唯一passと02-A/Bの必須終了を選択する。全proxy回帰とCI成功は未確認。
