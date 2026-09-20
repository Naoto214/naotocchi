# めぐる Phase 2 — 地域を ほんとうに こえる（代表 3 ルート）

Phase 1（PR #299 / 地理正本 v1）で「13 地域は同じ世界にある」と**地図で**分かるようになりました。
Phase 2 は、それを**実際に歩いて確かめられる**ようにする最初の一歩です。
**全 17 connection は実装しません。**代表 3 種類だけを完成させ、その土台を作ります。

| | ルート | しくみ |
|---|---|---|
| **A 徒歩** | おうち ↔ いなか ／ いなか ↔ もり | 決められた出口の上で、その向きへ歩くと隣へ出る |
| **B 上へ** | いなか → 鳥居 → 山道 → そらのりば → **ゴンドラ** → ほしぞら | special vertical（up） |
| **C 下へ** | うみ → かいしょくどうくつ → **もぐる** → しんかい | special vertical（down） |

## 1. 出口 / 入口は「いみデータ」

`WORLD_GEOGRAPHY.connections[].gate` に持たせてあり、**Canvas の座標には埋め込んでいません**。

```js
gate: {
  kind: 'walk' | 'vertical',
  dir: 'up' | 'down',            // vertical のとき
  action: 'のる' | 'もぐる',      // UI に出す短い操作
  ends: {
    countryside: { spot: 'woods', dir: 'far',  land: ['すぎの こだち', 'しだ', 'あかるいもり'] },
    forest:      { spot: 'entry', dir: 'near', land: [...] },
  },
}
```

`regionGates(regionId, world)` がこれを読んで、その地域から出られる口の一覧にします。
1 つの gate は `{ id, kind, dir, action, from, to, at, spot, out, land, enterFacing, layerFrom, layerTo }` で、
**departure / arrival / kind / vertical direction / layer transition / travel path** がすべて揃っています。
Three.js でゴンドラを実際に動かすときも、このデータのまま使えます。

| 正本（sim / world） | 描画都合（Canvas だけ） |
|---|---|
| `gate.ends`（出口 spot と向き）／ `enterFacing` ／ `layerFrom` `layerTo` ／ `vertical.stages` | 遷移の veil・かご・あわ・星の数・`TRANS_DUR` |

## 2. `clampToWorld()` は 1 行も変えていません

**世界の端はこれまでどおり止まります。**出口は clamp の例外ではなく、
「**決められた出口 spot の上で、その向きへ進んだとき**にイベントを出す」という追加です。

- ただ端に触れただけでは出ない（`out === 'far'` なら +z へ 0.3 以上、`near` なら −z へ 0.3 以上、かつ spot の z を越えている）
- 出口 spot 以外からは**絶対に出られない**（いなかの非秘密 spot 全部 × 4 方向で 0 件をテストで固定）
- 入ってきた場所がそのまま出口のときは、**その spot をいちど離れるまで封じる**（入った瞬間に戻されない）

## 3. 入ったあとの向き

`enterFacing` は**入った側の地域の中へ**向きます（口から入れば奥へ、奥から入れば口へ）。
出口で外を向いて歩いていた続きを、そのまま**まっすぐ歩き続けられる**ということです。
カメラも同じ向きから始まるので、越えた瞬間に跳ねません。

## 4. 「たび」とは別の道

`meguruBridge.enterRegionByMove(regionId, { by })` が Phase 2 の共通入口です。
`travelToRegion()` は **1 行も変えていません**。

| 徒歩 / ゴンドラ / 潜水で起きること | 起きないこと |
|---|---|
| `state.regionId` が変わる ／ はじめて来た記録（`regionsVisited` / `specialRegionsVisited`）／ ライフログ 1 行 ／ `saveState()` | **たびの費用（げんき −6・おなか −4）／ たびづかれ（`travelStreak`）／ そだち ／ きげんボーナス ／ たびのせりふ ／ ストーリー判定 ／ `emotePet`** |

「たび」は消していません。**初回は自分で歩いて世界を知り、再訪はたびで便利に動く**という役割分担です。
歩いたほうが得になる報酬差もつけていません（歩く価値は探索・発見・景観・connection 発見の側にあります）。

## 5. 発見は これまでどおり

- **みちの発見**は `worldLinksFrom()` のまま ＝「**両側の入口 spot を両方見つけたとき**」だけ。
  歩いて越えると両側の mouth spot に立つので、結果として開きます。「その地域へ行った」だけでは開きません
- **地域の発見**は到着時に 1 回。隣の地域全体を自動で開けることはしません
- 出口を増やしたことで秘密が漏れないこと（出口 spot が非秘密、境界の景観が秘密を指さない、
  `memory_lake` への出口が 1 つもない）をテストで固定

## 6. 新しく足した spot は 2 つだけ

鳥居とゴンドラを直結させないため（地理正本 v1 §3）、いなかの `woods` zone の奥に最小限だけ足しました。

| id | 名まえ | 位置 | 役割 |
|---|---|---|---|
| `mountpath` | もりのやまみち | 2100 / 7000 | 鳥居の先の山道 |
| `skyland` | そらのりば | 2350 / 7400 | ゴンドラの乗り場 |

道は `torii → mountpath → skyland` の 2 本。**`torii` と `skyland` は直結していません。**
**469 → 471 spot ／ 652 → 654 path。**地区（118）・秘密（107）は増えていません。
**世界探索率の分母（11 / 15 / 17 / 103）も 1 つも変わっていません。**

## 7. 今回やっていないこと

全 17 connection の実装 ／ 住民の地域間移動 ／ `regionOrigin` ／ global physical world ／ Three.js 化 ／
`memory_lake` への実移動 ／ 全 connection の中間景観 ／ 豪華な乗り物システム。

**プレイヤーと同行者（なかま・こいびと）だけ**が Phase 2 の transition を使います。通常の住民は地域を越えません。

## 8. 残った 1 件 — `おうち ↔ もり` の直通

ご指示は「おうち → もり → いなか を徒歩で」でしたが、**地理正本 v1 の 17 connection に `forest|home` はありません**
（`countryside|home` と `countryside|forest` があり、もりは地形としておうち–いなかの途中に広がる、という構造）。
`forest|home` を足すと**世界探索率のリンク分母が 15 → 16 に動き**、§21「分母を変えない」と衝突します。
そこで今回は **おうち ↔ いなか ↔ もり** の 2 本を徒歩で通しました（歩ける地域は同じ 3 つです）。
`forest|home` を正式に足すかどうかは、分母の扱いと合わせてご判断ください。
