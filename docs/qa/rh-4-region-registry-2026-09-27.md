# RH-4 Region Registry Integrity — QA 記録(2026-09-27)

基準: `main` `fc83cf0fe626babb776ea1ab7c3638c46efd2f24`(Merge PR #350 = RH-3)
branch: `claude/naotocchi-rh4-region-registry`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §7.1

めぐるの本線(Phase 4E の corridor・transition・scenery・visual・movement・party・preload / fallback)は変えていない。
地域 ID の解決の境界だけを直した。save の `regionId` / `regionsVisited` は書きかえない。schemaVersion は 5 のまま。

## 1. `resolveRegionId` の契約(script.js、1 か所)

順番: raw ID → 正式な alias(master の `compatibility.regionAliases`)→ 正本(master の `regions` 13 件)→ ID。

| 入力 | strictRegions(harness の既定) | 本番 |
|---|---|---|
| 正本の ID | そのまま | そのまま |
| 正式な alias(`tropical`) | `jungle`(throw しない・記録しない) | `jungle`(記録しない) |
| 知らない ID・typo・`''`・大文字ちがい・`null`・数・object・`constructor` / `__proto__` | throw | master の `policy.unknownRegionFallback`(= `home`)+ `reportRuntimeError` を **raw ID ごとに 1 回**(最初の site を `where: region:<site>` に残す) |

- 重複の抑えは RH-4 専用の `Map`(raw ID → 最初の site)。`reportRuntimeError` 自体は変えていない。
- save は書きかえない(master の `policy.preserveRawSaveIds: true`)。`tropical` も `moon` も save に残り、つかう ときだけ解決する。
- `currentRegionId()` = いまいる地域(解決ずみ)。`state.regionId` は raw のまま。

## 2. 変えた箇所(要の 8 か所)

| 箇所 | 変更 |
|---|---|
| `findRegion`(script.js) | `|| REGIONS[0]` をやめ、`resolveRegionId` を通す |
| `currentEnvironment().region`・天気(観測 / 季節の天気)・天気の演出 | `currentRegionId()` |
| 旅の画面の「いまの地域」・`travelToRegion` の同じ地域の判定・季節の切りかえの演出・地表の季節の判定 | `currentRegionId()` |
| `meguruBridge.enterRegionByMove` の「いまと同じ」判定 | `currentRegionId()`(知らない地域から home へ黙って移動して raw を書きかえない) |
| `meguruBridge` | `resolveRegionId` と `canonicalRegionId` を渡す |
| meguru.js の入口 | `start` の地域、毎 frame の「地域が かわったか」の比較、registry の住民(なかま・こいびと)の地域 を `regionOf`(= bridge の resolver)で解決。本体が ない(めぐるだけの テスト)ときは これまでどおり |
| meguru.js `seedWorldRegions` | 旅の記録の ID を alias で正本にしてから数える(`tropical` → `jungle`) |
| meguru.js の export | `WORLD_THEME` / `WORLD_MOTION` / `WORLD_SPACE` / `REGION_LINE` / `SKY_OVERRIDE` / `GEO_AREA` / `GEO_ASPECT`(テスト用。値は変えない) |

`buildWorldSteps` の `WORLDS[regionId] || WORLDS.home` は本番の安全網として残した(入口で正本の ID に なるので通らない)。
`walkCorridorSpecs().filter(Boolean)` の本番の fallback も変えていない。

## 3. registry の網羅(`tests/region-registry-test.cjs`)

- **正本**: master の `regions` 13 件 = script.js の `REGIONS`(home + normal 11)+ `SPECIAL_REGIONS`(2)。ID もラベルも一致。
- **13 件ちょうどの表(15)**: meguru の `WORLDS` / `WORLD_STYLE` / `WORLD_THEME` / `WORLD_MOTION` / `WORLD_SPACE` / `REGION_LIFE` / `REGION_LINE` / `GEO_AREA` / `GEO_ASPECT` / `WORLD_GEOGRAPHY.regions` / `FOLIAGE`、script の `ITEM_REGION_SCENES` / `STICKER_BACKGROUND_THEMES` / `ENV_EFFECTS.region`、world-scene の `SCENES`。
- **意図して一部だけ持つ表(16)は、監査で確定した集合と完全一致**(部分集合で あるだけ では なく、typo の追加・余分・意図しない欠け を 両方 とめる):

| 表 | 集合 |
|---|---|
| `REGION_FRAME` / `FRAMED_REGIONS` | memory_lake 以外の 12 |
| `SKY_OVERRIDE` | deepsea / star_stop / memory_lake |
| `NIGHT_LIFT` | jungle |
| `EMOJI_MIST` | memory_lake |
| `EMOJI_VARY` | city |
| `CORRIDOR_REGION_LOOK` | home / city / countryside / forest / mountain / snow / sea / river_lake / desert |
| `CORRIDOR_REGION_TERRAIN` | city / countryside / river_lake / desert |
| meguru `NORMAL_REGIONS` | home + normal 10 |
| world-environment `CLIMATE` | deepsea / star_stop 以外の 11(この 2 つは天気なし) |
| `REGION_RUNTIME_META` / games `REGION_MINIGAMES` | home + normal 10 |
| `REGION_BASE_FX` | deepsea / jungle / desert / star_stop / memory_lake |
| `REGION_MOMENTS` / `REGION_MOMENT_HINTS` | mountain / deepsea / river_lake / jungle / desert / star_stop / memory_lake |
| `ENV_GAME_WEIGHTS.region` | home / star_stop / memory_lake 以外の 10 |

- **入れ子の参照**: `HABITAT` の値、恋人の `firstRegion`、伝説の `affinityRegions`、接続の a / b / mouths / gate.ends、`CONTINUOUS_WALK_ALLOWLIST`、alias の行き先 が すべて正本。正本に ない alias のキーは `tropical`(→ `jungle`)だけ。
- **正本の表では ないもの(対象外として記録)**: `LOCAL_FLAVOR` / `LOCAL_SCENES`(土地のタイプ)、`BACKDROP_COLORS` / `DISTANT_KIND_OF`(遠景の種類)、`SEASON_REGION_OVERRIDES`(「地域:季節」)。script.js の地域アイコンの表には 旧 `tropical` の行が残る(表示に害なし。RH-11 の cleanup 候補)。
- `FOLIAGE`(meguru の描画の中)と `CLIMATE`(world-environment)は export せず、テストで宣言の オブジェクトを そのまま評価した(本番の file は変えない)。

## 4. save は変えない

- `moon` の save: 読みこみ後も `regionId: 'moon'`、`regionsVisited` もそのまま、saveState の後も同じ。schemaVersion は変わらない。表示・環境・めぐるは home(出口あり)。`meguru.spots / zones / paths / marks` に `moon` のキーは増えない。`enterRegionByMove('home')` は `{ ok: false }`(raw を書きかえない)。記録は 1 件。
- `tropical` の save: 表示・環境・めぐるは jungle、世界地図も jungle を知っている、save は `tropical` のまま、記録は 0 件。
- `sticker` のページの背景の書きかえ(既存の挙動)は変えていない(RH-8 の候補として Roadmap §8.7 に記録)。

## 5. corridor / transition

- walk 10 本: `CONTINUOUS_WALK_ALLOWLIST` = `walkCorridorSpecs()` の ID。各 ID について `walkCorridorSpec(id) !== null`(欠けたら ID を名指しで赤)。
- 既存の transition 3 本: `jungle|sea`(sea)、`deepsea|sea` / `countryside|star_stop`(vertical)。spec なし。
- memory_lake: 専用の接続は あるが corridor に ならない。

## 6. strictRegions(harness の既定 on)

- `NaotocchiStrictRegions` を sandbox に渡し、既定は `true`。`harness({ strictRegions: false })` で本番の動きを試す。
- 既定 on のまま 既存テスト全部(1,430 件)を走らせて、**知らない地域 ID で止まった テストは 0 件**(隠れた typo なし)。off に した 既存テストは ない。off を使うのは RH-4 の テストの 本番の動きを 試す 箇所だけ。
- 最新 #278 の テストが 使う 地域 ID(`jungle` / `snow`)も 正本。

## 7. remove-it(本物の source を 1 か所ずつ こわし、`region-registry-test` の 赤を 確かめて もとに もどした)

| こわした もの | 赤に なった テスト |
|---|---|
| resolver の alias の段 | 5, 6, 8 |
| 重複の抑え | 6, 7 |
| strict の throw | 5, 9 |
| `findRegion` を `|| REGIONS[0]` に もどす | 8, 9 |
| `currentEnvironment().region` を raw に もどす | 7, 8 |
| `enterRegionByMove` の比較を raw に もどす | 7 |
| めぐるの `start` を raw に もどす | 7 |
| めぐるの 毎 frame の比較を raw に もどす | 7, 8 |
| `seedWorldRegions` の alias を 外す | 8 |
| `SKY_OVERRIDE` から memory_lake を 外す | 3 |
| `REGION_LINE` に typo の キーを 足す | 2 |
| `CLIMATE` から desert を 外す | 3 |
| `CORRIDOR_TERRAIN` の `city|sea` を こわす(spec が 組めない) | 10(`city|sea` を 名指し) |

テストの 中でも、15 の 全件の表と 16 の 一部の表の それぞれで「1 件 消す」「typo / 余分を 足す」が 赤に なることと、spec の 欠けを ID で 返すことを 確かめる(テスト 12)。

## 8. cache token

- 中身が 変わった `script.js` と `meguru.js` だけ、RH-3 の式(`YYYYMMDD-<assetHash>`、`tools/bump-versions.js` の `assetHash`)で 更新: `script.js?v=20260927-34391726`、`meguru.js?v=20260927-ccc2677a`。
- `npm run bump` は hash が 同じ file も 含めて 33 件 全部の 日付を 書きかえる(中身の 変わらない 31 件の URL も 変わり、再訪時に 取りなおしに なる)ので、使わずに 2 件だけ 同じ式で 更新した(hash は `npm run bump` の 出力と 一致を 確認)。asset gate(`asset-integrity-test`)は 33 / 33 一致。

## 9. 結果

- `region-registry-test`: 12 / 12 PASS
- `npm test` 全体: **1444 / 1444 PASS、exit 0**(RH-3 後の 1432 + 12)
- ログの「unknown region id」5 行は、すべて `region-registry-test` の 本番の動きを 試す 箇所(`moon` ×2・`forrest`・`null`・数)
- remove-it: 13 / 13 が 赤
