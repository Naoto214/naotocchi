# 本編の実績・遊び棚卸し（2026-10-21）

対象コミット: `a037b3abe4f97b6e9bfb4838e854161c53ece6ba`。現行ソースを静的に読み、登録オブジェクトを評価して列挙した。既存コード・データは変更していない。全ゲームの実プレイや全実績の到達可能性を検証した結果ではない。カードとの関連IDは親調査で追記する。

実績 **91件**、通常ミニゲーム **100本（一般86／地域10／季節4）**、クイック **2モード＋50小ゲーム**、関連行動 **9件**。JSONは各条件の原文、操作、実装関数、報酬、出典行、到達性の区別を保持する。`kind:id` が一意キー。

## 確認できた重要点

- **historical-spec**: Master spec explicitly marks old counts (75 achievements, 168 forms, seasonal games) historical; runtime tables are current authority. `NAOTOCCHI_MASTER_SPEC.md:1`, `NAOTOCCHI_MASTER_SPEC.md:315`
- **retained-id-thresholds**: Official IDs retain old thresholds; use exact condition, not numeric ID suffix. Examples minigame-50 requires30; games-complete-100 uses current pool length; record-rank-s-15 requires10; feed-100 requires30. `script.js:2214`
- **all-season-region-access**: All10 region and4 seasonal games always available; location/season affect weighting, not exclusivity. games.js comments near line68 and seasonal definitions are stale. `games.js:68`, `script.js:15969`
- **gamepass-blocks-records**: Equipped gamepass1 returns before actionCounts.play, environment-play and game record increment. Unequip it to earn actual-play and rank achievements. `script.js:17159`
- **dex-complete-not-excluded**: Old achievement preamble says dex-complete excluded, but current endingProgress includes all ACHIEVEMENTS. `script.js:2205`, `script.js:2805`
- **mountain-retained-id**: downhill-mountain now names やまの岩場のぼり and uses makeRockClimbGame. Preserve official save ID. `games.js:10155`, `script.js:15033`

- 全実績には自動的なコイン・アイテム報酬はない。解放履歴と時刻を記録し、全実績達成はPERFECTの条件となる。
- クイックの実績は混合ランのbestClearedを参照する。ソロ10本クリアでは進まない。
- 実装されていることと到達可能であることを区別した。構造上の全体到達不能はこの静的調査では確認していない。各ゲームの最高得点到達・操作環境依存の不具合は未検証。

## 実績一覧

| ID | 正式表示名 | 難易度 | 現行条件 | 出典 |
|---|---|---|---|---|
| evolve-1 | はじめのいっぽ | easy | はじめてそだちがあがった | script.js:2216 |
| devolve-1 | はじめてのおとろえ | easy | はじめてそだちがさがった | script.js:2217 |
| transform-1 | はじめてのへんしん | easy | はじめてへんしんした | script.js:2218 |
| death-1 | はじめてのおわかれ | easy | はじめててんごくにいった | script.js:2219 |
| minigame-50 | あそびのみならい | easy | ミニゲームを30かいあそんだ | script.js:2220 |
| record-rank-s-1 | はじめてのS | easy | ゲームきろくではじめてSランクをとった | script.js:2221 |
| games-played-25 | あそびめぐり | easy | 25しゅるいのミニゲームをあそんだ | script.js:2222 |
| sick-cured-1 | はじめてのかんびょう | easy | はじめてびょうきをなおした | script.js:2223 |
| age-10 | ひよっこそだち | easy | 10さいになった | script.js:2224 |
| shop-1 | はじめてのおかいもの | easy | あいてむを初めて買った | script.js:2225 |
| consumable-1 | はじめてのつかいきり | easy | 使い切りのあいてむをはじめてつかった | script.js:2226 |
| sticker-10 | シールあつめ | easy | シールを10しゅるいあつめた | script.js:2227 |
| money-100 | ちょきんかデビュー | easy | 持っているおかねが100以上になった | script.js:2228 |
| region-3 | たびずき | easy | 3つの地域を訪れた | script.js:2229 |
| time-all | いちにちのともだち | easy2 | 朝・昼・夕・夜をすべて過ごした | script.js:2232 |
| rain-play | あめの日のあそび | easy2 | 雨の日にミニゲームであそんだ | script.js:2233 |
| snow-play | ゆきの日のあそび | easy2 | 雪の日にミニゲームであそんだ | script.js:2234 |
| evolve-10 | ぐんぐんそだつ | easy2 | そだちが合計で10あがった | script.js:2235 |
| devolve-5 | かえりみち | easy2 | そだちが合計で3さがった | script.js:2236 |
| transform-10 | へんしんざんまい | easy2 | 5かいへんしんした | script.js:2237 |
| sick-cured-10 | めいいのたまご | easy2 | びょうきを5かいなおした | script.js:2238 |
| age-25 | すくすくせいちょう | easy2 | 25さいになった | script.js:2239 |
| dex-25 | ずかんのはじまり | easy2 | ずかんを25しゅるいうめた | script.js:2240 |
| feed-100 | ごはんだいすき | easy2 | ひとつの人生で、ごはんを30回あげた | script.js:2241 |
| play-100 | あそびっぱなし | easy2 | ひとつの人生で、30回あそんだ | script.js:2242 |
| pet-100 | なでなでまめ | easy2 | ひとつの人生で「じゃれる」を30かいした | script.js:2243 |
| gentle-10 | やさしいこころ | easy2 | ひとつの人生で、やさしい選択を10回した | script.js:2244 |
| brave-10 | ゆうかんなこころ | easy2 | ひとつの人生で、ゆうかんな選択を10回した | script.js:2245 |
| romantic-10 | ロマンチスト | easy2 | ひとつの人生で、ロマンチックな選択を10回した | script.js:2246 |
| companion-1 | はじめてのなかま | easy2 | はじめてなかまができた | script.js:2247 |
| partner-1 | はじめてのこいびと | easy2 | はじめてこいびとができた | script.js:2248 |
| money-500 | おおがねもち | easy2 | 持っているおかねが500以上になった | script.js:2249 |
| weather-all | てんきはかせ | normal | 晴れ・くもり・雨・雪をすべて見た | script.js:2252 |
| night-play-10 | よふかし | normal | 夜にミニゲームで10回あそんだ | script.js:2253 |
| env-moments-10 | せかいをかんじる | normal | 天気や時間にちなんだ出来事に、10回出会った | script.js:2254 |
| death-5 | なんどもおわかれ | normal | 3かいてんごくにいった | script.js:2255 |
| minigame-300 | あそびどっぷり | normal | ミニゲームを150かいあそんだ | script.js:2256 |
| quick-10 | クイックのたつじん | normal | クイックモードで1ランに10こクリアした | script.js:2257 |
| quick-perfect | クイックパーフェクト | hard1 | クイックモードで20こ全部クリアした | script.js:2258 |
| games-played-60 | あそびたんけんか | normal | 60しゅるいのミニゲームをあそんだ | script.js:2259 |
| record-rank-a-20 | Aランクコレクター | normal | 20しゅるいのゲームでAランクいじょう | script.js:2260 |
| age-50 | はんせいき | normal | 50さいになった | script.js:2261 |
| dex-50 | ずかんなかば | normal | ずかんを50しゅるいうめた | script.js:2262 |
| rare-line-1 | レアなであい | normal | レアなしゅぞくにはじめてであった | script.js:2263 |
| clean-50 | ピカピカ20かい | normal | ひとつの人生で、そうじを20回した | script.js:2264 |
| reset-5 | なんどもちょうせん | normal | あたらしいたまごを5かいむかえた | script.js:2265 |
| companion-5 | にぎやかななかよしグループ | normal | なかまが5にんできた | script.js:2266 |
| sticker-tasks-5 | シールちょうのたつじん | normal | シールちょうのおだいを5つたっせいした | script.js:2267 |
| sticker-tasks-all | シールちょうマスター | normal | シールちょうのおだいを8つぜんぶたっせいした | script.js:2268 |
| companion-active-5 | そばにいるしあわせ | normal | いまそばにいるなかまが5にんいる | script.js:2272 |
| married-1 | はじめてのけっこん | normal | はじめてけっこんした | script.js:2273 |
| sodachi-70 | よくそだてた | life | そだちが70にとどいた | script.js:2276 |
| sodachi-90 | でんせつのそだて | life | そだちが90にとどいた | script.js:2277 |
| sodachi-100 | さいこうのそだち | life | そだちが100にとどいた | script.js:2278 |
| lifeclear-1 | はじめてのいっしょうクリア | life | 100さいまで生き、そだち70以上にとどいた | script.js:2279 |
| lifeclear-10 | じんせい5しゅう | life | いっしょうクリアを5かいした | script.js:2280 |
| bestlife-1 | さいこうのいっしょう | life | 100さいまで生き、そだち100にとどいた | script.js:2281 |
| pastlives-10 | ごにんのなおとっち | life | 5にんのなおとっちをそだてた | script.js:2282 |
| nodecline | いちどもおとろえなかった | life | そだちを一度も下げずに100さいまでいきた | script.js:2283 |
| evolve-50 | そだちのあしあと | hard1 | そだちが合計で50あがった | script.js:2286 |
| devolve-20 | おとろえのぬし | hard1 | そだちが合計で10さがった | script.js:2287 |
| transform-25 | へんしん15かい | hard1 | 15かいへんしんした | script.js:2288 |
| death-10 | てんごくのじょうれんきゃく | hard1 | 5かいてんごくにいった | script.js:2289 |
| sick-cured-30 | めいいのたまご(じょうきゅう) | hard1 | びょうきを15かいなおした | script.js:2290 |
| age-100 | ひゃくさいばんざい | hard1 | 100さいになった | script.js:2291 |
| medicine-30 | かんびょうのきろく | hard1 | ひとつの人生で、くすりを10回あげた | script.js:2292 |
| region-all | せかいいっしゅう | hard1 | おうちをふくむ、すべての通常地域を訪れた | script.js:2293 |
| consumable-30 | つかいきりいっぱい | hard1 | 使い切りのあいてむを15かいつかった | script.js:2294 |
| sticker-100 | シールコレクター | hard1 | シールを100しゅるいあつめた | script.js:2295 |
| evolve-100 | そだてのきわみ | hard2 | そだちが合計で100あがった | script.js:2298 |
| clear-1 | てんじゅをまっとうした | hard2 | はじめて100さいまでいきた | script.js:2299 |
| dex-100 | ずかんたいはん | hard2 | ずかんを100しゅるいうめた | script.js:2300 |
| every-normal-line | どうぶつはかせ | hard2 | ふつうのしゅぞくすべてにであった | script.js:2301 |
| reset-20 | むげんループのたび | hard2 | あたらしいたまごを10かいむかえた | script.js:2302 |
| married-3 | なんどもウェディング | hard2 | 3にんとけっこんした(いろんな人生で) | script.js:2303 |
| naoto-1 | でんせつへのいっぽ | hard2 | 「なおとの〜」という、でんせつのあいてむを初めて手に入れた | script.js:2304 |
| clear-5 | みっつのいっしょう | hard3 | 3かい100さいまでいきた | script.js:2307 |
| minigame-1000 | 500かいあそんだ | hard3 | ミニゲームを500かいあそんだ | script.js:2308 |
| games-complete-100 | 100ぼんコンプリート | hard3 | ぜんぶのミニゲームを1かいいじょうあそんだ | script.js:2309 |
| record-rank-s-15 | Sランクマスター | hard3 | 10しゅるいのゲームでSランク | script.js:2310 |
| rare-line-all | でんせつコレクター | hard3 | レアなしゅぞくすべてにであった | script.js:2311 |
| elder-collector | ちょうろうはかせ | hard3 | 8種類以上の、さいごの姿に出会った | script.js:2312 |
| companion-all | なかまだいしゅうごう | hard3 | 通常のなかま全員となかよくなった | script.js:2313 |
| perfect-life | かんぺきななおとっちライフ | hard3 | けっこんと、通常のなかま全員との出会いをたっせいした | script.js:2314 |
| clear-10 | いつつのいっしょう | hard4 | 5かい100さいまでいきた | script.js:2317 |
| dex-150 | ずかんもうすぐ | hard4 | ずかんを150しゅるいうめた | script.js:2318 |
| partner-all | れんあいたっせいしゃ | hard4 | 各地域のこいびと候補全員とこいびとになった | script.js:2319 |
| clear-25 | いっしょうのたつじん | hard5 | 10かい100さいまでいきた | script.js:2322 |
| dex-complete | ずかんコンプリート | hard5 | ずかんをぜんぶうめた | script.js:2323 |
| shop-all | みにつけるものコンプリート | hard5 | 身につけるあいてむを全部買った | script.js:2324 |
| item-all | あいてむぜんぶあつめた | hard5 | 身につけるものと、使い切りのあいてむを全種類集めた | script.js:2325 |

## 通常100本とクイックモード

通常報酬は実点70以上60コイン、30–69点30コイン、30未満0。star装備は基本コイン3倍。Sは90点以上（大成功70点と別）。日次対象ゲーム30点以上は1日1回c_coin2、それ以外のSは成長2倍時間追加と30%シール抽選。クイックは混合20/20のみ100コイン、ソロ0、育成効果なし。

| ID | 正式表示名 | カテゴリ | 由来 | 目標 | 出典 |
|---|---|---|---|---|---|
| road-themed | ロードラン | road | general | よいものをキャッチ。わるいものはよけよう。 | games.js:204 |
| stack-themed | つみあげタワー | stack | general | ゆれるクレーンから落として、高くつもう。 | games.js:336 |
| stack-snowman | ゆきだるまタワー | stack | general | 丸く重ねよう。 | games.js:338 |
| falling-block-puzzle | ブロックパズル | fallingBlock | general | そろえて消そう。 | games.js:1642 |
| crane-game-3d | クレーンゲーム | craneGame | general | アームを動かして、景品をつかめ。 | games.js:1783 |
| pinball-physics | ピンボール | pinball | general | フリッパーではじいて、得点をかせげ。 | games.js:1943 |
| haunted-house-3d | おばけやしき3D | hauntedHouse | general | かぎを見つけて、出口からにげろ。 | games.js:2085 |
| bowling-3d | ボウリング | swipeThrow | general | スワイプで投げて、ストライクをねらえ。 | games.js:654 |
| archery-3d | アーチェリー | swipeThrow | general | 風を読んで、的の真ん中へ。 | games.js:655 |
| breakout-classic | ブロックくずし | breakout | general | 指でパドルを動かして、全部くずそう。 | games.js:746 |
| dragDecorate-cake | ケーキデコレーション | dragDecorate | general | トッピングをかざろう。 | games.js:990 |
| dragDecorate-bento | おべんとうづくり | dragDecorate | general | 見本どおりにつめよう。 | games.js:991 |
| p3-space | うちゅうフライト3D | perspective3d | general | 星を集めて、いんせきをよけよう。 | games.js:1004 |
| p3-drive | ハイウェイ3D | perspective3d | general | コインを拾って、車をよけよう。 | games.js:1005 |
| fp-dungeon | ダンジョン3D | firstPersonDungeon | general | 宝箱を集めて、出口をさがそう。 | games.js:1324 |
| race-3d | カーレース3D | roadRace | general | ハイウェイ・さばく・ネオンのコースを走りぬけ。 | games.js:2394 |
| rhythm-highway-3d | リズムハイウェイ | rhythmHighway | general | 流れてくるノーツを、ジャストでたたけ。 | games.js:2512 |
| tilt-maze-3d | たまころがし迷路 | tiltMaze | general | 盤をかたむけてゴールへ。 | games.js:2646 |
| space-gunner-3d | スペースガンナー | spaceGunner | general | せまる敵にねらいを合わせて、打ち落とせ。 | games.js:2793 |
| mini-golf-physics | ミニゴルフ | miniGolf | general | 引っぱってはなして、パー以下をめざせ。 | games.js:2927 |
| real-fishing | ほんかくさかなつり | realFishing | general | 合わせて、巻いて、つり上げろ。 | games.js:3135 |
| basketball-3d | バスケ3D | basketball | general | はらってシュート。リングをねらえ。 | games.js:3263 |
| pingpong-3d | 卓球3D | pingPong | general | ラリーで相手をぬけ。 | games.js:3387 |
| chain-puzzle | れんさパズル | chainPuzzle | general | 色玉を4こつなげて消そう。 | games.js:3524 |
| street-fight | かくとうバトル | streetFight | general | パンチ・キック・ガードでライバルをたおせ。 | games.js:3692 |
| free-kick-3d | フリーキック | freeKick | general | かべとキーパーをこえて、ゴールへ。 | games.js:3823 |
| tower-defense | タワーディフェンス | towerDefense | general | お城を4ウェーブ守りきれ。 | games.js:3962 |
| roguelike-dungeon | ローグライク | roguelike | general | ダンジョンを2階降りて脱出。 | games.js:4082 |
| grand-prix-3d | グランプリ | grandPrix | general | ライバル5台と2周レース。 | games.js:4198 |
| sky-shooter | スカイシューター | skyShooter | general | たくさんの弾をかわして、ボスをたおせ。 | games.js:4306 |
| jump-quest | ジャンプクエスト | jumpQuest | general | 走って飛んで、旗まで。 | games.js:4434 |
| push-puzzle | そうこばん | pushPuzzle | general | 箱をおして★へ。 | games.js:4519 |
| reversi-6 | オセロ | reversi | general | 角を取って、相手に勝とう。 | games.js:4608 |
| billiards-6 | ビリヤード | billiards | general | 6このボールを全部ポケットへ。 | games.js:4741 |
| animal-shogi | どうぶつしょうぎ | animalShogi | general | 🦁を取るか、奥まで進め。 | games.js:4896 |
| minesweeper-8 | マインスイーパー | minesweeper | general | 数字を読んで、ばくだんをさけろ。 | games.js:4983 |
| snake-classic | スネーク | snake | general | 🍎を食べて、どこまでのびる? | games.js:5062 |
| baseball-batting | やきゅう | baseball | general | コースを合わせて、タイミングよくスイング。 | games.js:5182 |
| ring-flight-3d | リングフライト3D | ringFlight | general | 空のリングをくぐりぬけろ。 | games.js:5291 |
| bubble-shooter | バブルシューター | bubbleShooter | general | 同じ色を3こそろえて消せ。 | games.js:5418 |
| catapult-castle | カタパルト | catapult | general | 塔をくずして👻をたおせ。 | games.js:5553 |
| connect-four | コネクトフォー | connectFour | general | 4つならべて、相手に勝とう。 | games.js:5641 |
| puzzle-2048 | 2048 | twenty48 | general | 同じ数を合わせて、大きくしよう。 | games.js:5717 |
| frogger-road | かえるのおうちがえり | frogger | general | 道路と川をわたって、おうちへ。 | games.js:5805 |
| ski-jump | スキージャンプ | skiJump | general | 飛び出しと前かがみで、遠くへ。 | games.js:5921 |
| air-hockey | エアホッケー | airHockey | general | パックをはじいて、先に4点。 | games.js:6006 |
| submarine-3d | サブマリン3D | submarine | general | 深い海でお宝をさがせ。 | games.js:6116 |
| match-3 | フルーツマッチ3 | matchThree | general | 入れかえて、そろえて消す。 | games.js:6199 |
| gomoku-9 | 五目ならべ | gomoku | general | 5つならべて、相手に勝とう。 | games.js:6270 |
| tank-battle | タンクバトル | tankBattle | general | かべをくだいて、敵を全部たおせ。 | games.js:6370 |
| tennis-rally | テニス | tennis | general | ラリーで相手をゆさぶれ。 | games.js:6461 |
| picross-5 | ピクロス | picross | general | 数字を読んで、絵をぬろう。 | games.js:6539 |
| darts-board | ダーツ | darts | general | ゆれるねらいをおさえて、ブルをねらえ。 | games.js:6606 |
| hang-glider-3d | ハンググライダー3D | hangGlider | general | 気流に乗って、遠くまで。 | games.js:6715 |
| bomber-maze | ボンバー | bomber | general | ばくだんでレンガをくだき、敵をたおせ。 | games.js:6812 |
| blackjack-21 | ブラックジャック | blackjack | general | 21に近づけて、ディーラーに勝とう。 | games.js:6878 |
| pipe-connect | パイプつなぎ | pipeConnect | general | 回して、水を通そう。 | games.js:6950 |
| fruit-slice | フルーツ斬り | fruitSlice | general | スワイプでスパッと切ろう。 | games.js:7029 |
| track-field | りくじょう | trackField | general | 100mダッシュと幅とび。 | games.js:7115 |
| voxel-mine | ボクセルマイニング | voxelMine | general | ほって、お宝をさがそう。 | games.js:7213 |
| sushi-belt | かいてんずし | sushiBelt | general | 注文どおりに取ろう。 | games.js:7298 |
| asteroids-classic | アステロイド | asteroids | general | 回して噴射して、岩をくだけ。 | games.js:7381 |
| yacht-dice | ヨット | yachtDice | general | サイコロで役をそろえよう。 | games.js:7458 |
| lights-out | ライツアウト | lightsOut | general | 全部のライトを消そう。 | games.js:7506 |
| doodle-jump | ぴょんぴょんジャンプ | doodleJump | general | 台をつたって上へ。 | games.js:7595 |
| curling-ice | カーリング | curling | general | 真ん中によせよう。 | games.js:7707 |
| jenga-tower | ジェンガ | jenga | general | くずさず何こぬける? | games.js:7786 |
| line-trace | せんなぞり | lineTrace | general | お手本をぴったりなぞろう。 | games.js:7858 |
| checkers-6 | チェッカー | checkers | general | 飛びこして、相手のこまを取れ。 | games.js:7936 |
| memory-cards | しんけいすいじゃく | memoryCards | general | 同じ絵をそろえよう。 | games.js:7992 |
| halfpipe-skate | ハーフパイプ | halfpipe | general | ポンプで加速、エアで回転。 | games.js:8071 |
| domino-run | ドミノたおし | dominoRun | general | 欠けた場所をうめて🔔まで。 | games.js:8132 |
| sudoku-mini | ナンプレ | sudoku | general | 数字を全部うめよう。 | games.js:8203 |
| mancala-kalah | マンカラ | mancala | general | たねをまいて、ストアに集めよう。 | games.js:8269 |
| plane-landing | ひこうき着陸 | planeLanding | general | ふわっと降りよう。 | games.js:8398 |
| dot-eater | ドットイーター | dotEater | general | ドットを全部食べて、おばけからにげろ。 | games.js:8606 |
| missile-command | ミサイルコマンド | missileCommand | general | タップで迎え打って、町を守れ。 | games.js:8737 |
| area-claim | じんとり | areaClaim | general | 線を引いてかこんで、60%取れ。 | games.js:8889 |
| solitaire-klondike | ソリティア | solitaire | general | 4つの台にAからKまでそろえよう。 | games.js:9055 |
| hit-blow | ヒット&ブロー | hitBlow | general | かくれた4色のならびを当てろ。 | games.js:9151 |
| lunar-lander | ルナランダー | lunarLander | general | 逆噴射でやさしく着陸。 | games.js:9291 |
| shanghai-tiles | 上海 | shanghai | general | 同じ絵の牌を2枚ずつ取ってくずせ。 | games.js:9429 |
| beach-volley | ビーチバレー | beachVolley | general | うけて上げてスパイク。先に4点。 | games.js:9593 |
| slide-puzzle | スライドパズル | slidePuzzle | general | ピースをすべらせて、絵を完成させよう。 | games.js:9713 |
| sugoroku-race | すごろく | sugoroku | general | サイコロをねらって止めて、先にゴール。 | games.js:9851 |
| takoyaki-grill | たこやきやさん | takoyaki | general | ちょうどいい焼き具合で、返して取れ。 | games.js:9951 |
| road-city | とかいラン | road | region:city | ラッキーなあいてむはキャッチ。障害物はよけて。 | games.js:10137 |
| stack-harvest | しゅうかくタワー | stack | region:countryside | いなかの実りを、くずさずつもう。 | games.js:10143 |
| stack-acorn | きのみタワー | stack | region:forest | 森の木の実を、高くつみ上げよう。 | games.js:10150 |
| downhill-mountain | やまの岩場のぼり | climbing | region:mountain | 岩をえらび、タイミングよくつかんで山頂へ。 | games.js:10158 |
| downhill-snow | ゆきのゲレンデ | downhill | region:snow | スキーやボードですべり降りよう。 | games.js:10161 |
| fishing-sea | うみのさかなつり | fishing | region:sea | 合わせて、巻いて、つり上げろ。 | games.js:10164 |
| fishing-deepsea | しんかいフィッシング | fishing | region:deepsea | 何がかかるかわからない。 | games.js:10167 |
| fishing-river | みずべのさかなつり | fishing | region:river_lake | 川や湖の流れを読もう。 | games.js:10170 |
| road-jungle | ジャングルラン | road | region:jungle | くだものは取って、とげとヘビはよけて。 | games.js:10173 |
| road-desert | さばくラン | road | region:desert | オアシスのめぐみは取って、とげはよけて。 | games.js:10179 |
| stack-sakura | さくらタワー | stack | season:spring | 花びらをそっと重ねよう。 | games.js:10195 |
| ring-flight-summer | なつのうみフライト | ringFlight | season:summer | 夕焼けのリングをくぐれ。 | games.js:10202 |
| stack-leaves | おちばタワー | stack | season:autumn | 落ち葉の山を高くつもう。 | games.js:10205 |
| curling-winter | ふゆのカーリング大会 | curling | season:winter | 4こずつで勝負。 | games.js:10212 |
| quick-run | クイックモード | quick_mode | quick | 20 mixed challenges, three failures end run; 5 score per clear. | quick.js:27 |
| quick-solo | クイック（1本ずつ） | quick_mode | quick | Selected microgame repeated 10 times, three failures end run; 10 score per clear. | quick.js:27 |

## クイック小ゲーム50本

以下のIDはQuick内のIDであり、通常100本の記録IDではない。詳細な成功判定関数はJSONのsuccess_logic_sourceに保持した。

| ID | 指示／モチーフ | 操作 | 基本時間ms | 出典 |
|---|---|---|---|---|
| eat | たべろ！／ごはん | tap | 3600 | quick.js:73 |
| dodge | よけろ！／うんち | drag | 4200 | quick.js:90 |
| catch | つかまえろ！／なかま | tap | 4000 | quick.js:112 |
| mash | れんだ！／へんしん | tap | 3400 | quick.js:134 |
| clean | そうじしろ！／おせわ | drag | 4200 | quick.js:153 |
| stop | とめろ！／たこやき | tap | 3800 | quick.js:175 |
| swipe | スワイプ！／スキージャンプ | swipe | 3200 | quick.js:194 |
| medicine | くすりをのませろ！／病気 | drag | 4200 | quick.js:212 |
| find | さがせ！／ずかん | tap | 4000 | quick.js:230 |
| charge | ためて…はなせ！／ジャンプクエスト | hold | 4200 | quick.js:248 |
| partner | こいびとは？／こいびと・なかま | tap | 3600 | quick.js:268 |
| season | きせつは？／世界・季節 | tap | 3600 | quick.js:286 |
| jump | とべ！／ジャンプ | tap | 3600 | quick.js:304 |
| pull | ひっぱれ！／しゅうかく | drag | 3800 | quick.js:327 |
| pet | なでろ！／おせわ | drag | 3800 | quick.js:340 |
| button | みどりでおせ！／ボタン | tap | 3800 | quick.js:356 |
| flames | けせ！／たんじょうび | tap | 3800 | quick.js:371 |
| coins | あつめろ！／コイン | drag | 4200 | quick.js:386 |
| cliff | とまれ！／ダウンヒル | tap | 3600 | quick.js:409 |
| throw | なげろ！／バスケ | swipe | 4000 | quick.js:423 |
| knock | たたけ！／ノック | tap | 3600 | quick.js:438 |
| wait | まて！／おあずけ | none | 3400 | quick.js:452 |
| flee | にげろ！／おばけ屋敷 | swipe | 3400 | quick.js:466 |
| mole | でたらたたけ！／もぐらたたき | tap | 4200 | quick.js:482 |
| slice | きれ！／フルーツ | drag | 4000 | quick.js:498 |
| guard | まもれ！／ミサイル | tap | 4200 | quick.js:512 |
| bento | つめろ！／おべんとう | drag | 4200 | quick.js:526 |
| spin | まわせ！／へんしん | drag | 4000 | quick.js:544 |
| lift | もちあげろ！／だっこ | drag | 3600 | quick.js:559 |
| tickle | くすぐれ！／じゃれる | tap | 3600 | quick.js:571 |
| balance | バランス！／かたむき迷路 | drag | 4200 | quick.js:585 |
| color | いろは？／ずかん | tap | 3600 | quick.js:600 |
| count | いくつ？／ほし | tap | 4200 | quick.js:617 |
| bigger | おおきいほう！／ごはん | tap | 3400 | quick.js:633 |
| odd | ちがうの！／まちがいさがし | tap | 4000 | quick.js:648 |
| order | じゅんばんに！／ふうせん | tap | 4200 | quick.js:664 |
| holdlid | おさえろ！／びっくりばこ | hold | 3800 | quick.js:679 |
| umbrella | あめがきたらかさ！／てんき | swipe | 4200 | quick.js:694 |
| shutter | とれ！／アルバム | tap | 3800 | quick.js:708 |
| sort | ごはんはひだり！／おかたづけ | swipe | 4200 | quick.js:723 |
| rhythm | リズム！／リズムハイウェイ | tap | 4200 | quick.js:737 |
| trace | なぞれ！／ラインレース | drag | 4200 | quick.js:752 |
| pushbox | おしだせ！／倉庫番 | drag | 3800 | quick.js:766 |
| fish | ひいたら つれ！／つり | swipe | 4200 | quick.js:778 |
| stack | つめ！／つみあげタワー | tap | 3800 | quick.js:793 |
| pair | おなじの！／しんけいすいじゃく | tap | 4000 | quick.js:808 |
| doors | どっち？／こいびと・なかま | tap | 4400 | quick.js:822 |
| sneak | そっとはこべ！／ねる | drag | 4400 | quick.js:838 |
| feather | ふけ！／かぜ | swipe | 4000 | quick.js:853 |
| weather | てんきは？／てんき | tap | 3600 | quick.js:866 |

## 関連する行動・ゲーム外の遊び

ここでは独立ゲームの正式IDを捏造せず、ソース上のアクションキー・シンボルを識別子とした。

| 識別子 | 名称 | 条件 | 報酬・効果 | 出典 |
|---|---|---|---|---|
| duel | うそつきしょうぶ | 5 questions with up to2 lies; truth worth1 and lie worth2; higher total wins; exchange challenge/guess/reveal codes. | Stake1–999999 reserved before play; net win +bet, draw0, loss -bet; permanent duel counters. | script.js:7331 |
| meguru | めぐる | Start walking when not sleeping or already in-game; meet/talk/discover map features; move across regions. | Persistent met/talks/spots/zones/paths/marks/world links and visit records; crossing regions records visits but grants no travel growth, hunger/energy costs or story result. | script.js:14619 |
| gamepass1 | ゲームパスの通常成功 | Equipped gamepass1, ordinary play entry allowed,5sec cooldown. | 30coins, happiness+15, environment energy cost, transform+25, growth+7, decline-3; no real game played/score/daily/recruitment. | script.js:17159 |
| feed | ごはん | Not sleeping; increments actionCounts.feed; hunger>=80 triggers overfeed branch. | Hunger+25; normal happiness+3 growth+4 decline-4; overfeed happiness-4 decline+4 with15% sickness chance. | script.js:17062 |
| clean | そうじ | Requires poopCount>0; increments actionCounts.clean. | Clears poop; happiness+5 growth+4 decline-5. | script.js:17236 |
| sleep | ねる／おきる | Toggle sleep; sleep action count increment on sleep; wake bonus requires sleptTicks>=20. | Timed recovery; sufficiently long sleep gives growth+3 decline-3 on wake. | script.js:17251 |
| medicine | くすり | Always increments actionCounts.medicine; cure branch requires isSick. | Cure: health+20 energy-10 growth+8 decline-12 and sickness cure record. Wrong medicine: happiness-10 health-5 decline+10. | script.js:17278 |
| pet | じゃれる | Not sleeping; egg routes to warmEgg; normal increments actionCounts.pet and talk. | Normal happiness+5 growth+1.5 decline-2, companion bond restoration; repeated spam happiness-5 decline+6. | script.js:17340 |
| warmEgg | あたためる | Egg stage only. | Growth+4 toward hatching; no pet action increment. | script.js:17319 |

## 5つのグランドゴール（91実績バッジとは別）

ACHIEVEMENTS個別バッジの直接報酬はない。一方、グランドゴールは最初の4段階でなおとアイテムを自動付与する。PERFECTは全91実績（dex-completeも含む）に依存し、むげんのせかい・テーマ等を解放するが、5個目のなおとアイテムは定義されていない。色・柄の正式IDはJSONに個別収録。

| ソースID（保存値） | 正式タイトル | 条件 | アイテム報酬 |
|---|---|---|---|
| GOAL_TIER.life (0) | てんじゅをまっとうした! | Lifetime clears>=1; reach age100. | naoto_charm |
| GOAL_TIER.lifeClear (1) | たくさんそだった! | Lifetime lifeClears>=1; reach age100 with maxSodachi>=70. | naoto_lantern |
| GOAL_TIER.best (2) | そだち100! | Lifetime bestLives>=1; reach age100 with maxSodachi>=100. | naoto_ring |
| GOAL_TIER.dex (3) | ずかんクリア! | lifetime.dexCleared || isDexComplete(). | naoto_crown |
| GOAL_TIER.perfect (4) | PERFECT CLEAR! | lifetime.perfectCleared || every current ACHIEVEMENTS ID in achievementsUnlocked. Includes dex-complete. | なし（むげん／テーマ解放） |

出典: `script.js:2452–2495`, `2641–2650`, `2706–2741`, `10199–10220`, `10263–10265`。既知の表示上の欠落: `script.js:12089–12105` は5段階に対してパーティクル演出が4件だけで、PERFECTの演出がない。解放判定を妨げるものではない。
