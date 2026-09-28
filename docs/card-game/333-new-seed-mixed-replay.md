# 333 新seed混合局面の再生

[333計画](plans/2026-09-28-new-seed-mixed-replay-333.md)。[332選択](332-new-seed-mixed-choice.md)、[331補正監査](331-new-seed-mixed-audit-correction.md)と[329保存state](data/proxy-new-seed-mixed-replay-329-20260928.json)のraw/canonical・境界hashを照合して[保存state](data/proxy-new-seed-mixed-replay-333-20260928.json)を作成。

01-A・02-Aは通常passから終了response入口へ、01-Bは証明済み終了と次手番ドローからたまご交換入口へ、02-Bはseededたまご交換から開始response入口へ移行。各event/snapshotと前後game/continuation hashを保存・検証。

新event/snapshot各5、completed0、独立balance標本0。次は4経路を横断監査する。全proxy回帰・CI成功は未確認。
