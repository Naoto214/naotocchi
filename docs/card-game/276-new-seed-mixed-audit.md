# 276 新seed混合局面監査

[276計画](plans/2026-09-27-new-seed-mixed-audit-276.md)。275保存raw/canonicalと4経路のstate/hashを照合。[監査JSON](data/proxy-new-seed-mixed-audit-276-20260927.json)に候補と履歴証拠を保存した。

01-Bは251の証明済み地点から275までのevent/snapshot/hashをつなぎ、六段階のターン終了完全性を再評価した。B盤上の`C-cat_friend`は、既存261と同じ「自分のターンに起動する能力でありターン終了時の誘発ではない」分類を本文と照合して除外した。01-Aの次優先者responseと02-Aのコイン起動中responseは、それぞれ`response-pass`のみ。02-Bの通常行動候補は`candidate-attach_item-A-032#1-target-A-018#1`、`candidate-place-companion-A-012#1`、`candidate-play-main-A-009#1-birth`、`pass`の4件。

新event0、completed0、独立balance標本0。次は終了遷移、2件の唯一pass、02-Bの通常4候補の比較を進める。全proxy回帰・CI成功は未確認。
