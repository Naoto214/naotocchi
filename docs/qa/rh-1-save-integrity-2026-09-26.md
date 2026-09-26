# RH-1 Save Integrity — QA 記録(2026-09-26)

基準: `main` `d4a95949638d9fec9ce762b436577d156dae254a`(Merge PR #346)
branch: `claude/naotocchi-rh1-precheck-gpttmq`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §5.1 / §2 P1-1

## 1. 変えたこと

| 場所 | 内容 |
|---|---|
| `script.js` `SAVE_ARRAY_KINDS` / `sanitizeSaveArrays` | 配列の **要素の型** を検査する。`ids`(空でない文字列の集合)・`idSeq`(文字列の履歴。重複を保つ = `duelRecentQuestionIds`)・`ints`(整数の集合。`"2"` → `2`)・`idObjs`(`id` が文字列の object = `companions`。既存の filter と同じ条件) |
| `loadState` の `migrate` | `normalizeStateShape` の直後(いこうのコードより前)と `normalizeStateValues` の中で検査する。`infiniteReturn` も同じ(記録は `infiniteReturn.` を前に付ける) |
| `recordSaveRepair` | 取り除いた / なおした値を `lifetime.saveRepair = {v:1, lastAt, total, byField, samples(≤10, 各120文字)}` に記録する。**修復が 0 件の load では作らず、さわらない** |
| `loadState` の backup | load 直後の `localStorage.setItem(SAVE_BACKUP_KEY, raw)` をやめた。修復が起きた load では、元の raw を強制 snapshot に残し、`lastGoodSaveRaw` を修復後の JSON にする(backup は `saveState` だけが書く) |
| `checkAchievements` | 2番目の防御。条件の例外は `reportRuntimeError('achievement:<id>')` に 1 回だけ記録し、未達のまま続ける。**条件そのものは変えていない** |
| `render()` のバッジの行 | 今の `ENDING_TIERS` に無い整数の tier は表示だけ飛ばす(save には残す)。tier 個別ではなく未知の整数一般への防御 |

変えていないもの: `schemaVersion`(5 のまま)、`romanceCompatibilityVersion`、段階移行の gate、実績の条件、解放済み実績(取り消さない)、登録表との照合(RH-2)、meguru / item-system / trait / PERFECT / hidden-tab / multi-tab。

### 未知 ID と壊れた値の区別
- **残す**: 空でない文字列は、未知・未来・退役・typo でもすべて残す(登録表とは照合しない)。範囲外の整数の tier(`9`、`-1`)も残す。
- **取り除いて記録**: `null` / `undefined` / 数値や boolean(ID の配列) / object / 配列 / 空文字 / 小数(整数の配列) / 重複(`idSeq` と `idObjs` を除く)。
- **なおして記録**: 整数の配列の中の整数の文字列(`"2"` → `2`)。
- RH-1 の前から存在する削除(`loadState` の `ownedShopItems` / `equippedItemId` の SHOP_ITEMS filter、item-system の `known()`、シールの退役お題)は変えていない(RH-8)。

## 2. 実装前に再現した問題(`d4a9594`)

| 壊れ方 | main の結果 |
|---|---|
| `discoveredStages` に `null` / 数値 / object | boot が `rare-line-1` の `.split` で例外。backup も同じ raw で汚れる |
| `endingTiersReached` に `null` / `9` / `-1` / `1.5` | boot が `render()` の `ENDING_TIERS[i].title` で例外。backup も汚れる |
| `companions` に `null` | load の いこうで例外 → save 全体が読めない扱い(backup が無ければ新しい いのち + 書きこみ停止) |
| そのほかの配列に `null` / 数値 | boot はするが、値が件数に入り実績が誤って解放される(`[null]` → `companion-1` など) |

RH-1 の後: 上のすべての場合で boot が通り、backup には修復後の save だけが入る。

## 3. テスト

新規 `tests/save-integrity-test.cjs`(12 件)。fixture は `tests/fixtures/saves/corrupt/{mixed-malformed,rare-line-crash,ending-tiers}.json`、`tests/fixtures/saves/valid/legacy-v4.json`。

| 観点 | テスト |
|---|---|
| 正常な現行 save / 正常な旧 save(v4) | saveRepair を作らない。未知・退役 ID を残す |
| `null` / 数値 / object / 配列 / 空文字 / 重複 / 混在 | `mixed-malformed`: 残る値と `byField`(15 field、total 30)、samples は 10 件で頭打ち |
| 未知 / 未来 / 退役 ID | `futureline:3` / `bird:2` / `future-achievement-99` / `retired_partner_old` / `future-task` などが残る |
| 起動を止めていた経路 | `rare-line-crash`、`ending-tiers`(`[0,2,9,-1]` を save に残し、バッジは 2 つだけ) |
| 修復後の boot / save | 修復後に save が成功し、壊れた要素が残らない |
| backup が汚れない | 主キーが壊れていて backup が正常 / 両方壊れている / セーブコード取りこみ → reload / `loadState()` 単体で backup を書かない |
| 正常 save の後に backup が進む | 修復後の主キーが、次の save で backup になる |
| 冪等 | 修復済みの save を 2 回読みなおしても `saveRepair` が変わらず、強制 snapshot も増えない |
| 表の網羅 | `freshState()` のすべての配列に `null` を 1 つずつ・全部入れても save が採用され、`null` が残らない |
| 2番目の防御 | 実行中に入った `null` で条件が例外になっても save が続き、記録は 1 回 |
| 途中で切れた JSON | 今までどおり backup で起動し、書きこまない |

### remove-it(実装を 1 つずつ外して、テストが赤になることを確認)

| 外したもの | 赤になったテスト |
|---|---|
| 要素の検査(`sanitizeSaveArrays` を空にする) | 1, 2, 3, 4, 6, 8, 10, 11 |
| `companions` の `idObjs` | 11 |
| load 直後の backup への写しを戻す | 7 |
| 修復後の `lastGoodSaveRaw` | 6, 8, 10 |
| 元の raw の強制 snapshot | 6, 8 |
| バッジの存在確認 | 3, 10 |
| `checkAchievements` の try/catch | 12 |
| 「修復 0 件なら saveRepair を作らない」 | 5 |

## 4. rollback 確認(手元・repo には置かない)

手順:
1. RH-1 の `script.js` で、4 つの fixture を load → money を 1 足して `saveState()` → storage を JSON に書き出す。
2. `git show d4a95949638d9fec9ce762b436577d156dae254a:script.js`(blob `3c2ec25`)を作業ツリーに一時的に置き、同じ harness で書き出した storage を読む → `saveState()` → もう一度読む。
3. RH-1 の `script.js` に戻す(`cmp` で一致を確認)。

| RH-1 が書いた save | RH-1 前のコード(`d4a9594`)で |
|---|---|
| `mixed-malformed` 由来(saveRepair あり) | boot 可。money・図鑑・地域・tier が一致。**`saveRepair` は古いコードの save 後も残る** |
| `rare-line-crash` 由来(saveRepair あり) | boot 可。同上 |
| `legacy-v4` 由来(saveRepair なし) | boot 可。同上 |
| `ending-tiers` 由来(tier `9` / `-1` を保持) | **古いコードのバッジ表示で例外**。ただし、これは RH-1 の前から入っていた値で、古いコードは元の fixture でも同じ例外になる。RH-1 は範囲外の tier を新しく作らない(ユーザー判断で「未知の整数 tier は save に残す」)。rollback で悪化はしない |

## 5. 結果

- `node --test tests/save-integrity-test.cjs`: 12 / 12 pass
- 既存の save / migration テスト(`save-recovery-test`・`migration-test`): 変更なしで pass
- `npm test` 全体(smoke / dialogue / visual-qa + node --test 1387 件): 1386 pass・1 fail。fail は `item-art-unification-test` の `Cannot find module 'sharp'`(この container に node_modules が無かった)。`npm ci` の後に単体で 4 / 4 pass → 全件 green
- CI(`runtime-smoke-test` / `home-layout`)は main への PR と push でしか走らない。PR を開いた時点で確認する
