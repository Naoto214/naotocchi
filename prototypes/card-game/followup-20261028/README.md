# 全452枚監査の次段階（2026-10-28）：資料整合・発動コスト説明・本文7枚比較・表示QA

PR #459（全452枚横断監査）の続き。#459 は 2026-10-29 に main へマージ済み（マージコミット `2bcfb555`、資料は変更なし）。本PRは最新 main（#466・#467・#471 を含む）へ追随済みで、**ベースは main** です。
正式カード本文・効果・数値、ゲーム処理、CPU判断方式、保存形式、カード画像、固定400戦の証拠は変更していません。mainマージ・本番Pages更新はしていません。

| ファイル | 内容 |
|---|---|
| [REPORT.md](REPORT.md) | 総合報告・本人が判断する事項 |
| [01-docs-alignment.md](01-docs-alignment.md)／[CURRENT-SPEC-GUIDE.md](CURRENT-SPEC-GUIDE.md) | IMP-01・02（旧設計資料・出典表）の対応。原本は不変更、案内資料と現行本文参照表を追加 |
| [provenance-current-sync.csv](provenance-current-sync.csv)／[.json](provenance-current-sync.json)／[provenance-sync.mjs](provenance-sync.mjs) | 出典表（過去版）と最新カタログの差分（本文2枚、出典文書ハッシュ38枚） |
| [02-activation-cost.md](02-activation-cost.md) | 「発動コスト」の根拠と説明（ルールブック第8章に1項目追加） |
| [03-text-candidates-7.md](03-text-candidates-7.md) | 本文改善候補7枚の比較案（本文は変更なし） |
| [04-display-qa.md](04-display-qa.md)／[display-qa/](display-qa/) | 表示見切れ候補の実画面QA（結果・分類表・スクリーンショット336枚・スクリプト） |
| [05-ui-proposals.md](05-ui-proposals.md) | UI改善案の比較（CSS注入での測定。本番CSSは不変更） |
| [06-test-candidates.md](06-test-candidates.md)／[test-candidates.csv](test-candidates.csv)／[test-candidates.mjs](test-candidates.mjs) | 直接テストのない223枚からの優先候補（Tier 1 は6枚） |
| [07-protection-report.md](07-protection-report.md) | 正式カード・証拠・ハッシュの保護結果と検証 |

## 最新 main との関係（2026-10-29 時点の注記）
本資料は 2026-10-28 の main `85a59bb3` 時点の調査記録です。当時の記述は履歴として残し、その後 main に入った成果は次のとおりです。各資料の冒頭にも同じ趣旨の注記を付けています。
- **#466**: 本文2枚（G-lunar-lander・G-submarine-3d）の明確化と Tier 1 直接テスト（`tests/tier1-direct.test.mjs`）が main に統合済み。`03` の該当カードの採用文は #466（doc 478）の文言が正で、`03` の案とは文言が異なります。`06` の Tier 1 は #466 で実施済み。
- **#467**: カード詳細のスタイル改善（`#card-dialog.card-detail`）が main に統合済み。`04`・`05` の「詳細パネルの内側小窓」に関する指摘は、この改善で扱われています。
- Pages公開ゲート: 最新 main では `tests/pages` 16/16 成功、`package.py` も成功します（`07` の #458 後の不一致は解消済み）。
- テスト数: 最新 main に本PRを重ねた時点のカードゲーム node テストは 494 件（本PRの新規2件を含む）です。`evidence/card-game-node-tests-469.log` は当時の記録として不変です。

## このPRでコード・設定を変えた箇所（3か所だけ）
1. `prototypes/card-game/rulebook-content.mjs`: 第8章に「発動コスト」の説明を1項目追加（197字）。
2. `tools/pages/allowlist.json`: 1を受けて、そのファイルのレビュー済みハッシュ1行のみ更新（`5171a6ce…` → `b04e2ea0…`）。公開手順（デプロイ）は行っていません。
3. `prototypes/card-game/tests/activation-cost-explanation.test.mjs`: 新規テスト2件。
