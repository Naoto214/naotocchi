# CPU7戦略デッキの横断評価（2026-10-25）

考察と判断は [REPORT.md](REPORT.md) にあります。

| ファイル | 内容 |
|---|---|
| `crossdeck.py` | 7デッキの変更前後の得点率・相手別・先後（V1・PR #444 の比較・追加X1の保存記録から） |
| `reproduce_v1.py` | V1 の一部を現在のコードで再実行し、保存hashと結果を照合 |
| `make-manifest.mjs`・`runs/X-*` | 追加480戦の計画（実行前にコミット）と記録 |
| `analyze_extra.py` | 追加480戦の集計 |
| `results/` | `seven-deck.json`・`extra.json`・`reproduction-v1.json` |
| `ui/ui-final.cjs` | 390×844・タッチでの最終確認（結果・画面写真） |
