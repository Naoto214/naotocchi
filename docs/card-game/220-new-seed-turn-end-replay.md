# 220 新seed2経路次手番ドロー

[220 TDD計画](plans/2026-09-25-new-seed-turn-end-replay-220.md)。219で6手順完全と証明済みの01-B/02-Bだけをターン終了から次手番開始へ遷移し、それぞれ山札上2枚をたまご交換前の手札へドロー。次手番の盤上誘発源も既存正本で分類。01-A配置後response、02-A通常行動入口のstate/hashは保持。新event/snapshotそれぞれ4件の連鎖を確認。

新event/snapshot各4、decision0、completed0、独立balance標本0。専用2件PASS、canonical bytes一致。全proxy回帰とCI成功は未確認。
