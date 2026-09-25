# 191 新seed現在の連鎖responseと通常行動監査

[191 TDD計画](plans/2026-09-25-new-seed-chain-normal-audit-191.md)に従い、01-A・02-A・02-Bの通常行動候補を現在の盤上札の既存分類で完全監査した。01-Bでは起動済みC-chickenと盤上同一個体を照合し、同一ターンにその能力を二重発動できない条件を適用。手札・盤上・しかけを含めると、現在の連鎖中に発動者が選べるのは`response-pass`のみ。山札上は引き続き未公開・未解決。

新event0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxyは478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。新規failure0。
