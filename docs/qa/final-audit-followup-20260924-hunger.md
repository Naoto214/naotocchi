# 空腹マーク：31系統の候補表（未採用）

実装を変更していない。個別に指定された食物の形と、正本に確定した食性を区別する。魚fallback23系統中、猫・ペンギン・サケに魚記号の個別指定があり、ヤドカリにdefault継承の明記がある。残る19系統は今回参照できた正本・QAで個別の食物意図未確認。未取得の会話まで「決定なし」と断定しない。

既存8override＋魚選択根拠のある3系統を維持案とする。残り20系統は候補提示のみ。5種の既存SVGを再使用し、植物由来の餌（葉・汁）、植物の養分、必要なら抽象養分・菌類用基質を共用する。8〜9程度の意味カテゴリ、葉と汁を別絵にした場合は9〜10程度の図形案。確定数ではなく、特殊系の選択で変わる。段階別切替は追加案にとどめ、今回は新システムとして決めない。

|系統名|現在のマーク|表示指定の根拠／実装経路|現行キャラ設定|推奨カテゴリ|推奨マーク（案）|既存共用可否|専用化の価値|理由・要判断|出典|
|---|---|---|---|---|---|---|---|---|---|
|ねこ (cat)|魚|個別の魚アイコン指定 / ACCENTS.hungry fallback|猫の全8人生段階。魚が主食という成長文はない。|魚|魚を残す|既存SVG|不要|承認済み猫の記号として最も根拠が強い。実装上はfallbackでも、意図まで未定ではない。|character-world-master.v1.js:25 / docs/qa/emotion-visual-approved-baseline-20260915.md:15 / pet-expression.js:336,373-387|
|いぬ (dog)|フード皿|個別指定・保全対象 / explicit override|子犬から老犬の8段階。|皿|フード皿を残す|既存SVG|不要|ユーザーが残す指定済み。中身を新たに肉等へ限定しない。|character-world-master.v1.js:24 / docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:23 / pet-expression.js:336,373-387|
|おとこのひと (man)|ごはん茶碗|個別指定・保全対象 / explicit override|人間の男の一生。|米飯|ごはん茶碗を残す|既存SVG|不要|既存共用人間アイコンが意図と合う。|character-world-master.v1.js:22 / docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:51 / pet-expression.js:336,373-387|
|おんなのひと (woman)|ごはん茶碗|個別指定・保全対象 / explicit override|人間の女の一生。|米飯|ごはん茶碗を残す|既存SVG|不要|既存共用人間アイコンが意図と合う。抱え猫はこの食物の主語ではない。|character-world-master.v1.js:23 / docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:51 / pet-expression.js:336,373-387|
|ペンギン (penguin)|魚|個別の魚アイコン指定（制作QA記録） / ACCENTS.hungry fallback|ひな→換羽→老ペンギン。よく食べるとは書くが食材は未指定。|魚|魚を残す|既存SVG|不要|魚という個別表示選択の記録がある。ただしユーザーによる食性設定ではない。|character-world-master.v1.js:26 / docs/qa/penguin-turtle-expressions-20260916.md:14 / script.js:664-673 / pet-expression.js:336,373-387|
|かめ (turtle)|フード皿|個別指定・保全対象 / explicit override|甲羅を背負うかめの8段階。|皿|フード皿を残す|既存SVG|不要|種類や草食性等を勝手に限定せず既存皿を保つ。|character-world-master.v1.js:27 / docs/qa/penguin-turtle-expressions-20260916.md:14 / pet-expression.js:336,373-387|
|かえる (frog)|虫|個別指定・保全対象 / explicit override|おたまじゃくし→しっぽ付き→陸上のかえる。|虫|虫を残す|既存SVG|不要|8段階共通の象徴として維持。全段階が現実に同じ食事という主張はしない。|character-world-master.v1.js:28 / docs/qa/frog-clownfish-expressions-20260916.md:15 / script.js:684-693 / pet-expression.js:336,373-387|
|カクレクマノミ (clownfish)|餌粒|個別指定・保全対象 / explicit override|群れ・卵を守るオス・メスへの変化の人生。|小さな餌|餌粒を残す|既存SVG|不要|共有の水中の餌記号の基点にできるが他種への展開は表示上の提案。|character-world-master.v1.js:30 / docs/qa/frog-clownfish-expressions-20260916.md:15 / pet-expression.js:336,373-387|
|さけ (salmon)|魚|個別の魚アイコン再使用指定 / ACCENTS.hungry fallback|川→海→遡上、銀色から赤色へ。よく食べるが食材未指定。|魚|魚を残す（餌粒への統一も選択肢）|既存SVG|不要|正本に魚の再使用指定あり。魚食の物語設定として扱わない。 選択肢: 他の水中系と餌粒へ共通化|character-world-master.v1.js:29 / docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:86 / docs/superpowers/plans/2026-09-16-salmon-expressions.md:30 / script.js:694-703 / pet-expression.js:336,373-387|
|ヤドカリ (hermit_crab)|魚|default継承を明記（食性根拠なし） / ACCENTS.hungry fallback|貝殻の家を選び、引越しながら成長。水棲/陸棲や餌は未指定。|皿|共通フード皿へ|既存SVG|不要|要判断。魚を選び直した根拠ではなくdefault継承。汎用の食事皿なら特定の食性を新設しない。 選択肢: 水中餌粒へ共通化|character-world-master.v1.js:36 / docs/superpowers/plans/2026-09-16-hermit-crab-expressions.md:12 / script.js:744-753 / pet-expression.js:336,373-387|
|クラゲ (jellyfish)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|岩のポリプ風→重なり→星形→かさ。食材未指定。|小さな餌|水中の小さな餌粒（表示の抽象化）|既存SVG|不要|要判断。既存餌粒を海の小さな餌の記号として再使用できる。全段階の実際の餌を断定しない。 選択肢: 餌の微粒子専用形状は、水中3系統で共用価値を確認してから|character-world-master.v1.js:37 / script.js:754-763 / pet-expression.js:336,373-387|
|ヒトデ (starfish)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|丸い幼体→星形→海底の大きな星。貝を食べる設定はない。|小さな餌|水中の小さな餌粒を第一案|既存SVG|低い|要判断。魚の必然性がなく、共通水中餌で制作を抑えられる。 選択肢: 貝の餌記号：種別食性を決めた場合のみ。専用化は現時点では低優先|character-world-master.v1.js:38 / script.js:764-773 / pet-expression.js:336,373-387|
|サンゴ (coral)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|その場で増え広がる群体。枝間を魚が通る。|小さな餌|水中の小さな餌粒（表示の抽象化）|既存SVG|不要|要判断。魚が通る物語を魚を食べる設定に読み替えない。既存粒を共用可能。 選択肢: 養分の抽象記号：水中系でまとめて設計する場合|character-world-master.v1.js:39 / script.js:774-783 / pet-expression.js:336,373-387|
|ちょう (butterfly)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|幼虫は葉に食べ跡を残す。さなぎを経て成虫は花を巡る。|植物由来の餌|幼虫は葉、成虫は花蜜/樹液共用のしずくを候補|候補ごとに既存SVG再使用または共用新作。未決定|中（系統専用でなく葉＋汁の共用）|要判断。葉食は明示。成虫の花巡りは明示だが花蜜を飲むとは未記載。全8段階を1食物へ無理に固定しない。 選択肢: 系統共通で葉のまま：生活史の代表記号と明記 / さなぎ04/05は中立の栄養記号または系統共通記号。食べる生態だと説明しない|character-world-master.v1.js:31 / script.js:714-723 / pet-expression.js:336,373-387|
|カブトムシ (beetle)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|幼虫→さなぎ→成虫。06は夜の樹液に一番乗り。|植物由来の餌|樹液のしずく（植物由来の餌）|候補ごとに既存SVG再使用または共用新作。未決定|不要（汁記号を共用）|要判断。魚より樹液の物語根拠が明瞭。ただし幼虫/さなぎまで樹液食とする根拠はない。 選択肢: 段階別にするなら幼虫/さなぎは中立栄養記号|character-world-master.v1.js:32 / script.js:504-513 / pet-expression.js:336,373-387|
|クワガタムシ (stagbeetle)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|土の幼虫→さなぎ→成虫。あごの個性と夜の姿。|植物由来の餌|樹液系のしずくを共用候補|候補ごとに既存SVG再使用または共用新作。未決定|不要|要判断。カブトとの共用案で、現行文に樹液食の明示はない。承認後の表示解釈として扱う。 選択肢: 汎用フード皿なら食材の新設不要 / 幼虫/さなぎの段階差を設けるか確認|character-world-master.v1.js:33 / script.js:514-523 / pet-expression.js:336,373-387|
|セミ (cicada)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|幼虫は根のそばで暮らし、成虫は枝で鳴く。|植物由来の餌|植物の汁を表すしずくを共用候補|候補ごとに既存SVG再使用または共用新作。未決定|不要|要判断。根や枝は明示、吸汁の明示ではない。植物由来の餌という表示意図を決める必要あり。 選択肢: 汎用栄養記号|character-world-master.v1.js:34 / script.js:724-733 / pet-expression.js:336,373-387|
|アリジゴク (antlion)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|砂のすり鉢の穴→まゆ/さなぎ→羽のあるウスバカゲロウ。|虫|虫を共用する案（まず幼虫）|既存SVG|不要|要判断。幼虫・成虫で姿が大きく違う。全段階で虫食と新設定しない。 選択肢: 全段階を系統の代表として虫 / 幼虫は虫、まゆ/成虫は中立の餌・汁記号。成虫食性は未決定|character-world-master.v1.js:35 / script.js:734-743 / pet-expression.js:336,373-387|
|タンポポ (dandelion)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|葉が光を浴び、花→綿毛→旅立つ種。|植物の養分|植物の養分：日光＋水の組合せを候補|候補ごとに既存SVG再使用または共用新作。未決定|中（植物共用なら価値あり）|要判断。食べる葉ではなく植物を養う記号へ。水単独は喉の渇き、太陽単独は天候と混同しやすい。 選択肢: 土/養分の小袋 / ゲーム共通の養分皿。種段階を含め代表記号として扱う|character-world-master.v1.js:40 / script.js:784-793 / pet-expression.js:336,373-387|
|サクラ (sakura)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|芽→枝→つぼみ→花→実→古木。|植物の養分|植物の養分：タンポポと共用|候補ごとに既存SVG再使用または共用新作。未決定|不要（共用）|要判断。自分の葉や実を食べるという意図はない。木を養う表示へ。 選択肢: 日光＋水 / 土/養分の記号|character-world-master.v1.js:41 / script.js:794-803 / pet-expression.js:336,373-387|
|ハエトリグサ (venus_flytrap)|虫|個別指定・保全対象 / explicit override|捕虫葉を持ち、08は高い花と食事の場所が別。|虫|虫を残す|既存SVG|不要|frogの虫SVGを意図的に共有。今回保全対象。|character-world-master.v1.js:42 / docs/qa/venus-flytrap-expressions-20260922.md:35 / script.js:804-813 / pet-expression.js:336,373-387|
|キノコ (mushroom)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|粒→糸→子実体→胞子→老いたかさ。特定の栄養様式は未設定。|菌類の養分（要選択）|未確定：中立の養分を第一案|候補ごとに既存SVG再使用または共用新作。未決定|条件付き（菌類という誤解防止に価値）|要判断。植物と同じ日光を機械適用しない。腐葉土・朽木も既定の食性とは言えない。 選択肢: 養分の皿：食材未指定のゲーム記号として既存皿を再使用 / 土/朽木：この菌がそこから養分を得る設定にする場合のみ新共用記号|character-world-master.v1.js:43 / script.js:814-823 / pet-expression.js:336,373-387|
|りゅう (dragon)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|煙・翼・宝物集め・大きな体。肉食/魚食設定なし。|皿|汎用フード皿を第一案|既存SVG|低い|要判断。ファンタジーだから肉と断定しない。皿なら既存を使い食材を決めずに済む。 選択肢: 肉を明示したいなら肉記号（新しい設定選択） / 魚好きに決めるなら既存魚継続|character-world-master.v1.js:46 / script.js:544-553 / pet-expression.js:336,373-387|
|フェニックス (phoenix)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|火の鳥、燃え尽きて戻る。火を食べる設定なし。|小さな餌／幻想の養分（要選択）|未確定：普通の鳥として小さな餌、または幻想の養分|候補ごとに既存SVG再使用または共用新作。未決定|低～条件付き|要判断。火の姿・再生と火食を分ける。普通の食事なら既存粒/皿を使える。 選択肢: 普通の鳥として種/餌粒 / 炎や光の養分：作者が設定を選ぶ場合のみ|character-world-master.v1.js:47 / script.js:654-663 / pet-expression.js:336,373-387|
|かみさま (god)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|光の粒→精霊→かみさま→光そのもの。祈りが届くが食べるとはない。|米飯／幻想の養分（要選択）|未確定：象徴的なごはんを第一案|候補ごとに既存SVG再使用または共用新作。未決定|低～条件付き|要判断。祈りや信仰を食料と断定しない。人型だけを根拠に人間と同一食性にしない。 選択肢: 供えたごはん：既存米飯を使う、供物の解釈は要決定 / 光の養分：新設定になるため要確認 / ゲーム共通の食事皿：実際の消化を意味しない抽象化|character-world-master.v1.js:48 / script.js:614-623 / pet-expression.js:336,373-387|
|世界樹 (world_tree)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|光る芽、声のする枝、雲を越え、世界を支える木。|植物の養分／幻想の養分（要選択）|未確定：植物の養分を第一案|候補ごとに既存SVG再使用または共用新作。未決定|不要～条件付き|要判断。光る木であることは光を食べる設定ではない。普通の樹木性と幻想性どちらを使うか決める。 選択肢: 日光＋水：普通の植物としての代表記号を共有 / 土/養分：植物用記号を共有 / 特別な光/魔力の養分：物語追加を選ぶ場合のみ|character-world-master.v1.js:49 / script.js:824-833 / pet-expression.js:336,373-387|
|おばけ (ghost)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|たましい→いたずら→壁を通る→最後に薄くなる。|米飯／皿／幻想の養分（要選択）|未確定：象徴的なごはんを第一案|候補ごとに既存SVG再使用または共用新作。未決定|低い|要判断。魂・人の生命を食べる設定はない。一般のおばけ伝承をこのキャラの正本にしない。 選択肢: お供えごはん：米飯再使用、供物という意図は要決定 / おやつ/ごはんの気分：皿を再使用 / 光の養分：採用時にだけ設定を定義|character-world-master.v1.js:50 / script.js:834-843 / pet-expression.js:336,373-387|
|ほし (star)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|雲→集まる→光る→膨らむ→はじける→なごり。|幻想の養分（要選択）|未確定：物質/エネルギーの抽象的補給を候補|候補ごとに既存SVG再使用または共用新作。未決定|条件付き（他特殊系と共用優先）|要判断。光っているから光を食べるとしない。科学的恒星の燃料や実際の摂食を勝手に追加しない。 選択肢: 抽象的な養分粒/核：既存餌粒の意味変更を選択 / ごはんを想像する擬人化：既存皿 / 光/星屑専用記号：物語追加とhappyの輝き混同を検討|character-world-master.v1.js:51 / script.js:844-853 / pet-expression.js:336,373-387|
|ぬいぐるみ (plush)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|新品→遊び相手→汚れ→ほつれ→つぎはぎ→宝物。|皿（ごっこ遊びの食事）|未確定：ごはんごっこの皿を第一案|候補ごとに既存SVG再使用または共用新作。未決定|低い|要判断。綿や糸を食料にしない。修理と空腹、かまってを混同しない。 選択肢: ごはんごっこの皿：既存共用 / 魔法で食べるぬいぐるみ：米飯/小さなお菓子。新しい物語選択 / 愛情で満たす：空腹とwantsPlayの意味が変わるため別の設計判断が必要|character-world-master.v1.js:52 / script.js:854-863 / pet-expression.js:336,373-387|
|？？？ (unknown)|魚|fallback・個別食物意図未確認 / ACCENTS.hungry fallback|点→ぷる→足？目？羽？→大小→点。正体を決めない設計。|皿／幻想の養分（要選択）|未確定：食材を特定しないごはん記号|候補ごとに既存SVG再使用または共用新作。未決定|低い|要判断。形状から植物・動物・神的存在に固定しない。？単独では空腹が読めない。 選択肢: 共通ごはん皿：ゲーム上の抽象的食事 / 正体不明の養分粒：既存粒を抽象化 / 段階ごと変化：不明性を保つが31種専用化より工数増、低優先|character-world-master.v1.js:53 / script.js:864-873 / pet-expression.js:336,373-387|
|れんくん (ren)|ごはん茶碗|個別指定・保全対象 / explicit override|実在参照の同じ一人の人間、幼少から老年。|米飯|ごはん茶碗を残す|既存SVG|不要|人間という明示的理由で米飯を共用している。|character-world-master.v1.js:56 / docs/qa/ren-expressions-20260923.md:13 / script.js:624-633 / pet-expression.js:336,373-387|

## 特殊系の判断



- 世界樹：普通の植物の養分を代表させるか、固有の幻想的資源を新設定するか。光る・精霊がいる・世界を支える、は光食の根拠ではない。
- キノコ：中立の養分か、土/朽木由来か。現行正本は菌糸・胞子を描くが栄養様式は決めていない。太陽/葉を機械配布しない。
- おばけ・かみさま：供え物（既存米飯）か、ゲームの抽象的食事（既存皿）か、幻想的資源か。魂・生命・信仰を食べるとは決めていない。
- 星：抽象的補給か、擬人化したごはんか。恒星の科学的燃料を新しいゲーム設定として投入しない。
- ぬいぐるみ：ごはんごっこなら既存皿が最少工数。綿や糸は修理材、愛情はかまってとの混同を生むため自動採用しない。
- ？？？：正体不明のまま満たせる食事の抽象化を選ぶ。？を置くだけでは空腹の記号にならない。
- フェニックス・竜：鳥/動物的な食事か幻想的な養分か。炎をまとう・煙を吐くことは炎を食べる証拠ではない。

成長段階による意図差が大きいのはbutterfly、beetle/stagbeetle、antlion。全8段階1記号を系統の代表として使うか、2～3段階群へ分けるかを先に決める。現実の昆虫の食性を追加する場合は種を特定して一次資料を調べる必要があり、本監査はその未調査事項を生態学的確定事実として書いていない。

魚の個別保持根拠：猫は baseline:15（:45に猫の表情/マーク/配色のユーザー確定）、ペンギンは penguin-turtle QA:14（制作判断の記録に留まる）、サケは expression spec:86（再使用の指定）。サケを餌粒へ統一する案も可能だが、「今まで意図なしだったので必要修正」とは言えない。ヤドカリ plan:12 は『defaultを継承』と明記するので、個別に適切さを検討済みという証拠にはしない。

確認したのは対応ロジック、正本31行、該当の成長文、空腹に関する正本/計画/QAの限定検索。全2480画像の再監査・画像生成・コード変更は実施していない。

## 当時のGitHub履歴による限定照合

- `d8952c54179dccf737410c489741887d81577c62`：ペンギン魚・カメ皿を当時の制作QAに記載。食性の設定とは別。
- `7c7f2c90298813ced153a04a7f7451ff4287c38d`：サケの既存魚マーク再使用を当時計画とQAに記載。
- `b7d969e5c43c63fad46c0665d68642c84cfc01b4`：ヤドカリdefault魚継承を当時計画とQAに明記。
