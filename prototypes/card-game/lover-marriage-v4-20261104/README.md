# 恋人18種類「♥ 結婚したら」VERSION 4：本人限定試遊版（2026-11-04・未承認）

- 試遊版（本人のみ閲覧可）：https://claude.ai/artifact/HDJZ8ekM7a3F7LTuGfTZHT
- 報告：[REPORT.md](REPORT.md)／正式公開時の説明文の差分案：[RULEBOOK-DIFF.md](RULEBOOK-DIFF.md)
- 能力の出典：V3 の推奨（`../lover-marriage-redesign-20261103/v3/proposals-v3.json`、PR #509 `1cd72308`）。共通ルールは PR #515（main `3a9929ef`）。
- **正式カード・ルール・エンジン・CPU・保存形式・main・本番 Pages は変更していません。** 正式の実行ファイルは読むだけで、写しにパッチを当てて使います。

| ファイル | 内容 |
|---|---|
| `lib/v4-patches.mjs` | 18種類の能力・本文・CPU・画面のパッチ（ラベル付きの厳密な置換） |
| `lib/build-stage.mjs` | 正式の実行ファイル（配信リストの87件）を写してパッチを当てる。前後の sha256 を照合 |
| `tests/v4-abilities.test.mjs` | 単体テスト20件（`node --test tests/v4-abilities.test.mjs`） |
| `sim/` | 対戦比較のランナー・集計・結果（2,836戦）。`build/` は git 管理外 |
| `trial/build-trial.mjs` | 試遊版の組み立て（esbuild、Artifact 用1ファイル化）。`qa-v4.mjs` は QA 盤面 |
| `trial/qa-trial.cjs`・`qa-detail.cjs` | ブラウザ確認（縦横・タッチ）。結果は `trial/evidence/` |
