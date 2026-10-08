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


### 通常パスは終了要求だけという全差分

cd41047からP07を継続。06 pinを再利用し、normal_actionの空連鎖/未処理なし/挑戦外でのpassを、相手優先・連続pass1のturn_end_responseへ結合。残り時・成長・手札/山札・使用回数・typed効果・turn/round・全metadataを保持し、ここで失効や次ターン更新をしない。終了処理の完遂はend_obligations_proven=falseで分離する。nativeは変更しない。

TDD3FAIL→初回1FAIL（coverageのtyped消去は既存typed生成監査が先に拒否）→接続試験を余分な成長へ変更し、新監査到達を確認、関連9PASS1.213s。typed失効の直接拒否試験は保持。独立review1回C0/I0/Minor0（新規3PASS0.725s）。途中ログ保存。固定Python結合: Ran 22 tests in 166.603s、PASS。design errors=[]、保護476件不変。

次工程調査: 旧反応passには複数の復帰表現があるが、現行runtime.operationのquick.scopeは全response_passを既存quick.response_passへ接続している。旧raw入口を現行dispatchと誤認せず、この既存統一入口と外側challenge/end補正を次に照合する。再実装や未確認の同値扱いはしない。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、最新npm/全proxy回帰完了は主張しない。


### 現行反応パスの全差分と復帰先

5fb503dからP07を継続。現行quick.scopeの統一response_pass入口を正本06/65と照合。0→1では優先を相手へ渡し、1→2では空連鎖を通常/終了/比較前/挑戦終了へ戻すか、積まれた連鎖をresolvingへ移す。stack・資源・回数・typed・全metadataは保持し、event.resultの4項目も結合する。外側triggers/challenge補正を含めて照合し、旧raw passの別表現を許容枝として追加しない。native/119は変更しない。

TDD3FAIL→初回3ERROR（fixtureで同seqのbefore/afterをbind）→条件付き起点記録へ修正後3ERROR（初期窓の時1条件違反）→訂正後1ERROR（両deckに同じmainがあると仮定）→各deckの実main使用後1ERROR（fixtureに既存paid.scope不足）→通常接続どおり既存scopeを使用し関連12PASS1.705s。開始/配置後/終了/比較前/挑戦終了/連鎖ありの各2pass、不正優先/早期解決/資源改変/receipt差替えとcoverageを検証。これらの条件付きorigin/選択は本番入力や認証済み履歴ではない。

独立review1回C0/I0/Minor0（新規3PASS0.527s）。失敗・成功ログを保存。共通制御のため固定22+既存完走unit trace1: Ran 23 tests in 289.488s、PASS。design errors=[]、保護476件不変。未処理機会の閉包・全履歴/全機会は未証明、管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null、最新npm/全proxy回帰完了は主張しない。


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


### 107物理集合から既存lifecycleのroot・実journalへの結合

8efe29aからP06/P07/P08の結合を継続。runtime/trigger_window/sequential/batch forced/chain scopeのdispatch順を読み、通常・応答・強制・group発動の出力が既存の全差分joinへ到達する構造を確認した。枝の静的照合だけで全source/phase到達とはしない。

具体的な穴は、policy_journalの既存life.observe再計算が供給rootと最終値を検査する一方、107初期物理集合へのroot結合と保存physical_lifecycle_stepsの全値照合を持たなかった点。466の既存source anchorで107 fixtureをpinし、initial/opening finalの80定義・所有者別40所在、openingからruntimeへのlegacy/seq、既存life.createとroot全一致を結合した。既存life.observeループからhash列を得て保存journalの欠落/余分/順序/各event・state・lifecycle hashを厳密比較する。lifecycle/runtime/既存scopeを再実装しない。

TDD2件10FAIL2.756s→関連16PASS6.739s。追加した初期player欠落の反例は2件中1FAIL2.817s、A/B集合を厳密検査して関連16PASS6.789s。独立review1回C0/I0/Minor0、新規2件独立PASS3.183s。全試行ログはverification/source-root-*。固定結合は最終logで別判定する。

これは実traceの物理保存と供給root/journalの構造結合であり、入力provenance/lock、opening全履歴の独立認証、全ルール機会・I-poop1/I-bond1の全非到達・旧reservations閉包は未証明。次はpreparedの公開効果分類がboard linkをunprovedとして残す経路と、P06の人物除去否定条件を照合する。既存quick限定監査を全閉包へ読み替えない。管理項目22維持、追加の具体化理由は実dispatchから記録の消費先を辿って結合欠落を発見したため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 271.103s、PASS。design errors=[]、保護476件不変。


### 公開board linkの置換否定predicateへの接続

7181882からP06/P07/P09を継続。prepared_predicatesの既存quick分類は維持し、正本本文で敵main/なかま除去を持たない既存20board効果を、固定start catalog・公開activation receipt・source reference・時0の条件でpublic_effect_routeへ接続した。各分類に既存resolution full-delta family名を付けるが、分類自体はeffect_execution_proven=false / activation_origin_authenticated=falseを維持する。監査は全public linkを調べ、不明source・不正receipt・参照・支払はunprovedへ残す。伏せidentityを分類へ用いない。

TDD2FAIL0.001s。初回15件2FAIL6.187sは、board支払が時0に加えて既存の札移動receiptを持つ点を狭く扱ったため。時の厳格int/0と参照を検査し、既存札移動情報を保持して15PASS6.277s。実M02/M08・本人離脱後cat、実開始/到着/終了/挑戦/強制group7種、実native inventory＋伏せidentity読出し追跡を追加し関連28PASS9.618s。これは条件付きfixture検証であり新本番seed/入力の生成ではない。

独立review1回C0/I0/Minor0、新規4件独立PASS0.715s。20分類/既存family・pin・公開receipt・参照・時0とcat自己離脱の意味、伏せidentity読出しの追加がないことを確認。全到達性/全機会/実行証明/情報利用全体の認証/固定結合全体はreview対象外。ログはverification/prepared-board-routes-*。design errors=[]、保護476件不変、固定結合は最終logで別判定する。

I-poop1/I-bond1の全非到達や旧reservations全機会は未達。登録一覧だけを証明へ算入しない。次は既存root・実lifecycle・全event差分joinと、旧reservations空/敵人物除去なしの条件をtrace上で結合する。未知のdispatch、入力/起点認証、全機会の未証明は引き続き拒否/保留する。管理項目22維持、具体化理由はprepared監査のhand限定分岐を実board発動へ辿ったため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 279.879s、PASS。全source/phaseの到達試験、最新全proxy回帰とは扱わない。


### 107供給traceの旧予約空・相手人物保存の結合

63ebe44からP06/P07を継続。既存source_rootのinitial/opening rootでlegacy reservationsを厳格空listとして検査し、policy_journalの既存life.observe直前に全actual before/after・actor A/B・相手main同一/companion multiset保存を結合した。自分の人物移動、敵装備だけの除去、typed補正や資源変化の詳細は既存全delta監査へ委譲し、今回の不変条件から適法と推測しない。

supplied_source_invariants_verifiedの範囲は107_bound_actual_trace_only。global_replacement_unreachability_proven=false、全機会/起点認証falseを維持する。供給traceで予約空・相手人物保存だったことを、I-poop1/I-bond1の全非到達や全ルール上の予約不要へ読み替えない。

TDD3FAIL2.572s→関連23PASS9.674s。実birth/time_skip/transform、実G-archery敵装備除去、実cat本人/装備支払いを許容し、予約混入/型・相手人物変更・不正actorを拒否。追加後関連25PASS8.960s。独立review1回C0/I0/Minor0、新規5件独立PASS3.104s。design errors=[]、保護476件不変。全試行ログはverification/source-invariants-*、固定結合は最終logで別判定する。

次の合成欠落: normalには既存board_predicates.composeでpredicate unitの欠落を列挙する入口があるが、responseのhand/reaction/board/preparedの各ローカル監査には対応するsource単位の横断結合がない。各監査のerrors=[]だけでは未証明sourceが消えたことにならない。P08/P09の次工程ではこの欠落を明示的に集約し、source inventoryや静的一覧を意味証明へ昇格しない。管理項目22維持、追加具体化理由は局所predicateのunproved出力の消費先を辿ったため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 275.227s、PASS。既存4step診断ではG-air-hockeyのhand未証明をreactionが補い、P-desert_scorpionの通常response sourceが未証明として残る。次の横断結合はこの区別を保持する。全source/phase到達や最新全proxy回帰とは扱わない。


### response4監査の所有者source単位合成

3b5490dからP08/P09を継続。通常responseでfresh計算したhand/reaction/board/preparedを、priority actorの実hand/board/prepared sourceへ横断結合し、challenge_windowの既存入口へ接続した。G-air-hockeyのhand未証明をreactionが補完する一方、どこも検証していないP-desert_scorpion等はunproved_source_idsとして保持する。監査familyの欠落/schema/failed/false、重複/foreign/zone/actor不一致はerrorsとして拒否。missingだけは既存normal compose同様に条件付き記録へ残し、証明を捏造しない。

preparedのverified部分行だけを採用し、他者equipmentを自分のsource coverageへ算入しない。全体equipment flagがfalseでも、個別verified行の意味と残る未証明を混同しない。source predicate合成であり、候補grammar/全合法集合・情報利用・履歴真正性・全機会を証明するものではない。caller_proofs_authenticated=false、complete_legal_set_proven=false等を維持する。

TDD3FAIL0.001s→関連29PASS16.476s→実own/other equipment・伏せsource・重複拒否追加で関連30PASS16.947s。独立review1回C0/I0/Minor0、新規4件独立PASS3.266s。design errors=[]、保護476件不変。全試行ログはverification/response-composition-*、固定結合は最終logで別判定。

次は普通のresponseに残るevent依存board sourceについて、既存trigger_predicatesの時点別独立条件を再利用できる否定枝と、実groupの見送り/消費/閉鎖ledgerが必要な枝を分離して結合する。たとえばP-desert_scorpionの非終了時否定と、正しい終了機会を見送った後の再提示禁止は同じ根拠ではない。静的一覧/同じ候補/唯一候補を証明にしない。管理項目22維持、今回の具体化は局所のunproved出力を横断して未補完sourceを把握できたため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 279.117s、PASS。missing sourceは条件付き記録に残り、全機会・算入・本番開始へ昇格しない。最新全proxy回帰完了とは扱わない。


### 通常responseの終了4source否定predicate接続

388e903からP08/P09を継続。response_board_predicatesでM-beetle-02/W-countryside/P-desert_scorpion/I-sleepboost1について既存trigger_predicates.audit_endを再利用し、現在origin・物理source・正本参照に結合した空候補の検証が成立する場合だけsourceをverifiedへ追加する。実inventoryの候補は別途emptyと照合し、再提示を拒否する。I-sleepboost1は公開face_upとattachmentを前提とし、伏せをこの経路へ昇格しない。

正の終了機会、origin履歴の欠落/重複はunprovedのまま。候補欠落・initial_trigger_occurrence_closedという理由だけを見送り/閉鎖の証拠にはしない。既存4stepの非終了P-desert_scorpionはこの限定された否定でresponse source合成へ接続されるが、履歴真正性・全合法集合・全機会・情報実使用の証明ではない。

TDD1FAIL2.756s→関連23件2ERROR9.747s（テストscope参照を修正）→23件2ERROR10.604s（条件付きfixture最終eventの既存hash結合を補完）→23PASS9.915s。失敗ログを含めverification/response-end-predicates-*へ保存。独立review1回C0/I0/Minor0、新規3件独立PASS3.226s。design errors=[]、保護476件不変。固定結合は最終logで別判定。

次は他のevent依存board sourceの否定判定と、正のgroupを実際に見送った後のledger閉鎖を接続する。後者を今回のempty判定で済ませない。管理項目22維持、具体化理由はresponse source横断合成で残るevent依存sourceを個別の既存predicateへ辿ったため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 274.366s、PASS。全source/phase到達・最新全proxy回帰とは扱わない。


### 通常responseの到着・街・交際・挑戦7source否定接続

66572b2からP08/P09を継続。M-antlion-04/M-antlion-05/M-beetle-01、W-city、P-cat_ceo、M-antlion-07/P-anglerfishをそれぞれ既存audit_arrival/city/relationship/challengeへ接続した。現在origin/source/正本参照とforced/optionalを結合し、空候補の既存predicateが成立するときだけevent_negative_auditsへ記録する。実inventoryの空照合を維持し、spurious再提示を拒否する。新しい条件/候補/価値判断は追加しない。

positive、origin欠落/重複はunproved。正のP-cat_ceo交際誘発は既存native ordinary inventoryが強制誘発未処理として拒否することを確認し、意図的なsupplied empty inventoryもnegativeへ昇格しない。predicateと本来の強制dispatchを混同しない。

TDD初回2件1FAIL/1ERROR0.138sはテストが強制交際の既存進入拒否を考慮していなかったため。拒否の期待を明示した再試験2件1FAIL0.162s後に実装、関連25PASS8.511s。全試行ログはverification/response-event-predicates-*。独立review1回C0/I0/Minor0、新規2件独立PASS0.645s。design errors=[]、保護476件不変。固定結合は最終logで別判定。

次は残る開始/latched sourceの否定枝と、実group見送り・消費のledger閉鎖からresponse再提示禁止への結合。台帳のstatusやreason文字列だけを発動/見送りの実receiptと扱わない。管理項目22維持、具体化理由はsource合成後の未証明を既存event別predicateと照合したため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 272.833s、PASS。全source/phase到達・最新全proxy回帰とは扱わない。


### 通常responseのlatched4source現在条件による否定接続

20eec3dからP08/P09を継続。M-antlion-03/M-antlion-06/C-bat/P-cliff_goatについて既存audit_latchedを再利用し、現在手番・費用札・対象・使用条件による空候補だけをlatched_negative_auditsへ結合する。実inventoryの候補をemptyと照合し再提示を拒否する。timing発生や閉鎖をこの現在条件から推測せず、条件positiveならnative候補が空でもunprovedを維持する。

TDD2ERROR0.028s（伏せ準備を含むfixtureのorigin分類）→2件1FAIL/1ERROR0.052s（既存paid scope未設定）→修正後2件1FAIL0.059s→実装後関連28PASS9.042s。テスト側は既存start eventとpaid.scopeを利用し、runtime.operationの外側にcontract_scopeを維持。全試行ログはverification/response-latched-predicates-*。独立review1回C0/I0/Minor0、新規2件独立PASS0.166s。固定結合は最終logで別判定する。

残る開始sourceおよびpositiveな現在条件のsourceについて、実groupの消費・見送り・ineligible receiptと現在ledgerの結合が必要。台帳status・候補欠落・reason文字列だけを閉鎖証明にしない。管理項目22維持、具体化理由はresponse source合成の未証明を現在条件と発生/閉鎖条件に分けたため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 281.945s、PASS。design errors=[]、保護476件不変。全source/phase到達・最新全proxy回帰とは扱わない。


### 実group見送り・ineligibleから通常response再提示禁止への結合

7dd7c5cからP07/P08/P09を継続。responseの既存4監査で未補完のsourceに対し、同origin・同physical sourceのdeclined/ineligibleを、実group record、実history event、actual full traceのbefore/after、現在ledgerのjournal prefix/statusへ結合する入口を追加。既存sequential.inventory(observation.Adapter)で当時の候補をfresh再列挙し保存inventoryと比較、既存trigger_closure_effect.auditの全差分検査を再利用して、通常inventoryへの再提示を拒否する。既存scope/driver/ledger代数は作り直さない。

trigger_windowの既存closed scopeを出た直後にfresh監査を接続し、response_compositionは任意の追加closure familyをstate hash・flag・重複/foreign/zone検査つきで合成する。現在priority actorの公開board sourceだけが対象。別origin・pending/deferred・activatedは未証明のまま。statusやreasonだけではverifiedにならない。発生・選択・履歴真正性はfalseを維持する。

TDD3FAIL0.001s→関連16PASS5.142s→実W-countryside終了見送り（条件付きtest-only明示選択）/別origin・pending/追加composition変造拒否を加え関連17PASS5.528s。実start見送り・ineligible、実driver接続を検証し、record/history/trace/ledger/再列挙inventoryの欠落・重複・不一致を拒否。全試行ログはverification/response-group-closure-*。独立review1回C0/I0/Minor0、新規4件独立PASS1.461s。design errors=[]、保護476件不変。固定結合は最終logで別判定。

次はactivatedによるgroup消費を、既存board/positive発動の全差分監査と同じ実record/history/trace/ledgerへ結合する。開始sourceの非開始機会・latched sourceの発生有無、別originにまたがる閉鎖、全機会の合成は別途残る。管理項目22維持、具体化理由はnative suppressionのstatus文字列と実操作receiptの間を接続したため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 272.605s、PASS。全source/phase到達・最新全proxy回帰とは扱わない。


### 実発動receiptからgroup消費・response再提示禁止への結合

594e7d6からP07/P08/P09を継続。response_group_closureの同origin/physical source・現在ledger journal prefix/status・実record/history/full trace結合をactivatedにも拡張した。fresh group inventory再列挙を維持し、既存board_group_effectまたはpositive_activation_effectのapplicableが一意かつ全delta verifiedであることを要求する。declined/ineligible枝と再提示拒否は維持。activatedというstatus単独を消費証明へ昇格しない。

実C-chicken/I-bowtie/M-antlion-04/W-countrysideの発動record、positive4の実record（既存latching current_actionsを再利用する条件付きtest-only Adapter＋供給empty inventory）、欠落/chosen/decision/history/reoffer、hashを整合させた余分growthを検証。positive4の単体fixtureはnative timingや入力起点の証明ではない。

TDD2件2FAIL0.179s（初期group中の119優先権を誤ってパスしたテストを修正）→2件6FAIL0.197s→実装。初回green.logはdotsのみで最終結果不明、詳細再試験18PASS6.838s。追加後green-expanded.logもdotsのみで最終結果不明、詳細再試験20PASS7.107s。欠けた最終結果の原因は確定しておらずPASSに読み替えない。全試行ログはverification/response-activation-closure-*。独立review1回C0/I0/Minor0、新規4件を-vで独立PASS1.088s/exit0。design errors=[]、保護476件不変。固定結合は最終logで別判定。

次は既存完走unitのresponse source合成に残る未証明を集計し、開始sourceの非開始機会、latched発生有無、別originにまたがる閉鎖のうち実際に残る具体的な欠落へ進む。静的一覧だけで全機会を閉じない。管理項目22維持、具体化理由はgroup消費のstatusから実発動receiptへの証拠結合を追加したため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0、最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 275.412s、PASS（詳細最終行確認済み）。全source/phase到達・最新全proxy回帰とは扱わない。


### 既存完走unitで残った通常手札・開始sourceの局所述語補完

c949ae9からP08/P09を継続。保存時点の既存test-1A診断はruntime143行、response89行中85行covered（C-chicken4行未証明）、normal29行中19行covered（I-poop1のtrigger_prepared_item10行未証明）。診断はresponse-source-diagnostic-after-c949ae9.jsonへ保存し、現行実装後の結果に読み替えない。

I-poop1の通常手札trigger_prepared_itemを既存source/variant/timing述語へ接続し、reaction_onlyによる非適用を独立照合する。通常set_itemは既存入口を維持し、time0/1/5で費用と区別して検証。置換handlerの接続や全到達不能証明は行っていない。

C-chickenの非開始機会を、実ctx.origin_event_seqの一意なoriginと既存144の開始述語へ接続した。現行開始3形式をturn_startへ正規化し、既存closed_startの一時patchより前に保持した述語を利用する。配置後・相手開始の否定を合成し、自分開始、未知の自分手番event、origin欠落/重複は未証明を維持する。最新passやnative suppressionを非発生証明にせず、再提示を拒否する。

TDD手札1FAIL0.018s→関連19PASS12.526s、開始1FAIL0.029s→関連28件1ERROR14.983s（相手手番fixtureが初期event_seq2の専用入口へ入ったため、後続event_seq5へ修正）→28PASS15.135s。全試行ログはverification/hand-prepared-trigger-*、start-negative-red.log、source-predicate-gaps-*。独立review1回C0/I0/Minor0、新規2件-v独立PASS0.146s/exit0。design errors=[]、保護476件不変。固定結合は最終logで別判定する。

既存完走unitの通常/response全監査行が局所source述語を合成し、all_rule_opportunities_proven=falseを維持するassertを既存固定結合へ追加した。単一unit完走や全行coveredを全source/phase・全ルール機会の証明へ昇格しない。管理項目22維持、具体化理由は実unit診断で判明した2種類の未接続述語を区別したため。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。次はsource述語の局所合成と全機会の閉包の間に残るdispatch/到達根拠を正本から確認する。最新npm/全proxy回帰完了は主張しない。

固定22＋既存完走unit1: Ran 23 tests in 274.111s、PASS/exit0。既存unitのresponse89行・normal29行すべて局所source述語covered、全機会flag=falseを確認。これは単一unitの条件付き監査であり全source/phase到達・全proxy回帰ではない。


### E-final-timeの外側盤上連鎖と現行物理保存の接続

e215184からP07のdispatch/連鎖を確認し、caaae54/65533e1以来の406 outer board=C-chicken限定を実W-city/M-antlion-04/C-batの外側linkで再現した。現行Connection.scopeだけで、406の既存result_from_state/validate_chainによる実hash連鎖、既存life.check/project_gameとsnapshot physical保存を再利用する。変更前の残存予定outerに非C-chicken盤上能力がある場合だけ、この検査へ接続。外側linkの順序/全内容/chain contextとmetadataを保持し、物理数え上げ用の写しから盤上能力linkを除く。実state/効果/指定policy/歴史406/hash/manifestは変更しない。

供給済み盤上linkの発動適法・全source/phase到達や過去起点の認証を追加したものではない。既存registryと実full-delta監査が別に必要。通常/retained metadata/source#2/target#2/不適正target/複数outerを実E-final-time handlerと指定選択/全差分へ結合し、自己整合hash付きouter改変・順序/全消去・context・metadata・物理重複と不正hashを拒否。scope外の歴史406拒否と例外時復元は維持する。

TDD1件15ERROR0.455s（全て406 active board source identity differs）→初回関連GREEN→拡充17PASS5.040s。独立review1回C0/I1/Minor0、新3件独立PASS1.265s。I1はafter側だけの分岐がouter全消去を旧406へ逃がす点。固定結合をCtrl-C/exit130で中断し停止確認後、全消去を1FAIL0.133sで再現、before側の残存予定outerへ結合して関連17PASS4.945s。再reviewなし。全ログはverification/final-time-outer-*、中断logを最終成功へ読み替えない。修正後固定結合はfinal-integration.logで別判定する。

管理項目22維持、具体化理由は既存実handlerの現行scopeと歴史validatorの適用範囲が異なるため。P07の当該接続不足を補ったが、全dispatch優先順位/P06予約/P08全source/P09全機会/P10以降のgateは未完。preflight-ready=false、seed生成/本番固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。最新npm/全proxy回帰完了は主張しない。次は既存逆順解決・誘発ledger・phase別自動入口の優先境界を照合する。

P07次工程のread-only probe: 終了条件positiveのM-beetle-02とtyped paymentを供給した場合、実forcedはopen_turn_end_triggersを先に返す。一方、payments.expireを直接呼んだ遷移は単体expiry.auditではerrors=[]となる（end-dispatch-order-probe.log）。これは単体差分の責務範囲でありnativeの順序不具合ではない。終了源の既存独立述語と実history/ledgerを失効・手番終了入口へ結合する監査が残る。追加理由は全差分とdispatch優先境界の証明を分けて確認したため。

修正後固定22＋既存完走unit1: Ran 23 tests in 273.740s、PASS/exit0。design errors=[]、保護476不変。既存unit局所source合成response89/normal29と全機会flag=falseを維持。初回関連GREENは10PASS3.514s。全source/phase・最新全proxy回帰ではない。
