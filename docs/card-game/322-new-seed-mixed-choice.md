# 322 新seed混合局面の選択

[322計画](plans/2026-09-27-new-seed-mixed-choice-322.md)。[321監査](321-new-seed-mixed-audit.md)と[320保存state](data/proxy-new-seed-mixed-replay-320-20260927.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-322-20260927.json)に4経路の決定を保存した。

01-AのB交換8件から既存116 seeded fallbackで`B-019`、02-AのA交換10件から`A-003`を選択。01-Bは唯一の`response-pass`。02-Bは通常行動5件を既存107/114優先順位で比較し、時5を維持する`pass`を選択した。装着3件は支払い後の時3、M-beetle-01誕生は時4。交換の戦略的優劣が確定したという意味ではない。

新event0、completed0、独立balance標本0。次は4件を適用してevent・snapshot・hashを検証する。全proxy回帰・CI成功は未確認。
