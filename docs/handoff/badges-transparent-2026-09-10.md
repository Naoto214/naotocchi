# 継続地点：白背景・クリアバッジ・季節地域

再開時は最新main、open PR、PR本文、チェックポイント、QAを実際に取得する。
前回のDraftや「未公開」という文を恒久的な禁止と解釈しない。

基準mainは `eeb4706fcd4fff2287fbd17538a3b68fdf68f2a9`。
#227までマージ・公開済み、Runtime #300・Pages #225成功、公開3ファイルも一致。
このmainから `feature/badges-transparent-season-art-20260910` で続行した。
この文書を含む確定HEAD・tree・CI・マージ／公開状態はPR本文とGitHubを読む。
保存時点では今回追加分は未マージ・未公開。

ユーザーのiPhone画像 `IMG_5205.png` を読み、白背景の問題を確認。
CSSの白下地を除去し、白背景RGBのお世話atlasを別ファイルの透過v2へ切替。
元のv1と既存309画像はすべてバイト変更0。
5段階の上部クリアバッジをイラスト化。病気・睡眠にも画像失敗時の代替表示を付けた。
新しい季節地域16素材を選択肢、世界情報、同じ地域・季節の飾りへ接続。
地域の選定・会話・master・お世話・死亡・保存・キャラ配置や大きさは変えない。

読む資料：

1. [QA](../qa/badges-transparent-2026-09-10.md)、同名JSON、[テスト全出力](../qa/badges-transparent-test-output-2026-09-10.txt)。
2. [素材仕様と生成プロンプト](../art/badges-transparent-season-region-2026-09-10.md)、
   新2atlasとJSON、[静的な比較見本](../qa/badges-transparent-art-check-2026-09-10.png)。
3. [前回の引継ぎ](weather-scenery-2026-09-10.md)、POST_RELEASE_CHECKPOINT_2026-09-10.md、最新master。

`npm test` は142成功・失敗0・skip 0。独立レビューの未解決指摘0。
ユーザー提供の修正前画面1枚、AI取得の修正後画面0件。
素材見本やNode成功を、iPhone描画・タッチ・音・FPSの証拠にしない。
QAの `badges_transparent` と `season_*` の3種を既存care*／scenery_*に追加した。

今回分の統合・公開確認後、残る地域の動物・細かい飾りやミニゲーム個別小物を、
既存PNG・Canvasと他タブの最新PRを点検して進める。別タブ未コミット素材は未確認。
旧#92の整理は別枠で保留。既存デート・記念日判断は保持し、同じ実機確認を頼み直さない。
全体開発は未完了。
