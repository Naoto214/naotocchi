# CARD GAME 全452枚アート統合・本人専用試遊

## 正本と変更範囲

- 開始main: `fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7`
- 開始main tree: `00f8ce47b39c76e25440c54d349a0e83d483dd76`
- アート正本PR #393: `a6ad1a9689335f0379d5c6795d1da8652f02ac0d`
- アート正本tree: `78acf7646be2967c330f79b54fa53379b304039d`
- 取り込み先: `feat/card-art-integration-20261019` / Draft PR #396、base main
- `art-pilot/` 全体は元のsubtree `77590177c4ebb6855d036f67c380b22438f2b17b` をそのまま保持。452原画・1356完成/縮小PNGと、旧版・比較・provenance・inventory・品質記録を再生成/編集しない。
- 原画取り込みcommit: `c1c702856e266fc07fbcaeebbb3263a86d29d5b4`。

本体の変更は共通描画 `ui-presentation.mjs`、画像registry `ui-art.mjs`、画像エラー処理 `ui-art-loading.mjs`、デッキ行の画像とエラー処理を接続する `app.mjs`、アート部分の `style.css`。配信用画像・再現可能な生成/照合/パッケージ作成スクリプト・専用テスト・本記録を追加。

エンジン、452枚の本文/数値、全ルール、Python、固定400戦、response/chain、必須選択、自動パス、勝敗判定、state/save、二重操作拒否、通知4秒の制御、既存履歴の生成/時系列/重複除去、他ゲームは変更しない。履歴は既存の閲覧者別データから画像のみを追加する。

## 接続方式

`art-pilot/rollout/final-452-20261019/deck-manifest.json` を入力に、原画のSHA-256と452の正本IDを照合して `art-delivery/manifest.json` と `ui-art.mjs` を生成。IDを推測した別カタログや旧本文を導入しない。

手札、自他の盤面、捨て札、発動領域、図鑑/デッキ編集、結果通知、履歴は共通 `cardMarkup` の小画像、詳細だけは大画像を使用。カードの金縁/植物装飾、名前、分類、時コスト/成長段階、ちから/ちえ、能力名/効果本文は最新mainのデータからDOMとして描画する。完成カードPNGはゲームUIに貼らない。

14色は元の `approved-colors.mjs` を直接import。属性8マークは元の `symbols/attributes.mjs` を直接importし、SVG pathを変えない。明るい分類では採用済み濃色線を適用。カテゴリー6マーク、金縁/植物装飾、青銀植物紋章の裏面は維持。

非メインの詳細カードは採用済みPilotの3:2イラスト窓と左右余白を適用。盤面/手札のカード外形・既存viewport/safe-area/回転処理は維持する。能力全文の独立した読み取り欄も維持する。詳細メインの3枚の2.9cqw例外と、フォント読み込み後の3.1〜2.4cqwの収容処理も採用済みPilotから引き継ぐ。閉じた/置換された詳細には非同期処理を適用しない。

## 配信と最適化

- 小画像: 384×256 WebP quality86。80/110px程度の表示を高DPRで使えるサイズ。
- 拡大画像: 1152×768 WebP quality90。詳細を開いた時だけ利用。
- 元1536×1024 PNGは全件保持。
- ファイル名は画像内容のハッシュを含む。本人専用試遊パッケージにprivate長期キャッシュヘッダーを用意。
- 小画像はnative lazy loading、全画像はasync decoding。全452枚の画像先読み、Service Worker、画像Blobの保持、独自キャッシュは追加しない。
- エラー時はリクエスト属性を外し、同じ画像枠の分類マークと説明に切り替える。カード名/本文/数値/操作は残る。
- RGBA展開量の計算値: 小画像393,216bytes/枚、大画像3,538,944bytes/枚、元PNG6,291,456bytes/枚。Safariの実測メモリではない。

再生成:

```sh
NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node prototypes/card-game/art-delivery/build.mjs
NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node prototypes/card-game/art-delivery/verify.mjs
node prototypes/card-game/art-delivery/package-trial.mjs /absolute/path/to/dist
```

## 非公開情報

描画入力は既存safe view/catalogのみ。裏向きカードはIDや画像registryを見る前に共通裏面へ分岐。山札には画像一覧/順序を渡さない。履歴/結果通知は既存の閲覧者別 `rows[].cards` のみから描画し、公開/相手projectionの非公開ドローには画像URLを生成しない。

受け渡し・blur・background・pagehide・保存復帰時の既存DOM除去/非公開状態復帰を維持。新しい画像処理はstateや保存データに接続しない。公開カタログのID→画像registryには席、カードinstance、手札、山札順序の情報を含めない。

## 検証と公開

結果は `art-delivery/verification.json` と `evidence/art-integration-20261019/` に記録する。統合前は既存カードゲームテスト258件成功。原画/プレビュー/配信用画像のデコード・ID/ハッシュ/寸法/重複、14色/SVG、本文、全表示経路、閲覧者別画像の秘匿、既存対戦完走/保存復帰/自動パス/chain/必須選択/二重操作拒否を重点確認する。

大規模監査・固定400戦・カタログ再生成は再実行しない。大規模な他ゲームの再テストは行わず、Git差分で保護対象の無変更を確認する。

新しい本人専用Site: `appgprj_6ad54c3b81588191b6496d2aab0a6638`。既存 `naotocchi-card-ui-trial` と `naotocchi-card-trial`、本番GitHub Pagesは変更していない。

- 試遊URL: https://naotocchi-card-art-452-20261019.kerzion214.chatgpt.site
- 配信状態: succeeded（2026-10-18T23:13:46Z）、本人のみアクセス可能。
- 配信ソースcommit: `92677074070ab678cdb85f8d5f3b855c51183465`
- 保存版: `appgprj_6ad54c3b81588191b6496d2aab0a6638~appgver_092b90840f1c81918deb4f5af39215bc`（version 1）
- deployment: `appgdep_6ad5527302108191a7c73fc9b37353dc`
- 配信archive SHA-256: `906c2892ae740b092270815b137cdcbb98f80b68f5dad4632c2c912326cda7d8`
- 独立Draft PR: https://github.com/Naoto214/naotocchi/pull/396 （base main、branch `feat/card-art-integration-20261019`）

パッケージは本ブランチのゲーム実行ファイルと904WebP、共通デザインモジュール、採用裏面、たまご画像を収録する。配信版indexの試遊タイトル/バッジ以外は同じゲームコード。原画と制作記録はGitHubに保管し、試遊版の初回読み込みには含めない。最終GitHub HEAD/treeは自己参照を避けPR本文に記録する。

## 実機QAの残件

このmanaged環境には許可されたcontrol-browserがないため、今回の実ブラウザ描画・実測読み込み時間/メモリ・実機Safariは未検証。既存のviewport計算テストを再利用するが、Safariでの見た目/タップ/回転/バー開閉を検証したことにはしない。

iPhoneで縦横/バー開閉、80/110pxの識別、長いカード本文の収容、拡大、デッキ編集、2人対戦、通知4秒/履歴、手渡し/背景復帰/保存再開、低速回線と読み込み失敗を確認する。実機QA後の別承認までmainマージ・本番置き換えは行わない。PR #393もDraft/open/未マージを保持する。


## 今回実行した検証結果

- 既存258件 + 新規7件 = 265件成功、失敗0。
- 原画452枚、完成/縮小プレビュー1356枚、WebP904枚のデコード成功。
- 原画SHA-256一致、欠落0、ファイル重複0、デコード後の原画画素重複0、WebP重複0。
- 原画1,287,568,992bytes → 小画像17,128,656bytes + 大画像120,446,468bytes。全画像を一括ロードする値ではない。
- 独立コードレビュー: blocking指摘0。画像表示/秘匿の専用テスト、全静的importの配信ファイル閉包、904画像パスとたまご画像、正式配色/マーク、非公開identity参照/先読みの非追加を確認。レビュー後に追加した長文収容テストも含め、最終実行は上記265件成功。
- Git差分確認: `art-pilot` subtreeは正本と同一。エンジン/ルール/本文/保存/通知制御/履歴データ生成/本編は無変更。
- 原画の小/大WebP代表4枚を比較し、顔・主要形態・構図が保たれることを目視確認。カードUIのスクリーンショット検証とは区別する。
