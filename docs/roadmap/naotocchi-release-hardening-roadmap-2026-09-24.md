# なおとっち Release Hardening Roadmap

日付: 2026-09-24 ／ 種別: **read-only の実行計画**。この文書のほかには、コード・テスト・既存文書を 1 行も変えていません。

基準: GitHub `main` HEAD **`c7705d8`**(Merge PR #339: Phase 4E-4 横断監査)
元になる監査: [`docs/audit/naotocchi-full-architecture-audit-2026-09-24.md`](../audit/naotocchi-full-architecture-audit-2026-09-24.md)
(監査の基準は `13bd8bf`。同じ branch `claude/naotocchi-architecture-audit-evmymg` にあり、main には入っていない)

> **2026-09-26 追記(RH-1 実装時に確かめた事実。基準 main `d4a9594`)**
> - **めぐる 2D 本線と scenery / visual polish は正式に完了した**(main `6fd3c9e` 時点)。walk corridor 10 / 10 continuous(4E-4A #340・4E-4B #341・4E-4C #342、完了の正本化 #343)、special 3 本は既存 transition、memory_lake は通常 corridor の対象外、party 27 対応、preload / reload / fallback 完成、13 地域の visual QA(#344 / #345 / #346)、final visual completion pass(#347)、Three.js は不要と判断。save の形・`travelToRegion`・world map は不変。**めぐる本線へ戻る必要はない。**
> - §0.2 / §4 / §7 / §11 / §13.4 の「4E 完了待ち」「4E のあいだ」は解除済み(RH-4〜RH-7 も着手可)。順番は **RH-1 → RH-2 → RH-3** のまま。
> - めぐる側の既知の残りは次の 4 件だけで、Phase 4 / scenery polish の未完了には戻さず、**Release Hardening / post-4E backlog(RH-7)** として持つ: ① forest / mountain の到着時の描画コスト、② city 系の定常時の描画コスト、③ corridor 内のまれな 60 ms 超の frame、④ なかまが障害物に重なる既存バグ(continuous corridor 固有ではなく、既存 transition でも再現する)。fallslook・jungle の夜・star_stop などの軽い見た目の問題は、final visual completion pass で安全に直せる範囲を処理済み。
> - この Roadmap と監査は RH-1 の branch で main に入る(それまでは `claude/naotocchi-architecture-audit-evmymg` にだけあった)。
> - P1-1 の「起動が止まる」経路は `rare-line-1` の `.split` だけではなかった。§2 P1-1 と §5.1 を実際の経路に合わせて直した。
> - §8.1 の隠れたタブの推奨(A′: 最大 30 分の留守中処理を流用)は、その後の仕様検討で **更新が必要**。RH-9 着手時に書き直す(下の §8.1 の注記)。
> - §0.3 の open PR に、#302(シール所持 Draft)・#300 / #298(docs)が増えている。どれも RH-1 の save まわりには触れていない。

---

## 0. いまの位置(このロードマップを書く前に確かめたこと)

### 0.1 main の差分(監査の後)

監査時の `13bd8bf` から、main は `c7705d8` に進みました。

| PR | 内容 | この計画への影響 |
|---|---|---|
| #338 | Phase 4E-3 corridor target preload | 変わったのは `meguru.js` +201、`script.js` **1 か所**(`meguruBridge.prepareIllustrations` が Promise を返す)、`tests/meguru-phase4e3-test.cjs` の新規追加 |
| #339 | Phase 4E-4 横断監査(文書だけ) | 4E-4 を **4E-4A(LOW 4 本)→ 4E-4B(MEDIUM 3 本)→ 4E-4C(HIGH 2 本)** に分けた |

**監査の P1 9 件は、最新 main でもすべて残っています。** 関係する行も同じ番号のままでした [V]。

| 確認箇所 | 最新 main での状態 |
|---|---|
| `script.js:1700`(`normalizeStateValues`) | 配列要素の型を検査していない |
| `:2025` | load した直後に raw を backup へ写している |
| `:2182` / `:2495` / `:2587` | 図鑑を `discoveredStages.length` で判定している |
| `:2152` / `:2178` | `region-all` / `partner-all` も配列の長さで判定している |
| `:10637`(`isTimePaused`)/ `:18046`(`loop`) | タブが隠れているかを見ていない |

**P0 はなし、という監査の結論は維持します。** 通常のプレイで save が失われる経路は、最新 main でも見つかりませんでした。

### 0.2 Phase 4E の現在位置

| 段 | 状態 |
|---|---|
| 4E-1(形と状態の data) | ✅ #336 |
| 4E-2(`home|forest` の Canvas PoC) | ✅ #337 |
| 4E-3(着く側の preload) | ✅ #338 |
| 4E-4 Preflight(10 本の横断監査) | ✅ #339 |
| **4E-4A** | 未着手(2026-09-26 追記: ✅ #340) |
| 4E-4B / 4E-4C | 未着手(2026-09-26 追記: ✅ #341 / #342。完了の正本化 #343、scenery / visual polish #344〜#347 も完了) |

4E-4A の中身:
- 絵を先に、非同期でデコードする。**`script.js` の `prepareIllustrations` を触る**
- 入口の最初の段は出発地域の絵にする
- 開始・破棄のしきいを「のこり距離」にする
- 端の段の palette・shore・背景を直す
- LOW 4 本を許可する

**4E-4 が触るファイル**: `meguru.js`(4E-2 / 4E-3 のブロック)、`script.js` の `meguruBridge` まわり(13,860〜14,020 行付近)、`tests/meguru-phase4e*-test.cjs`、`meguru-party-lod-test.cjs`、4B〜4E-1 の remove-it テスト 5 本(export の並び)、`package.json`(test の行)、`index.html`(`?v=`)。

### 0.3 open PR(最新)

| PR | 状態 | この計画での扱い |
|---|---|---|
| #278 表情 | Draft。F01〜F06 が未解決。main から 215 commit 遅れ | C 期「EXP-Final」で扱う |
| #275 感情状態 | Draft。**#278 に丸ごと含まれている** | C 期に close(#278 を merge する時点で) |
| #259 カード | Draft。09-24 にも更新された(`dd29d39`) | **本体のリリースには不要**。D 期。docs だけの merge は任意 |
| #302 シール | Draft。**#304 として merge 済み** | close の候補(release housekeeping) |
| #300 / #298 地理案 | open | close の候補。main の canon v1 が履歴として引用している |
| #92 実機修正 | open(09-06) | close の候補。main で置きかえ済み |

**めぐるの open PR はありません。** 4E は main の上で直列に進んでいます。

---

## 1. 全体像(4 つの時期)

```
          いま                      4E-4C merge          release 候補                release
───────────┼──────────────────────────────┼─────────────────────┼──────────────────────────┼──────▶
 4E 本線:  4E-4A ─── 4E-4B ─── 4E-4C ──┤
 A 期:     RH-1 ─▶ RH-2                 │ (4E と並行してよい)
           RH-3 ────────(並行)          │
 B 期:                                  RH-4 ─▶ RH-5
                                        RH-6(RH-4 の後)
                                        RH-7(RH-6 の後)
 C 期:                            RH-8 / RH-9 / RH-10 (B と並行してよい。meguru.js を触らない)
                                                      RH-11(housekeeping・EXP-Final)─▶ Release Gate
 D 期:                                                                              リリース後
```

| 時期 | 定義 | RH |
|---|---|---|
| **A. 今すぐ** | 4E と競合しにくい。放置するとデータ破損や誤解放が起きる。小〜中の局所修正。後で無駄になりにくい | **RH-1 Save Integrity**、**RH-2 Canonical Progress Counts**、**RH-3 Deterministic Harness & Asset Gate** |
| **B. 4E 完了後** | meguru.js・buildWorld・地域の表・source-text テスト・party・world の構造に触れる | **RH-4 Region Registry Integrity**、**RH-5 Content Registry Coverage**、**RH-6 Test Architecture Cleanup**、**RH-7 Meguru Post-4E Fixes** |
| **C. リリース直前** | UX の仕上げ・復旧 UI・Android の戻る・a11y・通知・複数タブ・実 save の fixture・asset と cache・Draft の整理・表情の最終 QA | **RH-8 Save Compatibility Suite**、**RH-9 Session Safety & Recovery**、**RH-10 Navigation, Notifications & A11y**、**RH-11 Release Hygiene & EXP-Final** |
| **D. リリース後** | 必須ではない拡張・大改修 | §12 |

**今すぐの PR は 3 本だけにします**(RH-1 / RH-2 / RH-3)。
- どれも `meguru.js` を触りません。
- RH-1 と RH-2 は `script.js` の save / goal の領域だけを触ります。4E-4 が触る `meguruBridge`(13,860〜14,020 行)から約 11,000 行離れています。

---

## 2. P1 9 件の再配置

| ID | 問題 | 時期 | PR | 4E との競合 | release blocker |
|---|---|---|---|---|---|
| **P1-1** | save の配列要素の型を検査しない。起動不能になり、backup も汚れる | **A** | **RH-1** | 低 | **はい** |
| **P1-2** | 図鑑・④・かんむり・ナオト解放・`partner-all`・`region-all` を配列の長さで判定している | **A** | **RH-2** | 低 | **はい** |
| P1-3 | 隠れたタブでも tick が進む | C(**仕様は今すぐ決める**) | RH-9 | なし | **はい**(仕様が決まれば実装は小さい) |
| P1-4 | 複数タブで上書きしあう | C | RH-9 | なし | **はい**(最低限の警告) |
| **P1-5** | `?v=` が最新かを CI が検査しない | **A** | **RH-3** | なし | **はい** |
| P1-6 | 起動に失敗すると真っ白・ボタンが効かない。救済手段がない | C | RH-9 | なし | **はい** |
| **P1-7** | harness の時刻 pin が host realm へ漏れる | **A**(契約と漏れの修正)+ B(既定値の反転) | **RH-3** + RH-6 | A は低、B は中 | release の条件は「CI が安定していること」 |
| P1-8 | `item-all` は「使った」が条件で、⑤ に近死が必須になる | C(**仕様は今すぐ決める**) | RH-10 | なし | 仕様次第(直すなら blocker) |
| P1-9 | 通知が上書きされる・量が多い | C | RH-10 | なし | **はい**(重要な通知が消えない保証だけでよい) |
| (P1 相当)Android の戻る | 戻るでゲームそのものから離れる | C | RH-10 | なし | Android を対象にするなら **はい** |

各項目の詳しい整理は次のとおりです。

### P1-1 save の配列要素の型(→ RH-1、最優先)
- **影響**: 1 要素でも `null` や数値になると、起動のたびに `checkAchievements` の中で例外になる。load の時点で raw がすでに backup に写っているので、**主キーと backup の両方が使えなくなる**。残るのは snapshot だけ。
- **実際の経路(2026-09-26、`d4a9594` で [V])**: 次の 3 つ。
  1. `discoveredStages` の非文字列 → `checkAchievements` の `rare-line-1`(`.split`)で例外。boot が止まる。
  2. `lifetime.endingTiersReached` に `ENDING_TIERS` に無い値(`null`・小数・`9`・`-1` など) → `render()` のバッジの行(`ENDING_TIERS[tierIndex].title`)で例外。boot が止まる。
  3. `companions` に `null` → load の なかまの いこう(`companion.id`)で例外。**その save 全体が読めない扱い**になり、backup が無ければ新しい いのち + 書きこみ停止になる。
  - 例外にならない配列でも、`null` や数値が件数に入って実績が誤って解放される(`[null]` で `companion-1`、`[3]` で `partner-1` など)。
- **入り口**: セーブコードの取りこみ(`decodeSaveCode` は `lifetime` と `stage` しか見ない)、将来の bug。
  - `replaceSavedLife` は backup に「今の正常な save」を書く。けれど reload 後の load が、取りこんだ壊れた raw を backup へ写しなおしてしまう。**害を生んでいるのは、load 直後の写しだけ** [V]。
- **今直すべきか**: はい。局所的で、後で無駄になりにくい。
- **4E との競合**: 低(`script.js` 1,650〜2,040 行と 2,640〜2,680 行)。
- **テスト**: 壊れた save の fixture を node テストで回す。remove-it も付ける。
- **完了条件**: §5.1。

### P1-2 配列の長さで判定している(→ RH-2)
- **影響**: 旧系統のキー(最大 72)や重複で、④・かんむり・ナオト解放・`dex-complete` が誤って解放される。`partner-all` と `region-all` も同じ。
- **今直すべきか**: はい。**新しく誤解放されるのを止める。** 既に解放された分は取り消さない(§6)。
- **4E との競合**: 低(`script.js` の実績表 2,073〜2,185、2,460〜2,600、図鑑の描画 12,860〜12,960、人生カード 9,891、プロフィール 17,095)。

### P1-3 隠れたタブ(→ 仕様は今すぐ・実装は RH-9)
比較は §8.1。**推奨は A′(隠れたら止める。見えたときに、今ある「るすのあいだ」の処理で控えめに反映する)。**

### P1-4 複数タブ(→ RH-9)
比較は §8.2。**推奨は「save の revision + `storage` event → 古いタブを読みとり専用にして案内を出す」。**

### P1-5 `?v=` の検査(→ RH-3)
設計は §5.3。1 時間でできる quick win。

### P1-6 起動の救済(→ RH-9)
設計は §8.3。RH-1 で「起動不能」の主な原因を先に潰すので、C 期で間に合います。

### P1-7 harness の時刻(→ RH-3 と RH-6)
- **RH-3**: 既定の挙動を変えずに、注入の契約を足し、host への漏れを塞ぐ。
- **RH-6**: 4E が終わった後に既定値を固定側へ反転し、めぐるの 28 ファイルを移す。

### P1-8 `item-all` / PERFECT(→ 仕様は今すぐ・実装は RH-10)
オーナーが次の 3 つから選びます(推奨は ①):
1. 条件を「一度でも手に入れた」に変える
2. `c_life_charm` だけを条件から外す
3. 今のまま(説明文を「ぜんぶ使った」に直す)

### P1-9 通知(→ RH-10)
設計は §8.5。

---

## 3. P2 / P3 の配置(今回の RH でやる / 後でやる)

| 監査の項目 | 時期 / PR | メモ |
|---|---|---|
| めぐるの地域の表 約 18 個・黙って fallback | B / RH-4 | §7.1 |
| キャラの平行表・欠けると起動時に例外 | B / RH-5 | テストだけの validator なら A に前倒しもできる |
| ゴールを 4 通りで記録・ordinal の平行配列 | B / RH-5(ID 変換表だけ) | 保存形式は変えない |
| 接続の field の平行・spec が `null` になると黙って fallback | B / RH-4 | 4E-4C の後 |
| 未来の save を検出しない・未知 ID を削除 | C / RH-8 | `savedByBuild`、未知 ID を消さない。削除している箇所は item-system の `known()` のほかに、`loadState` の `ownedShopItems` / `equippedItemId` の SHOP_ITEMS filter もある(RH-1 は変えていない) |
| `grandGoalPending` を保存しない | C / RH-10 | お祝いの再表示 |
| bi の恋人が毎回振り直される | C / RH-10 | 相手の対象を master か master の seed から決定的にする |
| `'ren'` の直書き、alias を runtime で使っていない | B / RH-5 | |
| 3 秒ごとの save が重い | C / RH-8 | dirty flag と間引き。めぐるの記録は frame の外で確定させる |
| `gamePassReadyAt` などの絶対時刻 | C / RH-9 | clamp |
| セーブコードの self-XSS | C / RH-8 | fuzz で検証。RH-1 の要素検査が一部を担う |
| source-text テスト 24 本 | B / RH-6 | §7.3 |
| 分母の直書き 20 ファイル | B / RH-6 | |
| remove-it が薄まっている | B / RH-6 | |
| paths filter | **A / RH-3** | quick win |
| トップ階層の状態が boolean の集合 | D | release 後 |
| `buildWorld` が 100〜170 ms・`foreignMap` | B / RH-7(4E-4 で残った分だけ) | 4E-4A が絵のデコードを扱う |
| reduced-motion(games / quick)・44 px | C / RH-10 | |
| 画像の cache-bust | C / RH-11 | **#278 より前に方針を決める** |
| HeartRails の座標の精度 | **いつでも**(quick win。world-environment.js だけ) | RH-9 に同梱してもよい |
| 文書と正本の矛盾(README / MASTER_SPEC / TEXT_STYLE / card の旧 SSOT) | C / RH-11 | |
| P3: 実績 ID の数字の注記、反応文(`ribbon` / `bowtie`) | C / RH-11(文言だけ) | ID は変えない |
| P3: 性別・指向の重みが位置に依存、偏ったシャッフル | D | |
| P3: 絵文字を絵のキーに使っていて衝突 | D | |
| P3: debug 用の global | D | 1 人用なので実害なし |
| P3: dead code の削除 | D | 急がない |
| P3: CSP、フォントの subset | D | |
| P3: `itemMemories` に上限がない | C / RH-8 | save の大きさの検査と一緒に |

---

## 4. 実行順・並列・禁止

### 4.1 依存関係
```
RH-1 ─▶ RH-2 ─▶ (RH-8 は RH-1/RH-2 の helper を前提にする)
RH-3 (独立)─▶ RH-6(既定値の反転は RH-3 の契約を前提にする)
4E-4C 完了 ─▶ RH-4 ─▶ RH-5(地域の ID の正本を共有する)
               RH-4 ─▶ RH-6(source-text の置きかえは、region の validator ができてから)
               RH-6 ─▶ RH-7(meguru.js の分割は、source-text の整理と同時か、その後)
RH-1 ─▶ RH-9(同じ save まわり・boot の最後を触る)
RH-2 ─▶ RH-11 EXP-Final(#278 の merge は script.js が落ちついてから)
RH-8〜RH-11 ─▶ Release Gate
```

### 4.2 4E と並列にしてよいもの
| 組み合わせ | 可否 | 理由 |
|---|---|---|
| RH-1 ∥ 4E-4A / B / C | ✅ | `script.js` の別の hunk(1,650〜2,680 行 と 13,860〜14,020 行)。`package.json` と `index.html` は機械的に解消できる |
| RH-2 ∥ 4E-4A / B / C | ✅ | 同上(2,070〜2,600 行 と 12,860〜12,960 行) |
| RH-3 ∥ 4E-4A / B / C | ✅ **条件付き** | harness の **既定の挙動を変えない**(足すのは option だけ)。4E-4 が足すテストに影響しない |
| RH-8 / RH-10 / RH-11(docs と CSS) ∥ 4E | ✅ | meguru.js を触らない。ただし C 期の本格着手は 4E-4C の後を推奨 |
| RH-9 ∥ 4E | ✅ | boot の最後・loop・index.html の boot guard。bridge には触れない |

### 4.3 並列禁止
| 組み合わせ | 理由 |
|---|---|
| RH-1 ∥ RH-2 | 同じ save と実績の近辺。RH-2 は RH-1 の「要素は文字列」という保証に依存する。**直列にする** |
| RH-1 ∥ RH-9 | どちらも `saveState` と boot を触る |
| RH-4 / RH-5 / RH-6 / RH-7 ∥ 4E-4 のどれか | meguru.js、remove-it テストの export の並び、source-text テスト |
| RH-6 ∥ めぐるの PR すべて | source-text テストと harness の既定値 |
| RH-7(meguru.js の分割) ∥ 何でも | 全めぐるのテストに影響する |
| #278 の merge ∥ RH-1 / RH-2 | `script.js`、`index.html`、`package.json` の衝突。**#278 は RH-2 の後** |
| RH-3 で harness の **既定値を変えること** ∥ 4E-4 | 4E-4 の新しいテストの前提が変わる。**既定値の反転は RH-6(4E の後)** |

### 4.4 merge の順
1. 4E-4A、RH-1、RH-3 は、準備ができた順に merge する(4E を優先する。同時に準備できたら 4E が先)
2. RH-2(RH-1 の後)
3. 4E-4B → 4E-4C(本線のペースで)
4. RH-4 → RH-5 → RH-6 → RH-7
5. C 期の RH-8 / RH-9 / RH-10 は並行してよい。merge は RH-8 → RH-9 → RH-10 の順
6. RH-11: まず PR の整理をし、その後に EXP-Final(#278)を行う
7. Release Gate

### 4.5 branch の運用
```
main ────●──────●──────●──────●────▶
          \4E-4A /      \4E-4B /        ← 4E 本線(1 段 = 1 PR。main から切る)
           \RH-1 ───────/               ← RH は main から独立に切る。4E の branch から切らない
            \RH-3 ────/
```
- **RH の branch は常に最新の main から切る。** 4E の branch に RH を積まない。RH の branch に 4E を積まない。
- **4E の途中で RH を行うときの drift 対策**:
  - ① RH は 1 PR を 1〜2 日で閉じる大きさにする
  - ② merge の直前に `main` を merge しなおし、全テストを回しなおす
  - ③ 4E の PR が merge されたら、開いている RH は main を取りこむ
- **rebase と衝突の方針**:
  - 自分の RH branch は rebase してよい。他人の branch と Draft は **rebase も force-push もしない**。
  - `package.json` の `"test"` の行は、**main の行を正として、自分の追加分だけを末尾に足す**。
  - `index.html` の `?v=` は、**手で解消せず `npm run bump` を実行しなおす**。
  - RH が meguru.js を触ることはないので、meguru.js の衝突は起きない。起きたら RH の範囲を逸脱しているので止める。
- **4E が完了した時点で RH の PR が古くなっていたら**: main を merge して全テストを回す。落ちたら **RH 側を直す**(4E 側を戻さない)。一週間以上止まっている RH は、閉じて切りなおしてもよい。

### 4.6 PR の大きさの目安
- production の変更は **300 行以下**(fixture とテストは除く)。
- production の領域は 1 つだけ(save / goal / harness / UI のうち 1 つ)。
- 新しい localStorage key は **足さない**(field の追加は、`lifetime` の中に 1 つまで)。
- `schemaVersion` は上げない。上げる必要が出たら、止めて相談する。
- テストは足す。既存テストの assert を **弱める変更は禁止**。
- レビューで 30 分以内に読みきれる大きさにする。

### 4.7 rollback の原則(特に save まわり)
- **「新しいコードが書いた save を、古いコードが読める」ことを各 RH の完了条件に含める。**
  - 足す field は `lifetime` の中の未知キーにする(古いコードは残す [V])。
  - 配列は、要素を「減らす・並べる」だけにする。
- revert した後に、古いコードで壊れる形の save を残さない。
- 同じ PR の中で、形の変更と意味の変更を混ぜない。

### 4.8 4E-4 の日程との合わせかた
- **いま(4E-4A を始める時点)**: RH-1 と RH-3 を並行して始める。
- (2026-09-26 追記: 4E と scenery / visual polish は完了したので、下の 3 行は当時の計画として残す。今は RH-1 → RH-2 → RH-3 の順に進め、B 期もその後に着手できる)
- **4E-4A の merge 前後**: RH-2。
- **4E-4B・4E-4C の期間**: RH の新規着手は「C 期の仕様決め」(隠れたタブ・PERFECT・通知の優先度・Android)と、C 期の文書・設計の準備だけにとどめる。
- **4E-4C の merge と、4E の完了 handoff の後**: B 期(RH-4〜7)を開始。C 期の実装も並行して始めてよい(meguru.js 以外)。

---

## 5. A 期(今すぐ): RH-1 / RH-2 / RH-3

### 5.1 RH-1 Save Integrity

**目的**
壊れた save で起動不能にならないようにする。壊れた内容を backup に広げない。直した内容と取り除いた値の記録を残す。

**責務の分け方**(try/catch で握りつぶさない):
| 層 | 責務 | 今 | RH-1 の後 |
|---|---|---|---|
| **load** | 鍵を選ぶ(主キー → backup)、JSON を parse する、version の段階移行 | `loadState` / `migrate` | 変えない(段階の gate も変えない) |
| **normalize**(形) | 型の雛形は `freshState()`。**配列要素の型** まで保証する | `normalizeStateShape` は配列そのものの型しか見ない | 配列要素の検査を足す(`sanitizeArrayField`) |
| **repair**(意味) | 登録表との照合 | なし | **RH-2 で足す**(RH-1 では行わない) |
| **backup** | 「起動して最初の save に成功したもの」の 1 つ前 | load した直後に raw を写す(**汚染の原因**) | load 直後の写しをやめる。`saveState` が書く `lastGoodSaveRaw` だけにする |
| **snapshot** | 20 分おき 3 世代 + 取りこみの前には強制的に取る | 今のまま | repair が起きた load では、元の raw を強制 snapshot に 1 つ残す(調査と、元に戻す用) |

**未知の値・壊れた値の扱い(今回の決定)**:
| 値 | ID の配列(`discoveredStages` など) | 数値の配列(`endingTiersReached` など) | 扱い |
|---|---|---|---|
| `null` / `undefined` | 取り除く | 取り除く | **隔離**(`lifetime.saveRepair` に件数と見本を記録) |
| number(ID の配列の中) | 取り除く | — | **隔離** |
| string(数値の配列の中) | — | 整数に直せるなら直す。直せなければ取り除く | **repair / 隔離** |
| object / array | 取り除く | 取り除く | **隔離**(見本は JSON で 120 文字まで) |
| 空文字 | 取り除く | — | 隔離 |
| 重複 | 最初の 1 つを残す(順序は保つ) | 同じ | **repair**(集合の意味なので、損をする人はいない) |
| 未知の ID(未来・typo) | **残す** | — | **無視**(件数には数えない。RH-2 で扱う) |
| 退役した ID(旧系統・旧恋人) | **残す** | — | **無視**(履歴として残す。件数には数えない) |
| 範囲外の整数(tier 9 など) | — | **残す** | save には残す(未来版の値)。**今の `ENDING_TIERS` に無い tier は、バッジの表示だけ飛ばす**(残すだけだと `render()` で例外になるため。tier 個別ではなく未知の整数一般への防御)。判定での除外は RH-2 |
| 小数・非整数(1.5 など) | — | 取り除く | **隔離** |
| `companions` の要素(`id` が文字列の object 以外) | — | — | **隔離**。条件は既存の filter と同じ。なかまの いこうより前に かける(でないと save 全体が読めなくなる) |

- **削除はしない。** 取り除いたものは `lifetime.saveRepair = { v: 1, lastAt, total, byField: {field: n}, samples: [{field, value}] (最大 10) }` に隔離する。
- `saveRepair` は未知のキーとして、古いコードでも残ります(rollback しても安全)。

**migration version を上げるか**: **上げない。**
- RH-1 は、毎回の load で冪等に走る normalize の中で完結します。
- 保存する内容の意味(ID・数値)を変えません。
- 古いコードで読めます(配列の要素が減るだけ、未知の lifetime キーは残る)。

**対象ファイル**: `script.js` の次の部分だけ(2026-09-26: 上の経路 2 のため、`render()` のバッジの行に存在確認の filter を 1 つ足す)。
- `normalizeStateValues`(1,700 行付近)
- `loadState`(1,721〜2,038)
- `saveState`(2,642〜2,678)
- boot の最後(18,095〜18,110)

**対象外**: meguru.js、item-system.js(独自の normalize が既にある)、UI、実績の判定の意味、ゴールの判定(RH-2)、複数タブ(RH-9)、復旧 UI(RH-9)。

**変更**:
1. 配列 field の要素型の表を 1 つ作る(`freshState()` の雛形から列挙し、ID / 整数 / object を明示する)。
2. `normalizeStateValues` の中で要素を検査し、重複を除き、隔離する。対象は `state` と `infiniteReturn` の両方。
3. load 直後の backup への写し(`:2025`)をやめる。repair が起きたときは次の 2 つを行う:
   - 元の raw を強制 snapshot に残す
   - `lastGoodSaveRaw` を「repair 後に serialize したもの」にする(backup に既知の壊れたデータを入れない)
4. `checkAchievements` の条件を 1 件ずつ守る(**2 番目の防御**)。例外が出たら `reportRuntimeError` で記録し、その実績は未達扱いで続ける。黙って捨てない。修正の本体は 2 のほう。

**テスト**(新規 `tests/save-integrity-test.cjs`、fixture は `tests/fixtures/saves/corrupt/*.json`):
- 要素が `null`・数値・object・空文字・重複 → 起動が通る。field が文字列だけになる。`saveRepair` の件数が合う。
- **主キーが壊れていて backup が正常** → 起動後も backup は正常なまま(backup が汚れないことの証明)。
- 主キーが壊れていて backup も壊れている → 起動が通る(repair)。snapshot に元の raw が 1 つ残る。
- 途中で切れた JSON → 今の挙動(backup → 書きこみ停止)が変わらない。
- 未知・未来・退役の ID は残る。
- 同じ save を 2 回 load すると同じ結果になる(冪等)。
- セーブコードの取りこみ(`replaceSavedLife` → reload)で壊れた要素を入れても、起動が通り、backup は取りこむ前の正常な save のまま。
- **remove-it**: 要素の検査を抜くと上のテストが赤になる。load 直後の写しを戻すと「backup が汚れない」テストが赤になる。
- **rollback**: RH-1 が書いた save を、RH-1 より前の `loadState` で読めること(git の前の revision の script.js を harness で読んで確かめる。repo に古いファイルは置かない)。

**browser check**: Chromium で、壊れたセーブコードを取りこむ → reload → ホームが動く → console に error が出ない(手動 probe。CI の suite は増やさない)。
**CI**: 既存の 2 本の workflow が緑であること。
**完了条件**: 上のテストが全部緑。`npm test` が全部緑。home-layout が緑。production の差分は 200 行以下。`schemaVersion` は変わらない。
**次の phase への条件**: RH-2 の helper が「要素は文字列」を前提にできる。

### 5.2 RH-2 Canonical Progress Counts

> **2026-09-26 追記(RH-2 の事前確認と実装で確かめた事実・決定。基準 main `5a53933`)**
> - **範囲を足した**: 下の表の domain のほかに、同じ「raw な ID 配列の length を いまの版の進捗として数える」問題が `companion-1` / `companion-5`・`married-1` / `married-3`・`perfect-life`(結婚の数)・`weather-all`・`time-all`・`elder-collector`・`sticker-tasks-5`・人生カード・「ぜんぶけす」の まとめ にあった。RH-2 に含めた。
> - 「仲間は既に正規化済み」は `companion-all`(`hasAllCurrentCompanions`)だけ。`companion-1` / `companion-5` は raw の length だった。
> - master の `regionAliases`(`tropical → jungle` など)は、これまで script.js のどこでも使われていなかった。RH-2 の地域の件数で使う(save は書きかえない)。
> - **`legacyUnlocks` は保存しない(決定)**。`lifetime.saveRepair` は RH-1 の「壊れた save を修復した事実」の記録のまま。grandfathering は既存の `achievementsUnlocked`・`dexCleared`・`endingTiersReached`・`ownedNaotoItems` から判断し、調査の情報は QA 文書と fixture に残す。新しい save field は足さない。
> - **「コンプリートの きろく あり」の文言(決定)**: `📖 ずかんコンプリートの きろく あり`。`dexCleared === true` かつ いまの版の正本の件数が いまの登録数に届かないときだけ、図鑑のまとめに そえる。件数は水増ししない。248 は埋めこまず、登録表の大きさを使う。
> - 行番号は RH-1 で約 70 行ずれた。関数名で探す。
> - #302(シールの枚数)の変更は既に main に入っている(`08aea68`)。シールの種類は「登録済みのシールで 1 枚以上」を数える。
> - `shop-1` と「ぜんぶけす」の そうびの数は そのまま(`loadState` が既に SHOP_ITEMS で絞っている。未知 ID の削除は RH-8)。`pastLives` は履歴の件数、`meguru.js` の会話の条件(`regionsVisited` の length)は意味がちがうので対象外。

**目的**: 達成と件数を、必ず「登録済みの ID ∩ 保存された ID」の、重複を除いた数で決める。

**共通の部品(shared primitive、1 つだけ)**:
```js
// ids: 保存された配列 / registered: Set / canon: alias を正規化する関数(省略なら恒等)
function countRegistered(ids, registered, canon = (x) => x) → number   // 重複を除いた、登録済みのものだけの数
```
**domain のルール(部品を使う側で個別に定義する。無理に共通化しない)**:
| domain | 登録表 | 正規化 | 使うところ | helper |
|---|---|---|---|---|
| 図鑑 | `ALL_LINES × 0..7` の `line:i` | (種族の alias は今は使わない) | `dex-*`・`dex-complete`・④・かんむり・人生カード・図鑑・プロフィール・`endingProgress`・`achievedGoalTiers` | `dexFoundCount()` / `isDexComplete()` |
| 恋人 | `ALL_PARTNER_CANDIDATES` | `partnerAliases`(8 か所のコピペを 1 つの `canonicalPartnerId` に) | `partner-1`・`partner-all`・図鑑の合計 | `partnersFoundCount()` |
| 地域 | `REGIONS`(通常 + home) | `regionAliases`(`tropical→jungle`) | `region-3`・`region-all` | `regionsVisitedCount()` |
| ナオトのアイテム | `NAOTO_ITEMS` | なし | `naoto-1` | 部品を直接使う |
| シール | シールのカタログ | 既存の正規化 | `sticker-10` / `sticker-100`(種類の数) | `stickerKindsCount()` |
| 実績 | `ACHIEVEMENTS` | なし | ⑤ は既に `every()` を使っているので **変えない**。表示の件数だけ | 部品を直接使う |

- **使わないところ**: シールの枚数(copies)、ミニゲームの回数、お金、そだち。どれも意味が違います。仲間は既に正規化済みなので、そのままにします。
- **アイテムの `shop-all` / `item-all`** は、既に登録表に対して `every()` で判定しているので変えません(P1-8 は仕様の問題で、C 期)。

**誤って一度解放されたもの(かんむり・ナオト・④・実績)の扱い**:
- **取り消さない**(ユーザーに不利益を与えない)。`dexCleared`・`endingTiersReached`・`ownedNaotoItems`・`achievementsUnlocked` は **そのまま残します**。
- RH-2 が止めるのは「**これから** 誤って解放されること」だけです。
- 表示: 図鑑の件数は正しい数を出します。`dexCleared === true` なのに正しい数が 248 に満たない save では、図鑑に「コンプリートの きろく あり」を表示して、矛盾を説明します(文言は仕様として 1 行で決める)。
- 集計: `lifetime.saveRepair.legacyUnlocks` に「正しい数では達成していない解放」を記録する(将来の調査用。UI には出さない)。 **(2026-09-26: 取りやめ。save に新しい field を足さない)**
- migration: **不要**(判定の関数を変えるだけ。保存形式は変わらない)。

**対象**: `script.js` の実績表(2,073〜2,185)、2,436〜2,600(かんむり・ゴール・`endingProgress`)、`isAuthorUnlocked`(8,433)、人生カード(9,891)、図鑑(12,860〜12,960)、プロフィール(17,095 付近)、恋人の alias の 8 か所。
**対象外**: ゴールの ordinal の変換(RH-5)、master の変更、表示のデザイン、`item-all` の仕様。
**テスト**:
- 旧系統のキー 72 + 今の 176 → ④ にならない、`dex-complete` にならない、かんむりが手に入らない。
- 重複 → 数えない。
- 旧形式の恋人 ID は alias で数える。登録にない ID は数えない。
- 既に `dexCleared === true` の save → そのまま(取り消さない)。
- 本当に 248 そろった → 今までどおり解放される。
- 69 / 70、99 / 100 の境界のテストも添える(`lifeClears` / `bestLives`)。
- **remove-it**: helper を `.length` に戻すと、旧系統のテストが赤になる。

**browser check**: 図鑑・プロフィール・人生カードの件数が、10 種類の viewport で既存の home-layout のとおりに表示されること(既存の suite)。
**完了条件**: `length >= ALL_LINES.length * STAGES_PER_LINE` の類が、**helper の外に 0 件**(grep で確かめる)。全テストが緑。
**次の phase への条件**: RH-5 と RH-8 がこの helper を使える。

### 5.3 RH-3 Deterministic Harness & Asset Gate

**目的**:
- テストから時刻・天気・季節・乱数を注入できる最小の契約を作る(production は変えない)。
- `?v=` と asset の不一致を CI で止める。

**① harness の契約**(既定の挙動は **変えない**。#327(`pinDate` を opt-in にした)/ #328(暦を固定)/ b33947f(mode と seed の固定)の方針をそのまま一般化する):
```js
harness({
  clockNow, pinDate,                       // 既存
  environment: { time, weather, season },   // 新規・任意: script.js の mode を固定値で起動する('auto' を使わない)
  hostEnvironmentClock: true,               // 新規・任意: world-environment.js の既定の Date を harness の now にする
  seed,                                     // 新規・任意: meguru の setRandom と vm の Math.random を同じ seed の PRNG に
})
```
- **漏れを塞ぐ**: `pinDate:true` のときは、`world-environment.js` の `timeOfDay` / `simulatedWeather` に、日付を省略したら harness の時計を使わせる。production の関数は変えず、harness 側で wrap する。`new Date()` を全部固定すると hang する既知の問題(9edc0e7)があるので、**`new Date()` 全体は固定しない**。
- **seed**: 小さい PRNG(mulberry32 程度)。既存の定数 stub は残す(domino の hang 対策の知見を守る)。
- **flaky 2 本**(meguru-discovery ⑥-1 と meguru-test の entering)は、b33947f で個別に直してある。RH-3 は **その書き方を `environment` / `seed` の option に置きかえられる** ことをテストで示すだけにする。**2 本の中身は 4E が終わるまで触らない**(RH-6 で移す)。
- **検出するテスト**(新規 `tests/harness-determinism-test.cjs`): 同じ `clockNow` と `environment` なら、host の時刻を 03:00Z にしても 13:00Z にしても結果が同じ(host の時計を `--require` で動かして確かめる。監査の probe と同じ方法)。

**② asset gate**(`tests/asset-versions-test.cjs` を拡張するか、新規 `tests/asset-integrity-test.cjs`):
| 検出するもの | 方法 |
|---|---|
| 参照先が存在しない | index.html・CSS・JS の静的な `assets/…` 参照を正規表現で集め、`git ls-files` と照合する |
| 大文字小文字の食いちがい | 照合を **完全一致** で行う(Pages は区別する) |
| token が古い | `?v=YYYYMMDD-<sha1 8>` の **hash 部分** をファイルの sha1 と比べる(日付は比べない)。**`tools/bump-versions.js` の hash の計算を関数に切り出して共有する**(tool の出力は変えない) |
| token がない | CSS と JS の全 `<script>` / `<link>` に token がある |
| 動的なパス | 種族は master × 01〜08、アイテムは CATALOG × `assets/items/unified/<id>.png` を列挙して存在を確かめる |
| 画像の古さ | **検出しない**(cache-bust の方針は C 期の RH-11)。ここでは「同じパスの画像の中身が変わった PR」を警告として出すだけでもよい(任意) |

**③ CI**:
- `home-layout.yml` の paths に `assets/**`・`**/*.json`・`**/*.mjs` を足す。
- `runtime-smoke-test.yml` に `timeout-minutes: 30` を足す。

**対象**: `tests/helpers/runtime-harness.cjs`(**足すだけ**)、新しいテスト 2 本、`tests/asset-versions-test.cjs`、`tools/bump-versions.js`(関数に切り出すだけ)、`.github/workflows/*.yml`、`package.json`(test の行)。
**対象外**: production の JS / CSS、既存テストの中身、既定値の反転(RH-6)。
**完了条件**:
- わざと古くした token で赤になる。直せば緑。
- 大文字だけ変えた参照で赤になる。
- 時計ずらしのテストが緑。
- 全テストが緑。
- **既存の 85 本の harness テストの結果が変わらない**(既定値は不変)。
- 1 PR にまとめる場合も、commit は ① / ② / ③ に分ける。レビューで分けたいと言われたら、RH-3a(harness)と RH-3b(asset と CI)に分けてよい。

---

## 6. 誤って解放された既存データの方針(RH-2 の補足)

| もの | 方針 |
|---|---|
| `dexCleared` / `endingTiersReached` の 3 | **残す**。UI で「コンプリートの きろく あり」を見せる |
| かんむり(`ownedNaotoItems`) | **残す**。効果もそのまま |
| ナオト解放 | **残す**(`isAuthorUnlocked` は tier に依存するので、自然にそのまま) |
| 実績 `dex-complete` / `partner-all` / `region-all` | **残す** |
| ⑤ PERFECT | ⑤ は全実績が条件。実績が残るので、⑤ も変わらない |
| 新しく誤って解放されること | RH-2 以降は起きない |
| (2026-09-26 追記)`legacyUnlocks` | **保存しない**。上の「集計: `lifetime.saveRepair.legacyUnlocks`」は取りやめ。既存の永続記録から判断する(§5.2 の追記) |

---

## 7. B 期(4E 完了後): RH-4〜RH-7

> 2026-09-26 追記: 4E は完了済み。B 期は着手可(A 期の RH-1 → RH-2 → RH-3 の後)。

### 7.1 RH-4 Region Registry Integrity
- **目的**: 地域を 13→26 に増やしても、「表の追加漏れ」を CI で必ず検出できるようにする。
- **1 つの巨大な registry にはしない。** 「**地域 ID の正本**」+「**各表の網羅テスト**」にする。
  - 正本は `character-world-master.v1.js` の `regions`(home + 10 + 2)。めぐるの ID(`WORLDS` のキー)とは同一であることを assert する。
  - 網羅の対象:
    - meguru.js: `WORLDS`、`WORLD_STYLE` / `THEME` / `MOTION` / `SPACE`、`REGION_LIFE`、`REGION_LINE`、`SKY_OVERRIDE`(意図して一部だけ持つ表は **許可リストを明示** する)、`GEO_AREA`、`GEO_ASPECT`、`WORLD_GEOGRAPHY.regions`、`REGION_FRAME`、`FOLIAGE`
    - 外部: `CLIMATE`、world-scene の `SCENES`、`REGION_RUNTIME_META`、シールの背景
- **黙って home に置きかわる箇所の扱い**:
  - 例: `|| WORLDS.home`(meguru.js:1013)、`SKY_OVERRIDE[...] ||`、`findRegion → REGIONS[0]`(script.js:8332)などを洗い出して一覧にする。
  - **dev と test では error、production では安全な fallback + `reportRuntimeError` を 1 回**。実現方法は `strictRegionLookup` という小さな関数 1 つ。harness では strict を true にする。
- **接続**:
  - `mouths` / `gate.ends[r].spot` / `land`×2 / `transition` / `CORRIDOR_TERRAIN` の整合を検査する(`countryside|star_stop` のように意図して違うものは許可リストに書く)。
  - `buildWalkCorridorSpec` が `null` を返したら **テストで赤** にする。
- **対象外**: `WORLDS` の統合、表の書式の変更、`REGION_FRAME` の値。
- **完了条件**: どこか 1 つの表から地域を 1 つ消すと、必ず赤になる(remove-it)。

### 7.2 RH-5 Content Registry Coverage
- **キャラ**(248→350 でも登録漏れを検出する):
  - master の種族・仲間・恋人の全 ID × 平行表(`MASTER_SPECIES_EMOJI`、`SPECIES_STAGE_DESCS`、`PARTNER_RUNTIME_PROFILE`、`COMPANION_RUNTIME`、台詞の表 6 か所、`movie-dialogue.partners`、meguru の `HABITAT` など、`cast-bounds`、画像 01〜08)の網羅テストを作る。
  - 欠けているときは、起動時の TypeError ではなく **テストで赤** にする。
- `'ren'` の直書きをやめ、master の `playerSpecies.secret` から読む(`ALL_LINES` の組み立てだけ)。
- `speciesAliases` / `regionAliases` を runtime で使う(RH-2 の `canonical*` に接続する)。
- **ゴールの ID 変換表**: `GOAL_TIER_IDS = ['life','lifeClear','best','dex','perfect']` を 1 つ置く。平行配列 4 つをこの表から参照するようにする。**保存形式(ordinal)は変えない。**
- **表情との統合(#278 が merge された後)**:
  - 表情 registry(`STAGE_ASSETS`)の系統 × 段階が、master の `ALL_LINES × 8` と一致することを CI で検査する。
  - 3 分類は `bodyKind: 'same' | 'group' | 'separate'` の stage 単位の data にする(置き場所は #278 の registry か master。オーナーが決める)。「各 stage に 1 つある」ことを網羅テストで縛る。
  - `unknown` 04 の例外は、data の `note` として明記する。
- **完了条件**: 種族を 1 つ足して表を 1 つ書き忘れると、赤になる。

### 7.3 RH-6 Test Architecture Cleanup
- **harness の既定値を反転する**: `environment` の既定値を固定側にし、`'auto'` は opt-in にする。めぐるの 28 ファイルと flaky 2 本の書き方を新しい option に移す。
- **source-text テスト 24 本の分類**:
| 分類 | 対象(代表) | 方針 |
|---|---|---|
| **behavior に置きかえる** | `lucky-coin-test:55`(退役した機能が無いこと → API と DOM の id が無いこと)、`consumables-v2-eggs:152`、`input-polish-test:42`(出現回数 → スワイプの挙動)、`items-v2-care-automation`、`meguru-sea-route`、`meguru-transition-polish:109`(インデントで切り出し) | runtime の probe にする |
| **AST か marker にする** | 層の分離のテスト(4C の 404-407、4E-2 の 551-568: `travelToRegion` に corridor を持ちこまない、sim に DOM が無い)、`smoke-test.js` の `make*` 検査 | acorn などでコメントを除き、関数単位で調べる。**668a0cf のような「テストに合わせて production の名前を変える」ことを二度と起こさない** |
| **残す**(ただしコメントを除く処理を共通化) | `asset-versions`、`viewport-design`、`ui-illustrations` / `comment-illustrations` / `illustration-catalog`(CSS やカタログの静的な宣言) | `stripComments()` を 1 つの helper にする |
| **export の並びの正規表現** | 4B / 4C / 4D-1 / 4D-2 / 4E-1 の remove-it | `return {` の名前を parse して除く。`stripPhases(src, [...])` を共通化する |
- **分母**: 471 / 654 / 118 / 107 / 17 / 103 を `tests/helpers/meguru-denominators.cjs` にまとめる(値は直書きのままでよい。置き場所を 1 つにするだけ)+ `WORLDS` から計算しなおして一致を見るテストを 1 本。
- **remove-it の「卒業」規則**: 層が意図して使われはじめたら、その remove-it を behavior テストに置きかえて閉じる。「使う側もまとめて抜く」ことはしない。
- **phase ごとのファイルを topic ごとにまとめる**(`meguru-corridor-test` など)。**4E が完了した後に 1 回だけ** 行う。
- `movie-browser.cjs` を CI に入れるか、削除するかを決める。

### 7.4 RH-7 Meguru Post-4E Fixes
> 2026-09-26 追記: めぐる側から引き継いだ post-4E backlog は次の 4 件(ほかは final visual completion pass で処理済み)。
> 1. forest / mountain の到着時の描画コスト
> 2. city 系の定常時の描画コスト
> 3. corridor 内のまれな 60 ms 超の frame
> 4. なかまが障害物に重なる既存バグ(下の 1 行目。continuous corridor 固有ではなく、既存 transition でも再現する)

- **なかまが障害物にめりこむ**(4E-4 preflight §12): 着いたときの並びを `standClear` で押し出す。**今の transition でも起きるので、独立した小さな bugfix PR にする。** 18 方向 × 27 人で、1.5 秒後にめりこむ人数が 0 になることを受け入れ条件にする。
- **meguru.js の分割は「分割すべきだから」ではやらない。** 境界がはっきりした所だけにする。
  - 候補 1: `start()` の found toast の queue と、save の adapter。
  - 候補 2: `drawStructure` の 97 case を表にする。
  - RH-6 で source-text テストを整理した **後か、同じ PR** で行う。
  - `draw(view)`・`drawWorldMap`・`REGION_FRAME` は分けない。
- `buildWorld` の hash seed を数値にする・`nearestPath` を格子にする: 4E-4 が終わった後の実測で予算(到着の暗転 ≤ 300 ms)を超えているときだけ行う。
- `foreignMap` を同期で build している問題: 世界地図の UX を改修するときにまとめる。

---

## 8. C 期(リリース直前): RH-8〜RH-11

### 8.1 隠れたタブの仕様(RH-9。**仕様は今すぐ決める**)

> **2026-09-26 注記: この節の推奨(A′、最大 30 分)は古い。RH-9 着手時に書き直す。** その後の第一候補は次のとおり(まだ実装しない)。
> hidden 中は通常 tick を止め、hidden 開始時刻を記録する。離席時間そのものは打ち切らずに把握し、復帰時に offline 処理を 1 回だけ行う(離席時間ぶんの高速再生はしない)。年齢は hidden 中に進めず、長期離席だけで 100 さいゴールに届かない。status ごとに安全な反映の上限を持ち、長期離席だけで病気・死亡を理不尽に進めない。恋愛・なかま・discovery などは勝手に進めない。環境・昼夜は復帰時点の現在時刻に同期する。実際の離席時間(「7日3時間ぶり」など)は要約の演出に使ってよい。
> つまり「離席時間は無制限に記録」+「ゲームへの反映は domain ごとに安全な cap」。下の表と「30 分の上限」のテスト項目はこの方針で置きかえる。
| 案 | 挙動 | 公平性 | 電池 | iOS との一貫性 | 既存の設計との整合 |
|---|---|---|---|---|---|
| **A. 完全に止める** | 隠れたら tick しない。見えたら続きから | ◎ | ◎ | ◎(iOS は元々バックグラウンドで止まる) | ◎(「開いているあいだだけ進む」) |
| **A′. 止める + 控えめに反映(推奨)** | 隠れたら止める。見えたときに、隠れていた時間を **今ある `applyOfflineProgress`**(最大 30 分・20 を下回らない・歳はとらない)で反映する | ◎(閉じたときと同じ扱い) | ◎ | ◎ | ◎(同じ関数を使う) |
| B. 経過をまとめて反映する | 隠れていた時間ぶん歳をとり、メーターも下がる | ✕(desktop だけ死にやすい) | ◎ | ✕ | ✕ |
| C. 今のまま | 隠れても tick する(Chrome の throttle で約 1/20 の速さ) | ✕(端末とブラウザしだい) | ✕ | ✕ | ✕(コメントの意図と矛盾) |

**推奨: A′。**
- 閉じたときの「やさしい留守中処理」と同じ体験になり、端末による差がなくなります。
- 実装は `loop()` の先頭に `hidden` の判定を 1 行足し、`visibilitychange` で `bootSavedAt` にあたる基準の時刻を更新して、同じ処理を呼ぶだけです。
- **テスト**: 隠れていても tick しない。見えたら控えめに反映される。30 分の上限。`savedAt` の扱い。

### 8.2 複数タブ(RH-9)
| 案 | 長所 | 短所 |
|---|---|---|
| tab lock(Web Locks) | 確実 | Safari 15.4 以上。lock が残ったときの復帰が難しい |
| **save revision + `storage` event(推奨)** | 追加の API が要らない。古いタブを確実に止められる | 通知は即時ではない(次の save のとき) |
| last-write の警告だけ | 最小 | 上書き自体は止められない |
| BroadcastChannel | 即時 | Safari 15.4 以上。save の整合は結局 revision が要る |

**推奨する設計**:
- `lifetime.saveRevision`(整数)を足す。load したときの値を覚えておく。
- save の直前に localStorage 上の revision を読み、**自分が知っている値より大きければ書かない**。そのタブを「読みとり専用」にし、「べつの タブで ひらかれています。こちらを とじるか、よみこみなおしてください」を出す。
- 他のタブの save は `storage` event で検知し、すぐに同じ案内を出す。
- 未知のキーなので、古いコードでも残ります(rollback しても安全)。

### 8.3 起動の救済 UI(RH-9)
- index.html の先頭に、inline の boot guard を置く(外部ファイルに依存しない。script.js が cache で壊れていても動く)。
  - `window.__naotocchiBooted = true` を script.js の boot の最後で立てる。
  - 立たないまま 6 秒たつか、boot 中に `error` が出たら、救済 panel を出す。
- **ボタンの並び**(危ない操作を最初に出さない):
  1. **もういちど よみこむ**(一番大きく出す)
  2. **セーブコードを うつす**(localStorage の主キーと backup を `NTS1.` 形式でコピーする。inline で約 15 行)
  3. **じどうバックアップから もどす**(snapshot の日時の一覧 → 確認 → `naotocchi-save-v1` に書く → reload)
  4. (「こまったときは」を開いた中に)**はじめから**:
     - 3 秒長押しで確定する(既存の wipe と同じ UI)
     - 実行の前に、今の save を必ず snapshot に退避する
- script.js が読めないとき、`NTS1.` の符号化は inline 側で行う(`encodeSaveCode` と同じ手順)。
- **テスト**: boot で例外を出す fixture を使って、browser で panel が出ること・3 つのボタンが動くことを確かめる(Chromium と WebKit)。

### 8.4 Android の戻る(RH-10)
- **戦略**: 「home 以外の層」にいるあいだだけ、`history` に **1 つだけ** entry を持つ。
  - 層に入ったら `pushState({nt:'layer'})`。層の中で別の層に移るときは `replaceState`(履歴を増やさない)。
- `popstate` の処理:
  | いる層 | 戻るを押したとき |
  |---|---|
  | パネル | 閉じる |
  | めぐるの地図 | 地図だけ閉じる |
  | めぐる | めぐるを出る(Escape と同じ `stopMeguru`) |
  | ミニゲーム | やめるかの確認を出す(**すぐには終わらせない**) |
  | movie・クリア画面 | 閉じられる場面だけ閉じる。閉じられない場面では、もう一度 push して留まる |
  | home | 何もしない(戻るでページから離れるのは自然な挙動) |
- Escape の処理と **同じ関数** を使う(`closeTopLayer()`)。
- iOS のスワイプで戻る操作も同じ道を通る。
- **テスト**: browser で `page.goBack()` を 5 つの層について試す。home で戻るとページを離れることも確かめる。

### 8.5 通知の優先度(RH-10)
**queue にするか**: **する。ただし小さく。** めぐるの `queueFound` を手本にします。

| 優先度 | 例 | 規則 |
|---|---|---|
| 0 critical | 保存に失敗・読み込みから復旧した・複数タブ | 他の通知に上書きされない。ユーザーが閉じるか、8 秒たつまで残す |
| 1 care | 病気・弱っている・死にそう | 優先度 2・3 に上書きされない。最低 4.2 秒は表示する |
| 2 event | 発見・実績・解放・誕生日 | 順番に表示する(最大 3 件まで溜める) |
| 3 ambient | 雑談・ふつうの話しかけ | 上の優先度が表示中なら **捨てる**(溜めない) |

- 対象は `setMessage` の 103 か所で、呼び出し側に優先度を付けます(既定は 3。critical と care だけ明示する)。`storyFlash` も同じ queue に入れる。
- 雑談の間隔(4〜9 秒)は、**孵ってから最初の 10 分は倍にする** 案を、仕様として検討する(first 10 minutes の負担を減らすため)。

### 8.6 アクセシビリティ(RH-10、リリース直前のチェックリスト)
| 項目 | 確認・修正 |
|---|---|
| focus | パネルに `role=dialog` と `aria-modal` を付け、focus trap を作る。背景は `inert` にする。閉じたら元の場所に focus を戻す(今もある) |
| keyboard | Tab で全操作に届く。Escape は `closeTopLayer` を使う |
| screen reader | `storyFlash` / `birthdayToast` / クリア画面 / 人生カードに `role=status` か `dialog` を付ける。`#message` は今のまま |
| contrast | 空と雪の背景 × 既定の透過 72% で、主要なボタンの文字を実測する(4.5:1) |
| touch target | 44 px 未満の一覧(ending-badge 24、sticker のタブ 32、daily-start 34、めぐるの pad 30〜34 など)を 44 px にするか、当たり判定を広げる |
| reduced motion | games.js と quick.js で、confetti・画面の揺れ・背景の動きを `prefers-reduced-motion` で止める |
| color-only | 今は ◎(数値と文字を併記)。新しい UI も同じ規則にする |
| 時間制限 | 再挑戦のボタンを 3.6 秒で消さない(toast から結果画面に移す) |
| iOS | `#petArea` に `touch-action: manipulation` を付ける。長押しの callout を止める(`-webkit-touch-callout: none` を canvas と絵に) |
| 320 px | toast の `nowrap` による溢れを直す |

### 8.7 RH-8 Save Compatibility Suite
- **本物の古い save の fixture**(`tests/fixtures/saves/real/`):
  | fixture | 作り方 |
  |---|---|
  | schemaVersion 3 より前(旧 age / 旧 stage) | git の古い commit の script.js を harness で動かし、数分遊んだ state を JSON に書き出す(repo に古いコードは置かない。生成手順を README に書く) |
  | v3 / v4 | 同上 |
  | items-v2 より前(退役したアイテム・購入式の「なおとの〜」) | 同上 |
  | シールのポイント・4 ページ制の時代 | #304 より前の commit |
  | 旧系統(bird / rabbit など)と旧恋人 ID を含む save | master 導入より前の commit |
  | めぐるの初期(links・zones の旧形式) | Phase 2 の頃の commit |
  | **オーナーの実機の save**(セーブコード) | 位置情報(`currentLocation`)を消してから fixture にする |
- 検査:
  - load → save → load が冪等である。
  - お金・図鑑・恋人・シール・めぐるの進行が **減らない**。
  - 例外が出ない。
  - RH-2 の helper の件数が期待どおり。
  - 旧 → 新 → **旧のコードで読みなおしても落ちない**(rollback)。
- **壊れた save の fixture**(RH-1 の最小セットを広げる):
  - 型違い(boolean の位置に `"false"`、数値の位置に `"123"`)
  - 重複 ID、未知 ID、未来 ID
  - 途中で切れた JSON
  - キーの欠け
  - `partner` が文字列、`transformOptions` が文字列、未知の `stage`
  - 巨大な数値、`__proto__` キー
  - seed 付きの fuzz を 200 回(約 60 行)
- **未来の save への耐性**:
  - `savedByBuild`(`YYYYMMDD-sha8`)を save に足す。
  - 自分より新しい save を読んだときは、**知らない item ID と shop ID を削除しない**(item-system の `known()` の filter を「表示と効果では無視、保存では残す」に変える)。
- **write path**:
  - 変更が無い tick では save しない(dirty flag)。
  - snapshot の一覧を毎回 parse しない(メモリに cache する)。
  - めぐるの記録を frame の外で確定させる(`queueMicrotask` でまとめる。**bridge の署名は変えない**)。
- `itemMemories` に上限を付け、save の大きさの上限を検査する(2 MB など)。

### 8.8 RH-9 Session Safety & Recovery
§8.1 A′、§8.2、§8.3、`gamePassReadyAt` と `temporaryForm.expiresAt` の clamp、HeartRails の座標の丸め(まだ行っていなければ)。

### 8.9 RH-10 Navigation, Notifications & A11y
§8.4、§8.5、§8.6、P1-8 の仕様の反映、`grandGoalPending` の保存(お祝いを再表示できるようにする)、bi の恋人の対象を決定的にする。

### 8.10 RH-11 Release Hygiene & EXP-Final

**PR の整理(release housekeeping)**:
| PR | 扱い |
|---|---|
| #302 | close。コメント「#304 として merge 済み」 |
| #92 | close。コメント「main で `activeOverlay`・tier0 の掃除・pose ゲームの廃止として置きかえ済み」 |
| #298 / #300 | close。コメント「canon v1(`docs/qa/meguru-world-geography-canon-v1-2026-09-20.md`)が正本。この PR は設計の履歴として残る」。docs として残したい場合は `docs/history/` に置き、冒頭に「履歴。正本ではない」を入れて merge |
| #275 | #278 を merge するときに close(「#278 に含まれている」)。#278 を今回の release に含めない場合も、#275 を単独で merge しない |
| #259 | **本体の release には不要。Draft のまま残す。** docs だけ merge する場合は、先に main の `docs/card-game-design.md` と `docs/card-game-design-current.md` に「superseded」の注記を入れる。そだち・`E-naoto` を 09-22 の世界 canon と照合する。23 MB の data を Pages に公開するかを決める |
| #278 | 下の EXP-Final |

**EXP-Final(#278 を release に含める場合)**:
1. オーナーが決めること:
   - F03(antlion08 の線の意図)
   - F05(食べものが決まっていない系統の空腹マーク。候補は、植物・無生物は「しずく / ひかり」、虫は「葉」)
   - **画像の cache 方針**(推奨: 差しかえる PNG はファイル名を変える。例: cat の `-v3` と同じ運用)
2. F01 / F02 / F04 の PNG を作りなおす(**新しいファイル名** で)。F06 は `isSick` と resolver の状態を 1 つの判定に揃える(汗は「sick が persistent の顔を決めたときだけ」)。
3. main を取りこむ(衝突 5 hunk、`npm run bump`)。main 側の新しい経路(`c_life_charm` など)で `clearPetExpression()` を呼ぶ。
4. RH-5 の表情 coverage テスト(系統 × 段階 × 10 表情、`bodyKind`)を足す。
5. repo の大きさを決める(+33 MB の PNG と +10 MB の QA 文書を Pages に出すか。QA の JSON は `docs/qa` に残すか、要約だけにするか)。
6. 受け入れ: 全テストが緑、home-layout が緑、iPhone 3 サイズで表情と汗とマークが重ならない、346 組の重なりが 0。

**asset と cache のリリース確認**:
- RH-3 の gate が緑であること。
- 画像を同じパスで上書きした差分が無いこと(`git diff --name-status <前の release>..HEAD -- 'assets/**'` に M が無い。あれば改名するか、token を付ける)。

**文書**:
- README(シールの節)、MASTER_SPEC(168 / 16 / 14)、TEXT_STYLE(koala / kinoko)の矛盾を解消する。
- README に最低動作環境(iOS Safari 16 以上 / Chrome 105 以上)を明記する。
- 装備の反応文を今の概念に合わせる。

---

## 9. Release Gate(リリースできる条件)

| # | 条件 |
|---|---|
| G1 | P0 が 0 |
| G2 | release blocker の P1(P1-1、P1-2、P1-3、P1-4、P1-5、P1-6、P1-9、Android の戻る、P1-8 は仕様次第)がすべて閉じている |
| G3 | `npm test` が全部緑(3 回連続。1 回は host の時計を 03:00Z / 13:00Z にずらして) |
| G4 | Runtime smoke が緑、Home layout(Chromium と WebKit)が緑 |
| G5 | save fixture: 本物の古い save(§8.7)が全部冪等で、減らない。rollback の読みなおしも通る。fuzz 200 回で例外 0 |
| G6 | browser: 救済 panel、戻る、複数タブの案内、通知の優先度の suite が緑 |
| G7 | iPhone 3 サイズ(390×844 / 375×667 / 360×640)+ 320×568 + 横向き 1 つで、はみ出し 0・JS エラー 0。実機 1 台(iOS Safari)で、たまご → 孵化 → めぐる 1 往復 → ミニゲーム 1 回 → reload |
| G8 | asset gate が緑、同じパスの画像の上書きが 0 |
| G9 | open な Draft が「release に含める・含めない」のどちらかに分類され、close の候補は close されている |
| G10 | Phase 4E: 4E-4C まで完了している。または「許可リストを今の本数で固定して release する」ことを handoff に明記している |
| G11 | a11y のチェックリスト(§8.6)で、focus・reduced motion・touch target が完了している |

---

## 10. quick wins(1 時間未満〜半日)

| 項目 | かかる時間 | 入れる RH | 4E との競合 |
|---|---|---|---|
| `?v=` の hash 照合テスト | 1 時間 | RH-3 | なし |
| CI の paths と smoke の timeout | 15 分 | RH-3 | なし |
| 要素の検査と重複除去(normalize) | 半日 | RH-1 | 低 |
| load 直後の backup への写しをやめる | 1 時間 | RH-1 | 低 |
| 図鑑の件数 helper(`isDexComplete`) | 半日 | RH-2 | 低 |
| HeartRails の座標を丸める | 15 分 | いつでも | なし |
| `#petArea` の `touch-action` | 15 分 | RH-10(前倒ししてもよい) | なし |
| superseded な PR を close する | 15 分(オーナー) | RH-11(前倒ししてもよい) | なし |
| 古い文書の冒頭に superseded の注記 | 1 時間 | RH-11 | なし |
| 装備の反応文を直す | 1 時間 | RH-11 | なし |

---

## 11. Phase 4E のあいだは触らないもの(再掲)

> 2026-09-26 追記: 4E は完了したので「4E のあいだ」という期限は解除。ただし下の規則のうち設計上の約束(corridor の状態を save しない、`continuousWalkMode` が唯一の分岐点、`meguruBridge` の署名など)は、RH-4〜RH-7 で触るときも守る。

- `REGION_FRAME` と local ↔ global の変換(meguru.js:4887-5019)
- `continuousWalkMode` という唯一の分岐点・許可リスト(4E-4 が 1 本ずつ広げる)
- **corridor の状態を save しない** という規則(`state.regionId` は、着いた frame で 1 回だけ変わる)
- `buildWorld` の構造(4E-3 で分割された `buildWorldSteps`、4E-4A の絵のデコード)
- party の formation / LOD / bake
- **meguru.js の大きな分割・整形**(source-text テスト 11 本と remove-it テスト 5 本の export の並び)
- `meguruBridge` の署名(`prepareIllustrations` が Promise を返すのは 4E-3 の契約)
- めぐるのテスト(4E-4 の preflight §21.2 の対象)と、flaky 2 本の中身
- `resolveGate` の優先順位、`worldMapData` の漏れを防ぐ規則

---

## 12. D 期(リリース後)

- トップ階層の state machine(`mode` の表)と、Home の動詞の data 化
- Three.js の PoC(条件: props が倍になる、本物の 3D カメラが要る、GPU で streaming する必要が出る。監査 §19)
- 本格的な多言語化(文言を正規表現で照合している箇所の解消から)
- card-game の実装(#259 の設計を正本にする。identity だけ master と共有し、ルールは分ける)
- 高度な複数タブ対応(Web Locks、読みとり専用の閲覧)
- 地域の拡張(13→26。**RH-4 が前提**)、キャラの拡張(**RH-5 が前提**)
- 世界の連続化の続き(global collision、住民の地域間移動)
- アイテム効果の hook 名の data 化(60 個規模になるとき)、シール抽選の O(n²) の解消(1,000 件規模になるとき)
- CSP、フォントの subset、debug 用 global の整理、dead code の削除、偏ったシャッフルの修正、絵文字キーの衝突の解消
- 経済の終盤の使い道(装備を買いきった後)

---

## 13. 将来 Claude へ渡す指示書

### 13.1 RH-1 用の全文(このまま渡せる)

````text
あなたは「なおとっち」(Naoto214/naotocchi)の Release Hardening RH-1「Save Integrity」を実装します。

# 0. 最初に必ず確認
- `git fetch origin main` をして、main HEAD を記録する。
- open PR / Draft PR を一覧にする。Phase 4E(めぐる)の最新の段(4E-4A / B / C)が今どこにあって、何を触っているかを確かめる。
- 次の 2 つを読む:
  - `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md`(RH-1 は §5.1)
  - `docs/audit/naotocchi-full-architecture-audit-2026-09-24.md`(P1-1)
  - どちらも branch `claude/naotocchi-architecture-audit-evmymg` にある。main に無ければ `git show origin/claude/naotocchi-architecture-audit-evmymg:<path>` で読む。
- 行番号は main の `c7705d8` のもの。ずれていたら関数名で探す。

# 1. branch と PR
- 最新の main から新しい branch を切る(指定の branch があればそれを使う。無ければ `rh/rh-1-save-integrity`)。
- 既存の Draft PR(#278 / #275 / #259 ほか)と 4E の branch には触らない。rebase も push もしない。
- 完成したら **Draft PR** を作る。main へは merge しない。

# 2. 目的
save の配列要素の型が壊れていても、起動不能にならないようにする。壊れた内容を backup に広げない。取り除いた値は削除せず、隔離して記録する。

今のバグ(監査 P1-1。確認済み):
- `normalizeStateValues`(script.js:1700 付近)が、配列の **要素** の型を検査していない。
- `discoveredStages` に `null` や数値が 1 つあるだけで、boot の `saveState → checkAchievements` の `rare-line-1`(`.split`)が例外になり、script 全体が止まる。
- `loadState`(:2023-2025)が、migrate に成功した直後に raw をそのまま backup へ写している。そのため主キーと backup の両方が壊れる。
- セーブコードの取りこみ(`decodeSaveCode` → `replaceSavedLife` → reload)からも入りうる。

# 3. 変更してよい範囲(script.js のこの部分だけ)
- `normalizeStateValues` とその近辺(配列要素の検査・重複の除去・隔離)
- `loadState` / `migrate` の、backup への写しと repair 後の `lastGoodSaveRaw` の扱い
- `saveState`(2,642〜2,678 付近)
- `checkAchievements`(2,213 付近)の条件を 1 件ずつ守る(2 番目の防御)
- boot の最後(18,095〜18,110 付近)。必要な場合だけ
- 新しいテスト `tests/save-integrity-test.cjs`、fixture `tests/fixtures/saves/corrupt/*.json`
- `package.json` の test の行(末尾に 1 本足す)、`npm run bump` による `index.html` の `?v=`

# 4. 非対象(触らない)
- meguru.js、`meguruBridge`(script.js 13,860〜14,020)、item-system.js、games.js、quick.js、CSS、UI の文言
- 図鑑・ゴール・かんむりの判定(RH-2)、複数タブ(RH-9)、救済 UI(RH-9)、隠れたタブ(RH-9)
- `schemaVersion` と `romanceCompatibilityVersion` の値、段階移行の gate(`parsed.schemaVersion` を見ている箇所)
- 既存テストの assert を弱めること

# 5. 設計(ロードマップ §5.1 のとおり)
1. `freshState()` を雛形に、配列 field の要素型の表を 1 つ作る。state・lifetime・infiniteReturn の配列を列挙し、「ID 文字列 / 整数 / object」のどれかを明示する。
   - 例: `discoveredStages`・`achievementsUnlocked`・`partnersRecorded`・`regionsVisited`・`specialRegionsVisited`・`ownedNaotoItems`・`legendsMet` = 文字列
   - `endingTiersReached`・`marriageMilestonesSeen` = 整数
   - 列挙のもれが無いことをテストで確かめる。
2. 要素の扱い:
   - ID の配列: 文字列だけを残す(空文字は除く)。重複は最初の 1 つだけ残す(順序は保つ)。
   - 整数の配列: 整数に直せるものは直し、それ以外は除く。重複は除く。
   - **未知・未来・退役の ID は残す**(削除しない。件数の扱いは RH-2)。
   - 除いたものは `lifetime.saveRepair = { v:1, lastAt, total, byField:{}, samples:[{field, value}] }` に隔離する。samples は最大 10、value は JSON で 120 文字まで。
   - object の配列(`companions`・`lifeLog`・`pastLives`)は、今ある filter を保つ。
3. backup:
   - load 直後の `localStorage.setItem(SAVE_BACKUP_KEY, raw)` をやめる。
   - backup は `saveState` が書く「前回の正常な save(`lastGoodSaveRaw`)」だけにする。
   - load で repair が 1 件でも起きたら、次の 2 つを行う:
     - 元の raw を `takeSaveSnapshot(raw, true)` で残す
     - `lastGoodSaveRaw` を repair 後の state を serialize したものにする
4. `checkAchievements`: 条件が例外を投げたら `reportRuntimeError(err, 'achievement:<id>')` で記録し、その実績は未達のまま続ける。黙って捨てない。**修正の本体は 1〜3 のほう。**
5. `schemaVersion` は上げない(冪等な normalize で完結し、保存形式の意味を変えないため)。上げる必要がありそうに見えたら **止めて報告する**。

# 6. テスト(必須)
`tests/save-integrity-test.cjs`(runtime-harness を使う。host の時計に依存しないよう、`clockNow` と必要なら `pinDate` を指定する)で、次を確かめる:
- `discoveredStages` に null・数値・object・空文字・重複が入っている → 起動が通る。文字列だけになる。`saveRepair` の件数が合う。
- `achievementsUnlocked` / `partnersRecorded` / `regionsVisited` / `endingTiersReached` / `infiniteReturn.discoveredStages` の同じ種類の壊れ方。
- **主キーが壊れていて backup が正常** → 起動後も backup の中身が正常なまま。
- 主キーも backup も壊れている → repair で起動が通る。snapshot に元の raw が 1 つ残る。
- 途中で切れた JSON → 今の挙動(backup → 書きこみ停止)が変わらない。既存の `save-recovery-test` も緑のまま。
- 未知・未来・退役の ID(例: `bird:0`、`partner:future_x`)は残る。
- 冪等: repair した save をもう一度 load しても、何も変わらず `saveRepair.total` も増えない。
- セーブコードの取りこみ → reload の経路で、壊れた要素を入れても起動が通り、backup は取りこむ前の正常な save のまま。
- remove-it(テストの中で確かめる。repo には残さない):
  - 要素の検査を無効にしたコピーでは、起動のテストが失敗する
  - load 直後の写しを戻したコピーでは、backup のテストが失敗する
  - 監査の meguru remove-it と同じく、temp dir にコピーして subprocess で実行する
- rollback: この PR の save を、変更前の script.js(`git show <base>:script.js` を temp に書く)で harness 起動して、例外が出ないこと。
- fixture は手で作った最小の JSON でよい(本物の古い save は RH-8)。

# 7. 確認
- `npm test` が全部緑。
- Chromium で手動 probe(repo には入れない):
  1. 壊れたセーブコードを取りこむ → reload → ホームが動く
  2. console に error が 0
  3. localStorage の backup が取りこむ前のものであること
- CI(Runtime smoke と Home layout)が緑。

# 8. 大きさと rollback
- production の差分は 200 行以下を目安にする。超えそうなら止めて、分割の案を報告する。
- 新しい localStorage key は作らない。field は `lifetime.saveRepair` の 1 つだけ。
- revert した後の古いコードで読めることは、上の rollback テストで示す。

# 9. 停止条件(ここで止めて報告する)
- meguru.js か `meguruBridge` を変える必要が出た
- `schemaVersion` を上げる必要が出た
- 既存テストの assert を弱めないと緑にならない
- 4E の PR と、同じ関数で衝突した
- production の差分が 300 行を超える

# 10. PR 本文に書くこと
- 変更点(normalize / backup / 隔離 / 実績の 2 番目の防御)
- 移行が要らない理由と rollback の安全性
- テストの一覧と、remove-it の結果
- 触っていないもの(非対象の一覧)
- 4E との衝突の見込み(package.json の test の行・index.html の token だけ)

実装を終えて Draft PR を作ったら止まる。merge しない。自動の check-in は設定しない。
````

### 13.2 RH-2 の要約(個別に全文化できる)
- 前提: RH-1 が merge 済み(要素は文字列)。
- `countRegistered(ids, registeredSet, canon)` を 1 つだけ作る。domain の helper(`dexFoundCount` / `isDexComplete` / `partnersFoundCount` / `regionsVisitedCount` / `stickerKindsCount`)はそれぞれ定義する。
- 置きかえる箇所: 実績の `dex-*` / `dex-complete` / `partner-*` / `region-*` / `naoto-1` / `sticker-*`、`achievedGoalTiers` / `endingProgress` / `crownAchievementWeight` / 人生カード / 図鑑 / プロフィール、恋人の alias の 8 か所。
- 既に解放されたものは取り消さない(§6)。`saveRepair.legacyUnlocks` を記録する。図鑑に「コンプリートの きろく あり」を表示する。
- テスト: 旧系統 72 + 176 で ④ にならない、重複、alias、既存の解放が残る、69 / 70・99 / 100 の境界、remove-it。
- 完了条件: `.length >= ALL_LINES.length * STAGES_PER_LINE` の類が helper の外に 0 件。

### 13.3 RH-3 の要約
- harness に `environment` / `hostEnvironmentClock` / `seed` の option を **足すだけ**(既定値は変えない)。`pinDate` のときは world-environment の時計の漏れを塞ぐ。
- asset gate: 参照の存在、大文字小文字の完全一致、token の hash、token があること、動的なパスの列挙。bump の hash の計算を関数に切り出して共有する。
- CI: paths に `assets/**`・`**/*.json`・`**/*.mjs` を足し、smoke に timeout を付ける。
- テスト: 時計ずらしで結果が同じ、token が古いと赤、大文字だけ違うと赤。**既存の harness テストの結果が変わらない。**

### 13.4 B 期・C 期の要約
- RH-4(§7.1)、RH-5(§7.2)、RH-6(§7.3)、RH-7(§7.4)、RH-8(§8.7)、RH-9(§8.1 / §8.2 / §8.3)、RH-10(§8.4 / §8.5 / §8.6)、RH-11(§8.10)。
- どれも、この文書の該当節を「目的・対象・非対象・テスト・完了条件」として渡せば、13.1 と同じ形の全文にできます。
- **B 期の指示書には必ず「4E-4C の merge と 4E の完了 handoff の後であること」を最初の確認に入れる。**(2026-09-26 追記: この条件は満たされた。#342 / #343)

---

*この文書は read-only の計画です。コード・既存の文書・PR には手を入れていません。*
