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
