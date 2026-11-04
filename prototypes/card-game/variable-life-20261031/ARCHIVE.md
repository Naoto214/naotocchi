# 実験の記録の保管（VERSION 6、2026-11-04）— 保存容量の点検への対応

main の保存容量の点検（`tools/work/check_storage.py`）は、この PR の生成データ・画像を止めていました。**一括の例外登録はせず**、ファイルを分類して整理しました。

## 分類と扱い
| 分類 | 例 | 件数 | 扱い |
|---|---|---:|---|
| 再現に必要なソース・設定 | `lib/*.mjs`・`analyze_*.py`・`trial-time/*.mjs/cjs`・確認用の保存 `trial-time/fixtures/` ・小さなマニフェスト | — | **HEAD に残す**（点検の対象外） |
| 検証結果の要約 | `REPORT.md`・`PLAN*.md`・`results/summary*.json`・`evidence/*.txt`（動作確認・保存→復元の照合）・`trial-time/evidence-v*/qa-log.txt` | — | **HEAD に残す** |
| 復元に必要な資料 | CPU 対戦の記録 `runs/*.jsonl.gz`（252件）、PR #495 の比較記録の写し `ref/*.jsonl.gz`（2件） | 254 | **HEAD から外し、このブランチの履歴に保持** |
| 再現に必要な設定（大きいもの） | 1MB を超えるマニフェスト（6件） | 6 | **HEAD から外し、履歴に保持**（`lib/make-manifest*.mjs` で再生成も可能） |
| 再生成可能な画像 | ブラウザ確認の画面（`trial*/evidence*/*.png`、66件） | 66 | **HEAD から外し、履歴に保持**（`qa-*.cjs` で再生成可能） |
| 不要な一時ファイル | `runs/*.jsonl`・`*.log`・`*.out`・`build/` | — | もともとコミットしていない（`.gitignore`） |

- 外した326件（98.7MB）は、`results/archive-index.json` に記録しました。項目は、パス・SHA-256・大きさ・分類・それを含むコミット `8f3bc585` です。
- 今後も入らないように、`.gitignore` に `runs/*.jsonl.gz`・`ref/*.jsonl.gz`・`**/evidence*/*.png`・大きなマニフェスト6件を追加しました。

## 復元
```sh
sh prototypes/card-game/variable-life-20261031/lib/restore-archive.sh
```
- 履歴（コミット `8f3bc585`）から326件を元の場所に戻し、SHA-256 を照合します。確認済み：326/326 一致。
- 戻したファイルは `.gitignore` の対象なので、再びコミットされることはありません。
- 戻した後は、`analyze_*.py` と `evidence/replay-check.txt` の照合を、そのまま実行できます。
- **再生成もできます。** CPU 対戦は決定的です（seed・ビルドの元 `7c1f18c7`・マニフェストで同じ記録になります）。たとえば `sh lib/run-all.sh V6_P3` で同じ記録を作り直せます。保存ハッシュの一致は、`v4eq`・`v5eq`・`V6_P3` と `V5F_P3` で確認済みです。

## 注意（U19）
- 外したファイルは、このブランチの履歴にあります。**ブランチを削除するか、履歴を書き換えると失われます。**
- main へ squash マージする場合も、main 側には残りません。
- 長く保管するなら、リポジトリの外（リリースの添付や外部の保存場所）へ移すことを、本人が判断してください。
