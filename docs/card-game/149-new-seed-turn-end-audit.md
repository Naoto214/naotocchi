# 149 新seedターン終了の盤上出所監査

[149 TDD計画](plans/2026-09-25-new-seed-turn-end-audit-149.md)に沿い、148保存JSONのraw SHA、canonical再生成、各経路のstate/hashを検証してから、123の6段階ターン終了候補を現在stateで再列挙した。保護された先行データは変更していない。

| 経路 | 現在seq | 終了時誘発から除外した盤上札 | 残る停止理由 |
|---|---:|---|---|
| probe-01-a-first | 9 | C-chicken（自分のターン開始時） | 期限・成長到達履歴 |
| probe-01-b-first | 9 | C-bat（相手ターンの自分のすぐつかう時） | 期限・成長到達履歴 |
| probe-02-b-first | 6 | なし | 期限・成長到達履歴 |

72の本文と144の一般trigger分類を照合し、123の盤上登録表を監査中だけ拡張した。3経路とも閉じた空response chain、予約0、盤上終了時誘発0を確認した。`unresolved_expiration`と`missing_growth_reach_history`は、現在stateだけでは期限付き効果と途中の100到達・中断を排除できないため残る。124のように検証済みevent履歴から出所を再構築するまで、ターン終了を推測実行しない。

新decision/event/snapshot各0、completed0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、保存JSON一致。全proxy検査は実行中で、結果確定後に記録する。
