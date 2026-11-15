# VERSION8 名前監査 — 現行正式名と固定カード設計

再現: `node prototypes/card-game/design-comparison-v8-20261115/name-audit.mjs`

本編main: `408c72e6ebef71da3eab33cfb268c7494117aaaa`。PR551基準: `c04688e468d40c507c81352ce559e9a1282dee49`。追加7候補PR498: `948026343099e34628f5655ae240d1083763ea9e`。全件は名前の類似ではなくstable ID・段階番号で接続。文字列比較はUnicode完全一致。正式ファイルは変更しない。非プレイ作者naotoと旧セーブ専用種族11は現行31種×8の外側であり、似たカードへの推定対応を作らない。masterの明示alias／legacy-only方針はJSONに保持。

## 結果

| 項目 | 件数 |
| --- | --- |
| mainSpecies | 31 |
| mainStages | 248 |
| exactStageForms | 229 |
| intentionalStageDivergences | 19 |
| auxiliaryLineNamesExact | 31 |
| companionsExact | 26 |
| partnersExact | 18 |
| unmappedCards | 0 |
| stageNumberMismatches | 0 |
| currentStageDuplicateGroups | 9 |
| cardTitleDuplicateGroups | 10 |
| duplicateCanonicalCardNames | 0 |
| previousKanjiCandidates | 14 |
| candidatesMatchingOfficialCards | 11 |
| candidatesMatchingPR498Only | 3 |
| additionalCandidateCards | 7 |
| totalReviewedCards | 459 |
| kanjiCandidatesWithExactMainEntity | 8 |
| kanjiCandidatesWithLiveMainEntity | 6 |
| legacyNameDifferences | 1 |

31種×8段階=248枚に欠落・段階番号のずれなし。補助種族名31、なかま26、こいびと18は本編と完全一致。段階名は229一致、19差分。19件は固定カード設計の保持という既存方針による差分であり、誤字修正対象と断定しない。

本編masterとcurrent full-catalogはPR551と最新mainでバイト一致。script.jsにはBGM等の4行差分があるが名前データは変わらない。index.htmlのasset queryは別途provenanceで記録。

## 表示経路とキャッシュの境界

- 本編正式種族・段階名: character-world-master.v1.js → script.js installMasterSpecies()。進化messageも同じlabelから生成。
- 図鑑の種族見出しはSPECIES_DISPLAY_NAMES、解放済みセル・詳細名はSPECIES[line].stages[index].label。未解放の？？？はマスクで、正式名ではない。描画専用の別名表や名前保存キャッシュはここにはない。
- なかま図鑑はmaster.label → COMPANIONS/RARE_COMPANIONS.name。こいびと図鑑は現在のALL_PARTNER_CANDIDATES.label。結婚印💍は装飾。現在の同居相手や過去ログの保存labelとは別。
- index.htmlはquery付きmasterをscript.jsより先に読み込む。開いている実ブラウザの再読込状態は静的監査では未検証。
- CARD正式runtimeはengine.mjsがfull-catalog.mjsを読む。カード表題はform、補助名はnameから①〜⑧を除いた文字列。cards.mjsは旧ルール／既定デッキ用途。
- 固定設計はdocs/card-game/data/design-source-20260917/README.mdとtools/check-design-data.py:755に明示。設計commit 204f2b7453a9734be6a7a9708c89b4a4c6c5b16b。全248 formが固定設計と一致。

## 19件の意図された段階名差分

| cardID | 本編進化・図鑑 | CARD表題form | 判断 |
| --- | --- | --- | --- |
| M-starfish-01 | 浮遊幼生 | 丸いあかちゃん | 固定設計差分／未改名 |
| M-starfish-02 | 後期浮遊幼生 | 透けた小さな星 | 固定設計差分／未改名 |
| M-starfish-03 | 着底・変態期 | 色づく小さな星 | 固定設計差分／未改名 |
| M-starfish-04 | 変態後の稚ヒトデ | ふっくらした星 | 固定設計差分／未改名 |
| M-starfish-05 | 小型の稚ヒトデ | 金色の子ヒトデ | 固定設計差分／未改名 |
| M-starfish-06 | 若いヒトデ | ぶつぶつ子ヒトデ | 固定設計差分／未改名 |
| M-starfish-07 | 成熟したヒトデ | 大人のヒトデ | 固定設計差分／未改名 |
| M-starfish-08 | 長生きしたヒトデ | 大きなヒトデ | 固定設計差分／未改名 |
| M-sakura-01 | 芽ぶきのサクラ | 芽ぶきのたね | 固定設計差分／未改名 |
| M-world_tree-01 | 光るたね | 光る芽 | 固定設計差分／未改名 |
| M-world_tree-03 | 若い木 | 小さな木 | 固定設計差分／未改名 |
| M-world_tree-07 | 天にのびる木 | 雲をこえる木 | 固定設計差分／未改名 |
| M-unknown-02 | ぷるたま | ぷる | 固定設計差分／未改名 |
| M-unknown-03 | あしつきたま | 足？ | 固定設計差分／未改名 |
| M-unknown-04 | ふたつぶたま | 目？ | 固定設計差分／未改名 |
| M-unknown-05 | はねつきたま | 羽？ | 固定設計差分／未改名 |
| M-unknown-06 | おおたま | でっかい？ | 固定設計差分／未改名 |
| M-unknown-07 | ちいさなたま | ちっちゃい？ | 固定設計差分／未改名 |
| M-unknown-08 | もどりの点 | 点……？ | 固定設計差分／未改名 |

## 漢字・かなの確認

「若者」はman⑤・woman⑤の本編／図鑑／CARD formで既に完全一致。「若者れん」もren⑤で一致。「わかもの」からの現行改名は存在しない。少年・少女・子ども・大人・幼虫等も既に漢字を含む。19差分は単純なかな→漢字変換ではない。記録した完全一致に表記正規化や同義語推定は含めていない。

## 種族31・補助名31 — 全件

| species / characterID | 本編正式・図鑑種族名 | CARD補助名 | 一致 |
| --- | --- | --- | --- |
| man | おとこのひと | おとこのひと | 完全一致 |
| woman | おんなのひと | おんなのひと | 完全一致 |
| dog | いぬ | いぬ | 完全一致 |
| cat | ねこ | ねこ | 完全一致 |
| penguin | ペンギン | ペンギン | 完全一致 |
| turtle | かめ | かめ | 完全一致 |
| frog | かえる | かえる | 完全一致 |
| salmon | さけ | さけ | 完全一致 |
| clownfish | カクレクマノミ | カクレクマノミ | 完全一致 |
| butterfly | ちょう | ちょう | 完全一致 |
| beetle | カブトムシ | カブトムシ | 完全一致 |
| stagbeetle | クワガタムシ | クワガタムシ | 完全一致 |
| cicada | セミ | セミ | 完全一致 |
| antlion | アリジゴク | アリジゴク | 完全一致 |
| hermit_crab | ヤドカリ | ヤドカリ | 完全一致 |
| jellyfish | クラゲ | クラゲ | 完全一致 |
| starfish | ヒトデ | ヒトデ | 完全一致 |
| coral | サンゴ | サンゴ | 完全一致 |
| dandelion | タンポポ | タンポポ | 完全一致 |
| sakura | サクラ | サクラ | 完全一致 |
| venus_flytrap | ハエトリグサ | ハエトリグサ | 完全一致 |
| mushroom | キノコ | キノコ | 完全一致 |
| dragon | りゅう | りゅう | 完全一致 |
| phoenix | フェニックス | フェニックス | 完全一致 |
| god | かみさま | かみさま | 完全一致 |
| world_tree | 世界樹 | 世界樹 | 完全一致 |
| ghost | おばけ | おばけ | 完全一致 |
| star | ほし | ほし | 完全一致 |
| plush | ぬいぐるみ | ぬいぐるみ | 完全一致 |
| unknown | ？？？ | ？？？ | 完全一致 |
| ren | れんくん | れんくん | 完全一致 |

## メイン248 — 全件

段階は1起算、save stageIndex / dex keyは0起算。JSONには両方とsource path/line/SHAを保存。

| cardID | 本編進化・図鑑 | CARD正式名 | CARD表題form | 一致 |
| --- | --- | --- | --- | --- |
| M-man-01 | あかちゃん | おとこのひと① | あかちゃん | 完全一致 |
| M-man-02 | よちよち | おとこのひと② | よちよち | 完全一致 |
| M-man-03 | 子ども | おとこのひと③ | 子ども | 完全一致 |
| M-man-04 | 少年 | おとこのひと④ | 少年 | 完全一致 |
| M-man-05 | 若者 | おとこのひと⑤ | 若者 | 完全一致 |
| M-man-06 | 大人 | おとこのひと⑥ | 大人 | 完全一致 |
| M-man-07 | 落ちついた大人 | おとこのひと⑦ | 落ちついた大人 | 完全一致 |
| M-man-08 | おじいさん | おとこのひと⑧ | おじいさん | 完全一致 |
| M-woman-01 | あかちゃん | おんなのひと① | あかちゃん | 完全一致 |
| M-woman-02 | よちよち | おんなのひと② | よちよち | 完全一致 |
| M-woman-03 | 子ども | おんなのひと③ | 子ども | 完全一致 |
| M-woman-04 | 少女 | おんなのひと④ | 少女 | 完全一致 |
| M-woman-05 | 若者 | おんなのひと⑤ | 若者 | 完全一致 |
| M-woman-06 | 大人 | おんなのひと⑥ | 大人 | 完全一致 |
| M-woman-07 | 落ちついた大人 | おんなのひと⑦ | 落ちついた大人 | 完全一致 |
| M-woman-08 | おばあさん | おんなのひと⑧ | おばあさん | 完全一致 |
| M-dog-01 | あかちゃんいぬ | いぬ① | あかちゃんいぬ | 完全一致 |
| M-dog-02 | よちよちこいぬ | いぬ② | よちよちこいぬ | 完全一致 |
| M-dog-03 | こいぬ | いぬ③ | こいぬ | 完全一致 |
| M-dog-04 | わんぱくいぬ | いぬ④ | わんぱくいぬ | 完全一致 |
| M-dog-05 | 若いいぬ | いぬ⑤ | 若いいぬ | 完全一致 |
| M-dog-06 | 大人のいぬ | いぬ⑥ | 大人のいぬ | 完全一致 |
| M-dog-07 | 落ちついたいぬ | いぬ⑦ | 落ちついたいぬ | 完全一致 |
| M-dog-08 | おとしよりのいぬ | いぬ⑧ | おとしよりのいぬ | 完全一致 |
| M-cat-01 | あかちゃんねこ | ねこ① | あかちゃんねこ | 完全一致 |
| M-cat-02 | よちよちこねこ | ねこ② | よちよちこねこ | 完全一致 |
| M-cat-03 | こねこ | ねこ③ | こねこ | 完全一致 |
| M-cat-04 | おてんばねこ | ねこ④ | おてんばねこ | 完全一致 |
| M-cat-05 | 若いねこ | ねこ⑤ | 若いねこ | 完全一致 |
| M-cat-06 | 大人のねこ | ねこ⑥ | 大人のねこ | 完全一致 |
| M-cat-07 | 落ちついたねこ | ねこ⑦ | 落ちついたねこ | 完全一致 |
| M-cat-08 | おとしよりのねこ | ねこ⑧ | おとしよりのねこ | 完全一致 |
| M-penguin-01 | 小さなひな | ペンギン① | 小さなひな | 完全一致 |
| M-penguin-02 | ふわふわのひな | ペンギン② | ふわふわのひな | 完全一致 |
| M-penguin-03 | 大きなひな | ペンギン③ | 大きなひな | 完全一致 |
| M-penguin-04 | 羽の衣替え中 | ペンギン④ | 羽の衣替え中 | 完全一致 |
| M-penguin-05 | 若いペンギン | ペンギン⑤ | 若いペンギン | 完全一致 |
| M-penguin-06 | 大人のペンギン | ペンギン⑥ | 大人のペンギン | 完全一致 |
| M-penguin-07 | ベテランペンギン | ペンギン⑦ | ベテランペンギン | 完全一致 |
| M-penguin-08 | おとしよりペンギン | ペンギン⑧ | おとしよりペンギン | 完全一致 |
| M-turtle-01 | うまれたてのかめ | かめ① | うまれたてのかめ | 完全一致 |
| M-turtle-02 | ちびがめ | かめ② | ちびがめ | 完全一致 |
| M-turtle-03 | 子がめ | かめ③ | 子がめ | 完全一致 |
| M-turtle-04 | 若いかめ | かめ④ | 若いかめ | 完全一致 |
| M-turtle-05 | 大人のかめ | かめ⑤ | 大人のかめ | 完全一致 |
| M-turtle-06 | 大きなかめ | かめ⑥ | 大きなかめ | 完全一致 |
| M-turtle-07 | 古いかめ | かめ⑦ | 古いかめ | 完全一致 |
| M-turtle-08 | 長生きのかめ | かめ⑧ | 長生きのかめ | 完全一致 |
| M-frog-01 | ちびおたま | かえる① | ちびおたま | 完全一致 |
| M-frog-02 | おたまじゃくし | かえる② | おたまじゃくし | 完全一致 |
| M-frog-03 | 後ろ足が出たおたま | かえる③ | 後ろ足が出たおたま | 完全一致 |
| M-frog-04 | しっぽつきかえる | かえる④ | しっぽつきかえる | 完全一致 |
| M-frog-05 | 陸に上がったかえる | かえる⑤ | 陸に上がったかえる | 完全一致 |
| M-frog-06 | 子がえる | かえる⑥ | 子がえる | 完全一致 |
| M-frog-07 | 大人のかえる | かえる⑦ | 大人のかえる | 完全一致 |
| M-frog-08 | おとしよりのかえる | かえる⑧ | おとしよりのかえる | 完全一致 |
| M-salmon-01 | うまれたてのさけ | さけ① | うまれたてのさけ | 完全一致 |
| M-salmon-02 | 小さなさけ | さけ② | 小さなさけ | 完全一致 |
| M-salmon-03 | しま模様のさけ | さけ③ | しま模様のさけ | 完全一致 |
| M-salmon-04 | 銀色のさけ | さけ④ | 銀色のさけ | 完全一致 |
| M-salmon-05 | 海の若いさけ | さけ⑤ | 海の若いさけ | 完全一致 |
| M-salmon-06 | 大人のさけ | さけ⑥ | 大人のさけ | 完全一致 |
| M-salmon-07 | 川をのぼるさけ | さけ⑦ | 川をのぼるさけ | 完全一致 |
| M-salmon-08 | 赤く色づくさけ | さけ⑧ | 赤く色づくさけ | 完全一致 |
| M-clownfish-01 | 透けたあかちゃん | カクレクマノミ① | 透けたあかちゃん | 完全一致 |
| M-clownfish-02 | しまが出た子 | カクレクマノミ② | しまが出た子 | 完全一致 |
| M-clownfish-03 | かくれんぼの子 | カクレクマノミ③ | かくれんぼの子 | 完全一致 |
| M-clownfish-04 | 若いクマノミ | カクレクマノミ④ | 若いクマノミ | 完全一致 |
| M-clownfish-05 | 群れのクマノミ | カクレクマノミ⑤ | 群れのクマノミ | 完全一致 |
| M-clownfish-06 | 卵を守るオス | カクレクマノミ⑥ | 卵を守るオス | 完全一致 |
| M-clownfish-07 | メスへ変わる途中 | カクレクマノミ⑦ | メスへ変わる途中 | 完全一致 |
| M-clownfish-08 | 群れのリーダーのメス | カクレクマノミ⑧ | 群れのリーダーのメス | 完全一致 |
| M-butterfly-01 | うまれたてのいもむし | ちょう① | うまれたてのいもむし | 完全一致 |
| M-butterfly-02 | 育ちざかりのいもむし | ちょう② | 育ちざかりのいもむし | 完全一致 |
| M-butterfly-03 | 大きないもむし | ちょう③ | 大きないもむし | 完全一致 |
| M-butterfly-04 | さなぎの準備中 | ちょう④ | さなぎの準備中 | 完全一致 |
| M-butterfly-05 | さなぎ | ちょう⑤ | さなぎ | 完全一致 |
| M-butterfly-06 | 羽を広げたちょう | ちょう⑥ | 羽を広げたちょう | 完全一致 |
| M-butterfly-07 | 花めぐりのちょう | ちょう⑦ | 花めぐりのちょう | 完全一致 |
| M-butterfly-08 | 年を重ねたちょう | ちょう⑧ | 年を重ねたちょう | 完全一致 |
| M-beetle-01 | うまれたての幼虫 | カブトムシ① | うまれたての幼虫 | 完全一致 |
| M-beetle-02 | 育ちざかりの幼虫 | カブトムシ② | 育ちざかりの幼虫 | 完全一致 |
| M-beetle-03 | まるまる幼虫 | カブトムシ③ | まるまる幼虫 | 完全一致 |
| M-beetle-04 | さなぎ | カブトムシ④ | さなぎ | 完全一致 |
| M-beetle-05 | 出たてのカブトムシ | カブトムシ⑤ | 出たてのカブトムシ | 完全一致 |
| M-beetle-06 | 若いカブトムシ | カブトムシ⑥ | 若いカブトムシ | 完全一致 |
| M-beetle-07 | りっぱなカブトムシ | カブトムシ⑦ | りっぱなカブトムシ | 完全一致 |
| M-beetle-08 | 長生きカブトムシ | カブトムシ⑧ | 長生きカブトムシ | 完全一致 |
| M-stagbeetle-01 | うまれたての幼虫 | クワガタムシ① | うまれたての幼虫 | 完全一致 |
| M-stagbeetle-02 | 育ちざかりの幼虫 | クワガタムシ② | 育ちざかりの幼虫 | 完全一致 |
| M-stagbeetle-03 | 大きな幼虫 | クワガタムシ③ | 大きな幼虫 | 完全一致 |
| M-stagbeetle-04 | さなぎ | クワガタムシ④ | さなぎ | 完全一致 |
| M-stagbeetle-05 | 出たてのクワガタ | クワガタムシ⑤ | 出たてのクワガタ | 完全一致 |
| M-stagbeetle-06 | 若いクワガタ | クワガタムシ⑥ | 若いクワガタ | 完全一致 |
| M-stagbeetle-07 | りっぱなクワガタ | クワガタムシ⑦ | りっぱなクワガタ | 完全一致 |
| M-stagbeetle-08 | 長生きクワガタ | クワガタムシ⑧ | 長生きクワガタ | 完全一致 |
| M-cicada-01 | 小さな幼虫 | セミ① | 小さな幼虫 | 完全一致 |
| M-cicada-02 | 土ぐらしの幼虫 | セミ② | 土ぐらしの幼虫 | 完全一致 |
| M-cicada-03 | 旅立ち前の幼虫 | セミ③ | 旅立ち前の幼虫 | 完全一致 |
| M-cicada-04 | 地上に出たセミ | セミ④ | 地上に出たセミ | 完全一致 |
| M-cicada-05 | ぬけがらをぬぐセミ | セミ⑤ | ぬけがらをぬぐセミ | 完全一致 |
| M-cicada-06 | 若いセミ | セミ⑥ | 若いセミ | 完全一致 |
| M-cicada-07 | よく鳴くセミ | セミ⑦ | よく鳴くセミ | 完全一致 |
| M-cicada-08 | 年を重ねたセミ | セミ⑧ | 年を重ねたセミ | 完全一致 |
| M-antlion-01 | ちびアリジゴク | アリジゴク① | ちびアリジゴク | 完全一致 |
| M-antlion-02 | 巣作りアリジゴク | アリジゴク② | 巣作りアリジゴク | 完全一致 |
| M-antlion-03 | 大きなアリジゴク | アリジゴク③ | 大きなアリジゴク | 完全一致 |
| M-antlion-04 | 砂のまゆ | アリジゴク④ | 砂のまゆ | 完全一致 |
| M-antlion-05 | まゆの中のさなぎ | アリジゴク⑤ | まゆの中のさなぎ | 完全一致 |
| M-antlion-06 | 出たてのウスバカゲロウ | アリジゴク⑥ | 出たてのウスバカゲロウ | 完全一致 |
| M-antlion-07 | 飛び回るウスバカゲロウ | アリジゴク⑦ | 飛び回るウスバカゲロウ | 完全一致 |
| M-antlion-08 | 羽休めのウスバカゲロウ | アリジゴク⑧ | 羽休めのウスバカゲロウ | 完全一致 |
| M-hermit_crab-01 | ちびヤドカリ | ヤドカリ① | ちびヤドカリ | 完全一致 |
| M-hermit_crab-02 | 小さな貝の家 | ヤドカリ② | 小さな貝の家 | 完全一致 |
| M-hermit_crab-03 | 引っ越し中 | ヤドカリ③ | 引っ越し中 | 完全一致 |
| M-hermit_crab-04 | 若いヤドカリ | ヤドカリ④ | 若いヤドカリ | 完全一致 |
| M-hermit_crab-05 | ゆったり貝の家 | ヤドカリ⑤ | ゆったり貝の家 | 完全一致 |
| M-hermit_crab-06 | 大きな貝の家 | ヤドカリ⑥ | 大きな貝の家 | 完全一致 |
| M-hermit_crab-07 | ごうかな貝の家 | ヤドカリ⑦ | ごうかな貝の家 | 完全一致 |
| M-hermit_crab-08 | ベテランヤドカリ | ヤドカリ⑧ | ベテランヤドカリ | 完全一致 |
| M-jellyfish-01 | 岩ぐらしの子 | クラゲ① | 岩ぐらしの子 | 完全一致 |
| M-jellyfish-02 | 重なった子 | クラゲ② | 重なった子 | 完全一致 |
| M-jellyfish-03 | 星形の子 | クラゲ③ | 星形の子 | 完全一致 |
| M-jellyfish-04 | 小さなかさ | クラゲ④ | 小さなかさ | 完全一致 |
| M-jellyfish-05 | 若いクラゲ | クラゲ⑤ | 若いクラゲ | 完全一致 |
| M-jellyfish-06 | 大人のクラゲ | クラゲ⑥ | 大人のクラゲ | 完全一致 |
| M-jellyfish-07 | 大きなクラゲ | クラゲ⑦ | 大きなクラゲ | 完全一致 |
| M-jellyfish-08 | 年を重ねたクラゲ | クラゲ⑧ | 年を重ねたクラゲ | 完全一致 |
| M-starfish-01 | 浮遊幼生 | ヒトデ① | 丸いあかちゃん | 固定設計差分 |
| M-starfish-02 | 後期浮遊幼生 | ヒトデ② | 透けた小さな星 | 固定設計差分 |
| M-starfish-03 | 着底・変態期 | ヒトデ③ | 色づく小さな星 | 固定設計差分 |
| M-starfish-04 | 変態後の稚ヒトデ | ヒトデ④ | ふっくらした星 | 固定設計差分 |
| M-starfish-05 | 小型の稚ヒトデ | ヒトデ⑤ | 金色の子ヒトデ | 固定設計差分 |
| M-starfish-06 | 若いヒトデ | ヒトデ⑥ | ぶつぶつ子ヒトデ | 固定設計差分 |
| M-starfish-07 | 成熟したヒトデ | ヒトデ⑦ | 大人のヒトデ | 固定設計差分 |
| M-starfish-08 | 長生きしたヒトデ | ヒトデ⑧ | 大きなヒトデ | 固定設計差分 |
| M-coral-01 | 住みついた子 | サンゴ① | 住みついた子 | 完全一致 |
| M-coral-02 | ひとつのサンゴ | サンゴ② | ひとつのサンゴ | 完全一致 |
| M-coral-03 | 枝分かれサンゴ | サンゴ③ | 枝分かれサンゴ | 完全一致 |
| M-coral-04 | 小さなサンゴの森 | サンゴ④ | 小さなサンゴの森 | 完全一致 |
| M-coral-05 | 若いサンゴの森 | サンゴ⑤ | 若いサンゴの森 | 完全一致 |
| M-coral-06 | 色とりどりのサンゴ | サンゴ⑥ | 色とりどりのサンゴ | 完全一致 |
| M-coral-07 | 大きなサンゴの森 | サンゴ⑦ | 大きなサンゴの森 | 完全一致 |
| M-coral-08 | 広がるサンゴの海 | サンゴ⑧ | 広がるサンゴの海 | 完全一致 |
| M-dandelion-01 | 芽ぶきのたね | タンポポ① | 芽ぶきのたね | 完全一致 |
| M-dandelion-02 | ふたば | タンポポ② | ふたば | 完全一致 |
| M-dandelion-03 | 地面に広がる葉 | タンポポ③ | 地面に広がる葉 | 完全一致 |
| M-dandelion-04 | 葉がしげるタンポポ | タンポポ④ | 葉がしげるタンポポ | 完全一致 |
| M-dandelion-05 | つぼみ | タンポポ⑤ | つぼみ | 完全一致 |
| M-dandelion-06 | 花咲くタンポポ | タンポポ⑥ | 花咲くタンポポ | 完全一致 |
| M-dandelion-07 | わたげ | タンポポ⑦ | わたげ | 完全一致 |
| M-dandelion-08 | 旅立つたね | タンポポ⑧ | 旅立つたね | 完全一致 |
| M-sakura-01 | 芽ぶきのサクラ | サクラ① | 芽ぶきのたね | 固定設計差分 |
| M-sakura-02 | ふたばのサクラ | サクラ② | ふたばのサクラ | 完全一致 |
| M-sakura-03 | 小さなサクラ | サクラ③ | 小さなサクラ | 完全一致 |
| M-sakura-04 | 育ったサクラ | サクラ④ | 育ったサクラ | 完全一致 |
| M-sakura-05 | サクラのつぼみ | サクラ⑤ | サクラのつぼみ | 完全一致 |
| M-sakura-06 | サクラの花 | サクラ⑥ | サクラの花 | 完全一致 |
| M-sakura-07 | サクラの実 | サクラ⑦ | サクラの実 | 完全一致 |
| M-sakura-08 | 年を重ねたサクラ | サクラ⑧ | 年を重ねたサクラ | 完全一致 |
| M-venus_flytrap-01 | 目覚めるたね | ハエトリグサ① | 目覚めるたね | 完全一致 |
| M-venus_flytrap-02 | 小さな口の芽 | ハエトリグサ② | 小さな口の芽 | 完全一致 |
| M-venus_flytrap-03 | 若葉のハエトリグサ | ハエトリグサ③ | 若葉のハエトリグサ | 完全一致 |
| M-venus_flytrap-04 | 口を広げた葉 | ハエトリグサ④ | 口を広げた葉 | 完全一致 |
| M-venus_flytrap-05 | 育ちざかりの葉 | ハエトリグサ⑤ | 育ちざかりの葉 | 完全一致 |
| M-venus_flytrap-06 | 大きな口の葉 | ハエトリグサ⑥ | 大きな口の葉 | 完全一致 |
| M-venus_flytrap-07 | 口がいっぱい | ハエトリグサ⑦ | 口がいっぱい | 完全一致 |
| M-venus_flytrap-08 | 花咲くハエトリグサ | ハエトリグサ⑧ | 花咲くハエトリグサ | 完全一致 |
| M-mushroom-01 | キノコの小さな粒 | キノコ① | キノコの小さな粒 | 完全一致 |
| M-mushroom-02 | 広がるキノコの糸 | キノコ② | 広がるキノコの糸 | 完全一致 |
| M-mushroom-03 | 小さなキノコの芽 | キノコ③ | 小さなキノコの芽 | 完全一致 |
| M-mushroom-04 | のびる子キノコ | キノコ④ | のびる子キノコ | 完全一致 |
| M-mushroom-05 | 育ちざかりのキノコ | キノコ⑤ | 育ちざかりのキノコ | 完全一致 |
| M-mushroom-06 | かさを広げたキノコ | キノコ⑥ | かさを広げたキノコ | 完全一致 |
| M-mushroom-07 | 粉を飛ばすキノコ | キノコ⑦ | 粉を飛ばすキノコ | 完全一致 |
| M-mushroom-08 | 年を重ねたキノコ | キノコ⑧ | 年を重ねたキノコ | 完全一致 |
| M-dragon-01 | ちびりゅう | りゅう① | ちびりゅう | 完全一致 |
| M-dragon-02 | 子りゅう | りゅう② | 子りゅう | 完全一致 |
| M-dragon-03 | つのの生えたりゅう | りゅう③ | つのの生えたりゅう | 完全一致 |
| M-dragon-04 | 小さなつばさのりゅう | りゅう④ | 小さなつばさのりゅう | 完全一致 |
| M-dragon-05 | つばさの育ったりゅう | りゅう⑤ | つばさの育ったりゅう | 完全一致 |
| M-dragon-06 | 火をふくりゅう | りゅう⑥ | 火をふくりゅう | 完全一致 |
| M-dragon-07 | 大きなりゅう | りゅう⑦ | 大きなりゅう | 完全一致 |
| M-dragon-08 | いにしえのりゅう | りゅう⑧ | いにしえのりゅう | 完全一致 |
| M-phoenix-01 | 火のひな | フェニックス① | 火のひな | 完全一致 |
| M-phoenix-02 | よちよち火の鳥 | フェニックス② | よちよち火の鳥 | 完全一致 |
| M-phoenix-03 | 若い火の鳥 | フェニックス③ | 若い火の鳥 | 完全一致 |
| M-phoenix-04 | 空を飛ぶ火の鳥 | フェニックス④ | 空を飛ぶ火の鳥 | 完全一致 |
| M-phoenix-05 | 燃えさかる火の鳥 | フェニックス⑤ | 燃えさかる火の鳥 | 完全一致 |
| M-phoenix-06 | 金色の火の鳥 | フェニックス⑥ | 金色の火の鳥 | 完全一致 |
| M-phoenix-07 | 年を重ねた火の鳥 | フェニックス⑦ | 年を重ねた火の鳥 | 完全一致 |
| M-phoenix-08 | 灰からよみがえる鳥 | フェニックス⑧ | 灰からよみがえる鳥 | 完全一致 |
| M-god-01 | 光の粒 | かみさま① | 光の粒 | 完全一致 |
| M-god-02 | 光の子 | かみさま② | 光の子 | 完全一致 |
| M-god-03 | 小さな精霊 | かみさま③ | 小さな精霊 | 完全一致 |
| M-god-04 | 見習いかみさま | かみさま④ | 見習いかみさま | 完全一致 |
| M-god-05 | かみさま | かみさま⑤ | かみさま | 完全一致 |
| M-god-06 | 大いなるかみさま | かみさま⑥ | 大いなるかみさま | 完全一致 |
| M-god-07 | 神々しい光 | かみさま⑦ | 神々しい光 | 完全一致 |
| M-god-08 | 光そのもの | かみさま⑧ | 光そのもの | 完全一致 |
| M-world_tree-01 | 光るたね | 世界樹① | 光る芽 | 固定設計差分 |
| M-world_tree-02 | ふしぎな苗 | 世界樹② | ふしぎな苗 | 完全一致 |
| M-world_tree-03 | 若い木 | 世界樹③ | 小さな木 | 固定設計差分 |
| M-world_tree-04 | 精霊の木 | 世界樹④ | 精霊の木 | 完全一致 |
| M-world_tree-05 | 大樹 | 世界樹⑤ | 大樹 | 完全一致 |
| M-world_tree-06 | 巨大な木 | 世界樹⑥ | 巨大な木 | 完全一致 |
| M-world_tree-07 | 天にのびる木 | 世界樹⑦ | 雲をこえる木 | 固定設計差分 |
| M-world_tree-08 | 世界樹 | 世界樹⑧ | 世界樹 | 完全一致 |
| M-ghost-01 | 小さなたましい | おばけ① | 小さなたましい | 完全一致 |
| M-ghost-02 | ちびおばけ | おばけ② | ちびおばけ | 完全一致 |
| M-ghost-03 | いたずらおばけ | おばけ③ | いたずらおばけ | 完全一致 |
| M-ghost-04 | おばけ | おばけ④ | おばけ | 完全一致 |
| M-ghost-05 | 大きなおばけ | おばけ⑤ | 大きなおばけ | 完全一致 |
| M-ghost-06 | 昔からいるおばけ | おばけ⑥ | 昔からいるおばけ | 完全一致 |
| M-ghost-07 | おだやかなおばけ | おばけ⑦ | おだやかなおばけ | 完全一致 |
| M-ghost-08 | 旅立ち前のおばけ | おばけ⑧ | 旅立ち前のおばけ | 完全一致 |
| M-star-01 | 星のもとの雲 | ほし① | 星のもとの雲 | 完全一致 |
| M-star-02 | 集まる星の雲 | ほし② | 集まる星の雲 | 完全一致 |
| M-star-03 | うまれかけの星 | ほし③ | うまれかけの星 | 完全一致 |
| M-star-04 | 若い星 | ほし④ | 若い星 | 完全一致 |
| M-star-05 | 輝く星 | ほし⑤ | 輝く星 | 完全一致 |
| M-star-06 | ふくらんだ星 | ほし⑥ | ふくらんだ星 | 完全一致 |
| M-star-07 | はじける星 | ほし⑦ | はじける星 | 完全一致 |
| M-star-08 | 星のなごり | ほし⑧ | 星のなごり | 完全一致 |
| M-plush-01 | 新品のぬいぐるみ | ぬいぐるみ① | 新品のぬいぐるみ | 完全一致 |
| M-plush-02 | 遊び相手 | ぬいぐるみ② | 遊び相手 | 完全一致 |
| M-plush-03 | お気に入り | ぬいぐるみ③ | お気に入り | 完全一致 |
| M-plush-04 | よごれたぬいぐるみ | ぬいぐるみ④ | よごれたぬいぐるみ | 完全一致 |
| M-plush-05 | ほつれたぬいぐるみ | ぬいぐるみ⑤ | ほつれたぬいぐるみ | 完全一致 |
| M-plush-06 | つぎはぎ | ぬいぐるみ⑥ | つぎはぎ | 完全一致 |
| M-plush-07 | くたくた | ぬいぐるみ⑦ | くたくた | 完全一致 |
| M-plush-08 | 大切な宝物 | ぬいぐるみ⑧ | 大切な宝物 | 完全一致 |
| M-unknown-01 | 点 | ？？？① | 点 | 完全一致 |
| M-unknown-02 | ぷるたま | ？？？② | ぷる | 固定設計差分 |
| M-unknown-03 | あしつきたま | ？？？③ | 足？ | 固定設計差分 |
| M-unknown-04 | ふたつぶたま | ？？？④ | 目？ | 固定設計差分 |
| M-unknown-05 | はねつきたま | ？？？⑤ | 羽？ | 固定設計差分 |
| M-unknown-06 | おおたま | ？？？⑥ | でっかい？ | 固定設計差分 |
| M-unknown-07 | ちいさなたま | ？？？⑦ | ちっちゃい？ | 固定設計差分 |
| M-unknown-08 | もどりの点 | ？？？⑧ | 点……？ | 固定設計差分 |
| M-ren-01 | ちびれん | れんくん① | ちびれん | 完全一致 |
| M-ren-02 | げんきれん | れんくん② | げんきれん | 完全一致 |
| M-ren-03 | 子どもれん | れんくん③ | 子どもれん | 完全一致 |
| M-ren-04 | 少年れん | れんくん④ | 少年れん | 完全一致 |
| M-ren-05 | 若者れん | れんくん⑤ | 若者れん | 完全一致 |
| M-ren-06 | 大人れん | れんくん⑥ | 大人れん | 完全一致 |
| M-ren-07 | 年を重ねたれん | れんくん⑦ | 年を重ねたれん | 完全一致 |
| M-ren-08 | おじいちゃんれん | れんくん⑧ | おじいちゃんれん | 完全一致 |

## なかま26・こいびと18 — 全件

| 区分 | characterID | cardID | 本編正式・図鑑 | CARD正式 | 一致 |
| --- | --- | --- | --- | --- | --- |
| companion | cat_friend | C-cat_friend | きまぐれなねこ | きまぐれなねこ | 完全一致 |
| companion | rabbit_friend | C-rabbit_friend | すばしっこいうさぎ | すばしっこいうさぎ | 完全一致 |
| companion | tanuki | C-tanuki | いたずらたぬき | いたずらたぬき | 完全一致 |
| companion | squirrel | C-squirrel | おっちょこちょいリス | おっちょこちょいリス | 完全一致 |
| companion | owl | C-owl | ものしりふくろう | ものしりふくろう | 完全一致 |
| companion | otter | C-otter | あそびずきカワウソ | あそびずきカワウソ | 完全一致 |
| companion | hamster | C-hamster | ほおぶくろハムスター | ほおぶくろハムスター | 完全一致 |
| companion | panda | C-panda | ぐうたらパンダ | ぐうたらパンダ | 完全一致 |
| companion | monkey | C-monkey | まねっこサル | まねっこサル | 完全一致 |
| companion | parrot | C-parrot | おしゃべりオウム | おしゃべりオウム | 完全一致 |
| companion | sheep | C-sheep | ふわふわヒツジ | ふわふわヒツジ | 完全一致 |
| companion | seal | C-seal | ごろごろアザラシ | ごろごろアザラシ | 完全一致 |
| companion | bat | C-bat | よふかしコウモリ | よふかしコウモリ | 完全一致 |
| companion | chicken | C-chicken | はやおきニワトリ | はやおきニワトリ | 完全一致 |
| companion | penguin_friend | C-penguin_friend | すべりたがりペンギン | すべりたがりペンギン | 完全一致 |
| companion | hedgehog | C-hedgehog | びっくりハリネズミ | びっくりハリネズミ | 完全一致 |
| companion | shiba | C-shiba | ひとなつっこいしばいぬ | ひとなつっこいしばいぬ | 完全一致 |
| companion | snail | C-snail | せっかちなカタツムリ | せっかちなカタツムリ | 完全一致 |
| companion | punyu | C-punyu | とけかけのぷにゅ | とけかけのぷにゅ | 完全一致 |
| companion | sekizou | C-sekizou | むひょうじょうのせきぞう | むひょうじょうのせきぞう | 完全一致 |
| companion | chameleon | C-chameleon | サングラスのカメレオン | サングラスのカメレオン | 完全一致 |
| companion | clock | C-clock | じかんにルーズなとけい | じかんにルーズなとけい | 完全一致 |
| companion | unicorn | C-unicorn | まよいこんだユニコーン | まよいこんだユニコーン | 完全一致 |
| companion | many_tail_fox | C-many_tail_fox | しっぽのおおいきつね | しっぽのおおいきつね | 完全一致 |
| companion | watcher | C-watcher | みているなにか | みているなにか | 完全一致 |
| companion | box | C-box | ただのはこ | ただのはこ | 完全一致 |
| partner | cat_ceo | P-cat_ceo | ビルのねこ社長 | ビルのねこ社長 | 完全一致 |
| partner | robot_neighbor | P-robot_neighbor | となりまちのロボット | となりまちのロボット | 完全一致 |
| partner | field_cow | P-field_cow | のはらのうしさん | のはらのうしさん | 完全一致 |
| partner | sunflower_partner | P-sunflower_partner | はたけのひまわりさん | はたけのひまわりさん | 完全一致 |
| partner | forest_bear | P-forest_bear | もりのクマさん | もりのクマさん | 完全一致 |
| partner | grove_deer | P-grove_deer | こだちのシカ | こだちのシカ | 完全一致 |
| partner | cliff_goat | P-cliff_goat | がけのヤギさん | がけのヤギさん | 完全一致 |
| partner | high_eagle | P-high_eagle | たかねのワシ | たかねのワシ | 完全一致 |
| partner | snow_spirit | P-snow_spirit | ゆきのせいれい | ゆきのせいれい | 完全一致 |
| partner | snowman | P-snowman | とけないゆきだるま | とけないゆきだるま | 完全一致 |
| partner | rock_octopus | P-rock_octopus | いわばのタコさん | いわばのタコさん | 完全一致 |
| partner | sea_mermaid | P-sea_mermaid | うみのにんぎょ | うみのにんぎょ | 完全一致 |
| partner | anglerfish | P-anglerfish | ひかるチョウチンアンコウ | ひかるチョウチンアンコウ | 完全一致 |
| partner | swamp_croc | P-swamp_croc | ぬまのワニさん | ぬまのワニさん | 完全一致 |
| partner | gentle_gorilla | P-gentle_gorilla | やさしいゴリラ | やさしいゴリラ | 完全一致 |
| partner | knitting_spider | P-knitting_spider | あみものがすきなクモさん | あみものがすきなクモさん | 完全一致 |
| partner | desert_scorpion | P-desert_scorpion | さばくのサソリさん | さばくのサソリさん | 完全一致 |
| partner | oasis_cactus | P-oasis_cactus | オアシスのサボテンさん | オアシスのサボテンさん | 完全一致 |

## 重複名 — IDは重複しない

### currentStageNames

| 表示名 | 対象IDs |
| --- | --- |
| あかちゃん | M-man-01, M-woman-01 |
| よちよち | M-man-02, M-woman-02 |
| 子ども | M-man-03, M-woman-03 |
| 若者 | M-man-05, M-woman-05 |
| 大人 | M-man-06, M-woman-06 |
| 落ちついた大人 | M-man-07, M-woman-07 |
| さなぎ | M-butterfly-05, M-beetle-04, M-stagbeetle-04 |
| うまれたての幼虫 | M-beetle-01, M-stagbeetle-01 |
| 育ちざかりの幼虫 | M-beetle-02, M-stagbeetle-02 |

### cardTitleForms

| 表示名 | 対象IDs |
| --- | --- |
| あかちゃん | M-man-01, M-woman-01 |
| よちよち | M-man-02, M-woman-02 |
| 子ども | M-man-03, M-woman-03 |
| 若者 | M-man-05, M-woman-05 |
| 大人 | M-man-06, M-woman-06 |
| 落ちついた大人 | M-man-07, M-woman-07 |
| さなぎ | M-butterfly-05, M-beetle-04, M-stagbeetle-04 |
| うまれたての幼虫 | M-beetle-01, M-stagbeetle-01 |
| 育ちざかりの幼虫 | M-beetle-02, M-stagbeetle-02 |
| 芽ぶきのたね | M-dandelion-01, M-sakura-01 |

### cardFormalNames

なし。

### auxiliaryLineNames

なし。

### characterNames

なし。

同じ段階名でも同一キャラクターと統合しない。種族・段階・cardIDを併記して区別。CARDの「芽ぶきのたね」はサクラ①とタンポポ①で重複するが、現行本編サクラ①は「芽ぶきのサクラ」。

## 旧データ表との差分（現行runtimeと混同しない）

| cardID | cards.mjs旧名 | full-catalog現行名 |
| --- | --- | --- |
| M-antlion-01 | ウスバカゲロウ① | アリジゴク① |

## VERSION7の漢字候補14 — 全件・未承認

VERSION8では正式名のみを表示。以下は影響範囲の調査で、名称変更・ルビの採用ではない。読みはV7案の部分読みを保存しただけで、正式readingには昇格しない。14提案キー中、現行452枚に対応するのは11。おもいでのしゃしん／ながいきのひけつ／はやじまいはPR498の追加候補E-omoide-photo／E-nagaiki／E-hayajimaiに対応する。追加候補7枚は正式452枚への採用とは別に全件記録する。

| 現行正式名 | V7候補 | CARD IDs | 本編の同名ID | 影響・注意 |
| --- | --- | --- | --- | --- |
| きゅうきゅうばこ | 救急箱 | I-scarf | item:scarf | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| きおくのみずうみ | 記憶の湖 | W-memory_lake | region:memory_lake | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| おおきなびょうき | 大きな病気 | E-big-illness | 完全一致の本編エンティティ名なし | カード固有名。似た本編機能や語句への対応は未確認。自動統一しない。 |
| うんめいのへんしん | 運命の変身 | E-fateful-transform | 完全一致の本編エンティティ名なし | カード固有名。似た本編機能や語句への対応は未確認。自動統一しない。 |
| おもいでのしゃしん | 思い出の写真 | E-omoide-photo（追加候補） | 完全一致の本編エンティティ名なし | PR498の追加候補。現行452枚には未採用。本編の同名エンティティなし。候補ソースだけを別管理。 |
| ながいきのひけつ | 長生きの秘訣 | E-nagaiki（追加候補） | 完全一致の本編エンティティ名なし | PR498の追加候補。現行452枚には未採用。本編の同名エンティティなし。候補ソースだけを別管理。 |
| はやじまい | 早じまい | E-hayajimai（追加候補） | 完全一致の本編エンティティ名なし | PR498の追加候補。現行452枚には未採用。本編の同名エンティティなし。候補ソースだけを別管理。 |
| ほしぞらのていりゅうじょ | 星空の停留所 | W-star_stop | region:star_stop | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| どこにもつながらないかいだん | どこにもつながらない階段 | E-stairs | legend-master-metadata:stairs（runtime たまごのないところ） | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| あやまりにきただいおういか | 謝りにきた大王イカ | E-boss | legend-master-metadata:boss（runtime むかしのぼく） | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| むひょうじょうのせきぞう | 無表情の石像 | C-sekizou | companion:sekizou | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| あみものがすきなクモさん | 編み物が好きなクモさん | P-knitting_spider | partner:knitting_spider | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |
| とくべつなたびのおもいで | 特別な旅の思い出 | E-special-trip-memory | 完全一致の本編エンティティ名なし | カード固有名。似た本編機能や語句への対応は未確認。自動統一しない。 |
| じかんにルーズなとけい | 時間にルーズな時計 | C-clock | companion:clock | 共有名候補。正式名・本編表示・CARD表示・参照文を同じIDで精査。legend-master-metadataは現行イベント表示と別。 |

特にstairs／bossはmasterの旧ラベルがCARD名と一致する一方、現在の本編イベント表示は「たまごのないところ」／「むかしのぼく」。名前の一致だけで現在のイベント表示を置換しない。きゅうきゅうばこは本編item ID scarf／CARD I-scarf、きおくのみずうみはregion memory_lake／CARD W-memory_lakeとして追跡。できごとの病気／変身等は本編の似た機能名に自動接続しない。

各候補の現在ソース中の完全一致出現箇所、CARD本文参照、一次文書をname-candidates.jsonに記録。検索対象はmaster/script/item-system/indexおよびCARDの表示・結婚本文ファイル。全リポジトリの歴史的証跡・画像内文字は置換対象にしていない。

## 追加7候補PR498 — 全件・現行452枚とは別

基準commit: `948026343099e34628f5655ae240d1083763ea9e`。source: `prototypes/card-game/variable-life-20261031/integration/candidate-cards.mjs`。source blob: `12e36c44179c74afe219812bb9def9d6c6da18f7`。追加7のIDは正式452と衝突しない。本編エンティティの同名対応は推定しない。

| 候補cardID | 候補正式名 | 種類 | 採用状態 |
| --- | --- | --- | --- |
| W-time-ix | IX | world | PR498導入候補／正式452に未採用 |
| W-time-x | X | world | PR498導入候補／正式452に未採用 |
| W-time-xi | XI | world | PR498導入候補／正式452に未採用 |
| W-time-xii | XII | world | PR498導入候補／正式452に未採用 |
| E-hayajimai | はやじまい | event | PR498導入候補／正式452に未採用 |
| E-nagaiki | ながいきのひけつ | event | PR498導入候補／正式452に未採用 |
| E-omoide-photo | おもいでのしゃしん | event | PR498導入候補／正式452に未採用 |

## 共通レジストリ案（未実装）

| フィールド | 役割 |
| --- | --- |
| formalName | authoritative current display spelling per game context; do not silently choose across 19 divergences |
| reading | nullable, explicitly reviewed kana; no runtime auto-transliteration |
| species | stable species ID; null for non-species |
| stage | 1..8; convert at boundary to existing saved 0..7 stageIndex |
| characterID | unchanged existing source ID |
| cardID | unchanged M-/C-/P- stable ID |
| displayContext | mainGame \| cardGame \| historicalCardDesign |
| sourceRevision | pinned source commit |
| aliases | explicit approved aliases only |

正式名の責任元を1か所にする将来設計。ただし19件は本編と固定CARDのdisplayContextを明示して保持し、合意なく統一しない。readingはnull可・人が確認した読みのみ。ID・save stageIndex・図鑑キー・cardId・過去対戦replay・過去ログは変更しない。正式改名なら本編進化／図鑑／プロフィール、CARD表題／詳細／補助種族名、名前を参照する本文、一次文書、生成カタログ、折返し表、既存検証hashへの影響を別PRでレビューする。

## ソースの固定

| path | PR blob | main blob | byte一致 |
| --- | --- | --- | --- |
| character-world-master.v1.js | b4bb2cb6ad01f3d99535621d26ecb26f87dc859f | b4bb2cb6ad01f3d99535621d26ecb26f87dc859f | yes |
| script.js | d3c610f1d6c03d38c6fe377d8453194b54cb911b | 5d3a6367c162059e187e9e2af24866957a7d8a22 | no |
| index.html | 01b5d0aa002254fbd08f9d2c961cd038787dfdfd | 34ba71aba0b641cf82318bcd19a07dabcae691cd | no |
| item-system.js | b31254d37d2eb8a596fca890f412e4866082aef1 | b31254d37d2eb8a596fca890f412e4866082aef1 | yes |
| prototypes/card-game/full-catalog.mjs | a4d85838327a6206a7a2320a45d0462c40844213 | a4d85838327a6206a7a2320a45d0462c40844213 | yes |
| prototypes/card-game/cards.mjs | 3242c6bcf74e407867408e83907849b889a5aeb8 | 3242c6bcf74e407867408e83907849b889a5aeb8 | yes |
| prototypes/card-game/engine.mjs | 2460695095992e66404dc85bb1e266db1496f8ba | 2460695095992e66404dc85bb1e266db1496f8ba | yes |
| prototypes/card-game/ui-presentation.mjs | 61730e68f92e327865de9bd4ad549e6b5b088a08 | 61730e68f92e327865de9bd4ad549e6b5b088a08 | yes |
| docs/card-game/data/design-source-20260917/character-world-master.v1.js | 062cf5bcaea5f78742af8cc66194f7c0e1a84c54 | 062cf5bcaea5f78742af8cc66194f7c0e1a84c54 | yes |
| docs/card-game/tools/check-design-data.py | 7dd1ec37236b7a9c90e639fe1dd7a6de80e44b4b | 7dd1ec37236b7a9c90e639fe1dd7a6de80e44b4b | yes |
| docs/card-game/data/design-source-20260917/README.md | f6479d1399dd2070f97de9f40f770e7ab328fd82 | f6479d1399dd2070f97de9f40f770e7ab328fd82 | yes |

一次CARD文書のpath・anchor・source_sha256は248+44行のJSONに保存。name-audit.mjsはpin済みgit showから生成し、作業ツリーの未commit変更を正式データに混ぜない。
