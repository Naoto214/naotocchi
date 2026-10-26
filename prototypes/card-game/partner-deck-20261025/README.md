# CPU「こいびと・交際」デッキの恋人枚数の比較（2026-10-25）

考察と採用判断は [REPORT.md](REPORT.md) にあります。

| ファイル | 内容 |
|---|---|
| `variants.mjs` | 比較した10案（第1回6案・第2回4案）。基準は旧40枚（`CPU_DECK_HISTORY.partner` 版 2026-10-22） |
| `make-manifest.mjs` | 実行前に固定した計画の生成。全案で同じseed |
| `runs/` | 計画（`PD-manifest.json`・`PD2-manifest.json`）と対戦記録（`*.jsonl.gz`）。実行は `../balance-verification-20261020/run.mjs` |
| `analyze.mjs` | 集計（初期手札は計画のseedから再構成） |
| `reproduce.py` | 保存済みの試合の一部を再実行し、保存hashと結果を照合 |
| `results/` | `summary.json`（全指標）、`reproduction-*.json` |
| `ui/` | 390×844・タッチでのブラウザ確認（`ui-check.cjs`・結果・画面写真） |
