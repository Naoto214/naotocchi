# 316 新seed混合局面の選択

[316計画](plans/2026-09-27-new-seed-mixed-choice-316.md)。[315監査](315-new-seed-mixed-audit.md)と[314保存state](data/proxy-new-seed-mixed-replay-314-20260927.json)のraw/canonical・境界hashを照合し、[選択JSON](data/proxy-new-seed-mixed-choice-316-20260927.json)に4経路の決定を保存した。

01-A・02-A・02-Bは各局面で唯一合法の`response-pass`。01-Bの必須たまご交換は手札9件を完全列挙した既存116 seeded fallback契約により、`A-019`（`P-desert_scorpion`）を選択した。戦略上の優劣が確定したという意味ではない。

新event0、completed0、独立balance標本0。次は4件を適用して各event・snapshot・hashを検証する。全proxy回帰・CI成功は未確認。
