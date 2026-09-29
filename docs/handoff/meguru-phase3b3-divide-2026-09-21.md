# めぐる Phase 3B-3 — 山里・都市・海をつなぐ(2026-09-21)

ブランチ `claude/meguru-phase3b3-divide`（最新 main `0eb07f5` から独立）。**main へはマージしていません。**

- 監査: [`../qa/meguru-phase3a-connection-audit-2026-09-21.md`](../qa/meguru-phase3a-connection-audit-2026-09-21.md)
- 基盤: [`meguru-phase3b0-multigate-2026-09-21.md`](./meguru-phase3b0-multigate-2026-09-21.md)
- 前段: [`meguru-phase3b1-valley-2026-09-21.md`](./meguru-phase3b1-valley-2026-09-21.md) ／ [`meguru-phase3b2-westrange-2026-09-21.md`](./meguru-phase3b2-westrange-2026-09-21.md)

## 1. 実装した 2 本

| connection | anchor（A側 / B側） | 距離 | 移動 |
|---|---|---|---|
| `city\|countryside`「とうげのかいどう」 | `countryside.terracelook`「たなだのてんぼう」(edge・z4400/57%・x−2000) / `city.cross4`「おおどおりのはし」(path・z4550/69%・x0) | 2.47 | 徒歩 |
| `city\|sea`「かこうのみなと」 | `city.boatpier`「ふなつきば」(rest・z3650/55%・x+2050) / `sea.port`「みなと」(plaza・z4200/53%・x+1100) | 3.92 | 徒歩 |

**これで徒歩の連結成分が 1 つになりました。**

```
おうち → もり → いなか → まち → うみ → ジャングル / しんかい
              ↘ かわ・みずうみ → やま → ゆきぐに
```

残る孤立は `desert`（2 本とも Phase 3B-4 待ち）と `memory_lake`（地上の出口を持たない）だけです。

- **新しい spot は 1 つも作っていません。** 4 つの anchor はすべて既存の非秘密 spot
- connection は増減なし（15 本のまま）。**gate を付けただけ**
- 探索率の分母も不変（region 11 / link **13** / tier1 17 / zone 103）
- **乗りものは増やしていません。** `city|sea` は徒歩。ふねはジャングルへの 1 本だけのまま

## 2. 最優先検証 — `sea.port` と `sea.breakwater` は干渉するか

横方向で **70 しか離れていない**ため、実装前に**実測**しました。
「kind が違うから大丈夫」では済ませていません。

### 実測①：`spotAt()` がどちらを返すか

| | z 帯 | x 帯 |
|---|---|---|
| `port`（walk 候補） | 3960–4440 | 860–1340 |
| `breakwater`（ride・ふね） | 4530–4870 | 450–790 |
| `seacave`（ride・もぐる） | 6000–6400 | 200–600 |

z=4500–4600 に**どの spot にも入らない帯**があり、`spotAt()` は必ずどちらか一方だけを返します。

### 実測②：8 方向 × 81 地点＝**648 通り**を歩かせる

`sea` の z 3600–5200 × x 200–1600 の格子から 8 方向へ実際に歩かせました。

| 出た先 | 回数 |
|---|---|
| `city`（みなとから・正しい） | 51 |
| **`jungle`（ふねへ誤流出）** | **0** |
| **`deepsea`（もぐるへ誤流出）** | **0** |
| どこへも出ない | 597 |

出発 spot 別でも `{ port: { city: 51 } }` のみ。**歩いて ride 先へ出ることは一度もありません。**

### 実測③：ride ボタンが出る場所

| 位置 | spot | ride |
|---|---|---|
| みなとの中心・周囲 6 点 | `port` | **なし** |
| ぼうはてい | `breakwater` | `jungle`（ふね） |
| かいしょくどうくつ | `seacave` | `deepsea`（もぐる） |

**結論: 干渉なし。`sea.port` をそのまま採用します。** 同じ spot に 2 つの意味は持たせていません
（`port`=あるく / `breakwater`=ふね / `seacave`=もぐる、各 1 本ずつ）。

## 3. city / countryside の衝突も実測

Phase 3A の第 1 候補（`cross4` / `terracelook` / `boatpier`）をそのまま測り、**どれも干渉なし**でした。
3B-2 の `trailhead` のような差し替えは今回不要です。

| region | 実測（8 方向スイープ） |
|---|---|
| `city` | `{ boatpier: { sea: 6 }, cross4: { countryside: 9 } }` — **混ざりゼロ** |
| `countryside` | `{ terracelook: { city: 5 }, woods: { forest: 7 } }` — **歩いて `star_stop` へ出ることは 0 回**（ゴンドラはボタン） |

`city` の 2 方向は**向きが反対**（山越え＝`far`／河口＝`near`）で、横も 2050 離れています。
`countryside` の 3 方向は横に 2780 / 3990 離れています。

`city.steps`（第 2 候補）でも測りましたが改善点がないため、canon どおり `cross4` を採用しました。

## 4. non-region transition（semantic data）

**`city|countryside` — 山里 → 山道 → 峠 → 分水界 → 長い下り → 都市近郊**
```
いなか側  たなだの うえ → やまあいの みち → とうげ(ぶんすいかい) → ながい くだり → はんたいがわの たに → まちの そとがわ
まち側    まちの そとがわ → こうがいの ひらち → ながい のぼり → とうげ(ぶんすいかい) → やまあいの みち → たなだの うえ
```
**単なる隣町の道ではありません。**両側に「とうげ(ぶんすいかい)」が入っており、
ここを越えると水の流れる向きが変わります（天竜川型 → 庄内川型）。

**`city|sea` — 都市河川 → 堤防 → 倉庫街 → 河口 → 岸壁 → 港**
```
まち側  みやこがわの かわぞい → ていぼうの うえ → そうこがい → かこうの ひろがり → がんぺき → みなとの いりぐち
うみ側  みなとの いりぐち → がんぺき → かこうの ひろがり → そうこがい → ていぼうの うえ → みやこがわの かわぞい
```
**両側に「みやこがわ」と明記**し、`たにのおおかわ`（天竜川型）は 1 語も混ぜていません。
テストでも「みやこがわが両側にある」「たにのおおかわが混ざっていない」を固定しています。

`bearing` も含めすべて semantic data。**Canvas 専用の描画データは入れていません。**

## 5. Phase 2.1 / 3B-0 をそのまま使用

`way: 'walk'`、`approach → cross → arrive → settle`、`TRANSITION.ways` は `walk / up / down / sail` のまま。
新 engine なし。`resolveGate()` の配列順非依存・bearing/priority 解決も不変（テストで再確認）。
**UI は 1 つも増えていません。**

## 6. 変えていないもの

`travelToRegion()` ／ 既存 spot・path・zone・secret（**471 / 654 / 118 / 107**）／
世界地図 Fog の仕様 ／ 探索率の分母 ／ **`city|desert`・`desert|mountain`・`countryside|river_lake`**。
**`regionOrigin` / global world / Three.js は未着手**です。

## 7. 検証

### 自動テスト — `tests/meguru-phase3b3-test.cjs`（17 テスト）

| | |
|---|---|
| 1–2 | gate 9→11・未実装 5→3 / 乗りものは 3 つのまま / anchor は既存非秘密・**新 spot 0** |
| **3–5** | **うみの 3 出口が混線しない**（1 spot 1 本 / 648 通りで ride 誤流出 0 / ride ボタンは 2 か所だけ） |
| 6–7 | まちの 2 方向が誤発火しない / いなかの 3 方向がじゃましあわない |
| 8–9 | まち ⇄ いなか、まち ⇄ うみ の往復と `enterFacing` |
| **10** | **おうち → もり → いなか → まち → うみ**。徒歩の連結成分が 1 つになったことを固定 |
| 11–13 | transition 二重開始なし / Phase 2.1 再利用・配列順非依存 / 間の地形 6 段階・別水系 |
| 14–17 | 分母・発見条件不変 / 出口以外から出られない / **Fog 漏洩なし** / path 到達性・たび不変・party・resident |

```
npm test → 1112 / 1113 pass
```

**残る 1 件は本 PR と無関係の既存の失敗です。** `tests/meguru-life-test.cjs` の
「far-away residents drop to the cheap update…」が落ちますが、**変更を stash して main と同じ状態にしても
同じように落ちる**ことを確認しました（4 回連続）。本日 main では `npm test 1096/1096` が通り CI も
green だったので、時刻や実行環境に依存する既存の不安定さです。**本 PR の変更が原因ではありません。**
テストを消したり無効化したりはしていません。

### 実画面（Chromium・実 DOM のみ）

390×844 / 375×667 / 360×640 の 3 サイズで:

| 確認 | 結果 |
|---|---|
| **うみ / いなか / まち の常時ボタン** | **3 サイズとも `🧭 たび` `🏠 もどる` の 2 つだけ。`のる` / `もぐる` は混ざらない** |
| JS エラー | **0 件** |
| はみ出し | **0 px** |

**正直に書いておく制約**: 4 経路そのものは自動スクリプトで再現できませんでした。
anchor が `terracelook`(x−2000・z4400/7700)、`boatpier`(x+2050)、`port`(z4200/8000) と
深部かつ横端にあり、**経路探索を持たないブラインドのパッド操作では到達できません**（3B-2 と同じ制約）。
そのかわりテスト 17 で **path グラフ上の到達性**（3 地域とも孤立ゼロ）を、
テスト 3〜9 で **gate の発火そのもの**を同じコード経路（`sim.step()` にパッドのベクトル）で押さえています。

## 8. つぎ（Phase 3B-4）

`city|desert` ＋ `desert|mountain`。ここで最後の孤立地域 `desert` が入り、輪が閉じます。
`mountain.windnotch`「かぜのきれめ」は空けてあります。
