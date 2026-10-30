# なおぽよ。第2章11〜20面 — 正式公開完了

**2026-10-30最終確認：main統合・本番Pages配信・実ブラウザーQA完了。** マージ前10系統、マージ後5系統12ジョブのCIが全成功。公開4,086ファイル一致、20面97手16/16救出を通常速度でも確認。本人iPhone Safari実機QAのみ別途未確認。以下のマージ前欄は当時の検証経緯として保持する。

## マージ前の確定証跡

- 開始main: `e33ec25a334217227f0708b452a8be91fa4d1e60`
- PR436: `ab937a22e2ae246b87b58932815dad2c4e8a2d87`
- PR482: `79981ddee5772a0b301da8a06a63faa6ca4d9661`
- PR483: `809c1f8b5153b7f0f5ab125192ca5a3d8f4773a0`
- 統合PR484 / branch: `integration/naopoyo-chapter2-release-20261030`
- 実装・ローカル検証HEAD: `eb45d64f55e549f1adb368d046e3c3d7cc5c19e9`
- tree: `5517352b322d15b0a0c432ee24ba8d167638f4f8`
- PR CI合成HEAD: `45f65bc5ca7296e046763309d3a77b92b7acd3ac`（同treeをマージ直前にも確認）
- 旧ローカル候補 `ae4707005a1f479d9acb2bfd2494f3f0e28142b8` は同tree。公開候補はmainと全3PRを親に持つmerge commit。全3HEADの祖先関係を確認済み。

本文の候補実装と証跡追加コミットは区別する。証跡は別evidenceブランチへ保存し、CI中の候補HEADは変更しない。元PR/WIP/本人限定URLは変更しない。

## 統合内容と競合処理

3本の順次統合はテキスト競合なし。意味上の統合は以下を実施。

- PR436の全10盤面・重力・トゲ1手1回・最大2マス分裂・分裂後再合体・ゲート通行/支持・出口非支持/救出・8方向/斜め角制限を維持。
- PR482の短縮解答、手数表示、ひと筆Undo、白被覆撤去、通常停止UI撤去を保持。ForestSessionのunpaused UndoとPR483 contact presenterを両立。
- contact-v2を第2章正式ルールに指定。同種族3+4=7、5+6=8+3、4+8=8+4、8+8=8+8。操作IDが移動先、相手IDが余剰。異種族だけ双方合法な交換。段階合計保存。
- 接近→接触→数字確定→余剰分離、8+8にswapを使わず、4+8も同一モーション。通常/おてほんで同じmotion duration。reduced-motion対応。新しい説明ポップアップなし。
- 既存テストが捉えた途中分裂体の瞬間消失を修正。吸収後のopacity補間を追加し、既存回帰を維持。
- 第1章保存実装・盤面、WorldSession、本編script.js、CARD GAMEはmainとbyte-identical。第2章の盤面定義・解答JSONはPR482と同一。
- 正式ポータルは第1章へ接続したまま、第1章終了/案内から第2章へ進む導線を追加。未開放制限を維持。
- Pages exact allowlistへ第2章runtime/解答30ファイル追加。QA・比較版を配布しない。配信4087ファイル、213694446 bytes。

変更ファイル一覧は `evidence/changed-files.txt`、再現用parent/treeは `evidence/provenance.txt`。

## セーブ互換性

新キー: `naopoyo.komorebi.contact-v2.20261030.v1`（QAは末尾`.qa`）。旧V11/12キー `naopoyo.komorebi.recombine-once.20261028.v1` はread-only。旧途中盤面とUndoは旧キーにそのまま残し、新物理では復帰しない。クリア・開放・ヒント/既読だけを移行し、新ルールの盤面を開始する。

破損旧サマリはappend-onlyクリア/開放マーカーから回復。第1章の破損サマリでも最終クリアマーカーを尊重（第1章の保存コードは無変更）。将来バージョンの盤面はキャッシュ・最新サマリ・独立slotの全てを調べ、古いタブによる上書きを防止。旧キーや他ゲームのキーを削除/初期化しない。独立レビューの2 Importantを再現テストRED→GREENで修正済み、Critical0、残件0。

おてほん位置はステージ別key v2、正規化された全解答列と物理ルールIDによる厳密識別。解答/contact-v2が違えば0手へ安全に戻る。旧cursorは無変更。通常盤面・Undo・クリアと独立。

## 検証

|対象|結果|
|---|---|
|全パズル（Chapter1/2, Insight, World, v2, Rescue）|1529/1529、失敗/skip/cancel0|
|CARD GAME|530/530、失敗/skip/cancel0|
|Pages単体|16/16|
|Pages HTTP/全ファイルSHA256|4087/4087一致、欠落0、不一致0、7入口、452カード/904画像、除外7URLが404|
|独立レビュー修正|再現失敗を保存し修正後成功|
|Runtimeローカル|初回32+24成功、主群3278/3289成功（11件は疎checkout資料不足）。資料復元後該当340/340、後続159/159成功。単一npm testの全成功はCIで別途確定する|
|実Chromium153、統合配布物|79条件成功、6画面サイズ、JS/asset/moduleエラー0|
|メインメニュー/第1章/CARD/物語実操作|7条件成功、JSエラー0|

失敗ログもgzipで保管。失敗テストの削除・無効化は行っていない。全312操作について通常ForestSession・おてほん・各手保存復帰・Undo・盤面一致・総段階・全員救出をrelease.test.mjsで検証。

|面|11|12|13|14|15|16|17|18|19|20|合計|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|手数|5|5|10|11|23|38|26|19|78|97|312|

全10面の実ブラウザーおてほんで前/次/位置保持/リセット/自動再生/通常状態保護を確認。20面97手16/16、停止/再開を確認。自動再生はPlaywright仮想時計で実production timer/rAFを加速している。実時間での全312手連続視聴とは区別する。

実pointerで1マス1手、5マスひと筆5手→Undo0手、reload、リトライ、通常停止UI無し、各接触組み合わせとIDを確認。320x480/375x667/390x650/430x750/844x390/390x480、上下47/34pxセーフエリア相当を確認。画像は `browser-final/`。メニュー回帰は `menu-local/`。

## 公開ゲートと残事項

この記録作成時はCI完了待ち、main未変更、本番未公開。全10CI成功、最新main/元PR HEADの再確認、同tree確認後にPR484をmergeする。merge後、Pages deploy成功だけでなく実URLで全ファイルhashと実ブラウザーを確認する。結果は追補する。

本人iPhone Safari実機・実指操作・OSロック/背景復帰は未確認。本人の実セーブは入手していないため、保存形式に基づく移行fixtureと孤立ブラウザーで検証している。数学的最短解は主張しない。Stage20盤面/難易度変更なし。Stage21以後は今回対象外。

公開直前mainと配布物の復旧情報は `evidence/rollback.txt`。rollback時もlocalStorageを削除しない。旧ルールは新専用保存キーを読まないため新盤面の誤復帰を防ぐ。

## 公開前の配信・復旧スナップショット

開始mainの4,057ファイル（配信設定用`.nojekyll`込み）のSHA-256は `evidence/rollback-package.json.gz`。本番のindex、script、CARD入口、共通v2 engine、第1章index/appの6件が開始mainと一致。`production-before.json`に保存。

GitHub Pagesでは`.nojekyll`は配信設定用マーカーで公開URLは404（旧版でも確認）。したがって新配布物4,087件のうち、本番HTTPハッシュ照合の対象は公開コンテンツ4,086件とする。設定用マーカーはCI配布物の検証対象であり、公開コンテンツの欠落とは扱わない。

最初の証跡コミット418d7d62356927b748a91613df59b0e8a76b6516について、GitHubから42ファイルを読み戻し、元のローカルファイルとの全byte一致を確認済み。

保存移行の対象は同一origin内の旧保存。既存の本人限定SitesはURL・公開内容・保存領域を変更していない。別originのSitesからGitHub PagesへlocalStorageを自動転送するものではなく、それぞれの保存は元のサイトに残る。

## マージ前CI確定

候補HEADの10ワークフローは全てcompleted/success。Runtimeの単一npm testも32+24+3289+159=3504/3504、fail/skip/cancel0。puzzle1529/1529、CARD530/530をCIログでも確認。全実行URLとログの件数行は `evidence/ci-success.json`。実装treeとCI合成treeの一致を確認し、公開条件10項目を充足。次はmain mergeと本番検証であり、この時点では正式公開完了とは扱わない。

## 本番公開後の確認（2026-10-30追補）

PR #484は2026-10-30 14:15 JSTにmerged。本番mainは `851cf09a80c7ed41ba7293888084272917e4582c`、tree `5517352b322d15b0a0c432ee24ba8d167638f4f8`。候補eb45d64fおよびマージ前に全10CIが成功したtreeと完全一致する。最新mainと元3PRのHEADを再照会して変化がないことを確認した。

- [本番](https://naoto214.github.io/naotocchi/)
- [Pages build/deploy](https://github.com/Naoto214/naotocchi/actions/runs/41007381048)：両ジョブcompleted/success。
- 公開コンテンツ4,086/4,086件がHTTP取得・SHA-256一致。不一致・欠落0。配布物全4,087件の差分も0（`.nojekyll`は公開しない配信設定マーカー）。
- 本番Chromiumで79条件・6画面サイズ成功。通常ドラッグ/手数/ひと筆Undo/保存再読込/リトライ/contact-v2/各ID/おてほん全10面/位置保持/通常状態分離を再確認。20面97手、16/16救出。JavaScript・モジュール・アセットエラー0。
- 本番メインメニュー→第1章の実ドラッグ/Undo、CARD GAME CPU対戦開始・画面内カード画像読込、物語導線の8条件成功。
- 本番第1章→第2章、11だけ開放、実pointerの5手で11クリア→12開放・13ロック維持、12への移動とreload、旧第1章クリアマーカー保護の8条件成功。
- 実ブラウザーQAは新規の隔離コンテキストを使用。開放・接触検証用fixtureはそのコンテキスト内だけに設定し、本人の実セーブを変更していない。
- 初回のCARD本番テストはmoduleのイベントハンドラー登録前にボタンを押してタイムアウトした。再確認時も見た目のボタン表示段階ではonclickがnullであることを観測し、登録完了を条件として待つ既存QAスクリプトで対戦開始・画像読込まで成功。製品コードに追加変更はしていない。失敗記録も残した。
- 旧保存キー/途中盤面/Undoを保持し、クリア・開放記録を新ルールへ移す方針を維持。Sitesと本番は別originであり、Sitesのセーブが本番へ自動転送されるわけではない。
- PR436はmerged。PR482/483は元436ブランチをbaseとしたopen Draft表示だが、その全HEADはmainの祖先で統合済み。元ブランチ・WIP・本人限定URLは保持。

今回の再確認結果・再現スクリプト・画面は `production-resume/`。mainの祖先関係とCI配布物の一致は `evidence/main-integration.json` と `evidence/deployed-artifact-match.json`。

おてほん自動再生は実production timer/rAFをPlaywright仮想時計で加速した検証。実時間で全312手を連続視聴したものではない。本人iPhone Safari実機・指操作・OSロック/背景復帰、本人の実セーブを用いた移行は未確認。最短解は未証明。20面の盤面・難易度は維持。

### マージ後CI・通常速度再生の最終確定

main push後の5ワークフロー、合計12ジョブは全てcompleted/success。失敗・実行中・待機中0。全実行URL・各stepは `production-resume/main-ci-success.json`。Runtimeの単一npm testは32+24+3289+159=3,504/3,504、fail/skip/cancel0。

|ワークフロー|run|結果|
|---|---:|---|
|Naopoyo official release|41007381017|success|
|Runtime smoke test|41007381009|success|
|Home layout|41007380962|success|
|Pages runtime package（build/deploy）|41007381048|success|
|World visual quality|41007381011|success|

さらに本番の20面を通常速度・通常モーションで0→97手まで連続自動再生し、16/16救出を確認した。Playwright clockは使用せず実時間約167.866秒（一時停止確認を含む）。途中で一時停止して位置が変わらないこと、再開後に完走すること、おてほんを閉じた後の通常盤面・Undo・クリア記録が開始前と一致することも成功。JavaScriptエラー0。`production-resume/realtime-results.json`、`realtime.cjs`、`stage20-realtime.jpg`に保存。全10面312手の再生は加速検証、20面97手は加えて通常速度でも検証した。

本番実装への追加変更はなく、候補・main・配布物の対応は維持。証跡初回保存a5db85cbのテキスト11件と代表画像1件はGitHubから読み戻して一致を確認した。残る未確認事項は本人端末・本人セーブでの確認に限定し、第2章正式公開完了とする。
