# 204 新seed4経路終了遷移・次手番ドロー

[204 TDD計画](plans/2026-09-25-new-seed-turn-end-replay-204.md)。203で六段階終了を証明した4経路に終了遷移と各2枚の通常ドローを適用。01-A/01-B/02-Bはround3、02-Aはround2のたまご交換入口。01-BのP-cat_ceoは交際開始時だけの誘発として開始時候補から分離し、盤上保持。たまご交換・開始時responseは次段階。

新event/snapshot各8、decision0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxy478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。196以降の全proxy回帰結果は未取得。
