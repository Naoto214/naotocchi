# 最終横断独立監査：現PNGとprovenance/QA hash記録の整合

2026-09-23。対象は現runtimeが参照する31系統2480表情の機械的hash/provenance監査。画像の新規生成・編集、製品コード/旧manifestの改変なし。この文書だけを作成した。目視の受理をhash一致から推定しない。

## 結論

**現active2480 PNG全てが既存の正本記録にある最終SHA256へ一致し、現在hashを追跡できないPNGは0件。未解消stale記録0件。** 最初の21系統1680は`three-class-expressions-20260922-manifest.json`の`activeExpressionsPreserved`全1680件が現在PNGと一致し、その後の10系統800は各制作manifestの`records`全800件が現在PNGと一致した。本日の新しいfinal-cross-audit文書を一致根拠に使っていない。

既存JSONの中には現PNGと異なるhashが90参照あるが、**81件は正式に修正された旧制作manifest、8件はdragonのrevision_history、1件はphoenixのsuperseded_reviews**。後続の正本に現hashがあるため、現在成果物の不一致とは判定しない。旧履歴を書き換える必要はない。

## 独立実行で確認した範囲

- `pet-expression.js`の実assetForを実行して対象を抽出。31系統×8段階×10正式state、2480 unique paths。通常fallbackを表情数に混ぜていない。cat06 happy/sleepingは実際にv3を参照する。
- physical expression PNGは2484。差4はcat06のhappy旧版/happy-v2/sleeping旧版/sleeping-v2。activeと分離した。
- 既存`docs/qa/*expressions*{manifest,review}.json`をJSONとして読み、実際のschemaの`final/final_sha256`、`asset/asset_sha256`、`asset/sha256`、`path/sha256`を対応づけた。単なる64桁文字列の一致や任意のsource hashをfinal hashとして数えていない。
- nested stage review/二重asset-path記述を含む5500参照ペアを検査。unique active一致は2480。参照5500は画像枚数ではない。
- original/original_sha256の2569記録を現通常PNGと照合し不一致0。absolute旧workspaceのパスもその中の`assets/characters/...`を明示的に解決。unique通常画像は248。
- line/stage/stateの記載がある制作manifestでは、finalパスと各metadataの不一致0。
- 初期MDのhashも別に読んだ。cat06のactive10件は旧MD記載とも一致。dog初期MDは生成経路/プロンプト記録が中心で、機械的な「PNG pathと64桁hashの同一行対応」は見つからないが、dog80を含むcat/dog160は後続3分類manifestで全件追跡できる。
- 全2480実ファイルhashをレポート保存直前に再照合し変化なし。

基準：親担当確定remote HEAD `a2eb319893caca94467f474e2bf17a152d67d0fc`、この担当が参照したlocal tree `d0399d249c82dd74159fdd8ac592e0d1bd405204`。remote APIをこの担当で再取得したとは主張しない。

## 履歴の正当な後続置換

|旧記録|現hashと異なる数|後続の正本・検証|
|---|---:|---|
|coral-expressions-20260917-manifest.json|24|multiface81内の24件。旧final_sha256＝後続previous_sha256、後続final_sha256＝現在PNG。さらにthree-class保持記録でも一致。|
|sakura-expressions-20260918-manifest.json|24|同じ81内の24件。同じ旧→previous→final→現在の連鎖が一致。|
|venus-flytrap-expressions-20260922-manifest.json|33|同じ81内の33件。同じ連鎖が一致。|
|dragon-expressions-20260922-review.json revision_history|8|履歴のREPAIRを現受理と混同しない。現records80/制作manifest80は全部現hash一致。|
|phoenix-expressions-20260923-review.json superseded_reviews|1|05-hungryの過去REPAIR。現records/制作manifestの同じ対象は現hash一致。|

multifaceの81件全てについてprevious_sha256が対応する旧制作manifestのfinal_sha256と一致することをassertした。単に日付が新しい記録を優先したのではなく、旧内容から現内容への置換連鎖まで確かめた。

## 系統別の最終内容と正本追跡

digestは、対象行をassetパス辞書順に並べた `asset + TAB + SHA256 + LF` のUTF-8バイト列に対するSHA256。これにより81件の詳細だけでなく各系統80件全体の現在内容を固定する。

|系統|active/一致|現在hashを持つ正本|80件内容digest|
|---|---|---|---|
|antlion|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`f5a6ea21389df3aed92cb653fcefb88a86d6a7e65b659db700421f6b18622efc`|
|beetle|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`22f1459506ca037086c92f3eb85c16fd22c8ff09316d7fa24c1bacbdaf3c7c3a`|
|butterfly|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`161a2a52ffffb75c33b113579788c3c2cf21e61e30929c531c5f0c243db31815`|
|cat|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`e45113fc44ea7e8cdad1dac7ad3af9a72abd6b3b45424d9c70e8fa8e611b4603`|
|cicada|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`c2305d8d7b21a7b6ac0c81a5a3b6b1ecdded476af01399545d765812c779ae76`|
|clownfish|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`f038620f8417f5636bfec2b89aafbc85593cbccba09aa76c225171f4b18dd3e0`|
|coral|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`90d253afd6b68d69b62682acb46b439628f72a2d08b5932473b5d750a3ecda84`|
|dandelion|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`7cd4018ada194905d9c37ebbc60220b11ad0be20557d67e6725c22b2ff7c99dd`|
|dog|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`98041ada814753a574f592d3f84cc4e0b388f1c2dd14d20b8f8357d93d9de887`|
|dragon|80/80|`dragon-expressions-20260922-manifest.json` `records`|`aff5ccdddfffb0cd65519a2eda7718704dcc8db1501f1963f8c62411e73b621e`|
|frog|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`07666d012bc3ecf1030941ef0541520df76e75620e84daabc21dff8cbd842759`|
|ghost|80/80|`ghost-expressions-20260923-manifest.json` `records`|`9ef23ef967b3687bedc674e0f746355ab90e6313f9f1f7f093f1c1b05310e8e3`|
|god|80/80|`god-expressions-20260923-manifest.json` `records`|`5b341d66cec65d09913cadde69c72d59636f4de0b075bc92c390ef2b89758513`|
|hermit_crab|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`28974463f9f9044249e802b15223fbc0124972a2b57ed1567240e8a2f0316386`|
|jellyfish|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`9ce4558a5529408dcbba05caa3ed995d8af3eafcf51d79aecab7c896bd5fad51`|
|man|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`ac63a2c28973da7183a259dde667b4bdd2d423a56808f08e3e2bdefbfdb1c58d`|
|mushroom|80/80|`mushroom-expressions-20260922-manifest.json` `records`|`cebf19f7ec78c379f2faa0c97bb5222d00a22bf831998d12457a17466427c57e`|
|penguin|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`c0ab8ad0f9c27ffc6ff1bea9d68bde91c03d410657f6f84268889c91d09ea223`|
|phoenix|80/80|`phoenix-expressions-20260923-manifest.json` `records`|`057ecd355964ecf416891464766fadc5d3ccd37f54ba4e38a766b92e5cb0ff6c`|
|plush|80/80|`plush-expressions-20260923-manifest.json` `records`|`73127207ade7ddf72cdcc3304c396fca1db9b04dd842626115ebfa9fca76135a`|
|ren|80/80|`ren-expressions-20260923-manifest.json` `records`|`f73864f7dc77d950ec37da1f5e4b98f735fc4c5f5b2730ebb3b78ffc6dd3cdf5`|
|sakura|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`c91674e28c05f03f619302418f6ffce34d322181b87abc8e174c1fb330277976`|
|salmon|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`f3af8a95bdf286d173d6097118934c6a19d64726c3b87b3bc970b75526e720ab`|
|stagbeetle|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`c47bbf2143c94669768bf5dddee293a1741b184927ddb6df3c7241f4dcbb9eda`|
|star|80/80|`star-expressions-20260923-manifest.json` `records`|`1e835a55cfe90fc12041672211d08a307405a4d1f7e0ab451d615c21b2c1eb10`|
|starfish|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`1c7c63fadd9e779259497b3fafd4dc28490de899ac95fcea3f3e2ef5fce8a94b`|
|turtle|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`5ae8d9cbc5c8a299b387bed8181d734450e365050985695b07ab962a111fbdb7`|
|unknown|80/80|`unknown-expressions-20260923-manifest.json` `records`|`589f1e1b1cc3ae0025f348f10bc1dd8ac60b48244a7c73f6aa67ad19e260dff1`|
|venus_flytrap|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`813c6fb3d2beb12a3278f9e61031bf0ba050e53b2a42f94ed51f6a13a0c59e09`|
|woman|80/80|`three-class-expressions-20260922-manifest.json` `activeExpressionsPreserved`|`1306b25ec7e39c62a1b626c2eb4b704e6a0da135ccdfc244cadeb0802ee3f7ba`|
|world_tree|80/80|`world-tree-expressions-20260923-manifest.json` `records`|`eaaca93589c039835e2160664ab899e098af1c459b859f7e191f20af3f2f3977`|

全2480内容digest：`6c12c489ed567f59c7d48b00086a00375e18d5854f1b738a62b4182dd50b70aa`。

## 制作経路メタデータと未確認限界

現hashに一致する制作JSONから、2320 PNGはpromptとgenerated/source SHA256を追跡できる。うち2160はsource/generatedSource/final_generation_sourceのlocatorもある。残り160はhuman制作manifestでprompt・original hash・generated hash・asset hashを記録するschemaで、sourceファイル名欄がない。このschema差を現在PNGのhash欠落とは数えない。

cat/dog初期160は制作MDと後続全件保持manifestを組み合わせて追跡する。cat06の10現hashは制作MDにもあるが、初期全160について最近の各系統と同じ完全なJSON generation manifestがあるとは主張しない。以後の多顔修正81には旧hash/新hash/source hash/promptがある。

本監査で実ファイルとして再hashしたのは現在repo内の最終PNGと通常元PNGであり、過去workspaceのraw imagegen出力を再取得して全件source hashを実検証したものではない。生成ツール実行ログの真正性、元rawからnormalization結果への完全な再現、過去目視レビュー実施の実在をhashから保証しない。記録上のprompt/source metadataが存在することと、現成果物に到達するhash連鎖の整合を確認した。

この機械監査は2480の顔の意味・個性・原形・マークの目視合否を代替しない。例えばdog03-wantsPlayの前足姿勢という別監査の疑義は、制作hashが一致していても消えない。

## 監査したJSONファイルの固定証拠

参照ペアはnestedレビュー/同一オブジェクトのassetとpathの重複を含むため、countが80を超えることがある。stale欄は上で解消した履歴込みの生の数。

|ファイル|参照ペア|現hash一致|旧hash|記録ファイルSHA256|
|---|---:|---:|---:|---|
|`antlion-expressions-20260918-manifest.json`|80|80|0|`b9f4eb134d03b55fb1e5a18202d2a39de74ec2143327c25c28e74be4d0a3f625`|
|`beetle-expressions-20260917-manifest.json`|80|80|0|`28b93419d023f6c63c46610021981bb049757e88f2fd042fa801d17bfae3b5e8`|
|`butterfly-expressions-20260917-manifest.json`|80|80|0|`1af28fec95bb88c9c9dcbb93c11f940d9c1a79ab23755eb9df5dcc8c2bb63723`|
|`cicada-expressions-20260918-manifest.json`|80|80|0|`cf547a9b8da482024e489afb582a3dde6c5e4f76cab6227690370c2717b93f07`|
|`coral-expressions-20260917-manifest.json`|80|56|24|`100fc2bad7a5800717a6e49c229170318f95005ec0c72afe38c761e56292a7d6`|
|`dandelion-expressions-20260918-manifest.json`|80|80|0|`656bd4bb76a872e5049b11a3fc7e68fc96611d0ce5978db030b6a08c86e60e8f`|
|`dragon-expressions-20260922-manifest.json`|80|80|0|`7e59730c6a4efe7a796298b917cf5894a4a808cd59bd2ec6db3024128e16747c`|
|`dragon-expressions-20260922-review.json`|88|80|8|`5b37123044f68a529e64e30bbe3f10d6f9724b5e8b6feea201a59dfd3a209fd2`|
|`frog-clownfish-expressions-20260916-manifest.json`|160|160|0|`3c0e8c80dde1e50bf7cc40ec07fa1ddb7b7988f23e62eaccb0ada66c4329090b`|
|`ghost-expressions-20260923-manifest.json`|80|80|0|`bab127c65f623ed8f51340b98c62ee2fc19632fc1caf25d92ba6f236116f6e26`|
|`ghost-expressions-20260923-review.json`|80|80|0|`6612272c11f7a42838902238d85397daa779c382ccfdbda03ab0447d86db6615`|
|`god-expressions-20260923-manifest.json`|80|80|0|`ab40cef9277821efb15b6b8596b4a924de90445a6f7f0e5ea6c28b05cfba4576`|
|`god-expressions-20260923-review.json`|160|160|0|`ef014fdf017ccc5d8a0cf94309215d03780200c381c8f99d59275ab13167db36`|
|`hermit-crab-expressions-20260916-manifest.json`|80|80|0|`e73967fad77e112f9dd8f7d55341505f5c6159c8a194649f8cbd00062b8a8d24`|
|`human-expressions-20260916-manifest.json`|160|160|0|`980ab5fd34eac492555a59448ab9d1fcb018451b0105333532e1cda4714ec3ab`|
|`jellyfish-expressions-20260917-manifest.json`|80|80|0|`df549364f4e0fe51dbfe8f52de0a02e058a8b7a421fa7c8cc3da4993e603926a`|
|`multiface-expressions-20260922-manifest.json`|81|81|0|`fc3eeae98a9b1ab4f33ac0e0710f6fef5f734aed8f9f7a36c0d5e7144fd64160`|
|`mushroom-expressions-20260922-manifest.json`|80|80|0|`ee496b956d4a4da7d45513cd338a75e5a182ae5a4560e4c25b2fa5b74ca4e6c3`|
|`penguin-turtle-expressions-20260916-manifest.json`|160|160|0|`d1f66ec4b49050f9a8d67839745754f6fbd7c7b1f068a1efdd359048c002d000`|
|`phoenix-expressions-20260923-manifest.json`|80|80|0|`43b875c7df9062ffdc9cf8d10bdda66fdcfa057ca882d51ce585668a52e21baa`|
|`phoenix-expressions-20260923-review.json`|161|160|1|`274bdaeb7bda0152f2ee8aff8b5f23efda84805cf3ba77469009176ef570764c`|
|`plush-expressions-20260923-manifest.json`|80|80|0|`489022ac418572b1fddc93c95e05169f1ed16cac3e01f7abff935b8f9800a279`|
|`plush-expressions-20260923-review.json`|160|160|0|`3d3aed44de6c1d6bf0d64a49109a69d78426ab946112a105e3d67ff76516f238`|
|`ren-expressions-20260923-manifest.json`|80|80|0|`2ab8c0260b9b29c43e8daf6089b9fb9798578247299a30c22cd4f34d1967b848`|
|`ren-expressions-20260923-review.json`|160|160|0|`689fc905afa9c359451648978b4e7d88b77d4579e43d35641c7a1310d348104e`|
|`sakura-expressions-20260918-manifest.json`|80|56|24|`9f6f3569bcc8cf311c46133a1ade8032c0c926434b2d452099e4e0c363f6e859`|
|`salmon-expressions-20260916-manifest.json`|80|80|0|`9328d1f29c53bdf0688047e9a2ce41ef2d8f9ac17914950a2ce7b28e52ab3c90`|
|`separate-individual-expressions-20260922-manifest.json`|30|30|0|`5b59790a79d4571e6f10ab6df3d074df3de3c0ba1e26aa7bdb4532ccf24abaaa`|
|`stagbeetle-expressions-20260917-manifest.json`|80|80|0|`70d45d48c9c5ecd1d04a93389ece2bada5411c9595ba3495ae7d9ec27004984a`|
|`star-expressions-20260923-manifest.json`|80|80|0|`e38435883208aff4ad877edad5667c2427e049a97c7199cb8df81b9423ed732d`|
|`star-expressions-20260923-review.json`|160|160|0|`3d9ea98cc64cae758589127f4105a29a408a999ba98b128f3215a51b1571e0e9`|
|`starfish-expressions-20260917-manifest.json`|80|80|0|`cd6cea6e0e0b277ceaf3a559deb35a5dd49346aa007f0b461cbe04db00f7dc4f`|
|`three-class-expressions-20260922-manifest.json`|1860|1860|0|`f1af992946ad5b539d97d2fa8e8dc92545a24f7d2a51d466d69a43f0d84a4803`|
|`unknown-expressions-20260923-manifest.json`|80|80|0|`a4c8bf6c9635bf366b3ab6edbc750bce5c89f27725669ca82f9b17eb44d2df8a`|
|`unknown-expressions-20260923-review.json`|160|160|0|`8072dd047ef4c7c37b826cd82ef6751a544da31f890955b484ec68fec1f80837`|
|`venus-flytrap-expressions-20260922-manifest.json`|80|47|33|`bcf2d750da27106308a0059a808cc8025b2d55fcd338ea608fde5e40ffd31354`|
|`world-tree-expressions-20260923-manifest.json`|80|80|0|`d321180488cf8a8e742292d94955d3a2b35d87c637d367317317c1cd2993a2fd`|
|`world-tree-expressions-20260923-review.json`|80|80|0|`0bc0ac6834d3806b5b2416d65dc7c492bb339118591e60e8d9b8ea6a0f8f264b`|

## 旧hash90参照の全件追跡

各行は実際に現在と異なる旧記録を示す。現在hashは同一パスの最終PNGから独立再計算。81件の後続はmultiface、dragon/phoenixは同じreviewの現recordsおよび制作manifest。

|旧記録/JSON pointer|対象PNG|旧SHA256|現SHA256|
|---|---|---|---|
|`coral-expressions-20260917-manifest.json#/records/50`|`assets/characters/expressions/coral/06-critical.png`|`028540f847cf117bb9476ef4150e605128bd8f438227def2094040abdae8113f`|`4d8df653ef2af33ff104022d0713afe785d571f140c49a958875b78e29b5f7f9`|
|`coral-expressions-20260917-manifest.json#/records/52`|`assets/characters/expressions/coral/06-hungry.png`|`f3b1c6bb86be8d9598d8fae20aa90a033cc8fabe5c81782f182f85afd7aa05e2`|`d84d9a039a34a65ed8d84103dd8d616092bd9158cc189c28bc0daa4b3584f01f`|
|`coral-expressions-20260917-manifest.json#/records/53`|`assets/characters/expressions/coral/06-sick.png`|`479c948a7cd1d857ac55ff1c9e2d656461aa3d068b5cedef8e6d5df895abe545`|`70838932c51715c386444754ad89e5c122e5a8bad23a1c7c1d8467f51ea6a650`|
|`coral-expressions-20260917-manifest.json#/records/54`|`assets/characters/expressions/coral/06-sleeping.png`|`05826a06d1dcf890936e8a64cc1fc574ed3dffdca3ca7379bdbf9cd0c24bf0fa`|`e8569f771eb820b35e2cca20c158a659d8451e167b3ded76be0c8bcab62e1f9e`|
|`coral-expressions-20260917-manifest.json#/records/55`|`assets/characters/expressions/coral/06-strained.png`|`91bed0f3841083237320af2c871e674bcd85fcea6b852c3a61a9fcd7431675b7`|`1ca496da1fe1ba46927f6a55886cc02c6658b7a689fde04e5fcb8fabc1a7a909`|
|`coral-expressions-20260917-manifest.json#/records/56`|`assets/characters/expressions/coral/06-sulky.png`|`e04dd0fca93cb481ad8a8036c7c641504f8e9af1a21810d3302c34bdda2d596f`|`bb0193098946bb1501cb28f404ce844a8e5b756b4c30e369753e1ff34c74539b`|
|`coral-expressions-20260917-manifest.json#/records/57`|`assets/characters/expressions/coral/06-tired.png`|`f41d9f601b73ad83ec2e381ffc3a2324d84891235124d29dd113ecefb791f693`|`1927319fc86fe37a18fc714e3eeefc1c349e6c972f3b33e2d61129c0bcff1aac`|
|`coral-expressions-20260917-manifest.json#/records/59`|`assets/characters/expressions/coral/06-weak.png`|`6823a45aced48c80d6da53e835d99d4a0b061d7d050622e4c6565df47b89ded2`|`8e4a002d6f31a46ec9e86fc0458eab25f75c7c1e0f78bb8aa3fecd5fd192736f`|
|`coral-expressions-20260917-manifest.json#/records/60`|`assets/characters/expressions/coral/07-critical.png`|`0e9237bfde2fd6368709e0ae6647348711f93d9b6f10ddf496a5463f95fffd82`|`0f9bb636f820b585d6add6ffc0c6139c408df38ca28e619d3f588cb3c22f7b38`|
|`coral-expressions-20260917-manifest.json#/records/62`|`assets/characters/expressions/coral/07-hungry.png`|`af1b03bff8ff37acb00ce210185b72684bfb0b33f4b0ca0ebaea4e2ef19e5163`|`d6f4811364d8bf96260b6b132568c2f2e6338bf8bf3afde734cbc984a9b28518`|
|`coral-expressions-20260917-manifest.json#/records/63`|`assets/characters/expressions/coral/07-sick.png`|`2d6d63114a6beb86e94ca293ceb1cd264d2d17b699cc9208cc879204a9f0d9ff`|`de814069ad084cc74627418108c84f2aadfc4a97d126f382716cb2f783d6a3a0`|
|`coral-expressions-20260917-manifest.json#/records/64`|`assets/characters/expressions/coral/07-sleeping.png`|`5d22c4db60a814b5d3ab6679d9495c9fbe75c4d4cccb6aa029e354ed258490cc`|`7cd0f926415c51730d0a955f2bdd05c641a12c2b00d697a1ceacd2d0e9835ee7`|
|`coral-expressions-20260917-manifest.json#/records/65`|`assets/characters/expressions/coral/07-strained.png`|`51bdad5c44eeb489ea32bf3839fda8fef056011f2d5618ac09912500675e3970`|`3fc25180df7f7aa658688b24cdea70f97ac4a9bd1e275b1610618c368c30e8f2`|
|`coral-expressions-20260917-manifest.json#/records/66`|`assets/characters/expressions/coral/07-sulky.png`|`9a7e6997f374371d6ee31792e2d222953847c286958b3bb98eb3069020693976`|`e6082870adb66274506616966acbf4fbd53ab43301cb62d927a4da65e1248d6b`|
|`coral-expressions-20260917-manifest.json#/records/67`|`assets/characters/expressions/coral/07-tired.png`|`dc8691e9652d0f3a80d258712952f20d1be54996cd1c4df5cbdf6dbed9ae09dd`|`6a86521b1a29411d915ac0faabf6448d07e6c39e1f2635fe3736f2555e9e877b`|
|`coral-expressions-20260917-manifest.json#/records/69`|`assets/characters/expressions/coral/07-weak.png`|`bb6477e41a123083042eae7855d0dc1f96c3ae243fbcf2f1528e27c31f8b18d7`|`0ee6b45b0390cfd69fbcb2c7c71ce992a7fd614f563d386dfc34f155a307b800`|
|`coral-expressions-20260917-manifest.json#/records/70`|`assets/characters/expressions/coral/08-critical.png`|`f621a8597e576e6a22d25ac692e3bd50314b468a5d14fc4f798dec76e8486685`|`d03be735581feaa6b6972074969d2db5aa5e729ce597cbfc0eb9ecdabf6b0726`|
|`coral-expressions-20260917-manifest.json#/records/72`|`assets/characters/expressions/coral/08-hungry.png`|`6c69477c85625507ce32a437daaa886b19ff42cc8b9b6e8ce31dc26888588396`|`2afed33001f53f3fed53902e6d6a9143a63f6670a34cab411c86736cbc33a47c`|
|`coral-expressions-20260917-manifest.json#/records/73`|`assets/characters/expressions/coral/08-sick.png`|`17e66060d64653c36a2272f258bace068ca9a1fd6d8919b32b831d00d347995f`|`2fd9b9a158ffc72eb74f56087d0bb0fe23812b2facf83de997ac6cb7cd937b1b`|
|`coral-expressions-20260917-manifest.json#/records/74`|`assets/characters/expressions/coral/08-sleeping.png`|`5eb7c53dfaf2cdef3e944d78e2a2d67a1a8acb29401d6b8437212964037ef3db`|`db90ab5d7a535ed00af0c42395dbb7aad76ccfc66fe39e513644e41a22d28b32`|
|`coral-expressions-20260917-manifest.json#/records/75`|`assets/characters/expressions/coral/08-strained.png`|`c133afc259b0cf197cf93817553b8d959edb5eefc34e2add700b6fe4ae7f45d2`|`0fd716a079fd3c71974f0a94e313f838d99d8b48aa8920d0acfdee58539f8c2d`|
|`coral-expressions-20260917-manifest.json#/records/76`|`assets/characters/expressions/coral/08-sulky.png`|`f3ae49fe3d9003a1d02bc067738591e05028a4fabe47b11a6795051b8c29ccc3`|`ea011726209a87f6c0dabf2b4296316af4f661db33d6489fbdd91ecbd05e5ddc`|
|`coral-expressions-20260917-manifest.json#/records/77`|`assets/characters/expressions/coral/08-tired.png`|`688f4964d49b1ffcedcad41883f099fa187ef8ded138cb533a5951617b026b75`|`1142ca8e640c7c087b7032486180e80ff76c66e16d9f1bbf317bed224885a928`|
|`coral-expressions-20260917-manifest.json#/records/79`|`assets/characters/expressions/coral/08-weak.png`|`c46f0c24a2e3731e2ca6170c20074cfb2f0f8b6ee7653f4de627819c718b8d52`|`343bccf818daab9c852f52cc60521d1f2c8ded1adc73b80f4cf8330cadf00096`|
|`dragon-expressions-20260922-review.json#/revision_history/0`|`assets/characters/expressions/dragon/02-hungry.png`|`ba10c6d535c57d2067e7520f5f1ab630f6035bbedf7f4174a6fc6c686c13aa8d`|`3c10c24b5e27b72f59229c4de1976cc219247178b0ebe86ad98933a2c035ec28`|
|`dragon-expressions-20260922-review.json#/revision_history/1`|`assets/characters/expressions/dragon/02-sick.png`|`58d9d7e6fc2bff3d299857c33cebdc37c1d2bea2614e8a6df08dd35519634438`|`2947bab8d00217bfc1ed83de4ac69ef4850bef1b24cda5e65dc7a9a50733bef4`|
|`dragon-expressions-20260922-review.json#/revision_history/2`|`assets/characters/expressions/dragon/02-tired.png`|`babb9d61c288a09c0d6c8fcc95a72f328dfde2cf64f76443ca9f32ea5044e86c`|`08fa5ec4b2ae1f1fa036ccb7870de44478265628f8e48717f620f9ea0ffc0393`|
|`dragon-expressions-20260922-review.json#/revision_history/3`|`assets/characters/expressions/dragon/02-sulky.png`|`56702ba3bad67c789665dc272c1b317ecc26758489d6a7beefc479c9705c35ac`|`f0d1a6dc8b1419b13b0fd2c2fe5d64bdc2315b5d3f1121af7df432a977b1fb5c`|
|`dragon-expressions-20260922-review.json#/revision_history/4`|`assets/characters/expressions/dragon/02-critical.png`|`46395d2b3aef9e038c56fb96318c6eb2c40be98556e27549cfbab9c83995a786`|`7486b94d20624d13b35a6b749e2fb6a04eae298ec8e4520d392286b8e6b16e8f`|
|`dragon-expressions-20260922-review.json#/revision_history/5`|`assets/characters/expressions/dragon/02-wantsPlay.png`|`02544fa8d834a583fbd3d254649bc3c85559d2ded5ad8e5fdff443eb4069bcde`|`b875228b4545925614958b8c92f43b63c3d15a2dd6c3053dad61ea68f6185411`|
|`dragon-expressions-20260922-review.json#/revision_history/6`|`assets/characters/expressions/dragon/02-sleeping.png`|`43349e79e2a24d5c67082ef775971f14adc0ca903b94ddbe1dfeb9faf5cc60e0`|`086aaabb7a38d690e7fddd6f74dae0da71df56f5002a900e0cd1d353d81f77fa`|
|`dragon-expressions-20260922-review.json#/revision_history/7`|`assets/characters/expressions/dragon/02-tired.png`|`cb05a92a958f069cf0bb55e71c0f92370f3906bf8fcf0cf2a2719b25e2da9bc6`|`08fa5ec4b2ae1f1fa036ccb7870de44478265628f8e48717f620f9ea0ffc0393`|
|`phoenix-expressions-20260923-review.json#/superseded_reviews/0`|`assets/characters/expressions/phoenix/05-hungry.png`|`fb1ec05e7c1c37f922fc35a93f73e4f4bd774117138fa1b4dcb420e5b0dadcb2`|`61f494fb5933ac025380258c1af4c5dca19b42930c67fed43768d4f501eb40b5`|
|`sakura-expressions-20260918-manifest.json#/records/40`|`assets/characters/expressions/sakura/05-critical.png`|`336dc1c74074cbedcdb7a96b0dff0a9365d7d94a1123b08de7e783ad5f4301fd`|`4f78fcc6488d376f810f9875ef5b529a5cb60f9dd73cc819f7d3bb216db02773`|
|`sakura-expressions-20260918-manifest.json#/records/42`|`assets/characters/expressions/sakura/05-hungry.png`|`4486d366004c827d42510527c1ea6de9af79a8537dc8d7c8d86ffa2cf2c8abbe`|`b4b65c2768865c684c27de0673e7ba7e0d8aef08de90da8c680a103ec3b50023`|
|`sakura-expressions-20260918-manifest.json#/records/43`|`assets/characters/expressions/sakura/05-sick.png`|`5e34ffef047abfc44beb92895a9d8a3dede8891b1bd9d3269bfb00d7684555ee`|`869e871beda515b27622ed86fabfc2b8915bd0aca7f4ab1de9d4a8ba7fbebba4`|
|`sakura-expressions-20260918-manifest.json#/records/44`|`assets/characters/expressions/sakura/05-sleeping.png`|`4d72be3e3e15702f4ed8ad72e61a9db9ac37e575c30c7cbee5596e8b0bb39bfa`|`a736dd60e622316ec4c27af2f2d006b547bef053af5c570bb43937bb38bbec5a`|
|`sakura-expressions-20260918-manifest.json#/records/45`|`assets/characters/expressions/sakura/05-strained.png`|`df6328542be053e2ccbaa09f9cbe5c5e2dfc5ad3766c688819bf1feb62d40b9c`|`ad93127aafa64e4769f96266b4d229b645542e7f2b80963b18b0504c2d4b9297`|
|`sakura-expressions-20260918-manifest.json#/records/46`|`assets/characters/expressions/sakura/05-sulky.png`|`06775c0c223d68896e0750ec3b03d4bf51e125c14046f1f8e53b67818cc8cd20`|`6761487fdda60ee51209eae3215503ecc9089a24b410cfb9f522c3f497c0ccba`|
|`sakura-expressions-20260918-manifest.json#/records/47`|`assets/characters/expressions/sakura/05-tired.png`|`aba3dd6e4ebc715521a889cc00ec990fd87a0291ce6743e87221cbd94e0f16ee`|`7e531252dd5a79417fadc2ec135abf14bfa4412b392379288a33f446e848744e`|
|`sakura-expressions-20260918-manifest.json#/records/49`|`assets/characters/expressions/sakura/05-weak.png`|`de90a70bb657e5cfb3e2f32495208b82833216f1b4a8e8aea8c5dec462960a72`|`1687fcbfa5a74ad36c5d883fc5f11b927507029acf20274b1254eec407e15423`|
|`sakura-expressions-20260918-manifest.json#/records/50`|`assets/characters/expressions/sakura/06-critical.png`|`223e0343e8baacecc0abe20473498b422f5d7579b7dd4a177be2f6fdc171f330`|`c3d20ab745de2b64052797922cde20ec1b85577f0ffe77cbb9de62c0bb9d9d4d`|
|`sakura-expressions-20260918-manifest.json#/records/52`|`assets/characters/expressions/sakura/06-hungry.png`|`ff8c3424e10d4c08c8aded87c829ed999fe1b740d579328246774433fbdffc80`|`3294c8d04494cb4ab0935655713591dbb7c5803e56c56c9d72b9f089e1730784`|
|`sakura-expressions-20260918-manifest.json#/records/53`|`assets/characters/expressions/sakura/06-sick.png`|`b231eb826d290eed8352dc074a0932c0a802a140d9ce797a52710c96a0d0d79f`|`effdde2f7d52cda6e898c73e4064b67e55b4df3469914630071446e2a9308ce2`|
|`sakura-expressions-20260918-manifest.json#/records/54`|`assets/characters/expressions/sakura/06-sleeping.png`|`e19d3ada1f59ec6a5bd07ec7d303df8131abcabde97e560cc7d8f283cb279d48`|`3a04762bc417d2a4db882c44c8d90a8d36f7124c8d5c60781b8341e35446ee67`|
|`sakura-expressions-20260918-manifest.json#/records/55`|`assets/characters/expressions/sakura/06-strained.png`|`9a7bba3087be929973364767bd2954d4e9cf34bce67b4ad1c95796376be23874`|`ae620f56c0c73be1f8a69c91279f7a2ad8dc5356d59f1b5b2de9c6f5f98be273`|
|`sakura-expressions-20260918-manifest.json#/records/56`|`assets/characters/expressions/sakura/06-sulky.png`|`4de5ede699ff1592ba15e28b782dccd9deb8c21b5b1241792aaebf489a6b9c84`|`bd43a31e8dd9e2dfa9d553ea0dd19b0293ef3f2abe40bd70990d73156628f738`|
|`sakura-expressions-20260918-manifest.json#/records/57`|`assets/characters/expressions/sakura/06-tired.png`|`867004dac36b6a46ac67325245b50a738cf1e1b1fd6c558f68b78cfd13cde72b`|`5238ae20db9353800ab3044e50ed5a7942074954591548508f0808c2cefda69f`|
|`sakura-expressions-20260918-manifest.json#/records/59`|`assets/characters/expressions/sakura/06-weak.png`|`5f464e3332a963bf609eb9438cace59e33f5f505270271025512398883eaf394`|`b2945435e01d1bb30f39c5c1009d8b6219abfb799343b942a537cc2a5a947f1d`|
|`sakura-expressions-20260918-manifest.json#/records/60`|`assets/characters/expressions/sakura/07-critical.png`|`f85564d2c85fab044ac8bcd4879d901f76608a84534e345176542ee22376cde7`|`39fde2de25ca01a3dde10a68cdc39e2f747e7387678ef37b676af00ecda0a582`|
|`sakura-expressions-20260918-manifest.json#/records/62`|`assets/characters/expressions/sakura/07-hungry.png`|`db15f3076303510a0d16fd8c2a797320b574395bf6c0ed3443f11a151940f9a4`|`409bdf01a71c9dbf73696c79c7ee660b3fd945b1ab76403cdee787e6117beb21`|
|`sakura-expressions-20260918-manifest.json#/records/63`|`assets/characters/expressions/sakura/07-sick.png`|`c97110225c9ca7e2d64764b4fb5cede1ef760ac886f6b2285ef2e4cab2603fa5`|`6c6702bbfd212271ce2beba71ddfc959c650096a5dfe8b46a416eb02a196c5c1`|
|`sakura-expressions-20260918-manifest.json#/records/64`|`assets/characters/expressions/sakura/07-sleeping.png`|`298ab4aa11261d7ffc96476ad21dd47498c538e3297e0d2943bec079af47a7ab`|`3f306178208905276c066b242c9827e47921ffbe10cd0ab1371e54601f78f421`|
|`sakura-expressions-20260918-manifest.json#/records/65`|`assets/characters/expressions/sakura/07-strained.png`|`0b9664fbd0fe8ea6fe674a2b045e25b57a685a18f26e0353cc8d3ddcd266097d`|`4acdb207aa6187afe77d0309805f425581cebd4beb858a6fcffcd3618911e024`|
|`sakura-expressions-20260918-manifest.json#/records/66`|`assets/characters/expressions/sakura/07-sulky.png`|`a66fa01e5336f927a2470e7127350949db7b283a0ed0bd289d02946e5eea0d3e`|`c993b4d4a8057bb10b3da2e36c941c908383b35e1312f3a7d60f540284aa2a87`|
|`sakura-expressions-20260918-manifest.json#/records/67`|`assets/characters/expressions/sakura/07-tired.png`|`865c0baf783e67ff943187dba0156be5fe133f6fe34cb16eab2e4d41c6a5af5a`|`c9ebc4bbb459e41cdbfd0eb09b613ab81e52b9e8e3f93b07befccda24654c24a`|
|`sakura-expressions-20260918-manifest.json#/records/69`|`assets/characters/expressions/sakura/07-weak.png`|`41c2bf28a9bce477febe49ec717ed711fa26639f51f3e4779367a1da0a8d2025`|`940437b6a21e015d295804c9baa6dafadd0bd769f16fa2f09a16c0a29b0bec34`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/30`|`assets/characters/expressions/venus_flytrap/04-critical.png`|`957b48b1c5248c9b6edca2435492dd4c901d4ead20090d4c569042c866841bb7`|`98cf05412346bad505a5102dee5fc584cbe62140dfea5fa8d531d6e3c35ad6f9`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/32`|`assets/characters/expressions/venus_flytrap/04-hungry.png`|`8e8b3445d97bdf1186e80bd51cf40047fa1785cbe4ac61ae06f21f3a6881082c`|`91e9510f506fe20a4e06dd7b99f89c97b9b9a4593a11040653de9e333a54c30b`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/33`|`assets/characters/expressions/venus_flytrap/04-sick.png`|`a6a92a9aa8e8fd1af741cae4cdc7e4d0916bbf44918b6fd692f8b6e2626eb16a`|`4631413603d6342b0a3d6f27cd9f8a62a235b4d34e64766019c610f351757b5b`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/34`|`assets/characters/expressions/venus_flytrap/04-sleeping.png`|`a5e0be44c6833d2bf92a6e465e5885721e8f1012e65dc9148607421d863e706c`|`0aa72ece0538b11c05aeac8810ff08516d495b1f3dcb9a001ddda24c3623e31a`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/35`|`assets/characters/expressions/venus_flytrap/04-strained.png`|`21886ea992a12cb49b40d061d2c7f913759c61e1dfb163e3b762f40a5811978d`|`e06318291acfcda4932c70c9119cb4cbbba5e59d4e1516c803ae2074c07a0666`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/36`|`assets/characters/expressions/venus_flytrap/04-sulky.png`|`8dbe5dced7ab18b74f880dce67d7780c6f9258cfbb0dc09b25f077962c9c52d8`|`190c2a460a575a00457a89306aa53a34b8e79200b90a56d07f1e7f125cf5472a`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/37`|`assets/characters/expressions/venus_flytrap/04-tired.png`|`b9a9ecb00e8a9d0fff4cb106e9db5c9933fe6443283def25c275c6487abc6f07`|`a9673f74ac6b3d3f47e2690e7fe4096d75287cc36f509e61797653d4550d3146`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/38`|`assets/characters/expressions/venus_flytrap/04-wantsPlay.png`|`56d9e4a9bf9faeeaf84dbb68aeedbcd6025ca797ff343d65ce59293f1498b755`|`a83f0f86f056d845f324bb031b9b72b4c1b2dd87c8e02a7ccb67769541e5d547`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/39`|`assets/characters/expressions/venus_flytrap/04-weak.png`|`4217e61b57cd33ec9621bf6ea70657941c080b3844134dfe8343f3a998a7e357`|`5ef7a6fcaeea64923d0b706acfb45b893f6cbd08bf5a12eb6ee2b60c3975dbc7`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/40`|`assets/characters/expressions/venus_flytrap/05-critical.png`|`78b616f5d93578010a8692d6fcdce0570b3e04a23e76357b7f90639b589c9aa1`|`c716eacf0b46acbfa843b017c7f1d768523d0771b3db1b2f7b7e99e0f6c9bf19`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/42`|`assets/characters/expressions/venus_flytrap/05-hungry.png`|`21284744d09da2d313a744c6b79cbc03dfe6a5d998f08b1038d26854aec37251`|`f598e6df482095a3e6fa172ce9ef14170c84a32170c3e4b1398981cd8021901a`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/43`|`assets/characters/expressions/venus_flytrap/05-sick.png`|`666253ec496879e52d57bdfd31b990e146b8d0040e1246c45e5f76fda5bbb0c0`|`eb7d7a79e27f8e99dfa16de2dbca1f571a826b7fcadcfad55a937af72014c4a9`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/44`|`assets/characters/expressions/venus_flytrap/05-sleeping.png`|`5cfb6b4820666b79f7493a70d9c056cf0e5e5f7d2fb3024317184bb9a2174052`|`1e16a7330dd2a5ed70c09497b5c020fb8e33ebe6bc3605edc147bd2a9644af89`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/45`|`assets/characters/expressions/venus_flytrap/05-strained.png`|`305cd7c553e0ef81a1508e908e133395be8ab44cb452fb3fef92784331192bb0`|`fe1b0143a7ec7093d3c4492e601d9dc287864a94db71f668192d1dd42a020681`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/46`|`assets/characters/expressions/venus_flytrap/05-sulky.png`|`3eac7d19b6f6e77a9ed8a9168a39328083cdec0f42bd927dca3cb573651677c2`|`74dbb808d0a94397aedbbdf3289065af7910781dfb8ad1522b65a854ee720e44`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/47`|`assets/characters/expressions/venus_flytrap/05-tired.png`|`eb98b6235243750947251184e0ece6974eeb405673bbceb919a650bca22869ec`|`d242fb82cb4db27d3473e604c6987b23324386b58ceb68f398a56eca5569d36e`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/49`|`assets/characters/expressions/venus_flytrap/05-weak.png`|`4b4467902e4f8c1bdf00a8606447b87a39a0f02592115f61bb0d8b8fed1bfde6`|`362176916bb013768be00e809e6523b57ee397c187d44df1ae43ea50aa8c3e32`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/60`|`assets/characters/expressions/venus_flytrap/07-critical.png`|`f3305fa98941a143b461c1c82eb0dfd9c06a19dee8d40cd6a72618638169a696`|`afc03f04e81fcc1ed9753d4ffbf260de15ee28aa3a2021a39b0f7e0d45ae2510`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/62`|`assets/characters/expressions/venus_flytrap/07-hungry.png`|`adaafaa6f9efdb9c242f8ec39d7887b1584069357d3e35e81b92bb567ca0a9d2`|`46cbfa9950bb1d711cd63f842f401e5a41ebcc47a37724cf783dd60f51562064`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/63`|`assets/characters/expressions/venus_flytrap/07-sick.png`|`6033cb892ec49733e4e2b2ff44afdd269bad6bf2d78e2c93ecb392c980e18c8d`|`f3a87675e481364e1d355042f5a4dc258d12d7bc218fed5d51267e6b3e0daaf2`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/64`|`assets/characters/expressions/venus_flytrap/07-sleeping.png`|`6845a472629ec41e196e1f06cd30acb387b9b843cce0da21ca00547ce837a0a5`|`b8e8b94d136d6185cc1394ed4fa20175a249f67f8f591288eb40391a3b1c18a5`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/65`|`assets/characters/expressions/venus_flytrap/07-strained.png`|`1a5cb8f04e8f4a91fd08f916d0f0dd81021c7788e41419ec129b8b941ab003ab`|`d1794c721ea2c81ca7a5571aad175c12ee7f4e38aac6f02d722034d86e38debe`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/66`|`assets/characters/expressions/venus_flytrap/07-sulky.png`|`7679d2746dd8f7cbbbaa3f8659f86d49b88c2413cc48cfdb9bd959d5bae6ae2c`|`27523779112f7807335388a3e933fa2b9db95a8a00f3a55c8f719fad88b71998`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/67`|`assets/characters/expressions/venus_flytrap/07-tired.png`|`da918215f4e186017e1cf229c84f3cb2e0d5e5d9657f17ee6893ab75ee58b0e9`|`e9ef1c68740dcffa27eb1e71b82b43c878ad1ff294573354e18d2bb933cdf7f3`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/69`|`assets/characters/expressions/venus_flytrap/07-weak.png`|`d18235f86b25edf7be43bc4054f40e1ee857ffa0b95982b89e2d480df429867f`|`dc1486bc547f73ae857bfd24639f3866c2490ecca54ec703c24b3ed87895bfba`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/70`|`assets/characters/expressions/venus_flytrap/08-critical.png`|`422ab03a8de1bb6afd454c4cdba88a811a35f4d9aae39468c72d6140dc047716`|`50c82e52a71c7fcf95f1ae61d080dd9d19cee402e4a8d5a8fee66ff06f72dce5`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/72`|`assets/characters/expressions/venus_flytrap/08-hungry.png`|`f5a5270ec8f674688ae4c6495c24c38778977d729d86b80e802d4e0effd9198c`|`76904891107c836cb62baa7f21247abb0b82711e7ef1d6f814e60ead3bf1a9f7`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/73`|`assets/characters/expressions/venus_flytrap/08-sick.png`|`81ccc5b0ee77bca0769e10b5c1cf915e598cd5ed92bbb1fb4e67fa259d503ac1`|`e1b64f55fd66fe4382ddebb7e742814edd3fded52123d9aaf748c59c68366b30`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/74`|`assets/characters/expressions/venus_flytrap/08-sleeping.png`|`c89d8527c884ea6581aa7869e8613a819a5b639c1db80d49c79456a114debf25`|`678dfe871966d507faf6ec367b73d9c355d6bd4accca1c2d83f14cbddcd0b023`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/75`|`assets/characters/expressions/venus_flytrap/08-strained.png`|`728451864a5d6c2c2bbf313554a674dca68d850c4e09ea4b271a0cb454269832`|`b3fe82e0e9c108f9e45f2d6bb62945b724b81059ef9865976d304c73c0fdfbe9`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/76`|`assets/characters/expressions/venus_flytrap/08-sulky.png`|`39286c96247d9e09e2c1c958c14efbd715a871dd3325cf086eb5206bf773c2c2`|`46aa752e4b3f61359a0ac13d8d54ddae5c720cad921e7212dda60003a3b652ef`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/77`|`assets/characters/expressions/venus_flytrap/08-tired.png`|`666198fb5bdf16ae1d83addb422eb7df9d28afd0407f1fca1d45f028e996026f`|`077d545c7c41bae9b58e2bde8b7b1214287c95e2a40d4af9115f550d118c2a04`|
|`venus-flytrap-expressions-20260922-manifest.json#/records/79`|`assets/characters/expressions/venus_flytrap/08-weak.png`|`eb13a00e68f81d6680df247100d44be3d53d82c04cb2da4b3b5fac6ed554ff2f`|`512ba113f2352808b88d1885dcc405ffdcc49b0b8d9299aab7a71a990117f4e1`|

Runtime抽出元SHA256：`pet-expression.js` = `10e7a5b9e64c1ecfbedb1e272dff5a728849e9cfa6b9d8f55ff71dba28a1263c`。
