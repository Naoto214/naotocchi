# ルナランダー・サブマリン3Dの本文明確化／Tier 1カード6枚の直接テスト（2026-10-28）

PR #459（全452枚監査）・PR #460（その次段階）の結果を受けた作業です。基準は最新 main `eb97817d`（#465 後）。**mainマージ・本番Pages更新はしていません。**

- 本文：正式カード2枚の本文を明確化（処理・数値・裁定は不変）。設計正本は [docs/card-game/478](../../../docs/card-game/478-lunar-submarine-text-clarification.md)。
- テスト：本文2枚＋Tier 1の6枚の直接テスト27件（[tests/tier1-direct.test.mjs](../tests/tier1-direct.test.mjs)）。
- 総合報告：[REPORT.md](REPORT.md)

## PR #459・#460 との関係

- この作業は main から作った独立ブランチです。#459・#460 の未マージ変更（監査資料、ルールブック第8章の「発動コスト」1項目、その allowlist 1行、テスト2件）は**取り込んでいません**。
- 参照したのは、#460 の `followup-20261028/03-text-candidates-7.md`（本文2枚の比較案）と `06-test-candidates.md`（Tier 1の6枚）だけです。ファイルの依存はありません。
- #460 と同時に変更するファイルは `tools/pages/allowlist.json` だけで、行が別（#460 は `rulebook-content.mjs`、こちらは `full-catalog.mjs`）なので、どちらが先にマージされても機械的に合わせられます。

## 変更ファイル

| ファイル | 内容 |
|---|---|
| `docs/card-game/85-play-batch-4-card-text-draft.md` | ルナランダーの本文1行、最終更新、§6 明確化記録 |
| `docs/card-game/83-play-batch-3-card-text-draft.md` | サブマリン3Dの本文1行、最終更新、§5 明確化記録 |
| `docs/card-game/478-lunar-submarine-text-clarification.md`（新規） | 改訂内容・裁定／実装との一致・保存互換 |
| `docs/card-game/data/lunar-submarine-text-clarification-20261028.json`（新規） | 旧／新本文、不変項目、現在のカタログhash |
| `docs/card-game/README.md` | 478 の入口1行 |
| `docs/card-game/tools/check-design-data.py` | 478 の照合を追加。過去の固定hash（96／97・476・477）は478の本文を戻して照合（476・477と同じ方式） |
| `prototypes/card-game/full-catalog.mjs` | 既存の生成手順（`build_full_catalog.py`）で再生成。本文2件と、出典文書83・85の出典hash（40枚）だけが変化 |
| `prototypes/card-game/tests/doodle-jump.test.mjs` | 固定カタログhashの照合で、478の2枚を旧本文へ戻す（コメントと旧本文表の2行を追加、照合関数1行を変更） |
| `prototypes/card-game/tests/tier1-direct.test.mjs`（新規） | 直接テスト27件 |
| `tools/pages/allowlist.json` | `full-catalog.mjs` のレビュー済みhash 1行だけ |
| `prototypes/card-game/text-clarify-tier1-20261028/`（新規） | この資料・検証スクリプト・証跡・画面確認 |

エンジン・効果の処理（`rules.mjs` などのプログラム）・CPU・保存形式・版（`hotseat-4`）・画像・ルールブックは変更していません。

## 証跡（`evidence/`・`ui/`）

| ファイル | 内容 |
|---|---|
| `evidence/card-game-node-tests.log` | カードゲーム node テスト 494/494（main 467 ＋ 新規27） |
| `evidence/card-game-dom-tests.log` | DOMテスト 6/7。失敗1件（`menu.dom.mjs`、メニュー見出しに「戦績」が加わった件）は main `eb97817d` でも同じく失敗し、カードとは無関係 |
| `evidence/compat-replay-main-eb97817d.json`／`compat-replay-branch.json`／`compat-summary.json` | 旧保存7件と小規模CPU対戦18戦の main／ブランチ比較（`tools/compat-replay.mjs`・`tools/compat-compare.py`） |
| `evidence/state-diff-main-vs-branch.txt` | 同じ対戦で差のある項目の一覧（`tools/state-diff.mjs`）：発動記録の本文の写しと画面のカード本文・出典hashだけ |
| `evidence/mutation-check.txt` | 実装に故意の誤りを13種入れて、新テストが全部検出することの確認（`tools/mutation-check.py`。実行後にファイルは元へ戻る） |
| `ui/ui-qa.json`・`ui/*.png` | 実画面（Chromium、タッチ、320×568／390×844／430×932／844×390）のカード詳細と旧保存の表示（`tools/ui-qa.cjs`） |

## 再現

```sh
node --test prototypes/card-game/tests/*.test.mjs
python3 docs/card-game/tools/check-design-data.py           # errors: []
python3 docs/card-game/tools/check-design-data.py --catalog # errors: []
python3 prototypes/card-game/build_full_catalog.py --check
python3 -m unittest discover -s tests/pages
python3 tools/pages/package.py --out <dir> --report <dir>/report.json && python3 tools/pages/verify.py --artifact <dir> --package-report <dir>/report.json --report <dir>/http.json
# 保存互換（main を別の作業ツリーに置いて）
node prototypes/card-game/text-clarify-tier1-20261028/tools/compat-replay.mjs <main>/prototypes/card-game > main.json
node prototypes/card-game/text-clarify-tier1-20261028/tools/compat-replay.mjs prototypes/card-game > branch.json
python3 prototypes/card-game/text-clarify-tier1-20261028/tools/compat-compare.py main.json branch.json
```
