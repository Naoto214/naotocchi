# 最終横断監査 — 昆虫5系統・れん（2026-09-23）

## 対象と結論

独立目視担当。対象は butterfly / beetle / stagbeetle / cicada / antlion / ren の各8段階・10表情、計480表情と48通常元画像。画像・コード・配置は変更していない。新規生成、キャラクター追加、mergeなし。本ファイルだけをrepoへ追加した。

監査対象は親担当確認のGitHub HEAD `a2eb319893caca94467f474e2bf17a152d67d0fc` と同じtree `d0399d249c82dd74159fdd8ac592e0d1bd405204`。ローカルで実測したHEADは `80e1be399373cf40db0ebb5c57886711d985f9c6`、treeは上記と一致。親担当によるremote照合を自分が実行したとは扱わない。

**480/480表情・48/48元画像を実際に表示して再評価した。無条件の全件PASSとはしない。**

- 原画意匠の保持について必須修正提案5枚：antlion07 の strained / hungry / tired / weak / critical。
- 原画意匠保持の差・資料間不整合について修正方針要確認10枚：antlion08 の全10。成長文は「細い枝」を明記しており、棒の捏造や必須再生成とは断定しない。
- 共通仕様上の確認事項40状態：昆虫5系統全8段階のhungryに黄色い魚を使用。現runtime・過去QAの実装事実であり、今回のPNG不良とは区別する。種に合う食べ物という正本方針と、現行マーク形状保持の方針の整合は主担当へ報告し、勝手に変更しない。
- 上記5枚＋方針確認10枚を除く465表情に、今回の静止目視で必須の画像修正は発見しなかった。顔の方向性は480すべてで状態と矛盾しない。15枚の所見は表情の意味ではなく、顔外の原画保持に関するもの。
- 3分類の新たな曖昧さは発見しない。全48段階は単一身体・単一の生きた主顔。蝶06・セミ05の抜け殻、れん02の衣服プリントを別個体と数えない。

## 根拠・実見方法

正本 `docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md` の対象6系統継続仕様、face-relative marker policy、2026-09-22現行3分類、れん保持規則を使用。`emotion-visual-approved-baseline-20260915.md`、対象系統のreview、れんoriginal/composite-review、antlionの修正履歴も参照した。追補再評価で `script.js` のantlion全8段階の成長文を実際に読み、08の「細い枝」に関する一次設定を反映した。**過去のPASSを現行画像の目視に代用していない。**

現行 `tools/expression-contact-sheet.cjs` の `buildSheet` と現行 `pet-expression.js` / CSS / cast-bounds から、48枚の静止合成をscratchに作成。各段階の通常元PNGを隣接表示し、元画像1枚＋10状態を4列×3行へ並べ直した。各合成セルは既存ツールの340×312ピクセル、104論理pxを2倍表示したもの。通常元画像は128pxを最近傍256pxへ拡大。これは比較用合成であり実機画像ではない。

全48シートを個別の画像として表示した。全状態の顔、身体、持ち物、輪郭、色、マーク左右、静止汗を実見。48通常画像および480現在表情PNGをこの表示で確認した。480ファイルすべてを個別の単独ウィンドウで開いたという意味ではない。

さらに antlion07/08・ren03 は通常＋全10をマークなしのPNG一覧で再表示。antlion02/06・stagbeetle06・ren01 は通常＋全10の顔を最近傍約6.4倍にして実見。極小顔の状態差とおしゃぶり保持、飛翔軌跡、番号26を再確認した。

証跡ディレクトリ：`/workspace/scratch/768fc4e0e9ad/audit-insects/`

- 全数：`{species}-{01..08}.png`、計48枚（各11画像）。
- 追加：`antlion-07-full.png`、`antlion-08-full.png`、`ren-03-full.png`。
- 顔拡大：`antlion-02-face.png`、`antlion-06-face.png`、`stagbeetle-06-face.png`、`ren-01-face.png`。
- 現行入力528PNGのSHA-256は末尾に全件記録。scratch証跡のhashも末尾に記録。

## 状態意味・マークの全数確認

以下10状態を各段階で全て実見した。表情が小さい段階で身体を誇張・移動せず、目眉口の変化を用いること自体は許容する。身体が静止していることを睡眠失敗とはしない。

| 状態 | 顔の読み取りと別レイヤー表示 |
|---|---|
| happy | 笑い目・笑口、金色きらめき右上。れん01はおしゃぶりの上の目眉で喜ぶ。 |
| strained | 強く締める/尖る目と不快口、銀色折れ線は左上。 |
| hungry | 期待・要求の開眼/開口、黄色の思考泡と食べ物は右上。昆虫の魚形は下記確認事項。れんは飯椀。 |
| sick | 困り眉・弱い目口、黄緑積層線と左右2つの静止汗。顔そのものを汗で覆わない。 |
| tired | 重い瞼・小開口等、紫色の大小丸は右上。 |
| sulky | 下がる/寄る眉、鋭い目・小さい不満口、水色雲は右上。 |
| weak | 半閉眼・控えめな不調口、桃色の細い下向き矢印は右上。 |
| critical | 閉じ気味の消耗した目と弱い口、赤い太い下向き矢印は右上。 |
| wantsPlay | 明るい開眼・呼びかけの口、橙3本は顔の上方。 |
| sleeping | 穏やかな閉眼と小さい口、青Zは右上。元から閉眼の蛹や高齢段階でも、困り眉・緊張した口を睡眠へ残す明白な矛盾はない。 |

色・形・左/右の取り違え、マークが顔へ乗る状態、追加の顔ごとの汗・マークは今回の全数静止合成で見つからない。枝・角・翅・砂穴を避けるため、上方へ遠ざかる段階がある。antlion02の砂穴外側の汗と高いマーク、cicada02〜04/antlion06の触角を避けて高い汗は、元の制約と既存QAを踏まえて今回の新規不具合としない。病気の汗はbuildSheetの中間時刻の矩形近似であり、動的な接触なしを保証しない。

## 段階別の全数証跡・所見

下表の各行は normal＋全10状態を実見した記録。`10`は上記10状態すべてを示す。各行の証跡は同名の `{系統}-{段階}.png`。

| 系統/段階 | 実見 | 原画像との具体的比較・所見 | 判定 |
|---|---:|---|---|
| butterfly/01 | 10 | 小さい緑の幼虫、丸頭と後方の体節・足を保持。喜びと期待、不調の小さい目口を識別。 | 画像修正不要 |
| butterfly/02 | 10 | より大きい頭、黄緑体節と斜めの姿勢を保持。強い閉眼の拒否と穏やかな睡眠を区別。 | 画像修正不要 |
| butterfly/03 | 10 | 大きい頭、クリームの腹、斑点体節、前の小足を保持。重い半眼と閉眼の差あり。 | 画像修正不要 |
| butterfly/04 | 10 | 枝/葉に尾でぶら下がるJ字の身体を保持。マークは枝を避けて高いが顔/身体を覆わない。 | 画像修正不要 |
| butterfly/05 | 10 | 葉付き枝と吊られた緑の蛹、閉じた身体を保持。既存顔のみ変化し露出した幼虫を作らない。 | 画像修正不要 |
| butterfly/06 | 10 | 左の羽化した蝶だけが表情変化。右の空の蛹は顔/状態同期を追加せず、枝/葉も残る。 | 画像修正不要 |
| butterfly/07 | 10 | 開いた青い4翅、濃色縁と淡色斑、2触角を保持。顔は小さいが笑顔/不快/睡眠を識別。 | 画像修正不要 |
| butterfly/08 | 10 | 落ち着いた淡い青翅と年齢差を保持。元の閉眼から必要な開眼へ変わり、睡眠は穏やか。 | 画像修正不要 |
| beetle/01 | 10 | クリーム色のC字幼虫と灰色尾端、橙頭・脚を保持。身体を病気の色へ塗り替えない。 | 画像修正不要 |
| beetle/02 | 10 | 横に伸びる幼虫、体節・灰尾端と頭の位置を保持。小さい顔はマークを併読。 | 画像修正不要 |
| beetle/03 | 10 | 大きいC字身体・頭・橙脚を保持。笑口/開口、重い半眼と寝顔の差を視認。 | 画像修正不要 |
| beetle/04 | 10 | 金色の蛹、長い分岐角、折り畳む脚、縦の身体を保持。新たな身体を露出させない。 | 画像修正不要 |
| beetle/05 | 10 | 淡い上翅、金色頭胸・角・6脚の姿を保持。汗は外側、マークが角を避ける。 | 画像修正不要 |
| beetle/06 | 10 | 鮮やかな赤橙上翅と角、斜めの6脚姿勢を保持。顔の位置は頭部内。 | 画像修正不要 |
| beetle/07 | 10 | 濃い茶色の成体、太い脚と分岐角を保持。顔外の生体構造の明白な欠落なし。 | 画像修正不要 |
| beetle/08 | 10 | 衰えた低い姿勢、褐色の傷/古い甲、角を保持。低い目位置に顔が残る。 | 画像修正不要 |
| stagbeetle/01 | 10 | 細いクリームC字幼虫、濃茶頭、短脚を保持。大顎を口と混同して削らない。 | 画像修正不要 |
| stagbeetle/02 | 10 | 横に伸びる低い幼虫、灰尾端、顎と脚を保持。表情は頭にある。 | 画像修正不要 |
| stagbeetle/03 | 10 | 大きいC字幼虫、濃茶頭と橙脚を保持。険しい目と消耗した目の方向を識別。 | 画像修正不要 |
| stagbeetle/04 | 10 | 金色の蛹、体節・畳んだ脚を保持。丸い既存の頭で10状態を表現。 | 画像修正不要 |
| stagbeetle/05 | 10 | 淡い上翅、長く湾曲する左右顎と6脚を保持。表情マークは顎の外側。 | 画像修正不要 |
| stagbeetle/06 | 10 | 細い赤い成体の小頭を追加拡大。目眉口は現頭部内で笑い/緊張/半眼/閉眼を表し、長顎保持。 | 画像修正不要 |
| stagbeetle/07 | 10 | 青黒い上翅と鋸歯状の長い顎、黄目の成体を保持。外骨格の個性が残る。 | 画像修正不要 |
| stagbeetle/08 | 10 | 短く低い老齢姿、甲の黄色い傷、短い顎・脚を保持。睡眠でも傷が消えない。 | 画像修正不要 |
| cicada/01 | 10 | 小さい橙幼虫、触角、分節腹部と脚を保持。顔は胸ではなく既存頭上。 | 画像修正不要 |
| cicada/02 | 10 | 長い腹部・広い脚の幼虫を保持。sickの汗が触角の上外側だが顔を塞がない。 | 画像修正不要 |
| cicada/03 | 10 | 大きな斜め幼虫と前脚を保持。開眼/険しい目/半眼/閉眼を識別。 | 画像修正不要 |
| cicada/04 | 10 | 土の輪から起き上がる幼虫、挙げた前脚と触角を保持。土を生体としない。 | 画像修正不要 |
| cicada/05 | 10 | 緑の羽化個体、透ける翅、下の茶色抜け殻を全状態で保持。殻に新顔・汗なし。 | 画像修正不要 |
| cicada/06 | 10 | 緑の身体・腹節と淡い翅脈を保持。左右大眼の表情を同期し、睡眠は両眼閉鎖。 | 画像修正不要 |
| cicada/07 | 10 | 暗い緑の成体、金色腹節と翅の形を保持。険しさと弱さの口眉の方向が合う。 | 画像修正不要 |
| cicada/08 | 10 | 灰褐色の老齢個体、淡い胸意匠と翅を保持。年齢差をなくす若返りなし。 | 画像修正不要 |
| antlion/01 | 10 | 砂/石、棘状体節、2つの湾曲顎を保持。表情は小頭のみ。 | 画像修正不要 |
| antlion/02 | 10 | 大きい砂穴の底の極小幼虫を保持。追加拡大で笑眼/締めた目/半眼/閉眼を確認。穴に顔を追加しない。 | 画像修正不要・可読性限界 |
| antlion/03 | 10 | 穴内の大きい斜め幼虫、顎と砂の輪を保持。頬の元色は状態マークと数えない。 | 画像修正不要 |
| antlion/04 | 10 | 鱗状の閉じた繭と既存埋込み顔を保持。身体を開いたり顔を増やしたりしない。 | 画像修正不要 |
| antlion/05 | 10 | 開いた殻内の金色蛹、巻く節と殻の縁を保持。蛹上部だけ表情が変わる。 | 画像修正不要 |
| antlion/06 | 10 | 畳んだ網目翅、砂/石、左の小頭・触角保持。追加顔拡大で10状態の方向性を確認。 | 画像修正不要 |
| antlion/07 | 10 | 羽脈と飛翔姿を保持。5状態で下の粒状金軌跡が暗い連続弧へ変質。 | 5枚の原画保持修正を提案 |
| antlion/08 | 10 | 傷んだ翅・小頭と老齢姿は残るが、全10で原画左下の粒がほぼ消え、枝と読める茶色線が強調される。成長文は細い枝を明記。 | 全10の修正方針要確認 |
| ren/01 | 10 | ハイハイ、青服、おしゃぶりを保持。追加顔拡大で全10に青いおしゃぶりがあり、隠れた口を追加しない。 | 画像修正不要 |
| ren/02 | 10 | 両腕を上げる幼児姿、青服と熊顔風プリントを保持。プリントは10状態で衣服の図柄のまま。 | 画像修正不要 |
| ren/03 | 10 | 蹴る姿、ユニフォーム、番号26、白黒サッカーボールを保持。追加原PNG一覧で番号26を全10再確認。 | 画像修正不要 |
| ren/04 | 10 | 白い服と濃色リュック・肩紐、踏み出す足を保持。顔以外の所持品が睡眠でも残る。 | 画像修正不要 |
| ren/05 | 10 | 白フード・青い上着/ズボン、リュック、手と立ち姿を保持。 | 画像修正不要 |
| ren/06 | 10 | 濃いジャケット、白シャツと肩掛け鞄・紐を保持。元ウィンクを状態目へ変えることは承認範囲。 | 画像修正不要 |
| ren/07 | 10 | 灰色混じりの髪、青い上着、ポケット付近の両手と立ち姿を保持。 | 画像修正不要 |
| ren/08 | 10 | 白髪・年齢の顔線・茶色上着と杖を全状態で保持。笑顔/睡眠にも杖がある。 | 画像修正不要 |

## 具体的指摘と判断

### 必須修正提案 I-01：antlion07の粒状軌跡（5枚）

対象：`07-strained.png`、`07-hungry.png`、`07-tired.png`、`07-weak.png`、`07-critical.png`。

通常元画像には細い金の飛翔弧と周囲に離れた粒がある。上記5枚では粒がほぼなく、太い茶色/黒縁の連続弧になっている。特にstrainedは左側の軌跡が短縮され、腹の後ろから延びる尾のように見えやすい。tired/weak/criticalも原画の軽い粒状表現より実体のある輪の印象が強い。表情変更で変える対象は既存顔、継続仕様はadult wings/trailsを保持するため、顔外の意匠を戻す最小修正を提案する。

過去QAは07-strainedの左側短縮をnonblockingとしている。この記録を隠さず、今回の独立再評価では粒の消失と暗い連続物への変化を合わせて保持不足と判断した。単に同じ線の長さが数px違うことだけを理由に再生成を求めるものではない。

happy/sick/sulky/wantsPlay/sleepingにも粒の位置・線の太さの差はあるが、粒を伴う元由来の飛翔意匠として読めるため許容差とした。顔、翅、触角そのものの再生成は提案しない。

### 修正方針要確認 I-02：antlion08の原画左下の粒と枝（10枚）

対象：全10状態。初稿の「必須修正提案」を、一次設定の追加確認により**元意匠保持の差・資料間不整合について修正方針要確認**へ再分類した。今回の独立監査だけで再生成を必須としない。

通常元画像の左側〜左下には独立した金茶色の粒と薄い斜線がある。全10表情では独立粒がほぼ消失し、長い茶色の線が左下に強調されている。happy/sickでは身体下を横切るように見え、その他8状態でも左下へ延びる線が目立つ。この目視した外観差は維持する。

一方、`script.js` のantlion08成長文を実際に読むと、**「細い枝で羽を休める。砂の上をしばらく眺めていた。」**と明記されている。これは物語設定の一次資料であり、枝の存在は裏付けられる。従って、現表情の線を「原画にない棒を捏造した」「新しい身体部位を追加した」と断定できない。原画の薄い斜線を枝として明確化した可能性がある。

資料間の不整合：`docs/qa/antlion-expressions-20260918.md` は08を「傷んだ羽と右側の顔・枝」、同reviewも「枝」とする。これは成長文と整合する。他方、`docs/superpowers/plans/2026-09-18-antlion-expressions.md` は `existing golden trails07/08 and ragged wings08` の保持を指定し、正本もadult wings/trailsを保持とする。planは顔外のpixel-exact保持までは要求しない。

判断待ちの範囲は、原画の独立粒を残すべき装飾とするか、斜線を枝としてどの太さ・位置まで明確化してよいか。成長文を捨てて「08は飛翔軌跡のみ」と確定せず、逆に枝設定だけで粒消失を自動的にPASSにもしない。原画・成長文・plan/QAの不整合を整理してから、必要なら保持対象部分だけ修正する。傷んだ翅の加齢表現や顔表情を再生成する判断は今回行わない。

### 確認事項 I-03：昆虫hungryの魚（40状態）

対象：butterfly/beetle/stagbeetle/cicada/antlionの01〜08 hungry。黄色・濃い縁・右上・思考泡という共通規則には適合するが、図形は全40で魚である。baselineの「その生き物に合う食べ物」と、コードコメント `Each species thinks of recognizable food` に対して、昆虫全成長段階へ魚を用いる理由は今回参照した正本では見つからない。一方、cicada/stagbeetle/antlionの過去QAはshared yellow fishを明示しており、後の正本は既存マーク形状保持も指示する。

これは要確認の仕様整合事項であり、必須修正提案5枚へ算入しない。魚を葉・蜜等へ独断で変更しない。現在の共有アイコンとして維持するか、種/段階ごとに選び直すかはユーザー方針に基づく裁定が必要。現行マークの位置・色が壊れているという報告ではない。

## 許容差・限界

- 小頭のantlion02/06、stagbeetle06等はPNG単独の疲労/弱り/危険の差が小さい。拡大では目口差があり、実際の合成では既存の色・形状マークを併読できる。表情を強く見せる目的の頭部拡大は提案しない。
- 枝/葉、体節ハイライト、砂/石、髪、衣服縁の細かい再描画差を全てピクセル一致とはしていない。年齢、物体、姿勢、形態の意味を変えないものは許容差。
- マークは近接した頭の四角枠だけではなく、角・翅・枝・砂穴を含むシルエットを避けるため遠い場合がある。顔との上下左右が読み取れ、重なりがない静止位置を受理した。配置の数値最適性を証明する監査ではない。
- 汗は静止近似。実ブラウザ/iPhone、画面幅、アニメーション全周期、背景、重なり順、ケア実行時のresolverやfallback、CI・テストはこの担当では実行していない。
- 480表情の画像としての実見は完了したが、未確認の実機挙動をPASSに含めない。残り系統、なおと、仲間・恋人は本担当対象外。

## SHA-256証跡

以下は監査時に読み込んだ現在の実ファイルのSHA-256。normalは `assets/characters/{species}/{stage}.png`、その他は `assets/characters/expressions/{species}/{stage}-{state}.png`。全528件。

| 系統/段階 | 状態 | SHA-256 |
|---|---|---|
| butterfly/01 | normal | `af05fb84d18e89704b84740ca96644a0a161c02fb81aa2620ce62e3be4b00ad8` |
| butterfly/01 | happy | `868e2c5692a1b732aba42e5b92917021107da5b94b804e911fcbd76be9cb2faf` |
| butterfly/01 | strained | `5ebca687729c4fd426011d129f0ce4f247ceda40fb18020996c86e8292e35de5` |
| butterfly/01 | hungry | `404b1d8d245ac911412bcc75f583245855ebc6eef9455fefec3bd6a709fd0ecb` |
| butterfly/01 | sick | `54e8bbd722016438f01218da7d3a29b7a025df646533318bd6ea0b8e7f8bb430` |
| butterfly/01 | tired | `c644e51947c90c3fd40d5f30d69d2f1e44ab6032090dfcc2b674e08fb9c6a463` |
| butterfly/01 | sulky | `030763905c1393a4d2d171727e5e1dcb6ffe82c6de74bde100cdecad20ef176f` |
| butterfly/01 | weak | `050a7d29b21cf8e50703727d1cb3dd7ab1db857ffc8ec1816278443b358254eb` |
| butterfly/01 | critical | `d604bbe2796d139255152097082ad6030a5085cf846525ae9c851018959b60f1` |
| butterfly/01 | wantsPlay | `b31c3565e82b25f4a07356129ba897b526250cb0426248931f675137d379585c` |
| butterfly/01 | sleeping | `d26926ddaca4d7ee75fe57b7568a19c6934c7eecd3db629d0f3d79f395833328` |
| butterfly/02 | normal | `b33ab14c49ffacf77b97b997a6add5eabd6b0234bf732e76a9a4a6f79e417ecb` |
| butterfly/02 | happy | `713734064b887782f91d1092abdb0d14b83cb7b6744b03b8aeb9900449e38b75` |
| butterfly/02 | strained | `12aa54846d16424f353dba684f89f01ffde64e1ffddaff9c16b8189e1306f5eb` |
| butterfly/02 | hungry | `012f3e66bc85feff1b44cd66dfac671d9b6799143a4e6ad2e872027c2b1e926a` |
| butterfly/02 | sick | `8bf5e2c662a3d426f768f7d8f00790a0bcc6c1395bf36e367e2ecb1f899e249e` |
| butterfly/02 | tired | `c3312a5beb0d14e28721faaa77185264dcfc7a91a334c6de9c5fb2838efa15ae` |
| butterfly/02 | sulky | `626f7c8e92d78ec51d5ac9e5f6dd4add7fbbc802efc5f7c7a24c3f54d740b102` |
| butterfly/02 | weak | `aff20dd4b91cbea83d839dd7232ded17e9b6e5a55ee230693b4da7a30203f81c` |
| butterfly/02 | critical | `11b5c4629ff807996d6a1001e236bd3e055e0de29c4a63761e80102ff82d87ed` |
| butterfly/02 | wantsPlay | `804e4610653f6d3089d21722a5afcdfcb4b91ef00918e6c0dc5b9166fa19bf30` |
| butterfly/02 | sleeping | `a4da208be5c96bc77e7ba7be6678f12bf20e45293f7427b8bde51bef881c9a33` |
| butterfly/03 | normal | `0fb0d70175b1a7aff382c5918c100a069cef1a6c77f9c9a43d0f406f59d1afa0` |
| butterfly/03 | happy | `0998fd116679a97ecd96b64c34770393bfb6339acb28f919551b1927d7f782da` |
| butterfly/03 | strained | `658a247ee7b714196966d729c898ae9bdf18187f76d041b888cfb54ec29a05c2` |
| butterfly/03 | hungry | `d39c6752674db568fbbfb90edd0407463d94fa918baaee17ee1983a6c9fd34fe` |
| butterfly/03 | sick | `2a54fc68f1bb9a2504716a8c5759e1bd53f2d5e3ab5a2b3cdb61f9b7d3c64b15` |
| butterfly/03 | tired | `d086356dcca80bdff7218fc2a703d5933159815b5c0945c985d04eab2bd986bb` |
| butterfly/03 | sulky | `32f0787ab61203e3d94e2cf2121e5e700aaa581721f234d9cea95c90c1c8727c` |
| butterfly/03 | weak | `67a4bda4f3192308c1121867de4fbb26d5b566d3aa86bdd4eb655ddb30cc50fb` |
| butterfly/03 | critical | `a5564b1c0405d14e512131648035dd550861e2994781c2a26e91efe3de280d0d` |
| butterfly/03 | wantsPlay | `a4f43e1f0884287e7278c946d048bb18bbc5f578123d8b58c1e06848a18f77db` |
| butterfly/03 | sleeping | `9b1adb092911fa0d6592a5af419848bce4f6a3781f7ada44e04dcedc7359fd4a` |
| butterfly/04 | normal | `fcffcc78f5a9de2302adb5b8291e11965fca4727550d398bd13fd585bb7e604a` |
| butterfly/04 | happy | `b4936d3a6a0d493d0456c253ef4524b4e25e72ee5c4aa434be498403d000f4c0` |
| butterfly/04 | strained | `2ee33968d079f5446075cf0ba3967fab597225d1bbe7032355b32c88c9d08271` |
| butterfly/04 | hungry | `c33b81b5654b9a524f6d646d783077c6dc84b697aa8e1e6ad224a3335eea0bbb` |
| butterfly/04 | sick | `c39ba387292239dc7d0da42199ced9124aaff80022b1f1dd5b00ddccc6acdf6e` |
| butterfly/04 | tired | `d9182f0743d8e23b920fb0aafadcf8f94b6851fc143c281cf07ec9c0c8b6afe1` |
| butterfly/04 | sulky | `a316b49142b331ea0a1a30a16255f21addecb5c2320c8bff08edfaa372a3a92e` |
| butterfly/04 | weak | `497d9fbe99ac99c6417f15dd2dc4cab05409c6d0a0829f2c3b6725cae01274b3` |
| butterfly/04 | critical | `6dc31b836260164a923beb323f41c7b1f5c93edec4c51eea193f257013e7b8a5` |
| butterfly/04 | wantsPlay | `af69194e59b761917fa524105a9ce6a597d5ba6b12edc12a45d16f9a695e77f2` |
| butterfly/04 | sleeping | `49937488f407c927a032b280a0b180020f76e0dbfd42951e071a706d6a0dd518` |
| butterfly/05 | normal | `b38357310dc9e9d501ae99252ba773dc5f62598d81cd6a8e7e2217f71d6a0939` |
| butterfly/05 | happy | `669db1ae6c41e14620946dd235fe5d0697b3e351d855fb8fd57a8e60f8ade319` |
| butterfly/05 | strained | `9e31f868eed556a51d76ae51817fd2864cb347fe7bd8e79591424e380c524810` |
| butterfly/05 | hungry | `5daf6ad9ebb2339f3c4d0e8e27239fe234f490d3643d23dc150cacec1e32b829` |
| butterfly/05 | sick | `ff3b4bad59c9edc46eeb14e982dcfd1bbe9f90c336eb648c40cf772ddf0e8871` |
| butterfly/05 | tired | `fe863d9c1775149ca0a4c7a476e6d564b52f84fb607cd646b8dd2cc205ef5590` |
| butterfly/05 | sulky | `b6f3001918355b0d620721637fe02bcc31bae0f4d1a01f570b6974beac1481e8` |
| butterfly/05 | weak | `81a69107d7cd581788fce5865cc15681d70ed6fd4648454ab5701e88c1184085` |
| butterfly/05 | critical | `59d7b64e30aafcdfab5805617bac11dc1e1376e80c5ba2f5390ee294ad602962` |
| butterfly/05 | wantsPlay | `63b0348a62d2747b7896399f93385e27744ecae36ac68ae0fd98d6a5ea13ce21` |
| butterfly/05 | sleeping | `e22e69d834ff613da9f996895ceb87c291a9c9770ead172a39da1bfc35bee641` |
| butterfly/06 | normal | `bce91fa9a00a3c4ef1d31c69021f3bcb1fc20d72ad20d2f788da25b4a4562ced` |
| butterfly/06 | happy | `0428e546b6d7091185eb76b6e1e6702edf043050674122c9854bdffc27da63ac` |
| butterfly/06 | strained | `365f8acbd996c79e20bd4871d1607fa2a1f05c3ce11bc7828413451c207ac42a` |
| butterfly/06 | hungry | `fd38e09c0a6989a93df253e1d2227f99abb9421bcbe142aa88d11239d0eb5e5e` |
| butterfly/06 | sick | `217abd6b1b86d3b788283a0b0be97ddd0df96b45aecdb6d642eeb856b90774af` |
| butterfly/06 | tired | `6af3923fed471fa640a8de2de2edda8dc82e33bb238de36e6db69f3aadeefb66` |
| butterfly/06 | sulky | `85b9c67ea8a0ea3ef0e2a4c9a1ee3505184c313cb3496cb6df06358aca159d5c` |
| butterfly/06 | weak | `d3cc4995051170e1f0a3d22d25b1d439c52f08546ec9fa827c0e33bc0cc6d461` |
| butterfly/06 | critical | `bdb86206117e9930956563396cb284b8be6ff2939684756dcfdc3db522290796` |
| butterfly/06 | wantsPlay | `4b775483ebff9d4b77271d38c46bef6e0586b7768f41f3ef0ca62c1734def0d2` |
| butterfly/06 | sleeping | `411fd8d7a91a5a6259e2378b5303abb16c38d0bd8e830bbe7d741e2ce9f502c0` |
| butterfly/07 | normal | `fa03c4a8ea871beb6aaa05a4b2af166093789df497d05d1c332158ee4f75dca2` |
| butterfly/07 | happy | `b2b2eac1c294fe679e8323bdeedca11a92478ff960655fa51e1c0a969d4b6cf3` |
| butterfly/07 | strained | `ab174faa191b60a2d332ba9f522b8b2247b3cf6d27abee091532f2d0105cf6aa` |
| butterfly/07 | hungry | `594de7e0b3f17e9a3b36c077e532ae184f749f3687510c029e9aeb014023df11` |
| butterfly/07 | sick | `4682b9a29bad76ab7e07f4538a2429b58b9154100d35b5c5fa2a26d96e4b07cf` |
| butterfly/07 | tired | `2c1101c3950ef3e703fa7277a92c2c4afa11f89ec37f71f977648f43fe87a24b` |
| butterfly/07 | sulky | `c29eb9ad409fbfa72aafe153aa30be163957c74359ef4ce46bfaf4fcf3e090ed` |
| butterfly/07 | weak | `8fa137133a3ab45f9d3dd22550263196ed98635c4efb1835478d529c5f49c6f3` |
| butterfly/07 | critical | `1567aa591dd4086845afa61237d4e808ce902dfc4996a5fdc8b5bad72c20c353` |
| butterfly/07 | wantsPlay | `7621c40ef974b3f0a582d883ab0e497a042119cea2549a85eb41e37ddc557841` |
| butterfly/07 | sleeping | `16de2597d430188ee0a7faf8f6fe6df67a3abeb0daf3cedf7dc9a2f7e6bb87fd` |
| butterfly/08 | normal | `04a5d230501ea700d9f4ec85b69544104ae1af2252f9b13d464d247ac51cd748` |
| butterfly/08 | happy | `50d6ca8fb26a4f4bbc14582afdd8af49f9a313e070da8c209194fa2e6d2b15ea` |
| butterfly/08 | strained | `ba38eb2d35cd29cf5be45cf422c6db5cf8ddc6c6eed3f4710a8e83d775beb4c1` |
| butterfly/08 | hungry | `ac074c51d678718e7e249ecea5fcf09d5b9cc80d12ff88afc95f1e74c8c70d29` |
| butterfly/08 | sick | `533266b5f241fb3f2138edacc39ee57bec805fdc526cde1463e48da6f720107f` |
| butterfly/08 | tired | `940531012978ee9768a935aa4c967776920fda5e14b0e35cc2a1e8bf9fb13bed` |
| butterfly/08 | sulky | `434d8874c0dbc17174b9078a749a5d7e5ecb62ed8d03141e3f081cff6f9f5453` |
| butterfly/08 | weak | `5daa4efc1ba029b974ac901888f90b1de68db4c604dcf70ae3e9e220065d78df` |
| butterfly/08 | critical | `0762a7d836dc2c3038e70f698273fd27a0eecc4e259d1f253683e59aebbfb761` |
| butterfly/08 | wantsPlay | `4c4405b771bba257ed0f00f354772e00e997d314006a09b1534601daa9abac4f` |
| butterfly/08 | sleeping | `4fbc63e8eaa79056366c837735f9e3e2031a544dda5936f6be4fc40ebebb7a2f` |
| beetle/01 | normal | `5a6a4417d0d9de0f777bcf823ede9624aca9e619c9b6cbe9569fa275de394c36` |
| beetle/01 | happy | `4b77391a772790dac65ec75b379aa5d4a38dbd334d909b32dd1fdc1ce8708070` |
| beetle/01 | strained | `4027cf29826f8c0b079351334de148988989dc418a976c4cb8f2a7226a3f7242` |
| beetle/01 | hungry | `1a59c54636dd21efb3bd563bfaaeacba7ae1ea8d159a87091ad9a7fb72ad956d` |
| beetle/01 | sick | `b6eb843040ebd779844152ad81f89a72c9dca37be3b17a15a3c1d87b25daac47` |
| beetle/01 | tired | `a0b16e00289f09c749aae0f32c322005ec7af0ed54b0749ebb0fb5142130ba29` |
| beetle/01 | sulky | `412c678cd1775683c9d499d0b4323a7d7396ef17d88177c082a87bdb5ee6aae7` |
| beetle/01 | weak | `d3993fa361aa625bb6f5c38699d7d86f352a4c42c4bccb8ea66472fd9c7a39ab` |
| beetle/01 | critical | `7d84876b93b5a4379572d6115048b2e39e7fad9a923f76e50b4ec668fcb63921` |
| beetle/01 | wantsPlay | `5b58bc8643fc002b0287f454fd88bfec3e9bc5a4696f11132087694948b6edec` |
| beetle/01 | sleeping | `a53ab01b7d6052eb375e875c72b031828790a9010a76b7a4f038fe56bfda739e` |
| beetle/02 | normal | `179f5d6eba2400ded0bf9da875819cc3b6b4857de53acf40e427236891ecd05f` |
| beetle/02 | happy | `d9ec76113b4942c4b59eceaa240e9174f724002855ce77ac5ed7249c50f277cf` |
| beetle/02 | strained | `e489bd25abe1a6cd9c5a81c4baab604dd3dcfee9a5888cdeb7029cb3584c8c46` |
| beetle/02 | hungry | `a77023c408c8827a973ed29ccc74ad9ba119eedcaf545a15aed0a1f23528e3b9` |
| beetle/02 | sick | `9f0730193b363af7a2e0d5b0e5dd2d2c3f7535828c57e929343452c6753aad94` |
| beetle/02 | tired | `4c1517f5d77f22a57b80b82b4e45f39d04a9fb69df2d8aeff9966121bcc57627` |
| beetle/02 | sulky | `ff7ed5ece60490d2aeef442e42777548ec4342838aa53e4e59257d97552af02c` |
| beetle/02 | weak | `c8c46923c8cd6392756c50414a454e60cf0609539e6ec8eb2982f882da82465e` |
| beetle/02 | critical | `87ec1c3245419d83d8a00311141f536e41a8dcf311c14acd13df84b3f3f92551` |
| beetle/02 | wantsPlay | `632320dca86a8204c8f4abbecb2f9379330c424706f03a63c0a6a04002a50f5a` |
| beetle/02 | sleeping | `a3b568b8021cb6ad28069192f255d0d1a258a5542a1c1743244f0b566f7e1f29` |
| beetle/03 | normal | `ef7fd39c3e1bbe09db4289caf0395fc48f2fb8e1cf7866ead31e2b1b9b1e3014` |
| beetle/03 | happy | `4b0be2942eb2869cd9cc1c409690bcc9d49b49e671d7c8ec59629717c59be4ce` |
| beetle/03 | strained | `664c502e88f54e28efd6ee9c654f93f0a30eb3fcaa8ccce996a21cc5324010cb` |
| beetle/03 | hungry | `d280dbcc56ee830bf5e96722b06168ecb6c160b8d9a9c2a4a8b12411c79a9d90` |
| beetle/03 | sick | `860d38196f341dc2f9eb2295aef0d62100689cabbc42a094a5f090eac3da8ee2` |
| beetle/03 | tired | `fac868269e2e1f28bfc96604a3617c484a11df1d1ecf502f8faf9fa399e801dc` |
| beetle/03 | sulky | `057ebec8d614a3d337dfeb9c6d0c783d24184c82bb2bb9b3e6a379e9639e9ecc` |
| beetle/03 | weak | `3f8e81b8801fb97d82a26cf0d47100ee7c460f21fdc0b2d939de56c818510005` |
| beetle/03 | critical | `c08ab6527f6ea95e6249759736d4b311b56c669a6c42a806907d69c228af68af` |
| beetle/03 | wantsPlay | `76e5983c3cad370a4168a91481ecbe50594b430c265c421bf6ffd5bbd9306b47` |
| beetle/03 | sleeping | `5dc383a40689b7e584115ddeecb385ab3998154226e5562c27a5cb78a2791524` |
| beetle/04 | normal | `bfd43c935eea738755e827c43b5ca9947f9cce83a81571a56c9569c9cfdb056c` |
| beetle/04 | happy | `9e6d6645161e1330e3bd76b7929d6476f136dcf89d867b9b68ea0397acaa1f77` |
| beetle/04 | strained | `6280560f8ec8b2da9ccdd5f25ef592e4e11d5492ded32def54206eb856bf9403` |
| beetle/04 | hungry | `38c48dbc5871703a5f75d8c2ae859bc912c7eed10ad4de3da769cb23d7f20ddf` |
| beetle/04 | sick | `df4879596b4c1e84238e30431daeddeb61c399dd6406ff20f5c7a6ea78ffdced` |
| beetle/04 | tired | `96281adc56a13b0eeb4e42edcce6ad006fb213b1280925d3980e34ac930b1cd7` |
| beetle/04 | sulky | `0ee6eb34dd96f140f1443f2fb1e98acadb1672189f8ac52c80d2525bc0f2c4b4` |
| beetle/04 | weak | `ff0c705e47011aa899574231150421e6635a8ee85eb7537939522ee95043e1cb` |
| beetle/04 | critical | `c1aac44722395e5cfcf0bc97a4c98f90cd19afc27e1d5a728a76b4c371a43d8c` |
| beetle/04 | wantsPlay | `11e5640f88f90e4075c34e10f6c99a12526c7c6ddfa944f928420052fd68688f` |
| beetle/04 | sleeping | `fdd0f85298d7edae3b248caa4667e73034465e216c75fbe878042c572bac955a` |
| beetle/05 | normal | `854279f1249fa1a6730f9fbc4a18e71340af608980d06c9ab21a74e698a8e605` |
| beetle/05 | happy | `7686c6181128cd732672c9c7440875f20fdbd7ab5bcd6a29cf249d3066108774` |
| beetle/05 | strained | `9679707c73d5836669d23aafefdc24ee2e969c8b467c34afc2782333d13449b7` |
| beetle/05 | hungry | `459b27586a497e7094b798525c8b802c0bb6960857dd750308f809c982234e78` |
| beetle/05 | sick | `58b1dbb45388d97ebf81101c4ba74113a9894dbc757544bfb97832b50340967c` |
| beetle/05 | tired | `235255bc0d6800e1436200a4ab60990c42c33813be51892ff544e245289bc31c` |
| beetle/05 | sulky | `6e5b7f4b15a73138107ad4e259c2b0a884b65fdd5ea22c6446d12788f2bfe129` |
| beetle/05 | weak | `5b4aecc96c32924f1afbc0fa4b929349feed075886e43be18dc2d1f9771832b4` |
| beetle/05 | critical | `6dfb9d80d7aee2a4fe99dbf77588ea3d04da6d3a3e3214aa9e8c1bd12431e4b6` |
| beetle/05 | wantsPlay | `e457d6857ef06030fe7ec7e7fd8d5ac59dc78c2df9c9083c90cf33f0b0caa8d8` |
| beetle/05 | sleeping | `41eacf4f5350d68646b779cc3b13426def2f5eaa633156df7d83996cd0840567` |
| beetle/06 | normal | `44a6cb80fd614fb1ae817c1f8d05ab4af11fff90ae9a0787c38f43ae4a043d7f` |
| beetle/06 | happy | `b3d5ff006b15858c41276305058a608a432da2407b3f5704cf7257e72be97e5a` |
| beetle/06 | strained | `2319501e7990824b43b69b3fe528dba12996d8ac6a5908832ce8c7ab090c70fc` |
| beetle/06 | hungry | `852dfe3edf3877b6009990db54b7e248298bcda4f3c83f814cc7fea6f3991e65` |
| beetle/06 | sick | `b10e7fe27b0b98e3f3c9eb98d792d30e6e5cdedb0270e44ea3148e0b8b6ddec7` |
| beetle/06 | tired | `88b40c348b6e25096d80ecba5c6cb6aec51716884931fe4b62b406db06c77379` |
| beetle/06 | sulky | `3863aa718ae5174d6272ea27b868799717aa8d475bd37c0aaad34059dedf761d` |
| beetle/06 | weak | `30732acbf433bcdb1a683e6f4da0ab27bb7531bbf53890a94be6c2a60cd748d4` |
| beetle/06 | critical | `07cfeaa0c9a01ca9bd89f4c90c890b20dda8f32e3e8eabc2b680005563b8c97d` |
| beetle/06 | wantsPlay | `d0a35d67052c93d7750c6e6b8ef57fda0d687237abab8c43a124883dfc5cab18` |
| beetle/06 | sleeping | `eeffcab68abe727ed4df12e72f172865e27d782c6ffc42a9cc5dae46eae90776` |
| beetle/07 | normal | `314f73a2d7bceaf1f1fbe7c28b5245250b4b830a4eaee62326cca95c104cf8b3` |
| beetle/07 | happy | `e06917cb78bc601e7c999b93bcac756580637cecd37bcd825939ce0277ecf8d2` |
| beetle/07 | strained | `fcd0e8b8996c0fddca0c98bcf2cf08066f9a720166220a8ac26529a78d75f3a1` |
| beetle/07 | hungry | `af7f228b3e173f39a3c66a0fc37c6ff1213ba5c63f34cc1655c1135e41325394` |
| beetle/07 | sick | `1df63cab4c805a8960200be690abbf420054422b1419a0bd93aca0b3d03ffd61` |
| beetle/07 | tired | `3e3a5b13c99ca89581f8afbb831811ccda906eccf7b33de782a5fb29ff2de01b` |
| beetle/07 | sulky | `1ecfd5519b1fc3e73c97a5cac3b124cfd05c78f70ec22c0c7ba3d79aaf1692c8` |
| beetle/07 | weak | `ce5cefaa34bb90e01c9bd589eda37bbdd0ae9af16da3970204705460ecbd23d1` |
| beetle/07 | critical | `d3ed7333652d8e051b3462d363f0db8b4d7a219314388070e1d06876a2cb4e3c` |
| beetle/07 | wantsPlay | `e458871de41d4569f4a7409bf8f7fe87801b1c522b8cd180df425030e2e5fb91` |
| beetle/07 | sleeping | `a5575098a0d0c5ffb9e492084e62611f56a6470c6ccc2b82fb3b18ff5980fb9e` |
| beetle/08 | normal | `91bb7c3003a14557c6c6587ef8e9c24fdecc6567da078abaa000336ae897c47b` |
| beetle/08 | happy | `e193559771633535d7909ab873797698b7b7fbc15db0b2086c9ac439dde6f3d3` |
| beetle/08 | strained | `4c6592844455528bb4abdc9200a804dce6dc0e7ae23b52bbb28f1beffedad022` |
| beetle/08 | hungry | `4487837eaed66eea311dad9188dae7e800c942117e9766ce0ad337c95e271573` |
| beetle/08 | sick | `36873b24da480cf133935197ac0e2ab8af8daa3be806068cb2d4d58304c0f0d7` |
| beetle/08 | tired | `73951b4e37bbf48f9c3e94a874b8baf27d921f4cfd46b498aead9c68acebb4ca` |
| beetle/08 | sulky | `0def7ec373d5f5475b9c5898beee709af0c28b6db423036078af0607f7c612bc` |
| beetle/08 | weak | `c003df36ac3aecf71edd02c9a7440f847050ae7c2472a6f80453157f8eb1e4be` |
| beetle/08 | critical | `6f5bf108a1adc143a2b020f1c4775ff9481d75bf5a7be37c58de58a1afd11898` |
| beetle/08 | wantsPlay | `d5d1b484a0278987beed4297a1163aed3071789592fee30c125ddf65c3d76e3b` |
| beetle/08 | sleeping | `c259c8575f235c92401ac83faaab3185a9b04404913ffd79bbb7813df45928af` |
| stagbeetle/01 | normal | `dc7b2c02c015f46d96ac666f1f9fe4656432fc891c4db9eaee259abb3d4289cd` |
| stagbeetle/01 | happy | `2d86028885d48421d98c07d2f077ad3554b83202d2ebf1c1da767c4f9232436c` |
| stagbeetle/01 | strained | `dcd94c8eb9e3bb8c1c6c55c0d9d865add68588c32260a53ee5365f466da1aaff` |
| stagbeetle/01 | hungry | `14ae9a4667360c040b01b11814456ff9143df8d57900943d59b685e66a820ebd` |
| stagbeetle/01 | sick | `4ce619eaab5999f7c012d47448e71629439fe9c4e2e967a3b9e0138ef2b7da98` |
| stagbeetle/01 | tired | `a55140232192c47e74d170aabf045d60fcc14fa01cff635d54aa5be1482e59f7` |
| stagbeetle/01 | sulky | `d7005f4b86d2ec1ac7a0267717a9e370339e4cb44c7126ad53792796597c5bff` |
| stagbeetle/01 | weak | `12beccd0296a1f2479cadfe4d0694b42705e93baa89845206e0f8c1389dbb4f4` |
| stagbeetle/01 | critical | `76fa4ec742674f2c21db0ddbf724c3b3960f393666b4e5520a2d9ca65720a76a` |
| stagbeetle/01 | wantsPlay | `02d2e5c9b906a4a55a85b374ae3339371c8a873dfdaddb986531d6b113e4f252` |
| stagbeetle/01 | sleeping | `ca129d50df6d6979b3222d1d354e612d16a64d8e59238c669b827ec4ea4575a0` |
| stagbeetle/02 | normal | `a19551194090c3442a69d9aa8311c3a9b3b3277ded55fa4903956f5bb6705d15` |
| stagbeetle/02 | happy | `305743c8b09943675fedb7efbd5597c82db3f082c0922b811d421b34cb5af31e` |
| stagbeetle/02 | strained | `602547b0c3a79508d3ae4eed4cccd8efcc5be79e4870a01e2633864a83e23bdf` |
| stagbeetle/02 | hungry | `71fe7f040ae128a1acc588a9efa79e1817935bd15d5b70e31f910940a36431a9` |
| stagbeetle/02 | sick | `6d5fe81033b28a37bb7fd015a4c66c2d11fa73f041d92bcf20e9accf10e53848` |
| stagbeetle/02 | tired | `5cf125038089b13b935782aa1fa887388c45994711efdceaa346ca88ccfd97db` |
| stagbeetle/02 | sulky | `97b0fb806ad37b7d79f8b5718f260e5472b0407267642359f55c60875fcaad2d` |
| stagbeetle/02 | weak | `2b1017e38a390c7c36c1acbd44ba8327b4e7fc1ba0e5e4e6e1cfd28a6e2fcc20` |
| stagbeetle/02 | critical | `691db586d9c2ac89543e84778893edb453203aed86261888e2f02762f04494bb` |
| stagbeetle/02 | wantsPlay | `1ca71ad8c811efe93c3873ead71247c24a5f70032ba4e7a0ddaca540e3598ee7` |
| stagbeetle/02 | sleeping | `2bebc22de73178cbffda74ca24f41d4bb416376dc22dd876cee845c5c98d1ae1` |
| stagbeetle/03 | normal | `d6a91f216bdca35bcf252819995760106865725093de0b826e833f7b9cbd13db` |
| stagbeetle/03 | happy | `a371d40cefb5315f3520297b4085fa9fcfb293ac7096dd21f921572cf6f051d1` |
| stagbeetle/03 | strained | `05638cecf82e14c61c2695d0b127072368466232050f6816d189f6a4d58f90df` |
| stagbeetle/03 | hungry | `b7f33cf861061653fa28b81cf4efc8746e3a14252010e5a6f23f7cccc97dbe1d` |
| stagbeetle/03 | sick | `a5fd4478037cec17344928f957903eb161862ea620c9d15a2ec5584394400280` |
| stagbeetle/03 | tired | `9b9d4257062a349426669ca2783ae5b9997fa92b44bbaac4ff6b8e89122930bc` |
| stagbeetle/03 | sulky | `a9ff6bd65e6aeca6f1d755eec3842d9f9c0771a7c854dc6eaa0138ef941670ca` |
| stagbeetle/03 | weak | `eb7ecf98ed2c6044193e960766fc5f2ae853e33bde8c6156484e348bd14c7113` |
| stagbeetle/03 | critical | `77d635998738cec1a4a10dea67c3516263063f27c52b90ab05bbf27a9d0111f1` |
| stagbeetle/03 | wantsPlay | `62aa22e9d5bb5719a35d6176864b6c80f3906949308a2d3b061222baf9ac7c9e` |
| stagbeetle/03 | sleeping | `6e4965b37d2e62fc189ab55c5a31082321d6dc93dd8a880698ed77eef7012eac` |
| stagbeetle/04 | normal | `f16f819505567e5293625639a4ae0ac1a684089a0f9864b8aff5e265cf75b7f2` |
| stagbeetle/04 | happy | `e5b27a05231ed7d6ec4a9d19486cafb4c3e360e8f242e468d31aedba1b7bbc58` |
| stagbeetle/04 | strained | `500e4de922d3eaa76f2907c2395efe106b53ce3e9bc02bdb2f9ef71036290e00` |
| stagbeetle/04 | hungry | `dbc5afaef61aa4a62515cc9bee6d80fb719e3970018e17d2d3319db06a86ddfb` |
| stagbeetle/04 | sick | `cda975486103b4ebe145c60db532725c5089386daa4df83fc10e907ba3d48fc1` |
| stagbeetle/04 | tired | `da570da6f24d558a1ea8e831b822e85dbddbf699c4598ceb9faf2f769cc07e40` |
| stagbeetle/04 | sulky | `de9ca97596e053d71f810ca0c7687841c7b5fa00257a5012d128250cecca3706` |
| stagbeetle/04 | weak | `a5285aa7a2b3114f3859609cef473dc25ab21749107fb92ac133b84b7747a6a6` |
| stagbeetle/04 | critical | `3b03cf8c81163d1e47df223cfb51235207690280ffb5e6ef443b54358b30ea5c` |
| stagbeetle/04 | wantsPlay | `147207d08359286c87af01aeb29604c92a673d022e2ec639744db95fd4d7b1d0` |
| stagbeetle/04 | sleeping | `37044dc1e481582d91ff1d6973ebd3dd7d86cb60674bd9d2fb3ea9c2d8268cef` |
| stagbeetle/05 | normal | `9570f348ca138e3724ed8bb7d0b8d2406aadfd937572d230eabd273680cd3c87` |
| stagbeetle/05 | happy | `aca1dae7251ffbcef2eff1efd22d58d05808b9839e0972d10ea910bac5cdfeae` |
| stagbeetle/05 | strained | `3c162bd0d0d2f6aae1e6253203fb8dc98a90c57fbd7381dc502527463e39738c` |
| stagbeetle/05 | hungry | `19b96c74c13507908372474e71c1aff81ad03ea13ec70aa030a5dcd7ca709c86` |
| stagbeetle/05 | sick | `02368c9802429b82585e0073f75b739dbc664f9d74acbfeb2c4e3a4c0e94c676` |
| stagbeetle/05 | tired | `dd0c700e1643dc338bf62250e626c1615048433892f48e64d525a066042b8499` |
| stagbeetle/05 | sulky | `80add8a0068a4d291cde0a52b320222293f95701ce298c9353dfc6d2400555f7` |
| stagbeetle/05 | weak | `e9ec76decf8f776794726c116b15c706b1b45f04728aab05b455178237cd8d1e` |
| stagbeetle/05 | critical | `ce274a2424653ab8bdc55b4c49fa61c0e2b7ed8ddcbfd19c77be161d8dd7f1da` |
| stagbeetle/05 | wantsPlay | `d5fffb0c35506ffe46f51a3210f2d82dd2364aa4a20624396bf39bc138f32a2d` |
| stagbeetle/05 | sleeping | `a2a43e89435f9d9a7adc73808292105488abadffbc87d99d9a48b54552e1a8a2` |
| stagbeetle/06 | normal | `4a90fcdc68e99f2a3056de262399d7692be66ebb8968a9ce200fd463290132b9` |
| stagbeetle/06 | happy | `385223ec8daa0fad135cdbd3d36d57235c16fa05ae0edfca86e860287e6684e9` |
| stagbeetle/06 | strained | `ef42838198c1172f66dd7db5483006140bb5e2d5f58f6ba37e4d05bdbd979134` |
| stagbeetle/06 | hungry | `67c41a010fdaaeefc28c3dea791166a6068574e0df716ca3130fc10a25c89b8d` |
| stagbeetle/06 | sick | `29112b07dd493a8f7f93cfca8ea4ed6e755445212e9432df0b8653634b60c3a7` |
| stagbeetle/06 | tired | `44b626d25dfe36a3865428d05ab24932dde19a2a5f01471ba655d5795a04f23b` |
| stagbeetle/06 | sulky | `714e57c7d492ebe5c9234f1a1eaf4584261e9d7dc6231e64bc3db6d5e05d9367` |
| stagbeetle/06 | weak | `ebb52b1b7987dd664e046afc993b374aaa4ce5171f19824db7406536a96d55c0` |
| stagbeetle/06 | critical | `594536af3d7b45cf1e62a7de284a20ac1c257008e87b3058c9ba170cd7d783ae` |
| stagbeetle/06 | wantsPlay | `f0e72ebc45decf3429e11c8b40650143b3cb0bac4dd8bbef0ecdcecdb1d2c6de` |
| stagbeetle/06 | sleeping | `e026428e1aaf7f2f91f45a1aaeeccf52db9a9a64b82c3baafc8a0f50f2b3a4e5` |
| stagbeetle/07 | normal | `c31a4eed6e1cc942248c4f0a00eff2e626b0b89a92c7656ef7a244719f973251` |
| stagbeetle/07 | happy | `3b24574f0a2b55e611539ecde4483068d1baa7ac6ba2a08f3f87525ce76862f4` |
| stagbeetle/07 | strained | `20c7cadc9fa5b05038e3cbca9551a9020675a489c76f41aaba872373635db075` |
| stagbeetle/07 | hungry | `7bd29fe0f8a20bef613d0783fe46e3bba5537ef1e77cf264831568c2dc5b3085` |
| stagbeetle/07 | sick | `e284b40e9a47d7365adf4836ad3437b1e052e3cfda59c1ebb40d502758654cec` |
| stagbeetle/07 | tired | `58277bef495a60b6a3ab20045076c181ce042e2c3bc02a6a79c1a2e175b4b30d` |
| stagbeetle/07 | sulky | `271a472afc49560e621b5d0b0f9a9e02134b85c8cb1d157991cba7b56fba2a62` |
| stagbeetle/07 | weak | `f56ecfb1b7bfe97e1ae11db70a881121cd6e5a282e2609ab7d123dc4b8bf98e0` |
| stagbeetle/07 | critical | `f52d3ca4d84399c8ad5831388176f974303f5fe60925984bbd93a5b0beadb298` |
| stagbeetle/07 | wantsPlay | `847cf44d6f088093386a7c7fa2f1b4c0a2e8d2a48232739ce11c37f9244071fb` |
| stagbeetle/07 | sleeping | `b07582bb24f950ef5f082d9dc1dc9a4cf474ee92625a42b658dc6e3541fbd00f` |
| stagbeetle/08 | normal | `453c6bd38f1a08375a5ac571e6311349d7c83603c7ccdc10743b0ef889915eb1` |
| stagbeetle/08 | happy | `356d7b6d07b2a95a5ec34e3deddfd132c709bbd5f6ef793bb2bb7919b36a6d7b` |
| stagbeetle/08 | strained | `06861388b27fc3bb5a4ac2b366ee384ecb6ba41ffe0bede0e4c9225fef8135ab` |
| stagbeetle/08 | hungry | `ce83e0ef1b31fbca5345012268ad75a2b729e756a516eb7d5aa18aea941d6e62` |
| stagbeetle/08 | sick | `29fcfa291202f54e464eb0e8e9e84e12558efe049da540227efa8a4694182af7` |
| stagbeetle/08 | tired | `26586e2b669cb3650ea91ba2dcfaf2bbd1fa6c34ac0e9e69d124903b56c70956` |
| stagbeetle/08 | sulky | `a31097c49cb88f9fbb28261f991e776633e5d735edfec9923d7faeec9b3c4ee0` |
| stagbeetle/08 | weak | `f7e19aac7a4ea2872d5fdf223b5ca58a9590689e0e97d7462605775bff58ecd3` |
| stagbeetle/08 | critical | `b89669824889f754641ca09ef2b72040d822664fd9a3791b0d6579e7840eff24` |
| stagbeetle/08 | wantsPlay | `ec0c08a6f3d6581426f2f2d697ad41ae5b7460567d49caa24d55b2a699046848` |
| stagbeetle/08 | sleeping | `d92b06c7b1389d754edbb12da52762ca6952c76fa330a6c66ad346b61128d352` |
| cicada/01 | normal | `858ca18bcad40189c714a12e3c6dc6ce6b9669ea632a732484bc8628273578ca` |
| cicada/01 | happy | `652be8bd5c6d0bd95cab8b6046a3a3de3518c2e1381c7fd1825f87aa06e7e991` |
| cicada/01 | strained | `e1477dc3721a61cc363c13f02c322f7a8fd036852c6b706aa4cab3f4c1948726` |
| cicada/01 | hungry | `21a554191747ca8b1b77c46379ce8b73f2266d2202f2b32d8143dc823477b4de` |
| cicada/01 | sick | `929e2857472ac45cfd7c0adc0397d77f02aed55f23ef486833563613226fdded` |
| cicada/01 | tired | `a63c4b6b352589e62e9db7954ac7df5cf36f7c2393935ef6934a0321276c4522` |
| cicada/01 | sulky | `e782a6fd53627c39af4eee4071cc1a7bda93cdec080227b2351ab9648476b93b` |
| cicada/01 | weak | `fabaa8fa13178d4dc2b0e8508fee14085f7b2853e6a674f7f390f9236419ee9b` |
| cicada/01 | critical | `2d9404ea0b5c53b7203c32b53a14f91963bdb65724fbe508a9c837bb60e29331` |
| cicada/01 | wantsPlay | `aa9e48f6d814dd765e521858348b3f19c13ba32148464ca039c0ee13a826a150` |
| cicada/01 | sleeping | `1349b406a929f63179fd71735627294c8ffbe5b46a9d5a43cdaf064484d1c9d9` |
| cicada/02 | normal | `0cb07e00c8d37881d20149c7a013518417288e657cc55f396cee57f44c77214c` |
| cicada/02 | happy | `109950cad33c1ab95948505bbda31ab06f287cfe80c68401056006d4c9a383a5` |
| cicada/02 | strained | `e673b3735e69e1a63dc072119a33f28b42ad2f230e341b1b6b20d355a2a812f0` |
| cicada/02 | hungry | `d8353f163188a8131f3eac7abf3a8ae298bec669fc927e5e5f47d6337b3c0fea` |
| cicada/02 | sick | `b5426466ca4a3a53c678522751349c7261a9f19cbeb787e95d22d8e56ff1ab9f` |
| cicada/02 | tired | `b99c2c6fc48c10ea893340d2c8ef7ed0311f48e9fa447fcf6b20cb5e5ed7eb4a` |
| cicada/02 | sulky | `0f33f2396c2fc6188ad00b3485b71f77d218d8ad97edad5302e99d0e3ea0200c` |
| cicada/02 | weak | `1963e81e5d11d23d4d0b11d87838548d3aef13d38bdfb47f20f1713d576e7c31` |
| cicada/02 | critical | `03c51de6e007a4a5f63abde9ebb7fdf3926b1d043a35280cc96adb3f33c1ec63` |
| cicada/02 | wantsPlay | `2ca3e5c85ad3799c91033305af3bc3c1adb7770cb739c7b29b056ab6b2404f8a` |
| cicada/02 | sleeping | `c3097dc5bce8b65756ed808af12f0413da3a61e081468ec1c7d37f7aa1df9b71` |
| cicada/03 | normal | `91e78ec15f121909056e2c3d82228882beaa294aac4da4c54312f99f1a556944` |
| cicada/03 | happy | `3e9608f6a2891a27ec25c00490ecde1b5860195982d0168cbdf2a3691bd12154` |
| cicada/03 | strained | `d95bb909a3a33428bfebd0bc698a0707897561bd3cc740848f3b68ae283a55be` |
| cicada/03 | hungry | `f09e94af402e33c92b9c5845c1419cff39890883edec4b243c10c54853862fd0` |
| cicada/03 | sick | `afe4a137b3e6e7dd8c4aa3b023abe9140e0187777181b4c164beb6ccf302e601` |
| cicada/03 | tired | `7f699fc8c2cd81833a680d19e35470c79b77eeb91c123f3af825c700f135aff6` |
| cicada/03 | sulky | `f8c21c2967e430078064a2fc91350ab0dc914effadf0c6bf251a479520e6f8db` |
| cicada/03 | weak | `897807fed32272bfc957efc409f215162af1c0115c34eccfbdaa944e869f199d` |
| cicada/03 | critical | `f9645b432c21338a795a9e06ce4c68689b62c6d4e3a9486b57e966fa67372fc4` |
| cicada/03 | wantsPlay | `3f20e445608e60967bd2c5e0e2594ba5b9e801c65c1db181badefddb9c38170e` |
| cicada/03 | sleeping | `5e23b0feea1fc054c1e58cf0f0124cf32d9de8bb926065481e9c8b0e61ec4743` |
| cicada/04 | normal | `addd42e893f939ab97b46f2c726b5196508075d0f89ded7ae3b3452c14daf755` |
| cicada/04 | happy | `755cc37b4ab1f5ace8a549032039c3af68ce84df16eb9cf2158e46bf33d6402e` |
| cicada/04 | strained | `4f7d5e8dd19fcc8f939a152ba55d643ca86429e462ddd1d2c3ecbbf3af660819` |
| cicada/04 | hungry | `e38db906e772d7e5c65445567b530d91d3e3e8c6f5c8bf6739721989c3cc7a19` |
| cicada/04 | sick | `eb06a5a5497c69b634f9ca5cbb07fdf6af03bea07d3e88f6a4fa52ed129f80da` |
| cicada/04 | tired | `81de7b63dab6f789670263d77fa1ec4f59802d458311e5916dd5ee31e40f31ab` |
| cicada/04 | sulky | `ef32083af953b9f8c5b8a67b7d08b11b9f2fd2feb46c6c754214d748af5934c5` |
| cicada/04 | weak | `81f93052587766597776db984b7beacf6ccc70f81f665e9869cc9500bd085b16` |
| cicada/04 | critical | `c90909fea356ee0e1cc08a676ecc84d261997437353dd2251cd437a4367d7273` |
| cicada/04 | wantsPlay | `2a5aee95b56c59388b961f060885ea91d20d4b06414b10569138fe69de4935af` |
| cicada/04 | sleeping | `378a98ba0a05030f5a2a56199bf74f437b2b094f3a1830dca14c9a17136901de` |
| cicada/05 | normal | `4824188dbe4cee4cd648d9f2cee60266ef70d09757d724a4b035ab80180e1143` |
| cicada/05 | happy | `c3c5ceae9c4bffc14fd6ef00be7f1a17ed9ad7a40e14b07cd7f2a5028bfd4a14` |
| cicada/05 | strained | `f1673b0bb00ed9ce8354baedf97c5ce690553d71643cc300192680f00e7687c6` |
| cicada/05 | hungry | `ab7ef056da2ce0d6a56f1fd6c8fc67a79e756dd500e04c64bc52fb9b2dcc3072` |
| cicada/05 | sick | `d2a0aa0747ec7cd423b830ea6584f24fcdd6cb029ae0992c786cd503dde93f62` |
| cicada/05 | tired | `295ebee3ec8b84195851f5a9375b2df7521182b711db6213d3fb337ba301c4a6` |
| cicada/05 | sulky | `068a306875a64d0961b08407973e387b0ef156adc3fc330a684c4f31cff0f8e9` |
| cicada/05 | weak | `688c60b6a45c176696e6bce5f3beb827b46ffca9586d3ffd7226b27b9ef9746a` |
| cicada/05 | critical | `26470a9406ece1ea7de24d6fbde8b3a6b80d5479f8c2eecd62ac4856f952eb97` |
| cicada/05 | wantsPlay | `aa458e26092c1880220daafdae6e02cd62e89d58cd4e392ac9dbfc5483d31f71` |
| cicada/05 | sleeping | `97eae097c1f15ad1919bea23ec03b6b45cfe441cf8b298e9a8b2c17a8e9c5ba7` |
| cicada/06 | normal | `0aa7fcd811cdd1eadc0679d4d4210b4446e686eeaab424c646a9c16653e6e184` |
| cicada/06 | happy | `4b2736990d4464b88e5d77c3935b12a35c12cc224b1293d9b7cdc0a07b25173a` |
| cicada/06 | strained | `09279ca12f5ae8c0b2e96c393cb46f0550a7feaaa267ced52cbd02246caae97e` |
| cicada/06 | hungry | `596140b5bba93e45e65e311e04412025ffea1f13fafa22b83de3584f9ed739c2` |
| cicada/06 | sick | `fb0f50f5828f8cd36617669079f4cbeed2c3465edd0de8b1f7a54bf289d5bc71` |
| cicada/06 | tired | `de921d6c5f942692334412870b27a2a32cfa98f518455ffb9d8811519eee9bd5` |
| cicada/06 | sulky | `68bd07e142359e1a88c7f3b3f85bf4568bf2fd7558805b5a7876f7c8ea8d7293` |
| cicada/06 | weak | `f63c50462fbe9340988a01a3b75c5427e1e4a3a1f4f04bddbd020b7d2eef1688` |
| cicada/06 | critical | `f2f288d12f42bfe1067e6ab8d2b08a3c0792772971f39aaf44129eebac3c5571` |
| cicada/06 | wantsPlay | `91e50756b1166de0ae1d34ca5a93108185630370ba6f11d6c29cd367f8f1a8a7` |
| cicada/06 | sleeping | `6605d1eaadd90f95812085ac18834cfd31ec11b593a267acb21fed4ef1160af7` |
| cicada/07 | normal | `c0cfc06808e211b92bfe4d7ccfe6496290a312035f2fed706eb622f5f3aa5e75` |
| cicada/07 | happy | `97cbd538d9d86a95014c7499ddbdf013e915c0eb4eaaf3ec4233460467e1277f` |
| cicada/07 | strained | `76feb18b73087cb46da01c9f83f63fb9ec652a1eee555177d960ba8973edc0d3` |
| cicada/07 | hungry | `091baf11313bd69a4839f9cdf3ed33c8ca18a1b45dd305b1f32d655eb2cb4b59` |
| cicada/07 | sick | `7367ebac4b887c7a1b6d9c60b7f80a7908d890bbb881f88727e29828f135baf5` |
| cicada/07 | tired | `3027037f3e46d750b2a3f8e51ffe5507d765dadb55da7dbaa161909e4172b89b` |
| cicada/07 | sulky | `f498edbba7b804aa551d0dd5788b86276debf60eac3451e5c50b46fc87725d72` |
| cicada/07 | weak | `27b06585e8fb920bdf74ee1b659d0b88c9558c29d635cd70ad126328c82cc6ac` |
| cicada/07 | critical | `27894b6c9cc8d241aedc0aa437933921e3e45d198c0cadb8ac24ec81477a6d5e` |
| cicada/07 | wantsPlay | `1bef037b818e902126ec980fbc6217a2a9a907d73d0309e58c0161255414aa99` |
| cicada/07 | sleeping | `86472022efc00201710bf4c012459829c5868a306a35193e2b2c365a7eb1ef44` |
| cicada/08 | normal | `e40beafd474ca5d78b3bd393a7b37937e6d98c2a8f6644639773c30912ead71b` |
| cicada/08 | happy | `2a65ded0870ca52877bdebd49165e8ca03e77ad6b14d2277b13934b4870d1682` |
| cicada/08 | strained | `275101a75b009a1198e44537af282ea7e11ac87c4581ee557238896e1b899f42` |
| cicada/08 | hungry | `618062b2e0af7199e6e88b53008b6f619f87992667ee624ddbe49af5daf18095` |
| cicada/08 | sick | `83b49d60dd5661a6196664e2b2d0a1d1638fc022587a83af24f867ba104f0fee` |
| cicada/08 | tired | `d525ac354841dd582f9a0e28cb40a990d513dca255c19f34393d9f0db7ddeb2d` |
| cicada/08 | sulky | `21f3c587da66bfb5fa9a54ac2cc07e1fd4ae5187674c5af8802819d00e7bc1bb` |
| cicada/08 | weak | `a86c29f5e97434c982bbae8df424497c757792247cf9a743d875164eddf81501` |
| cicada/08 | critical | `03f00cb1aad35b91debafc810f121a6106274ccf40cd0d3a0c4691ea23996590` |
| cicada/08 | wantsPlay | `ac116114a615980ef5d05af4c54e3bb89b1d46afae2c6ef85357dc1de01835c8` |
| cicada/08 | sleeping | `d5242d4007fac5187f69adfa99080f5decd162b96f5ef6fd04c82d784e6657d8` |
| antlion/01 | normal | `8ae81e8a9ad75e8cf69ca4e9e81cec17a56f2bbe3807db061ca96fa7f51087ed` |
| antlion/01 | happy | `645fb69da452e1bb0041cc34857185beb4ecdf611d2972da35e65f203587d1be` |
| antlion/01 | strained | `da73c05417204ec347a055d6244937b37103baf0fb78a094b741ad47ba0db2eb` |
| antlion/01 | hungry | `efc04ac7308f8884766115afdca361e90d9561392b0d0e55954beb79823ef8e1` |
| antlion/01 | sick | `7e7f45f34eabf5119308924ff1d09f1a8b0ab026f2fb476b2439d7204bf981bb` |
| antlion/01 | tired | `53d928278ad47d3904ace29d9eb15c25eb3b405c2cda4c81e08bc5302014dadf` |
| antlion/01 | sulky | `955fb86dd10cd2e4f11965a47e63874507b799d175d2e69cbf04ae8d758f85a6` |
| antlion/01 | weak | `af3971b80566edafb7c0abfab3b497f3929c86acb2b1508e9a7d38d3a7a037f1` |
| antlion/01 | critical | `c8398966eaea546ff117d42183efbec95a692ecac7eab690696985aedbf0424d` |
| antlion/01 | wantsPlay | `54114b0e4c73aefa37fbe0ad43c34d06a111431df748bfe06f1cb9d721e8e2b2` |
| antlion/01 | sleeping | `8ea0e265f40436000636f674c990809c37124a341cbfbf54dcec7b6876c52fd6` |
| antlion/02 | normal | `d49e82c215612bb9b4cce853bf5f91ec59bfc052b653d50b703b50f6c559dd1a` |
| antlion/02 | happy | `a5804f98f73ef5325dbc335a94a8b44731ce29ee8f940862f0bad83de6bdb3bd` |
| antlion/02 | strained | `a689968ea4f94a97e8434e0c5d6b670de4f85e29f6b2a219f54e73cbdf8632b8` |
| antlion/02 | hungry | `239e9f8c4fd2c303508ca988c39fabfb1bd1ce200e6181d492233b4a106ab94d` |
| antlion/02 | sick | `3975d849c1c7150373e7c728d579d6370c9b034d1fdcf72774d72b14825cb640` |
| antlion/02 | tired | `e4394a3397a834706999958ef3286388fb8d6d06de36b393c80cd3b0de302ee7` |
| antlion/02 | sulky | `fc67f7f4cb3d6303175d0f9bc380c913076c6079436278822bfa3e9e0a28c5af` |
| antlion/02 | weak | `cf4a9cd7886a16764fcac4db0374e249d6749d90b62b34cf2272cb24d48b9d09` |
| antlion/02 | critical | `dcae29b7190066b1c752dbcc93ae400bd635f2a3eaada3f4535763bcb0cc5aec` |
| antlion/02 | wantsPlay | `018f018021581b59caa64f03ad4c1b36b0c6a4e707aab2b83fa1a309bf601dde` |
| antlion/02 | sleeping | `f8a009dfba51076150b10dab5ffb7d773d731763a354e0900c984818dace927e` |
| antlion/03 | normal | `6da45bbccfc435e09fa147eecec5737b96a8b8d05a7ab671d0f59d705ea685d0` |
| antlion/03 | happy | `9e3329b63aa93399f4ccb247c522b3417bc9301e803d9e47087b4e19e1a94e33` |
| antlion/03 | strained | `5fbabc0626e68db46ce7ca1f2afa81fab3d4b92d29029d79065acae343f13ad7` |
| antlion/03 | hungry | `03b4f39dadced7292adbecf75dd944b02384b2b9005d7071c8a59ad229d467b2` |
| antlion/03 | sick | `a3da2b88e8de02936f27464f5b049989cf369ce3fb5e84fb3c8339d6482be7c8` |
| antlion/03 | tired | `a0bb5de55b7253449ed0b298e104ce35a0c16c0c7ee3b6fbb3085ca0f8bbc36a` |
| antlion/03 | sulky | `6dce12f68f0b7c5362aca49981400a268765249042363d011c0b75fd296572b4` |
| antlion/03 | weak | `7749391e57670b1bbd3abb128f047a85f5f6e8d7f5773ec9f818071c176fb2ed` |
| antlion/03 | critical | `b63cb83f8eb8cfda5eafb34afa2f2c3f68cec6246b3edf91efec2f513ea44995` |
| antlion/03 | wantsPlay | `e44dd4d54e6bf67ee35a765db9635fed1b94bec9215b70200b448f645bf31372` |
| antlion/03 | sleeping | `b65e81ca23efb73d96b7dc2cdb290d2282126c1ded58039d3bffbebe5d82e768` |
| antlion/04 | normal | `a75aa0f43ffcc7303b996e469ca3071496b7a447ae27897cdd3d99c82034ee6e` |
| antlion/04 | happy | `dcf50106b51b2d9c5b72d0e7e0477299bfdae10354e1a1c251b15dddcf188ef2` |
| antlion/04 | strained | `0e064ce2b638c0c7a3d2bb5996c944fad5d72076e5fa2baeb30896c1f1263a43` |
| antlion/04 | hungry | `b2fde86d40ef0848fcc824dca5d4282c0b15d5c0c4d309f83cbccf76ca33c107` |
| antlion/04 | sick | `2984b11c03abab9f847706d3aa1f92925827e026b96e4529f03efdb93419c15b` |
| antlion/04 | tired | `1c7850a5d23f79f69fbac1094538da61f268df00fee931103e00201a7d600b8c` |
| antlion/04 | sulky | `377e84eefc298171a9cfb412b3f3af79786eb3efb0f0f7206a35fd59a06a39c5` |
| antlion/04 | weak | `579eafe7039b2841921ba8f1bfcf39ee7a20f37bd99d04954a028b07d9383440` |
| antlion/04 | critical | `252b1c29574ab5a9e61207882669243e2a3e93ba07b62cc7c6bce58b18763648` |
| antlion/04 | wantsPlay | `076873061f87ffee6a394417106e6dde47cb912c8f236243590e46d751eb7064` |
| antlion/04 | sleeping | `0c304d8ce0b603f13140f67cd53672a4db36c5a26508a30a8f35cc799411279b` |
| antlion/05 | normal | `03da5baf28985f5762afbaa84f6fec0f4ed25868e988ee19412df3e6952888cb` |
| antlion/05 | happy | `0e019d732895852e929c891724c275f141f3295cfc97b9ba173d726e4f8d9eb4` |
| antlion/05 | strained | `2781ba461a671e13f514e16bdf4213247a3a3b09827be0bf1d9e1a8e9d7717fe` |
| antlion/05 | hungry | `8b959f4a6cbce8eabe6527ce3d777bcec7611cfff599305631e94245628c1668` |
| antlion/05 | sick | `6fe73093eb3bb80c110787ad1246450f9825cd7f025ae27ff5f4d36ed56c2a2d` |
| antlion/05 | tired | `95f22d3b8caeb52f5c435248d540dd7f0acc69e6d417361672ef9fb786358f84` |
| antlion/05 | sulky | `1aa0c89f69dc87160e5f4f89811e317af0e36701d7cba5e3c44a6d2dde0bf3a4` |
| antlion/05 | weak | `84c933bfe2ef300f5ebef6d61dae6ea73826dd86bbdf9d01120a97ff10f94ed9` |
| antlion/05 | critical | `0e45b98ddcdb00e8753efd4e16ffd1761b5066576b8f1ffc20588efdf52e4320` |
| antlion/05 | wantsPlay | `c3c04552debd692845b6b7ca1af73ec150c23c978542550567687c07d219e97f` |
| antlion/05 | sleeping | `07afd7cb97f6fba0c8df851249fa9eb7431c81ec6fc6eba984727587922b5822` |
| antlion/06 | normal | `c7522f7d5aed4542e7962e77ea757d2f62a105fb9ba57f7d6c107278addb8616` |
| antlion/06 | happy | `cced764f8d2ba25443586b81e9b2b1e63c8c04a26b53b5689b807e14ac242571` |
| antlion/06 | strained | `e3aee0e825e639455e35e410d9176dd51493a6f3544251736b2e5f6dcb87978f` |
| antlion/06 | hungry | `c818c9a887d1feb65f473d0f3fac3d37c27dc718c8beab2cfc5cb28a986db814` |
| antlion/06 | sick | `9d55066b3e012e7234f611d065c671751e09ee234197833a8003a619f6d01d64` |
| antlion/06 | tired | `46c7ae7c776ab708e9130ba19c73a04292ee9443372117aebe1ef7a5b60ad396` |
| antlion/06 | sulky | `73ef3496447319e2d7aa312a3e7ef4549d99702f75f815a373c906a670f48a56` |
| antlion/06 | weak | `83f73cd516079cc132bfa4b89f8bde1387a2876d1f22fe5a5d1538fdaf0c110e` |
| antlion/06 | critical | `51c5ef4a1ecc8d01fe7d75dc727af9c69399842d1e5e67f7273d6cdfc05230cb` |
| antlion/06 | wantsPlay | `97d555befec803aab1da7367bfc9763e4b0b4cad3fbaec76ce38d82efa47125b` |
| antlion/06 | sleeping | `5c077d4c3e194ff3155773e59bffcd6c10f639a6921b4466ff4fcb00f442350a` |
| antlion/07 | normal | `57f77769ec9d717b94c56086e26b770487357880975e0733232447676aa308e8` |
| antlion/07 | happy | `69bd663919ed692651d4f2a913335d68ac8f495a4046945b77758241410f93e5` |
| antlion/07 | strained | `78bc156654b2c84fd33c35c3c32cb1336063b4ac9ad57bff1e65e2b179832893` |
| antlion/07 | hungry | `7470bc5fced1ca46a1e418c9c0316efffdedbf22116e5b668690eb3c6085ebca` |
| antlion/07 | sick | `731bcbca4f0c80976fa15a7fe602446e1bd20a64369c3f8158db0ca1fa59275d` |
| antlion/07 | tired | `c9636d0a70987329065105fbcb8f94d1007cae0991a03accfdc86c3fbe88970e` |
| antlion/07 | sulky | `87a6769f663c955206190e7d001caead1817e09b4209d67ecdaf3df2cfe6c6da` |
| antlion/07 | weak | `86a3575f1fd5b79572f9477ed49e20f8ec7cdbf394554db3cac67ade05f249ba` |
| antlion/07 | critical | `178dfeb38b105f7b4a971dfde65a6eab2f26746cff9d04cb5d532ddd6eb228a2` |
| antlion/07 | wantsPlay | `6080721cfaafd2b67af5c38c2dbd8c77f176a718c9f28d8ebd3db43bcab98733` |
| antlion/07 | sleeping | `9545aac8d78eb981aaf2681538de95baff9074aa29ba13ec1998166ac1e080d5` |
| antlion/08 | normal | `2f6879f36f91bf27b7f4be12a74ca5684d969a067977ec552787ea70d2e23dbe` |
| antlion/08 | happy | `878f955ecb746d5abba70f09aa2b8b9dd83fd0e7498219d43ce5bcce385929dc` |
| antlion/08 | strained | `c273ea4d4b5dec8dd6af057fad4eb8531457caf79f81ae98a7e74a5cd50dbb93` |
| antlion/08 | hungry | `c46ec2c85aa3a015add0f1df48143b7f767a0fbbd6974dd30f14f73b40566ddb` |
| antlion/08 | sick | `f683b400f7aad4b1bcebe6baf15a3f744d4acaa0e82070f34b53a7bc89c45b5d` |
| antlion/08 | tired | `add7d80535d38dd47c29685f1d2436cc91428461f783e06d3c30c70d80876c72` |
| antlion/08 | sulky | `46a44449c3d730b50831adf8b433da4bdf2665a262fa1b506b6d213db2d2cfd2` |
| antlion/08 | weak | `83524a495690d07a2e20ed7cb47d75e60dad4c457b2b20457041ab038a243630` |
| antlion/08 | critical | `3c4cbd9b52287bf00b313193098f3884525fe142e0645008cf8e8263340d965e` |
| antlion/08 | wantsPlay | `570ab10e05d0e99109ad147964f77bb2808e6af62dec4949de158bde672bb11b` |
| antlion/08 | sleeping | `50c93a8ac621cdca5a8e92b4d99cbedb37398a98055b5a416f8b2a08e926aac2` |
| ren/01 | normal | `e07a378e94a9585b5c78a851d404d4f3696c94fa5e2caa3ab6e9cbca01b7f4a3` |
| ren/01 | happy | `597c2e9ebc99aa95974834965b0c5a699dd4867a57285d8d8604a484ee345a9b` |
| ren/01 | strained | `3f6db2ed704ac2b48162f6ca8a087191bb828a3f9aa2b352b78b4f3d39d553a6` |
| ren/01 | hungry | `31d6de14886088d0c8ebc5794d40121b125208ccc4951abe44bb08e8ada8e520` |
| ren/01 | sick | `cc3898ab45e0e96944ae75e0cd5d0b6d4f06821658151cf203a4ea8d2aefddb4` |
| ren/01 | tired | `d4785c515e1cd42cc1e500ca7a57bdb78f1af5749f047c9d95c53cf57db1d907` |
| ren/01 | sulky | `12f98c52f25907d91d323dcbb90e8ffd38058a788b34b3080a63ace08fbf5c2b` |
| ren/01 | weak | `93f615a59229d0e52ba16c834735306b18a6790237bdd412d9275b70b90fa5f4` |
| ren/01 | critical | `5c430c7fd2a759b19309bd5aa6bd408fae5bba93992bc25ce76e3dffc017d8f5` |
| ren/01 | wantsPlay | `4ee642dc9d313ec3d4bb3f8f35f3ebbf8f0eab4b092fe91ef9411e9830a6e266` |
| ren/01 | sleeping | `a1f587f86570a661d6b015f1b6d104e0a5e3fd34a464d329c42c0c4ea3e6c13a` |
| ren/02 | normal | `740acd3acb83f1b14fac9b7d44d42c7df9b7c0c96a8551cd26f634264b717f32` |
| ren/02 | happy | `2ffdda61b5b255a2211e17f72ae5a03f101a8146255fbf4e2c7d9bf50be59b69` |
| ren/02 | strained | `f59e6a07f02cccc7fb5caaff85ca3faa36a7d4ef51a473934838a93839c58342` |
| ren/02 | hungry | `773bab64a1e8e84b972a47237aad35c2de9d965129d4eb0f3e36c705243aa9dc` |
| ren/02 | sick | `b55d0362acddd9fe07ef9e84b93311c6dd2dbb932297dff07f33b4885b58020d` |
| ren/02 | tired | `c6111e04b3af79d48ca1281d2c41a4c07150901a80a8a818ce1e90dcf4e3e85b` |
| ren/02 | sulky | `be799bfe15de816c2fb9a9730a61923e790a4557fe5d5a21c293e802160edc32` |
| ren/02 | weak | `ac121481ab1c0ae4ad624ed4e3a96c82c6a1485b8f6a28ff4e90c48462bfcf70` |
| ren/02 | critical | `27afd5667fea1bd0bbe9d7ba44c67be131d4bab925410319e73a43cf4f309272` |
| ren/02 | wantsPlay | `ee509517bd9d1c69edc60755650dba0f14071e361116d07ea65f030393ca2fc9` |
| ren/02 | sleeping | `98f8318c6df5629adf0e665c7a088caf3898ce9e1619ab7a3b6bbad5fdc25a42` |
| ren/03 | normal | `acd8296c2d73645ba6c53b106169ecc6dea7e0b66aa09d96d0a033faec84437d` |
| ren/03 | happy | `4cc1932596bca5dabe3b876a22a561af894427e19abf62ef1c229da1ac8ef47e` |
| ren/03 | strained | `b5eee3937f60b7896b87663fc0330917f0f00e58060767f447d411a7d6525268` |
| ren/03 | hungry | `3b0cc8e22de1787547fcf37ddc541e8d3ffb41d54fcd3eedc1af0c225e589289` |
| ren/03 | sick | `f407b05a9bbd48075671782166ad93581c7b93b27ca41241a8b5757198afdf70` |
| ren/03 | tired | `bd3de7360b4cc19f253d60eec870c9e91f2fc912d428b9afb47ffa6c771eb49f` |
| ren/03 | sulky | `0fe0e9d5512e17bc922f8cf691f949f104d19767cff0fc02a5d0522feb9685a7` |
| ren/03 | weak | `86426236aa8d45a51c78d93eae1c307fb09c13108592fd2f43115fb14bcf3e62` |
| ren/03 | critical | `87fe5d9223aed8ad8498c87c70fd6e87eb1e2b39117646ed34b9c6b9a827b7f3` |
| ren/03 | wantsPlay | `7bd5a6ba2a655ed11c7c1d384bc2a0f402482e311a070b0f0099b5190d66e380` |
| ren/03 | sleeping | `b151fa41208b60b61e829908b04e668965d2a2f20480a3a8c2d23207512889d9` |
| ren/04 | normal | `213482e4ec64158680e40e3e23887dcf16a56931bad5b8d232bb2e2c97632ced` |
| ren/04 | happy | `7d521bd51dc7554301f6ee2f54887dbb480c7fa4aee96e608740db8b82cbab2c` |
| ren/04 | strained | `582a7bebdaccb470e4afb2543bac3fb4b71b7c4da85ba9ac938f0b5ad99fdc28` |
| ren/04 | hungry | `5e8b4a7cb6a9d4b8c6fed6fc2a77b672d01da807418fd7202bb47045be0761d6` |
| ren/04 | sick | `2689d82264692d583e36aef67070e7579a0bbc1f9f761626e334df9fe86dd27f` |
| ren/04 | tired | `6e7ccd87089756377073bb1258a273cab565ffef74cbdc8fc4bb570991037dd3` |
| ren/04 | sulky | `623b58ffbf14efdcfe4ccfb10fb050707834ed9950a99e5ab09fd0aca1eb09ac` |
| ren/04 | weak | `b2c67887a603de7dfe365cbfa21e61ea07447628a2e455fb85eac73d92cc6d96` |
| ren/04 | critical | `9df9c495b10ea31c6bfb3b03239bcee5b0ec0695b66723f523a8a25455b1d40a` |
| ren/04 | wantsPlay | `b5bb62311d8501d08aaaa6e3dac5670d6a08c77666bc222813b973e20a0b3dba` |
| ren/04 | sleeping | `f28d1bf606fab71368b154ef63b643595aaf7f14f19870288d5db37991940223` |
| ren/05 | normal | `4973f31b725f6accb93392c18bd72bc61462a0c061905379f60d744406fa82a5` |
| ren/05 | happy | `995c88a1e41dfea5b03c3ac0eaa61e45ab22d46515e0600c902c98b1ab75945b` |
| ren/05 | strained | `8a7275973afd4f3c2f664f5454d328cd4bd69634dbbfdbf25e6a55911f3b6bb6` |
| ren/05 | hungry | `75f8af883484a241b2d1aa632dd425e68f87b08960b1a2510d53a0bd626d3486` |
| ren/05 | sick | `0ac0fc2f8669d042186abbaab49827518e13867d8b88b13b06921fe2f4d1ef30` |
| ren/05 | tired | `ed0f0641d5470bdfde1c1ce82aa02700dcda07ebbcd3393ba4fc6ff16ed6b55f` |
| ren/05 | sulky | `7a28ffbc555eee4aa000910a2586248c1fc96ee19ddacfe0799442e9872974d4` |
| ren/05 | weak | `bd15a26fdcac9f043eb952bb859574ff05b23fcefb75369cd0afac9713604868` |
| ren/05 | critical | `35a0fd5e5ddd34475f5d78bdc9c503c9728a443374e1005ea50b3b8f59d4c855` |
| ren/05 | wantsPlay | `f346ba36083f01caa9c666eeb4fa5a44f5f3397ac39347954e856594ffd04736` |
| ren/05 | sleeping | `4e1f059c0ff4030d0c745b6ae8c932debe2f06a96ea27595fb3696669a55b95d` |
| ren/06 | normal | `d6e1ea3964be21f3d3aac74dace8fd7b7b65131d1842cdb3753249aa2b95c06d` |
| ren/06 | happy | `868f7541b738b2f455cb7b57e0b344122e234a5dc8b04ca3c123ef35eb5d555a` |
| ren/06 | strained | `35384e09c5d50fd91ffa60899474480df6750d4f494bac3b08ba03683f662821` |
| ren/06 | hungry | `4a68c826eef1cfb36ce3727617e69354c59522320e8a1c7a25544cf6617a9e4a` |
| ren/06 | sick | `d133e90cf217715747c28f77b485095dfb040eca277a51431e6df09c9627d5aa` |
| ren/06 | tired | `f23dfeb287906cbdb060f4cf4310fec9a98dfe3b2916469c5fe2019d0f3a14a1` |
| ren/06 | sulky | `cee28d961be251adf87f5f82e470681948dbeea7abff8891176b6ab3292095b2` |
| ren/06 | weak | `1fd358556124a46224142d14ee00c091b86a241500127242326113ae968ba031` |
| ren/06 | critical | `5cb289a15dbfce21e42116c7ca794812c0748b920ad103db2a7d92d289731d26` |
| ren/06 | wantsPlay | `80430ff1d0fdc4909d55a1daf6ac5b2c5f4f1f5d2031951e98eda57fbdf4ef59` |
| ren/06 | sleeping | `8d4c798701f279ddf1a68671c921470e52fb17e5dd3ad8b717bfcff1e5dd426c` |
| ren/07 | normal | `230c5ea34abc1fc59539fe2cbabf82baaf4fc83da25c317b8c04d544a0125f9e` |
| ren/07 | happy | `8012577e9a0a7f6fb201bccfd025fe9dfef3e4bc05285f64c17d10dca0d75579` |
| ren/07 | strained | `ed03a7bc64c921d762334cb718a9504d2fb37ccb245c96a5279d3be9c6c6103f` |
| ren/07 | hungry | `6f9af5990766f3a1c44e579aeb85a1606e61adb6b8129d08a14a47541ab535cf` |
| ren/07 | sick | `0414f12fd102f4ba208864cffa8eb6438938e4a2c67bd6de0cee6217f5d6c2eb` |
| ren/07 | tired | `4ecb2b8058f031f8e4312dda739b25259bf622e9a655ec144790a99fa54b5d56` |
| ren/07 | sulky | `46dbcca57b417a27a40ee5640a2511942d9e10766aca5ba3e6b5c5c2154dba7f` |
| ren/07 | weak | `908f30f413fa83f5f1ed7663c1e4e1950b7e5bbc74066a0ef577bfffb50b6084` |
| ren/07 | critical | `041c027e0b92f699c6ece3da9ee204776677eb6b61b39b896909794a2454a49a` |
| ren/07 | wantsPlay | `8df260a23721066e795ce60175889fab3ff30b4d0b32a4b99aefa0200bbb66f4` |
| ren/07 | sleeping | `9285409be2a11fdc805c6f786d412b870e702dd2e0ec7a54cb0267be644a48b9` |
| ren/08 | normal | `1ecc32b88c19a55a02c3f8d59aa750f57dcdd49e70290a94aa79f29fd83c39b2` |
| ren/08 | happy | `8d96618f805da91eff8373ab1573611f1bdb3ba7ab7a5acddcd3b45bb0067f25` |
| ren/08 | strained | `80d894be5267c38a1180606deba801a55489261cbf17cbdc722c27237844b493` |
| ren/08 | hungry | `825ca24102a5ce185b9b12d3f375a359f66ab42315ffc7000bee55e3c12846ed` |
| ren/08 | sick | `e3cfc9b62296adb5e2f07e9fd7a97c5c8293ff9e3d9a3605ceb0de0112598854` |
| ren/08 | tired | `6b2616ec6c1c57440f08f8935b0b4710a764350fd70e024ef419ac5c05129c63` |
| ren/08 | sulky | `75c753e58389b0c8c3888b331dad934e17923bbc77112802cde103d0d3cb92c7` |
| ren/08 | weak | `96a70e48e53e2fc3b3159d6bc291684fbd8a2aeca71627911beffb0cf02909db` |
| ren/08 | critical | `dc369dd1413257f91acfa97dd5779ff57ee3e492193ff197e354b114f4d3a9a2` |
| ren/08 | wantsPlay | `cee9d189122998303b53bc75497c3da09315501d00df8ba9739207d214f9b83a` |
| ren/08 | sleeping | `6f4dc2cd611e30754de6d7fe8ee6404f62e952ac8a89215e60681dae43dd1526` |

### 表示した比較シートのSHA-256

| シート | SHA-256 |
|---|---|
| antlion-01.png | `217db8f61b491667b764fceb514c8332e20eec819ba2ab9a594c691d095130f6` |
| antlion-02-face.png | `c7ce9bd2124c9dfe69530da237d45bd01978bd9e60110d3e934e93afba9e7f6e` |
| antlion-02.png | `bb1d8ce424f2c60fda8fcfe888f60701a0226c6db71be017991194d97ffda37f` |
| antlion-03.png | `5aa3b26c862caee42080c00948359eee5c206b03b570ecfce6c787b3e6c8965f` |
| antlion-04.png | `d02b64a79c6577d4d8ea7a64ca424ae0d615dbe331dc41c29a3c38c648858598` |
| antlion-05.png | `f6d0a4059b66e66b7822a3e68e711c9b8b7e7a9950bd748a7d9578fe22772af5` |
| antlion-06-face.png | `83ca9c15ce64d54f364ca82a5f6cd686ec3f08575fa04b4b2ac24e97d43f4fc5` |
| antlion-06.png | `ecc3bbe79120b9018a06a9a2dcbd927bc71487523d3600d925dbc192bdd2c395` |
| antlion-07-full.png | `87f7faf25007251f122d0c43778b6ac321fe589eba2390dba2e80428d400158a` |
| antlion-07.png | `be8e0f71968b538ac9d2b920e68aa5d481b82bae53225b600700eacc267dceb6` |
| antlion-08-full.png | `372536c10b1398ba09cd6006a62ce1c32e63e3d08c45444e3a9aad5ddf840d8d` |
| antlion-08.png | `e254c7772ce53c5498f286ebf9822d28b1fa4a13c5d99afdab0b9d5427e3867d` |
| beetle-01.png | `d75ef0e5f450cdc21c10416e28d5b90f986e807311e4acd000d1fdbc22a04fc8` |
| beetle-02.png | `0ffdab7914de0e6e30cfea201ee8b75bc1b823268e5d6e23f4e9e73685a663ec` |
| beetle-03.png | `180077a1e48d3fc53a22a05fd1f388815bdbade6cb4f7bcd62c834cb55051023` |
| beetle-04.png | `cde2df80ebccd6e9b85c3a304493f05c6a1293b3ca9ee82adbd7500a2ea42a4f` |
| beetle-05.png | `104935b2854abe3c77b515a2b69dc9b8dd64f0dbbd8d47d72a182fccc36d51f4` |
| beetle-06.png | `06a1b9bb283da8c60c17b0f63996eb64347927100bdc104150d0335c3a434f93` |
| beetle-07.png | `849cd8ec0f601c83f6f685e3bf45803e866ad80c9d1f28b9e483ad08d9321f85` |
| beetle-08.png | `4010b40841005ea1becad1bc633a6d6b2cee266f99ce51300f2248dd9e3e47a8` |
| butterfly-01.png | `c2a964cb7e05fe149cdf41f8348d0234b62d35845a39d39ada7bef3291938ea4` |
| butterfly-02.png | `5d5385012e00f4841b97387efcd2d41a787555fca5829bc221224b2afcbbee17` |
| butterfly-03.png | `9760dc851e263bc684f74c4ebf7a894ca545e93554c8a72b37a51672e176c775` |
| butterfly-04.png | `cb741ff4e66fe990922f23de84c7c37fa4faaab7094b775ac39f9316ee16c91e` |
| butterfly-05.png | `6bbf1ca512ce68ca47124636ff3d477948f83215f8f822092e9f7a196dff24d6` |
| butterfly-06.png | `2e77de829d5117f8cb01b752455921bf768e167daa98d7d2414c100a363e8946` |
| butterfly-07.png | `493c55498781556e416004a48e7a9bb90b7c27ac9741e8b93b675b35de24b0c4` |
| butterfly-08.png | `5ce8b24b2fd081e79cd001c5ebff11e4f336983d9860967ef4ced194479e4f16` |
| cicada-01.png | `cc4d58d5cbe269c3e4248cc00586206b01520584c03852b61840826e63f42b60` |
| cicada-02.png | `1fbd93b2f05fc59d030ca2e97586eea584a98c9f178eb6fab5eb55d640557420` |
| cicada-03.png | `0df9380e71c9a01c3949252ad5a34a11eff69a221b3949b46b1cae8a4e21e6e6` |
| cicada-04.png | `c27756168680f6e215161fc3261e396d7fe62b0407c5e5e1e9392fef291dd440` |
| cicada-05.png | `0cd23e8fee76804d92dc71455243baed4fe2855e16cbd5606eea9d3fbddceab6` |
| cicada-06.png | `4e9d3a8b917f4cc83a2e6a6a19919c6c54af1a7cd3ea850e0c4ee104d144960f` |
| cicada-07.png | `9662ee4b773e18ba5f6fb23a87996a425cdb8db3aa2e37adaccce2fb43ce6ec6` |
| cicada-08.png | `71c49202d5e4e286e5efa8018490560dd3ad77ac68961010fe5dcbb895a561eb` |
| ren-01-face.png | `28a4ee60e788778961cf1f0f0681ad0bbf6bb8fd76346773107a06640dba71cd` |
| ren-01.png | `5fabffb1b0479fd6723167f695befc6de68058a7880f8b07116f74eb5643f9e4` |
| ren-02.png | `4928eb0b0d7ef0163b3097607383f265288c0017cc7f291e68337987b3e63369` |
| ren-03-full.png | `8587511df68d9104fb818550811018875cb654d43678f0d796949fac8174a54e` |
| ren-03.png | `2ab3535b069686c6e6613d0698cd01a9de7f7cb7627456f7228c1e73b34cfadd` |
| ren-04.png | `1bd614c08e38fc708bfa41730705d52a3dc1149d5b99a52660c8a1c95634e83f` |
| ren-05.png | `d11628ec8a36fdf41a2ffceb41aa4ff5b4f894f2ab671c52cbf01c143a03a571` |
| ren-06.png | `3db24bf05d24f4ec5421b4c2f9c51aa38c4e61463a6de4ee5781948b55df6909` |
| ren-07.png | `72b831a3efbabc51ad78556d411f4edbfc245d052ad475e5886e342f3e7b6cba` |
| ren-08.png | `2e272257f848125b237d872f3d09a33ce279d89c34c5bd8a83515f569f8ed202` |
| stagbeetle-01.png | `aa9599853f83e4334243bc1aeb309c57c6562b8cf7c315d2025b51ce6c32943b` |
| stagbeetle-02.png | `a807cb0d655a5b2615372b7c25517f6933e23e56bff94ef27a15a650e0e60fe5` |
| stagbeetle-03.png | `6bc29c4138b2ccf24d49dc525a489e896ca07e92e8ae7dcc634773e7482cfe7f` |
| stagbeetle-04.png | `2aaddf16402e40afd5abaa43ad588e1d1d010c490fadc9cee3dbc55ee13bbded` |
| stagbeetle-05.png | `9e14ec5d213abf6140356934b12c42e7d8344927169bc5986d5bfa41a531cd56` |
| stagbeetle-06-face.png | `90b6acb196ddffda0eaeb9f2d1242476fcf8ebd0b2cf005d5df9a6c8c3b3e056` |
| stagbeetle-06.png | `865d8e9d8cab8ca470ed9cdac026d2d58190e45c72074f4baa911f483197b1e0` |
| stagbeetle-07.png | `7eb378d04e0f12efbb7aa0351ce6c96b89a635d10b896e5488b959c1972dedec` |
| stagbeetle-08.png | `a97ddaac3bc9871335374b0c25ea4acf6716a0730c37d4cbf1a903ad3e4b39ed` |
