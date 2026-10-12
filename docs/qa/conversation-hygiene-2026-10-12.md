# Conversation Hygiene(Phase 1)記録 — 2026-10-12

- 作業ブランチ: `claude/conversation-hygiene-20261012`(`origin/main` `249a954f` から作成。監査ブランチ `claude/existing-conversation-audit-20261003` を docs のみ merge 済み)
- 正本の監査: [docs/audit/existing-conversation-audit-2026-10-03.md](../audit/existing-conversation-audit-2026-10-03.md)(監査時の main は `0b0a6b30`)
- 次工程の設計: [docs/design/conversation-director-v1-2026-10-12.md](../design/conversation-director-v1-2026-10-12.md)
- 方針: 既存の台詞の**本文は1行も書き換えていない**。直したのは「どの経路で・誰の口から・いつ出るか」の不具合だけ。

## 0. main の更新と監査との差分

| 項目 | 監査時 | 今回 |
|---|---|---|
| main HEAD | `0b0a6b30` | `249a954f`(2026-10-12「Merge PR #372: Character 3D Pilot and Full Rollout」) |
| 会話関連の差分 | — | **なし**。script.js の差分は めぐる 3D ローダーの 3 行だけ(`char3d` オプション)。movie-dialogue.js / meguru.js / resident-expression.js / character-world-master.v1.js / TEXT_STYLE.md は変更なし |
| 会話関連の open PR | なし | **なし**。open は 3D 系(#364/#365/#367/#369/#371/#374)、シール #302、docs #298/#300、card-game #259、#92 |

→ 監査結果はそのまま有効。行番号は script.js の L14703 より後ろだけ +2 ずれる。

## 1. 問題一覧の再確認(CA-01〜CA-29)と Phase 1 の扱い

| ID | 内容 | Phase 1 の扱い | 理由 |
|---|---|---|---|
| CA-07 | 上部お知らせ欄と吹き出しで同じギャグが同時に出る | **修正** | 表示上の重複。本文は変えずに「いま上部に出ている文と同じ文を吹き出しで選ばない」だけにした |
| CA-10 | 告白相手がいないのに「振られた」台詞と、仲間の反応が出る | **修正** | コード上のコメントで「相手がいない時は失敗ではない」と明記されているのに `court_fail` を呼んでいた。吹き出しを出さず、上部のお知らせだけにした |
| CA-13 | めぐるで world master の `hook`(設計メモ)をこいびとが話す | **修正(bridge 側)** | 設計メモ「仕事人なのにデートのため普通にサボる」等は台詞ではない。同じ枠に、そのこいびとの既存の本人台詞(Home の放置台詞と同じ正本)を出す |
| CA-14 | めぐるで三人称の出会い文(flavor)・図鑑説明を本人が話す | **修正(bridge 側)** | 仲間の flavor → その仲間の本人台詞に。図鑑説明は めぐるへ渡さない(植物系 6 系統の住民が対象。図鑑には残る) |
| CA-23 | 交際・結婚の固有台詞が「」付きのまま吹き出しに出る | **修正** | 記念日ムービー側(既存)と同じく外側の「」を外す |
| CA-25 | 旧 ID(alias)の恋人が専用台詞を使えず汎用へ落ちる | **修正** | 記念日・手紙・ムービーは既に `partnerAliases` で正規化していた。Home の 3 箇所(放置・日常反応・交際/結婚)だけ未正規化だった |
| CA-20(一部) | 表示されない date traitLine の抽選が会話の重複回避履歴を消費 | **修正** | 見えない抽選をやめた(データは保存)。表示内容は変わらない |
| CA-19 | `money` イベント 31 行が到達不能 | **保留(休眠として明記)** | §2 参照。再接続は新しいイベント仕様になる |
| CA-20 | DATE_TRAIT_LINES 30 / DATE_PLAN_VARIATIONS 20 等が到達不能 | **保留(休眠として明記)** | §2 参照。現行ムービー構造の変更になる |
| CA-01/02/03/05/06/08/16/17 | 頻度・繰り返し・履歴・状況依存・キャラ差・テンプレ偏り・思い出過多 | **Phase 2(Director v1)** | 選択アルゴリズムの設計判断が必要 |
| CA-04 | 掛け合いが返答になっていない | Phase 2 以降 | 新しい会話演出の採用は人間判断 |
| CA-11 | 本人が病気・危篤でも こいびと・仲間が明るく雑談し続ける | **保留 → Director 設計で選択肢化** | 「黙らせる/心配の台詞にする/今のまま」で体験が変わる。仕様判断 |
| CA-12 | 「こんばんは!」が時間を問わない、等 | Phase 2(状況タグ) | 条件付き選択の導入が必要 |
| CA-18 | sodachi の台詞が同じ操作の台詞に上書きされる | **保留 → Director 設計で選択肢化** | どちらを優先するかは演出判断 |
| CA-21 | 近似重複(「寝る向き/ねる向き」等) | 一部 Phase 1(CA-07 で同時表示は防止)、残りは Director の family 設計 | 本文の統合は台詞の書き換えになるため行わない |
| CA-22 | COURT_FRIEND の地の文が「ラベル:」付きで発言扱い、ほか話者表記 | **保留** | 表示書式(コピー)の判断が必要 |
| CA-24 | 深海で陸のデート台本 | 保留 | 新規台詞が必要 |
| CA-26 | 「じゃれたら次のぼろ！」(がけのヤギ)の意味が取れない | **保留(要確認)** | 「次、登ろ」の誤記の可能性が高いが、意図的な言い回しの可能性を否定できない。シュールな台詞を勝手に直さない方針 |
| CA-27 | 季節の自然な変化で告知されない | 保留 | 仕様確認 |
| CA-28 | 段階の境界と重なる年齢で midlife が出ない | 保留 | 会話ではなくライフイベント仕様 |
| CA-29 | docs の陳腐化 | 一部(本書と設計書で現状を記録) | — |
| 追加 | めぐる住民の `DIALOGUE.sick` がトリガーなし | 現状維持 | resident-expression.js のコメントで「将来用」と明記された意図的な未使用 |
| 追加 | koala / kinoko の flavor | 現状維持 | TEXT_STYLE.md「旧キャラの互換データは残す」に従う legacy |

## 2. 到達不能な会話の原因調査と復旧の是非

| 資産 | 件数 | 到達不能になった原因(git) | 分類 | 復旧の是非 |
|---|---|---|---|---|
| `CONVERSATION_POOLS.money`(pet9/partner8/companion8)+ `followUps.money`(6) | 31 | `cdbdc64c`(2026-09-17、#274「お楽しみ撤去とアイテム再設計V2」)で、そだち到達時のコイン報酬 `state.lifetime.money += reward` と一緒に `speakEvent('money')` が削除された。V2 で「許可された4系統以外のコイン停止」が仕様化された | **仕様変更に伴う休眠**(接続漏れではない) | 復旧するには「どのコイン入手で喋るか」を決める必要がある(ミニゲーム報酬・ラッキーコイン等)。新しいイベント接続=仕様判断なので**保留**。データは保存し、コメントで休眠理由を明記した |
| `DATE_TRAIT_LINES`(5性格×6) | 30 | `b234ab7d`(2026-09-15「add varied movie dialogue」)で、デートが「情景→A→B」の小話(movie-dialogue.js)に置き換わった。`traitLine` は引数として残ったが使われなくなった | **置換済み(superseded)** | TEXT_STYLE.md「小話は出来事と返事をセットで作る。返事だけを別の話から引かず」に反する一行ナレーションのため、そのまま戻すとムービーの構造を崩す。**保留**。再利用するなら「性格ごとの小話」として書き直しが必要(=新規制作) |
| `DATE_PLAN_VARIATIONS` | 20 | 同上。内容は movie-dialogue.js の各プラン冒頭とほぼ完全一致(51 件一致を監査で確認) | **置換済み・内容は現行ムービーに移植済み** | 復旧の必要なし(同じ文が既に出ている)。削除はせず休眠として明記 |
| `DATE_PLANS.line` / `DEEPSEA_DATE_PLANS.line/variations` | 約25 | 同上 | 置換済み・移植済み | 同上 |
| `court_fail.partner` | 8 | 呼び出し元は2箇所とも「恋人がいない」状況でしか呼ばれない(`partnerChance:0`) | 設計上到達しない | 恋人がいる状態での告白は `court`(いちゃつき)経路になるため、構造上不要。現状維持 |
| `partner_new.partner` / `marriage.partner` | 16 | 18人全員に固有台詞があるため、ゲスト(友だちコード)と未知 ID のフォールバックでしか使われない | 意図されたフォールバック | 現状維持 |

## 3. 実装した修正(コード)

| 修正 | 場所 | 内容 |
|---|---|---|
| H1 / CA-07 | script.js `conversationLineEchoesMessage` / `pickConversationLine` | 上部欄(`message`)の文から絵文字を除いて正規化し、同じ文は吹き出し候補から外す。外すと候補が空になる場合は外さない |
| H2 / CA-10 | script.js 告白処理(候補なし分岐) | `speakEvent('court_fail', …)` を削除。上部お知らせ「いまは気持ちをつたえたいあいてがいない」は残す |
| H3 / CA-23 | script.js `speakEvent` | `PARTNER_RELATIONSHIP_LINES` を吹き出しへ出すとき外側の「」を外す(記念日ムービーと同じ正規表現) |
| H4 / CA-25 | script.js `partnerDailyLine` / `speakEvent` / `scheduleIdleGreeting` | `canonicalPartnerId(state.partner.id)` で引く |
| H5 / CA-20 | script.js `goOnDate` | 表示されない `traitLine` の抽選を削除(引数は `null`)。DATE_TRAIT_LINES / DATE_PLAN_VARIATIONS / money に休眠理由のコメントを追加 |
| H6 / CA-13・14 | script.js `meguruBridge`(**meguru.js は無変更**) | `partners` を getter にし、`hook` 欄へ world master の設計メモではなく そのこいびとの本人台詞(`PARTNER_CHARACTER_IDLE_LINES`、alias 正規化)を1つ渡す。どの1行かは**キャラ ID と日付のハッシュ**で決める(乱数を使わない。同じ日の住民名簿が同一になり、めぐるの先読み world の再利用条件と、シード付き乱数列を崩さない。最初に `Math.random` で選んだ版では `meguru-party-lod` / `phase4e3` / `phase4e4a` の 27 人パーティ先読みテスト 3 件が失敗したため変更)。めぐる向けの `allCompanionsById` は `flavor` 欄を そのなかまの本人台詞(`COMPANION_CHARACTER_IDLE_LINES`)に差し替えた写しを返す。`speciesStageDesc` はめぐるへ渡さない。world master の hook・出会いカードの flavor・図鑑の説明文のデータは削除していない |
| — | index.html | script.js の `?v=` だけ更新(`tools/bump-versions.js` は全アセットの日付を書きかえてしまうため、変更したファイルだけ同じハッシュ関数で更新) |

### meguru.js を変えずに bridge 側で直した理由
最初は meguru.js の `talkLine` を直したが、`tests/character-3d-test.cjs` の 17・30 が meguru.js を SHA-1 で固定している(Character 3D lane の保護。`tests/fixtures/character-3d-protected-hashes.json`)。他レーンのガードを書き換えないため、meguru.js は main と同一に戻し、Conversation 側の script.js(めぐるへ渡す bridge)だけで同じ結果にした。`talkLine` が `hook` / `flavor` / `speciesStageDesc` を読む既存の分岐はそのまま生きており、そこへ渡す中身だけが変わっている。

将来の整理案(Character 3D lane と調整後): meguru.js 側で `hook` / `flavor` という名前の欄を使わず、本人台詞用の欄を明示的に読む形にする。

### 到達可能な会話の増減
- 増: めぐるの同行こいびと・こいびと住民・なかま住民で、そのキャラの本人台詞(こいびと各3行、なかま各3〜5行)が出るようになった。
- 減(意図的): めぐるの植物系住民の図鑑説明の読み上げ(48 行。図鑑では引き続き表示)、hook 18 行・flavor の吹き出し表示(本来の表示場所=出会いカード・設定では残る)、告白相手なし時の court_fail 吹き出し(同じ台詞は実際の失恋時に引き続き出る)。
- Home の放置・イベントの候補集合は変化なし(H1 は「その瞬間に上部と同じ文」だけを除外)。

## 4. テスト

### 追加: `tests/conversation-hygiene-test.cjs`(8 件、`npm test` に追加)
1. CA-07 上部欄と同じ文が吹き出しに出ない(sleep / medicine_cure / wake、乱数を 0〜1 で 40 点走査、全 beat)
2. CA-07 除外でプールが空にならない
3. CA-10 告白相手がいないとき吹き出しが出ない
4. CA-23 交際台詞が「」なしで出る
5. CA-25 旧 ID `ceo-cat` の恋人が cat_ceo の専用台詞・結婚台詞を使う
6. CA-13/14 本番と同じ bridge → `buildRegistry` → `talkLine` の経路で、hook・flavor・図鑑説明を一切話さず、本人台詞が出る(住民名簿 30 回 × 話者 5 × 20 回)
7. CA-13/14 めぐる向けの本人台詞は同じ日なら同一で、ページの乱数を1回も消費しない
8. CA-13/14 hook・flavor・図鑑説明のデータは本来の場所に残り、meguru.js は Character 3D lane の保護ハッシュと一致したまま

**修正前の main で同じテストを実行すると 5 件が失敗**(2・7・8 は不変条件の確認なので修正前も通る)し、修正後は 8/8 通ることを確認した。

### 変更: `tests/dialogue-test.js`
- 交際・結婚台詞の期待値を「外側の「」を外した文」に変更(H3 の意図どおりの変化)。

### 回帰
- §5 のチェックポイント表を参照。

## 5. チェックポイント

| # | HEAD | 内容 | テスト |
|---|---|---|---|
| CP1 | (このコミット) | Phase 1 修正 + テスト + 本記録 + シミュレーション tool | 下記 |

テスト結果の詳細はコミット時点で本節に追記する。

## 6. 未解決(人間の判断待ち)
1. money 31 行を新しいコイン入手(どれか)に接続するか(§2)
2. 性格別のデート小話を新規に作るか(DATE_TRAIT_LINES の再利用案)
3. 「じゃれたら次のぼろ！」は誤記か(CA-26)
4. COURT_FRIEND の地の文の表示書式(CA-22)
5. 本人が不調のときの こいびと・なかまの放置雑談(CA-11)— Director 設計書 §6 の選択肢
6. sodachi 台詞と同時の操作台詞の優先(CA-18)— Director 設計書 §6 の選択肢
