# 通知・実績・食材のイラスト表示 Implementation Plan

**Goal:** #230の表示層を引き継ぎ、実績の各表示・環境の動物通知・ケーキとお弁当の小物をイラストへ接続する。

**Architecture:** 本文と保存値は文字列のまま。実績は安定IDに対応する表示専用の印を、通知は既存PNGを使う。食材は意味の合う小さなインラインSVGを表示ヘルパーから2本のDOMゲームへ渡す。

**Tech Stack:** 既存のJavaScript/CSS、Node test runner、VMのDOM・時計代替、静的SVG。

**Spec:** ユーザーの継続依頼と `docs/handoff/comment-illustrations-2026-09-10.md`。開始main `9969a44ec14ef0339294281f857232067a33846d` / tree `d302ba0150a73417c0a3a6d7aea4218a32a58d3f`。#230は統合済み、Runtime #307・Pages #228成功。公開ファイルのマージ後バイト照合は未確認。

## Global Constraints

- 311既存画像、マスター、会話本文、保存形式、実績条件、死亡・お世話・地域選定・キャスト配置は保持する。
- ケーキの順番・座標・時間・得点、お弁当の2200ms見本・座標・時間・得点、共通ドラッグ処理、既存Canvasを保持する。
- おにぎりを茶碗ご飯で、食材を孵化用卵で代用しない。食品SVGは食材として使う場面だけへ接続する。
- SVG/PNGの枠は元の文字サイズ内。元の絵文字と読み上げ名を残す。画像失敗をキャストへ波及させない。
- 実ブラウザーの確認とNode検証を区別する。別タブの地域・日本語点検へ変更を混ぜない。

## Tasks

- [x] `tests/notice-food-illustrations-test.cjs` と `tests/helpers/runtime-harness.cjs`: 実績の全件表示・ロック・解除通知、環境動物PNG、食材の意味とエスケープ、ケーキ順番とお弁当の正誤・見本・時間・キャンセルを検証する。DOM代替はこの2ゲームの小物metadataだけを追加する。まず未実装で失敗を確認する。
- [x] `script.js`: `achievementIconHTML(ach)` を実績一覧・まとめ・選択・解除通知へ接続。表示用ID対応表を追加し、既存の実績配列と条件は変更しない。環境通知の動物は既存PNGへ接続。食材用 `minigameFoodHTML(key, fallback)` は静的なキー表だけを参照し、未知キーはエスケープした元の文字にする。
- [x] `games.js`: `S.foodIconHTML` を2本だけで使う。見本・トレイ・置いた先へ同じ食材を表示し、置いた先を期待する食材にすり替えない。完成コメントの文面を保持する。
- [x] `ui-illustrations.css`: 元の1emと46px操作枠を維持する表示規則を追加。SVG内部はpointer-events:none。各配色・動きを減らす設定・軽量モードに依存しない文字と輪郭を残す。
- [x] `tests/visual-qa.cjs` に実績表示を確認する場面を追加。既存のcomment_illustrationsとゲーム選択から確認手順を記録する。
- [x] `npm test` と `git diff --check`。311画像・19重要関数・共通ドラッグ・その他98ゲームの不変を比較する。静的素材見本を描画して読む。利用できれば公式ブラウザーで320px/通常幅等を確認し、失敗なら取得0として記録する。
- [x] 独立レビューを受けて必要な修正だけを行う。`docs/handoff/`、`docs/qa/`、チェックポイントに検証対象のHEAD/tree・CI・公開状態・残件を保存し、新しいPRへ記録する。main/open PR/Claudeブランチを再確認して他作業と競合させない。

## Review boundary

この計画は局所的な表示変更として自己点検済み。全絵文字の完了・100ゲームの実画面確認は主張しない。地域の装飾参照、道路・宇宙・カード等のCanvas小物、未対応通知、実機確認は後続に残す。

## Result

170 tests passed; 0 failed/skipped. One review finding about a frog growth-stage portrait was fixed and independently re-reviewed; no unresolved findings. Code tree `fe70289e5af95704cdbc4e9faafbafcdb3738877`. Browser tab listing timed out after 20000ms; game screenshots remain 0. Final GitHub HEAD/tree/CI and publication state belong in the PR checkpoint.
