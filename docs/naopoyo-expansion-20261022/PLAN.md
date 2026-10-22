# なおぽよ。共通ルールv1・13〜24 実装計画

Goal: 既存操作を保護し、12面追加して本人限定試遊に届ける。
Architecture: engine.mjs/input.mjs/store.mjsは維持。追加面をadvanced-stages.mjsへ分離しstagesの末尾に連結。既存の解答再生・実appポインタテストを全24面へ拡張。
Spec: この依頼の1〜18節、および本ディレクトリCOMMON-RULES-v1.md。

## 制約
8×6、種族dog/fish/penguin/frog、段階1〜8、行先だけの8方向判定、落下はrelease。既存12面/旧保存互換性を維持。main/Pages更新禁止。自動難易度は仮評価。

## Review focus
- ドラッグ終了時の落下で解答が破綻しない
- 足場役を先に救出した場合の行き詰まりはUndoで戻る
- 新面保存時に旧版候補がundefinedでもrestoreが動く
- 24面選択画面の小さいiPhone高さ
- 門必須性をrequired/openフラグだけで偽証しない

## Task 1: 基準・データ追加
- [x] main f69310c79131、並行PR、CI成功を確認。新しい専用clone/branch。AGENTS/CLAUDEファイルなし。
- [x] baseline node --test prototypes/naopoyo-rescue/tests/*.test.mjs →205/205
- [x] 拡張テストで24面/旧12面不変を要求しRED確認
- [x] advanced-stages.mjs、stages.mjs、solutions.json、themes.mjsを実装
- [x] 全解答の本体再生と実appポインタ経由再生でGREEN確認

## Task 2: ルール・採用検証
- [x] COMMON-RULES-v1.mdに10項目の処理順/例外/コード/テスト/制作制約を記載
- [x] 各面の合体/分裂/重力/足場/門通過を計測、Undo・保存復帰を確認
- [x] 封鎖門の構造証明または探索を保存。上限を未証明として扱う
- [x] 旧全テストと関連回帰テストを実行。フルnpm testも実行し限界を記録

## Task 3: QA・公開
- [x] iPhone寸法QA、最終レビュー、必要修正
- [x] commit/push/Draft PR、Sites owner-private試遊版配信
- [x] 配信とアクセス権を確認、報告

完了: Draft PR #422、本人限定Sites v14公開成功。main/本番Pages未更新。本人iPhone実機による難易度採用判断は別途。
