# めぐる 2D — 最終 visual completion pass

日付: 2026-09-26 ／ 起点 main: **`d4a9594`**(Merge PR #346、scenery polish 第3段階)
前段: [第1段階](meguru-scenery-polish-audit-2026-09-25.md) ・ [第2段階](meguru-scenery-polish-stage2-2026-09-25.md) ・ [第3段階](meguru-scenery-final-qa-2026-09-25.md)

> 「3 件だけ直す」ではなく、**安全に直せる見た目の残りをすべて直す**回。
> save / discovery / spotDiscoveryLevel / goal / 世界地図 / corridor / なかま / 住民 / 当たり判定 / DistantFeature / backdrop の yaw 追従 には触らない。
> 新しい画像 asset・新しい Canvas primitive はなし。solid の位置は 1 つも動かしていない。

---

## 0. main の確認

main `d4a9594` に第1〜3段階がすべて入っている:

- 第1段階: starfall / snow slopetop / snow peak の deco、rock arch / bone arch(`drawStructure` の `arch`)
- 第2段階: snow の道と雪面、memory_lake の霧(`EMOJI_MIST`)、star_stop の地平線の霞
- 第3段階: city のビルのばらつき(`EMOJI_VARY`)、river_lake のもや(`RIVERMIST_STOPS`)

---

## 1. 残課題の一覧と分類

既存の handoff(第1〜3段階)から残りを全部拾い、main の実画面で撮り直して、新しく見つけたものも加えた。

分類: **A** visual-only で直せる / **B** 小さな render 修正で直せる / **C** 当たり判定・ゲームロジックの変更が必要 / **D** そのままがよい
優先度: MUST-FIX / SHOULD-FIX / KEEP-AS-IS / SEPARATE-TASK

| # | 残課題 | 出どころ | 分類 | 優先度 | 結果 |
|---|---|---|---|---|---|
| 1 | **forest.fallslook(たきのみはらし)**: 手前の solid な bigtrunk が滝をふさぐ | 第1段階 H4 | **B** | MUST-FIX | **直した**(§2.1)。当たり判定は変えずに済んだ |
| 2 | **jungle の夜が暗すぎる**(暗部 73〜92%) | 第3段階 YELLOW | **B** | SHOULD-FIX | **直した**(§2.2) |
| 3 | **star_stop ほしのおちるところ(昼)**: 地平線の下にうすい灰緑のもや | 第3段階 YELLOW | **A** | SHOULD-FIX | **直した**(§2.3) |
| 4 | **star_stop まちあいのひろば**: ていりゅうじょの看板が目の前で半透明の板になる | 第3段階 YELLOW | **B** | SHOULD-FIX | **直した**(§2.4)。原因は occlusion ではなく、ランドマークの上に立つとレンズの中に入ること |
| 5 | **mountain ちょうじょう(snow→mountain の到着)**: がけに隠れて自分が見えない | 今回の corridor 到着確認で発見 | **B** | MUST-FIX | **直した**(§2.5) |
| 6 | **jungle つりばし**: 名前のつりばしが画面にない / 手前の葉で自分が隠れる | 今回の密度確認で発見 | **A + B** | SHOULD-FIX | **直した**(§2.6、§2.7) |
| 7 | **forest くぼちのみはらし**: zone 名は「しだのくぼち」なのにしだがない | 第1段階 M6 | **A** | SHOULD-FIX | **直した**(§2.6) |
| 8 | forest の幹と枝の重なり | 第3段階 LOW | D | KEEP-AS-IS | みつまた・にたようなこだち・きのうろ・しだのくぼちで確認。自分を隠す幹は既存の occlusion ですでにすける。閉塞感は森の性格なので残す |
| 9 | city / jungle / forest の密度 | 第1段階 L3・第3段階 | D | KEEP-AS-IS | 視線が完全に塞がれる所は §2.7 の葉だけだった。city のビルのばらつき(第3段階)は回帰なし |
| 10 | star_stop の別の向き・ゴンドラ側・夜 | 第3段階 | D | KEEP-AS-IS | ていりゅうじょ・つきのみち・そらのはて・夜で、硬い帯・緑の帯とも再発なし |
| 11 | sea.endrock(さいはてのいわ): seacliff に隠れる | 第1段階 M5 | D | KEEP-AS-IS | main で再確認して、自分(クマノミ)は見えていた |
| 12 | desert の砂丘の単色感 | 第2段階 MEDIUM | D | KEEP-AS-IS | 第3段階の判定どおり、13 地域で唯一の暖かい黄で識別の決め手 |
| 13 | forest.heart(もりのしんぞう)の決め手 / desert.mesa2 の構図 | 第1段階 L1・L2 | D | KEEP-AS-IS | glowglade と ✨、メサは見えている。名前は満たしている |
| 14 | river_lake / memory_lake の語彙の偏り | 第1段階 L4・M2 | D | KEEP-AS-IS | 第2段階で霧、第3段階でもやを直し済み。語彙を増やす必要はない |
| 15 | snow の白 / 青灰 / 薄紫 | 第2段階 | D | KEEP-AS-IS | 回帰なし。青くなりすぎていない |
| 16 | memory_lake の霧 / river_lake のもや | 第2・3段階 | D | KEEP-AS-IS | 回帰なし(朝・夜) |
| 17 | rock arch / bone arch | 第1段階 | D | KEEP-AS-IS | 回帰なし(`keep` で間引かれない、mobile で大きすぎない) |
| 18 | forest / mountain 到着時と city 系の描画コスト | Phase 4E | C | SEPARATE-TASK | Release Hardening |
| 19 | なかまが障害物にめりこむ(RH-7) | Phase 4E | C | SEPARATE-TASK | Release Hardening |

**C(当たり判定が必要)として残るものは、見た目の側には 1 件もない。** fallslook は最初 C と見ていたが、描画側だけで直せた。

---

## 2. 直したもの

### 2.1 たきのみはらし — 滝を手前の木ごしに見せる(B)

- `RENDER_TUNING.occlusion.landmark`: 画面に見えているランドマーク(滝・大きな木・塔…)を、**カメラの近く(dz < 650)の木や建物**が覆っているとき、その手前の物を透かす(いちばん薄くて 0.28)
- **地形(がけ・岩・砂丘・メサ、`STRUCT_ROLE` が `terrain`)は透けない**。木の間からは見えるが、岩の向こうは見えない(river_lake はやせで、岩壁が透けて峡谷らしさが消えたので除外した)
- 既存の「自分を隠す物を透かす」仕組み(fade の板・なめらかな切り替え)にそのまま乗せた。描画命令は増えない
- bigtrunk は solid のまま、位置もそのまま。カメラも変えていない

before / after: [fallslook-before-after.jpg](../qa/meguru-visual-completion-20260926/fallslook-before-after.jpg)(滝のほうを向いたとき。左が before)

### 2.2 jungle の夜 — 夜らしさを残して、地形・道・葉を読めるように(B)

- `NIGHT_LIFT.jungle`: 夜の明るさを ×1.15、ただし 0.56 より暗くしない(林冠の下の zone は 0.36 まで落ちていた)。jungle だけ
- `LEAF_NIGHT`(`drawCanopy` の `leaves`、夜だけ): 幹の間の月明かりのもや(縦のグラデーション 1 枚、濃さ 0.10)と、ぬれた葉の光 14 個(位置は固定、ゆっくり瞬く。1 回の fill)

| spot(夜) | 暗部 before | 暗部 after |
|---|---:|---:|
| ひらけたばしょ | 86% | 63% |
| はなのたに | 84% | 53% |
| ジャングルのかわ | 73% | 63% |
| たき | 78% | 64% |
| いせき | 92% | 80% |
| おおきなきのした | 92% | 90% |

いせき・おおきなきのしたは深い zone(`deep` / `caves`)で、暗いのは意図どおり。forest キノコのこみち(65%)・river_lake はやせ(65%)の夜と同じ程度にそろった。

before / after: [jungle-night-before-after.jpg](../qa/meguru-visual-completion-20260926/jungle-night-before-after.jpg)

### 2.3 star_stop ほしのおちるところ — 地平線の下の灰緑のもや(A)

- 地平線の霞(第2段階)を、**地上のいちばん濃いところ(0.4)まで**厚く伸ばした(`HORIZON_HAZE`: 地平線 1 → 地上 0.7 → 0)。帯の下端を 0.7 → 0.95 に
- 色・DistantFeature・`distantShown` の形は変えていない

### 2.4 star_stop まちあいのひろば — ていりゅうじょの看板(B)

原因を分解した結果:

| 候補 | 結果 |
|---|---|
| occlusion fade | 関係なし |
| distance fade | 関係なし |
| camera near fade | **これ**。ていりゅうじょはランドマーク(`bigstop`、size 560)で、ひろばはその足もと。画面の高さの **6 倍**に写り、目の前が半透明の板になる |
| alpha / keep / hero | 関係なし(hero は付けていない。カメラは変えない) |

- `landmarkNearAlpha()`: ランドマークの絵が画面の高さの 2.4 倍を超えたら薄く、3.2 倍で描かない。ふつうに眺めるとき(その spot で向き合う)は 1.0〜1.6 倍なので、どの地域でも変わらない
- 13 地域で、近くに立って 8 方向を向いたときの最大を測った: ほとんど 1.0〜1.6 倍。2.4 を超えるのは、足もと・真裏に立つ場合だけ(star_stop ひろば 6.1・countryside の風車 9.9・forest 滝つぼ 8.7・mountain 滝うら 7.5・sea 灯台 5.0・snow ロッジ 2.9・deepsea サンゴ 2.9・jungle 滝うら 2.6)

before / after: [star_stop-before-after.jpg](../qa/meguru-visual-completion-20260926/star_stop-before-after.jpg)(左 2 枚 = ほしのおちるところ、右 2 枚 = まちあいのひろば)

### 2.5 ちょうじょう — がけに隠れて自分が見えない(B)

- がけ・ビル(`cliff` / `cliffwall` / `seacliff` / `building` / `alleywall` / `shopblock`)は、根もとから**片側に張り出して**描く。自分を隠しているかの判定の箱は根もとの中心にあったので、張り出した側で自分を隠していても「重なっていない」と判定され、透けなかった
- `OCCLUDER_SHIFT`: 判定の箱を、描いた形の側へずらす(がけは幅の 0.4、ビルは 0.24〜0.27)
- snow→mountain の到着(ちょうじょう)で、自分ががけごしに見えるようになった

### 2.6 deco 2 か所(A)

第1段階の `deco`(見た目だけ・`spotDiscoveryLevel` は見ない・solid にしない・hero にしない)を使った:

| spot | deco | 理由 |
|---|---|---|
| forest.fernlook(くぼちのみはらし) | `fern` × 3(主役 420) | zone 名「しだのくぼち」のしだが画面になかった |
| jungle.hanging(つりばし) | `ropebridge` × 1 | 名前のつりばしが画面になかった(spot の 🌉 は太い幹の陰) |

- deco の主役を覆う手前の木は、控えめ(0.45)に透ける(§2.1 と同じ仕組み。主役は **deco の主役だけ**。ふつうの spot の絵には広げない。広げると countryside かわのつりば の手前の木まで透けたので戻した)
- 発見レベルは変わらない(fernlook L0、hanging L2 のまま)。props は forest +3、jungle +1。ほかの props・住民の位置は main と完全に一致(種がずれていない)

### 2.7 手前の大きな絵文字の葉で自分が隠れる(B)

- みちばたの絵文字(`lane` / `field`)は、ふだんは透けない(`OCCLUDER_LAYERS` は変えていない)
- `RENDER_TUNING.occlusion.small`: **自分の 6 割より大きく写り、絵の真ん中(幅 0.24・高さ 0.8)で自分の 25% 以上を隠す**ときだけ、0.35 まで透ける
- jungle つりばし の 🌿 で確認。countryside の丸太や花のように、自分を隠していないものは透けない

before / after: [summit-hanging-fernlook-before-after.jpg](../qa/meguru-visual-completion-20260926/summit-hanging-fernlook-before-after.jpg)(ちょうじょう / つりばし / くぼちのみはらし、各 左が before)

---

## 3. 13 地域の最終横断

- 最終 contact sheet: [final-13-contact.jpg](../qa/meguru-visual-completion-20260926/final-13-contact.jpg)
- 修正前 / 後(上 = main、下 = この PR): [13-before-after.jpg](../qa/meguru-visual-completion-20260926/13-before-after.jpg)

代表 spot の昼の画は、13 地域とも main とほぼ同じ(直したのは特定の向き・夜・特定の spot だけ)。river_lake はやせ で岩壁が透ける副作用を見つけ、地形を除外して main と同じ画に戻した。

**夜 QA**: jungle / forest / river_lake / city / star_stop / memory_lake。jungle 以外は main と同じ。
**天気 QA**: snow(雪)・river_lake と jungle(雨)・star_stop(くもり)。問題なし。
**corridor の到着(6 本)**: home→forest(もりのいりぐち)/ city→countryside(たなだのてんぼう)/ countryside→forest(こけのかいだん)/ mountain→river_lake(みずうみのてんぼう)/ city→sea(みなと)/ snow→mountain(ちょうじょう)。ちょうじょうだけ §2.5 で直した。ほかは問題なし。

---

## 4. 変えていないもの(main `d4a9594` と実測で比較)

| 項目 | 結果 |
|---|---|
| spot 471 / path 654 / zone 118 / secret 107 / tier1 17 / link 分母 12 | 一致 |
| L0 184 / L2 216 / L3 71 | 一致 |
| DistantFeature 37(地域ごとも) | 一致 |
| gate 13 地域 | 一致 |
| 当たり判定 fingerprint 13 地域 | **13 / 13 一致** |
| `buildWorld()` の出力 | forest・jungle 以外の 11 地域は全体が一致。forest / jungle は deco 4 個が増えただけで、ほかの props と住民の位置は完全に一致 |
| #319 の view・第1段階の deco | 位置そのまま(増えたのは fernlook / hanging だけ) |
| save / corridor / travelToRegion / なかま / 住民 / 世界地図 | 差分 0 行 |
| forest.fallslook の bigtrunk | solid のまま、位置そのまま |

---

## 5. performance(にせの ctx、200 フレーム × 2 回の小さい方)

| 地点 | props | 命令 / フレーム | p50 ms | p95 ms |
|---|---|---|---|---|
| forest たきのみはらし day | 1230 → 1233 | 5866 → 5866 | 9.1 → 9.8 | 18.4 → 19.8 |
| forest くぼちのみはらし day | 1230 → 1233 | 10833 → 10854 | 14.0 → 14.2 | 27.9 → 28.0 |
| forest みつまた night | 1230 → 1233 | 11094 → 11094 | 15.0 → 16.2 | 29.8 → 32.0 |
| jungle つりばし night | 1297 → 1298 | 9309 → 9360 | 12.8 → 13.6 | 25.2 → 26.7 |
| jungle いせき night | 1297 → 1298 | 11587 → 11539 | 14.5 → 15.1 | 29.3 → 29.8 |
| jungle おおきなきのした night | 1297 → 1298 | 10990 → 11024 | 14.9 → 15.1 | 29.3 → 29.4 |
| star_stop ほしのおちるところ day | 471 → 471 | 1865 → 1865 | 4.2 → 4.3 | 8.2 → 8.4 |
| star_stop まちあいのひろば day | 471 → 471 | 10181 → 10181 | 13.5 → 13.7 | 27.0 → 26.6 |
| mountain ちょうじょう day | 747 → 747 | 1887 → 1887 | 4.5 → 4.5 | 9.0 → 9.2 |
| city えきまえひろば night | 1013 → 1013 | 8041 → 8041 | 13.9 → 14.4 | 27.1 → 28.5 |

描画命令は −80〜+50 / フレーム(1 % 未満)。いせきは透けた物の分だけ減る。時間の差は測定の揺れの範囲(同じ地点で増える側・減る側の両方がある)。

## 6. mobile

直した 8 か所(たきのみはらし・くぼちのみはらし・つりばし・ジャングルのたき・ほしのおちるところ・まちあいのひろば・ちょうじょう・かわのつりば)を 375×667 / 360×640(昼)と 390×844(夜)で 24 枚。ほかに 390×844 で 13 地域の代表・夜 6 地域・deco 7 か所・天気 4 か所の 30 枚。計 54 枚。**すべて到着・JS error 0・pad とボタンの重なり 0・はみ出し 0・スクロール 0**。

## 7. テスト(`tests/meguru-visual-completion-test.cjs`、13 件)

- 透かすルール: 地形は透けない・spot の主役は deco の主役だけ・`landmarkNearAlpha`(ふつうの大きさは 1、レンズの中は 0、測れないときは 1)・`OCCLUDER_SHIFT`(張り出す形だけ・2 か所で使う)・小さな絵文字(`OCCLUDER_LAYERS` は変えない)
- たきのみはらし: bigtrunk は solid のまま・位置そのまま・fallslook に deco / view を付けない
- jungle の夜: jungle だけ・控えめ・もやを塗る・葉の光は 1 回の fill・昼は描かない
- star_stop: 霞のとまり(地上の濃いところで 0.6 以上)
- deco 2 か所: 発見レベルそのまま・solid / hero / landmark にしない・collider なし
- 不変: counts・L0/L2/L3・DistantFeature 37 / forest・jungle の障害物と collider / save の形

既存の第1段階・第2段階のテストは、deco の一覧(5 → 7 か所)と霞のとまりを新しい値に合わせた。

**mutation(12 パターン、すべて赤)**: 地形も透ける / spot の主役を landmark 層ぜんぶに / レンズ前のランドマークを消さない / LANDMARK_NEAR を小さく / がけのずらしを消す / 小さな絵文字をいつでも透かす / 夜の持ち上げを消す / 持ち上げすぎ / ジャングルのもやを消す / もやを昼にも / 霞を元に戻す / fernlook の deco を消す

## 8. 完了判定

**B(visual 完成・別タスクのみ残り)** — scenery polish は正式に閉じてよい。

見た目の残課題で、安全に直せるもの(A / B)は全部直した。残りは KEEP-AS-IS(そのままがよい、理由つき)と SEPARATE-TASK(当たり判定・性能)だけ。

### 別タスク(Release Hardening / post-4E backlog)

| 項目 | 理由 |
|---|---|
| forest / mountain に着くときの描画コスト | 性能 |
| city 系のふだんの描画コスト(p95) | 性能 |
| corridor のまれな 60 ms 超え | 性能 |
| なかまが障害物にめりこむ(RH-7) | 当たり判定 / なかま |

forest.fallslook の solid bigtrunk は、**見た目の問題としては解決**(描画側で滝を見せた)。木の位置の見直しが要るかは、RH で当たり判定を整理するときに判断すればよい(見た目の blocker ではない)。

### Release Hardening へ進めるか

**進めてよい**。見た目の側に RH を待たせるものはない。**実装はまだ始めていない**。

---

## 9. めぐる 2D scenery / visual polish — 正式完了

> **めぐる 2D の scenery / visual polish は正式に完了。**
> 判定 B(visual 完成・別タスクのみ残り)。見た目の残課題で安全に直せるものはすべて直した。

| 段階 | PR | 中身 |
|---|---|---|
| 第1段階: 明らかな欠落・弱い景観 | #344 | starfall / snow slopetop / snow peak の deco、rock arch / bone arch |
| 第2段階: 地域差別化 | #345 | snow の道と雪面 / memory_lake の霧 / star_stop の地平線の霞 |
| 第3段階: 13 地域の最終 visual QA | #346 | city のビルのばらつき / river_lake のもや / 全地域の横断 |
| 最終 completion pass | #347(この PR) | たきのみはらし / jungle の夜 / star_stop 2 件 / ちょうじょうの到着 / つりばし / くぼちのみはらし |

最終状態: 13 地域すべて監査済み・主要 spot 名と実画面が一致・地域差を確認・密度を確認・mobile 3 サイズ正常・performance 回帰なし・counts / collision / gate / discovery / save / corridor / なかま / 住民 / DistantFeature 37 は不変。

### Release Hardening へ送るもの(これだけ)

| 項目 | 由来 |
|---|---|
| forest / mountain に着くときの描画コスト | Phase 4E |
| city 系のふだんの描画コスト(steady-state) | Phase 4E |
| corridor の中でまれに 60 ms を超えるフレーム | Phase 4E |
| なかまが障害物にめりこむ既存バグ(party obstacle / RH-7) | Phase 4E |

見た目の残課題は Release Hardening に送らない(KEEP-AS-IS は §1 のとおり、理由つきで据え置き)。

Three.js は不要の判断を維持(将来の PoC 扱い)。

このタブ(飾り付け / visual polish)はここで閉じる。新しい visual polish・Release Hardening の実装には進んでいない。
