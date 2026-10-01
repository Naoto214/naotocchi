# めぐる All Regions 3D v0 — status(正本・2026-10-01)

branch `feat/meguru-all-regions-3d-v0`。土台 = forest cleanup `8cb6b8f1`(PR #364、人間確認まで 未 merge)。base main `31edb95e`。**main へは merge しない。3D は `?meguru3d=1` の ときだけ(default 2D)。**

## 共通 architecture(forest から ひろげた もの)
- `SEM3D`(meguru.js): kind → 原型 + いろ の 1 つの 表(全地域 193 kind)。forest の きまり(きのこ は きのこ・はし は はし・立て看板 なし)を そのまま。意味の 表に ない kind は `unknown` = 出さない・あたりも つけない・テスト 赤
- `HIDDEN3D`: 雰囲気の しるし(💧 🫧 🐾 🚲 ❄️ 🌨️ ☁️ cloudwisp palmfrond snowdrift sandcrest coralarm 🏚️ …)は 3D で 出さず あたりも 外す(見えない かべ なし)
- `SOFT3D`: 2D で あたりの ない 道ばたの 木・いし・たてもの の しるし は ひざ丈の ふんで とおれる かたち(bush / pebbles / boxprop)
- `archetypeParts3d`: 共通の 原型(house / tower / wall / rockwall / reef / sandwall / hedge / pinerow / fence / palm / cactus / coral / kelp / reeds / lamp / signal / torii / temple / gate / boat / car / pier / bench / pot / crystal / parasol …)。instanced の 共通 shape + box / roof / dome / ring / decal(instance ごとの いろ)
- ランドマーク: `LANDMARK3D_TYPE`(tower / windmill / lodge / peak / lighthouse / coral / bridge / temple / palms / bigstop + forest の 3)。おきなおし(spot からの むき を たもつ)と satellites は 共通
- `REGION3D`: 地域の profile = きり(近 / 遠 / いろ)・水中(deepsea)・うみの 面(sea, shoreX に そって)・空の 星(star_stop)・きり(memory_lake)。`WORLD3D_REGIONS` = profile の ある 地域 = 登録 13 地域(テストで 一致を しばる)
- 3D の おきなおし: あたりを もつ はずの 物 ぜんぶ が 候補(boundary の がけ・大きな 丸太 も)。おけなければ 3D では おかない
- すかし: `pickOccluders`(カメラ → player の あいだ だけ)。きょりの 透明化 なし(きり だけ)
- はっけんの しらせ: **今回は 元に もどした**(commit 5af26563 に 実装 と テスト 10 が ある)。ランドマーク / ひみつ = 「みつけた！」・その ばしょ だけの もの = かるく「が ある」・ふつうの 池 = しずか、の 案は 既存 `tests/meguru-discovery-test.cjs` の 4 つ(①-1・⑦-1・⑦-3・⑦-4)の 期待と ぶつかる(意味の ある 仕様変更)。次回: その 4 つを 新しい 仕様に あわせて から 5af26563 の 変更を もどす

## 地域 status(v0 gate: 3D 起動 / あるく / 27 にん / めりこみ / unresolved 0 / 立て看板 0 / 見えない かべ 0 / しゃしん)

| Region | 3D | Semantic | Placeholder | Collision | Reachability | Discovery(今回は 現行のまま) | Perf(headless) | Visual review | status |
|---|---|---|---|---|---|---|---|---|---|
| forest | GREEN | GREEN | GREEN | GREEN(50 spot・27 にん テスト) | GREEN | GREEN | GREEN | 人間承認済(cleanup) | completed_v0 |
| home | GREEN | GREEN | GREEN | GREEN(walk 0 / 0) | PARTIAL(道 3/4 テストは forest だけ) | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| city | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN(日本の 都市感 は これから) | completed_v0_needs_polish |
| countryside | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| mountain | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| snow | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| sea | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN(うみの 面は 帯) | completed_v0_needs_polish |
| deepsea | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| river_lake | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| jungle | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | NEEDS_POLISH(tris 148k) | NOT_RUN | completed_v0_needs_polish |
| desert | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| star_stop | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |
| memory_lake | GREEN | GREEN | GREEN | GREEN | PARTIAL | GREEN | GREEN | NOT_RUN | completed_v0_needs_polish |

完了率: 13 / 13 が v0 gate を 通過(1 completed_v0 + 12 completed_v0_needs_polish)。blocked 0・not_started 0。
Reachability の PARTIAL = 「道の 3/4 が あく・50 spot に あるいて 行ける」の テストは forest だけ。ほかの 地域は browser で 4 方向 あるけた こと と めりこみ 0 だけ(§次作業)。

## browser smoke(headless Chromium・`?meguru3d=1&perf=1`・27 にん)

| Region | renderer | party | walked | pen player / party | calls | tris | JS avg / p95 ms | enter ms | spot | errors / fallback |
|---|---|---|---|---|---|---|---|---|---|---|
| home | 3D | 27 | 627 | 0.0 / 0.0 | 50 | 15k | 3.2 / 4.3 | 171 | bigtree | 0 / 0 |
| city | 3D | 27 | 448 | 0.0 / 0.0 | 59 | 52k | 4.7 / 5.4 | 601 | tower | 0 / 0 |
| countryside | 3D | 27 | 531 | 0.0 / 0.0 | 59 | 46k | 4.0 / 6.1 | 184 | watermill | 0 / 0 |
| forest | 3D | 27 | 432 | 0.0 / 0.0 | 63 | 110k | 4.8 / 6.2 | 606 | mush1 | 0 / 0 |
| mountain | 3D | 27 | 491 | 0.0 / 0.0 | 65 | 70k | 5.0 / 5.9 | 415 | bigfalls | 0 / 0 |
| snow | 3D | 27 | 576 | 0.0 / 0.0 | 55 | 45k | 4.1 / 5.1 | 328 | lodge | 0 / 0 |
| sea | 3D | 27 | 534 | 0.0 / 0.0 | 54 | 47k | 3.3 / 4.3 | 399 | lighthouse | 0 / 0 |
| deepsea | 3D | 27 | 537 | 0.0 / 0.0 | 52 | 47k | 2.9 / 4.3 | 190 | coralcity | 0 / 0 |
| river_lake | 3D | 27 | 450 | 0.0 / 0.0 | 67 | 58k | 4.9 / 5.0 | 403 | bridge2 | 0 / 0 |
| jungle | 3D | 27 | 365 | 0.0 / 0.0 | 69 | 148k | 6.0 / 7.8 | 349 | falls | 0 / 0 |
| desert | 3D | 27 | 513 | 0.0 / 0.0 | 52 | 50k | 3.9 / 4.2 | 360 | oasis | 0 / 0 |
| star_stop | 3D | 27 | 587 | 0.0 / 0.0 | 47 | 35k | 2.9 / 3.7 | 315 | stop | 0 / 0 |
| memory_lake | 3D | 27 | 607 | 0.0 / 0.0 | 49 | 29k | 3.0 / 3.8 | 356 | shore | 0 / 0 |

JS p95 の 大きい 値は しゃしんの ため teleport した 直後の shader 組み(1 回)。GPU の frame 時間(avg 150〜340 ms)は SwiftShader の もので 実機の めやすに ならない。

## はっけんの しらせ(地域 ごとの つよさ)

| Region | spots | つよい(ランドマーク / ひみつ) | かるい(が ある) | しずか |
|---|---|---|---|---|
| home | 14 | 2 | 8 | 4 |
| city | 47 | 5 | 20 | 22 |
| countryside | 48 | 7 | 26 | 15 |
| forest | 50 | 6 | 15 | 29 |
| mountain | 39 | 6 | 18 | 15 |
| snow | 35 | 6 | 14 | 15 |
| sea | 35 | 5 | 16 | 14 |
| deepsea | 34 | 5 | 13 | 16 |
| river_lake | 35 | 6 | 17 | 12 |
| jungle | 40 | 7 | 14 | 19 |
| desert | 40 | 6 | 11 | 23 |
| star_stop | 34 | 5 | 18 | 11 |
| memory_lake | 20 | 5 | 9 | 6 |

上の 表は 5af26563 の 案での 数(つよい = ランドマーク / ひみつ だけ)。**この branch の いま の 挙動は 現行(main)の まま**: level ≥ 2 の spot が はじめて の とき「○○を みつけた」(forest 50 のうち 21)。きろく・save は どちらでも かわらない。

## 残像(ghost)の 監査
- レンダラー: canvas 不透明(alpha:false)・preserveDrawingBuffer:false・autoClear(いろ・depth)を 明示。すかしの ghost は frame ごとに visible を 入れなおし、hidden は 線分から はずれた frame で もとに もどす(pickOccluders のテスト)。opacity を かえる material は 水・あわ・しぶき・ぬれた 地面・光・まだら・かげ・ghost だけ(テスト 3d)
- headless では 再現せず。Safari 固有の 可能性(compositor)。実機で 見る 条件: 木の よこを 通る → すかし → はなれる / カメラ 回転 / corridor → 3D もどり。再現したら その 場面の しゃしん を

## テスト(`tests/meguru-3d-prototype-test.cjs` 14)
- 9(全地域の 契約): profile = registry、unresolved 0、立て看板 0、かくす ものは きまった しるし だけ、あたりの ある 物は ぜんぶ 見える、きのこ / はし / たてもの の 意味、ランドマークの 見た目 と あたり、2D に 3D の しるし なし、意味の 表に ない kind は unknown
- 10(はっけん)は もどした(5af26563 に ある)
- 1〜8・3b〜3e(forest): そのまま 緑(退行 なし)

## 既知の gap / 次作業
1. 全地域の reachability テスト(道 3/4・全 spot・gate)を registry-driven に(いまは forest だけ)
2. city の 日本の 都市感(駅前・路地・街灯・電柱・自販機 は 原型 あり。配置 と 比率 は これから)
3. sea の うみの 面(帯 を shoreX に そって ならべて いる。波打ち際 の つながり)
4. jungle の 三角形(148k)。bigleaf / hugeleaf の 数
5. 残像 の 実機 再現
6. 2D 比較・before / after 画像(今回は 3D 代表 1 まい ずつ)
7. full npm test は 時間内に 完走せず(§CI)。専用 15 + asset gate は 緑
