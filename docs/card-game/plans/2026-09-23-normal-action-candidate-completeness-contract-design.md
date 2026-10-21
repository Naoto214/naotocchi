# チェックポイント121 通常行動候補の列挙・完全性契約 設計仕様

更新日: 2026-09-23

## 1. 決定状態と由来

本書は、チェックポイント120までGitHubへ保存された正本・成果物、120の4 stop artifact、4停止点の横断監査、および会話で明示承認された121要件から新規に設計したチェックポイント121の仕様である。

旧チェックポイント121設計は実装前に原本を失い、2026-09-23に失効した。旧SHA-256 `8956f499b9ac2926554999d42f775b52a4216090ead01b149dc010359132fb0e`は本書の入力、復元目標、同一性判定に使用しない。本書は旧Markdownまたは旧Implementation Planの推測復元・近似復元・逆生成ではない。

本書の承認前は、詳細実装計画、121実装、121 JSON生成、120の4経路再開、README更新、PR本文更新を行わない。

## 2. 目的

チェックポイント121は、通常行動機会における合法候補集合について、次を機械検証できる一般契約をprotocol-onlyで正本化する。

1. 現在stateから調べるべきsourceとcandidate variantを漏れなく確定する。
2. 各source／variant／target展開を、既存正本に基づく`admitted`またはreason code付き`excluded`のどちらか一方として説明する。
3. admitted候補へstable candidate IDを付け、保存された合法候補集合が列挙証拠から完全に再計算できるようにする。
4. `candidate_set_complete`を保存値として信用せず、validatorが本書の12条件から独立に再計算する。
5. owner-known／public情報だけで判定し、相手の非公開情報と未来情報を拒否する。
6. 保存JSONとbuilder再生成結果のcanonical bytes完全一致を検査する。

この契約は、今回の4経路だけでなく、同じ通常行動プロトコルを使う将来のカード追加、通常対戦、再検証で再利用する。経路ID、order ID、特定カードcopy IDを条件にした分岐を契約ロジックへ置かない。

## 3. 非目的

121では次を行わない。

- 120の4経路を再開しない。
- 候補を選ばない。`pass`を実行せず、カードをプレイせず、時を支払わず、盤面を変更しない。
- 116 fallback、優先順位比較、seed選択を適用しない。
- response-window候補を列挙しない。
- decision、event、snapshot、winner、completed record、decision trace、stop artifactを新規作成しない。
- 117、119、116、112、120の保存済みファイル、state、hash、記録を変更しない。
- カード本文、数値、登録区分、現行452件、登録履歴477候補を変更しない。
- 112の構造的入力不足fixture 6件を実行しない。
- 現行452件すべてを実行可能にする汎用対戦エンジンを作らない。
- 既存正本にない裁定、candidate template、対象条件、履歴条件を推測で補完しない。

121の保存statusは`protocol_only_no_match_progress`とし、planned match、completed、stopped match、decision trace、event、snapshot、winner、独立balance標本、新stop artifactをすべて0とする。120のstopped 4は過去の保存結果として維持する。

## 4. 固定入力と保護境界

### 4.1 正本入力

候補列挙は、少なくとも次の既存正本を読み取り専用で使う。

- `01-core-rules.md`: 通常行動機会、時、人物配置、交際進行、通常ちょうせん。
- `02-main-system.md`: たんじょう・ときおくり・へんしんと、たまご中の制限。
- `06-action-chain-checkpoint.md`: 通常行動へ入れる境界とresponseとの分離。
- `107-normal-decision-protocol.md`: 通常判断の候補集合、記録、情報境界。
- `114-normal-decision-protocol-hardening.md`: candidate template、decision schema、優先順位の既存境界。
- `data/proxy-normal-decision-candidate-table-114-20260918.json`: 41 ID・7種類の手札カードaction templateとstanding candidate。
- `data/proxy-normal-decision-hardening-114-20260918.json`: `automatic_complete_legality=false`、schema、情報方針。
- `116-normal-decision-fallback-contract.md`: 完全列挙後だけに適用できる比較不能選択の境界。
- `119-response-window-contract.md`: response専用候補・pass・phaseの境界。
- `120-response-window-seeded-restart.md`および120のplan、evaluation、4 stop artifact: 読み取り専用の停止証拠。

カード固有のtemplateが参照するカード本文および境界監査も、templateの`source_text_reference`から到達する既存正本に限って読む。参照先が存在しない、内容がtemplateと整合しない、または現在stateへの適用を一意に決められない場合は停止する。

### 4.2 120停止証拠の固定値

| path | stop raw SHA-256 | last event | game state SHA-256 | continuation state SHA-256 |
|---|---|---:|---|---|
| `order-01-a-first` | `cf22f9171b5a6f2ef5f60e83c00ef1e9bf6dd89e84aaa8d55be33d300637cf08` | 7 | `641e77bb932b2a3b4d4214b0cd12306076ec86a990e13110c9e4bc4cf8f94d80` | `a698227f6c2c851c3012b64ba27cf9db77d8a0eeb13d583902efda03ac600a00` |
| `order-01-b-first` | `b0f77de2b82574a144a4742ee0d55e830400e44f8ca9b8eeb33c76def7bc6e9d` | 5 | `6462c0cb11bc0cb26aeb055a4b969578a3f9bd05ff8963584fe629ac00ff3616` | `cbda8acffc3a36ceb14b98a2cb36cd9649796444599ed02da4abfdcfc8403467` |
| `order-02-a-first` | `a2c617130f85360577014568309ab23a819ad10adb6c9710058f2651fccd421d` | 5 | `edbc2844074b27462439c1efe85f0c021b826cf75a51bdd115858029dfc2ff89` | `b325d7802cf9e9e621765f420727f33c16a52e0ea10a989bb1dd38376aa717ea` |
| `order-02-b-first` | `1705a9ce7cc19e34e78730da8716ec9c12f33a7a284bef8fe68176b36d79f688` | 5 | `c934f656ed14f0a73b2c70f714470e7bbdad98626ce4a4078fe96888aa426473` | `f4eaf9452682fd1c5ff2ecf7ed4dfb9a3ccd34fb3dba707cff7bff870b3accf5` |

builderは4ファイルの生bytes、両state hash、event seq、`phase="normal_action"`、actor、round、`reason_code="incomplete_legal_candidates"`を入力前に照合する。不一致はcandidate auditを開始せず、全体実装エラーとして停止する。

hash照合は完全なartifactに対して行うが、列挙器へ渡すstateは第10節の許可projectionだけとする。artifact内に存在する相手手札や山札順を、候補合法性の判定へ流してはならない。

## 5. 4停止点の横断監査

4件はすべて、response処理完了後の最初の`normal_action`判断機会で停止している。120で保存された既知候補は`pass`だけであり、停止理由は共通して`incomplete_legal_candidates`である。

| path | actor | 時 | owner公開状態の要点 | 既知候補 | 完全性を証明できなかった共通理由 |
|---|---|---:|---|---|---|
| `order-01-a-first` | A | 0 | mainなし、partner `A-017#1`、人物配置済み、予約なし | `pass` | 手札・盤面・予約・ちょうせん・交際を横断する列挙契約がない |
| `order-01-b-first` | B | 1 | mainなし、partner `B-017#1`、人物配置済み、予約なし | `pass` | 同上 |
| `order-02-a-first` | A | 1 | mainなし、companion `A-014#1`、人物配置済み、予約なし | `pass` | 同上 |
| `order-02-b-first` | B | 1 | mainなし、companion `B-014#1`、人物配置済み、予約なし | `pass` | 同上 |

原因分類は4件共通の契約不足であり、カード別・経路別の4障害として扱わない。121はこの共通契約だけを作る。

4 stateをacceptance auditへ入力した場合の期待する合法候補集合は次である。これは選択・実行・対戦再開ではなく、既存templateを現在stateへ適用した列挙結果の検査oracleである。

| path | expected admitted candidate IDs |
|---|---|
| `order-01-a-first` | `pass` |
| `order-01-b-first` | `candidate-play-main-B-001#1-birth`、`pass` |
| `order-02-a-first` | `pass` |
| `order-02-b-first` | `candidate-play-main-B-001#1-birth`、`candidate-play-main-B-009#1-birth`、`pass` |

この期待値へ到達させるための例外分岐は禁止する。一般pipelineから同じ結果を再計算できない場合、期待値へ合わせて候補を追加・削除せず、契約停止とする。

## 6. 契約の責務と既存契約との境界

| 契約 | 責務 | 121が行わないこと |
|---|---|---|
| 107 | 通常判断で完全候補集合を記録する原則 | 107の判断順や記録意味を変更しない |
| 114 | candidate template、priority、owner/public schema | `automatic_complete_legality=false`を改ざんせず、templateをstateへ適用する |
| 116 | 完全列挙後の比較不能候補をseedで選ぶ | 121では呼ばない。contract/version/許可decision kindを変更しない |
| 119 | response-windowの列挙、`response-pass`、遷移 | response候補を通常行動へ混ぜない |
| 120 | 読み取り専用の4停止証拠 | state/hash/eventを変更せず、経路を再開しない |
| 121 | 通常行動候補のsource inventory、variant展開、採否、完全性再計算 | 選択、適用、対戦進行を行わない |

## 7. 6 source family

各通常行動機会は、次の6 familyをこの順序で必ず監査する。

1. `standing_pass`
   - sourceは常に1件。
   - 114の`candidate-pass` templateを読むが、117・120で正本化された通常行動のcanonical candidate ID `pass`へ一方向に正規化する。
   - 保存候補として`candidate-pass`、`response-pass`、裸の`response`用`pass`別名を認めない。
2. `hand_card_action`
   - actorの現在手札にある全instanceをsource inventoryへ入れる。
   - 各card IDについて114 candidate tableの全actionと全`candidate_variants`を展開する。
   - normal action timing以外も監査対象には残し、`timing_not_normal_action`で除外する。
3. `board_card_action`
   - actorのmain、companions、partner、world、preparedにある全instanceをsource inventoryへ入れる。
   - 現在の通常行動機会に独立して宣言できる能力・actionだけを候補化する。継続効果、既に逃した誘発、条件未成立の反応、独立actionでない受動能力はreason code付きで除外する。
   - 既存templateまたは参照正本から独立actionか判定できない場合は推測せず停止する。
4. `reservation_action`
   - actorに適用済みの全reservationをsource inventoryへ入れる。
   - 現在が実行機会である予約だけを候補化する。予約が空ならfamily-level empty evidenceを`no_reservation_source`で記録する。
   - 未公開の未来予約、将来のdraw、将来成立し得る条件は列挙しない。
5. `normal_challenge`
   - actorごとにsynthetic sourceを常に1件作る。
   - `power`と`wisdom`、および正本が要求する参加個体・対象variantを展開する。
   - 自分ターン1回、時0、双方の参加main、現在の通常行動機会等を既存正本だけで判定する。
6. `relationship_progress`
   - actorごとにsynthetic sourceを常に1件作る。
   - 交際0→1、1→2、2→3、3→結婚を現在状態に応じて展開する。
   - 時1、自分ターン1回、partnerの存在、たまご中でないこと、現在段階を既存正本だけで判定する。

familyの空集合はfamily自体の省略を意味しない。`source_inventory`に件数0、empty reason code、参照正本、調査したstate fieldを記録する。

## 8. 列挙pipeline

列挙は全経路・将来stateで同じ関数境界を使い、次の順に行う。

1. `verify_source_artifact`: raw SHA-256、game/continuation hash、event seq、phase、actor、roundを照合する。
2. `project_normal_action_information`: full artifactからowner-known／public projectionだけを作る。
3. `inventory_sources`: 6 familyのsourceをschema順に収集する。
4. `load_candidate_templates`: source card IDとsynthetic familyに対応する既存templateを得る。
5. `expand_candidate_variants`: action、variant、対象候補を直積ではなくtemplateのtarget ruleどおりに展開する。
6. `adjudicate_enumeration_units`: 各unitを`admitted`または`excluded`へ一意に分類する。
7. `derive_legal_candidates`: admitted unitだけからcandidate detailとstable candidate IDを導出する。
8. `recompute_completeness`: 第12節の12条件を保存値から独立に再計算する。
9. `validate_audit`: schema、順序、参照、reason、情報境界、candidate projectionを検査する。
10. `materialize_canonical_json`: validatorがGREENの場合だけprotocol-only JSONを保存する。

列挙器へ`path_id`を渡すのは監査記録の識別と入力artifactの選択だけである。合法性判定関数の引数・分岐へ`path_id`、`order_id`、特定copy IDを使わない。

## 9. 記録モデル

### 9.1 contract JSON

将来生成するcontract JSONは次のtop-level fieldをこの順で持つ。

1. `schema`
2. `checkpoint`
3. `contract_version`
4. `status`
5. `source_contracts`
6. `protected_sha256`
7. `information_policy`
8. `source_family_registry`
9. `enumeration_unit_schema`
10. `reason_code_registry`
11. `candidate_id_registry`
12. `completeness_requirements`
13. `contract_stop_codes`
14. `scope`

schemaは`naotocchi.card_game.proxy_normal_action_candidate_completeness_contract.v1`、contract versionも同じ値とする。

### 9.2 candidate audit JSON

candidate audit JSONは次のtop-level fieldをこの順で持つ。

1. `schema`
2. `checkpoint`
3. `contract_version`
4. `status`
5. `source_files`
6. `protected_sha256`
7. `path_order`
8. `audits`
9. `summary`
10. `scope`

schemaは`naotocchi.card_game.proxy_normal_action_candidate_completeness_audit.v1`とする。`path_order`は120の4経路順を固定する。

各auditは次のfieldをこの順で持つ。

1. `path_id`
2. `source_stop_file`
3. `source_stop_sha256`
4. `game_state_sha256`
5. `continuation_state_sha256`
6. `last_valid_event_seq`
7. `opportunity_context`
8. `owner_state`
9. `public_information`
10. `information_policy`
11. `source_inventory`
12. `enumeration_units`
13. `legal_candidate_ids`
14. `legal_candidate_details`
15. `forbidden_information_used`
16. `completeness_checks`
17. `candidate_set_complete`
18. `contract_stop_codes`
19. `source_references`

### 9.3 enumeration unit

1 unitは次を持つ。

- `enumeration_unit_id`
- `source_family`
- `source_id`
- `source_zone`
- `source_instance_id`
- `card_id`
- `action_type`
- `candidate_variant`
- `target_instance_ids`
- `disposition`
- `candidate_id`
- `reason_codes`
- `evidence`
- `source_references`

`disposition`は`admitted`または`excluded`だけである。admittedは非nullの`candidate_id`と空の`reason_codes`を持つ。excludedは`candidate_id=null`と1件以上の登録済みreason codeを持つ。両方、未分類、unknown、保留は認めない。

## 10. 情報境界

`information_policy`は114と同じ`public_and_owner_known_only`を使う。

許可する入力は、actorの現在手札、actorの現在盤面、双方の公開盤面、公開されたprepared情報、双方の捨て札、双方の時・そだち、適用済み予約、公開履歴、現在turnの回数フラグ、instance-to-card mappingである。mappingは現在見えているinstanceのcard ID解決だけに使う。

次を候補合法性、除外理由、target展開、完全性証拠へ使用した場合は拒否する。

- 相手の非公開手札。
- 自分・相手の未公開山札順。
- future draw。
- future response、future normal action、将来の選択。
- 未成立の将来誘発、将来得るreservation。
- 正本にない推測情報。
- allowlist外のstate fieldまたは未知key。

validatorは`forbidden_information_used`が空であることだけを信用しない。owner/public objectのexact key、各evidenceの参照path、候補を導いた入力fieldを再走査し、禁止keyと禁止由来を独立に拒否する。

## 11. Stable ID

### 11.1 enumeration unit ID

全unitは採否にかかわらずstableな`enumeration_unit_id`を持つ。材料は次の順序である。

1. source family
2. source zone
3. source instance IDまたはsynthetic source ID
4. action type
5. candidate variant
6. target instance IDのcanonical昇順配列

同じstateとtemplateから常に同じIDを生成し、配列index、列挙時刻、path IDを材料にしない。衝突、未登録grammar、null/非null規則違反は契約停止とする。

### 11.2 candidate ID

candidate IDはadmitted unitだけに付ける。`pass`は通常行動専用の唯一のpass IDである。114入力の`candidate-pass`は出力へ保存せず、119の`response-pass`を受理しない。

カード行動のIDは登録済みgrammarから、action、source instance、variant、必要なtarget instanceを結合して生成する。今回のbirth grammarは`candidate-play-main-{source_instance_id}-birth`である。candidate detailから同じIDを再生成できなければ拒否する。

保存する`legal_candidate_ids`はcanonical昇順、重複なしとし、admitted unitから再生成した集合と完全一致させる。stable grammarがないactionを場当たり的な文字列で保存せず、`missing_candidate_id_grammar`で停止する。

## 12. candidate_set_completeの12条件

validatorは保存された`candidate_set_complete`を入力にせず、次の12 booleanを独立に再計算する。12件すべてtrueかつ`contract_stop_codes=[]`の場合だけ導出値をtrueとする。保存値が導出値と異なる場合はvalidation errorである。

| # | check ID | trueの必要十分条件 |
|---:|---|---|
| 1 | `opportunity_context_valid` | round、turn player、actor、phase、decision kind、choice kindがsource artifactと一致し、通常行動機会である |
| 2 | `source_artifact_integrity_valid` | raw SHA-256、game/continuation hash、event seq、card/instance mappingが固定入力と一致する |
| 3 | `information_boundary_valid` | exact allowlistだけを使用し、opponent private／deck order／future情報を使用していない |
| 4 | `required_source_families_present` | 6 familyがschema順に各1回存在し、省略・重複・未知familyがない |
| 5 | `source_inventory_complete` | 許可projectionから再収集した全sourceと保存inventoryが一致し、空familyにもempty evidenceがある |
| 6 | `candidate_templates_complete` | 各sourceに必要な既存templateが一意に結び付き、欠落・重複・参照不整合がない |
| 7 | `candidate_variants_complete` | templateが要求する全action／variantが各1回unit化され、余分・欠落・重複がない |
| 8 | `target_expansions_complete` | 各variantの全合法target組合せとtargetなしvariantが一意に展開され、対象漏れ・余分・順序依存がない |
| 9 | `canonical_predicates_resolved` | timing、cost、回数、履歴、枠、段階、対象、予約条件を既存正本と現在証拠だけでtrue/falseへ確定できる |
| 10 | `dispositions_and_reasons_valid` | 全unitがadmitted/excludedの一方だけで、excludedは登録済みreason・必要evidence・正本参照を持つ |
| 11 | `stable_candidate_ids_valid` | admitted全件のIDが登録grammarから再生成でき、一意・canonicalで、pass別名や衝突がない |
| 12 | `legal_candidate_projection_exact` | 保存IDs/detailsがadmitted unitからの再計算結果と完全一致し、canonical昇順で、`pass`をちょうど1件含む |

condition 9を確定できないunitは`excluded`へ推測分類しない。監査全体をcontract stopとし、`candidate_set_complete=false`にする。

## 13. Reason code registry

reason codeは既存正本の否定条件を機械化したものであり、新裁定ではない。各codeは必要evidence fieldと1件以上の正本参照をregistryに持つ。今回必要な最小registryは次の17件とする。

| reason code | 意味 |
|---|---|
| `timing_not_normal_action` | actionのtimingが現在の通常行動機会ではない |
| `insufficient_time` | 現在の支払可能な時が必要値未満 |
| `main_transition_not_legal` | birth／ときおくり／へんしんの段階・種族・遷移条件を満たさない |
| `person_placement_limit_used` | なかま／こいびとの共有配置回数を使用済み |
| `partner_slot_occupied` | 新しいこいびとを置く枠が空でない |
| `required_own_main_absent` | actionが必要とする自分mainが存在しない |
| `required_history_absent` | actionが必要とする公開済み履歴が成立していない |
| `required_target_absent` | templateが要求する合法targetが存在しない |
| `passive_not_separate_action` | 盤面効果が独立して宣言する通常行動ではない |
| `no_reservation_source` | 現在のactorに適用済みreservationがない |
| `reservation_not_due` | reservationは存在するが現在の通常行動機会に実行しない |
| `challenge_participant_missing` | 通常ちょうせんに必要な参加mainが存在しない |
| `challenge_limit_used` | 自分ターン1回の通常ちょうせんを使用済み |
| `relationship_partner_absent` | 進行対象のこいびとが存在しない |
| `relationship_blocked_while_egg` | たまご中のため保持関係を進行できない |
| `relationship_limit_used` | 自分ターン1回の交際進行を使用済み |
| `relationship_state_terminal` | 現在の関係が結婚済みで次の通常進行がない |

1 unitへ複数codeが該当する場合はregistry順で全件を記録する。最初の1理由だけで走査を打ち切らない。codeでは表現できない否定条件を自由文だけで保存せず、registry追加が既存正本から導けるかを別設計で確認するまで停止する。

## 14. Contract stop

次の場合、対象auditは`candidate_set_complete=false`とし、候補選択へ渡さない。

- `missing_candidate_template`
- `duplicate_candidate_template`
- `unsupported_source_family`
- `unresolved_canonical_predicate`
- `missing_state_evidence`
- `incomplete_target_expansion`
- `missing_exclusion_reason`
- `missing_candidate_id_grammar`
- `candidate_id_collision`
- `forbidden_information_required`

raw bytes、state hash、event seq、schema、manifest、card/instance mappingの破損は候補不完全性ではない。4経路単位のrules stop artifactを作らず、121 builder/validatorの全体実装エラーとして停止する。

既存正本だけでは合法性を確定できない場合は`unresolved_canonical_predicate`で停止する。121内で裁定を追加して続行しない。情報境界を破らなければ確定できない場合は`forbidden_information_required`で停止する。

## 15. Canonical bytesと保存検査

将来の121実装は次の成果物を予定するが、本書作成時点では生成しない。

- `data/proxy-normal-action-candidate-completeness-contract-121-20260923.json`
- `data/proxy-normal-action-candidate-completeness-audit-121-20260923.json`
- `tools/proxy_normal_action_candidate_completeness.py`
- `tools/test_proxy_normal_action_candidate_completeness.py`
- `121-normal-action-candidate-completeness-contract.md`

JSONはUTF-8、indent 2、LF、末尾newline 1件、schemaで定めたkey/array順でserializeする。保存ファイルをparseして意味比較するだけでは不十分である。builderの再生成bytesと保存bytesを直接比較し、1 byteでも異なれば失敗とする。

validatorは少なくとも次を独立に行う。

- contract JSONとaudit JSONのexact schema/key/order検査。
- 12条件の再計算と保存booleanとの一致。
- source inventory、unit集合、reason、candidate ID、legal projectionの再生成。
- owner/public allowlistと禁止由来の検査。
- 4 stop artifactのraw bytes・両hash・event seq非変更。
- 117・119・116・112・120の保護対象非変更。
- 保存JSONとbuilder再生成canonical bytesの完全一致。

## 16. 検証用の一般性・過剰一般化境界

一般性は「114 templateを任意の通常行動stateへ適用し、6 familyを同じpipelineで監査できる」範囲に置く。card-specific dataはtemplateとreason evidenceへ置き、Pythonの経路別if文へ置かない。新しいカードを追加する場合は、既存schemaに従うtemplate、既存または承認済みreason、candidate ID grammarをdataとして追加し、同じvalidatorで再検証できる構造とする。

一方、121で次を先回りしない。

- 452件すべてのカード本文を実行形式へ変換すること。
- 任意のchain、誘発、解決を処理すること。
- AI選択、勝率、カード強度評価を統合すること。
- 未使用のzone、未登場のaction family、仮想card typeを抽象化すること。

新しいsource familyが実際に必要になった場合は、既存6 familyへ無理に押し込まず、別の承認済み設計でregistryと12条件への影響を定める。

## 17. 自己監査基準

本書は承認提示前に次を満たすことを確認する。

- 旧121原本・旧SHA・旧Implementation Planを設計根拠または復元目標にしていない。
- 120までのGitHub正本、4停止artifact、横断監査、会話で承認済みの121要件から設計している。
- protocol-onlyであり、120の4経路を再開する工程がない。
- 6 source familyの全source／variantをadmitted/excludedで説明する。
- `candidate_set_complete`を保存値として信用せず、12条件から独立再計算する。
- stable candidate IDと通常行動`pass`をresponse用`response-pass`から分離している。
- opponent private、deck order、future情報を拒否する。
- 既存正本で解けない合法性を推測せずcontract stopにする。
- 107/114、116、119、120の責務境界を変更していない。
- 117・119・116・112・120の保存済み証拠を読み取り専用にしている。
- 4経路専用分岐を禁止し、将来のカード追加・通常対戦・再検証へ再利用できる。
- 現行452件全体の汎用対戦エンジン化を要求していない。
- 保存JSONとbuilder再生成canonical bytesの完全一致を要求している。
- planned/completed/stopped/decision/event/snapshot/winner/独立balance標本を121で増やさない。

## 18. 承認後の境界

本書が承認された後にのみ、別ファイルとして詳細TDD実装計画を作る。計画承認前に121実装、JSON生成、README/PR本文更新、120の4経路再開へ進まない。

121を実装・保存した後も、120の4経路再開は次のチェックポイントとして独立に承認を得る。121のaudit結果は候補集合の完全性証拠であり、候補が選ばれたこと、passが実行されたこと、対戦が進行したことを意味しない。
