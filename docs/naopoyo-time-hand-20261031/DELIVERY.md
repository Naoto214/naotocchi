# 本人限定公開・最終検証

- Draft PR: https://github.com/Naoto214/naotocchi/pull/494
- Branch: `experiment/naopoyo-time-hand-split-20261031`
- 検証済み実装HEAD: `11980dcd5aa8b987d68ff156434e5655529cec44`
- 検証済み実装tree: `70615129078a813520b2db610138f1df0674345b`
- 最終PR HEAD/treeはPR本文で記録（この文書の追記コミットには自己参照できないため）。最後の追加は検証記録のみ。
- ローカル実装treeとGitHubプラグイン保存treeは完全一致。Git CLIには認証情報がなく、GitHub APIでGit tree/commitを保存し新規ブランチを作成。force pushなし。
- 再利用元PR492 HEAD `814af477c1d8fa0a13f6db6746eca685ea2eb052`、main `851cf09a80c7ed41ba7293888084272917e4582c` は公開後も不変。

## 本人限定 VERSION 1

- URL: https://naopoyo-time-hand-20261031.kerzion214.chatgpt.site/
- アトラス: https://naopoyo-time-hand-20261031.kerzion214.chatgpt.site/prototypes/naopoyo-time-hand/atlas.html
- Site: `appgprj_6ae4bc43c7e88191b986936c7771e9b4`
- Source: `d8f9f51978bed3c2cda8036250a4a3c8ccd3ae1a`
- Version: `appgprj_6ae4bc43c7e88191b986936c7771e9b4~appgver_47ed1407e36481919e230f0f591c7d6b`
- Deployment: `appgdep_6ae4c2f18a1c8191af25600429f020d2` / succeeded
- 保存済みarchive hash: `sha256:8b2cae7374b552329cfb807c953bfeab79125fe14ff6bc6ae7278c8329c6408d`
- アーカイブ55ファイル（hosting設定含む）、317,440 bytes。公開54ファイル、約265KBのコンテンツ。
- 全54ファイル HTTP取得・SHA-256一致。匿名engine.mjsは403。アクセス権: owner1、外部0、グループ0。
- 52の参照元ファイルはGitHub実装とバイト一致。rootの導線HTMLとmanifestは梱包用生成物。相対importグラフも欠落なし。
- 保存読み書きなし。本番と別originで、クリア・Undo・実セーブを参照しない。

## 自動検証

|項目|結果|証拠|
|---|---|---|
|D専用42＋ABC43|85/85成功|final-85.log、time-hand CI|
|シナリオ|960条件・段階合計保存・有限停止|audit-final.log、scenarios.json.gz|
|派生仕様|1440条件|variants.json|
|正式パズル|1529/1529成功|puzzle-complete.log、puzzle CI|
|CARD GAME|530/530 GitHub CI成功|card CI 124174977438|
|Pages|16/16成功・build成功|pages-retry.log、Pages CI|
|正式ファイル保護|main32986、ABC33099ファイル全て不変|protection.json|
|配信|54/54 SHA-256一致|deployed-files.json|

CI実装対象は11980dcd。専用workflow: https://github.com/Naoto214/naotocchi/actions/runs/41088241483
CIの確認時点の状態はevidence/ci.jsonに収録。13ジョブ成功、既存Runtime smoke-test・World Visual regression・Home Layout home-layoutの3ジョブは実行中。これらの成功は未確認であり、全CI成功とは報告しない。Pages deployはPRのためskipped（本番更新なし）。完了後の状態はPRのChecksが正本。

ローカル広範回帰の初回失敗ログも保持。sparse checkoutで不足していた資料・画像を取得後、正式パズルは1529件成功。CARDローカル最終529/530の残る1件はカタログ再生成監査が未取得の歴史資料を要求したもの。完全なcheckoutのGitHub CIでは530件全成功。ローカルnpm testも未取得character-3d/runtime.mjs等で完走せず、Runtime全体はGitHub CI結果を参照する。

## ブラウザーQAと未確認事項

- 実ブラウザー制御の起動は `Connection closed` で失敗。別のブラウザー基盤へ置き換えて成功扱いにしていない。
- 公開サービス生成の1200×750スクリーンショットで、見出し・ABCD・D既定説明・設定欄の初期表示を目視確認。盤面より下は画像範囲外。
- 320/375/390/430pxはDOMイベント・canvas座標の単体テスト。実ブラウザーのレスポンシブQAではない。
- iPhone Safari、指によるタッチ、回転、実画面はみ出し、認証後の切替操作は未確認。
- 静的生成図80枚のうち8条件をコンタクトシートで目視確認。正式PNGを使用。
- 本人による予測しやすさ・名称評価、16/19/20面の解答有無、最短性、将来100面の正式設計は残課題。

## 判断と保護

標準Dは方向維持・生成済み1を障害物・経路7歩。距離は累積歩数と解釈し、通過比較案も歩数を消費する。斜めが盤面角で3/4体に止まるケースを仕様どおり保持。第1章の既存バージョン別ルールも保持。

独立レビューのUndo不整合はRED→GREEN修正済み。報告ページの探索結果不足も完成時に追記。詳細はREVIEW.md。
mainマージ、本番Pages更新、正式stage/engine/answer/save変更、PR492へのpushは一切行っていない。

## 継続確認（2026-10-31・日本時間）

前回の実装を再利用し、未完了だったCIの結果と公開状態を再確認した。今回の変更はこの検証記録のみ。ゲーム実装・配信・正式ルールは変更していない。

- 再開時PR #494: open / Draft、HEAD `fe7b231fee692ac03a9814bb1ffdf1bed4f9f245`。
- 実装HEAD `11980dcd5aa8b987d68ff156434e5655529cec44` のチェック17件は全て完了。**16件success、1件skipped（Pages deploy）**。failure・実行中は0件。
- 前回待機中のRuntime `smoke-test`、World Visual `regression`、Home Layout `home-layout` もsuccess。下表は今回GitHub APIから取得した完了結果。以前のevidence/ci.jsonは当時の履歴として保持する。
- 実装HEADから再開時HEADまでの差分は報告・検証資料13ファイルのみ。実装が後から変わっていないことをcompare APIで確認した。今回ローカルテストを再実行したという意味ではない。
- 最新mainは `7c1f18c77b902d06159157899c36104e5d8c4a8d`。前回記録から進んでいるが、本作業では変更していない。
- PR #492はopen / Draft、HEAD `814af477c1d8fa0a13f6db6746eca685ea2eb052` のまま。
- Sites get_site: active、VERSION 1、custom、owner 1人、外部訪問者0、グループ0。再公開・アクセス権変更なし。
- 公開URLを実ブラウザーで開き、「アクセスするにはログインしてください」と「ChatGPT で続行」の認証画面を確認した。前回の起動不可とは異なり、今回はブラウザー起動と認証画面までは確認できた。
- 「ChatGPT で続行」からの認証遷移は自動承認審査が拒否。理由はauth.openai.comでのログイン開始への明示承認不足。認証を迂回していない。認証後のA/B/C/D切替・配置操作・iPhone幅・実タッチ・回転は引き続き未確認。
- 配信54ファイルのハッシュ照合は前回の証拠を維持。今回再取得・再照合したとは扱わない。
- 16/19/20面の別解、予測しやすさ、名称の本人評価は未確認のまま。解答不能とは判定しない。

|チェック|結果|参照|
|---|---|---|
|deploy|skipped|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241405/job/124175802180)|
|smoke-test|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241771/job/124174978232)|
|time-hand|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241483/job/124174978112)|
|browser (smoke)|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241277/job/124174978071)|
|build|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241405/job/124174977991)|
|character-integration|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241277/job/124174977943)|
|puzzle|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241483/job/124174977660)|
|browser (corridor)|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241277/job/124174977622)|
|browser (visibility)|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241277/job/124174977528)|
|browser (captures)|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241277/job/124174977483)|
|puzzle|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241446/job/124174977441)|
|card|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241483/job/124174977438)|
|comparison|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241446/job/124174977424)|
|regression|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241277/job/124174977238)|
|pad-size|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241326/job/124174977216)|
|home-layout|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241326/job/124174977025)|
|card|success|[GitHub job](https://github.com/Naoto214/naotocchi/actions/runs/41088241446/job/124174976853)|

## ログイン開始の明示承認後の確認（2026-10-31・日本時間）

- 本人が比較サイトへのChatGPTログイン開始・既存認証セッション利用・比較版QA・PR494への記録を明示承認した。パスワード／認証コードの取得・入力代行は禁止、本人の追加操作が必要な時点で停止する指示。
- ブラウザーに残っていた認証タブ `https://auth.openai.com/log-in` を確認。「お帰りなさい」、空のメールアドレス入力欄、続行、Google／Apple／Microsoft／電話番号の選択肢を実画面のアクセシビリティ情報で確認した。
- 既存セッションによる認証済み画面は確認できず、本人によるログイン方法選択または入力が必要な状態だった。この時点で本人指示に従い停止。ログイン方法の選択、メール入力、パスワード／コードの取得・入力、認証迂回は行っていない。
- 今回の停止理由は追加承認不足ではなく、本人操作が必要な認証画面に到達したこと。前回の自動承認審査拒否は履歴として保持する。
- **認証後の実ブラウザー確認事項：なし。** A/B/C/D比較ページ表示、時の針の生成経路・90度回転・重力・再合体、320／375／390／430pxと横向き表示はすべて未確認。
- 今回は検証記録のみ更新。実装・配信・公開範囲・正式ルール・盤面・解答・セーブ・main・PR492・他Workには変更なし。PR494はDraftを維持する。
