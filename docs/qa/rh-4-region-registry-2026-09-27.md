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
