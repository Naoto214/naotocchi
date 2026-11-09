# 検証記録 2026-11-09

- `node docs/naopoyo-gimmick-atlas-v1/validate.mjs`: 成功。50候補・100連番・章割り・採否32/11/7・参照ID・推奨以外の未割当・救出12/協力5・第2章イベント・128比較SVG・正式第1章10タイトル一致・storage非使用。
- `node --check docs/naopoyo-gimmick-atlas-v1/app.js`: 成功。
- 第1章 `chapter.test.mjs` / `compatibility.test.mjs` / `learning-v6.test.mjs`: **20成功、0失敗、0skip**。初回は軽量取得から除外されたarchive/v4不足で起動失敗。該当履歴のみ取得後の再実行で成功。テスト変更なし。
- Chrome実画面：分類、状態、画像、章選択、91–100の表示を確認。375×667、320×568、844×390 iframeで本文横はみ出しなし。小画面タブは2×2に修正。
- iPhone Safari実機・WebKit自動実行は未実施。Chrome確認をSafari検証とは呼ばない。
- 設計レビューで95面の総量矛盾、16面の装飾NPC、60面の協力条件、機能依存、76面の遅延対象を修正。将来ステージの解法検証は今回行っていない。
- 追加は `docs/naopoyo-gimmick-atlas-v1/` のみ。正式ゲーム・本番UI・既存テスト・PR523を変更しない。画像コピー5枚は元資産と同一バイト。

比較ページはゲームのstorageを使用しない。本人限定Siteのアクセス制御を使用する。
