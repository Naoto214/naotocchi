# version 6 公開・検証記録

実装・全10面の新ルール解答・ローカル回帰・本人限定配信を完了。本人のiPhone Safari実機QAは未実施。GitHub CIの状態は下表を正とし、実行中を成功とみなさない。

## 保存した正本

- 最新remote main確認: `0b3bb1fe77f7b9829e94f2284ce2b56eb3fe1e0e`。
- PR #435 merged。PR #436はopen/draft、branch `feat/naopoyo-chapter2-gravity-pilot-20261024`。
- 実装commit: `73e358df74d70a805682c5e4538233e6f61c7929`。
- 実装tree: `fb500b0836acc67571c44165c3c7b11683bec9e9`。
- 通常git pushは認証が利用できず失敗。接続済みGitHub APIで同一treeを作成し、親HEADを指定してcommit、expected_sha一致・force=falseでブランチへ保存。ローカルtreeと完全一致を確認。
- この公開記録を含む後続commitはdocs配下の証跡だけを追加する。実装・配信元は上記SHAで固定。
- mainマージ、本番GitHub Pages更新なし。第1章・本編・CARD・正式画像原本の直接変更なし。
- 最新mainには別案件のCARD検証・ミニゲーム変更がある。今回の変更との共通ファイルはPages allowlistだけで、mainはgames/index/quick/styleの4 hash、今回は共通engineの別エントリを更新。正式統合時は双方を保持して再検証する。今回のローカル回帰はPRブランチに対する結果で、mainへ統合した結果と混同しない。

## 本人限定配信

[iPhone QA・第2章11〜20](https://naopoyo-komorebi-20261024.kerzion214.chatgpt.site/prototypes/naopoyo-chapter2/qa.html)

- 既存URLを維持、VERSION 6。
- Sites source commit: `9a1d75ed1841c8eb3ab0d4a8dbe32f05f0265fa6`。
- version: `appgprj_6adc23fed6a08191946282f35ecfd94a~appgver_8e6204e149308191af4b5ad0f0731b1c`。
- deployment: `appgdep_6addb3ad14008191b42879f7faef6b5c`、succeeded。
- 公開後のアクセス設定: owner 1 / groups 0 / external 0。
- 配信64ファイルのHTTP 200・SHA-256一致、欠落/不一致0。version.jsonも完全一致しsourceCommitは実装SHA。
- 未認証HTTP 403。ブラウザでもログイン画面を確認。
- 初回HTTP照合は検証クライアントのBearer指定不足で401。認証ヘッダー形式を修正して全件再検証し成功。失敗記録も保存し、アクセス設定は緩めていない。
- 比較HTMLはGitHub資料だけに保存し配信packageへ含めない。

生の結果: [deployed-files.json](evidence/deployed-files.json)、[初回認証形式エラー](evidence/deployed-auth-format-error.json)。

## ローカル回帰結果

|検証|結果|
|---|---|
|合同パズル（第1章・第2章・共通v2等）|731/731成功、失敗/skip/cancel 0|
|本編npm test|3,432/3,432成功、smoke/dialogue/visualを含めexit 0|
|CARD GAME|412/412成功|
|Pages単体|16/16成功|
|Pages package/HTTP|4,053ファイル、欠落/hash不一致0|
|全10面session全手|解答・保存復帰・Undo・Retry・段階合計・状態妥当性・決定性すべて成功|
|独立レビュー|338件＋30,000操作、Critical/Important/Minor指摘なし|

第1章の旧解答・保存・順次開放の回帰を維持。新ルールは第2章だけopt-in。旧途中盤面/Undoは移行しない。旧保存キーは読取専用で進捗だけ引継ぎ、元データへ書かない。

## GitHub CI

観測時刻: 2026-10-25T08:11:43.218Z。対象は実装commit `73e358df74d70a805682c5e4538233e6f61c7929`。**9/9ワークフロー成功、失敗・実行中0**。第2章puzzle/card/main-regression、Worldの全ジョブ、Homeの両ジョブも成功。

|ワークフロー|状態|
|---|---|
|[Runtime smoke test](https://github.com/Naoto214/naotocchi/actions/runs/40173929296)|success|
|[World visual quality](https://github.com/Naoto214/naotocchi/actions/runs/40173929261)|success|
|[Home layout](https://github.com/Naoto214/naotocchi/actions/runs/40173929267)|success|
|[Naopoyo Chapter 2 Pilot](https://github.com/Naoto214/naotocchi/actions/runs/40173929260)|success|
|[Naopoyo official release](https://github.com/Naoto214/naotocchi/actions/runs/40173929264)|success|
|[Pages runtime package](https://github.com/Naoto214/naotocchi/actions/runs/40173929286)|success|
|[Naopoyo World Pilot](https://github.com/Naoto214/naotocchi/actions/runs/40173929290)|success|
|[Naopoyo Insight Pilot](https://github.com/Naoto214/naotocchi/actions/runs/40173929359)|success|
|[Naopoyo Chapter 1](https://github.com/Naoto214/naotocchi/actions/runs/40173929263)|success|

後続の証跡commitはdocsのみで`[skip ci]`を付け、同じ実装の長時間CIを重複実行しない。実装commitのCIは中断・無効化しない。

最新mainとの`git merge-tree`による仮想統合は競合0。保護対象（第1章・CARD・assets・本編/ミニゲーム主要ファイル）はmainと差分0、Pagesのmain側4項目とengineのhashも同時成立。ブランチ/HEADは動かしておらず、統合後の実行テストの証明ではない。

## 未確認・限界

- 本人のiPhone Safari実機、指での遮蔽、本人端末内の保存データ、19/20の体感難易度。
- 最短性は11〜14だけBFSで証明。15〜20の手数は解答存在の証拠。
- 19の余剰分離なし探索は上限に達したため必要性未証明。20は分裂・合体・余剰分離それぞれが必要と全探索で確認。
- Cloud Chromeで比較表示・19盤面・QA選択・8の実ドラッグ透過を確認。最終公開URLでログイン後の全操作は未確認。配信一致とsession自動検証で補完するが、実機QAの代用とはしない。
- 追加の独立した小画面ブラウザ実行は、ローカルにChromium/WebKit実行ファイルがなく未実施。既存の自動テスト成功件数へ含めない。
