# めぐる 3D Foundation v2 — status(正本・2026-10-01)

branch `feat/meguru-3d-foundation-v2`(#367 `feat/meguru-all-regions-3d-v0` @ `32e33204` に stacked)。Human QA v1 の 結果と 契約は `docs/qa/meguru-3d-foundation-v2-human-qa-v1.md`。
**main へ merge しない・Ready に しない・3D は `?meguru3d=1` の ときだけ(default 2D)・save / schema 不変。**

## checkpoint

| CP | 内容 | 状態 | commit |
|---|---|---|---|
| CP1 | player 消失(F1)・persistent ghost(F2) | done | `0e412450` |
| CP2 | corridor 3D(F3)・しらせ(F4 / F5)・ちず filter(F6) | done | (この commit) |
| CP3 | Water v2(F10): river 帯・sea 面・lake・pond・deepsea | todo | |
| CP4 | Environment Kit v2(F7 / F8 / F11): Tree / Building / Rock / Bridge / Ruin / Underwater vegetation / street | todo | |
| CP5 | Region Profile v2 + 13 地域 再適用(F9 city) | todo | |
| CP6 | cross-region browser QA・画像・comparison sheet・preview・PR | todo | |

## CP1(P0)
- キャラの 立て看板: `fog: false`・frustum culling なし・aspect 有限。きりの 遠端 ≥ player までの きょり + 900(雨 × mood.fog で player が きりの いろ 1 色に なって いた)
- すかし: 物の 見た目の 半径(えだはり)と 高さで 判定(幹の あたり だけ では えだはりが player を 隠した)
- ghost pool の 契約 `ghostPoolStep`(pure・export): 使った ものだけ visible・1 frame 使わなければ scene から はずす・上限 16・owner / createdFrame / lastUsed。`stats3d().ghosts` / `.player`、`&perf=1` に `ghost a/b/c hid n player ok miss m`
- 3D → 2D で `renderer.clear()`、scene 切りかえで ghost / キャラ / renderLists を 捨てる
- テスト `tests/meguru-3d-foundation-v2-test.cjs` v2-1〜v2-5。browser smoke(forest / deepsea / memory_lake): player ok 100%・errors 0

## CP2
- corridor 3D: hybrid の `want()` が corridor の world(`chartFrom` / `corridorTo` が 3D 地域)を 3D に。飾りは `corridorObjectType3d`(帯の そと・あたり なし・SOFT3D の ひざ丈 置きかえ なし)、はしの いし だけ かたい 岩(あたり = corridorBody の r 24)。地面の いろは `world.setProgress` の まま frame ごとに 反映、きりは 出発 → 到着 の profile を `world.progress` で まぜる。gameplay(path / blocker / handoff / arrive / back / state の かたち)は かわらない(v2-6 / v2-7)
  - browser(home → forest): corridor の 51 sample ぜんぶ 3D・player ok・ghost 0・errors 0・fallback 0・着いた forest も 3D
- しらせ: ふつうの spot / 地区 = toast なし。ランドマーク = 左上の 名まえの 静かな 強調(`quietSpotMark`・`.mgr-spot-found` 1.6 秒・音 なし)。ひみつ / みち = toast。きろく(recordSpot / ちず / save / 探索率)は かわらない(v2-8)。既存 `meguru-discovery-test`(15 件)・`meguru-discovery-browser`・3D テスト 10 を 日付つきで 再仕様化
- ちず: `mapSpotShown`(現在地・つながり / gate・ランドマーク・ひみつ・hub / ひろば / みせ だけ)。13 地域 471 → 151 spot。`mapData().spotsHidden`。きろく・分母 不変(v2-9)

## 次
CP3 Water v2 → CP4 Kit v2 → CP5 再適用 → CP6 QA
