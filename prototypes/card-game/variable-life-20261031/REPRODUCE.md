# 実験の再現と長期保存（VERSION 1〜7、2026-11-04）

VERSION 1〜7 の検証を、将来も同じ結果で作り直せるように整理したものです。**既存の履歴は消していません。** 記録の本体は、このブランチの履歴（コミット）に保持しています。

## 1. 共通の仕組み
| 項目 | 内容 |
|---|---|
| 土台 | **VERSION 1〜6：** main `7c1f18c7`（ルール hotseat-6、CPU heuristic-2）<br>**VERSION 7：** main `88ff5e1f`（hotseat-8、heuristic-3）<br>正式のファイルは `git show` で読むだけです（`lib/build-life.mjs`、`integration/build-candidate.mjs`）。ビルドごとの sha256 は `results/build-manifest.json` と `build*/…-manifest.json` にあります |
| 条件（ビルド） | `lib/life-patches.mjs` の `VARIANTS`（35種類＋VERSION 7 の `I-7`）。古い土台のビルドは、VERSION 7 の変更の前後で sha256 が同じであることを確認済み |
| デッキの構成 | `lib/decks-life.mjs`。正式7デッキの、決まった枠だけを入れ替えます。入れ替える枠の規則は、実行前に固定しています |
| seed | 対戦の名札 `R12C:MAIN:<デッキX>:<デッキY>:<番号>` から、山札の順と CPU の乱数を決めます（`balance-verification-20261020/lib.mjs` の `deriveSeed`）。番号は主に 001〜010（条件によって 001〜020）。両方の先攻で行います |
| マニフェスト | `lib/make-manifest-life.mjs`（VERSION 1）、`lib/make-manifest-v2.mjs`（VERSION 2 以降。search・field・seat の3つの方式） |
| 対戦 | `lib/run.mjs`。CPU 同士で、完全に決定的です（同じビルド・マニフェストなら、同じ保存のハッシュになる。`V6_P3`＝`V5F_P3` の 560/560 などで確認済み） |
| 統計 | `analyze_*.py`。seed のグループ単位のブートストラップ（2000回）で 95%CI を出します。乱数の seed はスクリプトに固定しています |
| 判定の規則 | 各版の `PLAN*.md`。すべて実行前に固定しています |

## 2. 版ごとの資料
| 版 | 計画 | 集計 | 要約 | 報告 | 主な確認 |
|---|---|---|---|---|---|
| 人生延長・上限解放 | `PLAN.md`・`PLAN-NEXT.md` | `analyze_life.py` | `results/summary.json` | REPORT §0〜§11 | `evidence/smoke.txt` |
| せかい XI・XII | `PLAN-WORLD.md` | （REPORT §12） | — | §12・`WORLD.md` | `evidence/smoke-world.txt` |
| 時のカード VERSION 1 | `PLAN-TIME.md` | — | — | §13・`TIME.md` | `evidence/smoke-time.txt` |
| VERSION 2 | `PLAN-V2.md` | `analyze_v2.py` | `results/summary-v2.json` | §14・`TIME-V2.md` | `evidence/smoke-v2.txt` |
| VERSION 4 | `PLAN-V4.md` | `analyze_v4.py` | `results/summary-v4.json` | §15・`CARDS-V3.md` | `evidence/smoke-v4.txt` |
| VERSION 5 | `PLAN-V5.md` | `analyze_v5.py` | `results/summary-v5.json` | §16 | `evidence/smoke-v5.txt` |
| VERSION 6 | `PLAN-V6.md` | `analyze_v6.py` | `results/summary-v6.json` | §17 | `evidence/smoke-v6.txt`、`evidence/records-compat.txt`、`evidence/replay-check.txt`（61,460戦） |
| VERSION 7 | `PLAN-V7.md` | `analyze_v7.py` | `results/summary-v7.json` | §18・`integration/CANDIDATE-V7.md`・`RECORDS-V2.md` | `evidence-v7/`（hotseat-8 での動作確認、統合テスト、公式テストの分類） |

**旧版との比較：** 各要約の `vsV2C`・`vsA0`・`contrasts` に、同じ seed どうしの差と 95%CI があります。VERSION 7 の hotseat-8 での確認は、REPORT §18 で VERSION 6（hotseat-6）の数値と並べています。

## 3. 記録の保管場所と復元
**記録ファイル（CPU 対戦の記録・大きなマニフェスト・画面の画像）は HEAD にありません。** 保存容量の点検のためです。

| 対象 | 件数 | 保持しているコミット | 索引（SHA-256） |
|---|---:|---|---|
| VERSION 1〜6 | 326 | `8f3bc585` | `results/archive-index.json` |
| VERSION 7 | `results/archive-index-v7.json` を参照 | 同じ | `results/archive-index-v7.json` |

**復元の方法は3つあります。**
1. **ブランチの履歴から：** `sh lib/restore-archive.sh` を実行します。索引の各ファイルをコミットから戻し、SHA-256 を照合します（326/326 一致を確認済み）。
2. **再生成：** CPU 対戦は決定的なので、マニフェストとビルドから作り直せます。
   - VERSION 1〜6：`sh lib/run-all.sh <名前>`
   - VERSION 7：`node integration/build-candidate.mjs && sh integration/run-v7.sh <名前>`
3. **ひとまとめの保存ファイル（ブランチがなくても使える）：** `python3 lib/archive-bundle.py pack <リポジトリの外のパス>.tar.gz` で、索引にある全ファイルを1つにまとめます。
   - 戻す時は `… restore <ファイル>` で、SHA-256 を照合して戻します。
   - 空の新しいリポジトリで、VERSION 1〜6 の 326件（82MB）を戻せることを確認しました。

**ブランチを消すと失われるもの（U19）：**
- 1. の履歴の記録が失われます。
- main へ squash マージする場合も、main 側には残りません。

**保存先の提案（本人が選んでください。この PR では何も作っていません）：**
| 案 | 方法 | 長所 | 注意 |
|---|---|---|---|
| **A（推奨）** | タグ `archive/variable-life-20261031` を記録のコミットに付ける | ブランチを消しても履歴が残る。手順は1行。1. の復元がそのまま使える | リポジトリの容量に記録の分が残る |
| **B（推奨、A と併用）** | 3. の保存ファイル（約100MB）を GitHub Release の添付にする | リポジトリの外。1ファイルで復元できる | Release の作成は本人の承認が必要 |
| C | 3. の保存ファイルを、外部の保存場所（Google Drive など）に置く | GitHub に依存しない | 置き場所の管理が必要 |
| D | 保存しない（再生成だけに頼る） | 容量が要らない | 作り直しに時間がかかる（約7万戦で、4コアなら約7時間）。土台のコミットが必要 |
