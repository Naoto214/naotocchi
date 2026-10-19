# たまご重ね置き — 検証・試遊記録

基準: main `0130bb2ba4deb7e4a174f48d56dbb3edfc76afb9`。2026-10-19。

## 結果

| 検証 | 結果 / 証跡 |
|---|---|
| CARD GAME回帰（直列） | 343件中342成功。残る1件は既知のFUN_ITEMS再生成監査不整合。`evidence/card-suite-final.log`。この実行後に追加した実遷移2件は次行で検証。 |
| 最終差分・非公開情報・入力・iPhone CSS | 37/37成功。新規たまご4件を含む。`evidence/final-focused.log`。 |
| 実エンジンのたんじょう・離脱・復帰・再生 | 4/4成功。`evidence/egg-transitions.log`。80枚保存則、手札返却、メインの捨て札移動を確認。 |
| CPU10ラウンド | 3デッキ×2seed×人間先攻/後攻=12/12完走。途中保存復帰・legal command再生一致。`evidence/cpu-completions.json`。 |
| Pages単体テスト | 11/11成功。`evidence/pages-unit.log`。 |
| Pages配信パッケージ | 4,100ファイル / 213,844,552bytes。基準比+545,147bytes。350MB上限を維持。`evidence/pages-package-final.json`。 |
| HTTP配信検査 | 452ID・904画像、欠落0、hash不一致0、除外3経路404。`evidence/pages-http-final.json`。 |
| 独立コードレビュー | ブロッカー・セキュリティ回帰なし。関連25テストを別途実行して成功。実機・画像の美術評価は対象外。 |
| 本編全体の追加npm test | World系の長時間テスト中に追加実行を終了。全体成功とは扱わない。途中記録は`evidence/project-suite.log`。今回の必要なCARD GAME/CPU/Pages検証は上記のとおり完了。 |

初期の`baseline.log`は不完全なsparse checkoutでの参考記録。`card-suite.log`の並列実行時の時間閾値失敗は、閾値を緩和せず直列再実行で成功。初期画像のpackage/http記録より`*-final`を優先する。ログの末尾空白は実行出力をそのまま保存している。

## 保護した境界

変更はUI、通常たまごの新規画像・資料・差分テスト、allowlistの画像2件と実行3ファイルのhash、および承認された正式ルール配置3段落のみ。engine・カード452定義・CPU・save/schema・Python正本・固定400戦・既存原画・本編/なおぽよ/3D・workflowは無変更。2人対戦・応答/chain・自動パスの既存テストを回帰で確認。

## 本人限定試遊

- URL: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/
- UI比較: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/egg-design/comparison.html
- 印刷PNG: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/egg-design/egg-card-print.png
- project: `appgprj_6ad615d9bfec8191951d8166d47c3040`
- source commit: `503d2cb0a86a715b100c6035ee8de24c2fddbcea`
- deployment: `appgdep_6ad6193394208191b9c2756a41dcc36f` / `succeeded`

新規owner-only Site。既存の正式GitHub Pagesは更新していない。GitHub mainへのマージも行わない。

## iPhone実機QAの残件

この環境ではブラウザー/実機QAを実施していない。比較HTMLは実際の旧/新レンダラーによる静的比較で、スクリーンショットではない。実機で縦横表示、Safariバー開閉、通知中の盤面安定、カード/閉じるのタップ、たんじょうとメイン離脱、CPU先後、2人引継ぎ、保存復帰を確認する。mainマージは実機QA後の別承認。
