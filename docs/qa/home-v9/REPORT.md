# Version 9 — 水辺A/G・海B2 最終デザイン比較

## 制作・採用範囲
- 開始PR #462 HEAD: `5376d2e6ca29652cd8ae30ada37ec2e91aff43f9`。
- 開始main: `e33ec25a334217227f0708b452a8be91fa4d1e60`。PR #426: `8ba4ef1cb2030979664589d2e36423f58c4dedbd`。
- G原画を先行保存: `e40862bc36e34908e5e9b486afc5052e87ff6ef7`。実装初版: `425d054b195f4e4d9e480a88f6db61192df3f3cb`。
- 海B2・星空新背景・記憶の湖新背景はv9のデザイン既定値。水辺の既定値はA。Gは明示選択する比較候補であり、本人iPhone Safari承認まで採用しない。
- 正式統合・mainマージ・PR #426・本番GitHub Pages・v22への変更は行わない。52枚の時間帯別背景制作も開始しない。

## 原画・色彩・地形
- 新原画: `assets/home-v9-20261030/water-g.png` (3,610,483 bytes)。配信画像: `assets/home-v9-20261030/runtime/water-g.webp` (775,666 bytes)。制作条件は同フォルダREADME参照。
- 参照A: `assets/home-art-recovered-20261029/water.png`、既存配信A: `assets/home-v6-20261029/runtime/water.webp`。既存画像は削除・上書きしていない。
- 浅瀬は淡いエメラルド、中流は透明な青緑、深みは濃い翡翠色。白い瀬の泡・水面反射・透けた川底の石を保つ。背景全体への緑フィルターではない。
- 山、空、樹木、左の河原、右の流路、手前の歩行空間を維持した画像編集。生成編集のため画素単位の同一性は保証しない。
- 天竜川の峡谷・岩・樹木という景観要素を参照した理想化であり、特定地点の写真再現ではない。飯田市の解説: https://www.city.iida.lg.jp/site/bunkazai/tenryukyou.html 。伊那谷観光パンフレットの翡翠色の川の記述: https://www.inadanikankou.jp/files/user/2023%E5%B9%B4%E5%BA%A6_3%E5%9C%B0%E5%9F%9F%E3%83%91%E3%83%B3%E3%83%95%E6%9C%80%E7%B5%82%E7%89%88_%E6%97%A5%E6%9C%AC%E8%AA%9E%E7%89%88.pdf
- Gの歩行領域・禁止領域・地面の投影・奥行き・遮蔽設定はAと同一。manifest単体テストで候補名以外のscene設定一致を確認。

## 比較画像（クラウドChrome、各390px、同じ正式キャスト）
- [背景原画3候補](compare-raw.webp)
- [6体比較](compare-6.webp)
- [最大28体比較](compare-28.webp)

水辺A/Gで同じ位置・構成を使用。海B2は同じキャラクター構成を海の既存安全地形へ配置。白いキャラクターの輪郭、28体中の緑色キャラクターを視認。川底が透け、池・沼の濁りには見えないという制作側評価。最終評価は本人実機QA。

## 保護とレビュー
- v9専用manifest、追加builder、比較・検証UIのみ。既存ゲームロジック、台詞、育成条件、正式キャラクター画像は変更していない。
- QA / sheet / play のセーブ名前空間を分離し、既存v6/v7/v8/v22/本番のキーと値を保護。
- 独立レビューで全13地域の検証候補ドロップダウン漏れを発見。失敗テストを追加して修正し、全地域の選択テスト成功。描画候補ID確認と再実行時レポート初期化も追加。
- v7/v8配信ページ4件は公開前HTTP200・SHA256一致。既存4270ファイルの保持をパッケージ検証で確認（indexにv9入口を追加する例外のみ）。

## 検証状況（公開・CI結果は追記）
- 新規manifest3件、QA選択1件、加算ビルド1件: 成功。
- 既存ホーム回帰100件、既存配信テスト2件: 成功。
- 無制限並列のnpm test: 前半250+26+24件成功、主要3225件中3224成功・既存meguru-testの最寄りキャラ判定1件失敗。単独11件再実行は成功。既存テスト・判定は変更せず、CI既存ランナーと同じ並列数2で全体再実行し、3,690件すべて成功（250+26+24+3225+138+9+18、失敗/skip/cancel 0）。`bounded-full-regression.log.gz`参照。
- クラウド初回マトリクス: 水辺A24条件、水辺G24条件成功。海B2連続実行はシミュレーション時刻待ちが2回停止。初回ログを保護し、同条件単独再試行と最終24条件の連続実行はいずれも成功。合計72条件を網羅。
- Chromium/WebKitの実ポインタ、reduced-motion、save/reload、120フレーム性能測定をCIへ追加。CIはキュー待ち。WebKit成功をiPhone実機成功と表現しない。
- 配信候補のGNU tar展開サイズ: 264,458,240 bytes / 252.20703125MiB（最終アーカイブ実測）。JavaScriptはgzipを偽装せず、全JS構文確認。

## 復旧・未完了
- 正常v8のSites source: `11817e1abd0092be1d4d00aaba87621fb3fd0e3e`。
- 正常v8 saved version11: `appgprj_6ae1a850a91c8191a9053a4b9662b620~appgver_62b1c8b0c59081919bcde1fe455bdc55`。
- 本人限定公開は成功。全配信照合とCIの状態は以下に記録。認証情報は記録しない。
- 本人実機で必要: A/G最終選択、色・透明感・白/緑キャラ視認、28体の操作感、会話/Reaction、育成、縦横回転、Safari中断復帰とセーブ再開、読み込み・熱・バッテリー・メモリ挙動。クラウドの数値で代替しない。

## クラウドQAの追加証拠
- `cloud-summary.json`: 3候補72条件（4幅×昼夜×1/6/28体）、全13地域26条件（390px・昼・6/28体）、検証エラー0。元の詳細JSONはgzipで保存。初回のタイムアウトも削除せず保存。
- [全13地域の背景一覧](all-13-backgrounds.webp)。新規制作はGのみ。地形・空間の大きな回帰は認めず、既存12地域を維持。
- `water-g-navigation.json`: A/Gの共通地面ポリゴン、移動禁止サンプル、前景遮蔽、座席、奥行き係数。川側は地面ポリゴン外。
- `cloud-pointer-water-g.json`: 実ポインタで主役のタップ選択、地面タップ（約33px移動）、ドラッグ（約14px移動）を確認、全員safe。28体の主役移動は上記72条件の各afterで確認。
- [正式画像付き交流結果](interaction-reaction.webp): 28体で質問選択肢、仲間交流の選択・返答表示を確認。Zzz要素1件も確認。
- `cloud-water-g-performance-final.json`: 390px/28体・10秒。画像1枚の展開量6,291,456 bytes。Gのキャッシュ済み読込3.9ms（transfer300 bytes、冷間回線速度ではない）。RAF13回、中央値1016.4ms。クラウド実行の間隔が約1秒となり、実用FPSの判断に使えない。性能良好とは判定せず、CI/WebKitとiPhone実測を残す。
- クラウドで観察されたconsole errorはブラウザ拡張のmetadata送信エラー。サイト由来の例外と区別。

## 本人限定公開
- Sites保存版12、公開結果 `succeeded`。ゲームのversion 9とは別の管理番号。
- 比較: https://naotocchi-art-25d-20261028.kerzion214.chatgpt.site/home-v9.html
- 通常試遊: https://naotocchi-art-25d-20261028.kerzion214.chatgpt.site/home-v9-play.html
- 実装GitHub: `922a24be41f36ad2f2cea526ef2bf22735a92138`。配信元Sites source: `22dab24840fa39f557c180d12a3f2b5167e5c4e4`。
- Saved version: `appgprj_6ae1a850a91c8191a9053a4b9662b620~appgver_46189d0e4f808191b45d8162d69dfabb`。
- Deployment: `appgdep_6ae42d25d9a081918d67a5a73a18e7bb`。
- アーカイブ4,305ファイル（配信4,304＋hosting設定1）。展開264,458,240 bytes、上限余裕3,977,216 bytes。SHA256は`archive-v9.json`。
- アクセス: custom、owner1名、共有グループ0、外部閲覧者0。匿名HTTP403。クラウド匿名ブラウザは「アクセスするにはログインしてください」。安全な認証ヘッダーによる配信照合と、本人Safariのログイン済み画面QAは区別する。
- G/A/B2の10秒RAF試料はそれぞれ13/31/14フレーム、p95約1016ms。共通して大きな間隔があり、クラウド結果からiPhone性能を認定しない。

## 保護対象の最終確認
- PR #426は開始時と同じ`8ba4ef1cb2030979664589d2e36423f58c4dedbd`、open/draft。
- mainは作業中の別PR #484統合により`e33ec25a334217227f0708b452a8be91fa4d1e60`から`851cf09a80c7ed41ba7293888084272917e4582c`へ進行（GitHub記録05:15:05 UTC）。本作業によるmain書込みではない。最新mainをこの実験ブランチへ統合していないため、将来の正式統合で差分・競合確認が必要。
- 本作業の書込み先はPR #462の独立ブランチと既存本人限定背景比較Siteのみ。本番GitHub Pages、既存v22 Site、本番セーブ、PR #426のブランチに書込みなし。
- 既存4270ファイルはv8配信manifestと一致。indexのv9入口追加のみが既存配信ファイルの変更。v7/v8画像・JS・比較候補は保持。

## 残る確認
- GitHub CI: 実装HEADのrun https://github.com/Naoto214/naotocchi/actions/runs/41009097493 は全47ジョブqueued。成功とは扱わない。Chromium/WebKitによる追加実ポインタ・reduced-motion・性能CI結果は未取得。
- 本人iPhone Safari: 水辺A/G選択、白・緑キャラの視認、28体の操作、会話・育成、回転・中断復帰・セーブ再開、低速回線・熱・電池・メモリを確認。Gの正式採用・main統合・本番公開は未承認のまま。
- タイムアウト初回ログと最終成功ログを両方保存。クラウド環境での長時間連続処理・性能は制約あり。実機での不具合なしとは断定しない。

## 最終確認項目の対応
|項目|結果・証拠|
|---|---|
|背景単体、6体、28体の3候補比較|compare-raw/6/28.webp。各390px、同じキャスト|
|色・天竜川型景観|透明な浅瀬、青緑の中流、翡翠の深み、白い瀬。特定地点の再現ではない|
|全13地域|all-13-backgrounds.webp、cloud-regions-final.json.gzの26条件|
|歩行・禁止領域|water-g-navigation.json。A/G同じ、川は地面外|
|接地影・奥行き・遮蔽|共通scene設定＋各幅safe/visible判定＋比較画像|
|移動・自律行動|72条件のinitial/after/live。28体でも主役移動判定成功|
|物理タップ・ドラッグ|Gで手動ポインタ操作確認。CI両エンジンは待機|
|会話・Reaction・育成UI|既存3690回帰、42/76px、文字範囲、交流結果画像|
|回転・セーブ再開|72+26条件で縦横回転と保存再読込、保護キー一致|
|reduced-motion|既存実装を保持。追加ブラウザCIは待機、実機未確認|
|性能|G runtime 775666 bytes、decoded 6MiB。冷間読込・実機FPS/熱/電池は未測定|
|本人限定アクセス|ownerのみ、匿名403/サインイン。delivery-probe.jsonの4件一致|
|採用状態|海B2/特別2地域はデザイン採用。水辺A既定、G候補。本番採用なし|
|将来作業|本人承認後に最新mainとの統合検討。52枚制作は別PR、今回未着手|

## 最終追加レビュー
- QA手動操作パネルとbuilderの追加を独立レビュー。Critical/Importantなし。グローバル名衝突なし、QA専用、play/本番保存への直接書込みなし。
- Minor制約: 性能計測中の地域変更・再読込・別操作をロックしていないため、途中操作すると試料と候補名が混ざり得る。今回は固定条件で計測。再測定時は10秒間操作しない。
- レビュアーは配信全件・GitHub CI・本人iPhone実測を独立確認したとは扱っていない。

## 公開後の全件配信照合（確定）
2026-10-30 05:58 UTC、認証付きHTTPで全4,304ファイルを取得し、ローカルの公開アーカイブ元とSHA256・サイズが一致。不一致0。`delivery-summary.json` と `delivery-v9-final.json.gz` に証拠を保存。
`release-v9.json` は実装GitHub HEAD `922a24be41f36ad2f2cea526ef2bf22735a92138`を指す。以後のGitHubコミットは検証記録のみで、配信コードを変更していない。
旧版の原画・候補・v7/v8 entrypointも保護。復旧は保存版11を再配信可能。今回は公開成功・全件一致のため復旧不要。

制作・本人限定公開・ローカル検証・配信照合は完了。GitHub CIは依然queuedで、必要なCI成功という完了条件は未達。本人iPhone Safariの最終デザイン承認も未実施。水辺Gを自動採用せず、main/本番統合は行わない。


## 再開後の検証結果（2026-10-30）

- 再開時HEAD `8067baf5aa1211ad6f45854efaa612a096e92629`、CI修正HEAD `369858842b13a443aae217cf13c277d0a6da3f42`。水辺G・海B2・公開済みv9は作り直さず継承。
- 旧run `41009097493` の海B2操作テストは、テスト用の保存初期化が`about:blank`でlocalStorageを読み失敗。正確なテストoriginでのみ初期化する修正を実施。エラー検出・実ポインタ・reduced-motion・セーブ再開・保存値保護のassertionは維持。詳細はCI-FOLLOWUP-20261030.md。
- 修正の単体テスト3件、既存v9 manifest/地域選択4件、加算ビルド1件＝8件成功。今回再実行した既存全回帰3,690件も全件成功、失敗0、skip/cancel0。ログ`regression-followup.log.gz`、集計`regression-followup.json`。
- 独立レビュー：Critical/Importantなし。小テスト3件を独立再実行して成功。Minorはstorageプロパティgetterそのものを使った再現テストへの改善余地。現テストでも修正前は失敗、修正後は成功し、実originのstorageエラーが隠されないことを確認。
- ローカルのクラウドChromeで水辺Gを390px・28体表示、28/28 safe、通知42px・会話76pxを再確認。これはiPhone Safari実機QAではない。
- Sitesの保存版12・公開succeeded・owner1名/グループ0/外部閲覧者0・正常v8保存版11を再確認。匿名ブラウザーはサインイン要求。
- 公開v9 manifest内30ファイルを認証付きHTTPで再取得し、30/30が公開時SHA256と一致。raw再ビルドでは2本のJSに既存整形差があるが、位置情報/コメントを除くAST一致を検証。`delivery-followup.json`。前回の全4,304ファイル一致記録も保持。
- 新CI run [41014280598](https://github.com/Naoto214/naotocchi/actions/runs/41014280598) は最終確認時47/47 queued。CI成功条件は未達。ブラウザーCI修正の最終成功や性能を断定しない。`ci-followup-status.json`を参照。
- main `851cf09a80c7ed41ba7293888084272917e4582c` とPR #426 `8ba4ef1cb2030979664589d2e36423f58c4dedbd` は今回の再開開始時から不変。本作業はPR #462のみ更新。本番Pages/v22/Sites配信/ゲーム保存への更新なし。
- この最終追補コミットはdocs内の記録だけを追加し、`[skip ci]`で同一コードの47ジョブを重複起動しない。検証対象は上記CI修正HEADであり、そのCIは停止・成功扱い・緩和していない。
- 残件：GitHub CI完了確認、本人iPhoneで水辺A/Gの最終選択と操作・育成・回転・再開・性能QA。水辺G正式採用、main統合、本番公開は行っていない。
