# V5統合前・残存ブラウザー回帰の修正

## 原因と修正範囲

対象はPR #561の `7ba27a4e`。mainは `408c72e6`、会話修正前V5は `7c6caf43`。修正コードは `777daca0`。

320×568の成長時には、新しい大きな描画範囲を公開した直後、カメラの再計算が次のanimation frameに予約される。一方、V5のcontrollerはその予約の完了前にもう一度個体境界を適用していた。新しい描画範囲と古いカメラを混ぜることで、一時的に上端が335.9507 native pxとなり、元の足元156.6456を下へ押し出した。後でカメラが更新されても、既に変更した世界座標が保持された。

新カメラでの上端は107.6820であり、元の足元は安全だった。歩行ポリゴンに入れないためでも、保存データが変わったためでもない。補正前・補正後は地形上valid、遮蔽判定もtrueだった。投影の逆変換で元の世界座標z=0.4469006933704403を再現しており、投影そのものの誤差ではない。

`home-production-diorama.js` の同期順だけを変更した。描画範囲が変更され、既存のカメラ更新が予約されたときは、その完了通知 `home-presentation` を待って同じ境界を適用する。短い更新待ち中は歩行・描画・入力が不整合な境界を使わない。カメラ更新後に実際に安全範囲外なら従来の補正を実施する。

ピンチズーム中は既存viewport処理がカメラ更新を意図的に行わない。その場合は待機せず、実際に保持されているカメラの既存境界を使用する。待機途中でズームが始まっても停止が続かないようにした。画面離脱時には待機状態を解除する。ピンチ中の成長で常に同じ足元を保持する保証はなく、安全境界が優先される。通常倍率での既存位置維持条件を回帰テストで保証する。

境界計算式、カメラ倍率の計算式、身体サイズ、110%倍率、深度関数、接触係数、歩行モデル、会話処理、セーブ形式、UI、背景画像、装備画像は変更しない。indexのキャッシュ識別子と配信allowlistの一致ハッシュだけを追随更新した。道譲りは追加していない。

## 原因を再現するテスト

- 既存の孵化ブラウザーテストは一切変更していない。320px条件を抽出した診断でも、操作・待ち時間・成功条件は変更していない。
- `tests/home-movement-v5-bounds-test.cjs` に新規テストを追加。修正前は250→348.4へ動いて失敗、修正後は安全な250を保持。最終カメラで本当に範囲外になる場合の補正も確認する。
- ズーム中にカメラ通知が来ない条件は、停止防止を入れる前に140→130への更新が止まって失敗した。修正後は更新・離脱再入場が可能。
- 独立レビューで通常の同期順にblocking指摘なし。ズーム待機の指摘を修正し、再レビューを受けた。

|320×568 WebKit|成長前z|成長後z|結果|
|---|---:|---:|---|
|main|0.4469006933704403|0.4469006933704403|成功|
|会話修正前V5|0.4469006933704403|0.8427524495470821|失敗|
|現行#561 修正前|0.4469006933704403|0.8427524495470821|失敗|
|今回の修正|0.4469006933704403|0.44690069337044025|成功、差5.55e-17|

保存した成人の復元はx=0.55/z=0.74を維持した。座標は表示モデルの一時状態で、セーブ形式を追加・変更しない。

証拠: `baseline-main.json` / `baseline-v5.json` / `growth-before-trace.json` / `growth-after-trace.json`。Nodeのred/green記録は `controller-before.log` / `controller-after.log` / `zoom-before.log`。

## 森林背景の検証を分離

調査開始時の最新 `7ba27a4e` CIは40成功・2失敗・1skip。失敗は両エンジンの孵化で、Home layoutは成功していた（`ci-before.json`）。

Home layoutのV19比較fixtureは `home-preview-entry.cjs` により **旧 `home-diorama.js` / `home-diorama-model.js` / `home-touch.js`** を使う。これらとV19 fixtureはmainと#561でバイト一致し、本番V5のcontroller/modelを使う試験ではない。

過去の失敗artifactでは、WebKit/forest/320px/1体のmoveはtrue。1秒後に足元(151,294.39996)が変わらなかったため失敗したが、その次のlive採取では(215.07024,344.19307)へ移動し、全採取で地形上safeだった。短い採取窓・フレーム実行の影響が疑われるが、単独の記録から根本原因を確定できない。閾値や待ち時間は変更せず、失敗を成功に読み替えない。

本番の実操作は別途 `tools/home-v5-production/forest-regression-probe.cjs` で確認する。通常indexを使用し、保存状態と時計を固定、モデルには読み取り用の記録だけを追加。main/V5/修正版を320×568・320×844で比較し、実pointer入力の受付、足元・世界座標・描画矩形、安全性を保存する。

## 実機と範囲の限界

ローカルLinux Chromium/WebKitとGitHub Actionsで検証。実機iPhone Safariは未検証。旧版比較fixtureの間欠的なフレーム停止を、今回の本番成長修正で解決したとは主張しない。全住民種・全進化・全装備・全乱数の総当たりではない。

## 実操作と既存機能の結果

- 成長・孵化の既存ブラウザー試験: Chromium/WebKit、320×568・375×667・390×844・430×932・390×844 Safe Area、reduce/no-preferenceの20条件成功。成長前後の世界足元の最大差1.11e-16。保存成人の復元x=.55/z=.74を維持。`birth-full.json`。
- 本番森林の実pointer比較: main・修正前V5・修正版 × 320×568/320×844、6条件成功。修正版とV5の到達足元はそれぞれ(224.006206,378.197501)、(222.355773,368.027030)で完全一致。`forest-pointer.json`。
- V5の同一開始配置・同一pointer操作: 4幅×28体×4方向=448比較すべて足元差0 CSS px、受付結果も同じ（302受付、146停止）。「448すべて目的地到達」ではない。混雑時の停止を増減させていない。遮られた個体はfixtureで選択してから実pointer操作を行うため、全画像を直接タップできる証明ではない。`reach-preservation.json`。
- 本番model・navigation・depth・collisionのコードは前HEADと一致。controllerの同期順以外のゲーム変更なし。`preserved-code.json`。描画矩形の採取時には既存歩行アニメーションの位相差があるため、足元差0と描画矩形の全辺一致を混同しない。
- 地域・装備更新: 13地域×4時間帯の52条件、各時間帯を4/10/20/28体に割り当て、装備なし/poop1を切替。実controllerの全actorがsafe、通知42px・セリフ76pxを維持、例外0。人数×全地域×全装備の総当たりではない。pointer入力も試すが、混雑時の選択阻害があるためこの試験を到達率の分母には使わない。`lifecycle.json`。
- 自律会話: 既存seed1182・いぬ＋しばいぬ・390×844をChromium/WebKitで成功。両エンジンで手動会話と表示の計5条件も成功。social後の実際の台詞・話者・肖像を記録。`resident-dialogue-*.json`。

追加の自然自律移動・会話（Chromium、各120秒、通常index。状態・時計・乱数を固定し、観測のみ。合成socialなし）:

|人数|乱数種|移動開始|social|表示会話（pair時刻で重複除去）|新規接触 / 瞬間移動|
|---:|---:|---:|---:|---:|---:|
|4|7|41|6|3|0 / 0|
|10|1182|64|14|5|0 / 0|
|20|7|54|9|3|0 / 0|
|28|1182|65|11|3|0 / 0|

4/20体はヤドカリ＋poop1、10/28体はいぬ。各socialは100 native px未満、接触安全指標1以上、相手は停止状態。全条件で例外0。全socialがUI表示されるわけではなく、既存会話選択・表示制御を維持。`social/social-matrix.json`。

## WebKitの枠寸法測定

成長修正後にローカルの既存V18試験が430×932・28体で失敗した。枠下端659.996887→659.979980（差.016907 CSS px）で、旧検査の1/64=.015625をわずかに超えた。同じ本番コードのCIでは成功しており、単独再実行でも異なるcamera fitで通ったため、元の失敗を含む全条件を再実行して検証する。

読み取り用記録で、指定した枠高さは前後とも516.40625 CSS px、上端も143.59375で不変と確認。ネイティブ高さ420.221293→400.359289、カメラscaleY 1.228891203→1.289857047で、ブラウザーは拡大前に高さを420.21875 / 400.34375へ1/64単位で切り捨てていた。この丸め後の高さを拡大した値が実測矩形と一致する（誤差.000024px以下）。`frame-rounding-trace.json`。

本体のCSS・倍率は変更しない。テストhelperのみ、枠について指定寸法×倍率を**元の1/64 CSS px基準**で比較し、描画矩形は別途 `floor(nativeSize*64)/64*scale` と.001px未満で一致することを検証する。単に許容差を大きくする修正ではない。通知・セリフ・操作UIの検査は変更しない。

`home-frame-measurement-test.cjs` の5条件で、記録された丸めを許容する一方、指定寸法.02pxの変化、位置.02pxの変化、同じnative寸法なのに描画だけ.017px変わる場合、不明な.1pxの変化、無効な倍率を拒否する。指定寸法.02pxの変化は旧raw矩形比較では丸め相殺で通るが、新しい比較では失敗する。独立レビューの指摘を反映し、任意の丸め幅ではなく具体的な丸め位相を検査している。乱数・待ち時間・会話や移動の成功条件は変更していない。

## 全体テスト・公開判定

初回全npm test工程＋移動追加テストはNode 3,859件中3,857成功・2失敗・skip0、独立スクリプト3本成功、Pages Python20成功。未完了だった広範な既存試験も最後まで実行した。2失敗は実行途中のcontroller修正とindexのキャッシュ識別子更新の間にasset-integrityが読み込んだ状態（旧token cbc204d9b909、編集中hash f22f3b6674a6）。最終コミットの整合性テストを再実行して成功。失敗ログは `test-7.log` に保持し、初回を全成功として扱わない。

最終ファイルを固定して全工程を再実行中。新規測定5件を含めNode3,864件＋独立スクリプト3本＋Pages20件が対象。`measurement-asset-final.log` の関連16件は成功。重要なブラウザー試験・正確なHEADのCIを確認するまではDraftを維持し、mainへ統合しない。最終結果と公開判定はPR #561に記録する。

## 再現手順と保存範囲

- `node tools/home-v5-production/growth-trace.cjs <runtime>`: 既存birth試験の320px条件を抽出し、controller/modelの読み取り診断を記録する。`HOME_BIRTH_ENGINES=webkit` / `HOME_BIRTH_OUTPUT=<output>`。
- `RUNTIME=<clean-runtime> OUT=<output> node tools/home-v5-production/forest-regression-probe.cjs`: main/修正前/修正版の通常index実操作。
- `RUNTIME=<generated-v7-qa-runtime> OUT=<output> node tools/home-v5-production/lifecycle-regression-probe.cjs`: 地域・装備・人数の更新確認。
- `python tools/home-v5-production/prepare-growth-reach.py <PR558-fixture-controller> <instrumented-output>` で既存fixtureに本番controller差分だけを適用。一致箇所が一意でなければ停止する。`GROWTH_REACH_CONTROLLER=<instrumented-output> V5_MEASURE=<PR558-checkout>/tools/home-movement-v5/measure.cjs REACH_DIST=<V5-fixture> node tools/home-v5-production/growth-reach-preservation.cjs`。
- 大きな採取データはセーブ全体の繰り返しを省略し、関連保存値・全座標・元データのSHAを記録。背景画像や個人の本番セーブは変更しない。
- clean Pages artifactは4,321ファイル、hash不一致・欠落0。テスト・比較entryなど7経路は404。本番にdebug座標・境界・道譲り試作を追加していない。`package.json` / `http.json`。
