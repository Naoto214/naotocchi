# 171 新seed現在機会横断監査

[171 TDD計画](plans/2026-09-25-new-seed-opportunity-audit-171.md)に従い170保存raw SHA・state/hash境界を固定して監査した。01-Aの通常行動はセカイ設置／pass、01-Bと02-Bはそれぞれパートナー設置／メイン誕生／pass。通常行動3経路とも既存候補完全性12項目を満たし、盤上誘発能力を通常行動候補から除外した。02-AのI-c_coin2連鎖中responseは優先者の盤上sourceがなく、合法候補はresponse-passのみ。

新event0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用テスト2件PASS、保存JSON再生成一致。全proxy検査は固定168 snapshotで継続中であり、171全件GREENとは扱わない。次は承認済みseeded fallbackで通常行動候補を選択し、02-Aは既存連鎖契約に従ってpassを記録する。
