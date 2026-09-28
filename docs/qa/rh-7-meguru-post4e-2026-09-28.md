# RH-7 Meguru Post-4E Fixes — QA 記録(2026-09-28)

基準: `main` `193e6abe85d3bf3b6125bd47e04591861f3ed46a`(Merge PR #353 = RH-6)
branch: `claude/naotocchi-rh7-meguru-post4e`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §7.4(post-4E backlog の 4 件だけ)

変えた production は `meguru.js` だけ。けしき・corridor・transition の 作り・見た目の テーマ・save・schemaVersion(5)・master・画像には 触れていない。Three.js / 3D は 入れていない。meguru.js の 分割は しない(§7.4「分割すべきだから では やらない」。今回の 4 件に 必要 ない)。

## 1. なかまが しょうがいぶつに めりこむ(backlog 4)

- 原因: 着いた ときの ならび(`placeParty`)と、とまって いる ときの ならび(`followParty`)が formation の 点を そのまま 使う。点が 木・岩・建物の 中でも そこに 立つ。corridor 固有 では なく、いまの transition でも おきる。
- なおし: ならびの 点 → `standClear`(住人と おなじ はんけい = `bodyRadius × STAND_CLEAR`)で 立てる ばしょへ ずらす(`clearSlot`)。world と 4 の マスごとに おぼえて 毎 frame の 探索は しない。
  - `placeParty`: ずらした 点に おく(`standClear` が 世界の はしも おさえる ので `clampToWorld` は 要らない)。
  - `followParty`: **とまって いる ときだけ** ずらした 点へ よる(あるいて いる ときの ついてくる うごきは いままでどおり)。いま めりこんで いる なかまは snap の 距離の 内でも 立てる ばしょまで あるく(最低 速度 40)。
- 受け入れ(`tests/meguru-party-arrival-test.cjs`): あるける 出口 10 本 × 両方の むき = 20 とおり × {transition, corridor} で、なかま 26 + こいびと 1 = 27 にん。おかれた 直後、着いて 1.5 秒 とまった あと、および あるいて とまった あとで めりこむ 人数 0、なかまは プレイヤーの 近く(< 520)に いる。
  - Roadmap の「18 方向」は 4E-4 preflight の ころの 数。いまの あるける 出口は 10 本(RH-4 で 固定)なので 20 とおり。
- main の コードでは 2 本とも 赤(めりこみ あり)、この branch で 緑。

## 2. forest / mountain の 着いた ときの 描画 / city 系の ふだんの 描画(backlog 1・2)

見た目を へらさずに、同じ ものを 描く ための 手間だけ へらした。

### 2-1. 描画の よびだしを なまの ctx へ

- 原因(計測): めぐるの canvas は 絵文字を イラストに かえる ために `CANVAS_ILLUSTRATIONS.canvas(ctx)` の Proxy で つつまれて いる。Proxy が 変えるのは `fillText` だけ なのに、1 frame に 数千回の `fillRect` / `beginPath` / `fillStyle =` など すべてが Proxy の トラップを とおって いた。
- なおし: renderer は なまの ctx(`o.rawCtx`)で 描き、文字(`fillText` / `strokeText`)だけ つつんだ ctx(`txt` = `o.ctx`)で 描く。どちらも 同じ canvas の 同じ 状態(font・色・変換)なので 描かれる ものは 同じ。`resize` も 同じ 分けかた。
  - renderer の 中の 文字の よびだしは すべて `txt`(しるし 💤 など・ふきだし・名前・プレイヤーの 絵文字)または いままでどおりの 経路(`drawGlyph` の fallback = `txt`、けしきの ふつうの 絵文字 = `rawMain`)。renderer の 中に `ctx.fillText` / `ctx.strokeText` は 残って いない(grep で 0)。
- 受け入れ(`tests/meguru-render-cost-test.cjs`): forest / mountain / city の 1 frame で、つつんだ ctx を とおる よびだしは 文字だけ、トラップの 回数 < よびだし 全体 / 10。main の コードでは 3 / 4 が 赤。
- 実測(Chromium、同じ frame の replay、CPU 4× 低速):

| 地域 | Proxy 経由 | なまの ctx | 差 |
|---|---|---|---|
| city | 66.8 ms | 52.7 ms | −14.1 |
| forest | 36.5 ms | 27.9 ms | −8.6 |
| mountain | 51.9 ms | 38.1 ms | −13.8 |

  CPU 1× では 差は 1.2〜3.0 ms。

### 2-2. 地面の もようを マスごとに おぼえる

- 原因(計測): `sampleGroundDetails` は マス(190)ごとに seed から 決まる もようを、毎 frame 作りなおして いた(forest で 1 回 1.25 ms、river_lake で 5.3 ms)。
- なおし: world ごと(`WeakMap`)・マスごとに 作った 結果を おぼえて 読む だけに する。1 world 1024 マスまで(こえたら 捨てて 作りなおす)。world を 捨てれば いっしょに 消える。
  - 1 回 1.25 → 0.061 ms(forest)、5.3 → 0.086 ms(river_lake)。
  - main と 3900 回 くらべて 差 0。ぜんぶ 見て まわった world 1 つで 約 0.64 MB。
- 受け入れ: 全 地域で、何回も よんだ world と 新しい world が 同じ 結果を かえす(テスト 1 本)。

## 3. corridor の まれな 60 ms こえの frame(backlog 3)

- Node の harness では 再現しない(描画の 重さでは なく、ブラウザの 画像の decode・corridor の 先読み・warm の 重なりと みられる)。**今回は なおさず backlog に のこす。**
- 提案(次の 計測つきの PR): 描画が 16 ms を こえた frame では、corridor の 先読み(preload)と warm の 手順を 次の frame に まわす。Playwright の CPU 4× で corridor を あるく frame 時間の 分布(p99・60 ms こえの 回数)を 計測して、前後で くらべる ことを 受け入れ条件に する。
- 2-1 と 2-2 で 1 frame の 固定の 重さは へった ので、60 ms こえの 回数も へる 見こみ だが、未計測の ため 完了とは しない。

## 4. remove-it(本物の source を 1 か所ずつ もとに もどし、赤を 確かめて もどした)

| もどした もの | 赤に なった テスト |
|---|---|
| `followParty` の `clearSlot`(とまって いる ときも formation の 点へ) | party-arrival 2 / 2 |
| `followParty` の めりこみ中の 移動(`collidesAt` の 条件) | party-arrival 2 / 2 |
| `placeParty` の `clearSlot` | party-arrival transition(おかれた 直後: 例 `forest->mountain placed: snail,punyu,box`) |
| renderer の `ctx = o.rawCtx || o.ctx` → `o.ctx` | render-cost 3 / 4(forest / mountain / city) |
| `sampleGroundDetails` の memo の key を `gx`(`gz` を 入れない) | render-cost の memo 一致 |

5 / 5 が 赤。`placeParty` だけを もどすと 1.5 秒の あいだに `followParty` が 立てる ばしょへ よせる ので、「おかれた 直後も 0」の assertion を 足して 単独で 赤に なる ように した。

## 5. 結果

- `meguru-party-arrival-test` 2 / 2、`meguru-render-cost-test` 4 / 4
- `npm test` 全体: **1467 / 1467 PASS、exit 0**(RH-6 後の 1461 + 6)

## 6. cache token

- 中身が 変わった `meguru.js` だけ、RH-3 の 式(`tools/bump-versions.js` の `assetHash`)で 更新: `meguru.js?v=20260928-cea11cf5`。

## 7. 残した もの

- backlog 3(上の 3)。
- Roadmap §7.4 の そのほか(meguru.js の 分割 候補、`buildWorld` の hash seed・`nearestPath` の 格子、`foreignMap` の 同期 build)は、今回の 4 件の 範囲外 なので 手を つけない(条件つき・UX 改修と いっしょ、の まま)。
