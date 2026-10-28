# なおとっち CARD GAME 全体横断監査（452枚・15章・裁定・実装）2026-10-28

**調査のみ（Draft PR）。** カード本文・効果・数値、正式ルール・裁定、ルールブック、ゲームエンジン、CPU判断方式、保存形式、カード画像、固定400戦の証拠、本番Pagesは一切変更していません。新しい対戦もしていません。基準は main `0e0354b1`（PR #456 マージ後）。
このディレクトリはランタイムから参照されず、`tools/pages/allowlist.json` にも含まれません。

| ファイル | 内容 |
|---|---|
| [REPORT.md](REPORT.md) | 総合報告（結果と本人が判断する事項） |
| [cards-452.csv](cards-452.csv) / [.json](cards-452.json) | 452枚の監査対応表（ID・名称・種類・レア・時・本文・実装・テスト参照・裁定参照・画像・出典・分類A〜E・副分類・証拠強度・メモ） |
| [01-rulebook-15chapters-audit.md](01-rulebook-15chapters-audit.md) | ルールブック15章の監査 |
| [02-ruling-crosscheck.md](02-ruling-crosscheck.md) | 正式裁定との照合 |
| [03-implementation-mismatch-candidates.md](03-implementation-mismatch-candidates.md) | 実装不一致候補（0件）と証拠の限界 |
| [04-text-improvement-candidates.md](04-text-improvement-candidates.md) | 本文改善候補（B）・資料同期（D） |
| [05-ui-display-candidates.md](05-ui-display-candidates.md) | UI・表示候補（E） |
| [06-prioritized-improvements.md](06-prioritized-improvements.md) | 優先順位付き改善案（9項目の形式で、提案のみ） |
| [07-existing-evidence-map.md](07-existing-evidence-map.md) | 既存証拠との対応と適用版 |
| [08-balance-notes.md](08-balance-notes.md) | バランス懸念（別枠） |
| [summary.json](summary.json) | 集計・15章・79裁定・主要数値・用語・表記ゆれの機械照合結果 |
| [review.json](review.json) | 手動レビューの結論（静的フラグの誤検知判断を含む） |
| evidence/existing-tests-217.log | 最新 main での既存テスト 217/217 PASS のログ |

## 再現（読み取り専用）
```
node prototypes/card-game/full-audit-20261028/audit-full452.mjs /tmp/out        # フラグ付き表を出力（review.json は読むだけ）
node prototypes/card-game/full-audit-20261028/make-review.mjs /tmp/out/cards-452.json /tmp/review.json   # 手動結論の再生成
```
スクリプトは同ディレクトリ以外のファイルに書き込みません。静的ヒューリスティックの結果は**確定不具合ではなく**、証拠強度（S/M/W）を併記しています。

## 分類（A〜E）
A 問題なし／B 軽微な本文改善／C 実装不一致（疑い）／D 裁定不足・仕様不明／E UI・表示。主分類1つ＋副分類。
