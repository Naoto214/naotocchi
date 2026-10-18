# forest 3D prototype — 人の目で みる 比較資料

branch `claude/naotocchi-forest-3d-prototype`。記録の 正本は [../meguru-forest-3d-prototype-2026-09-30.md](../meguru-forest-3d-prototype-2026-09-30.md)。

**おなじ 条件**: おなじ セーブ(forest・なかま 26 + こいびと 1 = 27)・おなじ player の いち・おなじ カメラの むき(歩かせず 固定)・朝 / くもり / 秋・390 × 844・DPR 2。左 = いまの 2D、右 = 3D prototype。

**3D に まだ ない 演出**(くらべる とき 3D の 方式の 限界とは みない): 木もれびの 光の すじ(canopy light shafts)・雨 / 雪の つぶ・風の ゆれ・遠景(distant scenery)・手前の えだの 額縁(foreground branch framing)。

**いちばん みて ほしい こと**: 空間の 立体感 / 擬似 3D の ペラペラ感が 消えたか / いまの 2D キャラが 3D の せかいに 馴染むか。

## 1. 5 地点(左 2D・右 3D)

| 地点 | player | 見どころ |
|---|---|---|
| [entrance](entry-2d-vs-3d.jpg)(もりのいりぐち) | (0, 150) むき 0 | 道の 読みやすさ・木の 存在感 |
| [bright2](bright2-2d-vs-3d.jpg)(ひだまり) | (−700, 1050) | 大木の 体積・キャラの うしろの 木 |
| [fork](fork-2d-vs-3d.jpg)(みつまた) | (0, 2900) | 木の 密度・霧の 奥行き |
| [big tree](great-2d-vs-3d.jpg)(おおきなき) | (0, 5500) | ランドマーク(レビュー後に 直した。下の 1b)|
| [waterfall](falls-2d-vs-3d.jpg)(たき) | (−1500, 5600) | がけ・おちる 水・たきつぼ(レビュー後に 直した。下の 1b)|

big tree と waterfall の 2 まいは レビュー後の 3D(昼 / 晴れ / 秋。左右は おなじ 条件)。ほかの 3 地点と billboard・occlusion の しゃしんは レビュー まえ の まま。

## 1b. レビュー後: 大きな木 と たき だけ 直した

- [big tree 3D まえ / いま](great-3d-before-after.jpg) — 道を あけつつ spot の 正面に ちかく(spot から 432 → 384・むき +11 → +15 度)。えだはりを ひとまわり 大きく ひくめに(みき = あたり の まま)。
- [waterfall 3D まえ / いま](falls-3d-before-after.jpg) — 2 回めの レビュー後(10-01)。まえ = 1 回めの 直し(がけ = あたりの 箱・水の まく・たきつぼ)、いま = 風景に なじませた もの: まわりの いわだな・岩(あたり つき)・地層の がけ面・こけの もりあがり・がけの 上の ながれ・ガレ・ふかい たきつぼ・ぬれた 地面・ふくらみ・ながれだし。[ちかく・西から](falls-views-before-after.jpg)。
- 上から 見た 図: [大きな木](relocation-bigtree-landmark.jpg) / [たき](relocation-waterfall-landmark.jpg)
- ルール と 計測: [QA §9(たき 2 回め)](../meguru-forest-3d-prototype-2026-09-30.md#9-たき-を-風景に-なじませる--2-回めの-レビューの-あと2026-10-01) / [QA §8](../meguru-forest-3d-prototype-2026-09-30.md#8-ランドマーク大きな木たきの-直し--人の目の-レビューの-あと)

## 2. billboard(なかま・player の まわりを 2 倍)

[entrance](billboard-entry.jpg) / [bright2](billboard-bright2.jpg) / [big tree](billboard-great.jpg) / [waterfall](billboard-falls.jpg) — 正面 PNG の まま / 足が 地面に ついて 見えるか / かげ / 木の 前後 / 27 にんでも 板っぽさが つよくないか。横むき・うしろむき の 絵は つくって いない(よこは 反転、うしろは 2D と おなじ 0.95)。

## 3. occlusion(fork、player (0, 2900)・むき 0.3)

- [3D の 3 つ](occlusion-fork-3d.jpg): 左 = ふつう(むき 1.1・あいだに 木 なし)/ 中 = 木が player を かくす(すかし なし)/ 右 = すかし あり(半透明の ghost)
- [2D と 3D](occlusion-fork-2d-vs-3d.jpg): おなじ むき 0.3 で、左 2D の すかし・右 3D の ghost

## 4. 道の うえの かたい 物の 移動(M-1、3D モードだけ)

うごかした 89・おかない 39(ぜんぶで 128)。ランドマーク 2 つは レビュー後の ランドマークの ルール(1b)。代表 5 つ(上 = 北。オレンジ点線 = 2D の 絵の はば、オレンジの 輪 = もとの 足もと(2D では あたり なし)、みどり = 3D の あと(見た目 = あたり)、茶色 = ほかの 物の あたり、ベージュ = 道・spot):

[大きな木(ランドマーク)184](relocation-bigtree-landmark.jpg) / [たき(ランドマーク)180](relocation-waterfall-landmark.jpg) / [大木 2 本 108・120](relocation-bigtrunk-pair.jpg) / [広葉樹 144](relocation-broadleaf.jpg) / [おかない 針葉樹(さがす はんい 167)](relocation-dropped-conifer.jpg)

## 5. context lost

[3D → 2D](context-lost-3d-to-2d.jpg): WebGL を わざと 失わせた 前 / 後。おなじ frame から 2D、page error 0。

## 6. iPhone で ためす

main には まだ 入って いない ので、GitHub Pages では うごかない。PC で この branch を `npm run dev`(vite・0.0.0.0)で ひらき、おなじ Wi-Fi の iPhone から:

- 3D: `http://<PC の IP>:5173/?meguru3d=1&perf=1`
- おなじ 条件の 2D: `http://<PC の IP>:5173/?meguru3d=1&perf=1&m3d2d=1`

めぐる → forest を あるくと 左上に 2 行:

- 1 行め `3D avg 16.8 p95 25 p99 40 >60 2/600` — **avg**(平均の フレーム ms)・**p95**(遅い ほう 5% の ms)・**>60**(60 ms を こえた かず / はかった frame)。ここを 見る。
- 2 行め `calls 52 tris 96k …` — **calls**(draw call)と **tris**(三角形)。3D の 重さの めやす。

さいごの 600 frame(約 10 秒)の 数字。**あるきはじめ と、5〜10 分 あるいた あと の 両方**を 見る(熱で おそく なるか)。

暫定の 合格の めやす: avg ≤ 20 ms・p95 ≤ 33 ms・60 ms 超 ≤ 1 回 / 分・5 分 いじょうで 30 fps 未満に ずっと おちない・WebGL context lost なし・Safari の タブの 再読み込み なし・操作の 遅れを 感じない。見て あきらかに なめらかなら、境い目の 数 ms だけで 不合格に しない。
