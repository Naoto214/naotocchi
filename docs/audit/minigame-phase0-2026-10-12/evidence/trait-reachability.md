# traitCounts（せいかく傾向）到達可能性の独立監査

- 基準: `249a954f`（作業ツリー HEAD `28624886` は 249a954f をマージ済み。`git diff 249a954f HEAD --stat -- script.js games.js index.html quick.js` は差分なしで、コードは同一。差分は docs/audit のみ）
- 行番号はすべて `script.js`（249a954f 時点）。ほかのファイルはファイル名を付けて示す
- ローカルの clone は shallow（`git rev-parse --is-shallow-repository` = true、569 commits）。このため `git log -S` が境界コミットを誤って返す。履歴調査は scratchpad に blob:none の bare clone を作って行った（`p0/full.git`、main 1722 commits）。ローカルリポジトリには触れていない
- 検証スクリプト: `p0/verify-traits.cjs`、`p0/verify-guest.cjs`。出力は `p0/verify-traits.out.txt`、`p0/verify-guest.out.txt`。どちらも `tests/helpers/runtime-harness.cjs` を使う。cwd を /home/user/naotocchi にして実行する

---

## 1. 書き込み箇所の全量

対象は `*.js *.mjs *.cjs index.html`（node_modules と vendor を除く）。検索語は `traitCounts|duelTraits|dominantTrait|affinityTrait` に加え、間接書き込みのパターンとして `(gentle|wild|calm|brave|romantic)\s*(++|+=|=)`、`[k|key|t|trait] (++|+=)`、`traits[`、`addTrait/bumpTrait/...` を使った。

### 1.1 本番コードで `state.traitCounts` を書き換える箇所（全件）

| 箇所 | 種類 | 中身 | 値を増やすか |
|---|---|---|---|
| 1474 `freshState()` | 初期化 | `{ gentle:0, wild:0, calm:0, brave:0, romantic:0 }` | いいえ（0） |
| 1852 `loadState` の `{ ...freshState(), ...parsed }` | セーブ読込 | 保存されていた traitCounts を浅いマージでそのまま採用 | いいえ（保存値の引き継ぎだけ） |
| 1872 → 1713-1731 `normalizeStateShape` | 移行（型の補正） | 有限数でない値は fresh の 0 に置き換える。有限数はそのまま残す | いいえ（検証 C1: `calm:'x'` は 0 になり、12/21 は保持された） |
| 2089 `normalizeStateShape(merged.infiniteReturn, ...)` | 移行（♾️ 退避分） | 同上 | いいえ |
| 10279-10297 `enterInfinite` / 10302-10330 `exitInfinite` | ♾️ の出入り | snapshot の複製を戻すか、freshState() を使う | いいえ |
| 14395-14397 `rerollIdentityAndBreakupIfNeeded` | 変身時 | 各値を `Math.floor(v/2)` にする | いいえ（**減らすだけ**） |
| 17904 `doWipe` / 17931 リセット / 10316 | 新しい人生 | `state = freshState()` | いいえ（0 に戻す） |

**加算（+1 や += など）は 0 件。** 調べた範囲:
- 直接の加算: なし
- `Object.assign` / スプレッドで traitCounts に値を入れる箇所: 上の loadState（1852）と exitInfinite（10327 の `Object.assign({}, snapshot, ...)`）だけ。どちらも保存済みの値を戻すだけ
- 変数経由の参照書き換え: `encodeGuestCode` は `t: state.traitCounts`（7263）で読むだけ（JSON 化する）。`decodeGuestCode` は新しいオブジェクト `traitCounts` を作り（7285-7289）、ゲスト（`state.guest` 側）に入れる。自分の `state.traitCounts` には書き戻さない
- traits を返す関数: `dominantTrait`（7307-7313）は読むだけ
- デバッグ用の書き込み: 該当なし（`grep` で 0 件）
- games.js / quick.js / meguru.js / item-system.js などのほかのモジュール: `traitCounts` への言及は 0 件。meguru.js の `a.traits.calm` などは住民 AI 用の別オブジェクトで無関係（meguru.js:2378 など）

### 1.2 動的な確認（検証 A）

`state.traitCounts` を Proxy で包み、書き込みをすべて記録したうえで次を実行した:
- ミニゲームの開始・終了を 300 回（スコア 0/30/60/90/100）
- `tick()` を 3000 回
- うそつきしょうぶを 1 回（挑戦の確定まで）
- あいてコードのエンコードとデコード
- 変身 1 回
- save → load

結果は traitCounts 全項目 0 のまま。記録された書き込み 5 件はすべて変身時の半減（0→0）だった（`verify-traits.out.txt` A4/A5）。

### 1.3 テストフィクスチャ（本番ではない書き込み）

- tests/item-relations-travel-test.cjs:51 `s.traitCounts.gentle=10`
- tests/naoto-lantern-ring-test.cjs:86 `s.traitCounts={}`
- tests/clownfish-romance-test.cjs:155,253,269（ゲスト用の `traitCounts:{}`）
- tests/item-economy-v2-browser.cjs:13、tests/quick-daily-economy-v2-test.cjs:9（保存キーの一覧）

いずれもテストが状態を直接作る箇所で、ゲームの中でこの値を得る経路ではない。

---

## 2. 読み取り箇所の全量と判定

| # | 読み取り箇所 | 何の条件か | traitCounts 以外の経路 | 判定（新規セーブ） |
|---|---|---|---|---|
| R1 | 981 `mermaid`: `gentle >= (eased?2:3)` / 982 `unicorn`: `brave >= (eased?2:3)` | 変身候補にレア種族を混ぜる条件 | — | **死んだコード**（下の注 R1） |
| R2 | 992-993 れんくん `renReady` | `(minigameCount>=5 && avgSkill>=(renEased?78:85)) \|\| romantic>=(renEased?3:5)` | OR の左側（ミニゲームの平均スコア）がある | **romantic 側は到達不能。れんくん自体は条件付きで到達可能**（検証 D2-D4） |
| R3 | 2243-2245 実績 `gentle-10` / `brave-10` / `romantic-10`（tier easy2） | `s.traitCounts.X >= 10` | なし（条件はこれだけ） | **到達不能**（検証 B1-B3） |
| R4 | 2712 `achievedGoalTiers` / 2805 `endingProgress`（ゴール⑤） | `L.perfectCleared \|\| ACHIEVEMENTS.every(unlocked)` | `perfectCleared` の立つ経路は 3 つ: (a) 10210-10211（全実績が前提で、R3 に阻まれる）、(b) 2046-2048 の旧 `freePlay` セーブの移行（schemaVersion<3）、(c) 10294 `enterInfinite`（ボタン表示 11904 が `perfectCleared` 前提なので循環） | **新規セーブでは到達不能**。旧セーブ（R3 の 3 実績を解放済み、または旧 freePlay）なら到達可能（§5） |
| R4' | ⑤に従属するもの | `isThemeUnlocked` の `unlockAll`（2738）→ レインボーの色テーマ（2543）と模様（2606）。♾️ のせかい（11904 `canEnterInfinite`、13437 のボタン）。⑤の作者あいさつ（17957/17969 `showAuthorGreeting('perfect')`） | ⑤と同じ | **新規セーブでは到達不能** |
| R5 | 12358-12368 プロフィール「せいかくのけいこう」（index.html:577-578） | 表示だけ | — | 表示はされるが、新規セーブでは 5 本とも幅 0%（`maxTrait = Math.max(1, 0…)`） |
| R6 | 17478 きゅうあいの成功率 `traitBonus` | `affinityTrait ? min(0.3, traitCounts[trait]*0.03) : 0.1` | ほかのボーナス（happiness、sodachi）がある | **到達可能だが、性格によるボーナスは常に 0**。固定の恋人候補 18 体はすべて affinityTrait を持つ（8383-8400、検証 E1）。このため +0.1 を得られるのは「affinityTrait が null のゲスト」（traitCounts がすべて 0 のゲスト）だけになる。性格を育てた相手ほど有利、という設計意図が反転している |
| R7 | 7263 `encodeGuestCode` → 7285-7297 `decodeGuestCode` → 7307 `dominantTrait` → 7325 `guestCandidate.affinityTrait` | あいてコード（ゲスト交換）で相手の「すきなところ」を決める | 送り手のセーブが旧セーブなら値が入っている（検証 G2）。手で書き換えたコードもデコーダは有限数ならそのまま受け付ける（検証 G3。自分の traitCounts は変わらない） | 新規セーブ同士では常に `null`（すきなところ: とくになし、12381） |
| R8 | 8655 / 9552 / 12381 の `partner.affinityTrait` | デート反応、プロフィール表示 | 固定候補の affinityTrait は定数なので、traitCounts とは無関係 | 影響なし（ゲストの恋人だけ R7 経由で null になる） |

**注（指示の確認）:** `dominantTrait` / `affinityTrait` を使うのは「あいてコード」のゲスト（7231-7330）で、「うそつきしょうぶ」ではない。うそつきしょうぶの性格は別の `lifetime.duelTraits`（§6）を使う。

**注 R1: mermaid / unicorn は現行の種族集合に存在しない**
- `RARE_LINES` はマスター（character-world-master.v1.js:74-83）の `playerSpecies.rare` から作られ（467, 474）、中身は `dragon, phoenix, god, world_tree, ghost, star, plush, unknown` の 8 種
- `mermaid` / `unicorn` は `LEGACY_RARE_LINES`（472）に移されている。`ALL_LINES` にも含まれない（482、検証 D0）
- `rarePool = RARE_LINES.filter(...)`（975）の中で `line === 'mermaid'` は真にならないので、981-982 の性格条件は評価されない。traitCounts をいくら上げても候補に出ないことを確認した（検証 D1: gentle/brave=99 で 3000 回抽選し、mermaid 0、unicorn 0）
- つまり R1 は「traitCounts のせいで到達不能」なのではなく、**種族そのものが 3aec31f2（2026-09-07、PR #182 で main へ）で退役しており、traitCounts の不具合とは独立に到達不能**
- 補足（範囲外だが同じ関数の話）: 現行レアのうち、変身ルートで混ざるのは `god`（979）と `phoenix`（985）だけ。`dragon` / `world_tree` / `ghost` / `star` / `plush` / `unknown` は filter が `false` を返す（986）ため、変身では出ない。入手経路は卵の予約（10592-10633、README:121）。これは traitCounts とは無関係

**注 R2: れんくんの到達性**
- 図鑑（progressRegistry の dex = ALL_LINES × 8、2372）には ren が含まれる。このため図鑑④とゴール⑤に必要
- ren は `dreamLines` から除外されている（10593）ので、卵では入手できない
- 入手経路は変身の `renReady` だけ（チケット変身 `pickTicketTransformCandidates` も同じ関数を通る）
- 検証: traitCounts=0、ミニゲーム 0 回では 3000 回中 0 回。romantic=5 では 519 回。romantic=0 でも 5 回プレイ・平均 85 なら 545 回（D2-D4）
- したがって **ren はミニゲームの腕前ルートでのみ到達可能（条件付き）**

---

## 3. 歴史

### 3.1 加算ロジックの導入と削除

| 日時 | コミット | 内容 |
|---|---|---|
| 2026-09-02 | `eb88c5689` "Tie quiz answers into evolution, add impact flash, expand to 40 questions" | クイズの回答を traitCounts に結びつけた（`-S traitCounts` で最古） |
| 2026-09-06 01:07 UTC | `3104c5e3` "QA-1: レア4種の 解禁条件を 見なおす" | メッセージに「traitCounts は『せいかくクイズ』でしか たまらず、それは ぜんミニゲームの 6%」とあり、閾値を 5→3 に下げた。この時点では現役。981 のコメントはこのコミットのもの |
| 2026-09-06 21:03 JST | `a84b429f` "Remove shallow minigames from rotation"（PR #132 `expand-action-homage-games-and-ranking` に含まれ、2026-09-06T13:06Z にマージ） | 抽選プールから `...QUIZ_GAME_VARIANTS` と `['quiz', QUIZ_GAME_VARIANTS]` を削除。追加されたコメントは「単純な計算・反射1タップ・もぐらたたき・選択肢だけ・2D分岐迷路などは抽選プールから外し…」。**この時点で加算経路がプレイから消えた** |
| 2026-09-06 22:21 JST | `e79ab22062ab1e272d617a3350d4ecbb528eee41` "Remove obsolete minigame implementations"（PR #133 `cleanup-removed-minigame-code`、13:22Z マージ） | `QUIZ_QUESTIONS`、`makeQuizGame`、`TRAIT_IMPACT`、`QUIZ_GAME_VARIANTS` を定義ごと削除。最後の加算行もここで消えた |
| 2026-09-07 | `3aec31f2` "Connect 22 normal and 8 rare species master to runtime" | `RARE_LINES = ['god','ren','mermaid','unicorn','phoenix']` をマスター由来に置き換え、`LEGACY_RARE_LINES = ['mermaid','unicorn']` を追加（R1） |
| 2026-09-10 | `fb5e992d` | 3 実績に `tier: 'easy2'` を付与（削除の**後**） |
| 2026-09-11 | `21844921` | 3 実績の desc を「ひとつの人生で、やさしい選択を10回した」に書き直し（削除の**後**） |

### 3.2 削除前の加算ロジック（`git show e79ab22062` より引用）

```js
-            if (answered) return;
-            answered = true;
-            state.traitCounts[choice.trait] = (state.traitCounts[choice.trait] || 0) + 1;
```

- 問題は 18 問（`QUIZ_CATEGORY_RANGES`: normal/serious/adult/silly/romance/touching が各 3 問）、各 4 択
- 選んだ選択肢の `trait` が +1 される
- 選択肢の trait の内訳（`a84b429^:script.js` を集計）: calm 22 / gentle 17 / wild 16 / brave 12 / romantic 5
- 例（`a84b429^:script.js:7913-`）:
  - 「ともだちが…わるぐちを…」→「ほんにんの いないところで いうのは やめようと いう」= `brave`（score 100）、「なにも いわず ききながす」= `calm`、「あとで ほんにんに ぜんぶ つたえる」= `gentle`、「そのばで いっしょに わらう」= `wild`
  - 「グループで ひとりだけ いけんが ちがう」→「いったん そのひとの りゆうを きく」= `gentle`
- 削除前の時点で traitCounts を加算する行はこの 1 行だけ（`a84b429^:script.js` の grep で、加算は 8100 行目の 1 件のみ）

### 3.3 「意図的な廃止」の記述があるか

- PR #132 本文（`gh api repos/Naoto214/naotocchi/pulls/132`）: 削除したゲームとして「じゃんけん、色名ストループ/矢印方向、記憶、順押しリズム、単純ジャンプ…」を挙げている。クイズや性格への言及はない
- PR #133 本文: 「単純選択」などの実装を完全に削除し、「残存参照チェック済み」と書いている。traitCounts、性格、実績、レア種族への言及はない
- 2 つのコミットメッセージにも、性格を廃止するという記述はない
- 削除後のコミット（fb5e992d、21844921）は 3 実績を現役として手入れしている。981 のコメント、NAOTOCCHI_MASTER_SPEC J-7 もそのまま残っている
- **結論: 意図的に廃止したという記録は見つからない。** 「単純な選択だけのゲーム」をプレイ体験の理由で外したときに、副作用（性格の加算経路が消えること）に触れた記録がない、というのが事実として言えること（意図があったかどうかは記録からは断定できない）
- 履歴上のノイズ: shallow clone では `-S traitCounts` が 8ed37696 などを返すが、これは graft 境界の誤検出。full clone でも 5042a296（2026-10-02）が出るが、script.js 全体を削除する側枝のコミットで、加算とは無関係

---

## 4. 正本の記述

| 文書 | 箇所 | 記述 | 現行コードとの関係 |
|---|---|---|---|
| NAOTOCCHI_MASTER_SPEC.md | 11 | 基準コミット `794e6f2`（PR #90、2026-09-06、クイズ削除**前**） | 冒頭 3-9 に「以下は歴史的な棚卸し」「168形態・旧ミニゲーム数…を現在の残件と混同しない」とある |
| 同 | 212 | レア 5 種 = god/ren/mermaid/unicorn/phoenix | 旧（R1） |
| 同 | 269 | 変身時に traitCounts を半減 | 現行どおり（14395） |
| 同 | 276-281 | mermaid `gentle>=3/2`、unicorn `brave>=3/2` | コードは残るが死んだコード |
| 同 | 289-294 | ren の OR 条件（romantic を含む） | 現行どおり |
| 同 | 319 | 実績が `traitCounts.*` を見る | 現行どおり |
| 同 | 559 | traitBonus の式 | 現行どおり |
| 同 | 831-833 | 「J-7. せいかくクイズ: `quiz` カテゴリ（7 変種）だけが `state.traitCounts[choice.trait] += 1` を行います。これが mermaid / unicorn / ren の解禁条件に直結する唯一の経路です」 | **現役として書かれている**が、コードには存在しない。この節は作成時の cac58da5 から変わっておらず、RH-11（6fa1f754、2026-09-29「MASTER_SPEC を いまの コードに」）でも直されていない |
| 同 | 1270 | 「ミニゲームの quiz カテゴリだけが traitCounts を動かす設計 — 出現率は…約 6%」（判断保留リスト） | 旧 |
| README.md | 55 | 「レア・隠し種族には別の入手条件があります」 | 性格には触れていない |
| README.md | 167-175 | 「⑤ PERFECT CLEAR: 図鑑コンプリートを含む全実績を達成する」 | 現行（全実績には R3 が含まれる） |
| README.md | 性格の記述 | 「せいかく」「性格」は README に出てこない | — |
| docs/superpowers/specs/2026-09-17-naoto-crown-achievement-bias.md | 2、59-61 | ユーザー承認済み（2026-09-17）。90 実績の棚卸しで gentle-10/brave-10/romantic-10 を「対象外80実績」（既存の達成条件を変更しない）に分類 | 3 実績を現役の実績として扱っている。廃止の記述はない |
| docs/audit/minigame-portfolio-audit-2026-10-03.md | 28、359、376、385、409 | 「性格を増やす経路が存在しない」「壊れているのか、意図した廃止なのか」は Phase 0 の確認事項 | 前回監査 |
| docs/audit/.../integration-main-game.md | 191-203、344 | 到達不能の候補として mermaid/unicorn、ren の romantic、3 実績、⑤を挙げ、「要確認」としている | 本監査と比べた差は §7 の末尾 |

**まとめ:** 「性格（traitCounts）を廃止した」と書いた正本は見つからない。MASTER_SPEC J-7 は現役の仕様として残っており（ただし文書全体は基準が古く、冒頭で一部を歴史的資料と宣言している）、README は⑤を「全実績」と定義している。実績を扱う承認済み spec（2026-09-17）は 3 実績を現役として扱っている。

---

## 5. 実害の確認

### 5.1 新規セーブ（コードの依存関係と検証）

1. 加算経路が 0 件で（§1）、新しい人生はすべて `freshState()` の 0 から始まる。変身は半減しかしない。したがって、新規セーブの traitCounts はどのプレイをしても全項目 0 のまま（検証 A4/A5）
2. R3 の 3 実績は `>= 10` が必要。0 のままなので解放されない。動作の確認として、9 では解放されず、10 を直接入れると解放される（検証 B1/B3/B4）
3. ⑤: ほかの 88 実績を解放済みにし、`perfectCleared=false` で `checkAchievements()` を呼んでも、未解放は `["gentle-10","brave-10","romantic-10"]` の 3 件だけ残り、2805 の判定は false になる（検証 B2、ACHIEVEMENTS は 91 件）。`perfectCleared` を立てるほかの経路は、旧 freePlay の移行（2046-2048）と、♾️（10294。入口は 11904 で perfectCleared が前提）しかない。**新規セーブでは⑤に到達できない。** 連鎖して、レインボーのテーマと模様、♾️ のせかい、⑤のあいさつも到達できない
4. ④（図鑑）は R3 に依存しない。ただし ren が必要で、ren は腕前ルートでのみ入手できる（R2）
5. 実績の画面には「あと3こ」が残り続ける（12159）。desc が「やさしい選択を10回した」なので、プレイヤーはどこかに選択肢があると受け取る

### 5.2 旧セーブ（traitCounts がすでに溜まっているもの）

- 読込: 有限数は保持され、型が不正なものだけ 0 になる（1852、1713-1731。検証 C1: `{gentle:12,wild:3,calm:'x',brave:11,romantic:21}` が `{12,3,0,11,21}` になった）
- 実績: 読み込み直後の `checkAchievements()` で、10 以上ある項目は解放される（検証 C2）。解放済み実績は `achievementsUnlocked` に残り、新しい人生でも引き継がれる（17930-17936）。このため、**クイズ削除前（〜2026-09-06）に 10 回以上選んでいたプレイヤーは影響を受けない**
- 変身時の半減（14395-14397）: 解放前の値は変身のたびに減る。検証 C3 では 12/11/21 が 6/5/10 → 3/2/5 → 1/1/2 → 0/0/1 になった。補充手段がないので、**旧セーブの未解放ぶんも変身するほど回復不能に近づく**（14392-14394 のコメントは「へんしんするほど レアが とおのく ぎゃくインセンティブ」を避けるための半減だと書いているが、加算がない今は単調に減るだけ）
- 新しい人生（17931 `freshState()`）で 0 に戻る。旧セーブの恩恵は「その人生のうちに 10 に達していたか」だけで決まる
- ゲスト: 旧セーブの友だちから受け取ったコードには値が残るので、affinityTrait が決まる（検証 G2）

---

## 6. 同じパターンで壊れている他の性格関連

| 対象 | 書き込み | 読み取り | 判定 |
|---|---|---|---|
| `lifetime.duelTraits`（1679） | `applyDuelTrait`（7590-7595）が、`finalizeDuelChallenge`（7870-7880、7877）から本音の回答ぶん +1 する。UI 配線は 18624-18630（`duelFinalizeChallengeBtn`）と 18232（`openDuelBtn`、index.html:664） | 12575-12590 の表示だけ。条件には使われていない | **動いている**（検証 A2: 1 試合で `{active:1,jealous:1,romantic:3,secretive:1}` が加算された）。traitCounts とはつながっていない |
| `partner.affinityTrait`（固定候補） | 定数（8383-8400） | デート反応（9552）、プロフィール（12381）、成功率（17478） | 定数側は正常。成功率の式だけが traitCounts=0 のために「性格のある相手ほど不利」になる（R6） |
| ゲストの `affinityTrait` | `dominantTrait(guest.traitCounts)`（7325） | 同上 | 新規セーブ同士では常に null（R7） |
| 981 の性格閾値（mermaid/unicorn） | — | — | 種族の退役で死んだコード（R1） |
| `TRAIT_IMPACT` などクイズ側の演出 | e79ab22 で削除済み | — | 残骸なし |

ほかに「書き込み元が消え、読み取りだけが残っている」性格系のフィールドは見つからなかった。検索範囲は `TRAIT_LABELS`（936-938）の 5 キーと `DUEL_TRAIT_LABELS`（7344-）の 8 キー。

---

## 7. 結論

### (a) 新規セーブで到達不能と確定したもの

1. 実績 `gentle-10` / `brave-10` / `romantic-10`（2243-2245）
2. ゴール⑤ PERFECT CLEAR（2712、2805、10210）と、それに従属するもの:
   - レインボーの色テーマ（2543）と模様（2606）（2738）
   - ♾️ のせかい（11904、13437）
   - ⑤の作者あいさつ（17957、17969）
3. れんくんの romantic ルート（993 の右辺）。ren 本体は (b)
4. プロフィールの「せいかくのけいこう」に意味のある表示が出ること（12358-12368。常に 0%）
5. （traitCounts とは独立）mermaid / unicorn の性格条件（981-982）。種族自体が 3aec31f2 で退役しており、RARE_LINES に存在しない

### (b) 条件付きで到達可能なもの

1. れんくん（図鑑④、⑤に必要）: その人生で「ミニゲーム 5 回以上かつ平均 85（そだち80で 78）」を満たし、変身の 18%（30%）抽選に当たったときだけ（992-995）
2. 3 実績と⑤: 旧セーブで、クイズ削除前に該当の値が 10 以上あった人（または既に解放済みの人）。旧 freePlay の移行セーブ（2046-2048）は⑤を直接得る
3. きゅうあいの成功: 到達はできるが traitBonus は常に 0。ゲストが traitCounts 全 0 のとき（null）だけ +0.1（17478）
4. ゲストの「すきなところ」: 送り手が旧セーブの値を持つ場合、または手で書き換えたコードの場合だけ決まる（7285-7289 は有限数を無検証で受け付ける。検証 G3）

### (c) 修復の選択肢（どれを選ぶかは人間の仕様判断が必要）

ここでは新しい性格の獲得方法を確定しない。各案の影響だけを並べる。

| 案 | 内容 | セーブ互換 | 実績 | ゴール⑤ | ゲームとしての意味 |
|---|---|---|---|---|---|
| A. 旧加算ロジックの復元 | e79ab22 で消えた `QUIZ_QUESTIONS`（18 問）、`makeQuizGame`、`TRAIT_IMPACT` を復元し、抽選に戻す（または抽選外の別入口から遊ばせる） | 影響なし（フィールドは既にある） | 3 実績が再び到達可能。ただし旧データでは romantic の選択肢が 5/72 しかなく、出現も約 6% だったため、romantic-10 は 1 人生では非常に遠い（3104c5e3 の実測を参照） | 回復 | PR #132 が「選択肢だけ」のゲームを意図して外した判断と衝突する。PR #132 の判断を覆すかどうかの決定が要る |
| B. 既存のイベントに加算を付ける | 既存のおせわ、きゅうあい、デート、たび、ストーリーイベントなどの選択で +1 する | 影響なし | 到達可能。ただし閾値（10）と加算頻度の再設計が必要 | 回復 | 「どの行動がどの性格か」を新しく定義することになる。これは本監査の範囲外で、決定が要る。変身時の半減（14395）との釣り合いも見直す必要がある |
| C. 3 実績を⑤の条件から外す / 3 実績を退役させる | ACHIEVEMENTS から除く、または⑤の判定（2712、2805）で除外する | 解放済みの ID が `achievementsUnlocked` に残る。`countRegistered` で数えるので登録外の ID は数えない（2417）が、扱いの確認が要る | 実績の総数が 91→88 に変わる。2026-09-17 承認 spec の「90 実績の棚卸し」表と食い違う | 回復 | 性格システムを実質的に廃止する判断になる。プロフィールの表示（R5）、R2 の右辺、R6、R7 の扱いも一緒に決める必要がある |
| D. 文言・表示だけ直す | desc やプロフィールに「（いまは たまりません）」と書く、表示を隠すなど | 影響なし | 到達不能のまま | 到達不能のまま | ⑤が永久に取れないことの説明になるだけ。単独では実害（⑤）を解消しない |
| E. 付随して必要な整理（どの案でも検討が要る） | 981-982 の死んだ条件と 979-980 の古いコメント、MASTER_SPEC J-7・212・276-281・1270 の更新、14392-14394 の半減の根拠コメント、R6 の「null の方が有利」になる逆転、R7 のデコーダが無検証に値を受け付ける点 | — | — | — | — |

**前回監査（integration-main-game.md §4）との差分:**
- 一致する点: 加算 0 件、3 実績と⑤が到達不能、ren の romantic 側が到達不能、duelTraits は別系統
- 修正する点 1: mermaid / unicorn は「性格条件のために到達不能」なのではない。3aec31f2 で種族ごと退役しており、981-982 は死んだコード
- 修正する点 2: ren 自体は腕前ルートで到達可能（条件付き）
- 修正する点 3: ⑤には旧 freePlay の移行という例外経路がある
- 追加する点 1: ⑤に従属する到達不能（レインボー、♾️、⑤のあいさつ）
- 追加する点 2: きゅうあいの traitBonus の逆転（R6）
- 追加する点 3: 旧セーブでは変身のたびに値が単調に減ること
- 追加する点 4: 削除の後にも 3 実績が手入れされていること（fb5e992d、21844921）
- 補足: ゲストの dominantTrait は「うそつきしょうぶ」ではなく「あいてコード」の機能
