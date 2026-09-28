# 359 新seed混合4経路の選択

[359計画](plans/2026-09-29-new-seed-mixed-choice-359.md)。[358監査](358-new-seed-mixed-audit.md)と[357保存state](data/proxy-new-seed-mixed-replay-357-20260929.json)のraw SHA256・正準JSON・経路境界を照合し、[選択JSON](data/proxy-new-seed-mixed-choice-359-20260929.json)へ適用前の決定を保存した。

| 経路 | 選択 |
| --- | --- |
| 01-A | 唯一の配置後`response-pass`。 |
| 01-B | 6段階で証明済みの必須`turn_end`。 |
| 02-A | 11候補から既存116のseeded fallbackで`A-027`。 |
| 02-B | 9候補から既存116のseeded fallbackで`A-009`。 |

新event0、completed0、独立balance標本0。次は4件を適用しevent/snapshotと前後hashを検証する。全proxy回帰とCI成功は未確認。
