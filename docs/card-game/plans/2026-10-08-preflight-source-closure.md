# 107本文の予約・人物除去到達条件

基準HEAD: 9e59c064074100926172671adf3b1e7ceaffaad2。107の41種類/80物理札。既存start-sources.jsonのsource section/hashを再利用し、本文の処理を読んだ対応表。新source catalog・旧manifest変更・対戦生成はない。

**これは正本ルール上の条件付き閉包の論証であり、実handlerの全意味・入力認証・全到達実行の証明書ではない。P06/P08/P09を単独で完了へ昇格しない。**

## 本文から導ける範囲

1. 107の入力は80物理札で閉じる。41本文に、外部からカードを生成する、別のカード名/能力をコピーする、デッキ外から取り込む効果はない。通常たんじょう/ときおくり/へんしんは手札の既存物理札を移し、再登場は同じ物理札の世代を更新する。したがって正本どおりの遷移だけを行う限り、以下の41種類以外の除去/予約源は増えない。実装がそれに従うかは別の下記結合条件。

2. 相手のmainを除去する効果を持つ本文は0。G-archery-3dは相手の装備のみ。G-asteroids-classicは自装備のみ。mainの通常移動は行動者自身による移動であり「相手がmainを除去する効果を発動」ではない。よって前提1の下ではI-poop1の最初の発動条件が成立しない。I-poop1自身は除去効果を発動せず、循環した自己根拠もない。既存の明示拒否は削除しない。

3. 相手のなかまを手札/捨てへ移す効果も0。C-cat_friendの本人支払は自分による山札移動でありI-bond1の保護条件ではない。通常交代も自分による移動。したがってI-bond1の置換もこの閉じた本文集合では非到達。装備自身の配置・回収・離脱は到達するので除外しない。

4. 期限付き/次回の効果10sourceは下表のtyped payment2/stat7/conditional1へ接続済み。開始/終了/登場の誘発は、その機会に新たに発動する能力であり、過去に解決して作った旧reservationsとは別。I-poop1の短期置換は前提2によりルール上非到達。既存reservation_pilotの固定transcriptに他sourceがあることを107の到達根拠へ持ち込まない。

## 全source対応

`handler`はtools/のproxy_population_またはproxy_continuation_接頭辞を省略。登録場所の対応であり、全効果意味検証済みの宣言ではない。

| source | 分類 | 本文の作用先・制約 | handler / audit |
|---|---|---|---|
| [C-bat](../72-companion-26-card-text-draft.md#C-bat) | 即時回収 | 自分の準備→手札。敵人物を移さない。 | return_effects / trigger_effects |
| [C-box](../72-companion-26-card-text-draft.md#C-box) | 能力なし | 人物の通常配置・交代だけ。 | actions / departure |
| [C-cat_friend](../72-companion-26-card-text-draft.md#C-cat_friend) | コスト＋即時回収 | 自分自身→山札下、自分の捨てなかま→手札。 | discard_recovery |
| [C-chameleon](../72-companion-26-card-text-draft.md#C-chameleon) | 継続補正 | 両world名で自分mainの値を補正。 | challenge.stats |
| [C-chicken](../72-companion-26-card-text-draft.md#C-chicken) | 開始誘発 | 自山札上を公開、なかまなら手札。 | start_effects |
| [E-big-illness](../91-event-21-card-text-draft.md#E-big-illness) | typed stat | 相手mainの両値-2、ターン末/対象離脱で終了。除去なし。 | payments / effect_creation / effect_expiry |
| [E-boss](../91-event-21-card-text-draft.md#E-boss) | 即時draw/growth | 自他が各1draw、自分growth+5。 | payments / growth_runtime |
| [E-fateful-transform](../91-event-21-card-text-draft.md#E-fateful-transform) | typed payment | 次の自分transform軽減2。ターン末で終了。 | payments / payment_consumption |
| [E-final-time](../91-event-21-card-text-draft.md#E-final-time) | 即時移動/draw | 自捨て非main→山札下、成功時2draw→手札下。 | quick.resolve |
| [E-first-date](../91-event-21-card-text-draft.md#E-first-date) | 即時draw/growth | 自partner交際0なら1draw/+5。 | chain_resolution |
| [G-air-hockey](../83-play-batch-3-card-text-draft.md#G-air-hockey) | typed stat | 相手参加mainの選択値-2、この勝負限り。 | payments / challenge_lifetime |
| [G-animal-shogi](../83-play-batch-3-card-text-draft.md#G-animal-shogi) | 即時回収/山札操作 | 自捨てなかま→手札、自topを上下へ。 | discard_recovery.resolve_quick |
| [G-archery-3d](../79-play-batch-1-card-text-draft.md#G-archery-3d) | 即時敵装備除去 | 敵の準備枠の時2以下の装備だけ→捨て札。main除去ではない。 | payments.resolve |
| [G-area-claim](../85-play-batch-4-card-text-draft.md#G-area-claim) | 即時growth | 場の枚数による+10/+5。 | payments / growth_runtime |
| [G-asteroids-classic](../83-play-batch-3-card-text-draft.md#G-asteroids-classic) | 即時自装備除去/探索 | 自装備→捨て札、山札5公開、item回収、残り山札下。 | payments.resolve |
| [G-baseball-batting](../81-play-batch-2-card-text-draft.md#G-baseball-batting) | typed stat | 自参加mainちから+2、この勝負限り。 | payments / challenge_lifetime |
| [G-basketball-3d](../81-play-batch-2-card-text-draft.md#G-basketball-3d) | typed conditional | 次の自main勝利で消費、差2なら+10。ターン末/対象離脱で終了。 | payments / challenge_lifetime |
| [G-beach-volley](../85-play-batch-4-card-text-draft.md#G-beach-volley) | typed stat | 自mainちから+2、このターン限り。 | payments / effect_expiry |
| [G-hit-blow](../87-play-batch-5-card-text-draft.md#G-hit-blow) | 即時公開/draw/growth | 自topの宣言種類一致で手札/+5、違えば下へ/1draw。 | chain_resolution |
| [I-bond1](../77-current-items-card-text-draft.md#I-bond1) | 条件付き置換 | 敵効果による自なかまの手札/捨て移動を自身の捨てで置換。 | preparation / equipment_predicates |
| [I-bowtie](../77-current-items-card-text-draft.md#I-bowtie) | 開始誘発 | 手札2以下で1draw。新しい開始予約を作らない。 | trigger_connection / triggers.resolve |
| [I-c_coin2](../77-current-items-card-text-draft.md#I-c_coin2) | 即時公開/draw/growth | 自top公開→下、mainなら+5、それ以外1draw。旧予約なし。 | chain_resolution |
| [I-poop1](../77-current-items-card-text-draft.md#I-poop1) | 条件付き置換 | 敵main除去効果の発動が必要。その処理中の自main捨てを1回置換。 | preparation: explicit unsupported activation guard |
| [I-sleepboost1](../77-current-items-card-text-draft.md#I-sleepboost1) | 終了誘発 | 未挑戦/残り時2以上で2draw→手札下。残り時は条件で支払2ではない。 | triggers.resolve |
| [M-antlion-01](../55-insect-three-lines-card-text-draft.md#M-antlion-01) | 配置費軽減 | しかける費用-1、使用回数を記録。未来の予約は作らない。 | preparation / main_routes |
| [M-antlion-02](../55-insect-three-lines-card-text-draft.md#M-antlion-02) | コスト＋即時draw | 自伏せ準備→山札下を支払い、1draw。 | paid_draw / triggers.resolve |
| [M-antlion-03](../55-insect-three-lines-card-text-draft.md#M-antlion-03) | typed stat | 相手turnのquickで自main選択値+1、当ターン限り。 | trigger_effects / effect_creation |
| [M-antlion-04](../55-insect-three-lines-card-text-draft.md#M-antlion-04) | 登場誘発/即時回収 | 自捨てquick→自山札上。 | triggers.resolve |
| [M-antlion-05](../55-insect-three-lines-card-text-draft.md#M-antlion-05) | 登場誘発/即時draw | time_skip登場/準備空で1draw。 | triggers.resolve |
| [M-antlion-06](../55-insect-three-lines-card-text-draft.md#M-antlion-06) | コスト＋即時回収 | 自手札world→山札下、自捨てworld→手札。 | return_effects / trigger_effects |
| [M-antlion-07](../55-insect-three-lines-card-text-draft.md#M-antlion-07) | typed stat | 自分の挑戦条件で使用値+2、この勝負限り。 | payments.resolve_board_stat |
| [M-antlion-08](../55-insect-three-lines-card-text-draft.md#M-antlion-08) | コスト＋即時draw | 自捨ての異なるset/quick2枚→山札下、1draw。 | paid_draw / triggers.resolve |
| [M-beetle-01](../31-beetle-stagbeetle-card-master-migration.md#M-beetle-01) | 登場誘発/即時循環 | 自手札下→1draw。 | triggers.resolve |
| [M-beetle-02](../31-beetle-stagbeetle-card-master-migration.md#M-beetle-02) | 終了誘発/山札操作 | 自topを見て上下へ。 | triggers.resolve |
| [P-anglerfish](../74-partner-18-card-text-draft.md#P-anglerfish) | typed stat | 自挑戦/しんかいでmainちから+2、この勝負限り。 | payments.resolve_board_stat |
| [P-cat_ceo](../74-partner-18-card-text-draft.md#P-cat_ceo) | 交際開始誘発/即時循環 | 自手札下、成功時1draw。 | triggers.resolve |
| [P-cliff_goat](../74-partner-18-card-text-draft.md#P-cliff_goat) | typed payment | 次の同partner交際軽減1、当ターン限り。 | trigger_effects / payment_consumption |
| [P-desert_scorpion](../74-partner-18-card-text-draft.md#P-desert_scorpion) | 終了誘発/即時draw | 公開play条件で1draw。 | triggers.resolve |
| [W-city](../89-world-13-card-text-draft.md#W-city) | play枚数誘発/山札操作 | 2枚目playで自top上下。 | triggers.resolve |
| [W-countryside](../89-world-13-card-text-draft.md#W-countryside) | 終了誘発/growth | action1枚条件で+5。 | triggers.resolve / growth_runtime |
| [W-deepsea](../89-world-13-card-text-draft.md#W-deepsea) | 継続補正 | 手札2以下の間main両値+1。 | challenge.stats |

## 実行証拠へ結合するための未完条件

- 入力: 固定107デッキとの物理ID/card_id一致を、生成前edition・承認/lockを含む入力起点へ結合する（P13〜P16）。既存入力構造検査だけでは認証しない。
- 保存: 実際の全遷移で80物理札が保たれ、再登場metadataが同じcard_idであることを既存incarnationの実journal/initialと結合する。孤立した供給stateのcard一覧だけでは不十分。
- 意味/dispatch: 上表各handlerが本文以外のmain/companion除去、外部カード生成、旧reservations生成を行わないことをP07の全出力監査と実dispatch順へ接続する。現状はtyped寿命と一部効果まで。
- 機会: 全source/phaseの候補と見送り/失効の閉包に対して、この集合にない発動をunknownのまま保持し、0候補へ折り畳まない（P08/P09）。
- 観測されたreservations=[]、静的41種類一覧、候補唯一、同じexecutorの再実行だけでは上記を代替しない。

## 台帳への反映

新規実装必須IDを増やさず、P06/P08の条件付き項目を具体化した。I-poop1/I-bond1用の到達しないresolverを新設する前に、上記既存結合を閉じる。I-sleepboost1の旧対応表「支払2」は本文/実装とも異なり、残り時2以上の発動条件なので表を訂正する。新裁定・カード変更ではない。

独立read-only review: C0/I0/Minor1（上表/下表の誤記を訂正）。全41本文・section hash・typed2/7/1を照合。実行到達性/全handler適合/provenance/gateは対象外として維持。code変更なし、テスト再実行は不要。

### E-first-dateの対象世代/段階と解決全差分

cd22246からP07を継続。正本91の現在partner・厳格な交際段階0と、既存active_cardsの世代整合から対象を照合し、1draw/要求成長5/474実変化を独立導出。現在#2指定は成立、旧#1指定は#2へ移行せず不成立。交際1〜3/married・対象離脱も不成立。たまごだけではこのできごと自体を抑止しない。receipt/適用evidence/旧metadataを含む全stateと連鎖差分を比較し、交際段階の変更や追加drawを拒否。native・歴史pin不変。

TDD4FAIL→初回1FAIL（coverage未接続）→関連25PASS3.858s。独立review1回C0/I0/Minor0（reviewer4PASS1.094s）。空山札/成長100/outer/start/end/challengeも確認。design errors=[]、保護476件不変。世代の発生由来・発動/初期入力の認証をsupplied mappingの整合から主張しない。

次工程調査: 107内の装備はI-bond1/I-bowtie/I-sleepboost1の印刷時2であり、G-asteroids-classicが要求する印刷時3以上の自装備はない。G-archery-3dは時2以下装備を対象にできる。旧単体テストのtableを3へ変更したprobeは仮想契約試験であり107実到達証拠ではない。P06/P07/P08の条件付き閉包へ記録するが、この静的一覧だけで非到達/算入を認定しない。source集合固定・全物理保存・handler意味/全機会/入力認証との結合が必要。

管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次はG-archeryの実装備除去全差分と、G-asteroidsの107条件付き非到達の根拠を既存入口へ結合する。

Final frozen Python integration: Ran 22 tests in 163.351s, PASS. Full proxy regression/latest npm not claimed.


### 誘発辞退・現group全件不適用の供給差分

3721393からP07/P09を継続。decline_trigger_group/close_ineligible_triggersについて、実step recordとevent、現在offer、ineligibleの現在envelope hash、effective/final ledger、chosen/decisionを結合し、event_seq以外のgame/context/runtime全保持を監査。coverageの全実eventへ接続。後順位groupは保持し、現在groupの全件閉鎖と全ledger消滅を混同しない。不適用理由・選択起点自体の認証は別gateであり、occurrence_adjudication_proven/choice_origin_proven=false。

TDD: 初回3FAIL→関連13PASS0.779s。後順位保持テスト1FAIL→関連14PASS0.783s。decision対応テスト1FAIL→関連14PASS0.885s。修正前固定結合22PASS165.343s。独立review1回C0/I1/Minor0: 現groupが全件不適用の際、別actorの後順位declineへ飛べる結合漏れ。回帰5件中1FAIL0.694sを保存し、effective offerのactor/category/group_rankと元offerの一致・実行候補残存を要求して関連11PASS1.042s。独立reviewのI1を再review C0/I0に読み替えず、実装側修正検証として記録。全途中ログをverification/trigger-closure-effect-*に保存。

次工程: 既存終了時4sourceのpredicateを再利用し、open_turn_end_triggersの全対象/不成立一覧・一度だけの窓・全状態差分を結合する。現行batch_runnerがturn_endでこの入口を呼ぶことを確認済み。予約・全機会の閉包まで静的一覧で完了にしない。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

修正後固定Python結合: Ran 22 tests in 172.107s、PASS。修正後design errors=[]、保護正本476件不変。関連11はclosure/sequential/connection、修正前関連14とは組合せが異なる。


### 終了時4sourceの窓・全分類・全差分

bc2c376からP07/P09を継続。正本64・既存catalog/pinの下で、閉じたturn_endからopen_turn_end_triggersの1回窓を照合。trigger_predicatesの既存4source条件をend_conditionへ抽出して共用し、M-beetle-02/W-countryside/P-desert_scorpion/I-sleepboost1の成立/不成立を含む全一覧とeligibleを現状態・供給履歴から照合する。窓以外の資源/回数/typed/metadataは全保持。nativeは変更しない。

TDD3FAIL→関連13PASS1.211s。actual nativeの4source窓、負のclassification欠落、eligible欠落、余分な成長/時/ドロー/typed/usage変更、再開窓と不正境界を拒否。独立review1回C0/I0/Minor0（8PASS0.949s）。design errors=[]、保護476件不変。ログはverification/end-window-effect-*。

旧reservations非空は終了順未証明として拒否。履歴起点/全source到達性/全機会/承認は未証明のまま。次は既存開始時処理の通常/たまごドロー・時更新・回数更新と指定選択の供給差分結合を確認する。既存start/turn/policy bridgeを作り直さない。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定Python結合: Ran 22 tests in 165.421s、PASS。


### 開始時の通常/たまごドロー・時/回数更新の全差分

ea51e69からP07を継続。01/02/64の既存pinを再利用し、turn_startから通常1枚/たまご2枚を山札上から可能分だけ引くこと、時をroundへ置換すること、現actorのchallenge_used/person_placed/relationship_progressedのみFalseへ戻すことを全差分照合。通常は開始responseへ、たまごは既存egg_exchange_choice中間へ進む。相手・他資源/metadata/runtimeは保持し、非選択eventのselected_candidateはNone必須。nativeは変更しない。

両actor、main/egg、deck0/1/2/4、R1/5/10と不正変更を実next_turnの中間snapshotで確認。TDD3FAIL→fixtureの既存end_scope不足による3ERROR→本来scope再利用で13PASS→R5/10追加で14PASS1.054s。独立review1回C0/I0/Minor0（新規4PASS0.786s）。その後の自己確認で非選択receiptチェック不足を発見し、追加回帰4件中2FAIL→関連14PASS1.125s。独立review結果を後続修正の再reviewとしては扱わない。

receipt修正前の固定22+既存完走unit1は23PASS272.327s。途中で停止を試みたがプロセスを中断できなかったため、Pythonを凍結したまま完了を待った。結果は修正前として保持し、最終結果へ読み替えない。ログはverification/start-draw-effect-*。

旧reservations非空は開始処理順が未閉包のため拒否。前終了/起点認証・全開始義務・たまご選択自体は未証明のまま。次は既存465のframe/選択/適用結果とegg_exchange_bottom全差分を結合する。既存policy bridge、再登場projection、通常/response policyの範囲は維持する。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

最終receipt修正後の固定22+既存完走unit1: Ran 23 tests in 267.585s、PASS。最終design errors=[]、保護476件不変。


### たまご交換の指定選択と実移動の全差分

a0a1842からP07/P12を継続。policy_journalの既存通常draw prefixをegg_entryへ抽出し、実turn_startから465 frameを保持。egg_exchange_bottomでprepare(frame)の選択直前状態と実beforeを照合し、既存apply_choiceの全結果をlife.project/restoreで現metadataへ戻して全after/contextを照合する。decision/local evidence/eventのselectedと選択physical detailを結合し、無選択時はcallback0を要求。native、指定policy、再登場定義は変更しない。

TDD2FAIL→関連12PASS1.732s。選択physical detail改変を追加して3件中1FAIL2.565s→結合を補い関連16PASS3.909s。両actor、通常/不足/空山札、手札空、欠落/重複callback、異なる選択・前提frame・山札順・資源/metadata/runtime/context改変、journal hookを検証。独立review1回C0/I0/Minor0（新規3PASS2.785s）。前bundleのstart draw非選択receipt修正も現コードで確認された。design errors=[]、保護476件不変。ログはverification/egg-choice-effect-*。

供給frameの実境界への結合であり、外部由来の認証・指定policy入力lock・全開始機会の閉包ではない。次はターン交代/R10終端の先後・round・比較と全state差分を既存境界へ結合する。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22+既存完走unit1: Ran 23 tests in 274.601s、PASS。


### 先後に従うターン交代とR10終端の全差分

7e2c5e9からP07を継続。01/06/64 pinの下で、閉じた終了境界・typed期限処理済み・旧予約空から、先攻終了ではround保持、後攻終了ではround+1、R10後攻終了では延長せず公開growth比較を照合。非選択receiptと結果全項目を結合し、交代/終端以外の全state/runtimeを保持する。交代時に時・回数・drawを先取りしない。実trigger_window callerの既存initialからfirst_playerを渡し、欠落や不一致を拒否。native変更なし。

TDD3FAIL→関連14PASS1.101s。100対100/100対95/95対100/0対0は供給score-edgeの条件付き差分として追加し15PASS1.025s（保存歴史の改変・真正な対戦結果ではない）。実next_turnと既存405/metadata終端で両先後・R1/9/10、余分なdraw/growth/time/reset、actor/round/context/usage/選択/結果改変とcoverage接続を検証。独立review1回C0/I0/Minor0（新規4PASS0.598s）。design errors=[]、保護476件不変。ログはverification/turn-finish-effect-*。

先後入力起点・終了全義務・早期100維持履歴は別gate。次は既存victory_history/end_victoryの実公開履歴判定を再利用してmaintained100終端と、勝つべき終了で誤って続行する枝を結合する。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22+既存完走unit1: Ran 23 tests in 269.863s、PASS。


### 100維持の早期終了・誤続行拒否と公開履歴終点

c1449eaからP07/P11を継続。既存victory_history/end_victoryの全公開履歴再構築を再利用し、maintained100_final_comparisonの候補・結果と全状態差分を照合する。100でも将来の相手ターン終了前は続行でき、成立済みなら誤って次ターンへ進む枝を拒否する。R10早期終了は禁止。既存turn_finishの閉じた終了境界をclosed_endへ意味を変えず抽出した。coverageは既存initial snapshotsを受け渡し、現在eventを追加する前に供給履歴と照合する。

終点snapshotのcontinuationだけでは、game側100と実before側95の食い違いを受理できたため追加TDDで再現し、gameとcontinuationの双方を実beforeへ結合した。TDD4FAIL→関連18PASS1.244s、終点追加5件中1FAIL0.356s→関連19PASS1.278s。独立review1回C0/I0/Minor0（新規＋turn finish9PASS1.147s）。固定22＋既存完走unit1は23PASS278.417s。design errors=[]、番号付き保護正本476件不変。失敗・修正・成功ログはverification/early-finish-effect-*に保存。

供給履歴の整合性検査であり、履歴起点・先後の外部認証、終了六段階全義務、全ルール機会の証明ではない。相手の次ターン未到来例は合成した条件付き履歴であり真正な本番結果ではない。次は手札即時カードの既存normal/response発動入口で、費用・手札除去・chain・contextの全差分結合を確認する。新たな管理項目を追加せず既存P07/P11の未閉包を具体化した。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。


### 手札即時カードの支払・発動zone・chain全差分

3ee8a70からP07を継続。既存手札15source集合とpin済みtable/本文から費用とaction typeを読み、通常/responseの実支払、手札からの除去、physical identity・対象・variantを含むlink、context、他state全保持を照合する。119の既存transitionを再利用し、state machine/nativeを作り直さない。coverageへ全event接続。個別発動条件と選択起点は別の既存監査であり、このproofではfalseを維持する。

TDD3FAIL→初期response fixtureの資源不一致2ERROR→初期条件へ修正後10件中1FAIL。response sourceを未知IDへ改変すると非適用になる抜けを再現し、拒否へ修正して関連13PASS4.156s。I-c_coin2/G-hit-blowの実normal/response、先行pass0/1、時/成長/手札/runtime/priority/chain/receipt改変とcoverageを検証。独立review1回C0/I0/Minor0（新規3PASS0.316s）。ログverification/hand-activation-effect-*。全15source到達試験完了・全個別条件の証明とは扱わない。

次工程調査: M-antlion-02/08の既存paid_draw入口はsource costの準備札/捨て札→山札下と使用回数を実行し、既存replayもある。これを独立した費用・全差分監査へ結合する余地が残る。C-cat_friend/M06の支払も別入口である。管理項目追加なし、既存P07の未閉包を具体化。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 277.276s、PASS。design errors=[]、保護476件不変。


### M-antlion-02/08の発動時支払・使用回数と全差分

04d0804からP07を継続。M02の自分の伏せ準備1枚、M08の捨て札の異なるセット可能札/クイック札2枚を正本table/既存分類から照合し、準備/捨て札→山札下の支払順序、M02公開準備metadata消去、once使用記録、activation receipt、119/context、その他全state保持をcoverageへ結合した。normal/response、M08両順序を実既存入口で検証。選択起点認証・全機会はfalseのまま。

TDD2FAIL→fixtureの既存references.scope不足で1FAIL1ERROR→本来scopeを再利用して関連9PASS1.005s。余分な成長にhashを付け直したcoverage拒否を追加し関連10PASS1.009s。支払/対象/使用回数/receipt/context/時/成長/main/turn/face改変を拒否。独立review1回C0/I0/Minor0（新規3PASS0.525s）。ログverification/paid-activation-effect-*。native/policy/119は変更しない。

次はC-cat_friendのsource自身をコストで山札下へ移す発動入口とM06の手札world支払を既存処理へ結合する。前者は付属装備・typed対象離脱、後者は発生機会groupとの結合があり、今回のM02/08監査からは分離する。課題追加なし、P07内の未閉包を具体化。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 279.965s、PASS。design errors=[]、保護476件不変。


### C-cat_friendの本人支払・付属装備・typed離脱と全差分

502a09bからP07を継続。既存descriptor/target条件と供給当該手番履歴を再利用し、本人の山札下移動、装備の準備→捨て札membershipとmetadata消去、本人対象のstat/conditional消去、usage、source_cost/activation receipt、119/context、その他全state保持をcoverageへ結合した。通常/response、装備0/1/2枚、供給typed行の離脱を実既存入口で確認。指定policy/nativeを変更しない。

TDD2FAIL→関連5PASS0.832s。typedとcoverage回帰を加え関連14PASS1.293s。本人/山札/捨て札/装備/時/成長/usage/receipt/対象/同名対象/重複使用/支払/chain改変を拒否。独立review1回C0/I0/Minor0（新規4PASS0.530s）。ログverification/cat-activation-effect-*。

装備複数離脱時は既存捨て札prefixと追加membershipのみを照合し、末尾順序を正本由来と見なさない。equipment_discard_order_proven=false、順序交換例も全体nullのまま。供給typed fixtureは初期状態からの到達性を証明しない。履歴起点・選択認証・全機会も未証明。

次はM06を含む既存positive4sourceのgroup発動で、実chosen/occurrenceと支払・使用記録・全差分を結合する。課題追加なし、既存P07内の未閉包を具体化。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 282.212s、PASS。design errors=[]、保護476件不変。


### G-air-hockeyのgroup所有者bridgeと実選択記録の結合

ea40f33から次のgroup発動を調査中、04d0804の手札全差分監査がG-air-hockeyの既存group-owner bridgeを通常response優先者違反として拒否する回帰を発見した。既存hand_timingの7テスト中3ERROR3.334sで再現。これは通常responseの実支払監査をgroup発動へ接続した入口差の検証不足であり、先の固定23PASSを全枝成功に読み替えない。

group_activation_bindingは実recordのbefore/after/event、prior/effective ledger、現在group actor/category/rank、chosen/decision、occurrence消費とeventを結合する。既存ledger algebraを再利用。G-air-hockeyの該当hand groupだけで所有者/発生originへのbridgeを許容し、その後の費用/link/119/全state監査は維持する。native・通常response・policyは変更しない。coverageは実trigger_recordsを渡し、欠落/重複/改変を拒否。

修正後既存＋手札10PASS4.172s。実connected groupを使う追加回帰は最初scope不足1FAIL（16件6.019s）→既存contract_scopeをruntime.operation外側へ戻して関連16PASS5.736s。record欠落・decision/chosen/origin/consume/rank/actor/event改変、余分な成長を拒否。独立review1回C0/I0/Minor0（新規＋既存hand timing8PASS5.719s）。ログverification/hand-group-effect-*。

管理項目22は維持し、既存P07/P09の入口差に関する具体的修正を記録した。未完が具体化した理由はpositive groupのdispatchを辿って既存hand bridgeを見つけたため。次は当初のpositive4source発動と実group記録・全差分の結合へ戻る。個別発動条件・occurrence/選択起点認証・全機会は未証明、preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 282.118s、PASS。design errors=[]、保護476件不変。


### positive4sourceのgroup発動・M06支払・usageと全差分

ea4b1c0からP07を継続。M-antlion-03/M-antlion-06/C-bat/P-cliff_goatの実sequential group recordをgroup_activation_bindingへ結合し、既存current_actionsの条件・費用/対象を再利用してM06手札world→山札下、全4source usage、physical link/receipt、119/context、他state全保持をcoverageへ接続。通常response priorityと異なるgroup所有者を保持する。native/policy/ledger/119を作り直さない。

TDD2FAIL→関連15PASS5.842s。M06がquick解決後normal_actionへ戻った地点からgroup発動する枝は追加3件中1FAIL0.968sで再現し、実group必須・M06・空chainに限定して許容した。receipt/usage/時/成長/支払/山札/対象/priority/origin/decision/consume/記録欠落とcoverage改変を拒否。既存unit-only入力による条件付き実group recordであり、本番seed/入力生成ではない。

追加window試験8件3ERROR2.514sを発見。変更前HEADのcoverageをoverlayしても同じ3ERROR2.588s（旧standaloneで474growth adapterなし2件、cat fixture開始履歴なし1件）。現行challenge_window wrapperと明示fixture-only開始prefixへ接続し、proof生成もcontract_scopeをruntime.operation外側に置いて揃えた。中間4ERROR0.649s（proof生成scope不一致）→8PASS9.615s。既存assertion維持、旧source hash/manifest/本文は変更しない。これを履歴真正性の証明へ昇格しない。

最終関連25PASS15.630s。独立review1回C0/I0/Minor0（新規＋positive window8PASS10.480s、fixture移行が既存assertionを維持することも確認）。全試行ログはverification/positive-activation-effect-*。今回の未閉包具体化は、実dispatchを複数入口で検証しnormal復帰枝・古いfixture入口差を見つけたため。管理項目22維持。次は開始/到着/終了/挑戦の既存無支払board group発動と全差分を同じ実recordへ結合する。

occurrence/選択起点・全機会は未証明。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 278.061s、PASS。design errors=[]、保護476件不変。


### 無支払board13sourceのgroup発動・強制pending・全差分

555611bからP07を継続。開始C-chicken/I-bowtie、既存到着/終了9sourceと挑戦M07/P-anglerfishのgroup発動を、実record/ledger/選択、既存catalogのphysical identity・無支払link・receipt、119/context、全state保持へ結合した。P-cat_ceoの強制singletonはdecisionなし、既存pending有/無の両入口でpending消去・index1を維持する。個別条件/全13到達/起点認証は別gate。

TDD2FAIL。単体fixtureで既存fallbackが辞退するための2FAIL0.095s/2FAIL0.122sを保存後、条件付き選択のtest-only注入（fixture_only=True）へ明示変更した。選択/seed由来は証明しない。実policyを使う既存sequential/hand/positive結合は維持。I-bowtieにbatch分類がない1FAIL0.364sを既存starts.catalog参照へ修正。関連19PASS14.471s。

独立review1回C0/I1/Minor0。I1はM-antlion-07のcandidate_variantをNone固定し、実power/wisdomの適正group発動を拒否する点。action identityとlinkの両方へ宣言済みparameterを結合する必要があった。既存challenge_fixture＋実adapter/stepで4件中1FAIL0.831sを再現し、M07だけ宣言parameter、P-anglerfishはNoneとして修正。実装者の修正後検証は関連23PASS15.326s。review結果をC0/I0へ読み替えない。

最初の固定結合session14463はexec-server transport切断で消失。部分logは点のみ、再開不能・復旧環境で実行中unittestなしを確認。design起動も失敗した。Pythonは既知の実行中に変更していない。部分logを最終PASSへ読み替えずinterruptedとして保持し、修正後に全固定結合/designを再実行。経緯はverification/board-group-effect-interruption.md、全試行ログはboard-group-effect-*。

次はこれまでの非resolution全差分監査を実eventへ結合し、未対応dispatchを列挙する。静的一覧や条件付き検証を全source/機会証明へ昇格しない。管理項目22維持、今回の具体的未閉包は挑戦variantの専用経路とテスト入口差を辿ったために判明。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1の再実行: Ran 23 tests in 277.472s、PASS。修正後design errors=[]、保護476件不変。切断した最初の試行は未完了のまま保持する。


### 非resolutionの実eventと全差分監査の結合

9ae00bbからP07を継続。既存resolution_semanticsと併用して、供給traceの全非resolution eventをbefore/after/event hashでローカル全差分監査へ結合した。移動・各配置・挑戦宣言/比較/終了・交際・pass・誘発閉鎖・開始/終了・各発動・期限切れ・指定egg choiceを対象とする。欠落/別event/余分/同family重複/failedとtrace断裂を拒否し、connected_entryへ必須接続した。

旧expiry/challenge_lifetime/payment_consumptionにはevent digestを追加。paymentのmovement枝は部分監査のため全delta代替に使わず、全afterを比較するrelationship枝だけfull_delta_applicableとsupplied_relationship_verifiedで採用する。実executor/既存scopes/native/歴史hash/manifestは変更しない。

TDD3FAIL0.001s→関連25PASS8.389s。独立review1回C0/I0/Minor0、新規3件を独立実行PASS2.763s（Python変更なし）。固定結合は別logで完了判定する。design errors=[]、保護476件不変。全試行ログはverification/nonresolution-semantics-*。

ローカル監査出力の真正性・全source到達・全機会を認証するものではない。今後の未対応dispatchは欠落として拒否し、未知をno-opへ置換しない。次は実dispatcherの全枝と現在の全差分familyを照合し、107物理集合・既存lifecycle・旧reservations/置換条件の結合に残る具体的な穴を列挙する。管理項目22維持。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 272.690s、PASS。供給された既存unit traceで未監査の非resolution eventは検出されなかった。全source/phase到達試験とは扱わない。
