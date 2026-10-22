# ミニゲーム Phase 2 計画 — 新性格システム統合後の再評価と、通常100本＋クイック50本のゲーム性改善（2026-10-22）

- 正本: `origin/main` `f69310c7`（PR #417 マージ後）。
- **設計・計画のみ。** コードの変更、main へのマージ、本番公開はしていない。
- ゲームごとの詳細表（問題・改善案・期待効果・規模・影響・共通化の単位・T 判断・QA の有無）は、次の付録にある。
  - [normal-games-1.md](normal-games-1.md): 監査付録 A〜C の範囲。road / stack / 釣りは単体改善のみ
  - [normal-games-2.md](normal-games-2.md): 監査付録 D〜G の範囲。近いペアと盤上ゲームの差別化を含む
  - [quick-games-50.md](quick-games-50.md): クイック50本とラン構造
  - [variant-groups.md](variant-groups.md): road×6、stack×6、釣り×4、リング×2、カーリング×2
- 前提資料:
  - [ポートフォリオ監査](../minigame-portfolio-audit-2026-10-03.md)
  - [Phase 0](../minigame-phase0-2026-10-12/README.md)
  - [Phase 1](../minigame-phase1-2026-10-21/README.md)
  - [重複精査](../game-conversation-overlap-2026-10-22.md)
- 守る方針:
  - #415 で直したものを、未修正として扱わない。
  - 本数・ID・実績との接続を変えない。
  - 台詞を足さない。
  - 性格の成長ルール・育成効果・セーブの形を変えない。
  - 未決定の T1〜T10 を勝手に確定しない。

---

## 1. PR #417 統合後の main の状態

| 項目 | 状態 |
|---|---|
| main HEAD | `f69310c7` Merge PR #417「新個性4＋4＋2・人生イベント12回の正式採用」 |
| #417 で入ったもの | `individuality.js` / `individuality-data.js` |
| #417 で script.js が変わった量 | +356 / −165 行（#415 の後に統合済み。統合用のコミットは `4538bf10`） |
| games.js / quick.js / minigame-reactions.js | **#415（`41d2e780`）から変わっていない** |
| 旧性格 | `traitCounts`、旧3実績、romantic の出現条件、退役種族の死コードを撤去。ゴール⑤の旧案 R1 は不要になった（再実装しない） |
| 実績 | `heart-kindness/courage/wonder/perseverance-5` の4件を追加し、正式集合は92件 |
| 進行中の会話作業 | **#419 Conversation v2 Pilot**（Draft。`conversation-banter.js`、Director の拡張、掛け合いと選択肢）。基準は `f69310c7`。ゲーム関連のファイル（games.js / quick.js / minigame-reactions.js）は**変更していない** |
| そのほかの進行中 PR | CARD GAME（#406〜#409、#393、#397）、なおぽよ。（#387、#390、#391、#405）。ゲーム Phase 2 とは無関係 |

## 2. 新性格システムとゲーム結果処理の整合

**接続の仕方（main で確認）**
- `finishMinigameInner` の通常ゲームの経路で、育成処理の前に `individualGameResult(game, rawScore, individualGameLifeId)` を呼ぶ（script.js:16753）。その直後に、#415 の `minigameResultSpeechHold = []` がある（16754）。順序の干渉はない。
  - `individualGameResult` は lifeLog と state.individuality を書くだけで、吹き出しは出さない。
- **クイックは `if (isQuick) {…return}` で、それより前に抜ける。** 性格にはつながらない。
  - `tests/individuality-runtime-test.cjs:56-61` が、「50本の solo と混合ランで individuality が変わらない」ことと、本数50を固定で確かめている。
- 成長の条件:
  - ランク **C（35以上）**: genre ごとの courage 経験、game ごとの perseverance 経験
  - ランク **B（55以上）**: perseverance の次の段階
  - 別のゲームで達成: 応用
  - 好きな遊びは genre（6種類）単位で決まる。
  - 永続の自己ベストは参照しない。
- テスト: `individuality-runtime-test` のうち、ゲームに関係する4件（実ゲームで C/B が育つ、繰り返しでは育たない、genre 5種、クイック50本で不変）。

**Phase 2 への影響（最重要）**
- **点数の分布は、そのまま性格の成長の分布になった。** 点数を変える改善には、C/B への到達率の変化を必ず書く（各付録の表に記載済み）。
- 現状、**操作や判断とは関係なく C/B が出てしまう**ゲームがある。性格のルールは変えずに、点数の側で直すべき候補になる。

| ゲーム | 現状 |
|---|---|
| falling-block | 0ラインでも35点（C） |
| ring-flight | 何もしなくても約50点（C） |
| ski-jump | 何もしなくても約46点（C） |
| blackjack | 基礎点50（C） |
| sugoroku | 運だけで1位なら72点（B） |
| cake | ほぼ必ず100点 |
| jenga / halfpipe / domino | 決まった手順で満点（全員が B） |

  - 直すと、何もしなくても得られていた経験が減る（成長の速さが変わる）。**これは T7（無操作の点数）と T1/T2（点数尺度）の人間判断として扱う。**
- 派生ゲームの id が分かれているので、同じ中身の派生でも「別ゲームの達成＝応用」を稼げている。差別化しても id は変えないので、この挙動は保たれる（取りやすさが少し変わるだけ）。
- **新しい性格の成長ルール・育成効果は、Phase 2 では追加も変更もしない。**

## 3. Conversation v2 との重複・競合の確認

| 領域 | Conversation v2（#419）・Director | ゲーム Phase 2 | 状態 |
|---|---|---|---|
| 掛け合い・選択肢の会話・会話の品質・発話制御・履歴・頻度 | 担当 | 触らない | 重複なし |
| ゲームのルール・操作・難易度・点数・再プレイ性・差別化・クイックのテンポ | 触らない（#419 は games.js / quick.js を無変更） | 担当 | 重複なし |
| ゲーム固有の演出（ゲーム内の `say()` 実況、クイックの成功・失敗の絵、エフェクト） | 対象外 | 担当 | 重複なし（台詞ではない） |
| ゲーム終了後の会話・表情・リアクション | 将来の接続先 | 文脈と瞬間の検出（`minigame-reactions.js`）だけを保持する | **共同接続の領域。Phase 2 では触らない** |
| 発話の保留 | `conv2Unit.held`（掛け合い中の自動会話を保留する） | `minigameResultSpeechHold`（結果処理中の会話を保留する。B05） | **両立する。** speakEvent の中で、ミニゲームの保留が先に判定される。ゲームを開始すると、掛け合いは `conv2Abort` で止まる。将来の統合候補（どちらも会話側の所有にするか）として記録する |

- `minigame-reactions.js` は保護する。将来は、台詞の選択を Director に一本化する（[重複精査](../game-conversation-overlap-2026-10-22.md) §8）。
- Phase 2 では次のことをしない: 台詞の追加、Director の変更、独立した会話管理を作ること。

## 4. 通常100本の改善候補（概要）

付録の表（85行。派生は代表行に含む）を集計した。

| 分類 | 本数 | 主な内容 |
|---|---|---|
| **A 小規模改善** | 58 | 時計・HUD、判定の窓、押し始めの位置、乱数化、説明の短縮、難易度の配線 |
| **A＋B**（小改善と差別化） | 11 | 近いペア（tank/bomber、submarine/glider、plane/lunar、connect-four/gomoku）と盤上6本 |
| **C 大規模再設計候補** | 8 | dragDecorate-cake、push-puzzle、blackjack-21、jenga-tower、halfpipe-skate、domino-run、solitaire-klondike、sugoroku-race |
| **改善不要（または微調整のみ）** | 8 | downhill-snow、jump-quest、frogger-road、air-hockey、pipe-connect、sushi-belt、lights-out、takoyaki-grill（いずれも微調整のみ） |
| 派生の差別化 | 20本中 7本 | 6章 |

## 5. クイック50本の改善候補（概要）

| 分類 | 本数 | 主な内容 |
|---|---|---|
| A 小規模改善 | 27（うち1本は仕様確認つき） | 判定の抜け道、開始の猶予、文字の大きさ、高さの正規化 |
| B 差別化 | 6 | 重複群: stop（複数のたこやき）、fish（ニセのあたり）、pushbox（止めどころ）、pull（止めると戻る）、flee（2体）、shutter（緩急） |
| 改善不要 | 16 | |
| 仕様確認 | 1 | partner / doors の仲間0人（T9） |
| **ラン構造の改善 R1〜R13** | | 結果演出のフック、○/✕ を小さく、ポインタの持ち越しの遮断、開始の猶予、画面高さの正規化、cue との重なり、cue の縮小、レベル曲線（T9）、レベルアップの合図、同じ型の連続回避、連続の手応え、最終画面の振り返り（T9）、一覧の表記（T9） |

**今回新しく見つかった、クイックの判定の問題（コードで確認済み）**
- **stack**: 開始の瞬間（t=0）にブロックが真上にあり、cue と同時に押すと必ず成功する（quick.js `bx = W/2 + sin(t*sp)*…`）。
- **count**: 選択肢が常に {n−1, n, n+1} なので、**正解はいつも真ん中の数**（⭐を見なくても当たる）。
- **結果表示の間（520ms）は update が止まる。** そのため、cliff の落下、charge のジャンプ、stack の落下が描かれず、**shutter は画面が真っ白のまま止まる**。
- **ポインタがゲームをまたいで持ち越される**（`beginGame` が ptr を消さない）。こする系の指を離さないまま次がスワイプ系になると、触っていないのに失敗しうる。コード上の読みで、実機は未確認。
- catch のデコイを押しても罰がない。flames の feint が常に左端。

クイックの改善は、どれも性格に影響しない（上記のテストが保証）。ただし点数の分布が変わると、avgSkill（れんくんの出現条件）が動く。これは T9（G-QI-10）と一緒に見る。

## 6. 類似ゲームの差別化方針

- 20本中17本は、ゲームとしての判断に差がない。
- ただし、地域・季節の「出会いの演出」としては見た目差だけでも成り立っている。**全部には手を入れない。**

| グループ | 方針 | 対象と案 |
|---|---|---|
| 釣り | **差別化する（最優先）** | **fishing-sea**: 鳥の群れ🐦を見て投げる場所を決める（title 以外が real-fishing とまったく同じ、唯一の完全な複製）。**fishing-river**: 流れとよどみ（または説明文の修正。T8）。fishing-deepsea: チャージで深さを選ぶ（中）。real-fishing には共通の再キャスト |
| カーリング | **不具合を先に直す → そのあと差別化** | curling-winter: 8投が時間内に収まらない（みじかめでは必ず打ち切り。T3/T4）→ そのあと雪だまり |
| リングフライト | **差別化する** | ring-flight-summer: 既存の `theme` 引数で、波しぶきと低空リング |
| road | **一般プールの2本だけ差別化** | p3-space: 流れ星の予告。p3-drive: ⛽ガソリンの資源。road-themed の sky テーマは絵文字だけ直す（p3-space とアイテムが重なっている）。city / jungle / desert は見た目差のままでよい |
| stack | **説明文を直し、季節版1本だけ差別化** | stack-snowman: 文言とパレット（T8）。stack-sakura: 春の風。全6本で開始の位相を乱数化。harvest / acorn / leaves は見た目差のままでよい |

- どの案も、既存の生成関数に**オプションを1つ足すだけ**で入る（差し込む場所は付録に file:line で記載）。ID・記録・地域季節の優遇は変わらない。統合はしない。
- **同カテゴリ3連続回避の穴**: road（`road` / `perspective3d`）と釣り（`realFishing` / `fishing`）は、カテゴリが分かれているので「同じ中身が続く」のを防げない。
  - 直し方: カテゴリ（＝性格の genre）は変えず、回避のためだけに**生成関数の系統キー** `minigameFamilyOf` を持たせる。

## 7. 小規模改善（A）の主な共通パターン

1つの共通単位で複数のゲームに効くものを優先する。

| 共通単位 | 対象（例） | 要 T 判断 |
|---|---|---|
| **判定の抜け道をふさぐ**（開始位相・選択肢の乱数化・デコイの罰・空打ち） | quick: stack、count、catch、flames。normal: rhythm の空打ち（G-AC-21） | quick は不要。rhythm は **T6** |
| **入力事故の防止**（ポインタの持ち越し遮断、致命タップの開始猶予、押し始めの判定、指オフセット） | quick ラン全体。normal: darts（照準が指で隠れる）、baseball（キャンバスで誤スイング）、bubble、line-trace、space-gunner | 原則不要（baseball の早押しの扱いは T6） |
| **結果演出のフック**（クイック R1/R2） | cliff、charge、stack、shutter、sort ほか19本 | 不要 |
| **画面高さの正規化** `g.px(v)` | quick: dodge、coins、umbrella、feather、slice、rhythm | 不要 |
| **配置・開始条件の乱数化** | bento、stack系、crane、billiards、catapult、color / season / weather の答え | 不要（B の到達率が少し下がるものは影響欄に記載） |
| **系統キーによる連続回避** `minigameFamilyOf` | road×6、釣り×4 | 不要 |
| 時計と HUD `mgTimerHud` / `mgActionClock` | 残り時間を出さない約16本 | **T4** |
| 固定量の比例 `mgScale` | grand-prix、sky-shooter、tower-defense、pinball、missile、track-field | **T3** |
| ターン制の時計 `mgTurnClock` | 盤上6本、curling×2、hit-blow、solitaire、slide、sugoroku | **T3** |
| 対戦結果の点数帯 `mgVersusOutcome` | 盤上、curling、air-hockey、tennis、tank、volley、blackjack、fp-dungeon、TD | **T1 / T2**（性格の C/B に直結） |
| 無操作ベースラインの検査（何もしない戦略が C 未満か） | ring-flight、ski-jump、blackjack、sugoroku、falling-block | **T7**（性格に直結） |
| 難易度ノブの共通化 | 2048、picross、memory、halfpipe、voxel、blackjack、yacht、solitaire | **T5** |
| 説明文の短縮と同期 | 79〜93字の8本（doodle、tennis、sudoku、voxel、mancala、volley、glider、bomber） | 不要 |

## 8. 大規模再設計候補（C）

| ゲーム | 根本の問題 | 方向性（案） | 注意 |
|---|---|---|---|
| sugoroku-race | 「ねらって」と書いているが、目はランダム（85msごと）。実質は運だけ | 目を順番に巡回させて遅くする、またはマスで道を選ぶ | **T8**。運だけで B を配っている（性格） |
| blackjack-21 | 判断が「引く／止める」だけで、運の比重が高い。基礎点50 | 賭け額を選ぶ、またはカードを数える要素を足す | 基礎点が C に届いている（性格） |
| jenga-tower | 安定度45%以上なら崩れる確率が0。決まった最適解がある | ブロックの摩擦・重さに乱数、抜く量をドラッグにする | 全員が満点（性格の B） |
| halfpipe-skate | ポンプは押しっぱなしが最適で、1回転の反復だけで100点 | ポンプの位相を判定する、得点の上限を見直す | 同上。手触りの改善幅が最も大きい |
| domino-run | 点線をタップするだけ | 向きと間隔の判断、手持ちを足りなくする | 同上 |
| solitaire-klondike | 90秒では完成にほとんど届かない | 解ける配りを保証する（`generateUntil`）、目標を「台に○枚」にする | **T3**（ターン制の時計） |
| push-puzzle | 固定4面なので暗記になる | 逆再生で面を生成する（`generateUntil`） | A 寄りの C |
| dragDecorate-cake | 指示どおりにドラッグするだけで、ほぼ100点 | ランダムな注文、見栄えの評価 | — |

1本ずつ設計の承認を受け、1PR1本で進める。

## 9. 改善の優先順位

評価軸: 体験への影響 × 面白さの向上 × 対象本数 × 共通実装の効率 ÷ 不具合のリスク。T 判断・性格・Conversation・iPhone QA の要否を制約として扱う。

| 順位 | 内容 | 理由 |
|---|---|---|
| **1** | **クイック: 判定の抜け道と入力事故**（stack / count / catch / flames、ポインタの持ち越し、開始の猶予） | 「成功・失敗が明確」の前提が崩れている。数行の修正。T 判断・性格・会話のどれにも触れない |
| **2** | **クイック: 結果演出のフックと、○/✕ を小さく** | すでにある成功・失敗の絵（落下・写真）が見えていない。台詞なしでゲーム固有の演出を出せる唯一の土台 |
| **3** | **系統キーによる3連続回避**、road sky の絵文字 | 1か所の修正で10本の「またこれ」を減らせる。genre と性格には影響しない |
| **4** | **乱数化の S 群**（bento の配置、stack の開始位相、color / season / weather の答え、crane の景品） | 覚えゲーを防ぐ。各数行 |
| **5** | **入力の納得感**（darts の指オフセット、space-gunner の離して撃つ、画面高さの正規化） | iPhone の「指で見えない」「端末で難しさが違う」の解消 |
| 6 | **fishing-sea の差別化**、ring-flight-summer の波 | 完全な複製の解消。オプションを1つ足すだけ |
| 7 | クイックの重複群の差別化（stop / fish / pushbox / pull / flee） | 50本のまま単調さを減らす |
| 8 | **T 判断の後**: T4 の HUD → T3 の mgScale・ターン時計（curling-winter を含む）→ T1/T2 の対戦の点数帯 → T7 の無操作ベースライン | 本数への効果は最大。ただし人間の判断と性格の調整が必要 |
| 9 | 近いペアと盤上の差別化（B） | T1/T3 の後のほうが設計しやすい |
| 10 | 大規模再設計（C）を1本ずつ | 設計の承認が必要 |

## 10. 最初に実装すべき PR の具体案

**PR 2-1「クイック: 判定の抜け道と入力事故」**（推奨の最初の PR）

| 項目 | 内容 |
|---|---|
| 対象 | quick.js のみ。script.js は変えない |
| 変更 | ① stack の開始位相を乱数にする（`t` の初期値を、真上から一定以上離れた位置にする）。② count の選択肢を {n−2…n+2} から3つ選び、真ん中の数が正解とは限らない形にする。③ catch のデコイを押したら失敗にする（または一時的に押せなくする）。④ flames の feint の位置を乱数にする。⑤ `beginGame()` で `ptr = null` にする（持ち越しの遮断）。⑥ 「押すと即失敗しうる」11本に、開始後150ms の pointerdown を無視する `graceMs` を付ける |
| 影響 | 性格: なし（テストで保証）。記録・実績・コイン: 成功率がわずかに上下する。avgSkill: ごくわずか（T9 / G-QI-10 として PR に記載）。セーブ・会話: なし |
| テスト | 新しい `tests/quick-phase2-judgement-test.cjs`。stack を t=0 で押すと失敗すること、count の正解の位置が分布すること、catch のデコイで失敗すること、ptr の持ち越しで失敗しないこと、grace 中のタップを無視すること。既存の `quick-mode-test`（全50本が target() で解ける）と、`individuality-runtime-test` の50本で不変であることを維持する |
| iPhone QA | mash→wait、tickle→button、clean→throw の連続。stack と count を数回ずつ |
| 規模 | S（数十行） |

**PR 2-2「クイック: 結果演出のフック」**: R1（`anim(dt)` を結果表示中だけ呼ぶ）、R2（○/✕ を上部のバッジに）、R7（cue の縮小）、R9 / R11（レベルアップと連続の表示）。S〜M。iPhone QA で ○/✕ が読めるかを確かめる。

**PR 2-3「系統キーによる連続回避」**: `minigameFamilyOf`（生成関数の単位）を `refillMinigameQueue` の3連続回避に使う。road-themed の sky テーマの絵文字を差し替える。S。テストは、road-themed → p3-space → p3-drive の並びが避けられること。

**PR 2-4「乱数化の S 群」**: bento の配置、通常の stack の開始位相、crane の景品、クイックの color / season / weather の答え。S。B の到達率の変化を PR に記載する。

## 11. 未解決の仕様判断事項

| 判断 | 状態 | Phase 2 で関係するもの |
|---|---|---|
| **T0 性格** | **解決済み**（#417。旧3実績を撤去し、新4実績。R1 は不要） | — |
| T1 対戦・終局の点数尺度 | 未決 | mgVersusOutcome。**性格の C/B 到達率に直結** |
| T2 100点・S に届かないゲーム | 未決 | 点数の正規化。性格の B |
| T3 「みじかめ」と固定量・ターン制 | 未決 | mgScale、mgTurnClock、curling-winter、GP、sky、TD |
| T4 残り時間の表示 | 未決 | mgTimerHud（約16本） |
| T5 難易度の配線の原則 | 未決 | 難易度ノブ |
| T6 判定・操作の意図 | 未決 | rhythm の空打ち、baseball の早押し、fruit-slice のコンボ、picross の自動✕ など |
| T7 無操作の点数 | 未決 | ring-flight、ski-jump、falling-block など。**性格の「遊んだだけで C」に直結** |
| T8 説明と実装のどちらを正とするか | 未決 | sugoroku、downhill-mountain（12段か10段か）、cake / bento の即終了、fishing-river、stack-snowman |
| T9 クイックの仕様 | 未決 | Lv6、仲間0人、振り返りの表示、一覧の表記、**クイックが avgSkill を動かす件（G-QI-10）** |
| T10 本体とのつながり | 未決 | 「またきた」の到達不能、なかま経路のゲート、開始時の回数加算、手動の天気、結果文言の境目 |
| **新規**: 無操作・運で C/B が出ることを、性格の成長として許すか | 未決（T1 / T2 / T7 と一緒に） | falling-block、ring-flight、ski-jump、blackjack、sugoroku、満点系の3本 |

PR 2-1〜2-4 は、どの T 判断にも依存しない。

## 12. iPhone 実機 QA が必要な項目

**Phase 1 からの持ち越し（公開後の確認）**
- mini-golf: ボールの近く（約29px）から引っぱれる範囲
- 結果カードの後に吹き出しが出るか（B05）
- sudoku の赤表示、bento の ⭕/❌、bubble の降下
- quick の疑問調の声、「なかまは？」、「1本ずつ」の記録

**Phase 2 で新たに必要なもの**
- クイックの連続操作: mash→wait、tickle→button、clean→throw（PR 2-1）
- ○/✕ のバッジが一瞬で読めるか（PR 2-2）
- 375pt 幅で cue が折り返さないか
- 低い画面での umbrella と feather（高さの正規化）
- cue と count / doors / button の重なり（G-QI-02）
- Lv5 の mash（毎秒約9.4回）と stop（窓が約75ms）（G-QI-04）
- darts / baseball / line-trace で、指が対象を隠さないか
- curling-winter の8投が「ふつう」の長さで収まるか（G-FG-10）
- mancala / checkers の1局が時間内に終わるか（G-FG-12）
- dot-eater を全部食べられるか（G-FG-20）
- breakout / pinball の到達面と目標点（G-AC-08、G-AC-18）

---

## 次の段階への提案

1. PR 2-1 → 2-2 → 2-3 → 2-4 を、まとめて実装し、GitHub に保存し、iPhone 試遊版を作る。どれも T 判断が要らず、性格・会話に触れない。
2. その間に、人間が T1 / T3 / T4 / T7（＋性格の「無操作の C」をどう扱うか）を判断する。決まりしだい、共通単位でまとめて実装する。
3. 釣りとリングの差別化、クイックの重複群の差別化は、その次のまとまりにする。
