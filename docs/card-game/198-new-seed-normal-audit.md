# 198 新seed2通常行動候補監査

[198 TDD計画](plans/2026-09-25-new-seed-normal-audit-198.md)。197から通常行動入口の2経路を既存12検査で監査。01-Aはメイン誕生とpass、01-Bはセカイ配置とpassが合法。C-batとC-chickenの盤上response能力は通常行動の候補IDを発行せず、timing_not_normal_actionで除外。02-A/02-Bはターン終了履歴監査待ちとして保存。意思決定・ターン終了遷移は未実施。

新event0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxy478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。196以降の全proxy回帰結果は未取得。
