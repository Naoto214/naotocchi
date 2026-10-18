# めぐる All Regions 3D — Human QA v1(iPhone 実機)の 結果と v2 の 契約(2026-10-01)

正本: この文書。対象 = PR #367(`feat/meguru-all-regions-3d-v0` @ `32e33204`、13 / 13 地域が 自動テストの v0 gate を 通過、full npm test 2804 + 80 / 0、CI 緑)。
人間が iPhone 実機で 全地域を 歩いた 結果、**自動テストは 緑でも 公開品質では ない** と 裁定。#367 は main へ merge せず v0 checkpoint として のこし、
v2(`feat/meguru-3d-foundation-v2`、#367 に stacked)で 基盤を なおす。

## Human QA v1 failures(人間の 目視・自動テストより 上位の 美観判断)

| # | 症状(実機) | 分類 | v2 の 契約 |
|---|---|---|---|
| F1 | メインキャラが 画面から 消える ことが ある | runtime bug(P0) | player が いる ふつうの frame で player の 絵は 100% 見える。「座標には いるのに 描かれない」を テストで 検出 |
| F2 | 過去 frame の object らしき 残像が のこる | runtime bug(P0) | 過去 frame の object が いまの frame に のこる persistent ghost = 0。意図した 現在 frame の すかし(半透明)とは 区別 |
| F3 | 地域間 corridor だけ 2D で、3D 世界 → 2D 道 → 3D 世界 と きれる | 基盤(P1) | corridor も 3D レンダラーで 描く。gameplay(path / blocker / handoff / destination / continuous walk / save)は そのまま |
| F4 | 「○○を みつけた」「○○が ある」が 見えて いる 対象・現在地と 一致しない ことが ある | UI(P1) | ふつうの spot の toast は なし。ランドマークは 控えめ(左上の 名まえの 静かな 強調)。ひみつ / gameplay reward だけ toast |
| F5 | 通常歩行で spot 通知が 多く、世界を 歩くより UI イベントを 踏んで いる | UI(P1) | 同上。内部の 記録(recordSpot / visited / collection / save)は 1 つも かえない |
| F6 | 地図に ふつうの spot が 多く、探索地図として ノイズ | UI(P1) | 地図の 表示 filter: 現在地・地域の つながり・gate・major landmark・gameplay 上 重要な 地点 だけ。内部 data は 削除しない |
| F7 | forest は 成立するが、ほかの 地域は v0 primitive 感 | 美観(P2) | Environment Kit v2 を 共通で つくり 全地域へ 再適用 |
| F8 | 木 = 幹 + 塊、建物 = 箱、橋 = 板、遺跡 = 箱の 集合、昆布 = 細い柱 | 美観(P2) | Tree / Building / Bridge / Ruin / Underwater Vegetation v2 |
| F9 | city に 日本の 都市としての 情報量が ない | 美観(P2/P3) | 幹線道路・駅前・mid/low/high-rise mix・商店・街灯・信号・自販機・路地・並木 |
| F10 | 川・海が「水たまりを ならべた だけ」に 見える。sea / river / underwater が 特に 弱い | 美観(P1) | Water v2: river = 連続の 帯、lake = 1 枚の 面、sea = 岸 → 浅瀬 → 水平線まで 1 枚、deepsea = 水中空間。pond の ならびは 禁止 |
| F11 | semantic は 合って いても 3D object として 成立して いない ものが 多い | 美観(P2) | kind → archetype の 表(SEM3D)は 保ち、archetype の 品質を 上げる。wrong substitution 0 を 維持 |

## v2 で 退行させない もの(現在 GREEN)
13 / 13 地域に 3D profile・13 地域 browser boot・27 にん・めりこみ 0・全地域 reachability・full npm test 2804 + 80 / 0・Runtime smoke / Home layout CI 緑・save / schema 不変・default 2D(3D は `?meguru3d=1` だけ)・forest cleanup の 回帰テスト・discovery の 内部 progress。

## P0 の 調査(原因の 候補と 判断)

### F1 player 消失
レンダラー(`meguru-3d.mjs`)を 監査した 結果、headless で 再現しなくても 実機で 起きうる 経路が 2 つ あった。
1. **きり(fog)が キャラの 立て看板にも かかる**: キャラの material は `MeshBasicMaterial`(three の 既定で fog あり)。きりの 遠端は `fr[1] * fogK / (1 + mood.fog * 3)` で、雨 / 雪(fogK 0.6)と 地区の mood.fog(最大 1)が かさなると deepsea(250 / 1900)・memory_lake(500 / 2600)では 遠端が 300〜400 まで ちぢみ、カメラ → player の きょり(約 650)を 下まわる。その とき player は きりの いろ 1 色(= 背景と 同じ)に なり、消えた ように 見える。**修正**: キャラの material は `fog: false`。あわせて きりの 遠端は かならず「player までの きょり + 900」より 遠く(近端も player より 手前には しない)。
2. **すかし(occlusion)の 選びかたが あたりの 半径 だけ**: カメラ → player の 線分に かかるかを、物の **あたり(幹)の 半径** で 見て いた。木の えだはり(crown)は 幹の 2〜3 倍 大きく、建物の ひさしも 同じ。幹は 線分から 外れて いても えだはりが player を 隠す ことが ある(とくに カメラが 高い wide / edge の spot)。**修正**: 物ごとに 見た目の 半径(parts の 最大 到達)と 高さを もち、線分の 判定は 見た目の 半径で、高さは 線分の その 位置の 高さ(カメラの 高さ → 0)より 低い 物は 除外。
3. player の 立て看板は frustum culling を しない(scale で 動的に 変わる plane は bounding が ずれる ことが ある)。texture の aspect が 有限で ない ときは 1 に 固定(scale NaN で 消えない)。

### F2 persistent ghost
1. **ghost pool の 契約を 明文化**: すかしの ghost(半透明の 同じ かたち)は frame ごとに「使った ものだけ visible」。使わなかった ghost は その frame で hidden、1 frame 使われなければ scene から はずす(pool には のこす)。ghost ごとに owner / createdFrame / lastUsed を 持ち、`stats3d().ghosts` と perf 表示で 見える。
2. **3D → 2D の 切りかえ**: 3D canvas を 隠す 直前に `renderer.clear()`(隠れた canvas に 前の frame を 残さない)。
3. **scene の 切りかえ**(地域 / corridor): 古い scene の ghost・キャラ・material を 全部 捨て、`renderer.renderLists.dispose()`。
4. canvas 2 枚(WebGL + 2D overlay)の 構成は 保つ。2D overlay は 3D の frame ごとに 全面 clear(dpr 変換は 2D レンダラーと 同じ)。
5. headless で 再現しない ものは「問題なし」と しない。実機で 再現したら、perf 表示(`&perf=1`)の `ghost a/b hidden c` と `player ok/NG` の 値を その 場面の しゃしんと いっしょに。

## 状態
- CP1(P0)… この文書 + レンダラーの 修正 + 専用テスト
- CP2 corridor 3D + discovery / map、CP3 Water v2、CP4 Kit v2、CP5 全地域 再適用、CP6 QA / 画像 / preview は `docs/qa/meguru-3d-foundation-v2-status.md`(CP ごとに 更新)
