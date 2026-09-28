# RH-5 Content Registry Coverage — QA 記録(2026-09-28)

基準: `main` `ddb91876555943f37c4b4460ec575aa9b3777f10`(Merge PR #351 = RH-4)
branch: `claude/naotocchi-rh5-content-registry`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §7.2

master・meguru.js・cast-bounds.js・movie-dialogue.js・画像は 変えていない(網羅の すきまは 見つからなかった)。
save の 形・schemaVersion(5)・ending の 番号・見た目は 変えていない。#278 の 表情(asset / resolver / 仕様)には 触れていない。

## 1. 正本(master)

| registry | 件数 | 内訳 |
|---|---|---|
| しゅぞく `playerSpecies` | 31(× 8 段 = 248) | normal 22、rare 8、secret 1(`ren`) |
| なかま `companions` | 26 | normal 18、rare 8 |
| こいびと `partners` | 18 | |
| 伝説 `legends` | 5 | |

## 2. 表の 一覧(`tests/content-registry-test.cjs`)

### 全件 そろう べき 表(正本 + 固定した 旧行)

| 表 | 期待する 集合 |
|---|---|
| script `MASTER_SPECIES_EMOJI` | しゅぞく 31(各 8) |
| script `SPECIES_STAGE_DESCS` | しゅぞく 31(各 8)+ 旧しゅぞく 11 |
| meguru `HABITAT` | しゅぞく 31 |
| script `COMPANION_RUNTIME` | なかま normal 18 + 旧 koala |
| script `RARE_COMPANION_RUNTIME` | なかま rare 8 + 旧 kinoko |
| script `COMPANION_CHARACTER_IDLE_LINES` / `COMPANION_DAILY_REACTIONS` | なかま 26 + koala + kinoko |
| script `PARTNER_RUNTIME_PROFILE` | こいびと 18 |
| script `PARTNER_DAILY_REACTIONS` / `PARTNER_CHARACTER_IDLE_LINES` / `PARTNER_ANNIVERSARY_LINES` / `PARTNER_SIGNATURE_LINES` / `PARTNER_RELATIONSHIP_LINES` / `PARTNER_FIRST_ENCOUNTERS` | こいびと 18 |
| movie-dialogue `partners` / `legends` | こいびと 18 / 伝説 5 |
| cast-bounds(画像 パスごと) | しゅぞく 248 + なかま 26 + こいびと 18 + 作者 + 卵 3 + 旧 `companions/kinoko.png` |

表は 起動せずに source の 宣言を そのまま 評価する。`COMPANION_RUNTIME` / `RARE_COMPANION_RUNTIME` / `PARTNER_RUNTIME_PROFILE` は 欠けると 起動時に TypeError に なるが、本番の 防御は 足さず、テストが「どの 表の どの ID か」を 名指しして 先に 止める。

### 意図して 一部だけ 持つ 表(集合を 完全一致で 固定)

| 表 | 集合 |
|---|---|
| meguru `WATER_LINES` | salmon / clownfish / jellyfish / starfish / coral / hermit_crab / turtle / frog / unknown |
| meguru `PLANT_LINES` | dandelion / sakura / venus_flytrap / mushroom / world_tree / coral |
| meguru `NIGHT_LINES` | ghost / star |
| meguru `SCENERY_LINES` | 旧 plant + dandelion / sakura / venus_flytrap / world_tree / mushroom / coral |
| meguru `NIGHT_COMPANIONS` | bat / owl / watcher |
| cast-motion `PERSONALITY` | snail / clock / sekizou / watcher / box / 旧 koala / forest_bear / grove_deer / robot_neighbor / cat_ceo |

### 旧 ID の 行(消さない。現行の 正本には まぜない)

- 旧しゅぞく 11(master の `legacyOnlySpecies` = script の `LEGACY_NORMAL_LINES` + `LEGACY_RARE_LINES`): `ALL_LINES` にも 正本にも 入らない。
- 旧なかま koala / kinoko: 正式な alias で 現行の なかま(snail / clock)へ よみかえられる ので 実行時には 引かれない。
- 削除・整理は RH-11 の cleanup 候補。

## 3. ひみつの しゅぞく(`SECRET_LINES` / `SECRET_LINE`)

- master の `playerSpecies.secret` から 作る。`['ren']` は master が ない ときだけの 互換の 安全網。
- テストで script.js の 組み立ての 行を 別の master(secret = `kage`)で 動かし、`SECRET_LINES = ['kage']`(安全網に たよらない)、master なし で `['ren']` を 確かめた。
- 置きかえた 判定: `ALL_LINES`、変身の rare 候補からの 除外、指輪の 重み、図鑑の レア表示・まとめの 件数、シールの 一覧(rare / secret)、卵の 候補からの 除外(`isSecretLine`)。れんくん 固有の しくみ(変身への 差しこみ、はじめて であう 演出、人生カード、ひみつの シールの 解放)は `SECRET_LINE`。
- 表の キー(`SPECIES.ren` など)・画像 パス・CSS の クラス・表示文言(「れんくんにであった」)は そのまま。

## 4. しゅぞくの alias(`canonicalSpeciesId`)

- 順番: raw ID → master の `speciesAliases` → 正本の ID → 登録表(`progressRegistry().dex`)と 照合。
- `dexFoundCount` / `dexElderCount`(RH-2 の `countRegistered` に `canonicalDexKey` を わたす)と、図鑑の「見つけた」表示(`knownDexKeys`: 一覧・まとめ・くわしい 画面)が 同じ 正本化を 共有する。
- いまの alias は すべて 同じ ID どうし なので 結果は かわらない。テストで 仮の alias(`oldcat → cat`)を 入れて、件数と 表示が いっしょに かわり、save の キーは そのまま で あることを 確かめた。
- RH-8 に のこす もの: 旧しゅぞくの 人生の しゅぞく名 `???`、`recordDiscovery` が 知らない しゅぞくの キーを 書く こと、save の 旧 ID の 整理。

## 5. ゴールの 段(`GOAL_TIER_IDS` / `GOAL_TIER`)

- `GOAL_TIER_IDS = ['life','lifeClear','best','dex','perfect']`、`GOAL_TIER` = ID → 番号。番号 = save の `endingTiersReached` / `unlockTier` の 値 = `goal-(番号+1)` の 絵 = `data-goal - 1`。
- 置きかえた のは ゴールの 段を 意味する 番号だけ: `achievedGoalTiers`、`getEndingTier`、ending の 画面の 分岐(ごほうび・図鑑の 件数・CSS の クラスの 条件)、バッジの 行の 絞りこみ、PERFECT の 判定、読みこみ時の 段 0 の 除去。
- 変えていない: save の 番号 0〜4、`unlockTier` の データ、goal の 絵の 番号、`data-goal`、CSS の クラス名、ending の 条件。
- 段ごとの 表(`ENDING_TIERS` / `ENDING_TIER_ICONS` / `ENDING_TIER_UNLOCK_LABELS` / バッジの キー)は 5 件で 正本と 一致を 固定。

### 既知の 未解決の すきま: `ENDING_CELEBRATIONS`

- 4 段 だった ころの 4 件 のまま で、perfect の 分が ない(perfect では 演出が 出ない)。**4 件が 正しい 仕様 では ない。**
- RH-5 では 見た目を 決めない。テストの `KNOWN_GAPS.ENDING_CELEBRATIONS = { missing: ['perfect'] }` で「欠けて いるのは perfect だけ」を 固定した。5 件目を 足したら `KNOWN_GAPS` から 外す(外さないと 赤に なる)。
- 中身の 決定は 後続の visual / content cleanup 候補(Roadmap §7.2 に 記録)。
