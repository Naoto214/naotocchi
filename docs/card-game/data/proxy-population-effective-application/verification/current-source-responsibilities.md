# 現行107・41sourceの機会／作用責務

固定読取基準d3338d44b4bd356c95e7362a60e2fb3414ae3d01（tree e934f487fb39d8c468773005e9aa50812013f22b）。正本文の作用はplans/2026-10-08-preflight-source-closure.md、物理／初期／全出力の接続はcurrent-source-closure-composition.mdを再利用する。この表は実装の引受け先の対応であり、新catalog、到達性証明書、実入力認証、preflight-ready宣言ではない。

## 読み方と共通責務

以下の短いmodule名は原則tools/proxy_population_*.pyを示す。preparationだけはproxy_continuation_preparation.py、sequentialはproxy_population_trigger_sequential.pyの略記。audit_start／audit_end／audit_latched／audit_challengeとarrivalの各predicateはtrigger_predicatesの関数である。各行は主要な能力機構を一つ割り当てるための排他的分類であり、全能力の排他的分割ではない。全41札に通常の配置／使用可否と物理保存がある。G-air-hockeyの手札誘発、typed10種の生成／寿命、継続補正、解決中の指定選択を追加の作用として明示する。

- 通常入口: source_inventory.audit_normalの実source6family、candidate_expansionsの現物／variant／対象、core_predicates・hand_predicates・board_predicatesの成立／不成立をdecision_binding.require_current_predicatesが合成。hand/boardの全対象とcost_alternativesは別監査を再利用。
- 反応入口: source_inventory.audit_response・response_expansions、response_predicates、board_predicates、prepared_predicatesのequipment検査、response_group_closureの被覆をchallenge_windowで合成。発生していないものと、発生後に消費／見送り済みのものを区別。
- 公開source: trigger_predicates._public_sourcesが両ownerの全公開slotから別照合。伏せidentityは読まない。nativeのunproved_sourcesは「native外」の集合であって、以下の別責務を受けずに全機会既証明へコピーしない。
- 機会: native11はtrigger_predicates._collection、開始2は_start_collection、latched4はtiming_occurrence、手札1はtiming_occurrence.audit_hand。coverageが初期＋全eventのfresh監査を保存し、trace_obligationsが順序付き実境界へ結合。
- 順序: opportunity_order、sequentialの再列挙、trigger_closure_effect、response_group_closure、end_dispatch、automatic_binding。未証明origin・残るpending・deferredは空集合とみなさない。
- 全出力: resolution_semantics／nonresolution_semanticsは実eventを全差分監査へ接続。カード個別の解決監査は下表。発動条件・選択根拠は解決差分だけでは証明しない。

## 全41種類の引受け先

| source | 主機構 | 機会／現在predicate | 解決・追加作用の引受け先 |
|---|---|---|---|
| C-bat | latched | timing_occurrence / audit_latched / closed group | return_effects、positive_activation_effect、相手公開履歴の伏せID除去 |
| C-box | passive | board_predicatesの能力なし否定 | person_placement_effect / departure_orderの通常移動 |
| C-cat_friend | activated | board_predicatesの公開捨て対象全件／self支払／使用回数 | cat_activation_effect / zone_effects |
| C-chameleon | passive | board_predicatesの継続能力否定 | challenge_operandsの両world補正、public_applicationの公開適用証拠 |
| C-chicken | start | start capture/collection / audit_start / closed group | board_group_effect / reveal_effects。空山札でも開始機会は省略しない |
| E-big-illness | quick | hand_predicates / response_predicates | hand_activation_effect / typed_resolution、stat期限／対象離脱 |
| E-boss | quick | 公開敗北条件、通常／反応hand predicate | immediate_growth、双方draw、474実増加 |
| E-fateful-transform | quick | own main条件、通常／反応hand predicate | typed_resolution、payment_consumption／effect_expiry |
| E-final-time | quick | 公開捨て非main対象、同名使用、既存条件 | designated_effectsの捨て→下／draw／指定手札下 |
| E-first-date | quick | 現partner対象の合法性、119比較前提は別 | first_date_effectの同世代／段階0、draw／474 |
| G-air-hockey | quick | 反応hand predicate＋timing_occurrence.audit_handの実勝負起点 | typed_resolution、勝負stat期限、パラメータ選択は指定外116 |
| G-animal-shogi | quick | 公開捨てなかま対象、通常／反応hand predicate | quick_recovery_effect、回収／top上下の旧選択 |
| G-archery-3d | quick | hand_predicatesの自world条件＋equipment_effects.targetsの敵公開時2以下装備 | equipment_effectsの装備離脱全差分 |
| G-area-claim | quick | 発動時7枚以上（114/127）、通常／反応hand predicate | immediate_growthの解決時盤面枚数／474。解決時6枚0を保持 |
| G-asteroids-classic | quick | 自公開装備の印刷時3以上対象 | 固定107装備は時2、条件付き非到達。handler登録だけで全解決証明へ昇格しない |
| G-baseball-batting | quick | 現勝負／参加main、反応hand predicate | typed_resolution、勝負stat期限 |
| G-basketball-3d | quick | own main、通常／反応hand predicate | typed_resolution、challenge_lifetimeの次勝利消費／差2追加報酬／対象離脱 |
| G-beach-volley | quick | 公開なかま適用履歴、通常／反応hand predicate | typed_resolution、turn stat期限／対象離脱 |
| G-hit-blow | quick | 7宣言全件、未公開topは候補に使わない | quick_reveal、公開分岐／474。比較成長はunknown |
| I-bond1 | replacement | prepared_predicatesの全公開link・敵なかま移動否定 | 配置／通常離脱は到達。敵なかま移動は固定107本文集合で条件付き非到達 |
| I-bowtie | start | start collection / audit_start / closed group / 元開始条件不成立 | board_group_effect / draw_effects、公開装備配置・離脱 |
| I-c_coin2 | quick | 通常／反応hand predicate | quick_reveal、公開top／下／分岐。比較成長はunknown |
| I-poop1 | replacement | concealed slotと全公開linkのmain除去否定 | prepared_placement_effect。起点は固定107本文集合で条件付き非到達、unsupported guard保持 |
| I-sleepboost1 | native | end_condition / audit_end / end window / closed group | designated_effects、公開装備配置・離脱。時2は条件で支払でない |
| M-antlion-01 | passive | cost_alternativesの任意軽減全選択、使用回数 | main_routes / preparation、通常main移動の支払／全差分 |
| M-antlion-02 | activated | board_predicates＋自伏せ支払全選択 | paid_activation_effect / draw_effects |
| M-antlion-03 | latched | timing_occurrence / audit_latched / closed group | positive_activation_effect / typed_resolution、turn stat期限／対象離脱 |
| M-antlion-04 | native | arrival / 公開捨てquick全対象 / closed group | board_group_effect / zone_effects |
| M-antlion-05 | native | arrival / time_skip・準備空 / closed group | board_group_effect / draw_effects |
| M-antlion-06 | latched | timing_occurrence / audit_latched / closed group | positive_activation_effect / return_effects、自手札world支払 |
| M-antlion-07 | native | audit_challenge、world変更／公開quick適用 | board_group_effect / typed_resolution、勝負stat期限 |
| M-antlion-08 | activated | board_predicates＋公開捨て異なる2現物の全順序 | paid_activation_effect / draw_effects |
| M-beetle-01 | native | arrival / closed group | board_group_effect / designated_effectsの手札下→draw |
| M-beetle-02 | native | end_condition / audit_end / end window / closed group | board_group_effect / designated_effectsのtop上下 |
| P-anglerfish | native | audit_challenge、しんかい／参加main | board_group_effect / typed_resolution、勝負stat期限 |
| P-cat_ceo | native | relationship強制機会／main有無 / closed group | board_group_effect / designated_effectsの手札下→draw、解決時たまご抑止 |
| P-cliff_goat | latched | timing_occurrence / audit_latched / closed group | positive_activation_effect / typed_resolution、同partner交際軽減消費／期限 |
| P-desert_scorpion | native | end_condition / audit_end / end window / closed group | board_group_effect / draw_effects、partner_drawの解決時たまご抑止 |
| W-city | native | 公開turn境界／2枚目playの独立origin / closed group | board_group_effect / designated_effectsのtop上下 |
| W-countryside | native | end_condition / audit_end / end window / closed group | board_group_effect / immediate_growth。pass／配置の現在eligible時delta0比較はunknown |
| W-deepsea | passive | board_predicatesの継続能力否定 | challenge_operandsの手札枚数による継続補正、world配置全差分 |

主要分類の内訳はnative11／start2／latched4／activated3／passive4／replacement2／quick15＝41。手札誘発1とtyped10は重なる作用であり、42種類や51種類へ数え直さない。typed内訳はpayment2（E-fateful-transform、P-cliff_goat）、stat7（E-big-illness、G-air-hockey、G-baseball-batting、G-beach-volley、M03、M07、P-anglerfish）、conditional1（G-basketball-3d）。生成・消費・失効・その他event保存則をeffect_creation／payment_consumption／effect_expiry／challenge_lifetime／main移動監査へ結ぶ。

## CARD外の機会と実初期起点

初期配札／通常draw／初回たまご指定選択はinitial_obligations。以後のturn開始draw／たまご選択、通常main移動／人物・world・準備配置、交際、挑戦宣言／勝負／終了、pass、終了窓、期限消去、終了後引渡しはnonresolution_semanticsの各familyへ対応する。初期typed空領域はaudit_runtime_root、指定policyのcallback／母数／originはpolicy_journal、物理80／再登場はsource_conservation。各実eventで敵人物・旧reservations不変条件をsource_root.check_transitionが検査する。400戦入力の外部由来／結果前lockとは別。

対応表に未割当sourceはないが、これは全合法な未来の操作が正しく実行されることの証明ではない。G-asteroids／I-poop／I-bondの非到達は固定本文集合・正しい初期状態・本文準拠遷移に依存する。実入力認証／全出力／機会閉包の共通gateへ結合する前に、観測0や条件付き否定を全体認証へコピーしない。

## 次の合成境界

P09のsource責務表は本書を入口とする。P10の実read表、P11の比較operand根拠／明示unknown、P14–18の外部承認・generation package・edition・停止保存・共通gateが残る。既存adapter／collector／全差分監査を増設し直さない。準備と対戦適格性は別であり、唯一候補・非fallback・再現一致を適格根拠にしない。preflight-ready=false、生成／固定／400戦0。

独立read-only review1回: C0/I0/Minor2。module略記とG-archery自world条件の引受先を訂正。41種類の主要分類／typed重複／全機会へ昇格しない境界に指摘なし。コード変更・テスト再実行なし。
