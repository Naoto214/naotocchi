# 400戦準備: handler・validator・入力条件の横断監査

基準: a33d7a6。107の41種類/80物理カード。実装の入口を読んだ対応表であり、全意味・全機会の証明書ではない。残課題の分類・完了条件は[残課題台帳](2026-10-08-preflight-remaining-work.md)を正とする。ここで「存在」は実handlerの所在、「未接続」は要求する証拠との結合不足を指す。新handlerをすべて作り直す一覧ではない。

## カード別の実handlerと不足

以下のモジュール名は `docs/card-game/tools/` 内、拡張子 `.py`。表の全行にP07/P09/P10の全意味・全機会・許可情報実使用の合成が残る。typed生成/寿命や現在predicateが済んだ行も、この共通残件を省略しない。

| 107 source | 既存の主な実入口 | 特有の残件/完了条件 |
|---|---|---|
| C-bat | proxy_population_trigger_effects.resolve | 相手手番での自分quickプレイが起点（適用成功は不要）。準備札→手札の全差分を監査へ接続、全発動起点は別gate |
| C-box | 能力なし。通常配置は既存actions | 能力なしと配置/交換/離脱の機会を区別 |
| C-cat_friend | proxy_population_discard_recovery.activate_normal / activate / resolve | 解決の全差分をzone_effectsへ接続。本人支払・装備離脱の発動起点/全機会は別 |
| C-chameleon | proxy_continuation_challenge.stats | 公開両worldの同名/異名/片欠けによる数値根拠。履歴/状態起点は別 |
| C-chicken | proxy_population_start_effects.resolve_chicken、trigger_connection.resolve | 開始時capture・公開top・空山札・drawの結合 |
| E-big-illness | proxy_continuation_payments.resolve | typed生成/対象離脱/当ターン失効済。解決全体と数値参照の結合 |
| E-boss | proxy_continuation_payments.resolve | 先のmain敗北・両者draw/成長・474上限の各部分 |
| E-fateful-transform | proxy_continuation_payments.resolve / batch.transition | typed生成/次変身消費/期限済。実費用算定と行動全体 |
| E-final-time | proxy_continuation_quick.resolve | 対象draw後bottom選択の旧116、空/部分解決 |
| E-first-date | proxy_population_chain_resolution.resolve_top | 現partner個体・解決条件・成長/draw・旧119比較operand |
| G-air-hockey | proxy_continuation_payments.resolve | typed生成/この勝負期限済。公開の現在値条件と解決全体 |
| G-animal-shogi | proxy_population_discard_recovery.resolve_quick | 捨てなかま回収・top順選択。recovery.scope登録を欠落と誤認しない |
| G-archery-3d | proxy_continuation_payments.resolve | 対象移動・残る装備/個体・部分解決と不適正 |
| G-area-claim | proxy_continuation_payments.resolve | 発動時7枚以上裁定と解決時6→0を分離、474差分 |
| G-asteroids-classic | proxy_continuation_payments.resolve | 公開複数枚・指定mandatory選択・戻す順・空山札 |
| G-baseball-batting | proxy_continuation_payments.resolve | typed生成/勝負終了済。現在値の発動条件と使用値 |
| G-basketball-3d | proxy_continuation_payments.resolve / consume_win_rewards | 次勝利で消費・差2だけ追加報酬済。過去生成/全機会 |
| G-beach-volley | proxy_continuation_payments.resolve | typed生成/当ターン失効済。対象維持と解決全体 |
| G-hit-blow | proxy_population_chain_resolution.resolve_top | 宣言型と公開top分類・一致時draw/成長。未公開topの選択利用禁止 |
| I-bond1 | proxy_population_departure.replace_companion 等の離脱/装備処理 | 自分の交代・コスト・山札移動を防がない。敵除去routeが到達するかを別証明 |
| I-bowtie | proxy_population_trigger_connection.scope / resolve → triggers.resolve | 開始捕捉群と付属対象、生存/離脱、1draw |
| I-c_coin2 | proxy_population_chain_resolution.resolve_top | 公開top分類・底へ戻す・分岐draw/成長。旧予約の再導入禁止 |
| I-poop1 | preparation.transitionで設置。preparation.response_inventoryは置換発動境界を拒否 | **置換resolverを完全接続済みとしない**。107から敵main除去発動の到達不能をsource/dispatch全域で証明するか、到達時は既存裁定から接続。除外を成功に数えない |
| I-sleepboost1 | proxy_continuation_triggers.resolve | end条件（残り時2以上、時2の支払ではない）・2draw後bottom・指定mandatoryと期限 |
| M-antlion-01 | proxy_continuation_preparation.transition のcost_modifiers | 任意軽減の選択/実費用/1ターン使用記録。main自身のbirth/transformは現行main_routes.scope→既存batchへ接続済み、旧play_main_birthの監査も追加（P22） |
| M-antlion-02 | proxy_population_paid_draw.scope → triggers.resolve | 自伏せ底への支払と1draw、全コスト候補・機会 |
| M-antlion-03 | proxy_population_trigger_effects.resolve | typed生成済。解決時parameter指定policyと実使用/起点 |
| M-antlion-04 | proxy_continuation_triggers.resolve | 捨てquick→top/対象不適正の全差分をzone_effectsへ接続。到来/伏せなしの起点・全機会は別 |
| M-antlion-05 | proxy_continuation_triggers.resolve | time_skipのみ・装備含む準備空とdraw |
| M-antlion-06 | proxy_population_trigger_effects.resolve | quick実適用→手札world支払→捨てworld回収。供給済み解決の全差分を監査へ接続、発動/支払起点は別gate |
| M-antlion-07 | proxy_continuation_payments.resolve_board_stat | typed生成/終了済。world変更・quick実適用・宣言の全履歴 |
| M-antlion-08 | proxy_population_paid_draw.scope → triggers.resolve | 異なる2枚の支払順・型条件・1draw |
| M-beetle-01 | proxy_continuation_triggers.resolve | birth由来・hand bottom後draw・指定mandatory |
| M-beetle-02 | proxy_continuation_triggers.resolve | 現個体が当ターンtime_skip入場でない条件・top/bottom |
| P-anglerfish | proxy_continuation_payments.resolve_board_stat | typed生成/終了済。deepseaと自宣言の条件・個体 |
| P-cat_ceo | proxy_continuation_triggers.resolve | 登場の任意手札支払→draw、指定mandatory |
| P-cliff_goat | proxy_population_trigger_effects.resolve / relationship_payment | typed生成/同partner交際消費済。全関係の数値根拠、成長100到達は既存拒否継続 |
| P-desert_scorpion | proxy_population_partner_draw.scope → proxy_continuation_triggers.resolve | end時の表向きあそび/あいてむ履歴・1ターン制限。1draw全差分と解決時たまご抑止を接続、起点/全機会は別 |
| W-city | proxy_continuation_triggers.resolve | 登場起点/公開top選択の指定mandatory |
| W-countryside | proxy_continuation_triggers.resolve | end条件と成長5/474上限/誘発の結合 |
| W-deepsea | proxy_continuation_challenge.stats | hand2以下の即時再適用/解除と両値補正 |

### 旧予約・非到達の扱い

`proxy_reservation_pilot`は既存の固定transcriptの追跡器であり、現行全sourceの一般resolverではない。107内の期限付き効果は上表のtyped群へ登録されているが、それだけで旧予約生成が全到達状態で不要と証明した扱いにはしない。P06の完了には、全source本文の遅延句・移動先・起点から生成先を対応し、旧予約が非到達ならその根拠を閉じる必要がある。空のreservationsを要求するguardが通った事実も代替証明ではない。

## validatorと入力認証の不足

| 既存入口/validator | 現在確認すること | 完了に必要な追加結合（全て必須） |
|---|---|---|
| source_inventory / *_predicates / *_expansions | 現在source/候補/条件・早期不成立 | P08: 到達集合と全源、P10: 実際に読む情報の許可 |
| decision_binding / selection_basis | 実recordとの対応と114/116/119の計算 | P11: 数値operandの正本由来、未知の扱い。非fallbackだけで証明しない |
| automatic_binding | forced出力とevent/envelope/snapshot/choiceの対応 | P07: dispatch優先順位と各効果の全意味 |
| resolution_choices / resolution_order | 逆順解決/選択義務 | 発動適法・対象・各部分の実結果。選択義務なしを効果証明にしない |
| trigger_coverage / latching / existing / starts / sequential | 供給起点と保存ledger/実行の整合 | P09: 正本由来の全機会の欠落がないこと、最初の機会/失効/見送り |
| typed生成/消費/失効/挑戦lifetime | 供給遷移上のexact行変更・他状態保持 | 過去生成起点、型以外の効果全体、全履歴の認証 |
| generation_entry | local edition/fresh remote/履歴registryを確認して生成するAPI | P13: 非空approval_referenceは認証ではない。生成前の権限主体・対象・失効・再利用防止。現状APIを本番に呼ばない |
| generation_journal / generation_package | byte列/順序/保存内容の整合 | P14: OS実生成の由来・結果より前の信頼時系列。合成fixtureを認証へ昇格しない |
| input_lock.verify_git_binding | local commit/blobの不変内容 | P15: remote完全package、事前edition、承認対象・時系列。返すinput_lock_verifiedはfalse |
| remote_publication.verify | fresh exact-ref/commit/tree一致 | 承認・生成由来・結果前固定は証明しない。既存機能を再実装しない |
| attempt_runner / batch_supervisor | local binding/package/edition/remote、予定400行保持・停止記録 | P13〜17: 認証済み開始gateへ合成。名前after_external_approvalだけで許可済みとしない |
| admission / 旧readiness460 | 算入条件/明示未証明、歴史checkpoint | 現行editionの全必須証拠への共通gate。旧source hashや460を変更して通さない |

生成承認と開始承認は別。今回どちらも取得せず、seed生成・本番入力固定・400戦は0。外部承認の信頼主体/認証方式は既存正本から未確定（P13）。準備後にユーザーの最終確認を取り、完全manifest保存後も開始前に別確認する境界を維持する。

## 新発見と台帳への反映

- I-poop1の置換入口は明示拒否が残る。静的41種登録を全handler完了としないため、P08/P19の到達条件に具体化した。新しい裁定の追加ではない。
- 比較値をreceiptのまま信用すると、両側+7の自己整合した偽値を旧lifetime監査が受け入れる（P11）。独立の正本数値監査を追加した。
- 独立レビューで正本02「最低0、上限なし」に対し、既存challenge.statsと追加監査が負値を返すことを発見（P11）。既存実handlerの未接続ルールとしてRED→GREEN修正。歴史runtimeの固定sourceを変更するとanchor検査が拒否したため、旧file/hash/manifestを復元・維持し、現行challenge接続scopeに最終下限adapterを追加した。全補正は既存statsで計算し、監査側は別に再構成する。

- P22追補: M-antlion-01は準備軽減能力の接続と、main自身の移動経路を分ける。旧birthイベントにはcandidate_variant/payment_effect_idsがない。main_movement価格監査がこの旧経路も証明した扱いにはしない。transform候補はあるが旧handlerがbirth以外を拒否するため、current107内の未接続実行経路として必須に追加した。

- P22完了追補: 前項の旧executor拒否は現行main_routes.scopeによる既存batch登録で解消した。旧ファイルの拒否文を削除せず歴史版を保持。現行のbirth/transformと旧birth形式の監査を検証し、全機会や選択operandの完全証明へは昇格しない。

[107本文の予約・人物除去到達条件](2026-10-08-preflight-source-closure.md)で全41本文の作用先と条件付き閉包を整理。実意味/dispatch/起点結合を残し、P06やI-poop1非到達を実行証明へ昇格しない。

### typed生成10sourceの解決全差分

4cdb1afからP07を継続。既存effect_creationの独立導出が成功した3family行のみを許可し、quick使用札の捨て移動と共通resolution_deltaを結合して全stateを比較する。正しいtyped行があっても追加draw・返金・使用札返還・予約/metadata/使用記録変更を拒否。M03は供給選択receiptのactor/choice_kind/link/parameterを実補正へ結合する。選択の外部認証ではない。無効対象は既存474の非適用evidenceを厳密照合し、source名の偽装も拒否。native/歴史hash/manifest変更なし。

TDD5FAIL→初回1FAIL（coverage未接続）→6focusedPASS1.677s、最終関連37PASS4.209s。全10sourceの外側link維持も永続回帰。独立review1回C0/I0/Minor0（reviewer6PASS1.674s）。最終固定Python結合22PASS166.032s、design errors=[]、番号付き保護476件不変。失敗/途中ログ保持。最新全proxy回帰/最新npm再実行とは扱わない。

供給境界からの解決差分の監査であり、発動/支払/選択認証・生成由来・初期状態からの全履歴・全source/phase/機会・P06予約閉包は未証明。管理項目22維持、preflight-ready=false、seed生成/本番固定/400戦0、全体結論null。次は残る公開/即時growth handlerの本文と全差分を、既存処理と監査境界を再利用して結合する。

### C-chicken公開と条件付き回収の全差分

1c6a5ecからP07を継続。72の山札上公開→なかまのみhandを独立導出し、非なかま/空山札の不移動、正確な公開receipt、物理source、支払0、全envelope保持をcoverageの全eventへ接続。既存start resolver/共通連鎖差分を再利用し、native変更なし。外側link/開始反応再開を維持、余計なdraw/返金/予約/metadata/使用記録変更を拒否。

TDD3FAIL→初回1FAIL（coverage未接続）→関連19PASS3.384s。独立review1回C0/I0/Minor0（reviewer7PASS0.675s、実StartAdapterのC-chicken/I-bowtie発動と逆順解決の追加probeも受理）。失敗/途中結果ログを保持。design errors=[]。

供給境界の解決意味のみ。印刷type tableの認証、発動/開始起点、全到達性・全機会・P06閉包は未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。次は既存474のgrowth contractを再利用し、G-area-claim/E-boss/W-countrysideのoperand・全差分を正本へ結合する。じんとり発動7枚以上の裁定は変更せず、解決時6枚で0とは分離する。

Final frozen Python integration: Ran 22 tests in 167.085s, PASS. Full proxy regression/latest npm not claimed.

### 3種の即時成長operandと全差分

0e37c50からP07を継続。G-area-claimは実board枚数（準備1枚ずつ、発動領域を除外）から6枚以下0/7〜8枚10/9枚15を導出、E-bossは両者各1drawと5、W-countrysideは5。既存474 growth/classifyと共通連鎖差分を再利用し、receipt・厳密な適用evidence・全stateを照合する。成長100で実変化0/他の有効部なしは非適用、E-bossで実drawがあれば適用。native/裁定/歴史hash変更なし。じんとりの発動7枚以上条件と解決時6→0を混同しない。

TDD5FAIL→初回1FAIL/1ERROR（coverage未接続、供給W離脱rootにactivation receiptがなく既存検査が拒否）→関連23PASS3.732s。W離脱は拒否を維持し、離脱後の実証へ読み替えない。独立review1回C0/I0/Minor0（reviewer14PASS2.109s）。design errors=[]、保護476件不変。途中ログを保持。

次工程のread-only actual forced probeでP-cat_ceoも解決時たまごなのに手札下/1draw/選択1回を実行すると判明（cat-egg-dispatch-probe.log）。06/93の既決定抑止が既存native循環handlerへ未接続。P07小項目として追加する理由は、全partner handlerの意味を本文と突き合わせたため。既存465境界はpartner_suppressed_while_eggを既に定義しており、これを再実装せず既存partner scopeへ接続する。107内での全到達性は未証明。

管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。発動/起点/履歴認証、P06/全機会・各gateは別。最新全proxy回帰/最新npm再実行とは扱わない。

Final frozen Python integration: Ran 22 tests in 160.014s, PASS.

### P-cat_ceo解決時たまご抑止の接続

88e2455からP07具体未接続を修正。06/93の既決定に従い、既存partner_draw.scope内でP-cat_ceoのcycle所属を一時的に外し、native zero-draw分岐へ渡す。解決/連鎖pop/receiptを既存resolverで保持し、手札下・draw・選択は0。state偽装/発動取消し/使用復元なし。descriptor両者を例外時もfinallyで復元。通常partnerの指定選択は維持し、既存policy bridgeでたまご0callback/通常1callbackを確認。

TDD4FAIL3ERROR→初回1FAIL（coverage未接続）→関連33PASS5.109s。独立review1回C0/I1/Minor0。Iは新監査がraw465 prepareへfull metadataを渡し、retired#1/active#2を重複札として誤拒否する点。1REDで再現後、新監査の責務をpin済06/93抑止と全envelope保存へ限定しraw465呼出を除いた。registry結合projection/choice認証は既存incarnation_policyを使い続ける。旧metadata保持・不正変更拒否も回帰化。再レビューなし、最終関連37PASS5.473s、design errors=[]。

レビュー修正前の固定結合はCtrl-C/exit130で中断しPython停止を確認してから編集。中断ログを成功へ読み替えない。最終結合はpartner-cycle-final-integration.logのみ。

P07のこの具体的未接続は解消。通常catの全意味/全dispatch、107での到達性、全機会/旧reservations閉包、入力認証は別。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。次はI-c_coin2/G-hit-blowの公開札種・分岐・実移動・成長・適用evidenceを正本から独立照合する。歴史native/hash/manifest不変。

Final frozen Python integration: Ran 22 tests in 168.520s, PASS. Full proxy regression/latest npm not claimed.

### I-c_coin2/G-hit-blowの公開・分岐・全差分

dd0ec87からP07を継続。正本77/87と既存catalog/type tableを使い、実deck topの公開種、宣言との一致/不一致、山札下/hand移動、実draw、要求5と474上限、公開自体の適用を独立導出し、receipt/evidence/全envelopeと結合。空山札はどちらの分岐もなし、1枚不一致は下へ置いた同札を引く。成長100でも実公開がある場合の適用を維持。既存executorを再実行して証明する監査ではなく、native変更なし。

TDD5FAIL→初回1FAIL/1ERROR（coverage未接続、fixtureのM06が別の効果適用後誘発を成立させ既存guardが拒否）→mainをM-beetle01へ替えて対象効果を分離、関連29PASS3.524s。独立review1回C0/I0/Minor0（reviewer5PASS1.785s、retired metadata保持/改変拒否probe）。7印刷種×全宣言、empty/singleton/cap/outer/start/end/challengeを確認。design errors=[]、途中ログ保存。

印刷type tableの認証、発動時宣言/初期履歴の真正性、全到達性/全機会、P06/gatesは別。管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次はE-first-dateの現在partner・段階0・対象#1/#2を、既存再登場の認証範囲を保って効果全差分へ結合する。

Final frozen Python integration: Ran 22 tests in 164.680s, PASS. Full proxy regression/latest npm not claimed.

### E-first-dateの対象世代/段階と解決全差分

cd22246からP07を継続。正本91の現在partner・厳格な交際段階0と、既存active_cardsの世代整合から対象を照合し、1draw/要求成長5/474実変化を独立導出。現在#2指定は成立、旧#1指定は#2へ移行せず不成立。交際1〜3/married・対象離脱も不成立。たまごだけではこのできごと自体を抑止しない。receipt/適用evidence/旧metadataを含む全stateと連鎖差分を比較し、交際段階の変更や追加drawを拒否。native・歴史pin不変。

TDD4FAIL→初回1FAIL（coverage未接続）→関連25PASS3.858s。独立review1回C0/I0/Minor0（reviewer4PASS1.094s）。空山札/成長100/outer/start/end/challengeも確認。design errors=[]、保護476件不変。世代の発生由来・発動/初期入力の認証をsupplied mappingの整合から主張しない。

次工程調査: 107内の装備はI-bond1/I-bowtie/I-sleepboost1の印刷時2であり、G-asteroids-classicが要求する印刷時3以上の自装備はない。G-archery-3dは時2以下装備を対象にできる。旧単体テストのtableを3へ変更したprobeは仮想契約試験であり107実到達証拠ではない。P06/P07/P08の条件付き閉包へ記録するが、この静的一覧だけで非到達/算入を認定しない。source集合固定・全物理保存・handler意味/全機会/入力認証との結合が必要。

管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次はG-archeryの実装備除去全差分と、G-asteroidsの107条件付き非到達の根拠を既存入口へ結合する。

Final frozen Python integration: Ran 22 tests in 163.351s, PASS. Full proxy regression/latest npm not claimed.

### 装備対象operandの独立化とG-archery全差分

7e62933からP07/P11を継続。公開準備・controller・付属関係・印刷attach時から79の敵時2以下/83の自時3以上を独立導出する共用targetsを追加。通常/response監査をnative equipment_targetsからこの共用監査helperへ接続。実支払0/2/9でも印刷2を使い、伏せ札の種類は読まない。不明公開状態/関係欠損を空対象へせず拒否。worldは発動条件だけに残す。

G-archeryは適正な敵装備の捨て移動・public/attachment消去・使用札捨てと全stateを照合。不適正対象は既存474の非適用receipt/evidenceと不移動を照合。解決時world不在でも対象再判定を進める。native/印刷table/歴史pin変更なし。

TDD5FAIL→初回1FAIL（coverage未接続）。native対象列挙をstubした1ERRORで旧監査との結合を再現→独立helper接続。関連27PASS13.494s。独立review1回C0/I0/Minor0（reviewer13PASS9.723s）。design errors=[]。途中ログを保持。

G-asteroidsの現在107装備対象なしはこの述語からも導出するが、positive解決・全到達不能・入力/印刷table真正性・全機会の証明ではない。管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次は指定465効果を再実装せず、既存局所適用/再登場registryとreceipt・全envelopeの結合を進める。

Final frozen Python integration: Ran 22 tests in 156.436s, PASS. Full proxy regression/latest npm not claimed.

### 指定6効果の局所適用と全解決差分

e25fdbcからP07/P09を継続。既存465のprepare/apply_choice、既存life.project_game/restore_gameを使い、M-beetle-01/P-cat_ceo/I-sleepboost1/M-beetle-02/W-city/E-final-timeの選択有無・選択値・prefix/suffix操作からreceiptを導出し、旧metadata/全runtime/連鎖/境界を含むafterへ結合する。既存policy_journalのlife.observe直前に監査を接続。465の規則やpolicyは再実装せず、選択真正性/registry由来/全機会/算入を昇格しない。

新発見P07: E-final-timeの旧metadata保持fixtureは、歴史406.verify_transition内のsnapshot instance検査でmissing旧#1として拒否される。現bundleでは拒否を維持。既存incarnation_runtime.scopeのextended-step projectionはこの直接呼出しを置換していない。全backend/履歴結合での再現と現行scopeでの適合が次の検討対象。作業増加理由は全state監査試験による旧validator直結の発見であり、新ルール追加ではない。静的登録や他5種の成功でこの枝を完了にしない。

管理項目22維持、preflight-ready=false、生成/本番入力固定/400戦未実施、全体結論null。TDD3FAIL→初回1FAIL/1ERROR（監査未接続/上記406拒否）→関連17PASS121.681s、独立review1回C0/I0/Minor0（focused3PASS5.926s）。固定Python結合22PASS159.864s、design errors=[]、保護476件不変。途中結果を保存。最新npm/全proxy回帰完了は主張しない。

### E-final-timeの保持metadataと406保存則の接続

caaae54からP07の直前発見を継続。既存Connection.scopeでも旧#1 metadataのmissing拒否をRED再現。Connection内で406.verify_transitionの全state/chain/hash検査を保持し、その末尾snapshot物理保存則へ渡す写しだけ既存registryのactive projectionとする。元state/全metadata/receiptは変更せず、life.checkを前後へ適用し、snapshot hookと406 hookをfinally復元。歴史406/native/hash pinは不変。

無関係札#2/使用札#2/対象札#2を既存465選択・全効果監査に結合。改変metadata/重複位置/不正hashの拒否を保持。TDD2テスト中1ERROR→関連10PASS6.464s→source/target世代試験拡充後10PASS6.466s。起点registryはsuppliedであり世代生成の真正性は主張しない。Connection外の旧406拒否試験は保存し、scope必須を明示する。

残件: 406のouter board-link検査はC-chickenだけを許す既存制約があり、他board sourceの全連鎖閉包は未証明。今回のmetadata接続から全source/phase/機会を完了扱いしない。管理項目22維持、preflight-ready=false、seed/入力固定/400戦0、全体結論null。独立review1回C0/I0/Minor0。固定Python結合22PASS159.280s、design errors=[]、保護476件不変。旧npm406/全proxy回帰を最新完了へ読み替えない。

### G-animal-shogi回収/選択結果と全解決差分

7e680eeからP07を継続。正本83/catalogの現在自捨てなかまを再判定し、回収成功かつ山札ありだけ1choiceを要求。供給済みtop/bottomの選択値と使用札捨て・対象hand回収・deck順・全envelope/連鎖/境界を照合し、既存coverageへ接続する。native/既存選択policyは変更しない。旧116除外、指定mandatory対象の不拡張、全体結論nullを維持。

TDD3FAIL→初回3ERROR（fixtureに既存recovery.scope不足）→scope接続後8FAIL/1ERROR（canonical bytesをcandidate文字列に使用、coverage未接続）→修正し関連20PASS1.834s。empty/singleton/対象離脱/種類違い、top/bottom両枝、outer P-cat_ceo/start/end/challengeを検証。独立review1回C0/I0/Minor0（reviewer関連14PASS1.104s）。design errors=[]、途中ログ保存。

これは実効果の整合であり、印刷table/選択/発動起点の真正性・全機会・全到達性は未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0。固定Python結合: Ran 22 tests in 167.420s、PASS。最新全proxy回帰/最新npm完了は主張しない。

### 実traceの全解決と個別意味監査の結合

65533e1からP07を継続。12個の既存full-delta監査にraw event hashを追加（envelope bindの3keyだけ除外し、before/afterは別hashで結合）。既存06 resolution_orderを再利用し、実traceの各top-link解決をbefore/after/eventの3hashで各局所監査に対応させる。missing/extra/failed/同family重複/misbound/receipt差替えを拒否。指定465は既存registry付きjournalの出力と合成し、connected_entryに必須接続。複数の正当な監査が同じ解決を覆うことは許す。

これはconnected entryが生成した局所監査出力の結合。standalone供給flagの真正性・全handler到達性/全機会・発動適法性・全体算入の証明ではない。実traceに未知/未監査解決があれば拒否し、静的登録を完了扱いしない。G-asteroids等の未到達枝は消さない。

TDD3FAIL→event hash欠落1FAIL→関連24PASS12.841s。独立review1回C0/I0/Minor0（focused3PASS2.486s、raw/bound正規化と抑止catの2監査併存probe）。design errors=[]。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。固定結合22+既存完走unit trace1=23PASS275.035s、保護476件不変。最新npm/全proxy回帰完了は主張しない。次は既存movement_payment/個体世代/typed消費の証拠を再利用し、通常main移動の全state保存則を結合する。

### 通常main移動の全差分と限定された捨て保存則

57cafe8からP07を継続。既存payment_consumptionの費用/typed3family/世代照合を再利用し、02の旧main捨て・手札newmain配置、77の装備離脱/公開付属metadata消去と、その他全state/反応contextを照合。余分なdraw/growth、旧main手札返還、予約/交際/人物回数/使用記録/metadata改変を拒否する。既存main移動/native/価格を再実装しない。

新たに確認した限界P07: mainと装備が捨てへ到着する内部順序の正本根拠は未確認。元discard prefixを厳守し、新規部分は離脱札だけとCounter照合するが、到着順は供給値として保持する。discard_arrival_order_proven=falseを明示し、順序反転のunitもこの限定された保存則として受理する。未知の順序を同価値/最適としない。全ルール意味完了へは昇格しない。作業増加理由は移動の全差分監査で順序の独立根拠が必要と判明したため。管理項目22維持。

消失前TDD3FAIL→1FAIL2ERROR（coverage未接続、legacy birth fixtureの候補消失、敵側装備を改変対象へ誤選択）→関連16PASS5.491s→順序限界test追加で17PASS4.956s。ここは会話tool結果による観測要約であり、生ログはworkspace消失で失われた。独立review1回は静的C0/I0/Minor0。reviewerの追加試験はexec-serverエラーで不可。

固定結合/設計試験の実行中に作業ディレクトリが消失。両sessionはexit1、成功に読み替えない。fresh remote HEAD57cafe8/tree5e6e279とDraft/open/unmerged PRを確認しclone復元。未保存3Pythonファイルを会話の同一実装から復元した。復元後4RED→関連17PASS5.249s。復元前の失敗/成功ログを偽造せず、復元後ログを別名保存。復元後固定Python結合22PASS159.801s、design errors=[]、番号付き保護476件不変。最新npm/全proxy回帰完了は主張しない。

preflight-ready=false、生成/固定/400戦0、全体結論null。

### 107 world配置/置換の全差分

5d4f104からP07を継続。01/06の既存pinと89の既存catalog/印刷時2を用い、W-city/W-countryside/W-deepseaの手札→world、旧world→捨て、時2、全他state/反応contextを照合。既存movement_instance本体をmain/world用field_entry_instanceへ共通化し、main wrapperは維持。#1→#2の隣接世代/全metadataを既存Connectionの実遷移と結合する。native/料金/候補は変更しない。

107の各自deckは3worldを各1物理札ずつ持つ。既存fixtureで同名をboardへ置くと同名の手札候補がなくなるため、別copyを追加せず候補なしを検証。同名置換全体の非到達証明ではない。新発見というより試験前提の修正であり、管理項目22維持。

TDD3FAIL→初回2FAIL1ERROR（既存candidate_variantの誤認、coverage未接続、同名copyのないfixture）→関連18PASS5.969s。独立review1回C0/I0/Minor0（関連14PASS4.913s）。design errors=[]、途中ログ保存。全発動/履歴/世代発生由来/全機会/全到達性は未完、preflight-ready=false、生成/固定/400戦0、全体結論null。固定Python結合: Ran 22 tests in 164.001s、PASS。番号付き保護476件不変。最新npm/全proxy回帰完了は主張しない。


### 107人物配置・満員なかま交代の全差分

80ab3cbからP07を継続。01/06/72/74/77の既存pin/catalogを用い、人物共有1回・時0・手札から人物枠・交際初期0・P-cat_ceoのmain存在時pendingと卵時抑止を照合。満員3人の交代は旧なかま/装備の離脱・公開付属metadata消去・対象typed失効と全他stateを照合する。既存field_entry_instanceをpartner/companionsにも適用し、既存Connectionによる隣接#2/metadata/pending世代を検証。native配置・候補・policyは変更しない。

捨て到着順はmain移動bundleと同じ未証明境界。元discard prefixと新規離脱札Counterを照合し、供給順序を保持する。順序を同価値扱いせずdiscard_arrival_order_proven=false。synthetic unit_recovery起点は真正性の証明ではなく、全履歴/全到達/全機会も未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。

TDD3FAIL→初回1ERROR（旧actions.apply fixtureにselection inventory不足）→既存legacy placement入口を直接使用し関連18PASS7.238s。9人物、main/egg、旧形式、装備付き交代、typed失効、#2再登場を検証。失敗・成功ログを保存。design errors=[]、保護正本476件不変。独立review1回C0/I0/Minor0（新規5PASS4.283s）。固定Python結合: Ran 22 tests in 164.361s、PASS。最新npm/全proxy回帰完了は主張しない。


### 準備・装備配置の全差分と支払照合

de5aba1からP07を継続。01/06/55/77の既存pin/catalogを用い、I-poop1のしかける時1、I-bowtie/I-bond1/I-sleepboost1の装備時2と対象範囲、準備3枠、手札→準備、公開/伏せmetadata、装備関係、全他state/反応contextを照合。M-antlion-01軽減は任意の非使用枝と時1→0枝を保ち、現個体・自分ターン/roundの使用済みを拒否し、使用記録1回だけを追加する。使用回数の履歴真正性は未証明。既存field_entry_instanceをpreparedリストにも適用し、既存Connectionの#2と全metadataを照合。native/価格候補/policyは変更しない。

P06未閉包のlegacy reservations非空は費用影響未証明として拒否する。I-poop1の配置監査であり、後日の置換入口/全非到達性を解決した扱いにしない。synthetic unit_recovery起点の真正性、全到達性/全機会は未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。

TDD3FAIL→新規3PASS1.254s→再登場/軽減使用済みtest追加、関連21PASS7.481s。対象/支払/付属情報/回数/typed/余分なgrowth等の改変と、hashを更新したcoverage入力の不正を拒否する。途中ログ保存。独立review1回C0/I0/Minor0（新規4PASS2.076s）。design errors=[]、保護476件不変。固定Python結合: Ran 22 tests in 161.844s、PASS。最新npm/全proxy回帰完了は主張しない。


### 挑戦宣言の参加者固定と全差分

9d17b9cからP07を継続。既存02/06/65 pinを再利用し、normal境界・自分から1回・両main・ちから/ちえを照合し、宣言時の2体/parameter/開始seqを固定する。自分の宣言回数だけを消費し、時0・成長0・相手回数/既存typed/metadata等の保存と反応contextを全差分照合。既存declare/native、比較数値、次勝利消費、挑戦終了監査は再実装しない。

legacy予約非空は宣言時機会が未閉包のため拒否する。参加個体の履歴真正性・全機会・発動適法性全体は未証明。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。

TDD3FAIL→初回1FAIL1ERROR（actor変更後typed期限が旧手番のfixture、metadataの改変値が元と同値）→既存constructorでfixtureを訂正し関連19PASS4.184s。両actor/両parameter、参加者差替え、宣言回数/時/成長/typed/metadata/contextの不正、hash更新後coverage入力を検証。独立review1回C0/I0/Minor0（新規3PASS0.712s）。途中ログ保存。固定Python結合: Ran 22 tests in 164.361s、PASS。design errors=[]、保護476件不変。最新npm/全proxy回帰完了は主張しない。
