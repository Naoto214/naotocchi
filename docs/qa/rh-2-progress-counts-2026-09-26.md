# RH-2 Canonical Progress Counts — QA 記録(2026-09-26)

基準: `main` `5a53933bff7b1f2cbca14840407b5482319732b8`(Merge PR #348 = RH-1)
branch: `claude/naotocchi-rh2-progress-counts`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §5.2 / §6、監査 P1-2

## 1. 方針

- save の raw 配列は **履歴として そのまま のこす**(未知・未来・退役・typo の ID も消さない。RH-1 と同じ)
- いまの版の進捗・実績・ゴール・表示は **正本の件数** で決める:
  raw ID → alias の正規化 → 登録表との照合 → 重複の除去 → 件数
- 解放済みのもの(`achievementsUnlocked`・`dexCleared`・`endingTiersReached`・かんむり・ナオトのアイテム)は **取り消さない**。これからの判定だけ正本の件数を使う
- 新しい save field は足さない(`legacyUnlocks` は作らない。`lifetime.saveRepair` は RH-1 の修復の記録のまま)。`schemaVersion` は 5 のまま

## 2. canonical helper(`script.js`、`countMinigamesPlayed` の下)

| helper | 登録表 | 正規化 |
|---|---|---|
| `countRegistered(ids, registered, canon)` | 共通の部品(1 つだけ) | 引数 |
| `progressRegistry()` | 図鑑 `ALL_LINES × 0..7`・`ALL_PARTNER_CANDIDATES`・`REGIONS`・`COMPANIONS`・`NAOTO_ITEMS`・`TIME_CHOICES` / `WEATHER_CHOICES`(`auto` を除く)・`STICKER_TASKS`・`ACHIEVEMENTS`。はじめて数えるときに作る | — |
| `canonicalPartnerId` / `canonicalRegionId` | master の `partnerAliases` / `regionAliases` | — |
| `dexTotalCount` / `dexFoundCount` / `isDexComplete` / `dexElderCount` | 図鑑 | なし |
| `partnersFoundCount` / `partnersMarriedCount` | 恋人 | `canonicalPartnerId` |
| `regionsVisitedCount` | 通常の地域 | `canonicalRegionId` |
| `companionsRecruitedCount` | 通常のなかま | 既存の `canonicalCompanionId` |
| `stickerTasksDoneCount` | シールのお題 | なし |
| `achievementsUnlockedCount` | 実績 | なし |
| `ownedStickerKinds`(既存を変更) | シールのカタログ(`stickerById`) | 既存 |

## 3. 置きかえた count site

- 実績の条件: `dex-25` / `dex-50` / `dex-100` / `dex-150` / `dex-complete` / `elder-collector` / `partner-1` / `partner-all` / `married-1` / `married-3` / `perfect-life`(結婚の数) / `region-3` / `region-all` / `companion-1` / `companion-5` / `weather-all` / `time-all` / `naoto-1` / `sticker-tasks-5` / `sticker-10` / `sticker-100`(`ownedStickerKinds` 経由)
- ゴール: `achievedGoalTiers`(④)・`endingProgress`(④ / `checkGrandGoals`)・`crownAchievementWeight`(かんむり)
- 表示: エンディングの「みつけたすがた」・図鑑のヘッダー(しゅぞく + 恋人)・人生カード・「ぜんぶけす」のまとめ(図鑑・実績)
- 新しい表示: 図鑑のまとめに `📖 ずかんコンプリートの きろく あり`(`dexCleared === true` かつ `!isDexComplete()` のときだけ。save には何も書かない)

変えていないもの: 特性(trait)・フェニックス・きゅうきゅうばこ の条件、PERFECT の定義(全実績)、`item-all` / `shop-all`、`companion-all`(既に正規化済み)、`rare-line-*` / `every-normal-line`(既に系統で判定)、実績画面の件数(既に登録表で数えている)、meguru.js、item-system.js、master。

## 4. 残した raw の length(意味がちがう、または既に正しい)

| 場所 | 理由 |
|---|---|
| `shop-1`・「ぜんぶけす」の そうびの数(`ownedShopItems`) | `loadState` が既に SHOP_ITEMS で絞っているので、raw の数 = 登録済みの数(未知 ID の削除そのものは RH-8) |
| `pastlives-10`・`pastLives` の上限 100・「これまでそだてたこ」 | 履歴の件数 |
| `meguru.js` の `regionsVisited.length >= 8`(ナオトの会話) | めぐるの会話の条件。RH-2 の対象外(めぐるは触らない) |

grep(`… .length` と `ALL_LINES.length * STAGES_PER_LINE` の類): 上の表のほかに 0 件。

## 5. 実装前に再現した誤カウント(main `5a53933`)

| save | main |
|---|---|
| いまの図鑑 176 + 旧系統(bird など)72 | `dex-complete`・`dexCleared`・④・かんむり が出る |
| 恋人 alias の重複 + 退役 ID(登録済みは 14 / 18) | `partner-all` |
| `tropical` + 未来の地域(登録済みは 9 / 11) | `region-all` |
| 退役・未知・typo のなかまだけ | `companion-1` / `companion-5` |
| 未知の結婚相手・てんき・じかんたい・ナオトのアイテム | `married-3` / `weather-all` / `time-all` / `naoto-1` |
| 旧系統の さいごの姿だけ | `elder-collector` |
| 未知のシール 12 種 | `sticker-10` |

RH-2 の後は、どれも出ない(下のテスト)。

## 6. テスト

新規 `tests/progress-counts-test.cjs`(15 件)。fixture `tests/fixtures/saves/progress/{alias-unknown-mix,dex-cleared-grandfathered}.json`。RH-1 の `corrupt/mixed-malformed.json`(saveRepair あり)と `valid/legacy-v4.json`(旧 save)も使う。大きな図鑑(176 + 72・248 + 72)は test の中で登録表から組み立てる。

| 観点 | テスト |
|---|---|
| alias + canonical の重複・退役・未来・typo | 1, 2, 13 |
| 旧系統で ④・`dex-complete`・かんむり にならない | 3, 4, 14 |
| 重複は 1 回 | 5 |
| 本当に いまの図鑑 248 そろった → ④・かんむり・エンディングの件数 | 6 |
| `dexCleared` の grandfather(取り消さない・水増ししない・きろく の表示・新しい field なし) | 7, 8 |
| 図鑑のヘッダー(しゅぞく + なかま + 恋人) | 9 |
| RH-1 の saveRepair を持つ save(saveRepair に何も足さない) | 10 |
| 旧 save(v4)の未知 ID は のこり、数えない | 11 |
| PERFECT は全実績のまま | 12 |
| `perfect-life` の結婚の数 | 15 |
| UI: 図鑑のヘッダー・図鑑のまとめ・人生カード・「ぜんぶけす」・エンディング | 3, 6, 7, 8, 9 |

既存の `post-integration-audit-test` の `elder-collector` は、登録にない `dog-0:7` … で 8 を作っていた。RH-2 が数えなくする入力そのものなので、**登録済みの 8 種類の さいごの姿** に直し、7 では false になる確認を足した(assert は弱めていない)。

### remove-it(各 domain を旧 `.length` に戻す・guard を外す)

| 外したもの | 赤になったテスト |
|---|---|
| `dexFoundCount` | 3, 5, 6, 7, 9, 11, 14 |
| `dexElderCount` | 4 |
| `partnersFoundCount` | 9, 10 |
| `partnersMarriedCount` | 1, 2, 5 |
| `regionsVisitedCount` | 1, 2, 5 |
| `companionsRecruitedCount` | 1, 5, 10, 11 |
| `weather-all` | 1, 2 |
| `time-all` | 1, 2 |
| `naoto-1` | 1, 2 |
| シールの種類(`stickerById` の照合) | 1, 2 |
| `stickerTasksDoneCount` | 1, 2 |
| `achievementsUnlockedCount` | 1 |
| 恋人の alias | 13 |
| 地域の alias | 13 |
| ④(`achievedGoalTiers`) | 3 |
| `endingProgress` | 3 |
| かんむり(`crownAchievementWeight`) | 14 |
| エンディングの件数 | 6 |
| 人生カード | 3, 6, 7 |
| 「ぜんぶけす」 | 3, 7 |
| 図鑑のヘッダー(しゅぞく) | 3, 7, 9 |
| 図鑑のヘッダー(恋人) | 9 |
| 「コンプリートの きろく あり」 | 7, 8 |
| `perfect-life` | 15 |

## 7. 結果

- `node --test tests/progress-counts-test.cjs`: 15 / 15 PASS
- `npm test` 全体: **1418 / 1418 PASS、exit 0**(RH-1 後の 1403 + RH-2 の 15)
- remove-it: 24 パターンすべて、少なくとも 1 件が赤(上の表)
- 既存テストの変更: `post-integration-audit-test` の `elder-collector` の入力を登録済みのキーに直しただけ(assert は強めた)

### 実ブラウザでの確認(Chromium 141 headless、390×844 と 320×568)

`dex-cleared-grandfathered.json` を読みこみ、本物の UI(メニュー → ずかん)で開いた。

- 図鑑のヘッダー: `3 / 284`(いまの図鑑の登録済みの形 3 + なかま 0 + 恋人 0 / 248 + 18 + 18)。旧系統 bird の 8 は数えない
- 図鑑のまとめ: `ふつう 3/176`・`📖 ずかんコンプリートの きろく あり` が見える位置に出る
- 横はみ出し なし、console error 0(`/favicon.ico` の 404 は main でも同じ)
- save に `legacyUnlocks` も `saveRepair` も足されていない
