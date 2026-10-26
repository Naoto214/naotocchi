# たまご待機戦略・0/0ちょうせん案 調査（2026-10-26、実験専用）

考察は [REPORT.md](REPORT.md)、事前固定条件は [PLAN.md](PLAN.md)、集計は [results/](results/)。
このディレクトリは正式ランタイムから参照されず、`tools/pages/allowlist.json` にも含まれません。正式エンジン・CPU・カード定義は読み取りのみです。

| ファイル | 内容 |
|---|---|
| `strategies.mjs` | 比較用の戦略（正式CPUの前段で、たんじょう候補を時期で除外するだけ） |
| `make-manifest.mjs` / `runs/manifest.json` | 実行前に固定した2,240戦の予定集合 |
| `run.mjs` | 実行器（current＝正式エンジン、egg00＝案Bの隔離コピー） |
| `tools/make-variant.mjs` | 案B隔離コピー `.variant-egg00/` の生成（未コミット・gitignore） |
| `analyze.py` | `results/summary.json`・`results/tables.md` |
| `tools/seat_bias.py` | 先後の偏り（`results/seat-bias.json`） |
| `tools/existing_records.py` | 既存CPU対戦記録の読み取り集計（`results/existing-records.json`） |
| `tools/fixed400_egg_extract.py` / `tools/fixed400_summary.py` | 固定400戦結果ブランチの読み取り抽出・集計 |
| `runs/shard*.jsonl.gz` | 1試合1行の生記録 |
