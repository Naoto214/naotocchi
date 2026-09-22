# 120 response-window seeded restart 設計仕様

最終更新: 2026-09-22

## 1. 目的

チェックポイント120では、117で停止した4経路を、各stop artifactに保存された同一の`pre_decision_state`、`last_valid_state_sha256`、event seq 3から独立に再開する。119で正本化したresponse-window契約を実対戦へ接続し、各経路をR10完了、早期勝利、真正のrules-adjudication停止、または再開後に局所化できたrecord-integrity停止まで進める。

120は117、119、116、112を読み取り専用入力として扱う。既存artifact、正本文書、生成器、検査器、テストを変更せず、120専用replay adapterと120専用成果物を新設する。本編実装、表情、イラスト、カード本文・数値・登録区分、112 fixture実施を含めない。

## 2. 採用方式

120専用replay adapterを採用する。

- 117生成器を直接拡張しない。117の保存結果と再生成結果を入力証拠としてのみ使用する。
- 汎用対戦エンジンを新設しない。120 planに明示した、既存正本だけで確定できる経路をmaterializeする。
- 117 builderで停止直前までの証拠をメモリ上で再生成し、保存済み117 stop artifactと照合する。
- 119 contractとcandidate auditをメモリ上で再生成し、保存済みJSONと照合する。
- 照合済みの同一state/hashから4経路を別々に再開する。
- 1経路の真正停止は残る経路を中止させない。
- protected source、120 plan、writer manifest、未実装handlerの異常は経路停止に偽装しない。

117生成器の変更方式は、既存117記録を変更する危険があるため不採用とする。汎用エンジン方式は120の必要範囲を超え、正本にない自動裁定を導入するため不採用とする。

## 3. 読み取り専用入力

120の機械可読入力を次へ固定する。

- `data/proxy-normal-decision-seeded-restart-plan-117-20260919.json`
- `data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json`
- `data/proxy-normal-decision-stops-117/stop-117-*.json` 4件
- `data/proxy-response-window-contract-119-20260922.json`
- `data/proxy-response-window-candidate-audit-119-20260922.json`
- `data/proxy-normal-decision-fallback-contract-116-20260918.json`
- `data/proxy-normal-decision-candidate-table-114-20260918.json`
- `data/proxy-normal-decision-hardening-114-20260918.json`
- `data/proxy-decision-protocol-107-20260918.json`
- `data/proxy-normal-decision-first-choice-plan-115-20260918.json`
- `data/proxy-normal-decision-first-choice-audit-115-20260918.json`

規則参照は01、02、06、64、91、93と、120 planの各stepが`source_references`で明示する既存カード本文・既存裁定に限定する。builderは参照pathの存在を検査し、planにない正本文を暗黙に補助根拠として使用しない。

120は既存正本にない裁定を追加しない。カード固有処理、対象、条件、支払い、解決順、予約、誘発、勝利判定のいずれかを既存正本だけで確定できない場合、その経路を未解決判断の直前で`stopped_rules_adjudication`とする。

## 4. 保護対象

### 4.1 117 stop artifactとstate hash

| path | stop raw SHA-256 | state SHA-256 |
|---|---|---|
| `order-01-a-first` | `c1f75fed4ea40c685740d78b67885ab21092f3d125a79b044474e2cbb26c3b92` | `79c8ba24c4749d34436e5dbc36a89aac6f59bd682d02763715f68bd33068ff80` |
| `order-01-b-first` | `58b3fbce9d570b472dd6c91ee5ad1a043a2fd94864d6019deedfd3a78f3d2bcd` | `468cb23491db85e53c2ede37c57c325b6620c82ca4cb7bbdeb6b7e7fd95de399` |
| `order-02-a-first` | `a4e1b35c03da7c8927e94b59740a16bbf8b78f69d165c516cf9c3a4652f8fc5c` | `87df61c75bb6a304b684ab00444b321cb1e1b25ee95f6a3b8353af0beae804de` |
| `order-02-b-first` | `e66ae50ec54c3b568dcef30f75c9d2751346aa92a35e9748ac96dc0053b6e232` | `d3969f6708ae9834295a88d07b2cd7f88da7889541f48175bae4715af61de240` |

全経路のresume event seqは3、source phaseは`post_placement_response`である。117 stopのstate、phase、hash、card copy ID、instance ID、manifest、生bytesを変更しない。

追加の固定値は次とする。

- 116 fallback contract raw SHA-256: `8a7f41847339816d786d6c6055e290454cf8d5d84d6ccc22d6a32eb287cbfb6f`
- 117 plan raw SHA-256: `2502320582b2cf6b05731bd7d23e37e62a7437f1b4b48361fd8e591ba53583d2`
- 117 evaluation raw SHA-256: `de90629db36032ad2c6a6be0c804c60227383e5c2bdb218939dbbca2334268ff`

### 4.2 119成果物

| file | raw SHA-256 |
|---|---|
| `119-response-window-contract.md` | `c79e89709c687211ae5ca4a2ba3328e285ffafcf9b7790f913ae5ceb953cba45` |
| `data/proxy-response-window-contract-119-20260922.json` | `10c9d5fd0389750749c1c2154d2d497425d2446414756002d262feebfa6c7fa7` |
| `data/proxy-response-window-candidate-audit-119-20260922.json` | `d5c854e09f3544d2e8bb159912ee6268c5a211969942f65c4422c0c8f2434d98` |
| `tools/proxy_response_window_contract.py` | `43c84e9f8768998d0ecdb489cfea53d80396102bf99bfcec197f9e2a657be1ed` |
| `tools/test_proxy_response_window_contract.py` | `c89d07c9e1c3a7f211d383ad5bbcbda1728016e305b50c4bfa9db7a2cbec60c7` |
| `plans/2026-09-22-response-window-contract-design.md` | `5109b4266b399caec837c6e38c48310845f06066adef5e79f6ee40dd0a782c1a` |
| `plans/2026-09-22-response-window-contract.md` | `9bc121d334ad335a3b0bc1fd588aa027440e254e7e57343a894671a6062f4e9f` |

### 4.3 112 fixture

112の6件は未実施のまま保つ。`status="fixture"`、events空、winner null、completed 0、独立強度標本0を変更しない。

| file | raw SHA-256 |
|---|---|
| `fixture-112-g-jump-quest.json` | `809b8f6eaf2aaeff643dd9e40e3a8895b792e1a2c89ff777828583a8a9ed73e2` |
| `fixture-112-m-dragon-08.json` | `4100308b9208c085ee3f68eb4be3a28efb554812f1ca14c8df1b7ac63a44f7f3` |
| `fixture-112-m-god-08.json` | `b480cd13b621888d10c1e3b20f750cdb5aa3169c129922755883759c715c5c28` |
| `fixture-112-m-mushroom-06.json` | `0828df1cade39d100800c64e9aa5e3020613a8b6b3e43c60fbf71d5248e4a463` |
| `fixture-112-m-penguin-07.json` | `e5202c43c8b1043d6481fe69781fb0ba8ca524c9417aabcab37880a9e525a1ca` |
| `fixture-112-m-sakura-05.json` | `e47981398303d6f969ab44fc42dd8c19e59b9de4e0107c3e0bffc52c65004e34` |

実装時は上記raw SHAに加え、git diffで112、116、117、119既存成果物に変更がないことを検査する。

## 5. 120成果物

120は次を新設する。

- `data/proxy-response-window-seeded-restart-plan-120-20260922.json`
- `data/proxy-response-window-seeded-restart-evaluation-120-20260922.json`
- `data/proxy-matches-120/`（completed経路がある場合だけ作成）
- `data/proxy-decision-traces-120/`（completed経路がある場合だけ作成）
- `data/proxy-response-window-stops-120/`（stopped経路がある場合だけ作成）
- `tools/proxy_response_window_seeded_restart.py`
- `tools/test_proxy_response_window_seeded_restart.py`
- `120-response-window-seeded-restart.md`
- `plans/2026-09-22-response-window-seeded-restart-design.md`
- `plans/2026-09-22-response-window-seeded-restart.md`

保存directoryは期待manifestが空なら作らない。writerは期待外ファイルが1件でもあれば、書き込み前に全体エラーで中止する。保存JSONはUTF-8、`ensure_ascii=False`、indent 2、末尾newlineでcanonical化し、builder出力とraw bytes完全一致を要求する。

## 6. 120 plan

planのtop-level exact keysは次とする。

1. `schema`
2. `checkpoint`
3. `contract_version`
4. `source_files`
5. `protected_sha256`
6. `route_order`
7. `routes`
8. `scope`

`route_order`は次の順に固定する。

1. `order-01-a-first`
2. `order-01-b-first`
3. `order-02-a-first`
4. `order-02-b-first`

各routeは`path_id`、`order_id`、`first_player`、`source_stop_file`、`source_stop_sha256`、`source_state_sha256`、`resume_event_seq`、`steps`、`terminal`を持つ。各stepは判断前の両hash、phase、actor、round、decision kind、choice kind、response opportunity index、完全候補、candidate detail、選択方式、seed proofの有無、選択候補、runner-up、支払い、対象、chain、公開情報、正本参照、期待する遷移を固定する。

planの`steps`が尽きたのにterminalへ到達しない場合は`plan exhaustion`全体実装エラーとする。builderが未知のaction/effect handlerを要求された場合も全体実装エラーとする。いずれも真正停止へ変換しない。

## 7. 再開時の照合

`load_checkpoint_120_inputs()`はprotected sourceを読み込む。`verify_protected_sources()`はraw SHA、117 state hash、event seq、115 manifest、card copy／instance identityを検査する。

117 builderで4経路を停止地点までメモリ上で再生成し、次を保存済みstopとexact比較する。

- path、order、first player、actor、round、phase
- event seq 3
- `pre_decision_state`
- `last_valid_state_sha256`
- card lookup 80件
- 各playerの40現物と全zone所属
- 117 partial events、snapshots、decisionsの終端

119 builderでcontractとcandidate auditを再生成し、保存JSONとcanonical bytes一致を確認する。これらの検査が完了する前に120 routeを1件も進めない。

## 8. Stateとhash

### 8.1 source game state

各routeのsnapshot 0は117 stopの`pre_decision_state`をdeep copyして保持する。source state内の`phase="post_placement_response"`を`response_window`へ書き換えず、source stateを再hashしない。

`source_game_state_sha256`は117の`last_valid_state_sha256`と完全一致しなければならない。

### 8.2 continuation state

120はsource stateとは別に119 phase adapterからresponse contextを導出する。continuation stateは次を含む。

- `game_state`
- `response_context`
- `activation_zone`
- `pending_triggers`
- `return_target`

`game_state_sha256`はカード領域、時、そだち、盤面、予約、turn／round／phase等の対戦状態をcanonical化する。`continuation_state_sha256`はgame stateにresponse context、priority、chain、activation zone、pending triggers、return targetを加えた120進行状態をcanonical化する。

snapshot 0は`source_game_state_sha256`を117 hashへ固定し、別fieldで最初の`continuation_state_sha256`を保存する。adapterを付加したことを117 stateの変更や再hashとして扱わない。

各120 eventは`game_state_before_sha256`、`game_state_after_sha256`、`continuation_state_before_sha256`、`continuation_state_after_sha256`を持つ。passでgame stateが変わらない場合も、priority、pass数、response opportunity indexが変わるためcontinuation hashは変化する。

## 9. 最初のresponse opportunity

119 candidate auditを再生成した結果を最初の判断へ使用する。

| path | legal candidates | resolution mode | selected |
|---|---|---|---|
| `order-01-a-first` | `response-pass`; `response-use-event-A-040#1-target-A-017#1` | `priority_unique` | `response-use-event-A-040#1-target-A-017#1` |
| `order-01-b-first` | `response-pass` | `response_unique` | `response-pass` |
| `order-02-a-first` | `response-pass` | `response_unique` | `response-pass` |
| `order-02-b-first` | `response-pass` | `response_unique` | `response-pass` |

`order-01-a-first`では、E-first-dateの解決で確定するそだち+5が107・114の第3優先順位`maximize_certain_growth_difference`でpassを上回る。時収支は第4優先順位であり参照しない。この比較に新しいカード価値点を導入しない。

他3経路は候補1件のためseedを使わない。最初の4判断へ119のsynthetic seed proofを適用しない。

## 10. E-first-date処理

`order-01-a-first`の最初のresponseは次の順で固定する。

1. `priority_unique`で`response-use-event-A-040#1-target-A-017#1`を選択する。
2. Aの時1を支払い、残り時を0にする。
3. `A-040#1`をAの手札から120 continuation stateのactivation zoneへ移す。
4. 対象`A-017#1`を固定し、E-first-dateをchainへ追加する。
5. `chain_status="building"`、`consecutive_passes=0`とする。
6. 06どおり、発動者Aが次のpriority actorになる。
7. Aの次のresponse候補を現在stateから再列挙する。候補が`response-pass`だけなら`response_unique`でpassする。
8. priorityをBへ移し、Bのresponse候補を現在stateから再列挙する。候補が`response-pass`だけなら`response_unique`でpassする。
9. 双方連続passでchain構築を閉じ、最後に発動したlinkから逆順解決する。
10. 解決時に`A-017#1`がAのこいびと枠にあり、交際段階0であることを再確認する。
11. 山札上1枚を正当に引き、Aのそだちを20から25へ増やす。
12. `A-040#1`をactivation zoneからAの捨て札へ移す。
13. 解決中に成立した誘発は現在chain終了後の新しいchainへ送る。
14. 未処理誘発、後続response、chainが残らない場合だけ、自分の通常行動機会へ戻る。

発動、支払い、対象固定、発動者priority、pass、逆順解決、ドロー、そだち増加、捨て札移動を別々のevidenceで追跡できるようにする。発動領域を手札や捨て札と同一視しない。

残る3経路では、最初のpriority actorが`response-pass`し、相手のresponse候補を再列挙する。相手も`response-pass`ならchainが空のままwindowを閉じ、自分の通常行動機会へ戻る。

## 11. 以後の候補列挙と選択

各判断機会で、現在stateと現在までに正当に公開された履歴だけから候補を再列挙する。

- 通常行動は107・114・116を使用する。
- たまご交換等の必須選択は116を使用する。
- responseは119を使用する。
- カード固有処理は既存カード本文と既存裁定だけを使用する。

選択順は次とする。

1. 合法候補が1件なら、responseでは`response_unique`、他の判断では対応する一意選択として選ぶ。
2. 107・114の既存優先順位と公開情報だけで一意なら`priority_unique`を使う。
3. 完全列挙済みだが比較不能またはtradeoffなら、通常／必須選択は116、responseは119のseeded fallbackを使う。
4. 合法性、完全性、stable ID、対象、支払い、効果処理を既存正本だけで確定できなければ真正停止する。

将来のresponseで複数候補が生じた時だけ、119のexact 10-key contextと候補昇順配列からresponse seed proofを作る。116のcontract version、許可decision kind、seed contextは変更しない。

## 12. 情報境界

候補列挙と選択に使用できる情報は次に限定する。

- 判断者自身が正当に知る手札、場、捨て札、準備、activation zone、予約、残り時
- 公開された相手の盤面、捨て札、準備の公開部分、activation zone、予約、残り時
- 公開されたevent、decision、支払い、対象、chain履歴
- 現在までに正当に解決したドローや公開処理の結果

次を拒否する。

- 相手の非公開手札
- 未公開の山札順
- まだ行われていないfuture draw
- future response choice
- 記録者だけが知る後続planの選択

山札順は対戦状態の完全性検査と、正当にドローを解決する時には使えるが、ドロー前の候補比較や選択には使わない。正当に引いたカードは、そのドロー後に開始する新しい判断から使用できる。

## 13. 経路別独立実行

`continue_routes_independently()`はrouteごとに状態、evidence、例外境界を分離する。あるrouteが真正停止または局所record-integrity停止になっても、残るrouteをroute orderどおり実行する。

routeのterminal statusは次のいずれかとする。

- `completed`
- `stopped_rules_adjudication`
- `stopped_record_integrity`

completedはR10の両ターンと最終比較を完了した場合、またはそだち100維持条件による早期勝利が成立した場合だけ許可する。途中経路、response windowを閉じただけの経路、plan末尾へ到達しただけの経路をcompletedにしない。

## 14. 真正rules-adjudication停止

`stopped_rules_adjudication`のreason codeは次に限定する。

- `incomplete_legal_candidates`
- `opponent_private_or_future_information_required`
- `missing_stable_candidate_identifier`
- `legality_not_confirmed`
- `canonical_rule_not_defined`
- `effect_resolution_not_defined`

停止artifactは未解決判断を実行せず、最後に有効だった次を保存する。

- event seq
- game stateと`game_state_sha256`
- continuation stateと`continuation_state_sha256`
- actor、round、phase、decision kind、choice kind
- 確認済み候補とcandidate detail
- 不足している合法性・契約の正確な範囲
- 使用した公開情報と未使用の禁止情報
- source reference
- resume condition
- winner null
- completed false
- independent balance sample false

既存正本にない裁定を120本文、plan、builderへ補完して停止を回避しない。

## 15. Record-integrity停止

再開後の1経路だけに局所化できる次の破損は`stopped_record_integrity`とする。

- event前後hashの不連続
- card copy／instanceのzone重複または消失
- decisionとeventの参照不一致
- chain link、reservation、targetのdangling reference
- snapshot seq、event seq、decision seqの不連続

破損後のstateを正当な停止stateとして採用しない。最後に全validatorを通過したevent seq、game state、continuation state、両hashを保存し、検出した破損種別、検出対象、再開条件を記録する。winnerはnull、completedとindependent balance sampleはfalseとする。

## 16. 全体実装・入力エラー

次は経路停止へ変換せず、writer実行前またはmaterialization全体を失敗させる。

- 112、116、117、119 protected sourceのraw SHA不一致
- 117 source state hash、115 manifest、80 instance identityの不一致
- 119 contract／candidate audit再生成結果の不一致
- 120 planのschema、source binding、pre-state hash、期待遷移の不一致
- plan exhaustion
- 未実装action/effect handler
- 保存先の期待外JSON、期待外directory、欠落artifact
- builder出力と保存JSONのcanonical bytes不一致
- 同じpathの重複実行またはroute order不一致

実装不足、plan不足、protected input破損を`canonical_rule_not_defined`や`stopped_record_integrity`へ偽装しない。

## 17. Decision、event、snapshot

response passもdecisionとeventとして記録する。game stateが不変でもresponse contextが変わるためsnapshotを追加する。

各decisionは少なくとも次を持つ。

- stable decision IDと連続decision seq
- event seq
- actor、round、phase、decision kind、choice kind
- response opportunity index（responseの場合）
- pre-decision game／continuation hash
- 完全なlegal candidate IDsとdetails
- candidate completeness evidence
- resolution mode
- seed context／proof（使用時だけ）
- selected candidate／action
- runner-up candidates／action
- reason code
- payment、targets、chain
- public information
- source references

各eventはstable event ID、連続seq、action type、actor、source instance、payment、targets、chain、reservation／instance transition、前後の両hash、resultを持つ。各snapshotはevent seq、game state、continuation state、両hashを持つ。

decisionが行動を選んだ場合は対応eventを一意に参照する。自動解決、誘発、ターン開始・終了等のdecisionを伴わないeventは、decision IDをnullにして理由をaction typeで明示する。

## 18. 評価境界

evaluationのplanned route countは4固定とする。completed、stopped rules、stopped integrity、event、snapshot、decision、winner等の件数は保存した4 outcomesから再計算し、planやcached summaryを信頼しない。

117の4経路は既にseeded／strategic unresolved判断を含む。このため120でcompletedになった経路も独立balance標本へ加算しない。120の`independent_balance_sample_count`は0固定である。

120の結果を次へ使用しない。

- 勝率
- 先後差
- 発動率
- カード強度
- カード採否
- 現行452または登録477の変更根拠

partial routeでカードを使用しなかったことを発動率0と数えない。112 fixtureを対戦、completed記録、独立標本へ数えない。

## 19. TDD方針

実装はTaskごとに次の順序を必須とする。

1. 失敗テストを書く。
2. 対象機能不足によるREDを実際に確認する。
3. そのTaskを満たす最小実装を行う。
4. 専用テストをGREENにする。
5. 小さくコミットする。

実装計画は少なくとも次の単位に分ける。

1. protected input loader、117/119再生成照合、dual-hash resume adapter
2. 最初の4 response判断とpass transition
3. E-first-date発動、発動者priority、chain解決、ドロー、そだち、捨て札移動
4. 通常／必須／response候補列挙、選択bridge、経路別continuation
5. rules stop、record-integrity stop、completed terminal、経路独立性
6. plan／record／trace／stop／evaluation materializationとstrict validator
7. 120正本文書、README、総合checker、PR本文、最終保存確認

各Taskのテスト名、関数名、JSON field、RED command、GREEN command、commit messageを実装計画で具体化する。

## 20. 検証

実装完了時は最低限次を実行する。

- 120専用response-window seeded restartテスト
- 全`test_proxy_*.py`
- 120 CLI
- `check-design-data.py`
- 保存JSONとbuilder再生成結果のcanonical bytes完全一致
- 117 stop artifactのraw bytes／state hash非変更
- 119の7成果物非変更
- 116 contract／117 plan／117 evaluation非変更
- 112 fixture 6件のraw bytesと未実施状態非変更
- route independenceと、1経路停止後も残経路が継続すること
- 発動者本人が先に追加発動できる06 priority順
- opponent private／future information拒否
- game／continuation hash、event、snapshot、decisionの連続性
- 期待artifact manifestと余分なJSON拒否
- `git diff --check`
- リポジトリ全体を取得できる場合は`npm test`

local sparse checkoutによりcatalog/link依存testや`tests/smoke-test.js`が欠落する場合、その既知エラーを120の成功・失敗へ混ぜない。実行できた検査と環境上開始不能だった検査を別々に報告する。

## 21. GitHub保存境界

実装・検証後に次を実確認する。

- local HEADとtree
- remote HEADとtree
- 変更ファイル一覧
- 検査件数と結果
- PR #259がDraft、open、未マージであること
- 新HEADのworkflow run
- 新HEADのcommit status
- 最新mainと`docs/card-game/`競合有無

新HEADでworkflow runまたはcommit statusが0件なら、過去のCI成功を120のCI成功として数えない。mainへマージせず、本編、表情、イラスト、別PR変更を混ぜない。

## 22. 設計自己監査

- 120専用adapterで117／119を完全分離している。
- 4経路を同じ117 state/hash、event seq 3から独立再開する。
- 完了または真正停止まで継続し、response window終了だけをterminalにしていない。
- 119の`response-pass`を通常行動用`pass`／`candidate-pass`と混同していない。
- `order-01-a-first`のE-first-dateを確定そだち差による`priority_unique`としている。
- E-first-date発動後、発動者Aが先に追加発動機会を得る。
- 支払い、activation zone、chain、逆順解決、ドロー、そだち+5、捨て札移動を記録する。
- source game hashとcontinuation hashを分け、117 stateを再hashしていない。
- opponent private、future draw、future response choiceを拒否する。
- 正当に解決したドロー後の情報だけを後続判断で使用する。
- 既存正本にない裁定を120で追加せず、当該経路を真正停止する。
- rules stop、record-integrity stop、全体実装エラーの定義を混同していない。
- plan exhaustionと未実装handlerを真正停止に変換しない。
- stopped routeのwinnerはnullで、completedや独立標本へ数えない。
- completed routeも117由来seedを含むため独立balance標本0を維持する。
- 117、119、116、112の既存成果物を書き換えない。
- 112 fixtureを実行または集計しない。
- 保存JSONとbuilder再生成結果のraw bytes完全一致を要求する。
- sparse-excluded由来エラーを120変更へ混ぜない。
- カード本文・数値・登録区分、現行452、登録477を変更しない。
- 暫定名称「ときおくり」を維持し、旧称や新効果を再導入しない。

上記を120実装計画と実装の変更不能な境界とする。
