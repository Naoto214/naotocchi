# ヒトデ02・03：候補Cとcontact sheetの同一source照合

人間確認待ち。手順3は正式完了ではない。本番設定変更0。

## 結論

GitHub保存HEAD `b69c94e8f913f05072b7f4e0caacb1666080e5e7`（tree `e845d685ad0af8b0a98b55653f2150e73ed34f23`）内のABC比較Cと02/03 contact sheetを独立解析した。**座標不一致は検出されなかった。** 保存済み資料とfresh資料それぞれ2段階×3サイズ、計12組で、同条件の合成SVG内容一致・描画ピクセル差分0。

見え方の差が端末キャッシュ、表示倍率、通常列と汗併存列の違い等のどれによるかは、端末の実表示を取得できないため断定しない。生成経路に旧offset・別preview補正が混入していた証拠はない。前回同じファイル名を更新していたため版の識別が弱かった点は改善した。

## source追跡

比較C、最終contact sheetとも `tools/starfish-silver-review.cjs` の同じ `comp()` を使用する。

- `pet-expression.js` の `accentFor(base,'strained')` → `MARK_PLACEMENT` → SVG内translate。
- Cはoffset引数null。contact sheetもnull。比較A/Bのみ過去座標を明示的に渡す。Cに手入力座標はない。
- 02: `[-10,7.5]`、03: `[-7,8.5]`。runtime SHA256 `2286598972fd1ef4c5a88dbafd3292f6929b7bb109205ebfc5b282229ac18f8c`。
- 共通のscale(n/104)。キャラクターは `assetFor()` が返す同じPNG。身体の下端補正は同じ `cast-bounds.js`。
- 汗は共通の `sweatFor(base,n,n,floor)`。位相0.5、回転18度。旧HTML、外部画像URL、以前のSVGを生成入力にしていない。
- 最終照合は生成器の自己申告ではなく、保存SVGをXMLとして読み、銀の祖先transform・実path・身体PNG・汗transformを抽出した。

本体→汗→銀の描画順を維持。汗の近似形状は前回と同じで、実ブラウザーのCSSアニメーションや影を完全再現した検証ではない。

## 描画直前の最終座標

原点はキャラクター描画枠の左上。銀の実path先頭 `M17 24` を、保存済みtranslateとscaleで変換した点。線の中心位置であり、stroke外周ではない。紙面上の各カード位置は比較から除外する。

|段階|サイズ|Cの銀始点(x,y)|contact sheetの銀始点(x,y)|一致|
|---|---:|---|---|---|
|02|64|(4.307692,19.384615)|(4.307692,19.384615)|一致|
|02|80|(5.384615,24.230769)|(5.384615,24.230769)|一致|
|02|104|(7,31.5)|(7,31.5)|一致|
|03|64|(6.153846,20)|(6.153846,20)|一致|
|03|80|(7.692308,25)|(7.692308,25)|一致|
|03|104|(10,32.5)|(10,32.5)|一致|

02はAから左6.5・上11、03はAから左6・上6（104px基準）のまま。銀の全path、線幅、scale、身体位置も同一。通常列の銀も全件同じoffset。汗あり列は画像全体を同条件で比較した。

|段階|サイズ|左汗translate(x,y)：Cとcontact共通|
|---|---:|---|
|02|64|(2.811799,15.546154)|
|02|80|(4.014749,19.432692)|
|02|104|(5.819174,25.262500)|
|03|64|(8.427184,13.161538)|
|03|80|(11.033980,16.451923)|
|03|104|(14.944174,21.387500)|

この後のrotate(18度、汗中心)も同一。右汗も同一。詳細な元offset・紙面原点・回転中心は[機械照合JSON](starfish-contact-source-proof-20260927.json)に記録。

## 今回の最終資料（候補C反映済み）

- [A／C／contact実描画の照合：64・80・104px](starfish-contact-source-proof-20260927.svg)。右列はcontact sheetから実際に抽出した描画要素。
- [02 最終10表情＋病気併存10表情](starfish-expressions-step3-20260927-02-C-verified.svg)
- [03 最終10表情＋病気併存10表情](starfish-expressions-step3-20260927-03-C-verified.svg)
- [同一rendererでfresh生成したABC](starfish-silver-reevaluation-20260927-C-verified.svg)

各最終版には使用source HEADと「候補C反映済み」を明示。C-verifiedが今回の判断用。接尾辞のない旧contact sheetは過去保存の履歴資料であり、今回の最終判断用ではない。なおsource HEADは本番設定を読み取ったcommitを示し、この報告自体の保存commitとは区別する。

## 検証・変更範囲

生成器の変更はHEAD必須入力、版表示、出力ファイル名の明確化のみ。新しい独立検証器 `tools/starfish-contact-source-check.py` は保存treeから旧資料を取得し、XML変換・PNG内容・銀・汗を照合。12組の合成一致と12組のpixel差分0をfresh確認。比較PNGも目視確認した。

本番コード・offset・resolver・CSS・表情PNG・通常基準・食事SVGは非変更。銀の再設計0、汗移動0。関連integrationテストの結果は下記に追記する。全体テストは資料のみの変更なので今回再実行しない。前回の1,846 PASS／既知名称4 FAILを今回のfresh結果とは扱わない。quick-modeは今回は未実行、原因未特定の追跡を継続する。`git diff --check` を保存前に確認する。

ヒトデ08、犬03、ウスバカゲロウ、名称同期、最終QA、なおと等の残件は維持。PR278 Draft/open/未マージ。人間判断待ちで停止。

実行結果：`node --test tests/pet-expression-integration-test.cjs` 268 PASS／0 FAIL。独立XML照合12/12、pixel一致12/12、`git diff --check` PASS。
