# 手順1：承認済み食事マークの本番接続

対象：PR #278。手順1の実装保存。手順2以降・通常育成表情編の最終GREENではない。

## 保存基準

- 開始remote HEAD：`df628e6f04802ea1fde21e0088c890e3084fa35b`
- 開始tree：`6daa391057595d2af2e80742cf65271fcf4391ff`
- 実main：`5a53933bff7b1f2cbca14840407b5482319732b8`
- branch：`feat/cat-expression-pilot-20260915`、PR278 Draft / open / 未マージ。main取込みなし。
- ローカルは開始時cleanでremoteとtree一致。保存にはremote HEADを親とするGit Data APIを使用。

## 根拠・実装

[248段階監査表](growth-hunger-final-248-20260926.md)の31系統表と末尾「人間確認による最終裁定」を照合し、正本の最終決定を優先した。本文に残る古い保留を再採用しない。
[15絵柄候補](hunger-icon-candidates-20260926.md)、[中立養分・底生小餌比較](hunger-two-category-comparison-20260926.html)、[位置の最終決定](hunger-position-appetite-review-20260926.md)を一次資料とする。

- `hungerCategoryFor`・31系統default＋必要段階overrideはそのまま。意味カテゴリの再設計0。
- `accentFor`の旧species別5絵柄分岐を19意味カテゴリ→15共用SVGの対応表へ置換。
- 未設定を魚・中立養分へ流すfallbackなし。非対応画像は従来どおり表示なし。
- 承認資料の図形をそのまま抽出。中立養分はA「光の核＋途切れた環」、底生小餌はA「二枚貝＋巻貝＋小片＋海底線」。他13も再設計0。
- 外部SVG化で花びら等の枠外輪郭を切らないため、24座標の図形に2座標の透明余白を付与。表示は同じ原点(78,6)、倍率0.875。パディング後の本番15 SVGと承認図形は128px検証キャンバス上で全チャンネル差0。絵柄の位置・大きさを変える補正ではない。
- 本体→汗→状態マーク、主状態マーク1種類、resolver優先順位、汗、CSS、セーブ形式は変更なし。
- 本番JSだけのキャッシュトークンを更新。既存オフライン配置検査は外部SVGをdata URI化して検査するよう対応。ブラウザーには通常の同一origin SVG参照を返す。

## 15絵柄の共用

|本番SVG|日本語の意味カテゴリ|使用段階数|
|---|---|---:|
|`assets/marks/hunger/rice.svg`|ごはん|21|
|`assets/marks/hunger/bowl.svg`|フード皿／汎用雑食餌|31|
|`assets/marks/hunger/fish.svg`|魚|15|
|`assets/marks/hunger/insect.svg`|虫／ハエ|12|
|`assets/marks/hunger/aquatic.svg`|水中の小さな餌|29|
|`assets/marks/hunger/milk.svg`|ミルク|5|
|`assets/marks/hunger/neutral.svg`|中立養分（A）|74|
|`assets/marks/hunger/water.svg`|水|21|
|`assets/marks/hunger/algae.svg`|藻・水中植物|3|
|`assets/marks/hunger/leaf.svg`|葉|4|
|`assets/marks/hunger/nectar.svg`|花蜜|2|
|`assets/marks/hunger/organic.svg`|腐植質／有機養分|10|
|`assets/marks/hunger/wood.svg`|朽木・腐植質系|3|
|`assets/marks/hunger/sap.svg`|樹液／植物汁|13|
|`assets/marks/hunger/benthic.svg`|底生の小さな餌（A）|5|

## 位置・非変更

- キノコ07「粉を飛ばすキノコ」のhungryだけ `[-5,-1] → [-23,-9]`。承認Bと一致。
- 理由は別個体の胞子列と空腹バブルの混同回避。頭上への統一ではない。
- 他247段階の空腹offset不変。前回9段階もすべてA現状維持。
- 「口元寄り＝不具合」「頭上ほど正しい」としない。思考だけでなく「食べたい」「お腹すいた」の欲求表現として自然さ・可愛さを維持する。
- 全248段階×9他状態のマーク出力が開始時と文字列一致。汗計算は248×3サイズ＝744通りで開始時と一致。
- 全追跡キャラクターPNG 2781ファイルのGit blob hashが開始時indexと一致。通常基準・表情PNG変更0。
- `script.js`、`character-world-master.v1.js`、CSS、cast-bounds、ゲーム数値・成長条件・名称・セーブ処理の差分0。
- 配置生成ツールは承認済み配置を再計算せず保持する分岐を維持（今回、生成による配置書換えは実行していない）。

## 表示確認と限界

[本番15絵柄・64/80/104px合成一覧](hunger-runtime-step1-20260926.svg)。候補を再描画した絵ではなく、現在のaccentFor出力と本番SVG・hungry PNG・Homeと同じ透明領域下端補正を用いる。

- 全248段階×3サイズ＝744合成を今回確認。食物シルエット・思考丸・顔のつながり、群体・別個体、キノコ07と胞子列の分離を確認。明確な新規破綻0。
- 食物部分は64px時約13px。水中小餌の細かな意味や中立養分の意味は形だけで説明し尽くせるとはしないが、人間承認済みの絵柄・サイズを保持。
- 汗の移動・回転を含む保守的矩形との交差候補は62段階・182サイズ組合せ。交差だけでバグにしない。62段階を3サイズで合成確認し、主状態と病気併存の両方が消失する新規問題0。固定位相で汗は上端〜下端の領域を検査し、目視資料は下端の簡略SVG表現。CSSアニメーションの実ブラウザー録画ではない。
- Home描画処理のruntime harnessで15絵柄の実出力・代表状態1種類・render前後のセーブ内容不変を検証。外部15 SVGはローカルHTTP200・ファイル内容一致。
- **実ブラウザーのHome画面は未確認**。Cloud BrowserからローカルHTTPへの接続が `net::ERR_BLOCKED_BY_CLIENT` で拒否された。これはサイトの不具合やbot判定ではなく、この検証環境の制限。DOMテスト／合成画像を実ブラウザー・HUD・overflow確認済みとは扱わない。手順2へ進む前の残確認とする。

## テスト

|検証|fresh結果|
|---|---|
|追加テストのRED|旧コードで食事画像参照・キノコ07位置の2件が意図どおりFAIL|
|表情＋食事単体|600/600 PASS|
|最終コードの関連9ファイル|924/924 PASS（食事、表情、Home統合、状態、cast、Home touch、asset version、migration、save recovery）|
|15絵柄のHome実出力|15/15参照、主状態1種類、セーブ状態不変。上記924件に含む|
|全体 npm test|smoke/dialogue/visual-qa成功、node:test 1,844件中1,840 PASS・4 FAIL、終了コード1|
|4 FAILの開始時比較|開始時HEADの別ディレクトリと今回最終コードで同じ4件を再現。今回起因の新規FAILではない|
|全マーク配置検査|2,480マーク／1,488汗領域、issues 0|
|承認絵柄の移植一致|15/15、外部SVG余白補正後のピクセル差0|
|248割当・共用|248/248一致、19意味→15SVG、unsupported/malformedは従来契約のまま|
|差分・非対象保持|キノコ07 hungry以外の位置不変、通常／表情PNG 2,781ファイル不変、名称／saveコード差分0|
|git diff --check|PASS|

全体テストは実装後にfresh開始したが、その実行中に外部SVGの透明余白補正を実施した。そのため、上記924件・配置検査・移植一致・非変更検査を最終コードでもう一度実施した。全体1,844件すべてが最終余白補正後に開始されたとは報告しない。

### 全体テスト4 FAILの切り分け（未修正）

|対象（tests/cat-expression-preview-test.cjs）|原因|開始時HEADでも再現|
|---|---|---|
|418: starfish canonical stage names|tools/expression-stage-names.jsonが旧名、masterは承認済み新名|あり|
|530: sakura canonical stage names|プレビュー段階名が「芽ぶきのたね」、masterは「芽ぶきのサクラ」|あり|
|614: world_tree canonical stage names|プレビューの01/03/07が旧名、masterは承認済み新名|あり|
|670: unknown canonical punctuation|テスト内の期待名が旧名称、masterは承認済み新名称|あり|

原因となるmaster・プレビュー段階名JSON・このテストファイルはいずれも今回差分0。開始時treeと同内容のgit archiveを別ディレクトリに展開し、上記4件だけをfresh実行して同じ不一致を再現した。名称の最終同期は今回禁止されているため、テスト期待値だけを旧仕様へ戻したり名前を修正したりしない。既知の名称同期残件へ具体的な証拠を追加する。

quick-modeの該当テストは今回の全体実行内でPASS。ただし初回dodge FAILの原因・再現条件を証明したものではなく、解消・既知flakyとはしない。全体GREENは4 FAILと実ブラウザー未確認により未達。

## 継続残件・停止線

- quick-mode初回FAIL：`tests/quick-mode-test.cjs:57`「solving dodge counts」、期待✔1/20・実際✔0/20。単独成功を解消根拠にせず追跡継続。今回、原因修正や既知flaky認定をしない。
- ヒトデ新01〜03は正式採用決定済み、正式基準反映・30表情制作は未実施。04〜08既存50表情維持、08小泡は別件。
- 犬03 wantsPlay左前脚、ウスバカゲロウ07の5表情／08の10表情、名称・正本の最終同期は今回未実施。
- 確認Site・実Homeブラウザー、セーブ互換最終確認・最終hash・最終GREENは次工程のゲート。なおと制作なし。
- PR278 Draft/open/未マージを維持。手順1のみ保存し、手順2以降へ進まない。
- 保存後HEADのActions/check-runs/statusesをfresh確認する。0件/pendingをCI成功と呼ばない。保存コミットのHEAD/treeはGitHubのこの資料を含むコミットを正とする（自己参照hashを資料へ埋め込まない）。
