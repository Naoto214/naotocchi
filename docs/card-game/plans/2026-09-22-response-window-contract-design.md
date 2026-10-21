# 119 response-window契約 設計仕様

更新日: 2026-09-22

## 1. 目的

117で保存した独立初期順2組×先後鏡像4経路は、R1たまご交換と安全な時0人物配置を終えた後、配置完了後の反応機会を機械可読に扱う契約がないため、すべて`post_placement_response`で停止した。

119では、01・02・06・91・93の既存ルールを変更せず、次の不足だけをresponse-window契約として固定する。

1. response候補を完全列挙する範囲。
2. 保存stateのphaseとcanonical response phaseの対応。
3. responseで何も発動しない場合のstable candidate ID。
4. `E-first-date`を含む合法な反応候補のstable IDと対象結合。
5. 114 candidate table、117 decision bridge、公開情報制約との接続。
6. 交互の反応機会、連続pass、連鎖構築、逆順解決、元の通常行動機会への復帰を表す状態遷移。
7. 戦略的に一意でないresponse選択を、カード価値や未来情報を推測せず次checkpointで再現する方法。

119は`protocol_only_no_match_progress` checkpointとする。117の4経路を進めず、stop artifact、保存state、state hash、event、snapshot、decision、winnerを変更しない。119で契約を正本化した後、次checkpointで同じ4 state/hashから再開する。

## 2. 正本入力と不変条件

119の入力は次へ固定する。

- [01 基本ルール](../01-core-rules.md)の通常行動と反応。
- [02 メインシステム](../02-main-system.md)のたまご中の能力境界。
- [06 アクション・連鎖](../06-action-chain-checkpoint.md)の反応機会、pass、連鎖構築・解決、通常行動への復帰。
- [91 できごと21本文](../91-event-21-card-text-draft.md)の`E-first-date`。
- [93 横断監査](../93-cross-type-boundary-audit.md)のB12。
- 107判断protocol: `data/proxy-decision-protocol-107-20260918.json`。
- 114候補表: `data/proxy-normal-decision-candidate-table-114-20260918.json`。
- 114 hardening contract: `data/proxy-normal-decision-hardening-114-20260918.json`。
- 116 fallback contract: `data/proxy-normal-decision-fallback-contract-116-20260918.json`。
- 117 plan、evaluation、4 stop artifact、builder、validator。

119は次を変更しない。

- 116の保存contract、version、許可decision kind、既存seed proof。
- 117のplan、evaluation、4 stop artifactとその生bytes。
- 115のshuffle seed、A/B各40枚manifest、card copy ID、initial instance ID。
- 112の未実施fixture 6件。
- 現行452、登録477候補、カード本文、数値、登録区分。
- `E-first-date`の時1、対象、ドロー、そだち+5、たまご中のB12裁定。

## 3. 採用方式

response-window専用のcontract、4停止状態のcandidate audit、builder／validatorを新設する。117 builderへ未定義adapterを直接追加する方式、4経路だけを通す条件分岐、114の通常行動用`candidate-pass`を応答へ流用する方式は採用しない。

119のbuilderは次の3単位を分離する。

1. **phase adapter:** 保存stateを変更せず、response contextを導出する。
2. **candidate enumerator:** 現在の応答権者について、合法候補と完全性証拠を作る。
3. **transition validator:** pass・発動・連鎖終了後の状態遷移が06と一致することを検査する。

candidate auditは「この状態なら次の判断を作れる」という証拠であり、選択・支払い・発動・解決を行った対戦記録ではない。

## 4. Canonical response context

117 stopに保存された`pre_decision_state.phase="post_placement_response"`とstate hashは変更しない。119のphase adapterはそのstateから、次のexact contextを別objectとして導出する。

| field | 117の4停止状態での値 |
|---|---|
| `source_phase` | `post_placement_response` |
| `phase` | `response_window` |
| `window_kind` | `after_normal_action` |
| `origin_event_seq` | `3` |
| `turn_player` | 経路の先手 |
| `priority_actor` | 経路の先手 |
| `chain_status` | `empty` |
| `chain_links` | `[]` |
| `consecutive_passes` | `0` |
| `response_opportunity_index` | `1` |
| `decision_kind` | `response_action` |
| `choice_kind` | `reaction_or_pass` |

`phase="response_window"`をcanonical表現とし、窓を開いた原因は`window_kind`で区別する。119が許可する`window_kind`は`after_normal_action`だけである。開始時、終了時、ちょうせん比較前、既存連鎖中などへ範囲を自動拡張しない。

adapterは元state、元state hash、origin event、turn playerとpriority actorを結合する。phaseを導出したことを理由に保存stateを再hashしない。

## 5. Candidate ID

### 5.1 response pass

responseで何も発動しない候補のcanonical IDは`response-pass`とする。

- 114の`candidate-pass`は通常行動候補表のsource IDであり、responseには使わない。
- 117が通常行動用に正規化した`pass`もresponseには使わない。
- `candidate-pass`、`pass`、`response-pass`のalias混在をvalidatorが拒否する。
- `response-pass`は現在の1回の反応機会を見送る候補であり、単独でターン終了や通常行動全体の放棄を意味しない。

### 5.2 手札からの「すぐつかう」

手札から発動するresponse候補は、カード現物、現在instance、発動方法、対象をIDへ結合する。117の既知候補は次で固定する。

`response-use-event-A-040#1-target-A-017#1`

このIDは`E-first-date`の現物`A-040`、現在instance`A-040#1`、対象`A-017#1`を表す。card IDだけで現物や対象を省略しない。複数対象または発動時選択を持つ将来候補は119へ推測で追加せず、次に実在局面が現れた時に同じ原則で個別契約を追加する。

### 5.3 能力・しかけた札

119の4停止状態には合法な盤面能力発動またはしかけた札がない。contractは候補familyとして`triggered_ability`と`prepared_activation`を保持するが、未出現のstable ID grammarやカード固有解決器を先回りして確定しない。

候補familyが存在する将来stateでは、source instance、能力識別子、対象、発動条件を一意に結合できるまでcandidate setをcompleteにせず停止する。

## 6. 完全列挙範囲

候補はresponse window全体ではなく、`priority_actor`の1回のresponse opportunityごとに列挙する。完全合法集合には必ず`response-pass`を含め、次の3 familyを現在stateから検査する。

1. 手札から合法に「すぐつかう」で発動できるカード。
2. 条件を満たし、現在の機会に発動できる能力。
3. 条件を満たし、現在の機会に発動できるしかけた札。

通常のたんじょう、ときおくり、へんしん、なかま／こいびと／セカイ配置、交際進行、みにつける、しかける、ちょうせんはresponse候補へ含めない。

完全性証拠は少なくとも次を持つ。

- source stop artifactとstate hash。
- priority actorとresponse context。
- 確認した自分の手札、盤面、準備枠、捨て札、残り時、予約。
- 公開された相手盤面、準備枠の公開状態、捨て札、残り時、予約。
- 検査したcandidate family。
- 各採用候補の正本参照、支払い可能性、条件、対象。
- 各除外カード／能力のIDと除外理由。
- `candidate_set_complete: true`。

相手の非公開手札、未公開の山札順、将来のドロー、将来の反応選択を完全性証拠へ使わない。相手の手札内容が必要な場合はcompleteにせず停止する。

## 7. 117の4停止状態のcandidate audit

119は4 stop artifactのstate/hashをそのまま読み、最初のresponse opportunityだけを監査する。

| path | priority actor | 完全合法候補 |
|---|---|---|
| `order-01-a-first` | A | `response-pass`、`response-use-event-A-040#1-target-A-017#1` |
| `order-01-b-first` | B | `response-pass` |
| `order-02-a-first` | A | `response-pass` |
| `order-02-b-first` | B | `response-pass` |

`order-01-a-first`では、Aの残り時1、手札の`E-first-date` A-040#1、交際0のこいびとA-017#1を確認する。91本文により発動可能で、93 B12によりたまご中でもできごと自身の効果は無効化されない。他の3経路では、そのpriority actorについて`response-pass`以外の合法response候補がないことを、手札と公開状態から証明する。

この表は候補監査結果であり、`order-01-a-first`が`E-first-date`を選んだことも、残る3経路でpassを実行したことも意味しない。

## 8. response選択の再現契約

次checkpointでcandidate auditを判断記録へ変換する際は、次の順で選択する。

1. 合法候補が1件なら`response_unique`としてその候補を選ぶ。
2. 複数候補を107・114の既存優先順位と公開情報だけで一意に比較できる場合は`priority_unique`を使う。
3. 複数候補が比較不能またはtradeoffなら、response専用の`seeded_fallback`を使う。

発動後に相手が何をするか、連鎖後に何を引くか等を予測して候補を優越させない。使えるカードがあるという理由だけで`response-pass`を劣位にしない。

response専用fallbackは116のSHA-256 modulo方式を再利用するが、116のcontract versionや許可decision kindを書き換えない。119 contract versionを使い、seed contextを次のexact keysへ固定する。

- `contract_version`
- `order_id`
- `actor`
- `actor_turn_index`
- `round`
- `origin_event_seq`
- `response_opportunity_index`
- `phase`
- `decision_kind`
- `choice_kind`

値は`phase="response_window"`、`decision_kind="response_action"`、`choice_kind="reaction_or_pass"`とする。seed材料は上記10値をこの順で並べ、最後にcanonical candidate ID昇順配列を加えた11要素JSON配列とする。serialization、SHA-256、big-endian unsigned integer、digest modulo Nは116と同じである。

119自身は4停止状態へこの選択を適用せず、seeded resultも保存しない。builder／validatorのunit testではsynthetic contextを使い、同じ入力から同じ証拠を再計算できることだけを検査する。

## 9. response-window状態遷移

contractは06を次の状態遷移へ写像する。

### 9.1 chainが空の時

- `response-pass`を1人目が選ぶ: `consecutive_passes=1`、priority actorを相手へ移す。
- 相手も`response-pass`を選ぶ: windowを閉じ、完了済み通常行動の後へ復帰する。
- 合法な発動を選ぶ: 発動をchainへ追加し、`chain_status="building"`、`consecutive_passes=0`とする。06どおり、発動したプレイヤー自身がまず追加発動するか選べるため、priority actorは発動したプレイヤーのまま次のopportunityへ進める。そのプレイヤーがpassした後に相手へ移す。

### 9.2 chain構築中

- pass後に相手が発動すれば、先にpassした側へ再び機会を渡し、`consecutive_passes=0`へ戻す。
- 双方連続passでchain構築を閉じ、最後に発動したものから逆順に解決する。
- 解決開始後に新しい発動を挟まない。

### 9.3 解決後

- 解決中に成立した誘発は現在chain終了後の新しいchainへ送る。
- 誘発と後続responseが残る間は次の通常行動へ戻らない。
- 未処理誘発もchainもなく、必要なresponse opportunityが双方連続passで閉じた場合だけ、元の通常行動機会へ戻る。

119はこの遷移のcontractとvalidatorを作るが、`E-first-date`の支払い、発動領域への移動、ドロー、そだち増加を実行しない。カード固有処理は次checkpointの固定replayで正本文とこの遷移契約へ接続する。

## 10. 既存candidate table／decision bridgeとの接続

114 candidate tableは、card IDごとのaction type、timing、時、条件、対象、正本参照を照合するsourceとして使う。`timing="normal_action_opportunity"`をresponseへ自動許可せず、01・06がresponseで許可する「すぐつかう」等と個別本文の条件を併せて確認する。

117 decision bridgeのID／detail一対一、selected／runner-up結合、malformed ID拒否の考え方は再利用する。ただし119 auditは未実行なので`selected_candidate`、`selected_action`、payment、event seqを持たない。通常行動の`pass`正規化規則もresponseへ流用しない。

次checkpointで117 replayへ接続する際は、119のcandidate auditを再生成してから選択contractを適用し、response decision、event、snapshot、hashを新しく記録する。保存済みstop stateを手書きで書き換えない。

## 11. エラーと停止の境界

次は119 contract validation errorとする。

- source stop artifactまたはstate hashの不一致。
- source state、card copy、instance、対象の不整合。
- `pass`／`candidate-pass`のresponse candidate混入。
- E-first-date候補、対象、時、交際段階の欠落・偽造。
- 候補IDとdetailの不一致、重複、未整列。
- 相手非公開手札または未来情報の参照。
- completeとしながら候補または除外証拠が欠けること。
- 119成果物を対戦進行、completed match、独立balance標本として数えること。

将来stateで合法候補を完全列挙できない、stable IDを作れない、既存ルールだけで合法性を確定できない場合は、その時点のreplayをrules-contract stopにする。plan、hash、instance、canonical serializationの破損をrules stopへ変換しない。

## 12. 機械可読成果物

119の実装では次を保存する。

- `data/proxy-response-window-contract-119-20260922.json`
- `data/proxy-response-window-candidate-audit-119-20260922.json`
- `tools/proxy_response_window_contract.py`
- `tools/test_proxy_response_window_contract.py`
- `119-response-window-contract.md`
- 本設計仕様
- 実装計画
- READMEとPR本文の119同期

対戦record、decision trace、event、snapshot、新stop artifactは作成しない。117の既存成果物を再生成・変更しない。

## 13. テスト方針

テスト先行で実際にREDを確認してから最小実装する。専用テストは少なくとも次を検査する。

1. 119 contractとcandidate auditが未実装の段階でREDになる。
2. 4 stop artifactのfilename、path、state hash、生bytesが変更されない。
3. `post_placement_response`からcanonical response contextを導出し、元stateを変更しない。
4. 4経路の最初のresponse opportunityと表の候補集合が完全一致する。
5. `response-pass`を必須とし、`pass`／`candidate-pass`を拒否する。
6. E-first-dateのsource instance、対象instance、時1、交際0、91／93根拠を結合する。
7. 通常配置・たんじょう・ときおくり・へんしん等をresponse候補へ含めない。
8. owner-known／public情報だけを使い、相手非公開手札と未来情報を拒否する。
9. candidate IDとdetailの一対一、昇順、一意性、完全性証拠を検査する。
10. pass交代、連続2 pass、発動時のpass reset、chain逆順解決、解決後誘発の遷移を検査する。
11. response専用seed proofを再計算し、116 contractを変更しない。
12. fixture、completed、decision trace、event、snapshot、winner、独立balance標本が119では0である。
13. 112の6 fixture、117の4 stop、452／477、カード変更0 IDを維持する。
14. 保存JSONとbuilder再生成結果が完全一致する。

専用test、全`test_proxy_*.py`、119 CLI、`check-design-data.py`、`git diff --check`を最終gateとする。リポジトリ全体を取得できる環境では`npm test`も実行する。

## 14. 範囲外

- 117の4経路の候補選択・発動・pass実行・対戦再開。
- E-first-dateの支払い、chain解決、ドロー、そだち増加。
- 112の6 fixtureの実施。
- response以外の開始時、終了時、ちょうせん比較前等のwindow一般化。
- 全452件の完全自動response合法性判定。
- 未出現の能力・しかける候補のID grammarの先行確定。
- 勝率、先後差、発動率、カード強度、採否の結論。
- カード本文、数値、登録区分、母集団、発売枚数の変更。
- 本編実装、表情、イラスト、別PRの変更。

## 15. 保存境界と次checkpoint

119はresponse-window contract、4停止状態のcandidate audit、builder／validator、テスト、正本文書を保存した時点で完了する。planned match 0、completed 0、stopped match 0、独立balance標本0とする。これは117のstopped 4を消した意味ではない。

次checkpointでは、119の契約を117 fixed replayへ接続し、同じstop artifactの同じ`pre_decision_state`と`last_valid_state_sha256`から4経路を独立に再開する。candidate auditを再生成し、response選択と状態遷移を記録する。新たな合法性不明またはrules-contract不足が出た場合だけ再停止し、hash、instance、plan破損はerrorにする。

112の6 fixtureへは、再開した4経路の結果を評価するまで進まない。PR #259はDraft・open・未マージを維持する。
