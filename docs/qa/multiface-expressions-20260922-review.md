# 完成済み21系統・複数顔の独立監査

監査基準: 新しいユーザー方針「1個体の複数顔は全顔で身体状態／同じ感情を共有する。自然な微差は可。別個体、抜け殻、顔のない部位は区別」。旧来の主役顔のみ変更・脇顔固定の合格とは別の新基準で判定した。

対象baseline: `471cb46f93d088cbdc9aa5eef0cab087067236b6`、tree `d28f1cd2f96e0e37b45835a7b133980751e7769f`。

読取専用監査。既存PNG変更・画像生成・ゲームコード変更なし。scratchにnearest-neighbor拡大と比較一覧だけ作成。21系統×8元画像の一覧を全て表示し、候補と除外確認対象18段階は元画像を個別128px／6倍で確認。明確候補10段階と境界候補dandelion08について既存10状態の一覧110コマを目視。これは全1680ファイルを個別再検査したという主張ではない。

## 結論

共有対象は10段階。各段階の `strained,hungry,sick,tired,sulky,weak,critical,sleeping` 計80枚は要修正。さらに `venus_flytrap/04-wantsPlay` は右捕虫葉が眠そうなままで期待状態に揃わず修正推奨。合計81枚。10段階のhappy全10枚、およびvenus04以外のwantsPlay9枚は自然な表情差として維持可能と判断し、最小差分のため再生成しない。

大きい目、小さい目、ウインク、閉じた笑い目、肯定的な驚き口の違いを機械的に不一致扱いしない。happyでは落ち着いた微笑・嬉しい驚きも許容。一方、身体状態6種と否定的感情2種では脇顔が元の楽しげな表情に固定されていることを状態非共有と判断する。wantsPlayは同じ肯定的な期待・交流意欲の範囲を許容し、明確な眠そうな脇顔は分けた。

## 21系統の元画像走査

| 系統 | 8段階の走査結果 |
|---|---|
| cat | 全段階1個体1顔。候補なし。 |
| dog | 全段階1個体1顔。候補なし。 |
| man | 全段階本人1顔。02胸のクマ風図柄は衣服装飾、車は玩具。生体共有対象にしない。 |
| woman | 本人1顔。02のウサギぬいぐるみ、08の抱え猫は別対象。除外。 |
| penguin | 全段階1顔。候補なし。 |
| turtle | 全段階1顔。候補なし。 |
| frog | 全段階1顔。左右の大きい眼球を別顔と数えない。 |
| clownfish | 05に3匹・3顔。主魚と小さい2匹は独立した魚体で別個体。共有除外。その他1顔。 |
| salmon | 全段階1顔。候補なし。 |
| hermit_crab | 全段階生きた個体は1顔。03の予備の空貝殻は無顔。 |
| jellyfish | 全段階1顔。02の積層体に新しい顔を想像して増やさない。 |
| starfish | 全段階1顔。候補なし。 |
| coral | 06=4顔、07=3顔、08=5顔をゲーム上の1群体として共有対象。01–05は1顔。 |
| butterfly | 全段階生体1顔。06右の開いた蛹殻は空で無顔。 |
| beetle | 全段階1顔。角・胸節・翅を別顔と数えない。 |
| stagbeetle | 全段階1顔。候補なし。 |
| cicada | 全段階生体1顔。05下の茶色い抜け殻は生体顔共有対象外。 |
| antlion | 全段階1顔。04繭の既存顔も1つ。穴・石粒を追加顔と数えない。 |
| dandelion | 01–07は1顔。08は分離した6種体・6顔で別個体として共有対象から除外。 |
| sakura | 05=5顔、06=3顔、07=3顔。共通茎につながる一体として共有対象。その他1顔。 |
| venus_flytrap | 04=3顔、05=4顔、07=5顔、08=3顔が同一株。06は紫の中央1顔のみ。他1顔。 |

## 実在する顔と非顔の厳密な範囲

| 段階 | 実在する顔 | 顔を新設してはいけない部位 |
|---|---|---|
| coral06 | 中央黄、右青、左下桃、右下橙の4顔 | 後方紫枝は無顔。枝間の暗い縦穴は眼ではない。 |
| coral07 | 上橙、左桃、右水色の3顔 | 下部の小さい緑・紫・黄の突起は無顔。緑の濃淡を顔と数えない。 |
| coral08 | 黄、左桃、手前紫、中央下クリーム／桃、右桃の5顔 | 左後方青枝、後方緑の塊は無顔。 |
| sakura05 | 5個の閉じたつぼみ全てに既存顔 | 葉・茎。つぼみを開花させない。 |
| sakura06 | 左大花、右大花、右下つぼみの3顔 | 左端と上中央の小つぼみは顔なし。 |
| sakura07 | つながったサクランボ3個の3顔 | 葉、茎、散る花びら。 |
| venus04 | 左上赤捕虫葉、右緑捕虫葉、基部クリームの3顔 | 葉、根、茎、捕虫葉の歯。 |
| venus05 | 上大捕虫葉、左捕虫葉、右捕虫葉、基部クリームの4顔 | 葉、根、茎。 |
| venus07 | 上中央、左右中段、左右下段の5顔 | 根、茎、葉。 |
| venus08 | 上中央・左・右の大花の黄色中心3顔 | 右上・左下・右下の3小花は無顔。基部2捕虫葉も無顔。 |

追加重要所見: **coral06-tiredとcoral06-weakは元画像にない顔を後方紫枝へ追加している。** 拡大切出し比較で2目＋口を確認。今回この2枚を共有状態に直す際、紫枝の追加顔も削除する。他状態の紫枝の暗い穴を一律に消す必要はない。

## 既存10表情の状態別判定

R=既存の実在する全顔へ状態共有を反映する修正が必要。K=自然な微差の範囲で共有感情が読めるため現状維持。

| 段階 | happy | strained | hungry | sick | tired | sulky | weak | critical | wantsPlay | sleeping |
|---|---|---|---|---|---|---|---|---|---|---|
| coral06 | K | R | R | R | R | R | R | R | K | R |
| coral07 | K | R | R | R | R | R | R | R | K | R |
| coral08 | K | R | R | R | R | R | R | R | K | R |
| sakura05 | K | R | R | R | R | R | R | R | K | R |
| sakura06 | K | R | R | R | R | R | R | R | K | R |
| sakura07 | K | R | R | R | R | R | R | R | K | R |
| venus_flytrap04 | K | R | R | R | R | R | R | R | R | R |
| venus_flytrap05 | K | R | R | R | R | R | R | R | K | R |
| venus_flytrap07 | K | R | R | R | R | R | R | R | K | R |
| venus_flytrap08 | K | R | R | R | R | R | R | R | K | R |

具体的な保持判断:

- coral06/08、sakura05/06、venus05/07/08のhappyは全顔が笑顔・明るいウインク・穏やかな嬉しさの範囲。全顔の目や口を同形にする必要なし。
- coral07-happyの右水色O口は明るい驚きとして読め、左のウインクも含め喜びを共有する。維持。
- sakura07-happyの右果実O口も上向きの明るい驚き。左ウインク／中央笑顔と感情が対立しない。維持。
- venus04-happyの基部O口は嬉しい驚き、右の閉目顔は落ち着いた微笑として肯定的なhappyには許容。ここを病気・疲労と誤読するような変更は不要。
- wantsPlay9枚の脇顔は主役ほど大きく目を輝かせなくても笑顔／ウインク／明るい目で同じ肯定的な期待として読める。維持。
- venus04-wantsPlayだけは右捕虫葉の眠そうな姿勢・閉目のままの見え方が能動的な期待と揃わない。主役を保持しつつ基部と右葉に穏やかな期待を共有させる修正を推奨。happyとの違いは、単なる肯定的気分か、今交流を求める状態かという意味差。

修正80枚の共通理由:

- strained/sulky: 主役が嫌がる・すねるのに脇顔は楽しげに笑う。
- hungry: 主役だけ口を求める形になり、他顔は満足げな元の笑顔／眠り顔で身体状態共有が読めない。
- sick/tired/weak/critical: 主役だけ不調・低活力で、脇顔は元気なウインク／笑顔。全顔へ同程度の状態を共有させ、個々の顔サイズに応じ強弱は許容。
- sleeping: 脇顔の開いた目、元気な笑い口が残る。既に閉じた顔は静かな寝顔として維持できるが、ファイル全体としては他顔の修正が必要。

## dandelion08を除外する根拠

正本 `character-world-master.v1.js` の段階名は「旅立つたね」。元画像は共通茎のない、離れた6個の種体に各1顔がある。1本の株についた複数顔とは構造が異なる。旧QAも「顔のある6個の種／周囲5顔」と記録している。画像1ファイル・ゲーム1段階に入ることだけを理由に同じ生体とみなすと、clownfish05の群れや抱え猫まで共有させるため、今回の「別個体は区別」に反する。独立種として今回除外することを主担当と合意。

10状態一覧でも主種のみ状態が変わり周囲5種は各々の明るい顔を保つが、別個体なので本監査の違反にしない。小さな顔のない漂う綿毛にも顔を足さない。将来ユーザーがこの6種をゲーム上の集合体として扱うと明示した場合のみ、別スコープで再判定する。

## 実装へ渡す注意

この81枚案は新方針による差分であり旧レビューの手順不履行を意味しない。normal168段階、顔のない部位、別個体、既に合う19状態、候補外1580表情は本監査による変更対象にしない。マーク、位置、コード、状態判定ロジックはこの監査で変更を要求していない。修正は各段階の同じ実在顔数を保持し、睡眠でも白い花びら・つぼみ・捕虫葉の開閉形状を表情と混同しない。


## multiface-coral06-review.md

# coral06 複数顔共有修正・独立レビュー

8枚すべてACCEPT。元画像と旧状態一覧を参照し、最終PNG各枚を128px原寸とnearest-neighbor6倍で個別表示した。画像編集・生成・コード変更なし。

各画像とも既存4顔（中央黄、右青、左下桃、右下橙）で同じ状態を共有。小さい顔は目口を簡略化しているが、元の楽しげな脇顔が残る問題は解消。紫の後方枝は無顔で、自然な枝間の暗い穴のみ。特にtired/weakの余分な紫顔はなくなった。主顔の既存状態の強度を実用上維持し、枝の大構造・岩場・4顔の位置関係に重大な破綻なし。小さな輪郭／陰影差は承認済み許容範囲。happy/wantsPlayは今回の修正・受理対象に含めない。

最終SHA256を実ファイルから計算し、manifestのfinal_sha256と8件一致確認。以下は受理した正確な版。

| ファイル | 判定 | 所見 | 最終SHA256 |
|---|---|---|---|
| 06-strained.png | ACCEPT | 4顔とも目を狭め、緊張した小さい不満口。主顔の強度も維持。 | `1ca496da1fe1ba46927f6a55886cc02c6658b7a689fde04e5fcb8fabc1a7a909` |
| 06-hungry.png | ACCEPT | 4顔とも求める目と開いた口。元気な傍観顔ではなく全顔が空腹。 | `d84d9a039a34a65ed8d84103dd8d616092bd9158cc189c28bc0daa4b3584f01f` |
| 06-sick.png | ACCEPT | 4顔とも下がった目／眉と不調な口。小さい橙顔も楽しげではない。 | `70838932c51715c386444754ad89e5c122e5a8bad23a1c7c1d8467f51ea6a650` |
| 06-tired.png | ACCEPT | 4顔とも重いまぶたと低活力な口。紫枝の余分な顔は除去済み。 | `1927319fc86fe37a18fc714e3eeefc1c349e6c972f3b33e2d61129c0bcff1aac` |
| 06-sulky.png | ACCEPT | 4顔とも不満げな目と小さいへの字／すぼめ口。 | `bb0193098946bb1501cb28f404ce844a8e5b756b4c30e369753e1ff34c74539b` |
| 06-weak.png | ACCEPT | 4顔とも垂れた目と弱った表情。紫枝の余分な顔は除去済み。 | `8e4a002d6f31a46ec9e86fc0458eab25f75c7c1e0f78bb8aa3fecd5fd192736f` |
| 06-critical.png | ACCEPT | 4顔ともほぼ閉じた苦しい目と開いた不調口。weakより強い苦しさが読める。 | `4d8df653ef2af33ff104022d0713afe785d571f140c49a958875b78e29b5f7f9` |
| 06-sleeping.png | ACCEPT | 4顔とも閉じた目と静かな口。青顔も開眼した傍観者ではない。 | `e8569f771eb820b35e2cca20c158a659d8451e167b3ded76be0c8bcab62e1f9e` |


## multiface-coral07-08-review.md

# 多顔共有修正・coral07/08 独立画像レビュー

判定: **16枚すべて ACCEPT**。重要な修正要求なし。

元画像と事前監査の形状・顔の構成を基準に、各最終PNGを単独で原寸128pxおよび最近傍6倍で確認した。coral07は上オレンジ・左ピンク・右シアンの3顔、coral08は大きな黄色・左ピンク・前紫・下中央クリーム/ピンク・右ピンクの5顔が、各状態を共有している。自然な表情の微差は許容範囲。

主顔の表情強度は状態に対応し、周囲の顔も同じ身体状態・感情として読める。07の下部小構造、08の後方青枝・緑色部分など、元から顔のない場所に余分な顔はない。顔数、枝・花状構造の大きな形状、主要な色配置に重要な破綻は認めない。小さな陰影の差は許容範囲。

happy / wantsPlayは今回の修正・レビュー対象外。生成・本番PNG編集は行っていない。SHA256はレビューした最終PNGから計算し、進捗manifestのfinal_sha256との一致を全16枚で確認。

| ファイル | 判定 | 所見 | 最終SHA256 |
|---|---|---|---|
| 07-critical.png | ACCEPT | 全顔が閉じ気味の目と苦しい口。weakより強い衰弱。 | `0f9bb636f820b585d6add6ffc0c6139c408df38ca28e619d3f588cb3c22f7b38` |
| 07-hungry.png | ACCEPT | 全顔が期待・空腹を示す目と開いた口。 | `d6f4811364d8bf96260b6b132568c2f2e6338bf8bf3afde734cbc984a9b28518` |
| 07-sick.png | ACCEPT | 全顔が心配そうな眉と弱い目、苦しそうな口。 | `de814069ad084cc74627418108c84f2aadfc4a97d126f382716cb2f783d6a3a0` |
| 07-sleeping.png | ACCEPT | 全顔が穏やかに閉じた目と落ち着いた口。 | `7cd0f926415c51730d0a955f2bdd05c641a12c2b00d697a1ceacd2d0e9835ee7` |
| 07-strained.png | ACCEPT | 全顔の目を強く閉じ、口元も緊張。 | `3fc25180df7f7aa658688b24cdea70f97ac4a9bd1e275b1610618c368c30e8f2` |
| 07-sulky.png | ACCEPT | 全顔の細めた目と不満な口が拗ねを共有。 | `e6082870adb66274506616966acbf4fbd53ab43301cb62d927a4da65e1248d6b` |
| 07-tired.png | ACCEPT | 全顔の重いまぶたと小さな口が疲労を共有。 | `6a86521b1a29411d915ac0faabf6448d07e6c39e1f2635fe3736f2555e9e877b` |
| 07-weak.png | ACCEPT | 全顔が低活力の垂れた目と弱い口。 | `0ee6b45b0390cfd69fbcb2c7c71ce992a7fd614f563d386dfc34f155a307b800` |
| 08-critical.png | ACCEPT | 全顔が閉じ気味の目と苦しい口。weakより強い衰弱。 | `d03be735581feaa6b6972074969d2db5aa5e729ce597cbfc0eb9ecdabf6b0726` |
| 08-hungry.png | ACCEPT | 全顔が期待・空腹を示す目と開いた口。 | `2afed33001f53f3fed53902e6d6a9143a63f6670a34cab411c86736cbc33a47c` |
| 08-sick.png | ACCEPT | 全顔が心配そうな眉と弱い目、苦しそうな口。 | `2fd9b9a158ffc72eb74f56087d0bb0fe23812b2facf83de997ac6cb7cd937b1b` |
| 08-sleeping.png | ACCEPT | 全顔が穏やかに閉じた目と落ち着いた口。 | `db90ab5d7a535ed00af0c42395dbb7aad76ccfc66fe39e513644e41a22d28b32` |
| 08-strained.png | ACCEPT | 全顔の目を強く閉じ、口元も緊張。 | `0fd716a079fd3c71974f0a94e313f838d99d8b48aa8920d0acfdee58539f8c2d` |
| 08-sulky.png | ACCEPT | 全顔の細めた目と不満な口が拗ねを共有。 | `ea011726209a87f6c0dabf2b4296316af4f661db33d6489fbdd91ecbd05e5ddc` |
| 08-tired.png | ACCEPT | 全顔の重いまぶたと小さな口が疲労を共有。 | `1142ca8e640c7c087b7032486180e80ff76c66e16d9f1bbf317bed224885a928` |
| 08-weak.png | ACCEPT | 全顔が低活力の垂れた目と弱い口。 | `343bccf818daab9c852f52cc60521d1f2c8ded1adc73b80f4cf8330cadf00096` |


## multiface-sakura05-review.md

# sakura05 多顔状態共有・独立レビュー

**判定: 8枚すべて ACCEPT。重要な修正要求なし。**

制作repoの最終PNGを各1枚ずつ原寸128pxおよび最近傍6倍で確認し、元画像の5つの閉じたつぼみ・茎と比較。5顔すべてが該当状態を共有しており、横向きの左右下部つぼみも含めて自然な微差の範囲。主顔の状態強度も保たれている。

全8枚ともつぼみは開花していない。顔数の増減、汗・文字・状態マーク混入、形状・主要色の重要な破綻は認めない。小さな陰影や口形の違いは許容範囲。生成・本番PNG編集は行っていない。

各manifestレコードとmultiface-records個別JSONの一致を確認し、final / source / original / previous のSHA256を実ファイルで照合した。happy / wantsPlay は今回の対象外。

| ファイル | 判定 | 所見 | 最終SHA256 |
|---|---|---|---|
| 05-strained.png | ACCEPT | 5顔とも強く目を絞り、不快・緊張した口。 | `ad93127aafa64e4769f96266b4d229b645542e7f2b80963b18b0504c2d4b9297` |
| 05-hungry.png | ACCEPT | 5顔とも求める目と開いた口で空腹を共有。 | `b4b65c2768865c684c27de0673e7ba7e0d8aef08de90da8c680a103ec3b50023` |
| 05-sick.png | ACCEPT | 5顔とも垂れた目と不快な口で体調不良。 | `869e871beda515b27622ed86fabfc2b8915bd0aca7f4ab1de9d4a8ba7fbebba4` |
| 05-tired.png | ACCEPT | 5顔とも重いまぶたと低活力の小さな口。 | `7e531252dd5a79417fadc2ec135abf14bfa4412b392379288a33f446e848744e` |
| 05-sulky.png | ACCEPT | 5顔とも細めた不満な目と拗ねた口。 | `6761487fdda60ee51209eae3215503ecc9089a24b410cfb9f522c3f497c0ccba` |
| 05-weak.png | ACCEPT | 5顔とも垂れた弱い目と下がった口。 | `1687fcbfa5a74ad36c5d883fc5f11b927507029acf20274b1254eec407e15423` |
| 05-critical.png | ACCEPT | 5顔とも閉じ気味の目と苦しい開口。weakより強い衰弱。 | `4f78fcc6488d376f810f9875ef5b529a5cb60f9dd73cc819f7d3bb216db02773` |
| 05-sleeping.png | ACCEPT | 5顔とも穏やかな閉じた目。横向きの顔も睡眠として読める。 | `a736dd60e622316ec4c27af2f2d006b547bef053af5c570bb43937bb38bbec5a` |


## multiface-sakura06-07-review.md

# sakura06/07 多顔状態共有・独立レビュー

**判定: 16枚すべて ACCEPT。重要な修正要求なし。**

制作repoの最終PNG全16枚を各1枚ずつ原寸128px・最近傍6倍で確認し、正常元画像と比較した。06は大花2つと右下の小つぼみの3顔、07は3つの実の3顔。すべて該当する身体状態・感情を共有している。顔の向きによる自然な微差は許容範囲で、主顔の強度と周辺顔の意味に矛盾なし。

## 06の小つぼみの黄色差分

hungry / sick / tired / weak / critical / sleepingで右下小つぼみの顔まわりに黄色が増えている。元画像の淡いピンクの顔面から色の差はあるが、緑の萼が包む細長い閉じたつぼみの輪郭は維持され、花弁が放射状に広がる・分離する変化はない。原寸では同じ小つぼみとして読み取れ、開花への重要な成長段階変更や形状破綻とは判定しない。再生成不要。strained / sulkyでもつぼみの構成は維持されている。

06の上中央・左端の顔のないつぼみには顔を追加していない。07の実・枝・葉・散った花弁の構成を維持。全16枚とも顔数増減や汗・文字・追加状態マーク、重大な形状・色配置破綻は認めない。happy / wantsPlayは今回の対象外。生成・本番PNG編集は実施していない。

各manifestレコードとmultiface-records個別JSONの一致、およびfinal / source / original / previousの実ファイルSHA256一致を全16件で確認。

| ファイル | 判定 | 所見 | 最終SHA256 |
|---|---|---|---|
| 06-strained.png | ACCEPT | 3顔とも目と口に緊張・不快。 | `ae620f56c0c73be1f8a69c91279f7a2ad8dc5356d59f1b5b2de9c6f5f98be273` |
| 06-hungry.png | ACCEPT | 3顔とも求める目と開口で空腹。 | `3294c8d04494cb4ab0935655713591dbb7c5803e56c56c9d72b9f089e1730784` |
| 06-sick.png | ACCEPT | 3顔とも垂れた心配な目と不快な口。 | `effdde2f7d52cda6e898c73e4064b67e55b4df3469914630071446e2a9308ce2` |
| 06-tired.png | ACCEPT | 3顔とも重いまぶたと低活力の口。 | `5238ae20db9353800ab3044e50ed5a7942074954591548508f0808c2cefda69f` |
| 06-sulky.png | ACCEPT | 3顔とも細めた不満な目と拗ねた口。 | `bd43a31e8dd9e2dfa9d553ea0dd19b0293ef3f2abe40bd70990d73156628f738` |
| 06-weak.png | ACCEPT | 3顔とも垂れた弱い目と下がった口。 | `b2945435e01d1bb30f39c5c1009d8b6219abfb799343b942a537cc2a5a947f1d` |
| 06-critical.png | ACCEPT | 3顔とも強い衰弱。弱い閉じ気味の目と苦しい開口。 | `c3d20ab745de2b64052797922cde20ec1b85577f0ffe77cbb9de62c0bb9d9d4d` |
| 06-sleeping.png | ACCEPT | 3顔とも目を閉じて穏やかに睡眠。 | `3a04762bc417d2a4db882c44c8d90a8d36f7124c8d5c60781b8341e35446ee67` |
| 07-strained.png | ACCEPT | 3顔とも目と口に緊張・不快。 | `4acdb207aa6187afe77d0309805f425581cebd4beb858a6fcffcd3618911e024` |
| 07-hungry.png | ACCEPT | 3顔とも求める目と開口で空腹。 | `409bdf01a71c9dbf73696c79c7ee660b3fd945b1ab76403cdee787e6117beb21` |
| 07-sick.png | ACCEPT | 3顔とも垂れた心配な目と不快な口。 | `6c6702bbfd212271ce2beba71ddfc959c650096a5dfe8b46a416eb02a196c5c1` |
| 07-tired.png | ACCEPT | 3顔とも重いまぶたと低活力の口。 | `c9ebc4bbb459e41cdbfd0eb09b613ab81e52b9e8e3f93b07befccda24654c24a` |
| 07-sulky.png | ACCEPT | 3顔とも細めた不満な目と拗ねた口。 | `c993b4d4a8057bb10b3da2e36c941c908383b35e1312f3a7d60f540284aa2a87` |
| 07-weak.png | ACCEPT | 3顔とも垂れた弱い目と下がった口。 | `940437b6a21e015d295804c9baa6dafadd0bd769f16fa2f09a16c0a29b0bec34` |
| 07-critical.png | ACCEPT | 3顔とも強い衰弱。弱い閉じ気味の目と苦しい開口。 | `39fde2de25ca01a3dde10a68cdc39e2f747e7387678ef37b676af00ecda0a582` |
| 07-sleeping.png | ACCEPT | 3顔とも目を閉じて穏やかに睡眠。 | `3f306178208905276c066b242c9827e47921ffbe10cd0ab1371e54601f78f421` |


## multiface-venus04-review.md

# venus_flytrap04 多顔状態共有・独立レビュー

**判定: 共通8状態すべて ACCEPT。重要な修正要求なし。**

制作repo最終PNGを全8枚それぞれ原寸128pxおよび最近傍6倍で確認し、正常元画像と比較した。左上の赤い大捕虫葉、右の緑の捕虫葉、基部のクリーム色の顔の計3顔すべてが、該当する身体状態・感情を共有している。主顔の状態強度は維持され、自然な微差以外の意味の矛盾はない。

捕虫葉の開閉形状、棘、茎、基部・葉・土の構成に重要な破綻なし。顔数増減や文字・汗・外付け状態マーク混入なし。色・陰影の小変化は許容範囲。生成・本番PNGの編集は行っていない。

wantsPlay追加修正およびhappyは今回のレビュー対象外。各manifestレコードとmultiface-records個別JSONの一致、およびfinal / source / original / previousの実ファイルSHA256一致を全8件で確認した。

| ファイル | 判定 | 所見 | 最終SHA256 |
|---|---|---|---|
| 04-strained.png | ACCEPT | 3顔とも目を絞り、緊張した不快な口。 | `e06318291acfcda4932c70c9119cb4cbbba5e59d4e1516c803ae2074c07a0666` |
| 04-hungry.png | ACCEPT | 3顔とも求める目と開口で空腹を共有。 | `91e9510f506fe20a4e06dd7b99f89c97b9b9a4593a11040653de9e333a54c30b` |
| 04-sick.png | ACCEPT | 3顔とも垂れた心配な目と不調の口。 | `4631413603d6342b0a3d6f27cd9f8a62a235b4d34e64766019c610f351757b5b` |
| 04-tired.png | ACCEPT | 3顔とも重いまぶたと低活力の口。赤みのあるまぶたも顔部の表現で追加マークではない。 | `a9673f74ac6b3d3f47e2690e7fe4096d75287cc36f509e61797653d4550d3146` |
| 04-sulky.png | ACCEPT | 3顔とも細めた不満な目と拗ねた口。 | `190c2a460a575a00457a89306aa53a34b8e79200b90a56d07f1e7f125cf5472a` |
| 04-weak.png | ACCEPT | 3顔とも垂れた弱い目と小さく下がった口。 | `5ef7a6fcaeea64923d0b706acfb45b893f6cbd08bf5a12eb6ee2b60c3975dbc7` |
| 04-critical.png | ACCEPT | 3顔とも閉じ気味の目と苦しい口。weakより強い衰弱。 | `98cf05412346bad505a5102dee5fc584cbe62140dfea5fa8d531d6e3c35ad6f9` |
| 04-sleeping.png | ACCEPT | 3顔とも目を閉じて穏やかな睡眠。基部の小さな開口も睡眠の微差として許容。 | `0aa72ece0538b11c05aeac8810ff08516d495b1f3dcb9a001ddda24c3623e31a` |


## multiface-venus05-review.md

# venus_flytrap05 多顔状態共有・独立レビュー

最終判定: **修正済み8枚すべて ACCEPT。重要な修正要求なし。**

制作repoの各PNGを単独128px・最近傍6倍で確認し正常元画像と比較。上・左右捕虫葉と基部の4顔が、修正済み7状態すべてで同じ身体状態・感情を共有する。自然な微差は許容範囲。主顔の表情強度、捕虫葉・棘・茎・葉・基部の形状と主要色に重要な破綻なし。文字・汗・外付け状態マーク追加なし。

初回表示のsleepingは未更新旧PNGだった（主顔だけ睡眠、左右と基部は起きている）。manifest未掲載・final_sha未設定と主担当の説明で確認。修正版の不具合としては扱わず、正規化後の再確認待ち。生成・本番PNG編集は行っていない。

以下7件のmanifest、multiface-records個別JSONおよびfinal/source/original/previous実ファイルSHA256を照合済み。

| ファイル | 判定 | 受理最終SHA256 |
|---|---|---|
| 05-strained.png | ACCEPT | `fe1b0143a7ec7093d3c4492e601d9dc287864a94db71f668192d1dd42a020681` |
| 05-hungry.png | ACCEPT | `f598e6df482095a3e6fa172ce9ef14170c84a32170c3e4b1398981cd8021901a` |
| 05-sick.png | ACCEPT | `eb7d7a79e27f8e99dfa16de2dbca1f571a826b7fcadcfad55a937af72014c4a9` |
| 05-tired.png | ACCEPT | `d242fb82cb4db27d3473e604c6987b23324386b58ceb68f398a56eca5569d36e` |
| 05-sulky.png | ACCEPT | `74dbb808d0a94397aedbbdf3289065af7910781dfb8ad1522b65a854ee720e44` |
| 05-weak.png | ACCEPT | `362176916bb013768be00e809e6523b57ee397c187d44df1ae43ea50aa8c3e32` |
| 05-critical.png | ACCEPT | `c716eacf0b46acbfa843b017c7f1d768523d0771b3db1b2f7b7e99e0f6c9bf19` |

## sleeping 正規化後の追加レビュー

更新後の最終PNGを単独128px・最近傍6倍で再確認。4顔すべてが両目を閉じ、穏やかな睡眠を共有している。形状破綻や追加マークなし。manifest・個別JSON・final/source/original/previousの実SHA256一致を確認。上の未更新旧版への指摘は履歴として保持し、この最終版で解消済み。

| ファイル | 判定 | 受理最終SHA256 |
|---|---|---|
| 05-sleeping.png | ACCEPT | `1e16a7330dd2a5ed70c09497b5c020fb8e33ebe6bc3605edc147bd2a9644af89` |


## multiface-venus07-review.md

# venus_flytrap07 多顔状態共有・独立レビュー

**判定: 8枚すべて ACCEPT。重要な修正要求なし。**

画像検査前にmanifestの07が8件存在し、全final_sha256が実PNGと一致すること、個別recordとの一致を確認。その更新済み最終PNGを単独128px・最近傍6倍で全8枚確認し、正常元画像と比較した。

上中央・左右中央・左右下の5顔すべてが、各状態を共有している。自然な微差は許容範囲。主顔の強度も維持し、顔数増減・余分な顔・追加の文字や汗など外付けマークなし。捕虫葉の形状・棘・茎・葉・根の主要構成と色に重要な破綻なし。weak等の細い棘の輪郭に小さな描画差はあるが、原寸で形を損なわず再生成は不要。生成・本番PNG編集は行っていない。

記録時にもmanifestと個別JSON、final/source/original/previousの実SHA256一致を全8件確認。happy/wantsPlayは対象外。

| ファイル | 判定 | 所見 | 受理最終SHA256 |
|---|---|---|---|
| 07-strained.png | ACCEPT | 5顔とも絞った目と緊張した不快な口。 | `d1794c721ea2c81ca7a5571aad175c12ee7f4e38aac6f02d722034d86e38debe` |
| 07-hungry.png | ACCEPT | 5顔とも求める目と開口で空腹。 | `46cbfa9950bb1d711cd63f842f401e5a41ebcc47a37724cf783dd60f51562064` |
| 07-sick.png | ACCEPT | 5顔とも心配な垂れ目と不調の口。 | `f3a87675e481364e1d355042f5a4dc258d12d7bc218fed5d51267e6b3e0daaf2` |
| 07-tired.png | ACCEPT | 5顔とも重いまぶたと小さな低活力の口。 | `e9ef1c68740dcffa27eb1e71b82b43c878ad1ff294573354e18d2bb933cdf7f3` |
| 07-sulky.png | ACCEPT | 5顔とも細めた不満な目と拗ねた口。 | `27523779112f7807335388a3e933fa2b9db95a8a00f3a55c8f719fad88b71998` |
| 07-weak.png | ACCEPT | 5顔とも垂れた弱い目と下がった口。 | `dc1486bc547f73ae857bfd24639f3866c2490ecca54ec703c24b3ed87895bfba` |
| 07-critical.png | ACCEPT | 5顔とも閉じ気味の目と苦しい開口、weakより強い衰弱。 | `afc03f04e81fcc1ed9753d4ffbf260de15ee28aa3a2021a39b0f7e0d45ae2510` |
| 07-sleeping.png | ACCEPT | 5顔とも両目を閉じ穏やかな睡眠。 | `b8e8b94d136d6185cc1394ed4fa20175a249f67f8f591288eb40391a3b1c18a5` |


## multiface-venus08-extra-review.md

# venus_flytrap08・04 wantsPlay 独立レビュー

**判定: 9枚すべて ACCEPT。重要な修正要求なし。**

全81件のmanifest中から対象9件を抽出し、事前に最終PNGのSHA一致を確認。その後、全9枚を単独128px・最近傍6倍で確認し正常元画像と比較した。

08は大きい花3つのみ3顔。全8状態で同じ状態を共有し、自然な微差のみ。右上・左下・右下の小花3つと基部捕虫葉2つに余分な顔なし。花弁・茎・葉・捕虫葉の構成に重要な破綻なし。04-wantsPlayは主顔と右捕虫葉・基部の3顔が明るい期待を共有し、右顔の眠そうな表情は解消。全9枚とも外付け文字・汗・状態マークなし。小さな陰影差は許容範囲。生成・本番PNG編集なし。

記録時にmanifest/個別record一致とfinal/source/original/previous実SHAを全9件照合。

| ファイル | 判定 | 受理最終SHA256 |
|---|---|---|
| 08-strained.png | ACCEPT | `b3fe82e0e9c108f9e45f2d6bb62945b724b81059ef9865976d304c73c0fdfbe9` |
| 08-hungry.png | ACCEPT | `76904891107c836cb62baa7f21247abb0b82711e7ef1d6f814e60ead3bf1a9f7` |
| 08-sick.png | ACCEPT | `e1b64f55fd66fe4382ddebb7e742814edd3fded52123d9aaf748c59c68366b30` |
| 08-tired.png | ACCEPT | `077d545c7c41bae9b58e2bde8b7b1214287c95e2a40d4af9115f550d118c2a04` |
| 08-sulky.png | ACCEPT | `46aa752e4b3f61359a0ac13d8d54ddae5c720cad921e7212dda60003a3b652ef` |
| 08-weak.png | ACCEPT | `512ba113f2352808b88d1885dcc405ffdcc49b0b8d9299aab7a71a990117f4e1` |
| 08-critical.png | ACCEPT | `50c82e52a71c7fcf95f1ae61d080dd9d19cee402e4a8d5a8fee66ff06f72dce5` |
| 08-sleeping.png | ACCEPT | `678dfe871966d507faf6ec367b73d9c355d6bd4accca1c2d83f14cbddcd0b023` |
| 04-wantsPlay.png | ACCEPT | `a83f0f86f056d845f324bb031b9b72b4c1b2dd87c8e02a7ccb67769541e5d547` |


## multiface-composite-review.md

# 多顔修正・日本語マーク付き合成 独立レビュー

**判定: 10一覧・計100合成すべて PASS。重要な修正要求なし。**

対象一覧10枚を各ファイル単独で表示し、各10状態を目視確認した。coral06/07/08、sakura05/06/07、venus_flytrap04/05/07/08。修正81表情に加え、保持対象のhappy/wantsPlayも含めた100合成の確認。

日本語タイトル・10状態ラベル・注記に欠字や豆腐表示なし。各状態のマークは対応する色と種類で表示され、うれしい=黄色の輝き、つらい=左上の灰色波形、空腹=右上の黄色の食べ物の思考、病気=上の緑線と左右の緑汗、疲れ=紫の丸、すねる=青い雲、生命少=ピンク下矢印、危険=赤下矢印、かまって=オレンジ線、睡眠=青Z。Venusの空腹マークは虫を表す既存形状。

マークが顔を隠す・別カードに食い込む・文字や枠で切れる等の明確な衝突なし。サクラ実などの広い形状では右外側寄りの配置だが、意味を読める許容範囲。小さな外周余白の制約や通常の近接は変更不要。病気の汗は静止近似であり、この画像レビューはアニメーションの動作検証ではない。

表情本体の多顔共有は先行の個別PNGレビューに加え一覧でも確認。05-sleepingと04-wantsPlayも更新後の共有表情を表示している。顔数が増える合成上の問題は認めない。画像・コード編集はしていない。

| 一覧PNG | 寸法 | 判定 | SHA256 |
|---|---|---|---|
| coral06.png | 736×1850 | PASS | `83fc93ef1600508fd0bd22bd12b60bd41db2766f3345106043a4a305cae1eac2` |
| coral07.png | 736×1850 | PASS | `41c4173833f085bff3813dfd52203d94a1a6e26e927be516db92c995bf9f3be2` |
| coral08.png | 736×1850 | PASS | `a864d8fbdf5e937f98d47688ef34e06dbf3a91857f0a571dfa0d34ac760519d6` |
| sakura05.png | 736×1850 | PASS | `181c065861dc42f3103c3201ae172f7e012da69843b345051ea438e063f0c373` |
| sakura06.png | 736×1850 | PASS | `fd723e2559ea0a579405eeaf9d07ffbc1ade03592d835ff09fc35f38f4480d0e` |
| sakura07.png | 736×1850 | PASS | `fd08eb0dd56944e8d7fe27110163d3db73a71546310247c7948cc1079640d268` |
| venus_flytrap04.png | 736×1850 | PASS | `adf04273448b24c71eeb9a9ff9c781590c4f417437046b45f3502942d510613c` |
| venus_flytrap05.png | 736×1850 | PASS | `c888522824288d95a4fd49498863118061e00bf6e113cf4cd448641d1fed601e` |
| venus_flytrap07.png | 736×1850 | PASS | `dedfd732a5eefd3540ccd58177d716ec326c98f0227bee641cd20e1435a93a8e` |
| venus_flytrap08.png | 736×1850 | PASS | `5db37c9856d848d3fe16b8c7113fceb639b78b2989c245212e42d2daefd9f306` |


## 最終Spec / Code quality

# 複数顔共有修正・最終独立 Spec / Code quality レビュー

制作baseline: `471cb46f93d088cbdc9aa5eef0cab087067236b6`。Site baseline: `2306d372f00efd4ff8351b671e4679afecd5ff7a`。

**Spec: PASS（実装・画像・監査範囲）。Code quality: PASS。Critical 0、Important 0。**

最終全体テストは進行中で未判定。公開・GitHub保存も未完了として扱う。したがって公開保存を含むタスク全体完了や最終テストgate通過は、このレビュー時点では宣言しない。

## 正本・対象範囲

正本の追記は「同一個体の全顔で身体状態・同じ感情を共有し、自然な微差を許容」を明記し、対象10段階に限って旧主顔のみ変更指示より優先する。別個体・ぬいぐるみ・空殻・無顔部位を除外。coral06–08 / sakura05–07 / venus04,05,07,08の顔数、dandelion08の独立種体除外根拠、サンゴ群体をゲーム上の一体とする判断は監査結果と整合する。

単独最終PNG81枚を本担当が原寸・6倍で受理済み。保持19状態を含む10一覧100合成も受理済み。監査は21系統168通常段階の走査と候補の詳細調査であり、全1680表情の単独再レビューと誇張していない。主顔状態のみ変更という過去基準を、新基準へ無言で読み替えていない。

QAは今回の81件manifestを現行修正版の正本、過去系統manifestを制作当時の履歴と明示。repo manifestの81レコードは検証済みscratch manifestと完全一致し、全81最終SHAがrepo review受理記録に存在する。05-sleepingの旧版先行表示は履歴に区別され、正規化後の4顔睡眠と正確な最終SHAで受理を閉じている。

## 実差分・接続・保護

productionのbaseline比較で非docs変更がmanifestの81PNG集合と厳密一致。追記正本と新QA/review/manifest以外の製品テキスト変更なし。新runtime機構を増やさず既存パスのPNGを置換するため、assetForの接続・状態resolver・優先順位・リアクション・セーブ形式は不変。

読取専用check-multiface.cjsの内容を確認後、独立再実行exit0: 81修正、1680実assetFor参照、1599 active保持、過去追加4PNG保持、通常等297PNG保持、非docs保護2099ファイルのbaseline Git blob一致、324実SHA一致、81通常bounds一致。runtime/配置/アンカー/マークSVG/CSS/ゲーム数値/恋愛条件/セーブ関連も保護一致範囲に含む。対象外を変更する差分なし。

placement-final.jsonはmarks1680 / sweatEnvelopes1008 / issues空。先行の100合成目視でも日本語欠字、顔を隠す明確なマーク衝突なし。静止合成の目視を実機動作確認とは主張しない。

## 確認Site

読取専用check-multiface-site.cjsを確認し独立再実行exit0。94変更ファイル=81PNG+10一覧+レビュー画面3ファイル。1680画像すべて制作repoと一致、現在対象100件、画像版mf-0660b59a。expression token20260922-6348f2d6は製品JS hashと一致。レビューUIの差分は説明文・入力案内・今回対象セットとキャッシュ版で、既存選択・メモ・localStorage・コピー処理の挙動変更なし。ソース/状態評価であり端末タップ試験ではない。

## 残る完了gate

- 進行中の最終npm testログの終了結果を追記する。開始baseline1474passとは区別する。別の全体テストは起動していない。
- 同じowner-private Siteの公開結果と公開版確認を記録する。
- PR278 Draft維持、main取り込み・マージなしでの保存結果を記録する。

Minor: 完了後、QAの「現在未完了」「更新中」等は履歴見出しか明確な最終結果追記で読者に状態を区別させること。これは現在進行中の正しい記録であり、修正を妨げる欠陥ではない。

本レビューは読取専用。製品・Site・画像を変更していない。
