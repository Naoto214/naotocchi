# カード専用アート · 代表7枚 Pilot

2026-10-18。7枚の専用イラスト・既存UI完成プレビュー・452枚の実務対応表を保存。**すべてユーザー承認待ち。残り445枚は未着手。ゲームへ未接続、mainへ未マージ。**

![代表7枚](previews/seven-card-overview.png)

## 代表カード

|カテゴリー|カード名|正本ID|文字なしアート|完成プレビュー|
|---|---|---|---|---|
|メイン|さなぎ（カブトムシ④）|M-beetle-04|[PNG](illustrations/M-beetle-04.png)|[PNG](previews/M-beetle-04.png)|
|なかま|きまぐれなねこ|C-cat_friend|[PNG](illustrations/C-cat_friend.png)|[PNG](previews/C-cat_friend.png)|
|こいびと|もりのクマさん|P-forest_bear|[PNG](illustrations/P-forest_bear.png)|[PNG](previews/P-forest_bear.png)|
|セカイ|もり|W-forest|[PNG](illustrations/W-forest.png)|[PNG](previews/W-forest.png)|
|あそび|みずべのさかなつり|G-fishing-river|[PNG](illustrations/G-fishing-river.png)|[PNG](previews/G-fishing-river.png)|
|あいてむ|リュックサック|I-travel1|[PNG](illustrations/I-travel1.png)|[PNG](previews/I-travel1.png)|
|できごと|あたらしいであい|E-new-encounter|[PNG](illustrations/E-new-encounter.png)|[PNG](previews/E-new-encounter.png)|

各カテゴリー1候補のみ、全7回生成。バリエーション量産なし。選定理由は正本画像が確認できること、単体・情景・道具・2体の交流を試せること。あそびとできごとは専用画像が未確認のため、本編の確認済み猫・熊・水辺画像を参照して新しい情景を制作。

## 実務棚卸し

[CSV](inventory-452.csv) / [JSON](inventory-452.json) は452ID、表示名・内部カテゴリー・既存UI画像・最新mainの正本画像パスとgit blob・制作分類・3D補助参照・正本本文の出典・Pilot状態を保持。

|分類|枚数|判断|
|---|---:|---|
|background_add|318|メイン248＋なかま26＋こいびと18＋あいてむ26。外見の正本を再利用し背景を追加。画像をそのまま貼っただけでは専用情景にならない。|
|direct_reuse|13|セカイ13の風景画像。直接再利用可能だが、横長構図と統一画風の調整は個別判断。Pilotの森は新たに描画。|
|new_scene|121|あそび100＋できごと21。カード専用ラスタ画像の対応は未確認。本文・既存ゲームや道具・登場人物を根拠に新しい情景を作る。|

対応画像331件は最新mainのtreeで存在・blobを確認した。全画像の目視監査をしたという意味ではない。目視照合はPilotに必要な正本に限定。

最新mainには `assets/items/unified/manifest.json` と26アイテムの統一画像がある。古いUIブランチの `CARD_ART` はメイン・なかま・こいびと292件のみで、アイテム等の未登録を資産不存在と誤認しないこと。`game-symbol-art.js` はゲーム用の24×24ベクターモチーフ、`assets/ui/*atlas*` はUI部品であり、完成カード情景とは区別。`script.js` の fishing-river は釣り竿・浮きによる遊びの根拠。

Character 3Dは最新mainの `character-3d/spec.js`、`rollout-spec.js`、`nonplayer-spec.js` を参照。31×8段階、なかま26、こいびと18の役割別対応と、猫の三毛・横臥、熊の役割別形状を確認。3D実装自身も2D画像をデザイン正本と明記しており、今回は2Dを画像生成の直接参照に使用。3D全293体の再監査・再レンダリングは行っていない。

既存カード専用候補として `ui-assets/pupa-reference-approved.png`、裏面として `card-back-approved.png` を確認。今回の参照原画と既存UI版はバイトハッシュが異なるが、デコード後のピクセルが同一であることを確認。既存ファイルは変更していない。

## 美術・素材契約

- 2D本編の種族・段階・顔・体型・色・特徴が正本。3Dは補助。さなぎはユーザーが最重要基準として指定した採用済みカードの丸い顔・目を優先。
- やわらかく、かわいく、繊細な絵本風。自然光・生態・暮らしで個性を出す。主役と顔の周囲は読みやすくする。
- 専用アートは **1536×1024 PNG、3:2横長**。文字・数値・マーク・カード枠・能力本文は含めない。
- カード完成プレビューは **600×900 PNG、2:3**。縮小版は **80×120 / 110×165 PNG**。ブラウザで既存 `cardMarkup` と `style.css` を描画し撮影。一覧はそのPNGを並べたもの。
- `index.html` はレビュー専用で既存rendererをimportし、返されたマークアップの `.card-art` だけを専用画像に置換。`object-fit:contain` で主役・角・尾・浮き等を切らない。ゲームの `CARD_ART` やrendererは変更しない。
- ファイル名は `illustrations/<card-ID>.png`。個別の参照画像・immutable ref/blob・生成意図・SHA-256・照合所見は [provenance.json](provenance.json)。将来の差し替え候補はこのmanifestから扱い、承認前のruntime登録は禁止。
- カテゴリー別配色・8属性色は既存 `ATTRIBUTES` / `CATEGORIES` の値が依頼の確定色と一致。非メイン6カテゴリーには属性を追加していない。
- 画像生成は初候補を維持し、細部の模様の画素一致までは主張しない。正本からの翻案の可否はユーザーの美術承認で確定する。

## 分類マーク：再利用と差異

[採用原画](references/approved-attribute-sheet.png) を改変せず保存。既存 `ui-presentation.mjs` のMOTIFSをそのまま使用し、新しいマークを生成していない。

|属性|添付原画|既存SVG|
|---|---|---|
|ひと|手を広げた人|胸像に近い人型|
|けもの|足跡|足跡|
|みずべ|水滴と波紋|水滴と波|
|うみ|貝|波|
|むし|甲虫|線画の昆虫|
|くさ|双葉|1枚の葉|
|げんそう|四方向の星と小星|四方向の星と小星|
|ふしぎ|三日月と星|三日月と小星|

原画とSVGは同一ではない。今回のプレビューは既存SVG維持であり、原画との最終統一が済んだという扱いにはしない。原画の抽出・置換か既存SVG継続かは別途ユーザー確認。6カテゴリーのSVGも実装には存在するが、原画の最終承認は未確認。今回それを再設計していない。

## 品質確認

- 7枚すべて正本を画像として確認し、その画像を生成時に参照。三毛猫の配色・耳・尾・表情、熊の体型・腹・耳・肉球、リュックの色・金具・ポケットを照合。
- さなぎは第4段階で成虫の黒い翅はなく、黄金色・節・折り畳んだ脚を維持。採用カードの可愛いデフォルメを優先しており、本編ドット画像との完全な形状一致ではない。
- 各画像は全文字なし。目視で主役の余分な頭・手足・融合を認めず。猫の寝姿で一部の脚が重なるのは正本同様。出会いでは猫の目が開き、表情が変化している。
- [ブラウザ検証](evidence/browser-qa.json)：7/7で正本能力本文一致・可視・全文領域内、メインだけ属性あり、画像と本文非重複、600×900。320/390/430px画面幅で全7枚の2:3と横はみ出しなし。画像読み込み・JSエラー0。
- [80px見本](previews/iphone-width-80.png) / [110px見本](previews/iphone-width-110.png)：全主役を識別。80pxの釣り糸など細部は小さくなる。非メイン縮小カードの上下余白は画像全体を切らずに収める結果で、量産前の確認事項。
- **Chromiumの画面幅シミュレーションであり、物理iPhone・Safari・タッチ・色再現の実機QAではない。** 原画とUIの金縁・植物装飾の密度にも差があり、既存テンプレートを保った状態でのレビュー。
- ブラウザ初回検証でレビュー用HTMLの参照解決と本文非表示を検出し、レビュー用HTMLだけを修正して再実行。最終検証は全項目合格。既存ゲームCSS・rendererは非変更。

再現手順：リポジトリrootでHTTP serverを起動し、`node prototypes/card-game/art-pilot/verify-browser.cjs`。Playwright・sharp・Chromiumが必要。`PILOT_CHROMIUM`で実行ファイル、`PILOT_URL`でURLを指定可能。描画環境の日本語フォントは本編のM PLUSフォントを使用。パッケージ依存はこのPRに追加していない。

## GitHub開始時点と保護範囲

|対象|HEAD|tree|状態|
|---|---|---|---|
|main|5d950d1b88751b202ac2fe2fcb2f3ea7ef0598af|ccca80d3796cf91cfcc9e03962f8d0315f3c9dfc|読み取りのみ|
|#259|0a9df8f09b5ad657730f29d14e2d357241dace8c|78677b98fdc229c7acf10e9112ca9744ae0fa7ba|Draft/open/未マージ|
|#381|3a987044513fdb6d5e69b52b8af40add5a45ccd4|e86f089e6778061d7acd39492e96286656455702|Draft/open/未マージ|
|#384|e30b2fed1f5e9143089cec389b2ef183df6c02aa|26705a0cefd064eb4c50821821b68caad6c70190|Draft/open/未マージ|

独立ブランチ `art/card-pilot-seven-20261018` は#384の上記HEADから派生。Draft PRのbaseも#384のbranchとし、将来統合可能な追加ファイルだけの差分に限定。変更は `prototypes/card-game/art-pilot/` の新規ファイルのみ。効果・数値・ルール・state・save/schema・Python・固定400戦・本編画像・既存PRは変更しない。

## 残り445枚

メイン247、なかま25、こいびと17、セカイ12、あそび99、あいてむ25、できごと20。既存正本＋背景追加314、風景再利用12、新規情景119が残る。承認後に種族ごと8段階をまとめて参照し、段階取り違えを防ぐ。なかま・こいびとは役割別に管理。遊び・できごとは世界観を本文から選び、確認済みキャラだけを出演させる。

Pilotは1カード1回生成で成立したが、複雑な生物・複数キャラ・成長段階は修正が必要になりうるため、445回で完了すると保証しない。所要日数・費用は今回の7枚だけから断定せず、承認後に小ロット単位で実績を更新する。残り445枚の生成は開始していない。

ユーザー確認：①7枚の画風と同一性、特にさなぎの採用カード準拠、②カテゴリ代表としての選定、③原画と既存SVGの統一方針、④縮小時の全景維持と余白、⑤iPhone Safari実機での見え方。今回の承認を受けても量産は別段階、正式組み込みとmainマージは別承認。
