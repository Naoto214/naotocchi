# RH-8 Save Compatibility Suite — QA 記録(2026-09-28)

基準: `main` `e90ff9a1`(Merge PR #354 = RH-7)
branch: `claude/naotocchi-rh8-save-compat`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §8.7

- schemaVersion は 5 のまま。save の 移行(migration)は 足していない。
- 新しい save の field は 足していない。
- ふつうの save データは 消していない。
- 知らない ID を まとめて 消す ことは していない。
- すでに 解放した もの(実績・ending・報酬)は 取り消していない。
- master・画像・見た目は 変えていない。
- 変えた production は `script.js` だけ。

## 1. 実装した もの

| # | もの | 中身 |
|---|---|---|
| 1 | 旧しゅぞくの 名前 | 旧しゅぞく 11(`LEGACY_NORMAL_LINES` + `LEGACY_RARE_LINES`)に、master より まえ(`3aec31f2` の まえ)の 表示名を そのまま のこした(とり / うさぎ / さかな / パンダ / きつね / ふくろう / はな / ロボット / きょうりゅう / にんぎょ / ユニコーン)。<br>正本の 名前が さき、旧しゅぞくは 正本に ない ID だけ あとに 足す(名前から しゅぞくを さがす `lifeRecordVisual` で 正本が 勝つ)。<br>正本の しゅぞく・図鑑の 件数には まぜない。master の 名前と かぶる ものは ない。 |
| 2 | シールの 背景 | いま えらべない 値(知らない ID・まだ 行っていない とくべつな 地域・未来の save)は、表示だけ `home` に する。save には 書きもどさない。<br>背景の タスク(はいけいを かえる)は 解決した あとの 値で みる(知らない 値では 解放しない)。 |
| 3 | self-XSS | 過去の 人生の 年れい・そだち・なかまの 数と、年表の 年れいを、innerHTML の まえに エスケープ。 |
| 4 | snapshot の parse | `localStorage` の 文字列が 前と 同じ なら、3 世代ぶんの JSON を parse しない。別の タブが 書きかえたら 文字列が かわる ので 読みなおす。 |
| 5 | めぐるの きろく | `recordMet` / `recordTalk` / `recordSpot` / `recordMapBits` / `recordWorldLinks` の `saveState` を、microtask で 1 回に まとめた。<br>次の frame や タブを 閉じる イベントより さきに 確定する。bridge の 署名は そのまま。 |
| 6 | **見つけた バグ: `transformOptions`** | 配列で ない 値(文字列など)が 入った save を 読むと、`renderTransformChoices` の `options.map` で 起動時に 落ちていた。<br>読みこみで かたの ちがう 値だけ とりのぞき、RH-1 と 同じく `lifetime.saveRepair` に 記録する。<br>知らない しゅぞく ID は save に のこし、描く ときだけ とばす。とばす ことで `data-line` への エスケープ されない 値の 出力も なくなった。 |

## 2. 本物の 古い save(`tests/fixtures/saves/real/`、作りかたは その README)

- `tools/gen-real-save-fixtures.cjs` は、古い commit を git の worktree に 出して、その commit の コード 自身に save を 書かせる。古い コードは repo に 置かない。
- 6 つの 時代: schemaVersion 3 より まえ / v3 / v4(master より まえ・旧しゅぞく)/ items-v2 より まえ / シールの ポイント + めぐる Phase 1 / めぐる Phase 2。
- 検査:
  - 例外なく 読める。
  - お金・図鑑の キー・恋人・シール・めぐるの きろく・過去の 人生が へらない。
  - RH-2 の 件数が 期待どおり。旧しゅぞくの 図鑑の キーは save に のこり、件数には 入らない(RH-2 の 方針)。
  - load → save → load が 冪等。
- **旧 → 新 → 旧**(`--rollback`): いまの コードで 読んで 書いた save を、6 時代 すべての 古い コードで 読みなおして、例外 0。

## 3. こわれた save と fuzz

- 11 とおりで、起動・状態の 健全さ・保存を 確かめた:
  - boolean の 位置に `"false"`
  - 数値の 位置に `"123"`
  - 重複した ID
  - 知らない ID・未来の ID
  - キーの 欠け
  - `partner` が 文字列
  - `transformOptions` が 文字列
  - 知らない `stage`
  - 巨大な 数値
  - `__proto__` の キー(prototype が 汚れない)
  - 途中で 切れた JSON(読めない 原本は 上書き しない)
- seed つきの fuzz を 200 回: 本物の 古い save 6 つを ランダムに こわして、起動・描画・保存の いずれでも 例外が 出ない。
- こわれた save と fuzz は、本番と 同じ 地域 ID の あつかい(`strictRegions: false`。知らない 地域は home に よみかえて 記録)で 動かした。

## 4. remove-it(本物の source を 1 か所ずつ もとに もどし、赤を 確かめて もどした)

| もどした もの | 赤に なった テスト |
|---|---|
| 旧しゅぞくの 名前を 足さない | 旧しゅぞくの 名前 |
| シールの 背景を 書きもどす | シールの 背景 |
| 過去の 人生の 年れいの エスケープ | エスケープ |
| snapshot の cache | snapshot |
| `recordSpot` を すぐ `saveState` | めぐるの まとめ保存 |
| `transformOptions` の 修復 | こわれた save(`transformOptions` が 文字列) |

6 / 6 が 赤。

## 5. 決めずに のこした もの(判断が 要る。stop 条件に あたる ため 実装していない)

| もの | 理由 |
|---|---|
| `savedByBuild` を save に 足す | 新しい save の field(save の 形の 変更)。足すか どうかは オーナーの 判断 |
| item-system の `known()` を「保存では 残す」に | 未来の save の 判定(`savedByBuild`)が 前提。知らない ID の あつかいの 変更で、どの 時点の save から 残すか が 一意に 決まらない |
| `itemMemories` の 上限・save の 大きさの 上限 | 上限を こえた ぶんを 切る と ふつうの データを 消す ことに なる |
| `recordDiscovery` が 知らない しゅぞくの キーを 書く | 書かない ように すると 未来の しゅぞくの 記録が 消える。書く まま だと 図鑑に 知らない キーが ふえる。RH-2 の 件数には 入らない ので 実害は ない |
| dirty flag(変更が ない tick では save しない) | save の 回数と タイミングが かわる。RH-9(隠れた タブ・複数 タブ)と いっしょに 決める |
| オーナーの 実機の save | セーブコードが ない |
| save の 旧しゅぞく ID の 整理 | ふつうの データの 書きかえ。しない(表示の よみかえ だけ) |

## 6. cache token

- 中身が 変わった `script.js` だけ、RH-3 の 式(`assetHash`)で 更新: `script.js?v=20260928-8eba402c`。

## 7. 結果

- `save-compat-test`: 24 / 24
- `npm test` 全体: **1491 / 1491 PASS、exit 0**(RH-7 後の 1467 + 24)
- `--rollback`: 6 / 6 時代で 新 → 旧 の 読みなおし 例外 0
