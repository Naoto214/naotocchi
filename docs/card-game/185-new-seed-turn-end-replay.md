# 185 新seed4経路ターン終了と次手番ドロー

[185 TDD計画](plans/2026-09-25-new-seed-turn-end-replay-185.md)に従い184の履歴・六段階証明済みstateから4経路の終了遷移と次手番2枚ドローを適用し、全経路が`egg_exchange_choice`に到達した。開始時盤上のC-bat、C-chicken、P-cliff_goat、P-anglerfishは既存本文で条件分類し、開始能力の解決はたまご交換後に保留した。次のroundは全経路とも2。

新event/snapshot各8、decision0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxyは478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。新規failure0。
