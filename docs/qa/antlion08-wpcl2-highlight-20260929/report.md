# WP-CL2：本人左目（viewer-right）のハイライト候補

Source HEAD: `54ce21d8184977f2f7a2cc0e547284b3aeb54607`。
基準WP-CL1 SHA-256: `3eb3149d55224531a287eec6eb1965c9702b444ddbd4181f669e34bf99fc7a10`。
[候補WP-CL2](candidates/WP-CL2.png) SHA-256: `8f16ecef7dfb61112c519b04f60c9024b7d278a8172df1b4d0a7749aff756392`。

**候補1枚は作成済み。実ブラウザーの描画後pixel確認が未完了のため、要求全体の完了・実ゲームでの104／80px目標達成とは判定しない。** 候補は未承認、本番置換なし。

## 実装方式の確認

- `script.js` の `stageVisualHTML` は1つの `img.character-asset` に1つのsrcを設定。サイズ別srcsetは使わない。
- `pet-expression.js` の `assetFor` は基準assetとexpressionから1PNGを返し、表示サイズを引数にしない。
- `style.css` の `.character-asset` はwidth/height 100%、object-fit:contain、`image-rendering:pixelated; image-rendering:crisp-edges;` の順。後者がサポートされるブラウザーでは後者が優先される。実computed styleは今回未取得。
- `.character-detail` は104px。heroは82px／条件付き76px等もあり、依頼の128／104／80／64pxは今回の比較サイズ。全てを実ゲームの標準サイズと誤記しない。
- 対象PNGは128×128。**128pxの単一PNGをruntimeで縮小する方式**。サイズ別asset・特例・runtime/CSS変更は作らない。QAの縮小比較画像は本番assetではない。

## WP-CL2の変更

白い領域を増やす前に、同じ1画素の光を縮小サンプリングで残る位置へ移す、最小候補とした。[変更前計画](edit-plan.md)。

|元128px座標|WP-CL1 RGBA|WP-CL2 RGBA|RGB差分|
|---|---|---|---|
|(104,62)|(252,226,178,255)|(14,11,9,255)|(-238,-215,-169)|
|(103,63)|(38,11,1,255)|(252,226,178,255)|(214,215,177)|

本人左目（viewer-right）の光を1px左下へ移動。面積は1pxのまま、色・明るさも同じ。元位置は元wantsPlayの同座標の眼内暗色へ戻す。WP-CL1の外周分離用2画素は保持。変更2画素とも8近傍全て不透明の内側画素で、外縁RGBA変更0。alpha/canvas/cropは同じ。

本人右目（viewer-left）、口、顔の外形、頭部・触角・翅・腹部・脚・粒子／軌跡は2画素外RGBA一致。通常08・D4 tired・hungry B現状維持・他表情・既存承認画像を変更しない。

## 比較と視認所見

- [全比較一覧](comparison.html)
- [顔全体拡大](faces.png)
- [本人左目（viewer-right）拡大・本人右目（viewer-left）との両眼比較](eyes.png)
- [128／104／80／64px nearest-neighbour計算結果](sizes-nearest.png)
- [同サイズbilinear計算結果](sizes-bilinear.png)
- [2画素差分・RGB値](difference.png)／[mask](change-mask.png)／[絶対RGB差分](rgb-difference.png)

画像内もCharacter-left (viewer-right)／Character-right (viewer-left)と併記。

128pxでは光の面積・明るさを増やしておらず、目だけが大きくキラキラする変更を避けられている。本人右目（viewer-left）と口の表情は完全保持。ただし光は本人左目（viewer-right）の下縁寄りに移るため、眼内の光として自然か、頬の光や涙のように読まれないかを人間確認事項として残す。

nearest-neighbour資料では104／80pxで明点が残る。64pxでもこの標本では残ったが、保持を合格条件にせず、見た目が不自然になっていないかを確認する資料とする。これらは**Pillow計算結果で、ブラウザー実表示のスクリーンショットではない**。

## 機械確認：実施範囲と未実施範囲

本人左目（viewer-right）の対応ROI内で R>=220、G>=200、B>=170 を満たす温かい白点を数えた。この閾値は知覚の合格判定ではない。RGBA全値・座標は[measurements.json](measurements.json)。

|方式・サイズ|WP-CL1|WP-CL2|WP-CL2の描画座標・RGBA|
|---|---:|---:|---|
|Pillow NEAREST 128px|1px|1px|(103,63), (252,226,178,255)|
|Pillow NEAREST 104px|0px|1px|(84,51), (252,226,178,255)|
|Pillow NEAREST 80px|0px|1px|(64,39), (252,226,178,255)|
|Pillow NEAREST 64px|0px|1px|詳細JSON参照|
|Pillow BILINEAR 104／80／64px|各0px|各0px|白点閾値未達|
|実ブラウザーCSS描画|未取得|未取得|**未確認**|

画素の移動は元画像の同じ色を保ったまま縮小時の残り方を変える方法だが、DPR・小数位置・CSSの実サンプリングが変われば結果も変わる。bilinearで白点閾値を満たさないことも記録し、好都合な結果だけを採用しない。

### ブラウザー確認ができなかった理由

1. ローカルPlaywright用Chromiumの公式ダウンロードが不完全なアーカイブとなり失敗。
2. Cloud BrowserでローカルQAページを開く操作がセキュリティ規則により拒否された（許可プロトコルはhttp/https、fileは不許可）。迂回操作はしていない。

[同一runtime CSSを使う比較fixture](runtime-fixture.html)を保存したが、未実行。従って「補間後の実表示pixelを確認」という依頼項目は未完了。実ブラウザーでWP-CL2の104／80pxの白点を確認するまで、実表示要件PASS・本番採用可能とはしない。

## 制作方法・検証

built-in imagegenで本人左目（viewer-right）の10×10px拡大領域だけを1回編集。全顔・身体の再生成なし。生成物は[局所参照](generation/local-generation-reference.png)として保持。生成物全体は他画素や階調も変わるため採用せず、移動した光の構成を既存パレット・元128px座標に固定して2画素だけへ再構成した。promptは[provenance.md](provenance.md)。[generate.py](generate.py)で候補と比較・画素計測を再現可能。

- focused: `node --test tests/pet-expression-test.cjs tests/pet-expression-assets-test.cjs tests/pet-expression-integration-test.cjs`、**1120/1120 PASS、fail0、exit0**。[ログ](focused-test.log)。画像の見た目やブラウザー描画の合格を意味しない。
- 基準HEADの**既存4015ファイル全Git blob一致**。本番画像変更0、QAスプライト候補1枚。
- 変更2画素、alpha全一致、外縁RGBA一致、その他全画素一致。[検証JSON](verification.json)。
- 全体npm testは再実行していない。既知quick-mode初回FAILの留保を解消扱いしない。

GitHubへQAのみ保存。PR #278 Draft/open/未マージ維持、main取り込み・競合解消・手順5なし。**実ブラウザー検証未完了を明示した候補として、人間確認待ちで停止する。**
