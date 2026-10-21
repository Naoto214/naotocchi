# 221 新seed2経路たまご交換

[221 TDD計画](plans/2026-09-25-new-seed-egg-replay-221.md)。220で次手番ドロー済みの01-B/02-Bに、116の保存済みseeded fallbackによる必須たまご交換を適用。選択したカードを手札から山札下へ移し、開始時responseへ。各decisionのseed証明、event/snapshot/hash連鎖を検査。01-A/02-Aは保存stateを保持。

新decision/event/snapshot各2、completed0、独立balance標本0。seeded fallback戦は独立balance標本へ算入しない。専用2件PASS、canonical bytes一致。全proxy回帰とCI成功は未確認。
