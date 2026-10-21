# 164 新seed4経路のターン終了・次手番ドロー

[164 TDD計画](plans/2026-09-25-new-seed-turn-end-restart-164.md)に従い、163の全6段階証明を確認してから4経路のR1終了と次手番の2枚ドローを記録した。各経路で`turn_end_completed`と`turn_start_and_egg_draw`の2 event・2 snapshot、decisionは0。次はたまご交換選択入口。

01-Aの次手番AのC-chickenは盤上に保持し、01の開始順に従ってたまご交換後の開始時誘発へ送る。01-BのC-batは相手ターン中のすぐつかう条件であり開始ドローでは発動しない。R2の時回復と先後を保存stateから再計算する。

新event/snapshot各8、completed0、独立balance標本0。source raw SHA、最初のbefore hash、seq連続、game/continuation hash連鎖、最終state/hash、正準JSONと専用2テストを検証する。カード本文・数値・登録区分変更0。全proxy回帰は固定158 snapshotで継続中。
