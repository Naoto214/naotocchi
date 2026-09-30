# Final cross audit — water lines — 2026-09-23

独立担当による現在画像の再監査。過去のPASSを採用するだけの再記録ではない。対象は frog / clownfish / salmon / hermit_crab / jellyfish / starfish の各8段階×10表情、計480 PNGと48通常原画像。

## 対象固定と方法

親担当から伝達されたGitHub HEADは `a2eb319893caca94467f474e2bf17a152d67d0fc`。本担当がローカル `git rev-parse HEAD^{tree}` で確認したtreeは `d0399d249c82dd74159fdd8ac592e0d1bd405204`。remote自体の再取得は本担当では行っていない。

正本 `docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md` のマーク方位・各対象系統・現行A/B/C規則、確定色の `emotion-visual-approved-baseline-20260915.md`、各対象系統QAと `three-class-expressions-20260922-review.md` を読んだ。

現checkoutの `tools/expression-contact-sheet.cjs` / `buildSheet` が出力した10状態のproduction PNG/SVG/CSS合成を、**内容と各セル内相対座標を維持したまま**4列へ並べ直し、同じ段階の通常PNGを先頭セルへ追加した48シートを作った。全48シートを画像表示し全480セルと48通常を直接比較した。各合成spriteは104論理pxの2倍、シート1424×1110。通常セルはfloor補正しない原画なのでセル間の上下位置は比較基準ではない。合成セル間の配置だけを評価した。

小顔を精査するため、salmon全8、hermit_crab全8、jellyfish03、starfish08はマークなしPNG＋通常の3倍nearest-neighborシート（各1536×1248）も全て画像表示し、180状態を追加確認した。補助ファイルは `/workspace/scratch/768fc4e0e9ad/audit-water/`。シートの新規合成以外に、生成・画像修正・コード修正・追加キャラクター制作を行っていない。

## 結論

**480/480の状態意味と48段階の主な個性/身体構造を実見。状態意味、別個体への誤同期、増えた顔、取り違えたマーク色/左右について必須修正は0。** 装飾保持に2件の具体的な差を発見したため「原画の小意匠まで完全同一」とは認定しない。D1は明示的な泡保持に対する軽微な修正候補、D2は小粒装飾の生成差。どちらも画像を変更せず親監査へ報告した。

- D1: **starfish08 全10状態**。元画像には泡5個（左右上下の4個＋右下の極小泡）があるが、全10表情は大きい4泡で、右下極小泡がない。`starfish`制作指示の「all original bubbles」と厳密には不一致。**小物保持を厳密に満たすための修正候補（低い優先度、10PNG）**であり、状態/生体数の障害ではない。既存QAが許容しているgenerative variationの範囲に入れるかは総合監査で明示的に判断すべきで、無条件PASSへ隠さない。
- D2: **jellyfish03 全10状態**。元の小円泡の一部が菱形/十字の光点へ変わり、小光点が増減する。happy/strained/weakでは右上大泡の下などに小光点が増える。主放射形・顔・大きい泡群は保持。**許容できる装飾の生成差**と判断し必須修正に数えない。金色happyマークの焼込みではなく青い意匠で、全状態に現れる。
- 顔が小さいsalmon01–08、および眼柄のhermit_crab01–08は、sick/tired/weak/criticalのPNGのみでの差が小さい。3倍表示で半眼/閉眼/口差を確認し、合成の異なるマークと合わせて意味が整合する。**許容差**。表情の強さを一律に大きくする理由にはしない。
- sickの汗はfrog01–04・clownfish全段階・salmon全段階・hermit_crab全段階で、長い尾/ヒレ/殻の外側へ広がる。またclownfish03/04/06/07、starfish02/03/05/06/07では顔より上へ寄る。現静止合成に明白な身体重なりはない。顔に密着しない距離は**既存に記録された許容差**であり、理想的と断定しない。

## 共通状態とマークの実見結果

全480合成で、happy金キラキラ/上右、strained銀折線/上左、hungry黄食物＋思考泡/上右、sick黄緑線/上右＋左右汗、tired紫丸/上右、sulky水色雲/上右、weak桃矢印/上右、critical赤太矢印/上右、wantsPlay橙線/顔の上、sleeping青Zzz/上右を確認した。上右は顔の中心に対して判断し、背ビレ/殻/腕/泡を避けるため横寄り/上寄りの差がある。色は表示上の判定で、校正済み色測定ではない。食物はfrogの虫、clownfishの粒餌、残り4系統の魚。別個体や構成部分ごとの余分な汗/状態マークを認めなかった。

全段階でhappyは明るい笑み、strainedは拒否/緊張、hungryは求める目口、sickは苦しい顔、tiredは重い目、sulkyは不機嫌、weak/criticalは弱い目口、wantsPlayは呼びかけ、sleepingは閉眼を確認。弱りと危険の差が小さくても意味が逆転するものは認めなかった。

## 8段階ごとの証跡と所見

各行の「10/10」は `happy, strained, hungry, sick, tired, sulky, weak, critical, wantsPlay, sleeping` 全てを画像表示して判断したという意味。無欠点やpixel完全保持という意味ではない。通常も各行で直接比較した。単顔は現行3分類に新分類を足す記号ではなく、複数構成員への同期判定を要しないという注記。

| 系統/段階 | 表示済み | 構成 | 具体的所見 |
|---|---:|---|---|
| frog01 | 10/10 | 単顔 | 丸い頭と短い尾。小さな目口でも喜び/拒否/空腹/睡眠を読み分ける。 |
| frog02 | 10/10 | 単顔 | 長い尾を保持。疲労は半眼、睡眠は閉眼。右汗は尾の外側。 |
| frog03 | 10/10 | 単顔 | 出始めた後脚と長い尾を保持。弱り/危険で手足を消していない。 |
| frog04 | 10/10 | 単顔 | 前後脚＋残る尾を保持。sickはうつむいた眉、wantsPlayは見開き。 |
| frog05 | 10/10 | 単顔 | 短い尾の幼体。元の片目ウィンクを状態に応じ両眼へ変更、構造は保持。 |
| frog06 | 10/10 | 単顔 | 突出した左右眼は一つの顔。両眼の状態が整合し、跳ねる肢の形を保持。 |
| frog07 | 10/10 | 単顔 | 正面の大きな座り姿。弱りと不機嫌の眉/口差、閉眼寝顔を確認。 |
| frog08 | 10/10 | 単顔 | 老齢の斑点とくすみ、丸い姿を保持。元が笑い目でも状態別の顔を読める。 |
| clownfish01 | 10/10 | 単顔 | 淡い橙の稚魚。ヒレ/尾を保持。小さな顔は補助マーク込みで明瞭。 |
| clownfish02 | 10/10 | 単顔 | 縞の少ない幼魚。happy開口、strainedすぼめ顔、sleeping閉眼。 |
| clownfish03 | 10/10 | 単顔 | 白黒帯が出る姿。sickの汗は背ビレ回避で顔より上方。 |
| clownfish04 | 10/10 | 単顔 | 白黒帯と大きい背ビレを保持。不機嫌は眼の角度、疲労は重い瞼。 |
| clownfish05 | 10/10 | C：主魚＋小魚2 | C。主魚1＋小魚2の3身体を全10状態で確認。小魚は主魚の不調に強制同期せず、寝る主魚の周囲でも穏やかな開眼。 |
| clownfish06 | 10/10 | 単顔 | 細長い成魚。金/黄/青系マークと背ビレに明白な重なりなし。 |
| clownfish07 | 10/10 | 単顔 | 厚い体と大きいヒレ。弱り/危険の口が控えめで、喜びと混同しない。 |
| clownfish08 | 10/10 | 単顔 | 年齢段階の丸い体を保持。寝顔は閉眼微笑、拒否は絞った目口。 |
| salmon01 | 10/10 | 単顔 | 橙の卵黄嚢と灰色尾を全10で保持。顔の差は小さいが閉眼/開口の意味は整合。 |
| salmon02 | 10/10 | 単顔 | 橙の幼魚とヒレを保持。疲労/弱りは細い眼、sleepingは閉眼。 |
| salmon03 | 10/10 | 単顔 | パーマークの縞を保持。弱り/危険の眼が小さく、通常との差は控えめ。 |
| salmon04 | 10/10 | 単顔 | 銀色へ成長する姿と鱗/ヒレを保持。半眼・しかめ眼・閉眼を3倍PNGでも確認。 |
| salmon05 | 10/10 | 単顔 | 銀色のやや大きな魚。sick/tired/weakの差は微妙だが、明るい状態への逆転なし。 |
| salmon06 | 10/10 | 単顔 | 銀色成魚。病気は伏せ眉、sulkyは斜め目、睡眠は閉眼。 |
| salmon07 | 10/10 | 単顔 | 赤い体、緑金の頭とヒレ。tired等で輪郭/鱗に生成差。睡眠は瞳のない閉眼、危険は半眼。 |
| salmon08 | 10/10 | 単顔 | 茶色の老魚、曲がった顎を保持。happyの開口とsleeping閉眼を確認。 |
| hermit_crab01 | 10/10 | 単顔 | 短い殻と小さな眼柄。目は眼柄先端の二つだけ。happyは目より口の笑みで読ませる。 |
| hermit_crab02 | 10/10 | 単顔 | 長い淡色螺旋殻。全状態で鋏と眼柄を保持、顔下部に追加眼なし。 |
| hermit_crab03 | 10/10 | 単顔＋空殻 | 大きい殻＋左下の空殻。空殻に顔を足さず、別個体へ分類しない。happy/strained含め眼柄先端だけが眼。 |
| hermit_crab04 | 10/10 | 単顔 | 桃色模様の殻と赤い脚。sick/weakで鋏を失わず、閉眼の睡眠。 |
| hermit_crab05 | 10/10 | 単顔 | 淡い青緑帯の殻。二本の眼柄で状態を共有。下部に余分な眼なし。 |
| hermit_crab06 | 10/10 | 単顔 | 濃い青緑殻と黄色模様。喜び/拒否は眼柄先端、睡眠も両端を閉じる。 |
| hermit_crab07 | 10/10 | 単顔 | 青白帯の殻。sleepingの白い眼球部内はU字閉眼線で、開いた瞳ではない（3倍で確認）。 |
| hermit_crab08 | 10/10 | 単顔 | 苔のある大きな殻、赤い鋏を保持。sick/tired/weakの差は小さいが状態の矛盾なし。 |
| jellyfish01 | 10/10 | 単顔 | 岩に付くポリプと枝状触手を保持。上の泡は装飾。単一顔で全状態整合。 |
| jellyfish02 | 10/10 | A：接続身体、顔1 | 接続した一身体(A構造)、頭の顔1＋下の顔なし青い段4。段や泡へ新しい顔なし。 |
| jellyfish03 | 10/10 | 単顔 | エフィラの放射形/単一顔を保持。泡/小光点の形と数に後述D2の意匠差。 |
| jellyfish04 | 10/10 | 単顔 | 青紫の傘、垂れる触手と泡を保持。怒り/疲れ/睡眠を眉/瞼で区別。 |
| jellyfish05 | 10/10 | 単顔 | 長くなった触手と青い傘。病気/疲労/弱りは控えめ、睡眠は穏やかな閉眼。 |
| jellyfish06 | 10/10 | 単顔 | 中央の桃色触手と外周の青触手を保持。元から半眼だがhappy/wantsPlayは明るい。 |
| jellyfish07 | 10/10 | 単顔 | 多い細触手と右寄りの顔。主顔のみ、触手/泡に生体の顔を足さない。 |
| jellyfish08 | 10/10 | 単顔 | 淡く光る傘と桃色の中心を保持。危険でも泡/光/触手を残し、死滅表現にしない。 |
| starfish01 | 10/10 | 単顔 | 丸い青い幼体とハイライトを保持。全10の目眉口が明瞭。 |
| starfish02 | 10/10 | 単顔 | 淡い青の五腕。sick汗は腕先を避けて上へ出る。睡眠も五腕を維持。 |
| starfish03 | 10/10 | 単顔 | 黄桃色の五腕と斑点。拒否/不機嫌と弱りの眼の向きを確認。 |
| starfish04 | 10/10 | 単顔 | 曲がった左上腕の桃色姿を保持。10状態とも新たな顔/腕なし。 |
| starfish05 | 10/10 | 単顔 | 金色の五腕。元のウィンクを状態に応じ変え、体の輝きは不調でも保持。 |
| starfish06 | 10/10 | 単顔 | 反り上がる左右腕と黄色い粒模様。粒を眼や別個体にしていない。 |
| starfish07 | 10/10 | 単顔 | 細長い桃橙色の五腕。単一顔の不調/睡眠と呼びかけが整合。 |
| starfish08 | 10/10 | 単顔 | 赤金の粒模様の五腕は保持。全10で元の右下極小泡がなく、後述D1として記録。 |

## 未確認の限界

これは静止したproduction-data合成の監査で、実機スクリーンショットではない。汗はbuildSheet既存の中間位置/回転の近似で、落下全フレーム、端末幅、背景、実行時切替、iPhoneでの見え方を直接検証していない。全体テスト/CI/remote公開版一致は本担当の範囲外。自動配置のゼロ衝突をこの目視から証明するものではない。PNG全画像は見たが、全てを個別ファイルとして一枚ずつ開いたという主張ではなく、読める大きさの段階シートで全件表示した。補助用に生成した他のrawシートのうち、上の追加確認18段階以外は表示していない。

## SHA-256記録

以下は本監査時点で実ファイルから計算したhash。通常48＋表情480＝528PNGを全て列挙する。表情順は前記10状態。PNG出力が後から変わった場合、この目視判定を自動継承しない。

| ファイル | SHA-256 |
|---|---|
| `assets/characters/frog/01.png` | `db197004b609bb0f93f273135968de0deff0d6993b02ee94dbd3eb010147ff7f` |
| `assets/characters/expressions/frog/01-happy.png` | `e88fb035800bc33498c430313924a4baa557fe8f02e586ec33e55b29c2ca9ca0` |
| `assets/characters/expressions/frog/01-strained.png` | `3fc7fbdc2dabda8d92c5c4336d19c2b06d81e57cd62fbb7f604bebd009e4f7c0` |
| `assets/characters/expressions/frog/01-hungry.png` | `2a1d3a0b4c945872a42f38593e31e07f32de6535dbf75f26b5e4f438ac9c7049` |
| `assets/characters/expressions/frog/01-sick.png` | `5bd81f6e3a6cdd8a9f299b2c62716ae287a8d5e6f1dede1cdaf017a3274e031b` |
| `assets/characters/expressions/frog/01-tired.png` | `532ae67b1050310530276434613296152eb3236b89b48326ea3b53a78496e72f` |
| `assets/characters/expressions/frog/01-sulky.png` | `21a3cfe5c15a6ea1c677deeeb17dd52fef7ab7626f399bbb6632501c97974ff0` |
| `assets/characters/expressions/frog/01-weak.png` | `8ec1f8562a4853cd0d7b76330a26fedd573ca25c7ddf702edb21f493333f1783` |
| `assets/characters/expressions/frog/01-critical.png` | `d74b36bbec88b781ae5648782d5c235b56ccdf4d59c795361986523207578b41` |
| `assets/characters/expressions/frog/01-wantsPlay.png` | `93749aa67c9ab217d886163d5ceb3f982ea684571e107aa42d1ba1816b62a043` |
| `assets/characters/expressions/frog/01-sleeping.png` | `c3796ae564dc0dbbf8c337a704981e2afa66af6f51951123bf165ef58e290493` |
| `assets/characters/frog/02.png` | `af8c08619432eb34e8f8a3fb1213e13bb17582b3e1734ba6692101833dc96952` |
| `assets/characters/expressions/frog/02-happy.png` | `16a466e2821077308b6f2e0b74b3e305e7f4448839081685fec7ec29967921e4` |
| `assets/characters/expressions/frog/02-strained.png` | `2fded3ce54b0f26525cf99ba91dd3a9389c013450c6182cfe819ca95a7fcd549` |
| `assets/characters/expressions/frog/02-hungry.png` | `e2ece8af1af07a6a761236fa047f5bcd33309ef82d00eab6c6fa64f28695e3f4` |
| `assets/characters/expressions/frog/02-sick.png` | `1a4724956555e5637956d036767968180b6377b6dda8f934f4a25a18cd4b4f39` |
| `assets/characters/expressions/frog/02-tired.png` | `c91e0b06221fbc365c4101afc6ee4571c079da79f157992b1f675ebcf1942dc7` |
| `assets/characters/expressions/frog/02-sulky.png` | `3a025bbdb7094c4b0c517d176a519677c92922c68e96e7368f1088e94d43a301` |
| `assets/characters/expressions/frog/02-weak.png` | `ad87a1de9259dac12c7a76308ea12f2aef64a3b93221949d3cb7933e0a732129` |
| `assets/characters/expressions/frog/02-critical.png` | `b0d7dd435a9d7cb4358189e5fc0f9d5a727bf7a4e509b84f21edd370a052ec8a` |
| `assets/characters/expressions/frog/02-wantsPlay.png` | `7c857cecf4baf8d875f8533590ba3459518a7d21e436221ad4c711b7bdcd8b7b` |
| `assets/characters/expressions/frog/02-sleeping.png` | `9c013bba5ea363d0a1752ea1017df1ea24173977bed7d9ad6519eede8b6057df` |
| `assets/characters/frog/03.png` | `5c0a95b75490414289cffb6902a31378f40e2a1b0c232dbcfcdbfa536de8d1b7` |
| `assets/characters/expressions/frog/03-happy.png` | `2d959852725120a21b92d2c7b47c6d390300834571a8f54989df339b401fa86c` |
| `assets/characters/expressions/frog/03-strained.png` | `4a1992ad05c9bf63c24ee58fa1f6bbf0d6df66eaf53fb6fc442e5379e96b591a` |
| `assets/characters/expressions/frog/03-hungry.png` | `da6e99190807a44debb6b8bffa44c7bb122feb04cd5d4d57e87a6c7bbfe1f62b` |
| `assets/characters/expressions/frog/03-sick.png` | `351baba97636af426126c2b45cc2075ff0fff0ed5ee916b5ae71bb46fa202903` |
| `assets/characters/expressions/frog/03-tired.png` | `e3d55f6b570cc8369b75e1fb72dae7231a27fe618e6e8018486fc6673c6c5ce0` |
| `assets/characters/expressions/frog/03-sulky.png` | `d58c9194ca0d14aeb618ae1c6df948e56b6529ff536b42c43e1709a5ada2f096` |
| `assets/characters/expressions/frog/03-weak.png` | `ad338ba2be61501d47537d7f6bac22d1e643d32b0b1bd2945a71677a52f92659` |
| `assets/characters/expressions/frog/03-critical.png` | `965ed23d45bd68885db97702cd601012b4d428677003561e87afaf2332f9ff83` |
| `assets/characters/expressions/frog/03-wantsPlay.png` | `8b230abe4143409662c457a1ae4fba3b520d5da32df238be1a0f7afaaaa736df` |
| `assets/characters/expressions/frog/03-sleeping.png` | `997c3fc82fd406166804b7c23d41e131e635cf33d66d98e4e933c24eca8257df` |
| `assets/characters/frog/04.png` | `7a553a48da43cccbd82a7a0b34ce7b685c0bad3e299ac0d879527c758c202571` |
| `assets/characters/expressions/frog/04-happy.png` | `78b4cba4a4777ecf15bdd80d36bec9fd97218dabc8aaa20e12d8ffc3af95e4d4` |
| `assets/characters/expressions/frog/04-strained.png` | `ec7f7094fba5453fdc14c0aed12972e26652a4d0ad226a5c3676ad626493422e` |
| `assets/characters/expressions/frog/04-hungry.png` | `a037c5dd1c7c19de75641eec02366ec5f4018e33dcbed2a5c7c1c90f5c035dae` |
| `assets/characters/expressions/frog/04-sick.png` | `af01973bd10b9300add6027df33f7032d247e8c8599f79b895a5cf14b8ad8c9b` |
| `assets/characters/expressions/frog/04-tired.png` | `0e1e2c506c27520ab6c2de5dde33823636608187df738eb3d3dfca6cd0953a01` |
| `assets/characters/expressions/frog/04-sulky.png` | `cca3c3ace9693d5dce33f8cfa5f44f29027e58deda7314dc309272a506659c76` |
| `assets/characters/expressions/frog/04-weak.png` | `e82bdedd3108ae72c2e4021e97c61a2d175bdc1f2a337fd179b9a86ddcc9ecbe` |
| `assets/characters/expressions/frog/04-critical.png` | `9af5d0d7a5a11a92fd49a89331646640c047b09ae0c6553feb0a2cb1cdf48f20` |
| `assets/characters/expressions/frog/04-wantsPlay.png` | `fbd0c7b820cf1d4b3353dc387135a6b67d25528ece365c645feeb0cff343c7d5` |
| `assets/characters/expressions/frog/04-sleeping.png` | `214de3ff880d4d831179beaf7738dfd1691e4435235ae7aa34ee334a2352776a` |
| `assets/characters/frog/05.png` | `ea712f67c95fd017e39a6bf751440cdb8c37a558d77ab1e3315fcb0aa5c40ebf` |
| `assets/characters/expressions/frog/05-happy.png` | `34f34b9e15921c25386349064b6b39a22c53ad9ae1c9afcf88b13cf61b80a740` |
| `assets/characters/expressions/frog/05-strained.png` | `870f9f4b4cb3be116f73c21d810485f55f969fe7121d0feb5fdf3a4523716c53` |
| `assets/characters/expressions/frog/05-hungry.png` | `71745ab378b9d549a74cb0938527768f1c0b22db4fdb6e05a103cad9cc962eaa` |
| `assets/characters/expressions/frog/05-sick.png` | `611a8af30d1c5e1c1d0fd33bfbba6010095a879e40ac4cec361dc74275fe19fc` |
| `assets/characters/expressions/frog/05-tired.png` | `58c9f872af291aff1f34ed4b440f69188532584fbdcddfa74571e586ff222cb8` |
| `assets/characters/expressions/frog/05-sulky.png` | `4032602e458e3580c91d7a2915801349e75833e592964a3831d1de7a2f6711ab` |
| `assets/characters/expressions/frog/05-weak.png` | `fd1a7c1eb6eee502110cff67d8b6127512db9d7d2ef179d7bf69cde011f10575` |
| `assets/characters/expressions/frog/05-critical.png` | `ea4940df5b55d51d7871cdc0fe7fb30d7aff60585570b5db55572f6c86fa6d35` |
| `assets/characters/expressions/frog/05-wantsPlay.png` | `70d4e362055aef3ad009251fc9375e85824466c3695f66fcac7fd8c80088b0a2` |
| `assets/characters/expressions/frog/05-sleeping.png` | `3870e2c4723298a023b3eac44eb4aea3f89659c9a5e10c3c5ba268436ecadc17` |
| `assets/characters/frog/06.png` | `06704d5b03eb541b45c50896c6460740b3fcf89e772d16c1da2d0157ad3cfcf0` |
| `assets/characters/expressions/frog/06-happy.png` | `3b5002bbf0b7df53cfe2b7262afd93d0538a838a1404b1e206211e8ce285bbe0` |
| `assets/characters/expressions/frog/06-strained.png` | `028ab94185de59d197f05a602a5022ae040842d5a7acff57d5681e57f4682803` |
| `assets/characters/expressions/frog/06-hungry.png` | `3bf5385ff7b07df58be6c49c206bff29ab1a0eb67dee942f1069d1075e25058a` |
| `assets/characters/expressions/frog/06-sick.png` | `40ce4cb28cd198b9b254f6cb042ed6c4389dbeb24d71d140f12a939ed9333152` |
| `assets/characters/expressions/frog/06-tired.png` | `d8315c060cc14fd903cf7fbca558e5361b314df9a8fb03c6f290334dc1d4e61d` |
| `assets/characters/expressions/frog/06-sulky.png` | `3935b334864f75259c82b09366f904f9bc06ecc3ec5ef581f2b009a5ce2a7748` |
| `assets/characters/expressions/frog/06-weak.png` | `7cf3ec89ef8f7591ada87eae5a55224aa0919a9b792bc8fe3f1398cfdc961458` |
| `assets/characters/expressions/frog/06-critical.png` | `8299734b48a53325a312e4838c5cd32c09b54a06c4f84251f100fbb725cf8697` |
| `assets/characters/expressions/frog/06-wantsPlay.png` | `cd9b4e985cb5c8c0feba38b0d7485eff4334f91fe0ee19d846ec29b8b0619880` |
| `assets/characters/expressions/frog/06-sleeping.png` | `13a5715188d42bf6c0bddb61eee27252a81068dca4d4f22e361031ece09845e4` |
| `assets/characters/frog/07.png` | `2d6325b799c26cfbb1da78d51c052aa8eac50b62be58eb90b90f63f3f15da28b` |
| `assets/characters/expressions/frog/07-happy.png` | `7b116dca8efa711b38b5f422fedb96cf0f65ec7f1910916cfc0007f983f73ed3` |
| `assets/characters/expressions/frog/07-strained.png` | `aaa297f31710ff332f8d20c9c5bbc8d3363b33592a2581a6c919c5e56c37b51f` |
| `assets/characters/expressions/frog/07-hungry.png` | `32acb96c8267b756a66141992a12b906373aa146a2e69ea1d7ec1ece789b17bd` |
| `assets/characters/expressions/frog/07-sick.png` | `3f7077f6164ff00af5cef426e9a5ff99cac53d7c12c1e0e83aacaff8163cb839` |
| `assets/characters/expressions/frog/07-tired.png` | `44cad7af26b432e9a24307ac57eca0fc0436ccf8455da8fa6e76ed8ac9b6f7e1` |
| `assets/characters/expressions/frog/07-sulky.png` | `dd7b1ec912856f2e3559e6a90db93e73972218191a4b0e96630802fac5e7d764` |
| `assets/characters/expressions/frog/07-weak.png` | `a98aaa3eed043cffeea6994cdbf7aeb876a65dec435f33a18890c92de692f920` |
| `assets/characters/expressions/frog/07-critical.png` | `7715a28141d6ded1e3de43294aa39977b9ac56863e3c38bd44b0c21e34a15874` |
| `assets/characters/expressions/frog/07-wantsPlay.png` | `8189f53c8e7d0ac8635a43191a64f9c8d12231e9a98e28aa358d4c6ecf8e2085` |
| `assets/characters/expressions/frog/07-sleeping.png` | `7d416f79b2ad8902728cd8ed678a9ee0dfe106be4fdadd75a41a5780980d02ec` |
| `assets/characters/frog/08.png` | `92da93f109a6e69843bec823895b10720ace19f471baabfceef5c65b71659264` |
| `assets/characters/expressions/frog/08-happy.png` | `d33e66434554610419bbe2eeb0dd269654b285926a2828401393008ad9074e8b` |
| `assets/characters/expressions/frog/08-strained.png` | `30f2b9aaf8f16fd3f37436af466d4ad1fff68a8275bf7f3d46260fa2ccb46b43` |
| `assets/characters/expressions/frog/08-hungry.png` | `f6eea6bca5e04d45e059c64b5943f314e9366ed488ae0abbea393e5d3c7e409c` |
| `assets/characters/expressions/frog/08-sick.png` | `d867c7bf152bad1d5f2fee9a32fc28596d4c340a45e3953487f3e4f75486c23f` |
| `assets/characters/expressions/frog/08-tired.png` | `4dc126305b6548b31858892aefe02e604f130e68d22b381fe253609e51f7d714` |
| `assets/characters/expressions/frog/08-sulky.png` | `6a0f67181b346d1b3afe64461ab24f17c5e9d198189b7258caafb32f08e175b9` |
| `assets/characters/expressions/frog/08-weak.png` | `8c3c433339dc81930b6519a7a2670d951b4f1c0002d0805ddfb8c63061ba8f64` |
| `assets/characters/expressions/frog/08-critical.png` | `87bcd720c6e40f2ff4a2cf3f0ee9dd62dbf635c8c03ba0487438f4933702d0c2` |
| `assets/characters/expressions/frog/08-wantsPlay.png` | `d427649fb40185583bc9243170b3c78027668acc1a05fa5baa99a7f4a2925308` |
| `assets/characters/expressions/frog/08-sleeping.png` | `c6fb7d9c5bd1656d7e0e6c97b549691e76458672e2db45e462de1ac7a81af11d` |
| `assets/characters/clownfish/01.png` | `bd9097cf21d9e7eff29109a1bfc6cdb2331307057e1b86bcd24b15e46d163436` |
| `assets/characters/expressions/clownfish/01-happy.png` | `15063c465069b057d8873ef7b0c457e820a5e35042b967f231773a6bde930b21` |
| `assets/characters/expressions/clownfish/01-strained.png` | `9d55775685cec49fa09f94179a07dd8bb593990c99872a9b57b265afe75f68df` |
| `assets/characters/expressions/clownfish/01-hungry.png` | `46b491f717e3faecc7609571c23c3a6154d47e988d3788f621a046c376881cb5` |
| `assets/characters/expressions/clownfish/01-sick.png` | `130b875d1cf99fd5d473cde1779af771ba06ab10d219b92ef30c55bac9c01216` |
| `assets/characters/expressions/clownfish/01-tired.png` | `62cc49dd6f15ee35a4c78f50dc38482c0039671a6b81349d3d1de171488e39e0` |
| `assets/characters/expressions/clownfish/01-sulky.png` | `00e144a1435c4b5c7717fffef3fb61c5efc67300168714fae8d0dd84722d1062` |
| `assets/characters/expressions/clownfish/01-weak.png` | `88fe17076da0be386fdf4b4f9d2fce6aa839ee8ba57d725a395538ae3425c49b` |
| `assets/characters/expressions/clownfish/01-critical.png` | `fd5c9d0103d185ce83c39af805d467c71e39f1b29edb48703a2351ce4c8c8aa9` |
| `assets/characters/expressions/clownfish/01-wantsPlay.png` | `6c66e7a4b330c6f0d3153c8819c167852b3ec9bdea9a4514d5ae8e362017eed5` |
| `assets/characters/expressions/clownfish/01-sleeping.png` | `8c7ce1a60fa5253a467ec5614c667ffa1f902fe7b95cec172ebf6fce5895da4e` |
| `assets/characters/clownfish/02.png` | `3c05811dac91954f3a2e7946c698f8b8c4a0a67395aa559deca916551fdf3c28` |
| `assets/characters/expressions/clownfish/02-happy.png` | `09e4577ac51130d4aea96870878f9d9445096e9b1652267939212e1f84324ba2` |
| `assets/characters/expressions/clownfish/02-strained.png` | `e5f696d649d5200fb6b08e31e34243bdd484af18521eff188908279dd68273e7` |
| `assets/characters/expressions/clownfish/02-hungry.png` | `fa0dfb0d25b395e5b867bc45f6bcbdc7ec13fbf1c584c69fe3bb00a0cf0ab73e` |
| `assets/characters/expressions/clownfish/02-sick.png` | `a1868d39e295be57ab8078932975179e68cb6840e86198d5c7f02aa1ac92b4c1` |
| `assets/characters/expressions/clownfish/02-tired.png` | `13fdeb92d6249e6dcacaff31b0081e9db27676da7f7478be440e54d38bf34128` |
| `assets/characters/expressions/clownfish/02-sulky.png` | `91ed4ae9ecc8b64c4c28447de72aebed088529d350476ade53f7dd331a1c2076` |
| `assets/characters/expressions/clownfish/02-weak.png` | `5299ea56b679b9cee1ddd45f83e7fcd32b899d91c7f2a9ed55131b9ccd32b151` |
| `assets/characters/expressions/clownfish/02-critical.png` | `261d51462fb2f0395fcd6426fd10146e027fb1a76c62b6e5e1ff6b608e5157b9` |
| `assets/characters/expressions/clownfish/02-wantsPlay.png` | `7986a3b346f0fecfe56224e1164e4a8151472c68c4e177886377067ac8a4a456` |
| `assets/characters/expressions/clownfish/02-sleeping.png` | `05c97ea70dfbca978b6044c6f7adffc8d4f4c5a83128b59c46bd6945283ec9b9` |
| `assets/characters/clownfish/03.png` | `b8fadf6e358928f8dbf46753bf53d0b421334dcf45d322873d24cc262de10641` |
| `assets/characters/expressions/clownfish/03-happy.png` | `1f571a9235eb5ae9844e5d3711c0e7c522d20ad30972d6dab232bf353a1930c0` |
| `assets/characters/expressions/clownfish/03-strained.png` | `fbea35483a7feb661912fa8dc7ef79abc635965518a3f4af0b260f34b7308745` |
| `assets/characters/expressions/clownfish/03-hungry.png` | `2aaddfcde48c2822f44d478ba5fe432ee614efbb3ff6a2da586f3896f0e9e217` |
| `assets/characters/expressions/clownfish/03-sick.png` | `3fd358c4d2da5715ecb8784aa73184a4f9906df0c2c5b5d88674862652d1e415` |
| `assets/characters/expressions/clownfish/03-tired.png` | `fafd1cace0384a44101bf3361c89424b3519f84252fb54d14d035fdf81723f9e` |
| `assets/characters/expressions/clownfish/03-sulky.png` | `976a85997c1f8119bca44cac08a36131064f91d65d25408084458df1b90ef4a8` |
| `assets/characters/expressions/clownfish/03-weak.png` | `fe36c64c41dc64f802699250feadb89c7223e32ca4bbb2b1d3a6ea4c51221672` |
| `assets/characters/expressions/clownfish/03-critical.png` | `07057ad5322204f53756715de3786a8cb98fde551e9e4f88f30ca76d25f6647d` |
| `assets/characters/expressions/clownfish/03-wantsPlay.png` | `d3d8856f9e4c5a805cbaa6be74eeb53ac3a841550dd8b220d8c64670426b5a22` |
| `assets/characters/expressions/clownfish/03-sleeping.png` | `d910c82edb1a1261eb65626c4c5e30603d6bd4892752a980353c0ba0072071e5` |
| `assets/characters/clownfish/04.png` | `b4939fe1cfcee1e23be5719769f250f6cabae2316bc643195e6a64ab8703c2e1` |
| `assets/characters/expressions/clownfish/04-happy.png` | `2b5212559336382b1304d71fb3dfb3347ed68019b275cccc6d07597759be3596` |
| `assets/characters/expressions/clownfish/04-strained.png` | `6f5879f1bb9115a97709f23130267dab9f193e94c8ada09dc3a38a025963faac` |
| `assets/characters/expressions/clownfish/04-hungry.png` | `6de847dc91398879d1c046ee053ca01b80072672f008fd02132f44674f193b57` |
| `assets/characters/expressions/clownfish/04-sick.png` | `eace46bcdf418237bca539feeb91d9c62b4496284a9475ac796db44a00e7b572` |
| `assets/characters/expressions/clownfish/04-tired.png` | `d5021c27a21738295045d9de174c36ebf0c3bcf180a6c5c7fb5e5f55bdab7009` |
| `assets/characters/expressions/clownfish/04-sulky.png` | `5cbb4f1b3ee467301fba088176db99f1c95205e4d5761b48257b9f9c506a7ae0` |
| `assets/characters/expressions/clownfish/04-weak.png` | `47adca817cad14fbba4354b67ae1e0d02c5a6dd6d4dbcb9ff8e5aba8d74b3da5` |
| `assets/characters/expressions/clownfish/04-critical.png` | `8bb32c87ba1c3cfb69963b70075724410bcb33684efddaa54b5d25234b98e688` |
| `assets/characters/expressions/clownfish/04-wantsPlay.png` | `94362da85ea4c03b8ad69802e9eed8b04878887860422ae57c5bf0b3dc26394d` |
| `assets/characters/expressions/clownfish/04-sleeping.png` | `3d6328ce031f5f73cb8b6bf3ea6dc70986da1361837cbe176c9b572121374fe9` |
| `assets/characters/clownfish/05.png` | `dcdfc0da83f513c105799088b9bf5ca47170a5d9dc2e0b9f6acb76a43fb3a5d8` |
| `assets/characters/expressions/clownfish/05-happy.png` | `380ffd1265716d0ba0afcf381bfd739f58cfc26a89dbb290f6d2fbc372a57fb9` |
| `assets/characters/expressions/clownfish/05-strained.png` | `5014f5ff2d3c92350c8d6d8c9d4a55242082c533d849862a3c79208c169bef87` |
| `assets/characters/expressions/clownfish/05-hungry.png` | `5f2b702921b55bc4389b248c978fe657d5b063c8e94f53c54cd2005aaff57aff` |
| `assets/characters/expressions/clownfish/05-sick.png` | `de88c1cb05270177fd78cfcd4b68712d1d4dce468cfa145464afe32359efc6a2` |
| `assets/characters/expressions/clownfish/05-tired.png` | `e35d6219ce0fda844a0944ce9f287af9c6f09d7a5d15c97e2ab2d1e7dd203037` |
| `assets/characters/expressions/clownfish/05-sulky.png` | `4bc6daf791087d472d574409240502cb2a2bf458b540be31e2c54c18f15af2e7` |
| `assets/characters/expressions/clownfish/05-weak.png` | `9f3f17f318f8ec58719c2d1d51391a38c3eb3c96fd5702c0ff8740f3e628c0ba` |
| `assets/characters/expressions/clownfish/05-critical.png` | `4248306c988f0dce6d4860818314d1f14e1f8cb86b258a0805d9b63c7b62ec27` |
| `assets/characters/expressions/clownfish/05-wantsPlay.png` | `95bb7bab2058b5c0425c5627843631615a987a1d59e9768e7ef3185c2c355d33` |
| `assets/characters/expressions/clownfish/05-sleeping.png` | `3cf3cc1a8d8911ecd139d948f668620c640950be9d60b22a459804b1ffb7ce45` |
| `assets/characters/clownfish/06.png` | `1219ced10749edb37c456e334d55fe931ce47e8232b141407599f3dda75ac75f` |
| `assets/characters/expressions/clownfish/06-happy.png` | `b0d77173809889aa21e8d41e6bf0f3a8cc9467be91ce2f1584688e39bca36c0d` |
| `assets/characters/expressions/clownfish/06-strained.png` | `d3dc54659f3e281040683836fe68dc618f373ed8f6b8f30dced73ecc5f0865e5` |
| `assets/characters/expressions/clownfish/06-hungry.png` | `2704e0f96051469abdaa832f96637896e03942d184603a820c74bd9080be645c` |
| `assets/characters/expressions/clownfish/06-sick.png` | `1585c977709eff5314ecdbc7236a2478657c2afaba5a47594847157d85961480` |
| `assets/characters/expressions/clownfish/06-tired.png` | `454280222505d0328017868413e422a7c1e4b8665178ee847b6ea17cbc372faa` |
| `assets/characters/expressions/clownfish/06-sulky.png` | `a42f767c7284564a07b4caa4c7784d716a796c4a67a34ef3a83068e99b1ac18c` |
| `assets/characters/expressions/clownfish/06-weak.png` | `8aa4e27802d861a452c1b78a3394dd4ed0beefe48d586bb12b78974ca1e4153e` |
| `assets/characters/expressions/clownfish/06-critical.png` | `7c852ccefb05f9f6a9044e30b3e15c8558b5384f6f8dafd776011eb5fba959a1` |
| `assets/characters/expressions/clownfish/06-wantsPlay.png` | `58f88915191b22bfe53da5e0df909b3f1a68387656cd610f5e585c99176d6c7d` |
| `assets/characters/expressions/clownfish/06-sleeping.png` | `995e2eb6ea99bfb90d95b3802d0e11b5abcb37f81587bcdf97126e55538c6889` |
| `assets/characters/clownfish/07.png` | `222fbe861cbb11c44fe2119b9888d3ad3b020e0c0a1767f12335c9aa88179e7c` |
| `assets/characters/expressions/clownfish/07-happy.png` | `72dc660b93317c0e42fd9a3ba92b7f82645415ffb51a12a58cd1940bda693b68` |
| `assets/characters/expressions/clownfish/07-strained.png` | `e9b0755bd0028a0faf2c6cee368a349f9a137b26e439a9f27256e2b725d23e8c` |
| `assets/characters/expressions/clownfish/07-hungry.png` | `502ab20dd0f8fdc057e602a0a804cb925807d2fecd24f128ca37a0fc3391ad4a` |
| `assets/characters/expressions/clownfish/07-sick.png` | `bc3365bc2ed251baa501c227e6d69a984af2166ab6c597a2ea846f96df19c4d8` |
| `assets/characters/expressions/clownfish/07-tired.png` | `24cbe560468077204a1a334bcab7ba07eb0bff63f468baae0d7ac3db55cff8be` |
| `assets/characters/expressions/clownfish/07-sulky.png` | `98fa271906456496c5cc2c21d562f76dc794720301e796179968ace7411c5203` |
| `assets/characters/expressions/clownfish/07-weak.png` | `97784e82dbe0755b63e5b1b8e14e2392bcab8bd4b7d35053090533fb165213c2` |
| `assets/characters/expressions/clownfish/07-critical.png` | `1fdc7cdf8f094b34e8419118980aea0d82158b1b0a26e21d846e26718d83d9bf` |
| `assets/characters/expressions/clownfish/07-wantsPlay.png` | `94038f2e2e5ba4832668bc4e241d3a8a112e8bbb56d6d18266ffecd81b91b8b7` |
| `assets/characters/expressions/clownfish/07-sleeping.png` | `c3282e02f11635ea4d0f5b06b5ccd493938155137acdf7e0adbc9a93a9fa0126` |
| `assets/characters/clownfish/08.png` | `205f15a7c3603f020604dbdc39e7d38335381162c34b23a507f143ec7f67570a` |
| `assets/characters/expressions/clownfish/08-happy.png` | `e39a35a4896bd07b08980f0912319c49af06444cd3e7a8cf41c0c6042e0734b5` |
| `assets/characters/expressions/clownfish/08-strained.png` | `a8935ef36c468bcef0b5163de2637fb4a3b48ece95e3f8e0e470cd5deddc5787` |
| `assets/characters/expressions/clownfish/08-hungry.png` | `9f261f0c09da8902aee2e5850667d60ad4af3bcd124a8ed427cb1898e72dd8bc` |
| `assets/characters/expressions/clownfish/08-sick.png` | `8810ea8c0cd23e032ae569e3959214f9ff3ea0a5eb94e381b195835efb68519d` |
| `assets/characters/expressions/clownfish/08-tired.png` | `8ee03c25c2f365e763cb9374a366530a55e8749b144bbf2e2993f9ab2c3bf75e` |
| `assets/characters/expressions/clownfish/08-sulky.png` | `031c19b62836df6061e49db010a11c3a8ae55acec0e9dc6c688e0268d02e534f` |
| `assets/characters/expressions/clownfish/08-weak.png` | `a6e2412fa52bc2c492ad1e8c8fe80372742d224115e3ca291a56e315deb7054e` |
| `assets/characters/expressions/clownfish/08-critical.png` | `97036462a56bbd179bd08aed61b464ebe33c5554907ccac288b17f1112db442b` |
| `assets/characters/expressions/clownfish/08-wantsPlay.png` | `43e858ba5da3e15b16038c55239312818cfd664631d76aebe86b1267fb462e5b` |
| `assets/characters/expressions/clownfish/08-sleeping.png` | `c1ecdca392927b00e67f09498bfda668cbcbf173d76b652b4b5b3b7475d2dcac` |
| `assets/characters/salmon/01.png` | `681a2d0ef8e946d0f1a02abdf0c9e76f54202645e21b44b6a2b1e27fa58042aa` |
| `assets/characters/expressions/salmon/01-happy.png` | `386dd5cef38e83258a512541b7fa0d00fd43a0d7a0e06d795f8120174d4c0453` |
| `assets/characters/expressions/salmon/01-strained.png` | `2e2c37f5e0f4607f1b60d65ce0c3f69c8f59b728818a0dba5da76254e49b8497` |
| `assets/characters/expressions/salmon/01-hungry.png` | `e275d4f5178e763956d461c36f90d117b309933967687835fa6f1d65b29e888d` |
| `assets/characters/expressions/salmon/01-sick.png` | `66c5db787bade5415a49cb3e03f9bb262a1c0ceb6527f00532adebdcb835786f` |
| `assets/characters/expressions/salmon/01-tired.png` | `cf3c98ef7ee83c7fe566121209522d9adb5fd624ca1b51db793483cbc51dbcbe` |
| `assets/characters/expressions/salmon/01-sulky.png` | `aad602c2ce5aaecd4089474706168a6cd48da09f86d56df941b2e4b5ee02fc55` |
| `assets/characters/expressions/salmon/01-weak.png` | `75bbf72d25dce826301f88612077df444bbfd2aee8477635bc303f48f1aeb07a` |
| `assets/characters/expressions/salmon/01-critical.png` | `4f2c0968525b1daf0652f0b7d629676089644aeac248053672d4b01500ecd306` |
| `assets/characters/expressions/salmon/01-wantsPlay.png` | `043fa464587469a25f74e13c4450ed0f38caa663edb6d94bcfb829265c905a20` |
| `assets/characters/expressions/salmon/01-sleeping.png` | `5147b32cb8eb6c8f9d32e00f800293b0e66488ae5a0cb1f6b4158a43b703727c` |
| `assets/characters/salmon/02.png` | `10598560ff0c23ca57f8a7ba6b5124417ed1864c0713d83d3edd97e95cd5724c` |
| `assets/characters/expressions/salmon/02-happy.png` | `7f00902e432bbf1837741232d8e9740aa1b7439754e974c5dcf54aa9bb5c172a` |
| `assets/characters/expressions/salmon/02-strained.png` | `5fded980def8329276a4467f74aff4561ebc8509a70a74def76f8b3c31b43fd3` |
| `assets/characters/expressions/salmon/02-hungry.png` | `d9385baeadefb5b8e2a63b1dca01cd69926fbe44a9258bf31f2e0a83d754708b` |
| `assets/characters/expressions/salmon/02-sick.png` | `34e63e63f2b5b84e9b9a3131f442df4aa74472cefdd8530824a30a077f07674b` |
| `assets/characters/expressions/salmon/02-tired.png` | `84651e4ddce018b73e363bc48609093a6cee90ba96aeff903fd776da4d3788a4` |
| `assets/characters/expressions/salmon/02-sulky.png` | `e35fff906fbdda9ac74f118398755e8d04e89e214f8ec1424c589720f579c294` |
| `assets/characters/expressions/salmon/02-weak.png` | `75ab4c8be68f627d5ad64f8b2ff32184a67174d824cce5894b0f27af109f6503` |
| `assets/characters/expressions/salmon/02-critical.png` | `26ba5d0a4d09f4fd7a2efed86dd5dda5d7ac39f78e7099e18fa55ec673bbe42a` |
| `assets/characters/expressions/salmon/02-wantsPlay.png` | `3d757204d5c7539e3a8475da0671612d2a4ca0dfeeeaf22335a2d4d104cdd8e2` |
| `assets/characters/expressions/salmon/02-sleeping.png` | `41d1fdca6a3a65a0dfa2795802a51971c809cd2ddceecdd2957502df9f2849d8` |
| `assets/characters/salmon/03.png` | `e0bbe35b13c99c05e4e4f1646f3fa69557997eeb5db20a92093b5711ada0bcbe` |
| `assets/characters/expressions/salmon/03-happy.png` | `61d5ce64edc69fa73942a2a0f9a76a1cb954c6d1c3dfa1b2764fcf63e65a827f` |
| `assets/characters/expressions/salmon/03-strained.png` | `5d3e44c5c0097bf9c8746e6f93d9c8bde01f4ed0095b24568df0bae774703a4e` |
| `assets/characters/expressions/salmon/03-hungry.png` | `2f401bf21d02647b2c9c1f1db551bd9f4e1c552707b86e5b177f8cb52ae04a78` |
| `assets/characters/expressions/salmon/03-sick.png` | `b51895e5488514fa170a9a66fde0b871a7abf1adc1e7e691359e46be98b15667` |
| `assets/characters/expressions/salmon/03-tired.png` | `80a193071dcde78a16782f5a8a7b109da225d1262bc6516f85fce1d98f748978` |
| `assets/characters/expressions/salmon/03-sulky.png` | `b8e999c01213331b2723523614c8a5651bebe07d2bb42b38dc648ffbfca59129` |
| `assets/characters/expressions/salmon/03-weak.png` | `267ae704df77c7882e74bd4eb19da3789672e81d677a3e81dca088cf135ac1e4` |
| `assets/characters/expressions/salmon/03-critical.png` | `25b89e2fbea2668ecedcfbfc046331d68c4d54ddf81189bb60e6eacd7b374b12` |
| `assets/characters/expressions/salmon/03-wantsPlay.png` | `68680257f6fba6cffe1e0240b2b61c91488642f4627c4b9b01f13ff758cdbf4d` |
| `assets/characters/expressions/salmon/03-sleeping.png` | `f7d784fe18e5ff4f34749cfe63f1ca9d555c8fe145064701221f8f397c0ee874` |
| `assets/characters/salmon/04.png` | `ff1f735aac2a5f67432864aebf9ae2668e8265f56e128ee77f316e0d9362c3b5` |
| `assets/characters/expressions/salmon/04-happy.png` | `026135a78a82dabe4f7a07aa0c203fc9c938290176b1de678a9439b38626df3e` |
| `assets/characters/expressions/salmon/04-strained.png` | `1d1d13d8b6f9db54c882d3a75123dff95117d690f00a6f926c953d581388dcc2` |
| `assets/characters/expressions/salmon/04-hungry.png` | `12e1d2af3a7e19abd22aa30837730eb862a202fb782c4a249c85f0db627a58b1` |
| `assets/characters/expressions/salmon/04-sick.png` | `f541e374f892e93c48a083f7386a114fab925698470765d2ce760c6434279aab` |
| `assets/characters/expressions/salmon/04-tired.png` | `54792fad4cef5c4fddb388bf8712c443b75ed35607d64d2901befe5f1cbe3d55` |
| `assets/characters/expressions/salmon/04-sulky.png` | `1c60bf95d1018896fb69508ea3e62f0feb4b77b69d16a1f9cae1f200ede9937f` |
| `assets/characters/expressions/salmon/04-weak.png` | `b80650b74db58af00403a48da1ce2ee7c395adfaa9e3124e96f395bd58b8c586` |
| `assets/characters/expressions/salmon/04-critical.png` | `9be878d1ef6e334424a493bfc2e55ae11c2fdebe07f5c4e3a91410f731c677ed` |
| `assets/characters/expressions/salmon/04-wantsPlay.png` | `7aa26f89d7d1b8f9ab9896669f89195acc294469005551ad1917d1f7abacbbd0` |
| `assets/characters/expressions/salmon/04-sleeping.png` | `30383c981bce73f265f428c98b671620a8eb2da3446e8cc03a48d62404a95d99` |
| `assets/characters/salmon/05.png` | `0a9dbd9534b3a9c81548753eb4efee7e1d7c298a72bddfbceeb10d0ac030d6c4` |
| `assets/characters/expressions/salmon/05-happy.png` | `07effa48678e28c7bc68d2209a4c529d0542428a07b0ec1b177e88a5537d8757` |
| `assets/characters/expressions/salmon/05-strained.png` | `1ee1b600814d2410f04a8c52ea9fbaec5ac845b772345e376fba64f1cf6eaa99` |
| `assets/characters/expressions/salmon/05-hungry.png` | `3d233d21e7a2edf902c9c120fd6ed31e1892215c3140cd45fa2486e44b2852df` |
| `assets/characters/expressions/salmon/05-sick.png` | `c83b7dd1948fd5bd141800a0277d0be22817110c4555cc195801a3eb4fc2cf08` |
| `assets/characters/expressions/salmon/05-tired.png` | `7840a710ec403180679110addcca05a198caa2ccc6ec510d8e971b6be4e51e3c` |
| `assets/characters/expressions/salmon/05-sulky.png` | `7ac2f90c047873cba6fef57fbb7ec758890ccb656f2f1955138af7648f859759` |
| `assets/characters/expressions/salmon/05-weak.png` | `fd5fc340a29d0a87ff24726da0fbd9297d542287c8c00cc95a9730e25bca9586` |
| `assets/characters/expressions/salmon/05-critical.png` | `6180be5d60674a0dbba9465fb969015da40f8036cd796615e65b3db4af487b36` |
| `assets/characters/expressions/salmon/05-wantsPlay.png` | `72d8d2efafe669ac0c5e0ad969c6e7cb3937dcdf277ec7b3932a3638548759e8` |
| `assets/characters/expressions/salmon/05-sleeping.png` | `9bd18635ab6ca3201baad4d67adaf3b6f84a440bb73c7251163d1c8043a31020` |
| `assets/characters/salmon/06.png` | `d5d3f119c556617761a3acfb5dfa3ffe39679e9c311d2b58c029cb10d560f012` |
| `assets/characters/expressions/salmon/06-happy.png` | `3d0dbd3a2a1e3578f8d5cb4f28d43945801021a33e1b65c43f634ed63971b850` |
| `assets/characters/expressions/salmon/06-strained.png` | `01b8f616b3b90d6334d1dcd67a2e48d842abf367f320ccf8234fdf43aecac9a2` |
| `assets/characters/expressions/salmon/06-hungry.png` | `310e1cde631b5bf2c2ae395547805bf672637576619c605af0790f59ecabbdcf` |
| `assets/characters/expressions/salmon/06-sick.png` | `a1bcebf0dc09ca2d8c236f406e88bc2e3de20297052d6e0c8fc800c5696c2cec` |
| `assets/characters/expressions/salmon/06-tired.png` | `3abbaaab9d7aae9286385aac806867798084b9a11aee44f4a785fb85006320a2` |
| `assets/characters/expressions/salmon/06-sulky.png` | `0414ba576be38ec519168a11afc43bcde7eac4f59a1c7842e6e61127bbadeb10` |
| `assets/characters/expressions/salmon/06-weak.png` | `3f0aeae74301ad867a3ed366c6606646294e5199a085d115118b1d5cfe6f6088` |
| `assets/characters/expressions/salmon/06-critical.png` | `0c1cfcd7e634fe786924bc1668afbbecbeaadcce87bdc671318d03a0492ace0f` |
| `assets/characters/expressions/salmon/06-wantsPlay.png` | `d99001595b1c2bd60f67ad0dfad1d346c147305b6366d911348d7d8ea10c97de` |
| `assets/characters/expressions/salmon/06-sleeping.png` | `a11f8ef4404fd63c5d8c7be8143046b99c6e2e9aee3fec4c4cfe1ef1ea6548c9` |
| `assets/characters/salmon/07.png` | `65a7d33acdbab4575be2332b9609889a37f263275632748aaa9e529afca881c0` |
| `assets/characters/expressions/salmon/07-happy.png` | `73b0c19c20497ee783c251d97caf451cf7d9b25c2c86c1f0a7aa96225f00d2a7` |
| `assets/characters/expressions/salmon/07-strained.png` | `86d2cf93462391e1062860f5b915ebec2f8df55fd084b33b4686a1886938ff52` |
| `assets/characters/expressions/salmon/07-hungry.png` | `4ec1641b2c4f004dd59d89f459a25cad902d93c466110eb27c93b6d67d41ffc6` |
| `assets/characters/expressions/salmon/07-sick.png` | `45eb23f17b40a34b671a65656e46fe310673ae7bc7f0b38536f9f75ee63b4ad6` |
| `assets/characters/expressions/salmon/07-tired.png` | `690d96f5aae9c2f82269dd0143685f5e75ec5aee353df2cac471e5c443ac0243` |
| `assets/characters/expressions/salmon/07-sulky.png` | `5778441adf266aa1955a6677253a049def87fbf6c5f766dd6ffdf4343c54b878` |
| `assets/characters/expressions/salmon/07-weak.png` | `3ffa4c5dbcb7f3c4edbce248fcd569954271215e137bd0a705d8380de62bb6c0` |
| `assets/characters/expressions/salmon/07-critical.png` | `ec64a3b482fd82ba18e57eb50081b5308017b0fe50cd00f8b683a132524470b1` |
| `assets/characters/expressions/salmon/07-wantsPlay.png` | `3e443e9c16595f4a8d2357ee800771e647c3c3962a9d02c2edb5e0aa17e0d6c5` |
| `assets/characters/expressions/salmon/07-sleeping.png` | `7aaa265ce3ef2293f498d52a5d1888eb8103e7cc55e87287532e7425bd906996` |
| `assets/characters/salmon/08.png` | `165add62ab980440643104cde64538fda49ae715fc34e7d6d2fe01ac440face7` |
| `assets/characters/expressions/salmon/08-happy.png` | `660a0b9326b6ec776f8438b956e0bbe69935730ede041bb6edd548e2ab0ccb08` |
| `assets/characters/expressions/salmon/08-strained.png` | `12d16ce65ba79107a8af61fc968381d23202e94d37b5c394f4c7eb7c4f638e43` |
| `assets/characters/expressions/salmon/08-hungry.png` | `88de4ace67eb16e3b77aa1b9b20a42aa96171ab9dac013169da1fa257308bd10` |
| `assets/characters/expressions/salmon/08-sick.png` | `e641d843a046113cf9d8e747e473dc9ab31f3f3ff6973f23d0dd8aab7577fef9` |
| `assets/characters/expressions/salmon/08-tired.png` | `1374f1d6611ac1747d0141349e93d444a2db6fe46e5d7eb993e5693a645f1652` |
| `assets/characters/expressions/salmon/08-sulky.png` | `9666f10a6829a76fe7c85be1d28cc4db4fc56e7691c3dee7ee0421f8c88e2b04` |
| `assets/characters/expressions/salmon/08-weak.png` | `39f5a9d3d601ef2e4ba26a2af661b279c498b63f992a64ed0f875b56fae78329` |
| `assets/characters/expressions/salmon/08-critical.png` | `501666fe9448544f3f75d644f7a1094c2efed0eebcae4294c3257a11812905cf` |
| `assets/characters/expressions/salmon/08-wantsPlay.png` | `ce306fedff8e87803deaa5b7f163ff47c9f93a38b1baf2e679e33ca92a977cf9` |
| `assets/characters/expressions/salmon/08-sleeping.png` | `41b5a978d6843ddd516201e10ecf19038cefd7e8da9f2b0fc1a55a7a9e2d1a3a` |
| `assets/characters/hermit_crab/01.png` | `5fe665da3c4bb3d5fe4a234ac677ae0bf73572e1a9b33377464c40c15a9b91bf` |
| `assets/characters/expressions/hermit_crab/01-happy.png` | `530d024ac814e294f6325c0ad8be5ca77f0acd31f6901e2682c620731eb56f3e` |
| `assets/characters/expressions/hermit_crab/01-strained.png` | `4a535c4453ac2578ae330610266cbc80d8e6485fd7fe65c68a71f7d8b3e81dd7` |
| `assets/characters/expressions/hermit_crab/01-hungry.png` | `6351de38cb0514f14541ffbf0f076187ec2085c81af5903408e23d92980d7b4c` |
| `assets/characters/expressions/hermit_crab/01-sick.png` | `5fb318255eea655b13bcd373fc2a8c5e7c9aa092165de1030d73de73300fbf94` |
| `assets/characters/expressions/hermit_crab/01-tired.png` | `98d35fa61fdc1b767eb2bc7592fff130dfd4ec25c791d15ed7898f4ca830a229` |
| `assets/characters/expressions/hermit_crab/01-sulky.png` | `ebac1bbb2cfdffa89b293e3d48ae98be316f4679dd88af53d3d54f731da50a82` |
| `assets/characters/expressions/hermit_crab/01-weak.png` | `1a021a5eec5c9097e97b29ff2250ffb3ecba1cbc6daa33a16cdf4652a3749e0c` |
| `assets/characters/expressions/hermit_crab/01-critical.png` | `f9feed5b35c10d02f2baeed2f6f1fcc03350b6857ad6a585935985c0ad41aa52` |
| `assets/characters/expressions/hermit_crab/01-wantsPlay.png` | `d56acdf4499b202fd53b6dded1a04e29b4f8991f0a02a05923db8594771e37ef` |
| `assets/characters/expressions/hermit_crab/01-sleeping.png` | `74a996689f35708e8598d1b893ba7428d41739526822db5ab4c91aa7679f7a41` |
| `assets/characters/hermit_crab/02.png` | `cae030a8b86b37856b505e9419e67420a0eafa706f843ba83afe95f43a560d9f` |
| `assets/characters/expressions/hermit_crab/02-happy.png` | `8aec1b58d6083fe08bdabdf25158e74b5891e240284d444c785c80eb11807a60` |
| `assets/characters/expressions/hermit_crab/02-strained.png` | `067ef5b20e6ca2424783843c7e323725e5df26a2725a59fcb110fc7fcd81fe2b` |
| `assets/characters/expressions/hermit_crab/02-hungry.png` | `04e1ffcec3108713b184349a762570cb5628ea60ef80b3066c063fc9d89b83a3` |
| `assets/characters/expressions/hermit_crab/02-sick.png` | `3688905e1ff0146f44d575d2605ac716b388c7feb23c6213453879514b4a5106` |
| `assets/characters/expressions/hermit_crab/02-tired.png` | `1ebcd2203deafa5d5f91405f4e2bde3e85cec5048fa79ddd93eab0bd9d384d9f` |
| `assets/characters/expressions/hermit_crab/02-sulky.png` | `a39d581fae4b99ff21f4ee93c41143362dbcf3ed7487f4190d286b04a6088d35` |
| `assets/characters/expressions/hermit_crab/02-weak.png` | `c2e6f9880fd86326d1aa785390a1b0e3eab7048be6be1adf105d768822e75c1b` |
| `assets/characters/expressions/hermit_crab/02-critical.png` | `67f0d0e98c0cfd0a70e9eea2b173864223f6cf52d583071b80bab1961707ab88` |
| `assets/characters/expressions/hermit_crab/02-wantsPlay.png` | `051733ca610fa61ef34edfd66b65f35c500042a16070efff141895809db9c17e` |
| `assets/characters/expressions/hermit_crab/02-sleeping.png` | `0577e0d8899ce07ae67b00960c6985e8771f8d3152e9801f2dca450c899b5122` |
| `assets/characters/hermit_crab/03.png` | `e9dac608376cd40044b5d6d355a28bc4390d62abd3efece8420c4e18ac5285bb` |
| `assets/characters/expressions/hermit_crab/03-happy.png` | `7785cc820a35f8372ab019545ebe6aea17a1ea1d044f2e9b6965e0b14f4bd217` |
| `assets/characters/expressions/hermit_crab/03-strained.png` | `e33790d695f91ba1a439b2c3e795717b67701429cbd38369c3fccff77c173b16` |
| `assets/characters/expressions/hermit_crab/03-hungry.png` | `15856d4da24c6249c9544e7a5be071c119dbbb16d6f11192d2a3b6de4f562045` |
| `assets/characters/expressions/hermit_crab/03-sick.png` | `be748bcd7549c5659ee03a67cca67b3eecf2a3521bfdb4185001da95d0c842f3` |
| `assets/characters/expressions/hermit_crab/03-tired.png` | `4098b473160deaf4a03a2d3cbca07424bb112ef0db7a0168c6285a13ccebe640` |
| `assets/characters/expressions/hermit_crab/03-sulky.png` | `b4a586f1d9178bc5389697b621b93a0175c77656e05981520f1271752339e0e3` |
| `assets/characters/expressions/hermit_crab/03-weak.png` | `4c7c5cbc5308af56ac682c38a15d0629aa00cee46b9321434aa26d4bd023213c` |
| `assets/characters/expressions/hermit_crab/03-critical.png` | `10ff2e23bef7d51c5cf347589bb18546171b1186a1885e46ff351ffe5dbf22ab` |
| `assets/characters/expressions/hermit_crab/03-wantsPlay.png` | `ce78cbbde439864456ac1fa5bd905706fd28ccc4297b092f1acf18207112e583` |
| `assets/characters/expressions/hermit_crab/03-sleeping.png` | `e389e74848052c875208d390a71c521a72fd47029f4202f0183af1db93ad64aa` |
| `assets/characters/hermit_crab/04.png` | `e158f132474609798727eb451f3e7214dd0b8d8bf39b60e7b769f60ac08356fa` |
| `assets/characters/expressions/hermit_crab/04-happy.png` | `d72dfce2aa3b54d1a617f9c6f8ed65a13bdfadcb53ad2209cef17224f2f61e60` |
| `assets/characters/expressions/hermit_crab/04-strained.png` | `cbb3f0b2681306c9be31f16880e6099563fbb7a4a84f2e2155eb7a12ded255fd` |
| `assets/characters/expressions/hermit_crab/04-hungry.png` | `c01958246e5c8a570604d5d3bdf4ffa279b05b3d6c2955d767a58ffae3296a0d` |
| `assets/characters/expressions/hermit_crab/04-sick.png` | `543dee234598603b97dd3772454b8384967eff4412b7752afdcda20a82ac5c4d` |
| `assets/characters/expressions/hermit_crab/04-tired.png` | `daf0345254248a7cd0fc1ccfd489df9c68d2e1e9f73f599f36f8c420f825bdb7` |
| `assets/characters/expressions/hermit_crab/04-sulky.png` | `e2d045718c31e7adae158432ce95dedb69d9547ebd1acb7694bb41930ffc144d` |
| `assets/characters/expressions/hermit_crab/04-weak.png` | `37089ef998d3b160e08b84ec7742dbcc875c06e4d0358cf397c338442b5dabfe` |
| `assets/characters/expressions/hermit_crab/04-critical.png` | `2306a4a6ae354b44e094dabc1b40126c3dc3fe9753ce11a2bc6bfa2376ef0a45` |
| `assets/characters/expressions/hermit_crab/04-wantsPlay.png` | `52cc36188ab2ea8435698ac161b6553e74900824fa4142be53cde5e1b3f9f669` |
| `assets/characters/expressions/hermit_crab/04-sleeping.png` | `03cadac04822d722fa8496d8b515ea71903eec6d3300bfbc5f60ff2810e2632c` |
| `assets/characters/hermit_crab/05.png` | `45fd38d768c30d07d66b997379dee9e1cd60a890b5082360e7f91c085f75c787` |
| `assets/characters/expressions/hermit_crab/05-happy.png` | `2d2f25df0e18c8bfc8107d724319b93d06d3b843ef62fdf60cfd4bfb7f20175b` |
| `assets/characters/expressions/hermit_crab/05-strained.png` | `c5f1f40c8b375c10c48ecea1cdd60576fd529c521969c0347c749a3a82175f04` |
| `assets/characters/expressions/hermit_crab/05-hungry.png` | `25c145b5da097b46e03a9ab58bc160d7c443057b112a557551d9ec40629d85b0` |
| `assets/characters/expressions/hermit_crab/05-sick.png` | `56bffce28177f4d3331ebd5d4deb2707dcd265e2103ee25c31eb79ac4eae0bc5` |
| `assets/characters/expressions/hermit_crab/05-tired.png` | `5e35d4ad501d0d3bf92a73908a7df20e84f71cf60986ceb712a736dd041987a6` |
| `assets/characters/expressions/hermit_crab/05-sulky.png` | `a5f83508c5908dff5d1cb46086fce3bce41ebac7b360be2384dabb6bdab62ead` |
| `assets/characters/expressions/hermit_crab/05-weak.png` | `2751b48f8ea5dd7f3a9e9d7cff5a19a86d1b6703bbb4980f63b00a8493621bab` |
| `assets/characters/expressions/hermit_crab/05-critical.png` | `98887ab2326c70beb9cbc12ecea4679b8fd9964dd07c757d4ae1b22edf3ec06a` |
| `assets/characters/expressions/hermit_crab/05-wantsPlay.png` | `ca5c29da9003039ffb9ad7d9e7d31919f9969188d61949d49758695d976255f3` |
| `assets/characters/expressions/hermit_crab/05-sleeping.png` | `f727cc20a89e782cace91d4e1e17f7e764cc1c4a4a96edc439b5c574ee46d538` |
| `assets/characters/hermit_crab/06.png` | `f923be8b4b74fad1a37daa86c5cda632f4a2b2d4cb4a1f22cea14dfe5cd1d02a` |
| `assets/characters/expressions/hermit_crab/06-happy.png` | `d7bc5754529f9a23542b755bf041f05b4bb0c30b3e932fc0f96179a142ab6d2a` |
| `assets/characters/expressions/hermit_crab/06-strained.png` | `d6b22c38dad6094f294af800e244ff3727af548873f2cdcd8af2fccf6f868f16` |
| `assets/characters/expressions/hermit_crab/06-hungry.png` | `3d65c5371bd878c312c9a5a5c697c105e05d948c1aee04251bf449d17023ed91` |
| `assets/characters/expressions/hermit_crab/06-sick.png` | `28e61d45f61c66ed0401578f68aecfb0efa5a54da8ecc61ea6e94b6b4a9d6f31` |
| `assets/characters/expressions/hermit_crab/06-tired.png` | `a95fa31b9045da2e0ef466cc5a4307fe504e7ecdc9d32ccd080ae1346f00a03e` |
| `assets/characters/expressions/hermit_crab/06-sulky.png` | `82b2823e1e5e78e83a279f7bac6cd88d522e93bfc4fc5339b743fc72e940cf1b` |
| `assets/characters/expressions/hermit_crab/06-weak.png` | `e2495d93abc208e25902a3c14eab2c892505ed55cc468ee178a45fc58d0be20d` |
| `assets/characters/expressions/hermit_crab/06-critical.png` | `6ecab5a177f1fb638ad62a3efc563e8b1f69568484eb2f3025b9fb391c4e2aec` |
| `assets/characters/expressions/hermit_crab/06-wantsPlay.png` | `6a6603165330df2baf36b7012d0463b4d3a6c178b552519c74931c77e092ede4` |
| `assets/characters/expressions/hermit_crab/06-sleeping.png` | `639abf67398ba2057fd73c25af9ef7404ae2d53217e6e6c198e4879e51ff3a95` |
| `assets/characters/hermit_crab/07.png` | `68e125db17e00b65d5bc2af9862efbc22712266985a49d8bb426d97daef60b57` |
| `assets/characters/expressions/hermit_crab/07-happy.png` | `21e1f44c364c6d788ba50f0828c09e90573160b4f0ed4edb1c0bf99edc2b7afb` |
| `assets/characters/expressions/hermit_crab/07-strained.png` | `91e53510d532c6d2d79de1b058805554f9f8e5b71b2e9d9a319a3613eb70a810` |
| `assets/characters/expressions/hermit_crab/07-hungry.png` | `e3f1ccaf8678a250541065758c26bba3f1120d48cbf453a31bb20fe26aed6043` |
| `assets/characters/expressions/hermit_crab/07-sick.png` | `202a531737992e8ee7bb16d03ee224fe70826aa794dd1746eb0ddca049d4f422` |
| `assets/characters/expressions/hermit_crab/07-tired.png` | `1dde0ca6c6c7b0ce07f910133cceee97eed51136e0855f73af4ad92b9dfd1e13` |
| `assets/characters/expressions/hermit_crab/07-sulky.png` | `f9b065ba51e43fc5407268932b500d9342a9c1b96dd5e04ce9dd87f36c6ac354` |
| `assets/characters/expressions/hermit_crab/07-weak.png` | `3ff4c255f110e083540bf52b29288a023a582723d49fae62d7d4003fd1a455f6` |
| `assets/characters/expressions/hermit_crab/07-critical.png` | `7e338579acdbd1fb665f0a2635d8aafc0606016a87d4e7b5f6412631f4629f37` |
| `assets/characters/expressions/hermit_crab/07-wantsPlay.png` | `01b951e2facbf6c6c5c53999fb82abe424a5da1e4010102ee41e19166eb54ae9` |
| `assets/characters/expressions/hermit_crab/07-sleeping.png` | `481724a153f7ff6b9115d430c73014be68237518aed3030791336bf272504721` |
| `assets/characters/hermit_crab/08.png` | `1acaf0e07e1aa4cfa9ad6d3ec4fc01b6ac982b2210565e1aef238c0e2a153b13` |
| `assets/characters/expressions/hermit_crab/08-happy.png` | `d7eb8a9b736d00dffc51fe56c17bc116771c3bbc082bdd2b77f77f84d88fc835` |
| `assets/characters/expressions/hermit_crab/08-strained.png` | `a8c9045599a5c5aef64896006723a96e9368f0d63c868302db6c63785f5f1689` |
| `assets/characters/expressions/hermit_crab/08-hungry.png` | `67e5791d0e11bf47252f12d3e922594839a86166652aa3d0a9295c61608094c4` |
| `assets/characters/expressions/hermit_crab/08-sick.png` | `daf3ff92ed2b604f87ae615bda9a8d2d42251f815ace1b29862701b1272394ae` |
| `assets/characters/expressions/hermit_crab/08-tired.png` | `9782a0c29be0140d30230811973f153636ced2e29ccf8d3a1460e2c2ad82a620` |
| `assets/characters/expressions/hermit_crab/08-sulky.png` | `84e6ec8ac6fe63503b972a0bbd1ed50a3d5844018bc8b7ee38efabf1e669219d` |
| `assets/characters/expressions/hermit_crab/08-weak.png` | `3c3ef14fd8dc6c6a72b050675faf52513d991a3c6fec867b71083b7899a7d4fa` |
| `assets/characters/expressions/hermit_crab/08-critical.png` | `8992576812957e4ce062aa16ca25e2515e662c425935dc5fdfdf4f1dea30a38b` |
| `assets/characters/expressions/hermit_crab/08-wantsPlay.png` | `0f25d063b866374aeab18afe3e0c26e2bab674ad0a503e86ea412c9f0724c80a` |
| `assets/characters/expressions/hermit_crab/08-sleeping.png` | `f1ce954ec2bc8529b14e17d78b20b1ae3f5c49a3e5069ff8a87b72c8f01e4409` |
| `assets/characters/jellyfish/01.png` | `d9b139bcb6f891eb49bdcf839fefe34e33a845feec79454852679a47a8bc5cb3` |
| `assets/characters/expressions/jellyfish/01-happy.png` | `b4a65808dd486129ad8c614e380d4e7e089184274c73066ce021b530c6c0678e` |
| `assets/characters/expressions/jellyfish/01-strained.png` | `b0758e19ac1fa761aa5159ed655e89fc8a94b9b07865bfa2d36543b9c045a19c` |
| `assets/characters/expressions/jellyfish/01-hungry.png` | `36ece5fe3da0aafd330139682ee79a9c1b9aeb982de661f5ffde4445e1d62866` |
| `assets/characters/expressions/jellyfish/01-sick.png` | `d37f63d2f8eaefff6983d1ee773afa6ce7f564a21c84cb4599f460714d8f2805` |
| `assets/characters/expressions/jellyfish/01-tired.png` | `0b361566d88270896fd993f326938d061a5e8a468ef62145a988b7dd0a6bff15` |
| `assets/characters/expressions/jellyfish/01-sulky.png` | `e4a7c28504ccdcc3a0b01160ad225c0d2eda97987195b29c176c44b7d0ffe44c` |
| `assets/characters/expressions/jellyfish/01-weak.png` | `c2e3a331c7e3a5774dfd7ef065259a23125670c53035472c93ab78a70dfb32b8` |
| `assets/characters/expressions/jellyfish/01-critical.png` | `e962c0bbc6b1a7136f959ccc97a877b028dce41280c213044285cdf90e72946d` |
| `assets/characters/expressions/jellyfish/01-wantsPlay.png` | `e3de05d3b747df3148e9dfc27c1ccd6cf01f5764e607d0f86e66d1f6650fd137` |
| `assets/characters/expressions/jellyfish/01-sleeping.png` | `dd8af42f5629cd25385f5adb9746eed28ad326c48eb2aba07f6c4a6b0cdb8c76` |
| `assets/characters/jellyfish/02.png` | `38312ddf07cb2109056dfe23deb67689880bc8f8920e2842be9b6a77d91db5b6` |
| `assets/characters/expressions/jellyfish/02-happy.png` | `95e94796a6c08f2d89b7b10318a7bc73c729d4cdb7c70d7f3c9adf304ff93366` |
| `assets/characters/expressions/jellyfish/02-strained.png` | `0ca96f46ae6cb56176b9bd24cc1b1ce17d95bcec4d157ec834dfec66414c5472` |
| `assets/characters/expressions/jellyfish/02-hungry.png` | `3d56102b949740c7072945870892f86016cfa05a2b09cac889eefda0d2de6856` |
| `assets/characters/expressions/jellyfish/02-sick.png` | `1880a9b9e5cb8fe27a0981a746b9c2930b3ae5853ab17133a945380008e4ebe7` |
| `assets/characters/expressions/jellyfish/02-tired.png` | `e94b2a6977d4675deaa58b4b1b303e2c8ecc598762f9e80da34561c3952393c9` |
| `assets/characters/expressions/jellyfish/02-sulky.png` | `7e7379e757406431a6ebf483e5ae86241b055dfd775c54b359e99d0fd2a4dc96` |
| `assets/characters/expressions/jellyfish/02-weak.png` | `3fc7962a60c45d695cbea6c03c6d133d0cfb7a2543e20f0b8297fbda012cd55e` |
| `assets/characters/expressions/jellyfish/02-critical.png` | `8893997142dba1843bd3b649955422ff9a379f547cfe2e915e52198f252ec865` |
| `assets/characters/expressions/jellyfish/02-wantsPlay.png` | `f449a90430dbde86c8920d634727adc30648b57bf2e907a681f80107ac1b51c7` |
| `assets/characters/expressions/jellyfish/02-sleeping.png` | `37974c174ff386f47ffbc094e95b14c01ad4187e045509a6fd2195c9938569af` |
| `assets/characters/jellyfish/03.png` | `279b518fcbb1b19a5cafa652360b70ee36b56d1f964ff7ff5571350ff52c377d` |
| `assets/characters/expressions/jellyfish/03-happy.png` | `f0713cedd83a91f2e63610f467a9937a0829c2f83907e8a59714718627aca37f` |
| `assets/characters/expressions/jellyfish/03-strained.png` | `81efdac8713e5a9b85d4a63338353e6e40ae15d5be17fc291f1b1e8c27c02b55` |
| `assets/characters/expressions/jellyfish/03-hungry.png` | `c127fbc165b0d235ae26206c8bd2608a68e13ae982daa9135c61a975ff2e755a` |
| `assets/characters/expressions/jellyfish/03-sick.png` | `d3cbf535d540c9c799a400cec8d2982679ac5dcfae331acd6d8329fcc7910100` |
| `assets/characters/expressions/jellyfish/03-tired.png` | `0a1201f0edc6a71eb29d8731d98bbdd4fad5e59bb7ec044d691507baa6a72d33` |
| `assets/characters/expressions/jellyfish/03-sulky.png` | `df7b9a4fade38af387c39631af7a370af8363372a103ccbba976c9b7eca4a7e4` |
| `assets/characters/expressions/jellyfish/03-weak.png` | `34add0f4f957b526d374eab57013046723b13d85e0180dde92fa25bb536ad5ef` |
| `assets/characters/expressions/jellyfish/03-critical.png` | `f13113740dd0fa75d962ac392c4fc658aaf49879b904e388787315e04b6b82d7` |
| `assets/characters/expressions/jellyfish/03-wantsPlay.png` | `5f82f06643b8c90db32150464bc07f3012fe924966a1c93465ee183ab5713e0f` |
| `assets/characters/expressions/jellyfish/03-sleeping.png` | `fa18d9c17b9e9a62632f5eec173d3181e5d53c4490fdfa09d1b68056cd48cfc4` |
| `assets/characters/jellyfish/04.png` | `8b938512aa638c00e8614c0f651058eb450a5e6d9acb3b706439e4b20a2e2145` |
| `assets/characters/expressions/jellyfish/04-happy.png` | `561819024f088004bd51fadd3a87421b7b6182e58b3ef2f3018a8a38866f3f72` |
| `assets/characters/expressions/jellyfish/04-strained.png` | `2dbd75264353ef6e330cac41715dcba958ae938522598e5b818f2be4d38025f9` |
| `assets/characters/expressions/jellyfish/04-hungry.png` | `d430f8bda201e39670c5f711a0d3487ba3b8bbf0016d01104ca761767c1471bb` |
| `assets/characters/expressions/jellyfish/04-sick.png` | `97a42fa2cf2f64ddf8ee79cdf1ff04241bb825d4df7915df8b504141fe137ea4` |
| `assets/characters/expressions/jellyfish/04-tired.png` | `3e2fc720d9090b4c21ff679c4f7c852a1a26a01c80d3b87fe006b78dbd20ae38` |
| `assets/characters/expressions/jellyfish/04-sulky.png` | `b543fc2601ca9593688ff57535fc3871603dd63395438ff072dba0ebad8e7f6a` |
| `assets/characters/expressions/jellyfish/04-weak.png` | `5125214a79d2f3bc26ffa61fe82a115b3f142e81203c42a9b726e0ee2324696e` |
| `assets/characters/expressions/jellyfish/04-critical.png` | `c4520823f7c06549674c18187091e39420be06138b04cebc7aec4aaae0ebef44` |
| `assets/characters/expressions/jellyfish/04-wantsPlay.png` | `ecf80aecef09ce5c368e84b587c52c9548fc7769b18c3af59b2edae98d1485b0` |
| `assets/characters/expressions/jellyfish/04-sleeping.png` | `b8ae12881f9b7d00e9494f3d7b3b683584a7ecd5ccf3fd32f9e5960c6b5cfbf7` |
| `assets/characters/jellyfish/05.png` | `eec6a0ef167c56c596e56fd7127f618c690db3ef963341251fe77ab96e4c44d7` |
| `assets/characters/expressions/jellyfish/05-happy.png` | `e63a9399518489939061d9b68030dc4e38e412172dd687febf0c24de634af4ec` |
| `assets/characters/expressions/jellyfish/05-strained.png` | `1227279a5f90d76ff2e88fb63dfe5215d57689f02f90223a50f0f21a456a1a0d` |
| `assets/characters/expressions/jellyfish/05-hungry.png` | `bec81c9fd0eed1713f98a8a6b286a0501b6bc537a8483e9f9630637bde8cf857` |
| `assets/characters/expressions/jellyfish/05-sick.png` | `eb30bf88738a15bcd577c5a4288cdea98973d59895acaee5e6d1ae921b41b87a` |
| `assets/characters/expressions/jellyfish/05-tired.png` | `246811df3d29f9b54e8a6a8d94df2ac506895c8e28603dbcdf05843f00cd257e` |
| `assets/characters/expressions/jellyfish/05-sulky.png` | `c64b98dac023695f1eb165a8c3adbe1fa116541d2dab1fb821605dbe8bc70d93` |
| `assets/characters/expressions/jellyfish/05-weak.png` | `4bcd05118b9825cd0c99777a66183c3d77ed1e1c332b2778ffebf10b7b12d25f` |
| `assets/characters/expressions/jellyfish/05-critical.png` | `644f55d753a8172f835ed4e82c5f43666551116075bb806cca244402804af2c1` |
| `assets/characters/expressions/jellyfish/05-wantsPlay.png` | `7b6831bff78f1dd39323998f192e29c33fdf73d32b474eba13b9dbf3e6878518` |
| `assets/characters/expressions/jellyfish/05-sleeping.png` | `da44cffda6a4e36f80696dbce1b950944c1c4d7448356a2c5cdb7402b66b002c` |
| `assets/characters/jellyfish/06.png` | `9f704cb89c7e7945b77368fdff96e95a61bdb6f70addc2ded09efd17228173f5` |
| `assets/characters/expressions/jellyfish/06-happy.png` | `47b41ff1e26cd8fc4592441d47b61a065a45c7b40488acc3f03dedc74c2a74da` |
| `assets/characters/expressions/jellyfish/06-strained.png` | `5aa6e39b45b386d610d612128334f57fa4dc69da1124b389d456f463dcc03a7b` |
| `assets/characters/expressions/jellyfish/06-hungry.png` | `e3b0942d56bfc32287a257311cd18d0784f32f7ae433ee3a89a898362c5d71c5` |
| `assets/characters/expressions/jellyfish/06-sick.png` | `e6a117f8f3191a38a76fd43471503632f86cf11a72d8391a180a842f7e85a3da` |
| `assets/characters/expressions/jellyfish/06-tired.png` | `12830c5810338ef3b3b758f06ec485110c53208d79987585fea34e788205f0ab` |
| `assets/characters/expressions/jellyfish/06-sulky.png` | `7225af8c1fd7693f1647fb9d77a973f90cabedb2ee9d16cd590696857c0cc807` |
| `assets/characters/expressions/jellyfish/06-weak.png` | `439318b4cba06b10f012a7a635e4f4ed0acedd82d585509a8caf86697c7290fc` |
| `assets/characters/expressions/jellyfish/06-critical.png` | `cf7d7f6532075e1fe0ed749660c5f6ddbea23ba2c5ef20b850c3eee3ece62f39` |
| `assets/characters/expressions/jellyfish/06-wantsPlay.png` | `53bf465a23af04ce484a3e94234e4378df51513bae9e2cde4a4dc18b28ab0a31` |
| `assets/characters/expressions/jellyfish/06-sleeping.png` | `1308b3dfcb943b277e238fc5408a0bf8326489779f06c0d0ba7ca885e3756dc7` |
| `assets/characters/jellyfish/07.png` | `2f88c51c59db4758dca6a9f5bdf66c800c359b9aca3e7551d4c6ea025b643b62` |
| `assets/characters/expressions/jellyfish/07-happy.png` | `9965c5efcfeb4a51df4edea36cf5fdef152a8b77fdee92a86f13ac3d2c73147e` |
| `assets/characters/expressions/jellyfish/07-strained.png` | `6b299f9477689d2c3d625c4c8b04208b69a79174d97fcd039dd02d286afb6a90` |
| `assets/characters/expressions/jellyfish/07-hungry.png` | `ce5483da8e4ffebc7ebb1392030b72155c14f494bbfb0c126bcce594288a749b` |
| `assets/characters/expressions/jellyfish/07-sick.png` | `e9dc159284b37a4fbc2da4a515dce08b03ef095220e980794a433da1d4db569a` |
| `assets/characters/expressions/jellyfish/07-tired.png` | `8c8cdaa85d99910a684079b71594795fc21951fa0c72815640dff5b744173b69` |
| `assets/characters/expressions/jellyfish/07-sulky.png` | `a8708f06985eac9275dcd812fb86766c70b0e7fa2ecb4f4197102990f40304f9` |
| `assets/characters/expressions/jellyfish/07-weak.png` | `208b24b8a3cc188f0f98f209577a4858ca297745b54d8a4a2dca2adc3bb4dc41` |
| `assets/characters/expressions/jellyfish/07-critical.png` | `6eaa35d79f6fcc552f7f34db1c9e11035257fa9be2a5e4b52c428073838dd681` |
| `assets/characters/expressions/jellyfish/07-wantsPlay.png` | `38d08d5551ba5fdb261eef790553e8781fa7a19ce5f80185787f1975181d9071` |
| `assets/characters/expressions/jellyfish/07-sleeping.png` | `688311ee0af1ac70b4011f5916854f7010398b1df36d2c06eb7f5d4446ee81eb` |
| `assets/characters/jellyfish/08.png` | `1b68a87b3d90de534d19484dc62bb3a08bfa4faee90e521d6ab669f3c9b78553` |
| `assets/characters/expressions/jellyfish/08-happy.png` | `92a999dbc17e2a7e49aa6f4478e15f6e92de061d35554df21a3a5123197e4632` |
| `assets/characters/expressions/jellyfish/08-strained.png` | `ddc21a91bd4959624476112edca10cc47f17b602c4e6902b9e144e2b319278f6` |
| `assets/characters/expressions/jellyfish/08-hungry.png` | `59b042932936f064384a534aa9a8e650b63a12d3e62bf522ba6623bf0834bb4c` |
| `assets/characters/expressions/jellyfish/08-sick.png` | `4f7ce75f979e751085e8ea3f9eb4a3f1c9e1972d0812007f2d20c49253581d17` |
| `assets/characters/expressions/jellyfish/08-tired.png` | `4a58dedfc1d4aab472db15891b404944b88568d8b77e815821bab3058c82ac3d` |
| `assets/characters/expressions/jellyfish/08-sulky.png` | `16200c277d296e16433167cda566ff0c626d72caab802483ed39d34f5ed54c4f` |
| `assets/characters/expressions/jellyfish/08-weak.png` | `1924f656b1e2d294341c545f1c91518558332fec217bc7da52a142c6f4118e0f` |
| `assets/characters/expressions/jellyfish/08-critical.png` | `f4ea0c111212e6b7100a70a4aeab2ef314b06fa8af36c6c1f9a974607f0a236b` |
| `assets/characters/expressions/jellyfish/08-wantsPlay.png` | `9cdaa476fa7b34959de155bcd896e9761e4a838838ae251050264fe3d7a74237` |
| `assets/characters/expressions/jellyfish/08-sleeping.png` | `42315dc6c5eb9599962c50114576ccb7b81b6071bbe2654e5b6f34d5b9498f70` |
| `assets/characters/starfish/01.png` | `dcbd67f8016518b3492842ccccded235137b81fb7584cbd6fd422632a98183d7` |
| `assets/characters/expressions/starfish/01-happy.png` | `1e093ecf437c336b870a2f7555861862017bd00a30556e40c76ee7d21c8d88b5` |
| `assets/characters/expressions/starfish/01-strained.png` | `b92a40817f3ce623473334369d8d443a1d6529cff0f312c957ed65a8c4a7afdc` |
| `assets/characters/expressions/starfish/01-hungry.png` | `cab115e2b5035e5add3e5b65b62d29d1b13f9cc6780ffd0a3dd7dec33964dbb1` |
| `assets/characters/expressions/starfish/01-sick.png` | `211c5689b70e6e32f02b92401d07415f4ddcd75f8dcc482a2dadd51d5589ef28` |
| `assets/characters/expressions/starfish/01-tired.png` | `60c1a8f54b7203d0a4075370750a23b01125ed611c9e161b60fd18fb034f9969` |
| `assets/characters/expressions/starfish/01-sulky.png` | `effc2e430e863b194c3b9f61a05425e7ca2117c564aa0d44c58ac47182f5e69d` |
| `assets/characters/expressions/starfish/01-weak.png` | `1a7c1cad1521a01d6a607483e7c259b7e6dc5e43202dece84bb42c44bd0516b2` |
| `assets/characters/expressions/starfish/01-critical.png` | `45d379ded2459f53a120cfc55cb051234f6093e53e2ad9ca231bf8e8a3a4d3c4` |
| `assets/characters/expressions/starfish/01-wantsPlay.png` | `7558925ed0b38dc31bb7da0f5a447660dad7ba1bcd9abe57ddbcfe54f4e3fa94` |
| `assets/characters/expressions/starfish/01-sleeping.png` | `4850e8b80bc6a3ccfd3ccdaac70eff564b4a3db59e0f4613f8cb8f63cf772b9f` |
| `assets/characters/starfish/02.png` | `c96b74fd84f18ab534b46f7c21289a3ec151b5beca47df726c0e2a0ef756f28f` |
| `assets/characters/expressions/starfish/02-happy.png` | `0dc99565efe65c33e8fc85800dfa271522f9beab656d2487ca37057d79c69dc0` |
| `assets/characters/expressions/starfish/02-strained.png` | `a5e693ccd606aa383baa1e04a0eb8ff0b3a52ac10b6db6f7d3d4f4b44cf5a7e3` |
| `assets/characters/expressions/starfish/02-hungry.png` | `75bf8ab28711df6f614152532f1ba3a7834239d65e1bc44155d5dc0be4d4d7b5` |
| `assets/characters/expressions/starfish/02-sick.png` | `7c81bee1b9c3c84f597ed77bafa1f729d606d24f1c89b3343c417749fcbdc97f` |
| `assets/characters/expressions/starfish/02-tired.png` | `1e9864d015a41cc1c46c90eb3f22408f48c63560b0928da7b378cb92a771a545` |
| `assets/characters/expressions/starfish/02-sulky.png` | `8b0a2c961cf289510931822f32c0a015c4ff106107443a6b976981ca77e7b040` |
| `assets/characters/expressions/starfish/02-weak.png` | `c29182bb9ff5d97331fb65f491ffb77ee2409c8bcbe5c6e796b95d75756e15e8` |
| `assets/characters/expressions/starfish/02-critical.png` | `50659056c4a30c78dd4e40615795374e098fbb5cd5423490498051e6e5f03066` |
| `assets/characters/expressions/starfish/02-wantsPlay.png` | `abe540202cb520af92e93bb786cbee1f4829a5b20a9fdc5ce8bf0e656bded58f` |
| `assets/characters/expressions/starfish/02-sleeping.png` | `cade743594525fec5cbdd64731a37c895aa663387ab543e727d78aa45465f3c2` |
| `assets/characters/starfish/03.png` | `b7224acbc062e564eede8d8b7588a7da15c0f20b1b82f54f56d64aa51e6b5ac9` |
| `assets/characters/expressions/starfish/03-happy.png` | `67d732c5f851dd45a304c0019d302deed6c68b8ea455357584e5ddbbf8b67b6f` |
| `assets/characters/expressions/starfish/03-strained.png` | `e9657081484083017f06d00e1b3b0cc2feac7b638be645076aef32f2b536e27f` |
| `assets/characters/expressions/starfish/03-hungry.png` | `a112c1818249213d2839c527a48bf7f2d3cda8c7fe06a8664f8b45422ede49d8` |
| `assets/characters/expressions/starfish/03-sick.png` | `b97023927039698b1c09c14358cbe4337dcd3bb3e70ab1ee6415ae2ea9c9cef6` |
| `assets/characters/expressions/starfish/03-tired.png` | `12a1c705cca2f0727b1e142a44c9ed6f98ba16c0777466a9e8eb2beccb41ce37` |
| `assets/characters/expressions/starfish/03-sulky.png` | `b65709febb587865bb247846257128fa2899f929a6f909d18316fe9504eff48b` |
| `assets/characters/expressions/starfish/03-weak.png` | `87726e655b788705d12a9765aab3b2dcb8de62e3b1cad1669636f99a5be6af04` |
| `assets/characters/expressions/starfish/03-critical.png` | `6b9ed3d4ee47d1fab4e3d7806133e934a58a27a6ed665659295bdc9a24d1f945` |
| `assets/characters/expressions/starfish/03-wantsPlay.png` | `84332edca10c28c0c4b1d2d27c468a0eea29dfb5a6a3db926988fc3af9f11c8c` |
| `assets/characters/expressions/starfish/03-sleeping.png` | `3a0852223511e28b07e4cf5dab0878f0f181fd79e3454f2a099b541de109e474` |
| `assets/characters/starfish/04.png` | `67cc700986fea3bf4584744a8f58a10978d1dce0eec173ea4666b73c82bc9863` |
| `assets/characters/expressions/starfish/04-happy.png` | `10fa4a0ef7f7f88aa9162c2e94595bb455454a752cb01e0711251612dd6d51c0` |
| `assets/characters/expressions/starfish/04-strained.png` | `3fd702bbb0c275259e57db04a85c057a4380ef1ac2340ef9c6c55fc4c8c590e1` |
| `assets/characters/expressions/starfish/04-hungry.png` | `254f91c7a76caa57879a5e0a626149819860ffbee99d2bc4c2987ebebd5a1723` |
| `assets/characters/expressions/starfish/04-sick.png` | `871788d79fbde8ac8a04269e899807ff6ac92531251b6356d425d13306999542` |
| `assets/characters/expressions/starfish/04-tired.png` | `faf1fa9eb2fd32e5300a1e3b8e0a0b9526cbcb611b27dd47bc4b8b807661e5ee` |
| `assets/characters/expressions/starfish/04-sulky.png` | `d49469491fb6929ef9369f3c553d8b6f0848ba9cc8954cb821c2d062a025cb1f` |
| `assets/characters/expressions/starfish/04-weak.png` | `70229e63146df3999084a00a02a16c12f0e7e0a8637e42cdeec9c9c919b34c04` |
| `assets/characters/expressions/starfish/04-critical.png` | `3f7af2d4da428e4fbd7e25a17223fcccb3f491e0026976610fad63db5bb29a38` |
| `assets/characters/expressions/starfish/04-wantsPlay.png` | `70f3eeb3fa7f1e18de8dbefe499cc395e6cd7008dc9572c7d526d80b518b016f` |
| `assets/characters/expressions/starfish/04-sleeping.png` | `8145a3935380ccc69dcc82835b30d47c86994d64fbae67f67f437b58b8abed57` |
| `assets/characters/starfish/05.png` | `5075539019147a587ab984f058edabdb3ea994ab91067108f48e4c3cb9afa462` |
| `assets/characters/expressions/starfish/05-happy.png` | `ba63b15ce0bff6d3d12d539c26c518984f20097701451aab89447fb853414ba4` |
| `assets/characters/expressions/starfish/05-strained.png` | `780c54aff1a11098b6045df03d8f1aa185415dd94f617b8af9c5a6d0a45b7522` |
| `assets/characters/expressions/starfish/05-hungry.png` | `6617c39d3b23175788f6ce1d6ff0bf77ac6d40e8239d9184f4dc883748525df8` |
| `assets/characters/expressions/starfish/05-sick.png` | `f57a164d78290acad43b30dc62b27192fb46275fa48713533cd1e0e953af6fb4` |
| `assets/characters/expressions/starfish/05-tired.png` | `92868b05edc2bbc9e79668b815741ef15450e98a5d56a60d4d7f3b24aaa4ebf0` |
| `assets/characters/expressions/starfish/05-sulky.png` | `fbd722b99bb14ca4a3de3961b44862c66ce4260533df428375f86ba408dbbe76` |
| `assets/characters/expressions/starfish/05-weak.png` | `9334c86d31301676d428cb273f39b638fff8eb8677acba18d05d791a89f5eb92` |
| `assets/characters/expressions/starfish/05-critical.png` | `b24733df0d8073b7cc631606ce2c8c2e097a7de744162136a0bf4343fe35f9d7` |
| `assets/characters/expressions/starfish/05-wantsPlay.png` | `3c45f1195f1eac544ba8e0397cb5f2eb0c66789fa8223b0652635d202e046ca3` |
| `assets/characters/expressions/starfish/05-sleeping.png` | `e5fef6e9caaa781c1b61fcec97afc1d589037369718ffd5b6585e4b939210891` |
| `assets/characters/starfish/06.png` | `9530edaae3061ba58e55e460d1ee72f67dfc33c74841d0f1cc30eb05a8ed32d8` |
| `assets/characters/expressions/starfish/06-happy.png` | `6f25f1c979485a8789935f851dafd271d95a695d6fc92026c8355e3c429d5ec0` |
| `assets/characters/expressions/starfish/06-strained.png` | `2a1a14b462f66461864aa456acccd521ef4f5cb9673e7343c3fe7a709782da46` |
| `assets/characters/expressions/starfish/06-hungry.png` | `8ebad2a1ef6de17207f2a2b1efc8121d931d31c30177fa033dfd186e4a0e2664` |
| `assets/characters/expressions/starfish/06-sick.png` | `f9da2bcc26ace0cdf9cfda4d57fa95e8e9a68f95c308d383ffb8a676713145af` |
| `assets/characters/expressions/starfish/06-tired.png` | `2305c4f67209d028189e5f0bb4c6b44141a18d00947606ec971f05c73d86ee12` |
| `assets/characters/expressions/starfish/06-sulky.png` | `b4416ba3ac460992a7945e9e0e799b9e5e477802b52a1800fda8c790bb6491c6` |
| `assets/characters/expressions/starfish/06-weak.png` | `4ee5e147834724920d1233a92c2c0415268d50b4e42c564d7e68b6b130f8d832` |
| `assets/characters/expressions/starfish/06-critical.png` | `cb03fca6463f811192cae00b02a56554d4ca5648c05cbb0b912735cff96a28b0` |
| `assets/characters/expressions/starfish/06-wantsPlay.png` | `1744fa3780595462010ac35af4149b27a67c790c6cb24e733e6bc7d164bd32f2` |
| `assets/characters/expressions/starfish/06-sleeping.png` | `244064545a14f063ad5750626c3099f4f6e5fd98132c9e0736bd2d5aa0ce9ef2` |
| `assets/characters/starfish/07.png` | `c806f9b9fb0d489db9c253f5caed5a1773c953cd6db756084feef49db6c9f6fa` |
| `assets/characters/expressions/starfish/07-happy.png` | `46349ca0e05212e0ca338a12a40abe5719aac99da4727b0a35c38e2346f001bf` |
| `assets/characters/expressions/starfish/07-strained.png` | `673edb019c368d64013304e469fd7ee157a8a4efbe6a7b0680b5c1cde531ea2f` |
| `assets/characters/expressions/starfish/07-hungry.png` | `89d3ece7ff60c5d8df49e5814504578e26ce29c169af0c8bfc3167b49a8dc375` |
| `assets/characters/expressions/starfish/07-sick.png` | `bcda48f5a4696bf99d7c2734755226ae8032f30d89b03a9b41726fc3441df7ff` |
| `assets/characters/expressions/starfish/07-tired.png` | `4b13d13a8ea70deb00d0d4e868b9b90647e7108100ce82aa7252751f0622d827` |
| `assets/characters/expressions/starfish/07-sulky.png` | `2519379c1ecc97cda75355618e614081471e54190f7f137e8054455c099c1a6f` |
| `assets/characters/expressions/starfish/07-weak.png` | `48158e006a39d89679a6935e8199b0404f538e2457380f7f4e4529fdf5dfc5ed` |
| `assets/characters/expressions/starfish/07-critical.png` | `0d3d2249244bff65a811f3fc474a218c7bee755410326fd180a3bef5cdb6f235` |
| `assets/characters/expressions/starfish/07-wantsPlay.png` | `0465c2c44903f91b67f23558e0e29ef73b7affdb4c1da5a1e98ef69a019bb004` |
| `assets/characters/expressions/starfish/07-sleeping.png` | `17ff52c39aab3cb1ddb7533bcab5392d033dfe6bfc7787d7f957b46bd246649d` |
| `assets/characters/starfish/08.png` | `36a836ac587a111176e781fc05b8cf05e2efc4271cbe1905dd5bb6360ee2b3b4` |
| `assets/characters/expressions/starfish/08-happy.png` | `12b0f356978fa07c29156057ef4076d969205176f25b7995d3f2712ecbe5be98` |
| `assets/characters/expressions/starfish/08-strained.png` | `5898ebaee16fa2a5e8f25c4236c4f16180f437cd5fd16370807baa6145887524` |
| `assets/characters/expressions/starfish/08-hungry.png` | `f5024a7f6f235e44618078ce77b09b08cb2c022dfab5c060845dbdcb84320452` |
| `assets/characters/expressions/starfish/08-sick.png` | `5347a0ee296fa4458fc0273386a9f743882cc727d7f2dd31fc2a9e12cadcaa2e` |
| `assets/characters/expressions/starfish/08-tired.png` | `882489220568bc1a09e3108021dd53ef7436f66b1a23978bed15ecfca87ea9d1` |
| `assets/characters/expressions/starfish/08-sulky.png` | `0fca46b69f95c67bab2b1cfff2414358bf7400303211d24334bb6aec0d1966b0` |
| `assets/characters/expressions/starfish/08-weak.png` | `b784efd5b848129025881db321263b4d4aea68eb86b9d365cbdcc61bc2ad1f13` |
| `assets/characters/expressions/starfish/08-critical.png` | `8fbfd9dd42a3b3f7bf01b5f7e82e435c85f4e9a8954c2e985014329e00b5313e` |
| `assets/characters/expressions/starfish/08-wantsPlay.png` | `b37ceff37448ece01886526efa42722b92c6596421a2a18ec28ddb37f0288921` |
| `assets/characters/expressions/starfish/08-sleeping.png` | `757d4d0eba59eafbaf31a6b50bd883374b7c74bc1f25429704e53b39c84da768` |

### 表示した合成シートのhash

| シート（audit-water内） | SHA-256 |
|---|---|
| `frog-01.png` | `0af908aa5a2b68e820ffd99e97ecc9ef04c64841466e70cc5f4b40d5e4e3ed31` |
| `frog-02.png` | `26f0534f63ce9c9bfd46856fac7fbda96c75072bdf1de8b3f193ce328ddb3e1f` |
| `frog-03.png` | `798e801341cc2e88236c7d722dab11c6065eb893e105d6b957f58f5a863d8bdb` |
| `frog-04.png` | `8183bc7a92321a509cee13cfac70810ea16902ec99ee7be9d9af3276b95ef1a7` |
| `frog-05.png` | `76d08b29845a4dc22a0ed56f46c17009bc2ab1ad4431e4a51ff587693ea9f50d` |
| `frog-06.png` | `6c93ff75e5c7caf0b4ff1290ee5ba384f290418c825305648415b64e811bde8c` |
| `frog-07.png` | `9ddcc4713da5902982a14f3ad062cb024c65fb9a1757cfb633d71fa401bde9d7` |
| `frog-08.png` | `df4c8e912e71fded230e925374aefff67da268e916a4004706c76b6a82bc179b` |
| `clownfish-01.png` | `ac0dd2240e9ed06dc57130eaa4ecc5244c2b359c8794130f82bf557f5171b050` |
| `clownfish-02.png` | `e9fbc5725a95dc8d745fe72fa02912851225d0bb63125770fd1dcba64ea3d2be` |
| `clownfish-03.png` | `4c03e16c368f6ee97d5f677e0bcf607ad04a127e1bf4734b3750b10da7e9b5e2` |
| `clownfish-04.png` | `c02da5950fdf0616b79cf8adaee11df681430334d1687cd5166ea0af818bce06` |
| `clownfish-05.png` | `9fcd6996f19020025a9a5054dcf9ee068d984a1f083034694d95dcb80a865ebb` |
| `clownfish-06.png` | `c145c1063a61bfb6180abc34c0355fba3fbf2cc314cb2c1f04c27b83eab0a945` |
| `clownfish-07.png` | `cdd27a72e124f75ce42c4f894bf44105a8e92b6f0ca5e6130170654b2bde9fe7` |
| `clownfish-08.png` | `9551ae91fad1cf97f32d2823c81b308700a2a3a798d40076701680fe2c611168` |
| `salmon-01.png` | `b56dbbb6889974f1b4fd5b158b984bfb1841bdaf9d692e787add2364392b2e19` |
| `salmon-02.png` | `da22881b8868a5790e211655375a120ecc7bf0b3648bcd752fea531da45daf01` |
| `salmon-03.png` | `a1422ca84c64f4842b6d3f6d0872e492e5ab5e2d7b5eb977e26637a0471515cf` |
| `salmon-04.png` | `162801bae627d015a6458e4ad8bcb66ddcc6ba440abbf2d5d644ba42b6bfc363` |
| `salmon-05.png` | `0b0934aa31c2800e5e6ec9bfcaa4755e9e639e1a923a1bafcb20473f310787ea` |
| `salmon-06.png` | `5222f56a2ac6c11f0eb37017fd47f72e3de8b324f6b3fb8f0e2c1f93eee9e80d` |
| `salmon-07.png` | `467bc0953d5ea57592b1308a473ab44a7555329e77cc2383bed34f8c95229dd6` |
| `salmon-08.png` | `8e21d7d36b5324999d8cd32655d0d6d2527575a8bd11af89528cf555767347bd` |
| `hermit_crab-01.png` | `a3d462826a8a0ea3eb7dbbdd24c130af277f484a192015611a87c326ed7fe9f2` |
| `hermit_crab-02.png` | `ce8e3b437835aca3de0ffa7c789c6179500e1f3eb426394674fde3541a39fcec` |
| `hermit_crab-03.png` | `366431835bd89c5f18853164211cd5e0e25705fe0579d4abbcc5d8ff7385f3f5` |
| `hermit_crab-04.png` | `b7590eb0a202f8fe78de77c35e9595549e3acb035eada5c1fe447db9f53582c4` |
| `hermit_crab-05.png` | `dd89468a8f336e2874ce78fa94bc50c62900c7f5ab2a66a54123c9f4e4d3a28d` |
| `hermit_crab-06.png` | `ba136d41f98645f9bc31012e16cdcc854a6ac7411e8cde4f25185e5ba48e8e8a` |
| `hermit_crab-07.png` | `6335394a5b99130accd14f902c5144020726dd17df882246c33938972aa575d9` |
| `hermit_crab-08.png` | `606145fb85d69db6fa0020ade47fa6ba9ae3534ecc5d752ca7546d986c7c2b8f` |
| `jellyfish-01.png` | `ee912cf7a84a2460af30271be1195ffc701d2fb6555eee5ea181bec266692391` |
| `jellyfish-02.png` | `b35a4faf63480ce988bca83ee3319931cba98782710296b24b3c4efd174d8036` |
| `jellyfish-03.png` | `de69974a967b31050e3b9fe5bf18503af47fe9fb5bb9cdd354e4a2d433d743cc` |
| `jellyfish-04.png` | `25e4e6141cbaa9298ba2da0d7a0ea70224251816327078a64dadbb1535d81e7a` |
| `jellyfish-05.png` | `fe0d3aea051c18fb7f10c87ca10448b89d381788581553378ee1fc23dcc9d65a` |
| `jellyfish-06.png` | `d62f915de99f48f58f662c02837ca6afda34a9ebe9531659a18921d5d0230da5` |
| `jellyfish-07.png` | `cc79b479c81defbf3df6ac9421a5fe4376043b1edc0a9431d1d39ebfe4698de6` |
| `jellyfish-08.png` | `b42b3c5274378df7a2c2bd69916476e1d28de791d18bf8160614e155b9094bda` |
| `starfish-01.png` | `a197a5d24e551d325d3f424cac1b53e915ed87901f4ed43a58b39a1b6da07f61` |
| `starfish-02.png` | `7541fbce3fcb53c8b8ec00b660ae8f502477ae76849968ec29abea8f2d071593` |
| `starfish-03.png` | `3636ff2e784bb0d90b5098bf85c31838a3e5c219eb8ba3f855c2132f85a2eda7` |
| `starfish-04.png` | `fdc84e820ed8ed5521c08c73c81305e53f3b94b7c710e61616d15362fc70ec0a` |
| `starfish-05.png` | `1219996a5587fa7fc94e8690b1ed40326398f90f3f1e7e22d69304398ee374e1` |
| `starfish-06.png` | `2e207600ff46aed0180d1bcfbe72a9b317e5a1fef7eddad20c2177508334f609` |
| `starfish-07.png` | `b2cb4aa5bd8f6057a37343b9e1ab17128db2d99f276b303fe07ac115ad57df3f` |
| `starfish-08.png` | `d8ffab1841f40850d2ced489655fe7e1471cee359361a4101c46ea103156a8cb` |
| `salmon-01-raw.png` | `80a408715a4bc14022e8809056c8cb71daf56683993af0dd4b4376745d071cc3` |
| `salmon-02-raw.png` | `8ca3ef7ef420b494452076c62d18804a033203b394733215a42c587052853248` |
| `salmon-03-raw.png` | `9bdc9ffdfeebc6bfe93d603998d6d6caf9d1f6803bbca830b94342c0d8bd46f3` |
| `salmon-04-raw.png` | `351401281e3fb40cdf5ccb35b7b442da73d9587f44261da4c85f3a7755cb04fd` |
| `salmon-05-raw.png` | `b4cd0ffab90792e7c0f78a0b6a296702439f2ff87c1c173b1632bced48a559f5` |
| `salmon-06-raw.png` | `a2ecabbf011095787b630550180a9bd3ff87398ee3b47c6657f812a755ff93b3` |
| `salmon-07-raw.png` | `67631e55300b0f62909130e61b404da95c52edf84a84f63d0d4beb490fc1f912` |
| `salmon-08-raw.png` | `d798ece08449f44e5229a0aa8b1b1828bfe7a166f416c847618982fb5a79391c` |
| `hermit_crab-01-raw.png` | `f2728cd04c6953751d2cec6f0fe5b24769cfb93f07b8bf1d76dbc0a72fc84281` |
| `hermit_crab-02-raw.png` | `21706956565ce9dd746703f9941edf24d774dee0f2bddfa59836d35e98ee49d9` |
| `hermit_crab-03-raw.png` | `d63568f02f0d993462dd2141923811098157a4384381e8e2c3b623f7edfcee49` |
| `hermit_crab-04-raw.png` | `3f8e7bdc8d6252c421e8c23d631f5f215ad3da8bee000faca08ca8a487b9ee6d` |
| `hermit_crab-05-raw.png` | `6c225ca8b4c071f66ea4ecd00153966c38e9be3ffd92a0d113171713401d9360` |
| `hermit_crab-06-raw.png` | `e6bac4050a396ba1fc77cb3ffb4413fb36c381af445b18878108c23281226373` |
| `hermit_crab-07-raw.png` | `b399571e67f4fdef184a6cd71c0420487bb88e2991d4050923b6484c8834bffc` |
| `hermit_crab-08-raw.png` | `7f2286c07c3e93dcaf0cf41ba17fefd98989d8d8627dfc3e1a6dc533611a0a08` |
| `jellyfish-03-raw.png` | `70583eaba7b0057ee021ce1a498eb8576ac93abc6c0bdb61c3c8df09a226ef12` |
| `starfish-08-raw.png` | `9560e4e20a2951c9ffcfdd11fa20e634567d4e6a6a1b3bc3176b7e1660fb7860` |
