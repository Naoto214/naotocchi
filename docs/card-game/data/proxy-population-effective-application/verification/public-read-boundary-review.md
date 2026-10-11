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
| continuation_public_history.event_projection | 許可されたevent/result項目 | draw/hand-bottomのreceipt IDを出さない。全event種の生成field対応は未完。egg_exchangeのsource fieldについて、旧producerはselected_candidateのみなので、一般的なfield可能性を現行漏れの事実とは扱わない |
| population_policy_bridge.Session.choose | designated frame、完全合法候補、owner root/address | full choice state照合はcallback整合性、1/Nは指定5契約のみ。normal/responseへ許容を拡張しない |

## 今回の変更

C-chameleonのactual_public_continuous_stat_adjustment証拠は、game_state_sha256ではなくpublic_board_sha256を出す。hash対象は既存public(g)のround/turn_player/両者main・world・companions。カード本文・能力由来・全公開情報の完全な証明ではない。原event/shotのfull hash照合は変更しない。

G-beach-volleyの現行consumerを追加確認した結果、正の適用証拠は主にcondition_metとして使用され、normal/payment候補の正の証拠全体へ常に添付されるわけではない。したがって今回の発見は公開condition証拠への秘密由来hash混入であり、選択結果の秘密依存が確認されたとの主張はしない。

## 検証

新1件RED: actualとbaselineの証拠hash相違でFAIL。初回は誤った相対pathのためテスト未作成/AttributeErrorとなり、これはREDに数えない。修正後、public_application / continuation_public_history / hand_predicates / information_use / prepared_informationの関連19件PASS、9.374s、process exit0。新テストは全shotの実在deckを反転しraw hashを再結合、公開証拠一致を確認。再結合前は従来のhistory hash differsで拒否する。既存公開盤面有無の対照、除去済source、回収成功/不成立も維持。原RED logを併置、GREENは取得tool出力の要約でありraw logとはしない。

独立レビュー1回: Critical0/Important0。別実行でpublic_application 4件PASS。公開盤面へのcommitmentであってcard identity/rule/起点証明ではないこと、および正のconsumerはbool利用であることを確認。過去保存結果不変。全proxy回帰ではない。preflight-ready=false、本番gate閉鎖、生成/固定/400戦0、policy promotion=false、独立balance標本0。

## 次の一手

P10の残件を「全read未証明」の一語で再開しない。実adapter群（normal UNIT/ADMITTED/MAIN_TRANSITION、response hand/board）で読むfieldと許可根拠を対応させる。P11は候補scoreを作るcaps/worlds/batchとselect_verified_zero_immediateの上位/成長operand、P09はstart/arrival/end/hand群と既存occurrence監査の接続を継続。局所hash修正で本番gateを開かない。
