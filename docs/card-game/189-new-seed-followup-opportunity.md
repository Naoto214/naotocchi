# 189 新seed次優先者responseと盤上能力起動監査

[189 TDD計画](plans/2026-09-25-new-seed-followup-opportunity-189.md)に従い、01-A・02-A・02-Bの次優先者responseは手札・盤上を含めpassだけが合法と確認。01-Bは選択済みC-chickenの一般response ID、盤上の同一source、開始時条件、空連鎖、山札の存在を検査し、山札上の札の種類や将来のドローは選択時に見ていない。能力の解決は連鎖終了後のため、次の実装では起動と効果解決を区別する。

新event0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxyは478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。新規failure0。
