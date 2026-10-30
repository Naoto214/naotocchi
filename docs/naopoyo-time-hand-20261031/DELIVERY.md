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
