# 通常育成キャラクター表情編：最終横断監査（2026-09-23）

## 完成判定

**NOT GREEN / 修正方針の確認待ち。通常育成キャラクター表情編を完成扱いにしてはいけない。**

31系統・248段階・2480表情の資産は完全で、実装から参照できる。しかし独立した全数目視と同時状態監査により、過去の個別PASSでは見落とされた原姿保持差、空腹マークの個別意図不足、病気と別表情を同時表示した際の汗とマークの重なりを発見した。機械検査成功や旧QAを完成判定の代用にしない。

設定が変わる複数の修正案がある場合は修正前停止する、という今回のユーザー指示に従い、制作画像・マーク・resolverを修正していない。修正0件は問題0件を意味しない。新規生成・再生成・局所画像編集は0枚。なおと、なかま、こいびとの表情制作を開始せず、PR278をDraft/open/未マージに維持する。

## 基準と独立性

- GitHub HEAD: `a2eb319893caca94467f474e2bf17a152d67d0fc`
- GitHub / 検証ローカル tree: `d0399d249c82dd74159fdd8ac592e0d1bd405204`
- 実main: `6191f7624808b783a90a5813097a216a08c23278`。PR APIのbase SHA `3f4bfda0...`とは区別。main取込み・競合解消なし。
- ローカル保存履歴のHEAD `80e1be399373cf40db0ebb5c57886711d985f9c6`はリモートHEADと異なるがtreeは完全一致。この旧ローカル履歴をリモートへpushしない。
- 初期PR278: Draft=true / open / merged=false / mergeable=false。初期HEADのActions/statuses/check-runsはいずれも0件。未実行を成功扱いしない。
- `character-world-master.v1.js`のnormal22＋rare8＋secret ren1を独立母集団にした。author naotoは除外。31系統を単にexpression allowlistから数えたのではない。
- 主担当の資産・履歴・非変更検査、5名の生成非担当による分担全数目視、別担当の実装/実到達監査、追加の正本hash/provenance監査を統合。主担当も具体的問題の比較画像を再表示して評価し、antlion08を成長文で再確認して断定を修正した。

## 1. 資産完全性

|項目|結果|
|---|---:|
|対象系統|31|
|対象成長段階|248|
|各段階の非通常表情|10|
|期待現役表情数|2480|
|実在・接続済み現役表情数|2480|
|欠損・誤配置/誤参照・重複route|各0|
|ファイル内容重複・復号pixel重複|各0|
|命名規則違反・未分類余剰・孤立|各0|
|表情フォルダの物理ファイル数|2484|
|意図的保持の成猫旧版|4|
|通常PNG総数（監査対象外を含む保持確認）|297|

旧4枚はcat06 happy/sleepingのv1/v2。`cat-expression-distinct-art-20260915.md`に旧資産保持とv3使用が明記され、active2480から除外する。旧版は重複した現役表情や出所不明の孤立ファイルではない。「物理PNGも2480」とは報告しない。4枚もhash不変を検査した。

各PNGは128×128 RGBA、alpha0/255、元画像の不透明boundsと一致。bounds一致は身体姿勢や意味の一致を証明しないため、別途全数目視を行った。再現コマンド：

```sh
node tools/audit-expression-completeness.cjs docs/qa/final-cross-audit-20260923-assets.json
```

状態IDはruntime抽出集合に加えて、正本の固定10集合へ独立照合。配置keys/状態keys/顔anchors/段階名も照合し、人間previewの（男）/（女）表示補足だけを許容。checkerはゲームを書き換えない。

|系統ID|表示名|段階|期待|実数|
|---|---|---:|---:|---:|
|man|おとこのひと|8|80|80|
|woman|おんなのひと|8|80|80|
|dog|いぬ|8|80|80|
|cat|ねこ|8|80|80|
|penguin|ペンギン|8|80|80|
|turtle|かめ|8|80|80|
|frog|かえる|8|80|80|
|salmon|さけ|8|80|80|
|clownfish|カクレクマノミ|8|80|80|
|butterfly|ちょう|8|80|80|
|beetle|カブトムシ|8|80|80|
|stagbeetle|クワガタムシ|8|80|80|
|cicada|セミ|8|80|80|
|antlion|アリジゴク|8|80|80|
|hermit_crab|ヤドカリ|8|80|80|
|jellyfish|クラゲ|8|80|80|
|starfish|ヒトデ|8|80|80|
|coral|サンゴ|8|80|80|
|dandelion|タンポポ|8|80|80|
|sakura|サクラ|8|80|80|
|venus_flytrap|ハエトリグサ|8|80|80|
|mushroom|キノコ|8|80|80|
|dragon|りゅう|8|80|80|
|phoenix|フェニックス|8|80|80|
|god|かみさま|8|80|80|
|world_tree|世界樹|8|80|80|
|ghost|おばけ|8|80|80|
|star|ほし|8|80|80|
|plush|ぬいぐるみ|8|80|80|
|unknown|？？？|8|80|80|
|ren|れんくん|8|80|80|

## 2. 元画像と既存表情の保持

表情制作開始前 `dab89b129efc38bb0db70d6b75f795d9c2bf52d5` の全通常PNGパス集合と現在297件が一致し、297件すべてGit blob SHA一致。今回対象248元画像だけでなく、監査対象外49枚の削除/追加も検出する。全297のSHA256/Git blob証拠をassets.jsonへ収録した。

今回開始treeから現役2480＋旧4表情も全hash不変。ゲーム数値・成長条件・セーブ・カードゲーム・アイテム・ストーリー・なかま・こいびと・naoto・通常画像・runtime・配置・キャッシュを変更していない。

ただし「通常ファイルが変わっていない」と「生成した表情が原画意匠を保っている」は別命題。後者の差は以下の指摘へ記録し、前者のhash一致で隠さない。

## 3. 10表情と意味

|ID|正本の意味|別レイヤーマーク/色/位置|
|---|---|---|
|happy|喜び、細めた目と開口笑顔|金のキラキラ・右上|
|strained|いやだ・つらい、過食/不要薬等への拒否|銀の折れ線・左上|
|hungry|食べたい/空腹|黄の食物と思考泡・右上|
|sick|病気のつらさ|黄緑横線・右上、汗は頭の左右|
|tired|疲労、重いまぶた|紫の大小丸・右上|
|sulky|不機嫌/すねる|水色の雲・右上|
|weak|いのち低下/強い健康低下|桃色の下矢印・右上|
|critical|いのちの危険/強い脱力|太い赤下矢印・右上|
|wantsPlay|かまって/呼びかけ|橙の線・顔中央上|
|sleeping|穏やかな閉眼/わずかな微笑|青Zzz・右上|

通常normalは11枚目の生成表情ではなく元PNG。小顔の不調系やworld_tree04-criticalの口など、顔だけでは区別が弱い例を各目視記録に明示。マーク込みの識別とPNG単体の識別を混同しない。自然な表情差を均一顔へ変更していない。

## 4. 検出した問題と最小修正案

|ID|問題/原因|対象|現時点の判定と次の最小作業|
|---|---|---|---|
|F01|生成時に上げた前足が接地化。同bounds検査は姿勢差を検知しない|dog03 wantsPlay・1枚|必須修正。元の前足姿勢を復元し、現在のかまって顔は保持。対象1枚のみ。|
|F02|金色の粒状軌跡が濃い連続弧へ変質|antlion07 strained/hungry/tired/weak/critical・5枚|必須修正。元画像の軌跡に限定して復元し、顔/翼/他5状態は保持。|
|F03|08の薄い斜線・粒から太い枝へ変化。planはgolden trails、成長文/QAは枝を明記|antlion08・全10枚|修正方針要確認。棒を捏造したと断定しない。原画の細い枝＋粒を保持する案と、成長文の枝として意図的差を許容する案を勝手に選ばない。|
|F04|原画右下の極小泡1つが欠落（5→4）|starfish08・全10枚|小物保持の軽微修正候補。all original bubbles保持指示との不一致を開示。顔の意味や生体数の不具合ではない。|
|F05|空腹のdefault魚を広い系統へ継承し個別意図の正本不足|植物/菌類/無生物6系統48hungry、昆虫5系統40hungry等|設定判断待ち。別SVGレイヤーの問題なのでPNG再生成不要。無生物/unknownの食性を監査側で勝手に定義しない。|
|F06|汗はisSick、顔はresolver別状態という独立条件。既存checkerはsick顔の汗だけ検査|病気とcritical/weak/sleeping/happy/strained/sulkyの併存|表示修正が必要。既存10表情PNGを再生成せず、現在マークと汗全動作を共に考慮した最小配置修正と同時状態検査を追加する。病気判定/ゲーム数値は変更しない。|

F01＋F02の明確なPNG修正対象は6枚。F03の要判断10枚、F04の軽微候補10枚を別集計し、重複なし計26枚。これらは未修正。F05/F06は別レイヤー問題でありPNG不良枚数へ加算しない。

F05の強い要意図確認6系統はdandelion/sakura/mushroom/world_tree/star/plush。昆虫5系統はbutterfly/beetle/stagbeetle/cicada/antlion。god/ghost/unknownも個別意図の確認候補だが、ここで無生物・食性と確定しない。魚を使う全23系統184段階が全て誤りという主張ではない。

## 5. マーク・汗の監査

既存 `node tools/check-expression-placement.cjs` は2480マーク/1488汗領域でissues0。ただし全状態併存の安全証明ではなかった。独立担当が実行経路から盲点を見つけ、cat03の病気を保持したcritical/weak/sleeping・実playWithBtnのhappy/sulky・実feedBtnのstrainedの6経路を再現した。

64/80/104論理pxの各248段階×6状態=1488組、計4464 state-size組をCSS形状近似（shadowなし、全移動を0.5px刻み）で検査。汗対マーク重なりは64pxで340、80pxで336、104pxで326組、合計1002 state-size組。サイズ重複を除いて346 stage-state組。104pxでは26系統102段階。これらはPNG不良枚数でも全端末で確定した件数でもない。代表例cat03 critical/sleeping/sulkyは主担当も現PNG/SVG/CSS近似合成を実表示し明瞭な重なりを確認。実機スクリーンショットではない。

全2480SVGは非空で所定方向。104viewBox外へ描画が出るもの1050件はCSS overflow:visibleによる設計上の描画であり、これだけで画面クリップと断定しない。実機iPhoneや全端末のviewportクリップ0は本監査では証明していない。

cat03/dog04/turtle等の従来開示済みの汗の頭上/遠方配置は既知制約として保持。新発見の同時表示衝突とは区別する。

## 6. 3分類と個別裁定

全248元画像と全2480表情を5担当が分担し実表示。単一身体/単一顔も未確認にせず段階別記録した。現在の複数構成分類はA10段階100表情、B7段階70表情、C4段階40表情、残り227段階は複数構成分類対象外。新たな分類曖昧例0。生体/顔の数を増減させる修正なし。

- A：jellyfish02、sakura05–07、venus_flytrap04–08、mushroom08（10段階）。クラゲ02の接続した重なりと単顔、ハエトリグサ06の単顔も構造確認として含む。現顔全体の同方向を確認。
- B：coral03–08、mushroom01。キノコ01は6粒全体が主役。
- C：woman08猫、clownfish05小魚2匹、dandelion08周囲5種、mushroom07独立胞子3個。身体状態を強制同期せず、周囲の穏やかな顔を機械的に心配顔へ直さない。
- unknown04の頭上2球は意図的に正体不明の器官。暗い中心/紫内輪/青外輪、輪郭・内部模様を保持し、睡眠時の瞼追加等なし。胴体既存顔のみで状態を表現。目/触角/感覚器官と確定せずA/B/Cに第四分類を追加しない。
- 物品/図柄/空殻：woman02ぬいぐるみ、man02/ren02服柄、hermit_crab03空貝殻、butterfly06/cicada05抜け殻を生体へ再分類しない。
- dragon06火炎、phoenix08灰/再生、god元の光、world_tree04幹模様、ghost08の細い発光姿/光輪/星/尾先光、star雲・破片・光輪、plush綿/補修/ハート、unknown07元橙3本、renおしゃぶり/番号26/球/鞄/杖等は各担当の段階表に全て具体的に記録。通常デザインを別レイヤーマークと混同しない。

## 7. 実装接続と正本整合

- production ALL_LINES/SPECIES・ディスクの8段階フォルダを独立母集団として31系統が一致。
- 2480 assetFor→実PNG、SVG接続が一致。248×(normal＋10)=2728描画をruntime harnessで実状態・意味イベントから到達確認。
- normal/未知状態は元PNG、非対応系統は従来画像。画像error時は元画像へ戻り、その失敗も既存fallback。happy/strainedは単なる固定状態ではなく一時反応。
- blocked→normal、sleeping優先、起床時criticalがreactionに優先する現resolver仕様を確認し変更しない。
- 全2480現役hashに既存正本記録がある。旧hash90件はmultiface81/dragon履歴8/phoenix旧review1として後続へ追跡でき、未解消stale0。raw生成元を再取得したとは主張しない。
- 現確認Siteの2781キャラクターPNGと主要7実装ファイルもGitHub基準treeのローカルと全件一致。

## 8. fresh検証と非変更

今回開始後のfresh `npm test` は **1838成功 / fail・cancelled・skipped・todo各0 / 812299.337478ms / exit0**。冒頭のsmoke/dialogue/visual QAも完走。生ログは `final-cross-audit-20260923-npm-test.log`。以後ゲームコード/PNGを変更していない。過去の結果を転記していない。

- 表情resolver/emotion/integrationのfocused4ファイル：918成功（asset/previewは全体npm testで検証）、失敗等0（独立runtime報告参照）。
- 独立状態描画：2728/2728一致、31系統/248段階。fallback・normal参照と実意味イベント経路を確認。
- 既存配置検査：2480マーク/1488汗領域、issues0。ただし同時状態検査F06は不合格。
- 独立完全性checker：2480期待/2480実数、issue0。レビューで検出した監査器の穴を修正しfresh再実行、通常297＋旧4hashを別担当が再照合。
- 3分類：全31系統目視、A100/B70/C40の分類矛盾0。食物意図保留は3分類PASSとは別。
- 正本/manifest：2480現在hash追跡、未解消stale0。旧90は合法な履歴。
- 通常画像297・現役2480・旧4非変更。ゲームコード/配置/数値/条件/セーブ/カードゲーム等のdiffは0。
- `git diff --check`成功。監査器 `node --check`成功。最終追加ファイルもstage後にdiff checkし直す。

成果物変更は監査docs/正本追記/読取専用監査器に限定。Siteは監査結果ページと一覧からのリンクのみ追加し、画像・既存選択保存KEY・ゲームコードを保持する。

## 9. 証拠と停止条件

- `final-cross-audit-20260923-assets.json`：31系統期待/実数、現役2480・元297・旧4hash、bounds、全route。
- `final-cross-audit-20260923-{animals,water,insects,multiface,rare}.md`：全248段階の実見/分類/個別裁定/所見/入力hashと静止合成hash。
- `final-cross-audit-20260923-runtime*`：独立接続/状態併存検査、再現script、結果、代表合成。
- `final-cross-audit-20260923-provenance.md`：正本の現hash・旧履歴の整合。
- `final-cross-audit-20260923-evidence/`：原画像併記の指摘比較と汗同時表示の合成。

必要な判断を得た後は対象だけを修正し、受理hash/manifest・影響箇所の独立目視・同時状態配置検査・fresh全体テスト・Site・GitHubへ接続して完成判定をやり直す。**今回のNOT GREEN保存をなおと制作開始の許可へ読み替えない。**


## 10. 確認Site・保存前最終検証

同じowner-private確認Siteへ監査結果ページと比較画像を追加。既存mark-reviewはリンク1行のみ追加し、ゲーム/全2781キャラクターPNG/選択保存KEY/既存2480静止一覧を保持。

- 監査結果： https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/final-audit/
- 全表情一覧： https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/
- source commit：`9a1c44d6ebce2eeeba8680a18a550d0115e7ea84`
- version：`appgprj_6aa908e9357c8191abb0f486be58697c~appgver_e0468914a3e88191b5b8d825a4319663`
- deployment：`appgdep_6ab3e3026ff88191960d76edf7cebe21`、status **succeeded**。
- GZIP：117065344 bytes / 3145files、SHA256 `fbea3335aed517aa9440409ceb32c13e9d137b05e2fb13e7ced90f44b6124d5b`。
- 全3145内容とfileset一致。packagerがroot設定から追加する `dist/.openai/hosting.json` はrootの設定とbyte一致。存在しないdist側原本へ比較した最初の1件差はpackagerの注入仕様で解消し、画像やsource不一致ではなかった。
- 新ページの全localリンク/画像存在、31系統表、実行scriptなしを検査。公開URLを実ブラウザで全件操作したという主張ではない。
- 独立runtime再現scriptを主担当も保存後のパスからfresh再実行：exit0、2480 mapping / 2728 reach / errors0、出力JSONは独立担当の保存JSONと完全一致。ここでerrors0は接続エラー0であり、別フィールドの汗衝突をPASSへ変えない。
- 最終独立文書レビューで主担当要約のghost08「杖」を事実誤記として修正し、「細い発光姿/光輪/星/尾先光」へ訂正。画像や設定は変更していない。件数・分類・判定・限界の残る修正必須指摘0。

最終GitHub保存HEAD/tree、保存後実main/PR状態/新HEAD CIは、保存オブジェクトをAPIで再取得してPR278の本監査節に記録する。自己のcommit SHAを事前に推測して本文へ記載しない。新HEADのCI0件/pendingは成功扱いしない。
