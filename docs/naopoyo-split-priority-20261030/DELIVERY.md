# Delivery — 分裂生成順位 A/B/C

実装・調査・独立Draft保存・本人限定公開を実施。mainマージ／本番Pages更新／正式物理・ステージ・解答・セーブ変更なし。

- [本人限定比較ページ](https://naopoyo-split-priority-20261030.kerzion214.chatgpt.site/)
- [A/B/C × 8方向の操作可能な順位図](https://naopoyo-split-priority-20261030.kerzion214.chatgpt.site/prototypes/naopoyo-split-priority/atlas.html)
- [本人限定調査報告](https://naopoyo-split-priority-20261030.kerzion214.chatgpt.site/prototypes/naopoyo-split-priority/report.html)
- [Draft PR #492](https://github.com/Naoto214/naotocchi/pull/492)
- [全調査報告](REPORT.md) / [独立レビュー](REVIEW.md) / [実行・判断記録](PROGRESS.md)

## 結果

Aは正式BFSをそのまま呼び、全10面312手で状態とイベントを照合しました。1歩先を全部探索してから、合法な中継を発見順に展開し2歩先へ進みます。2歩先の優先順位は障害物によって変わり、固定の方位表だけでは説明できません。
Bは方向ごとに1→直線2歩（最大16候補）。Cは近傍→後ろから時計回りの外周（最大24候補）、固定枠と経路の合法性を分離します。

|方式|既存保存解答|新しい別解を含めた解答確認|第19面78手|第20面97手|
|---|---:|---:|---|---|
|A|10/10|10/10|成立|成立、16/16救出|
|B|5/10|9/10|不成立、別解71手|13手目に状態差、15手目で再生不能|
|C|8/10|9/10|成立|35手目に状態差、36手目で再生不能|

B/C20面は追加の厳密キー探索も各60000状態で上限。解答不能／最短性は未証明。盤面変更なし。Cは候補間の固定順位を説明しやすい可能性がありますが、実プレイヤー評価は未実施です。正式Aは維持します。

## 別解の実測

|面|方式|手数|分裂|同一手の親子等再合体|余剰分離|2歩を使った分裂|方向変更|操作ID変更|
|---|---|---:|---:|---:|---:|---:|---:|---:|
|16|B|46|4|1|3|4|27|26|
|17|B|41|4|3|2|2|20|13|
|18|B|31|7|7|7|7|21|18|
|18|C|32|6|6|7|6|22|19|
|19|B|71|7|5|9|7|48|43|

別解の最短性は未証明。旧解答の接頭部と別解の全手を直接比較して難易度を断定しません。全解答・分裂イベント・障害物480条件を対応JSONに保存しています。

## 検証

|対象|結果|
|---|---|
|専用テスト|43/43成功、fail/skip/cancel0|
|正式パズル回帰|1529/1529成功|
|CARD GAME回帰|530/530成功|
|本編 npm test|3504/3504（32+24+3289+159）、smoke/dialogue/visual成功|
|Pages unit|16/16成功|
|正式エンジン・ステージ・解答・セーブ・他ゲーム|基準mainとの差分0|
|生成エンジン由来|正式blob一致、許可した候補差替え・観察フックだけ|
|8方向×3方式|順位・経路を実関数から算出、SVG24枚と操作可能なatlas|
|配布物|50ファイルがGitHub実装と一致＋生成入口/manifest2ファイル|
|アクセス|本人owner1名、外部0名、グループ0。匿名モジュール403|
|実ブラウザー|cua起動時 Connection closed。未確認|
|320/375/390/430px|レスポンシブCSSを実装。各幅の実表示・タップ・回転は未確認|

本編回帰は変更のない正式コードを対象とし、比較専用コードは43件と物理差分・480条件で検証。UIのテストは実appソースの最小DOMハーネスとcanvas座標記録であり、ブラウザー／iPhone実機試験ではありません。静的SVGの親画像・順位・色・文字はPNGへ変換して目視確認しました。

独立レビュー3件を再現失敗→修正成功で確認。後続の観察集計修正はB20第13手の「子1体対A2体」を生成差として数えるもの。ゲーム物理には触れていません。

## GitHub / 公開の正本

- branch: experiment/naopoyo-split-priority-20261030
- base main: 851cf09a80c7ed41ba7293888084272917e4582c
- 最終実装HEAD: da67736777498c7731b765a38256798f9d3b1017
- 最終実装tree: c0273986484d5286ec8b48813e6a3a5a44c08fca
- Sites source: 73d46a3e22dde5a69657e58594476382aea716c0
- Sites保存版:2 / deployment:appgdep_6ae491c561608191ba43346828207e63 / succeeded
- この後の記録コミットはdocs内の検証資料だけ。実行コード・データ・workflowは上記HEADのままです。

通常git pushはこの環境に認証情報がないため使用できず、GitHub connectorでtree/commit/新規branchを保存。ローカルとのtree一致を確認し、既存branchの更新はexpected SHAを指定したfast-forwardのみ。force pushなし。ローカルの元コミットもcheckpoint branchに保護しました。

## CI

- 修正前実装fd9bb3baの[専用CI 3ジョブ](https://github.com/Naoto214/naotocchi/actions/runs/41056576368)および[Pages](https://github.com/Naoto214/naotocchi/actions/runs/41056576330)はsuccess。
- 最終実装da677367の[専用CI](https://github.com/Naoto214/naotocchi/actions/runs/41057840304)、[Runtime](https://github.com/Naoto214/naotocchi/actions/runs/41057840043)、[Pages](https://github.com/Naoto214/naotocchi/actions/runs/41057840185)、Home layout、World visual qualityは最新照会をevidence/ci.jsonに保存。
- 未完了のCIを成功とは扱いません。記録のみの最終コミットは[skip ci]を付け、上記実装SHAのCIと区別します。

## 残る確認

1. 本人iPhone Safari実機、画面回転・実タッチ・OS復帰、320/375/390/430pxの実ブラウザーQA。
2. B/Cの第20面の解答有無、別解最短性。
3. 人による予測正答率・操作負荷・理解しやすさの比較。
4. 最終実装の未完了CIの結果（最新状態はevidence/ci.json）。
5. 100ステージ全体への適合。今回新ステージも正式チュートリアルも作成していません。

B16候補の表記、C45度回転の格子上の制約、準備済み到着状態による生成比較、縮約探索を不能証明としない判断、D一列案を混ぜない判断はPROGRESS/REPORTに明記しています。誤った前提のまま正式化すると手数・解答可能性・学習負荷が変わるため、正式採用は保留です。
