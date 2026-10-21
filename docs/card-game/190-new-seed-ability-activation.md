# 190 新seed盤上能力起動と次優先者pass

[190 TDD計画](plans/2026-09-25-new-seed-ability-activation-190.md)に従い、01-A・02-A・02-Bの次優先者唯一passを適用した。01-Bの選択済みC-chickenは既存119のchain遷移を使い、盤上札を移さず時0の能力linkを起動。起動者のpriorityは維持し、山札上の公開・なかまなら手札に加える効果は連鎖が閉じるまで未解決。カード本文・数値・登録区分の変更はない。

新decision3、event/snapshot各4、completed0、独立balance標本0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxyは478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。新規failure0。
