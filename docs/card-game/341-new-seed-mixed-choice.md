# 341 新seed混合局面の選択

[341計画](plans/2026-09-28-new-seed-mixed-choice-341.md)。[340監査](340-new-seed-mixed-audit.md)と[339保存state](data/proxy-new-seed-mixed-replay-339-20260928.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-341-20260928.json)に4経路の決定を保存した。

01-Aの10交換候補から既存116 seeded fallbackで`A-030`、02-Aの9候補から`B-022`を選択。01-Bは唯一の`response-pass`。02-Bは既存107/114/116契約に従い、空きなかま枠への時0の`C-box`配置を選択。比較した`M-antlion-01`誕生は支払い後の時5で劣る。交換の戦略的優劣を確定したものではない。

新event0、completed0、独立balance標本0。次は4件を適用しevent・snapshot・hashを検証する。全proxy回帰・CI成功は未確認。
