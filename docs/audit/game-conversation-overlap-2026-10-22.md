# ゲーム改善 Phase 2 開始前 — 並行作業との重複精査（2026-10-22）

- 正本: `origin/main` `7cb79942`（#418 マージ後）。GitHub の PR・ブランチ・コード・設計資料を確認した。
- **調査のみ。** コードの変更、main へのマージ、本番公開はしていない。
- **GitHub に保存されていない別タブの作業は、この調査では把握できない。** 該当箇所は「未確認」とした。ある PR がどの Work（タブ）のものかも、GitHub からは判別できない。
- 本書は、会話担当の Work にも同じ内容を確認してもらう前提で書いている。

---

## 1. 並行 PR・ブランチと、確認できた作業内容

### 1.1 本件に関係するもの

| PR / ブランチ | 状態 | 確認できた内容（コードと docs を確認） |
|---|---|---|
| **#414** `claude/conversation-hygiene-20261012` | **マージ済み**（2026-10-21 11:12） | **Conversation Director v1**: `conversation-director.js`（純関数）。<br>・台詞の鮮度、family、話者の連続制御、寡黙キャラ、rare 枠、放置会話の間合いを担う。<br>・履歴は別の localStorage キー `naotocchi-conversation-v1` に保存し、セーブ本体には触れない。<br>・`pickConversationLine` と `pickCharacterConversationLine` は Director を経由する。<br>・`setSpeechBubble` で `noteShown`（表示された台詞を記録）。<br>・設計: `docs/design/conversation-director-v1-2026-10-12.md`。§7 に将来の「条件付き台詞（`when`）・返答・質問」の受け口がある。<br>・**ブランチ側に、main に入っていないランタイムの差分はない**（js の差分 0 を確認）。 |
| **#415** `claude/minigame-phase1-fixes` | **マージ済み**（2026-10-21 11:59） | ゲーム Phase 1。<br>・確定不具合19件と文言15件。<br>・`minigame-reactions.js`（結果 → 文脈 → 瞬間 → プラン。**台詞の表は空**）。<br>・`finishMinigameInner` の dispatcher。<br>・結果処理中の吹き出しを保留する（B05） |
| **#417** `feat/individuality-4-4-2-20261021` | **Draft・未マージ・main と競合（dirty）** | **新しい個性「4＋4＋2」**（生得の4気質、後天の4こころ、好み2種）。<br>・`individuality.js` / `individuality-data.js` を新設。`script.js` は +413 行。<br>・ゲームとの接点:<br>  - `finishMinigameInner` の通常ゲーム経路に `individualGameResult()`。C 以上で勇気・根気の経験、別ゲームの達成で「応用」、好きな遊びの形成。**クイックは除外**。<br>  - なかま加入時に `individualMeeting()`。<br>  - じゃれるの台詞プールに `individualityLines()`（気質・こころ・好みの短文）。<br>・旧 `traitCounts`、旧3実績、romantic の出現条件、旧恋愛補正を撤去。<br>・新しい実績 `heart-*-5` を4件追加し、正式集合は92件。ゴール⑤の判定は既存集合のまま。<br>・**基準は #415 マージ前の main `f252708b`**（本文に「#415 は未統合」と明記）。 |
| #389 `feat/character-expression-complete-20261016` | マージ済み（10/16） | Character 3D: 12状態と、育成・関係・自然交流の表情入力。<br>・`expression-presentation.js` の EVENTS は reunion / greeting / visit / affection_interaction など。**ミニゲームのイベントはない**。 |
| #382 `feat/relationship-free-life-20261014` | マージ済み（10/16） | 恋人・なかまの自由生活。<br>・`homePresentPartner` / `homePresentCompanions` / `homeInitiative` を追加。<br>・**ゲーム後の掛け合いに参加できるのは、在宅中の相手だけ**になった（`speakEvent` と `companionSpeaker` が在宅を見る）。 |

### 1.2 関係しないもの（変更ファイルと題名で確認）

- CARD GAME: #406 / #407 / #408 / #409 / #397 / #393
- なおぽよ。: #405 / #387 / #390 / #391（#412 / #416 / #418 はマージ済み）
- その他: #365（preview ツール）、#302（シール）、#298 / #300（地理の docs）、#92（旧）

### 1.3 古い会話系ブランチ（2026-09-07〜09-30）

- `feat/chatty-conversations`、`feat/group-banter-chain`、`fix/conversation-priority-lock`、`fix/dialogue-*`、`feat/lively-cast-reactions-20260910`、`feat/cat-expression-pilot-20260915`、`feat/relationship-expression-pilot-20260930`、`feat/meguru-resident-expression` など。
- どれも最終更新が #414 の監査（10/03）より前で、監査 §1 では履歴として扱われている。
- **一つずつの「main に取り込み済みか」は未確認**（shallow 取得のため）。ただし 10/10 以降に更新されたものはない。

---

## 2. 機能別の重複マップ

分類: 会話担当 / ゲーム担当 / 共同インターフェース / 個性担当（#417） / 表情担当（Character 3D） / 未着手 / 不明

| 項目 | 分類 | 根拠 |
|---|---|---|
| 通常会話（放置・世話・恋愛） | **会話担当** | #414 の Director。台詞データは script.js 内の定数 |
| ゲーム終了後の会話 | **共同インターフェース** | 発火の条件・タイミング（結果帯、トーストの後、B05 の保留）はゲーム側（#415 の dispatcher）。台詞の中身は会話側のデータ（`CONVERSATION_POOLS.minigame_great/bad`、`PARTNER_/COMPANION_DAILY_REACTIONS[*].minigame_*`）。台詞の選択は Director |
| クイックゲームの会話 | **未着手** | どちらにも実装がない。#417 もクイックを明示的に除外。クイックは育成・勧誘・ストーリーを通らないという契約あり |
| 成功・失敗のリアクション | **共同インターフェース** | イベントキーは既存の2つ。dispatcher はゲーム側、台詞は会話側、体の動き（cast-motion の bounce/droop）は既存 |
| 自己ベスト・初回クリア・連敗への反応 | **ゲーム担当**（検出）＋ **未着手**（台詞） | #415 の `detectMoments`（firstClear / newBest / firstS / nearMiss / losingStreak / repeatPlay / milestone）。台詞の表は空。⚠ #417 も「初挑戦・初達成・応用」を**人生ごと**に別途数えている（目的は個性の経験で、表示用ではない） |
| キャラクターの表情 | **表情担当（Character 3D）** | `pet-expression.js` は character-3d の保護ハッシュの対象。minigame の一時表情は未登録（spec どおり） |
| キャラクターの動き | **不明**（実装は既存の cast-motion.js） | minigame_great=bounce、bad=droop が既存。cast-motion.js の所有者は docs で確認できなかった |
| 性格による反応差 | **個性担当（#417）**。担当 Work は**未確認** | #417 の `individualityLines()` がじゃれるのプールに入る。ゲーム後の反応への接続はない |
| 仲間・恋人による反応差 | **会話担当** | speakEvent の話者選択と固有台詞（Director の `pickOwnOrShared`）。在宅の判定は #382 |
| 会話の出現頻度・優先順位 | **会話担当** | Director v1 の pace・rare・priority（設計 §5〜§6。「イベント会話 > 条件付き（将来）> rare > 通常放置」） |
| 会話データの管理方式 | **会話担当** | 候補オブジェクト形式（§7: text / family / tags / when / reply / ask） |
| #415 の共通リアクション基盤 | **共同インターフェース**（現状の所有はゲーム側） | 文脈と瞬間の検出はゲーム固有。ただし `pickLine` / `LINES` は、Director §7 の `when` と同じ役割を持つ**2本目の台詞選択機構**になりうる（§3 C3） |

---

## 3. 実際に競合している箇所

| # | 内容 | 影響 | 推奨 |
|---|---|---|---|
| **C1** | **#417 は #415 より前の main を基準にしていて、現在 main と競合している（dirty）** | 同じ `finishMinigameInner` の通常経路に、両方が処理を差し込んでいる。<br>・#415: 保留の開始、記録、dispatch<br>・#417: `individualGameResult`<br>`package.json` / `index.html` / `tools/pages/allowlist.json` / `runtime-harness` / `smoke-test` / `dialogue-test` も両方が変更している | #417 の側で最新 main を取り込む。`individualGameResult` は `minigameResultSpeechHold = []` より前（育成処理の前）に置いても干渉しない（吹き出しは出さず、lifeLog だけを書くため）。ただし #417 が将来、ここで台詞を出すなら保留の対象になる |
| **C2** | **ゴール⑤の復旧案（#415 docs の R1）と、#417 の旧3実績の撤去が二重になっている** | R1 は「3実績を一時的に除外する」。#417 は「3実績を撤去し、新しい4実績を入れる」。両方を実装すると、実績の集合が矛盾する | **#417 を採用するなら、R1 は取り下げる**（`docs/audit/minigame-phase1-2026-10-21/goal5-recovery-options.md` を「#417 に統合」と更新する）。#417 を採用しない場合だけ、R1 を別 PR で実施する |
| **C3** | **台詞の選択が二重になる（設計レベル。実害はまだない）** | `minigame-reactions.js` の `pickLine` は、表から乱数で1行を選び、`petText` として渡す。speakEvent は `ctx.petText` があると Director の選択を通らない（記録の `noteShown` だけは通る）。台詞の表が空なので今は無害。しかし台詞を足した時点で、鮮度・family・cooldown が効かない別系統になる | ゲーム側は「瞬間」と「候補の台詞群」だけを返し、**1行を選ぶのは Director**（`conversationDirector.pick`）に一本化する（§8） |
| C4 | B05（結果処理中の吹き出しの保留）と、Director の判断 Q5（そだちの台詞と操作の台詞が同時に出たら、操作が勝つ） | 矛盾はしていない。great/bad では保留を捨てる（操作＝ゲームの反応が勝つ）、30〜69点では結果トーストの後に出す。ただし同じ領域に触っている | 会話担当に、B05 が Q5 と両立していることを確認してもらう |

---

## 4. 将来競合する可能性がある箇所

| # | 内容 | 予防策 |
|---|---|---|
| F1 | **性格・好みによるゲーム反応**: #417 の気質の台詞、ゲーム側の瞬間ごとの台詞、Director の `when` が、3方向から同じ「条件付きの台詞」を作りうる | 条件付き台詞は Director の候補オブジェクト（`when`）に一本化する。ゲームの瞬間と個性は、`when` に渡す**文脈**（ctx）として提供するだけにする |
| F2 | **ゲーム結果の履歴が三重になる**: ゲーム側の `recentMinigameResults`（メモリ）、#417 の natural experiences（セーブ・人生単位）、Director の表示履歴（別キー） | 目的が違うので、3つとも残してよい。ただし「初回・初達成」の判定式は1か所（ゲーム側の文脈）に寄せ、#417 はそれを入力として受け取る形が理想（#417 の再設計は強制しない。統合時に検討） |
| F3 | **ゲーム後の表情**: minigame の表情を足すには、`pet-expression.js`（保護ハッシュの対象）の変更が要る | Character 3D 担当の承認とハッシュ更新を経由する。ゲーム側からは直接変えない |
| F4 | **クイックの反応**: 3者のどれも未着手。誰かが勝手に育成効果をつなぐ危険がある | 「クイックは表示だけ。育成・個性・セーブに影響しない」を3者の共通の約束にする（#417 はすでに準拠） |
| F5 | **イベントキーの乱立**: `minigame_newbest` などを足すと、`CONVERSATION_POOLS` の全キー契約（3話者と followUps、4拍テスト）が全体に及ぶ | キーは増やさない。瞬間は文脈に載せ、台詞は候補で差し替える（#415 の方針を維持） |
| F6 | **在宅の判定（#382）**: ゲーム後に恋人・なかまが話すかどうかは在宅次第。勧誘の演出（companion_new）と在宅の不整合がありうる | ゲーム側は話者を決めない（speakEvent に任せる）方針を維持する |
| F7 | **好きな遊び（#417）と抽選の重み**: 将来「好きなゲームが出やすい」とすると、ゲーム側の抽選（minigameDrawWeight）に個性が入る | 実装するなら、ゲーム側の抽選に「好みの重み」を受ける口を1つ作る。所有はゲーム側。採用は人間の判断 |
| F8 | **セーブ**: #417 は `state.individuality` を追加し、Director は別キーを使う。ゲーム側が連敗の保存などを足すと三重管理になる | ゲーム側は Phase 2 で**セーブのフィールドを増やさない**（メモリ内の履歴だけ）。必要になったら別途判断を受ける |

---

## 5. 調整なしで進められるゲーム改善（ゲーム担当が独立に実施できる）

- Phase 0 の T1〜T10 の仕様判断を受けた実装:
  - 引き分けや時間切れの点数尺度
  - 100点に届かないゲームの扱い
  - 「みじかめ」の原則（`mgScale`）
  - 残り時間の HUD（`mgTimerHud`）
  - 難易度の配線
  - ゲームごとの判定の意図
- 見た目違いの派生（road×6、stack×6、fishing×4、ring×2、curling×2）に、小さな**判断差・地域差・季節差**を付ける（本数と ID は維持する）。
- 前回監査 F の小改善44本、G の大改善9本（ルール・操作・スコア・難易度・再プレイ性・類似ゲームの差別化）。
  - **会話担当と #417 は、ゲームのルールや得点を変える予定がない**（#417 は本文に「通常100本のルール/得点/報酬…を変更しません」と明記。#414 の設計にもゲームの変更はない）。
  - ただし点数の尺度を変えると、#417 の「C 以上・B 以上」の閾値の意味が変わる（§7 の注意）。
- ゲームの付加情報の口（`onComplete(score, msg, detail)` の outcome・tags）を、**データの配管だけ**として作る（台詞は付けない）。
- クイックのマイクロゲームのルールとテンポの調整（Lv の曲線、重複群の判断差）。
- iPhone 実機 QA で見つかった #415 の不具合の修正。

## 6. 会話担当へ引き継ぐべき項目

1. **ゲーム後の台詞の中身**（瞬間ごと、ジャンルごと、代表ゲームの一言）の執筆と文体の管理。
2. **台詞の1行選択**（Director 経由での鮮度・family・cooldown）。`minigame-reactions.js` の `pickLine` の役割を Director に移す受け口の設計（§8）。
3. 恋人・なかまの、ミニゲーム固有台詞の拡充（なかまは現在1人1本）。
4. クイックの後にキャラの吹き出しを出すかどうかの判断と、出す場合の台詞。
5. B05 が Director の Q5 と両立していることの確認（§3 C4）。
6. 30〜69点帯に会話を足すかどうか（現状は会話なし。ゲーム側は「静かな反応」の口だけを持つ）。

## 7. ゲーム担当が保持すべき項目

1. **ゲームの結果の文脈と瞬間の検出**（`minigame-reactions.js` の `buildContext` / `detectMoments`）。初回・自己ベスト・初S・惜しい・連敗・くりかえし・節目。
2. **反応のタイミング**（結果トーストが先、`resultDuration` の後、B05 の保留、新しいお世話や再プレイでの取り消し）。
3. `onComplete` の付加情報の口と、ゲーム ID・カテゴリ・ジャンル・地域・季節のメタデータ。
4. 点数の帯（70/30）、ランク（S90/A75/B55/C35）、勧誘の閾値。
   - **#417 が C/B を個性の経験の閾値に使っているので、帯を変えるときは #417 担当と調整する。**
5. ゲームのルール・操作・難易度・再プレイ性・派生の差別化（§5）。

## 8. 共通基盤の推奨所有者

| 基盤 | 推奨所有者 | 推奨する境界 |
|---|---|---|
| `conversation-director.js`（台詞の選択・鮮度・頻度・優先順位） | **会話担当** | ゲーム後の台詞の1行選択もここに一本化する |
| `minigame-reactions.js` | **ゲーム担当**（文脈と瞬間）＋ 会話担当（台詞データ） | ① ゲーム側の `resolve()` は `{eventKey, moment, moments, context}` を返す。② 台詞の候補は、会話側が Director の候補オブジェクト形式（`text` / `family` / `tags` / 将来の `when`）で持つ。③ dispatcher は候補を speakEvent に渡し、選択は Director が行う。<br>→ 現在の `LINES` と `pickLine` は、**台詞を1行も足さないまま**この形に置き換える（v0 の挙動は変わらない）。この置き換えは、speakEvent の受け口（会話側）とセットの小さな共同作業になる |
| イベントキー（minigame_great / minigame_bad / companion_new） | 会話担当（台詞プールの契約） | 新しいキーを足さない。瞬間は文脈で渡す |
| 表情（pet-expression.js、expression-presentation.js） | **Character 3D 担当** | ゲーム側は「出したい表情」をプランで示すだけ。登録は担当の承認とハッシュ更新を経由する |
| 体の動き（cast-motion.js） | 不明（要確認） | 既存の bounce/droop を使う。変更するときは所有者を確認する |
| 個性（individuality.js、`state.individuality`） | **個性担当（#417）** | ゲーム結果からの入力（`individualGameResult`）は #417 の所有。理想は、ゲーム側の文脈（初回・ランク）を受け取る形 |
| セーブ | 各担当が自分のフィールドだけを持つ | ゲーム側は Phase 2 でセーブのフィールドを増やさない。Director は別キー、#417 は `state.individuality` |

## 9. Phase 2 の推奨範囲

**Phase 2a（ゲーム担当だけで進められる。会話・個性との調整は不要）**
- T1〜T10 のうち、人間の判断が下りたもの（共通の単位 `mgScale` / `mgTimerHud` / `mgVersusOutcome` で、テーマ単位に入れる）。
- 派生ゲームの判断差（1本ずつ承認を受ける）。fishing-sea・ring-flight-summer から始める。
- 小改善を、パターン単位でまとめて直す（時間と目標、乱数化、難易度の配線）。
- `onComplete` の付加情報の口（outcome・tags のデータだけ）。対戦の終局理由（`mgVersusOutcome`）と釣果から始める。
- **台詞・表情・個性には触れない。**

**Phase 2b（会話担当と合意した後）**
- `minigame-reactions.js` を、§8 の「候補を Director が選ぶ」形に置き換える（台詞は0本のまま）。
- 代表の10〜15本で、瞬間ごとの台詞を試す（執筆と文体は会話担当、配管と検出はゲーム担当）。
- 候補: 釣り、たこやき、盤上の対戦、仲間・恋人を使うクイック、自己ベストと初S。

**Phase 2 に含めないもの**
- 性格・好みによるゲーム反応（#417 の採否と統合が先）
- ゲーム後の表情（Character 3D 担当の合意が先）
- クイックの会話（会話担当の判断が先）
- ゴール⑤（#417 の採否で決まる）

## 10. 次の実装を始める条件

1. **会話担当 Work が本書の役割分担を確認する。** 特に §6 の引き継ぎと §8 の境界。GitHub に保存されていない別タブの作業がないかの申告も含む。
2. **#417 の扱いを決める**: 採用するか、最新 main（#415 込み）を取り込むか。ゴール⑤を #417 の方式にするか R1 にするか（§3 C2）。
3. **台詞選択を Director に一本化する、という方針の合意**（§3 C3、§8）。
4. （表情を扱う場合のみ）Character 3D 担当の承認。
5. Phase 2a は条件 2 の「ゴール⑤」と無関係なので、**条件 1 だけで開始できる**。ただし点数の帯を変える T1/T2 は、#417 の C/B の閾値と調整してから。

---

## 未確認事項

- GitHub に保存されていない別タブ（会話担当 Work、個性担当 Work）の作業内容と予定。
- #417 がどの Work（タブ）の成果か。
- cast-motion.js の所有者。
- 2026-09 の古い会話系ブランチが、それぞれ main に取り込み済みか。
- 本番サイトの実際の表示。この環境からは github.io に接続できない（Actions の配信成功で代用した）。
