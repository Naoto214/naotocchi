# ぴょんぴょんジャンプ 効果改善案の比較実験（2026-10-27、実験専用）

PR #448 の改善案を、正式ルール・カード・CPUを変えずに1,280戦で比較した資料です。考察と採否判断は [REPORT.md](REPORT.md)、事前固定条件は [PLAN.md](PLAN.md)。
このディレクトリはランタイムから参照されず、`tools/pages/allowlist.json` にも含まれません。固定400戦（PR #408）の証拠には触れていません。

| ファイル | 内容 |
|---|---|
| `make-manifest.mjs` / `runs/manifest.json` | 実行前に固定した1,280戦（E1 560・E1F 560・E2 160） |
| `run.mjs` | 実行器（版A＝正式ランタイム、版B＝隔離コピー、`--null`＝パッチなしコピー） |
| `tools/make-variant.mjs` | 隔離コピー `.variant-B/`・`.variant-null/` の生成（未コミット・gitignore）。置換箇所の一覧は `results/variant-report.json` |
| `analyze.py` | `results/summary.json`・`results/tables.md`（事前固定の指標と判定） |
| `tools/verify_reproduction.py` | 再実行記録と保存記録の照合（`results/reproduction.json`） |
| `runs/shard*.jsonl.gz` | 1試合1行の生記録 |
