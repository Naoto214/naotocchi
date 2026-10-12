# P10 現行read経路と公開適用証拠の境界

基準73d821db03ffc7390bd898cf901eeb9299aaf8cd。全pathの情報利用証明ではない。以下は実装の静的読取結果であり、有限fixtureの非干渉検査とは区別する。

| 現行経路 | 読み取り/利用 | 確認した境界と残件 |
|---|---|---|
| population_runtime.operation.driver / _step | 通常inventory、現round/actor/context | _borrow_problemを無効化しselectへinputs=None。過去boundary/full-state hashによる比較証拠の借用は現行population経路では行わない |
| continuation_candidates.audit | owner手札、公開盤面、time、公開history、ability_uses | owner/public projectionでunit列挙。ただしUNIT_ADJUDICATOR・ADMITTED_ID_ADAPTER・MAIN_TRANSITION_ADAPTERはfull envelopeも受け取る。投影だけで全read安全とはしない |
| continuation_preparation.normal_projection / response_inventory | preparedのface_up・slot・公開origin | 相手の伏せ札を対象列挙から除く。responseのenvelope_sha256は実stateへの監査binding。response_contextが外側の実challenge stateを保持する既存修正は再実装しない |
| continuation_candidates._scores とcaps/worlds/batchのscope | 公開growth/time/main/world/準備枠、owner候補の費用とcard_copy_id | 候補のscore/証明を合成する。上位値/成長/将来資源の由来はP11残件。full envelopeを受け取ることだけでは秘密の実利用を断定しない |
| population_unproved_priority / normal_frontier | 既存114比較・未証明frontier・116 context | 未公開G-hit-blow/I-c_coin2成長を0にせず既存116除外。新しい値・順位は追加しない |
| population_activation_legality.scope.select / response_window_seeded_restart.resolve_response_choice | 完全候補ids/details、first-date既存条件、route/context | 比較とfallback生成にraw deckを渡す経路はこのselector内にない。opportunity丸ごとのcopyは記録用であり、候補生成側の全read証明とは別 |
| population_public_application.companion_applied | raw event/shot hashの一致、その後public main/world/companionsと公開効果receipt | 全state hashは入力整合性検査。C-chameleonの公開証拠へ出していた同hashを公開盤面参照へ分離（今回） |
| continuation_public_history.event_projection | 許可されたevent/result項目 | draw/hand-bottomのreceipt IDを出さない。全event種の生成field対応は未完。旧producer調査ではselected_candidateのみとしたが、466初期producerのsource_instance_idを見落としていた。下記2026-10-12追補で実漏洩を訂正/修正 |
| population_policy_bridge.Session.choose | designated frame、完全合法候補、owner root/address | full choice state照合はcallback整合性、1/Nは指定5契約のみ。normal/responseへ許容を拡張しない |

## 今回の変更

C-chameleonのactual_public_continuous_stat_adjustment証拠は、game_state_sha256ではなくpublic_board_sha256を出す。hash対象は既存public(g)のround/turn_player/両者main・world・companions。カード本文・能力由来・全公開情報の完全な証明ではない。原event/shotのfull hash照合は変更しない。

G-beach-volleyの現行consumerを追加確認した結果、正の適用証拠は主にcondition_metとして使用され、normal/payment候補の正の証拠全体へ常に添付されるわけではない。したがって今回の発見は公開condition証拠への秘密由来hash混入であり、選択結果の秘密依存が確認されたとの主張はしない。

## 検証

新1件RED: actualとbaselineの証拠hash相違でFAIL。初回は誤った相対pathのためテスト未作成/AttributeErrorとなり、これはREDに数えない。修正後、public_application / continuation_public_history / hand_predicates / information_use / prepared_informationの関連19件PASS、9.374s、process exit0。新テストは全shotの実在deckを反転しraw hashを再結合、公開証拠一致を確認。再結合前は従来のhistory hash differsで拒否する。既存公開盤面有無の対照、除去済source、回収成功/不成立も維持。原RED logを併置、GREENは取得tool出力の要約でありraw logとはしない。

独立レビュー1回: Critical0/Important0。別実行でpublic_application 4件PASS。公開盤面へのcommitmentであってcard identity/rule/起点証明ではないこと、および正のconsumerはbool利用であることを確認。過去保存結果不変。全proxy回帰ではない。preflight-ready=false、本番gate閉鎖、生成/固定/400戦0、policy promotion=false、独立balance標本0。

## 次の一手

P10の残件を「全read未証明」の一語で再開しない。実adapter群（normal UNIT/ADMITTED/MAIN_TRANSITION、response hand/board）で読むfieldと許可根拠を対応させる。P11は候補scoreを作るcaps/worlds/batchとselect_verified_zero_immediateの上位/成長operand、P09はstart/arrival/end/hand群と既存occurrence監査の接続を継続。局所hash修正で本番gateを開かない。

## c9bbaf2時点のfull-envelope adapter追跡

以下は候補生成の実分岐・呼出先を読んだ対応。full envelopeのdeepcopyやhashは整合性/監査用であり、選択値への使用と区別する。114のowner手札/公開board・discard・time・履歴、119の反応文脈を許可根拠とする。表は下記経路の確認であり、未調査の将来handlerや全履歴認証を含まない。

| 実adapter | 実際の条件・対象読取り | 境界 |
|---|---|---|
| batch.adjudicate_source_unit | 自boardの各slot現物数、公開time、固定表の7/9枚区分 | preparedの中身で数を変えず現物数だけ。発動7枚以上を維持 |
| activation_legality.scope.unit → hand_candidates | 自手札source、time、partner個体/段階、公開growth | E-first-dateの合法性と解決時5成長前提を分離。G-hit-blowの7宣言は未公開topを読まない |
| paid_draw.scope.adjudicate → board_candidates/cost_options | 自main、turn owner、使用履歴、自preparedのface_up、自discardの公開card種 | M02は自伏せをcost候補化、M08は異なる2現物の全順序。draw先の内容を候補選択に使わない |
| trigger_effects.scope.adjudicate → relationship_payment | 自main/partner/段階、進行済flag、公開typed paymentのcontroller/kind/source/amount | 同partner軽減だけを適用。未知の段階は拒否 |
| batch.qualify_ids | 自world/time、公開装備targets、固定timing/condition、公開companion適用履歴、公開discard | equipment_targetsはface_up確認後に印刷cost/attachmentを読む。G-hit-blowは登録全variantのIDのみ |
| loss_reward.scope.qualify | 自source、公開敗北履歴/現在turn、time、固定cost | hand_candidatesと同じloss条件を照合。現在main存在を追加しない |
| payments.adjust_payment | 自time、公開transform payment effectsのcontroller/kind/amount/ID | 未公開領域参照なし。元の移動条件を支払軽減で消さない |
| quick.hand_candidates / payments.hand_candidates | 自手札source、両者公開main、自discard、time、world、公開board数、公開loss/使用履歴、現在challenge | 解決用deck読取りとは別。G-hit-blowの旧empty-deck発動guardは現行activation_legalityが置換済み |
| triggers.board_candidates / recovery.board_candidates | 公開source/slot、起点event、current turn使用履歴、自discard、preparedの表裏 | 到来/終了/勝負/回収の実candidate経路。全発生機会はP09の別検査 |
| latching.current_actions / hand_timing.current_actions | 各source所有者の自手札costと公開discard/board、実勝負、使用履歴 | 手札誘発の発生検査が所有者の非公開手札を読むことと、他者の選択へ利用することを区別 |
| trigger_sequential.inventory / step | offerされた同owner群、各adapterの全合法action、公開group/ordinal | 既存116のseed addressへfull envelope hashを渡さない。実stateは整合性と記録へ保持 |

候補生成側に実装された以上の条件は確認した。comparisonのcaps/worlds/batchと下流helper全体のP10/P11合成、初期入力/履歴の起点結合は完了扱いしない。既存information_use/prepared_informationの有限置換PASSを、この静的読取の代わりや全path証明としない。


## 2026-10-12 比較側と下流helperの読取追跡

以下の実経路を追加確認。候補生成表と結合して読むが、局所試験のPASSを全経路の動的アクセス証明へ昇格しない。full envelopeのvalidate/hash/deepcopyによる整合性読取と、順位を決める値への読取を区別する。

| 経路 | 比較・選択に使う入力 | 証拠と残る境界 |
|---|---|---|
| candidates._scores | 両者growth/reservations、pending/activation、actor time、自候補payment/物理ID、公開配置slot | >=100/未処理をguard。自候補evidenceの費用は独立payment監査へ接続。上位0/成長0の一般由来はP11で別扱い |
| caps.scope.scores → arrival_certificate | 自main/attachments、公開world、source固定分類、再列挙候補、自time | current107のno-arrival部分だけ。hidden deck順を比較値に使用する処理なし。capability一致は履歴起点認証ではない |
| worlds.scope.scores → placement_certificate | 両者world有無、公開growth/予約、自world候補/印刷cost | world既設とpendingをguard。後続効果の評価や一般成長根拠を証明しない |
| batch.scope.scores → outcome | 自partner段階/main/進行flag、公開growth/time、自候補とsource分類、公開履歴 | 通常challenge・direct growth・未公開revealは現行unproved_priorityがunknownへ遮断。費用と成長は別監査 |
| departure.select_verified_zero_immediate（paid_draw/recovery/置換の共通先） | 自候補の実activation/置換検査、actor time、delegate済scores、上位4operand | helper内にdeck順/相手手札identityによる順位付けなし。uniqueはupper_priority_problem保存済み。複数frontier分岐では全比較行の保存/支払監査結合が未完で、次の具体的P11作業 |
| normal_frontier / unproved_priority | 上記scores、完全候補ids、公開context、safe-placement証拠 | comparatorは入力行だけを読む。unknownを0にせず比較不能。partial proved_scoresは今回支払監査へ接続。全上位/成長由来は未完 |
| 114 compare_candidates | 上位4数値、明示resource relation、その全同値後の支払/消費/copy | state/envelopeを受け取らない。relation未供給はunresolved。現行通常入口で歴史borrow無効。純粋計算一致はoperand認証ではない |
| 116 build_seed_proof | 規定contextのキーとcanonical候補ID集合 | state hash/raw deckを材料に加えない。旧116の除外維持。指定mandatory policyへ昇格しない |
| activation_legality response selector →119 | 公開response context、全候補details、first-dateの既存5成長条件 | unknown候補ありは119/116へ。有限の情報置換テストを全fieldの独立証明としない |

残りを一般語だけに戻さない: (1) zero-immediate複数frontier分岐の比較operand保存/費用結合、(2) comparisonに渡される上位/成長のsource・実状態根拠、(3) 全event public_history投影と履歴起点、(4) 現行scope全体の情報境界証拠の共通gateへの結合。今回表の静的読取だけでinformation_use_provenやpreflightをtrueにしない。


2026-10-12追補: 上表のzero-immediate複数frontier保存/支払結合はfallback-payment bundleで完了（3contract・除外候補を含む）。(1)は再実装しない。(2)上位/成長のsource根拠、(3)全event公開投影/履歴起点、(4)共通gateの結合は未完。


## 2026-10-12 C-bat回収receiptの相手向け非公開化

実next normal inventoryのpublic_historyへ伏せ準備の物理IDが残る経路を閉じた。現行public_application.scopeのみでraw eventとbefore準備表裏を照合し、相手の非公開target/returned_instance_idを除く。ownerの記録と確認できる公開装備のID、effect_appliedは保持。M06/Ccat/Efinalの対象は公開discard、Cchicken/Icoin/Ghitのrevealは本文上公開、非公開draw/bottomは既存whitelist対象外。concealed-return-history-review.mdと最終22PASS参照。raw marker/traceの起点認証や全情報証明には昇格しない。


2026-10-12: normal source inventoryのexpected母数を共有projectionから実ownerの6familyへ切替え。手札/盤面sourceの共有欠落、厳密count、hand variant/stage/card bindingを別照合（normal-source-projection-*）。全target expander/全情報利用/比較operandを証明した扱いにはしない。

## 2026-10-12 初回たまご交換の読取表訂正

466 reconstruct_openingはegg_exchange_bottomへ返却札source_instance_idを実際に保存する。実初期入口13stepの相手通常inventoryへ残る2REDを確認し、現行scopeで相手向けだけ除去した。02の非公開に従いrawと本人記憶は保持。egg-private-history-review.md、最終21PASS/独立5PASS。旧producerだけの調査を全初期入口へ一般化した上表の旧記述を訂正する。全event/全情報の証明ではない。


### P10 実通常履歴の許可field独立照合（2026-10-12）

4cc8be2から共有projectorが秘密由来hashを再投影でも保持する実入口1REDを修正。producerを呼ばず許可field/本人記憶/公開reveal/準備表裏から投影を別照合し、normal stepとtraceへentry/actor/count/raw-prefix/projected hashを結合。独立review C0/I1/Minor0のraw履歴binding-field正規化を修正、再reviewなし。最終19PASS63.921s/exit0、Python1079前後一致。allowed-history-review.md/summary.json/verification.logが最終証拠。初期fixture誤り・無効並行probe・修正前review ERRORは区別して保存。全情報利用/履歴起点/operand証明へ昇格せず、preflight-ready=false、生成/固定/400戦0。次はP09 source閉包/P11残operand/P14–18共通合成。


## 2026-10-12 指定選択・指定外解決選択の入力と乱数境界

基準a93265c。下表は実関数から乱数関数へ渡す引数の静的追跡である。full stateを受け取る局所rule sliceと、選択材料を受け取る純粋乱数関数を分けて記す。秘密を含むhashを全て無視する許可でも、実履歴の認証でもない。

| 実経路 | 条件・候補・選択材料 | full state／秘密領域の用途と境界 |
|---|---|---|
| mandatory_choice_boundary.prepare: egg_exchange_bottom | normal draw後、規則の追加drawを適用した本人手札の全copy ID | drawは規則処理。追加draw前の山札identityで候補を評価せず、draw後の本人手札から全候補を列挙する |
| prepare: ability_hand_bottom | M-beetle-01/P-cat_ceoの本人手札全copy ID。P-cat_ceoは本人main不在なら選択なし | 返却後drawのidentityを候補順位へ使わない。apply_choiceが選択後にdrawする |
| prepare: ability_draw_then_hand_bottom / final_time_hand_bottom | 本文のdraw後の本人手札全copy ID。final-timeは本人公開discardの対象適正を先に検査 | 解決prefixのdrawと許可後の手札選択を分離。final-timeの対象不適正はno-choice。未公開topを先に評価して候補を間引かない |
| prepare: ability_topdeck_order | 空山札ならno-choice、それ以外はtop/bottomの2候補 | looked_topは本文が本人に許す確認結果として保持。1/Nの材料は2位置IDであり、確認した札のidentityではない |
| mandatory_policy_local.build_local_record → mandatory_policy_random.build_proof | owner policy root、protocol/group/owner/mirror、8要素opportunity_address、完全候補ID列 | frame全体のentry_sha256とroot commitmentは記録。build_proofはframe/game/state hashを受け取らない。mirror分離HMAC→address/候補digest/count/counter、拒否抽選。唯一候補も算入証明にはしない |
| population_policy_bridge.Session.context/choose | 実turn owner・own turn回数・actor・発生種別・解決ordinal・指定契約名・selection/0 | occurrence_keyはfull continuationのhashだがjournal登録/重複検出のkeyだけ。乱数addressにkey/hashを含めない。choice_game全体の一致はcallback整合性の検査。全解決のordinal登録は別のpolicy_journal監査に依存する |
| legacy_choice_obligations: board_turn_stat_parameter | M03が現在mainならpower/wisdomの2候補 | 相手手札/山札は候補材料にならない。指定5種へ追加せず旧116除外 |
| legacy_choice_obligations: ability_topdeck_order | G-animal-shogiの本人公開discard対象が現在も適正、かつ本人山札非空ならtop/bottom | 対象や残存山札の適否と位置選択を分離。山札topのidentityを候補IDやcontextへ入れない。旧116除外 |
| legacy_choice_obligations: revealed_item_search | 本文指定の公開枚数、公開した札のitem/cost条件、全取得部分集合と残余全順序 | reveal後の札だけを候補に符号化。current107では別の条件付き非到達証拠が必要であり、この表で到達不能へ昇格しない |
| continuation_choices.resolve → 116 build_seed_proof | canonical全option ID、order_id/actor/round/phase/mandatory_choice/kind+link_id | current full hashはseed生成後にcandidate_set_evidence.state_refへ添付。seedの引数ではない。旧116戦略未解決/除外を保持 |
| population_resolution_choices.no_choice_route/audit | source分類/descriptorと既存handlerによる固定対象・発動時parameter・draw/reveal等 | 決定リストが空という理由でno-choiceにしない。指定465はjournalへ委譲、指定外3familyはlegacy監査、未対応routeはunproved |

乱数への直接引数に秘密hashがないことだけでは、候補母数・発生ordinal・履歴prefixの生成が真正であるとは証明できない。候補/局所効果はsource-pinned boundary、全発生順はpolicy journal/opportunity order、初期入力と全遷移はinitial/trace監査へ別に結合する。通常/response/逐次群の旧116と指定policyの適格性は混合しない。

現行通常履歴はhistory_projectionの独立許可field照合でraw prefix/actorへ結合済み。これは公開projectionの検査であり、raw履歴を生成した全ruleと外部初期入力の真正性は別責務である。上表と先行候補/比較表は、現行固定scopeの読取経路を記録した証拠として使う。全情報利用の普遍証明、P11比較operandの意味、P14–18の共通gateがこの追補だけで成立したとはしない。コード変更・試験再実行なし。
