# 205 新seed4たまご交換再開

[205 TDD計画](plans/2026-09-25-new-seed-egg-replay-205.md)。204の4経路で山札下への1枚選択を116のseeded fallbackで処理し、全経路開始時response入口。候補はドロー後の手札全コピーで、現在手番番号をseed_context.actor_turn_indexに記録。保護済み165/186の既存seed材料・結果は変更しない。

新decision/event/snapshot各4、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxy478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。196以降の全proxy回帰結果は未取得。
