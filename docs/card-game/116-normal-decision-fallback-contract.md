# 116 通常意思決定fallback contract

更新日: 2026-09-18

## 結論

115で停止した通常行動外のたまご交換と、時0人物配置対`pass`の比較不能を、カード強度や勝率を推測せず再現可能に処理するprotocolを固定した。116は`protocol_only_no_match_artifacts` checkpointであり、seed抽選と安全な無料盤面化は判断手順だけを定める。

対戦成果物はすべて0である。fixture、completed match record、decision trace、event、snapshot、winner、独立balance標本を新規作成しない。112の未実施fixture 6件は変更せず、115の4停止経路も再開しない。現行カタログ452、登録477、カード本文・数値・登録区分の変更は0件を維持する。

## 保存物

- machine-readable contract: [data/proxy-normal-decision-fallback-contract-116-20260918.json](data/proxy-normal-decision-fallback-contract-116-20260918.json)
- builder／validator: [tools/proxy_normal_decision_fallback_contract.py](tools/proxy_normal_decision_fallback_contract.py)
- 回帰テスト: [tools/test_proxy_normal_decision_fallback_contract.py](tools/test_proxy_normal_decision_fallback_contract.py) 34件
- 設計仕様: [plans/2026-09-18-normal-decision-fallback-contract-design.md](plans/2026-09-18-normal-decision-fallback-contract-design.md)
- 実装計画: [plans/2026-09-18-normal-decision-fallback-contract.md](plans/2026-09-18-normal-decision-fallback-contract.md)

`proxy-fixtures-116`、`proxy-matches-116`、`proxy-decision-traces-116`、event、snapshot、winnerは作成していない。

## 1. 判断種別と記録schema

判断記録の`decision_kind`は`normal_action`と`mandatory_choice`を区別する。たまご追加ドロー後に手札から山札下へ1枚を置く選択は、通常行動ではなく`mandatory_choice`である。

すべての判断は少なくとも次を記録する。

- `decision_kind`
- `resolution_mode`
- `strategic_unresolved`
- `legal_candidates`
- `selected_candidate`
- `runner_up_candidates`
- `reason_code`

`legal_candidates`は実際に合法な候補の完全集合であり、候補の欠落、余分な候補、未整列、重複を許さない。安全な配置を選ぶ判断でも、`pass`とcallerが列挙した他の合法行動を省略しない。`candidate_set_complete=True`と列挙根拠を保存する。実局面に対する完全性の確認はcallerの手動候補表と保存状態の照合による。

seed抽選の対象は別fieldの`seeded_fallback_candidates`へ保存する。この非空・一意・昇順集合は`legal_candidates`の部分集合で、selected candidateを含む。SHA-256の候補材料はこの抽選部分集合だけである。安全な無料盤面化では比較不能な安全配置だけを含め、劣位の`pass`や他の合法行動を抽選へ混ぜない。すべての合法候補が比較不能な純粋なfallbackでは両集合が一致する。

`runner_up_candidates`は必須の一意な非空文字列IDの配列で、selected candidateを含まない。seeded modeでは抽選部分集合からselected candidateを除いた集合と一致する（非選択候補がなければ空配列）。一意の安全配置では比較で劣位になった`pass`を`["pass"]`として残す。他の合法行動に新たな順位を付ける規則ではない。

`resolution_mode`は次の3種だけである。

1. `priority_unique`: 107・114の既存優先順位、Pareto比較、完全同点時tie-breakで一意に選べる。`strategic_unresolved`は`false`。
2. `safe_free_development`: 安全な時0人物配置が`pass`を上回り、配置候補も一意である。`strategic_unresolved`は`false`。
3. `seeded_fallback`: 合法候補を完全列挙できるが、既存優先順位では戦略的に一意にできない。`strategic_unresolved`は`true`、`reason_code`は`strategic_unresolved_seeded_fallback`固定。

## 2. 判断単位のseed抽選

`seeded_fallback`は戦略的な優劣を追加しない。候補はstableなcanonical candidate IDを持ち、Unicode code point順で昇順化する。card copyを選ぶ候補のcanonical IDはcard copy IDであり、候補配列の重複を許さない。

seed材料は次の9要素だけを、この順のJSON配列で使う。

1. fallback契約version
2. 固定初期順ID
3. actor player ID
4. actor turn index
5. round
6. phase
7. `decision_kind`
8. choice kind
9. canonical candidate IDの昇順配列

canonical serializationは`json.dumps(seed_material, ensure_ascii=False, separators=(",", ":"))`と同じ空白なしUTF-8 JSONとする。そこからSHA-256 digestを作り、big-endian unsigned integerへ解釈して、`selected_index = digest_integer mod N`でN件の昇順候補から選ぶ。対戦全体で消費する乱数列は使わず、各判断で独立する。

fixture ID、match ID、先手player ID、path名はseed材料へ入れない。同じplayerが先後鏡像で同じ候補状態へ到達した場合に同じ結果を再現し、途中に別判断を追加しても後続判断の抽選をずらさないためである。seeded recordはseed材料、canonical serialization、SHA-256 hex、昇順候補、候補数、selected index、selected candidateを完全に保存し、validatorが再計算する。

`seed_context`は先頭8要素に対応するexact keysだけを持つ。`contract_version`は契約versionの完全一致文字列、`order_id`・`phase`・`choice_kind`は非空文字列、`actor`は`A`または`B`、`actor_turn_index`・`round`はboolを除く1以上の整数、`decision_kind`は`normal_action`または`mandatory_choice`である。外側の`decision_kind`とcontext内の値は一致必須とする。enumにJSON配列などを渡した場合も例外ではなくvalidation errorを返す。

## 3. 安全な無料盤面化

なかま／こいびとの時0配置と`pass`を比較するとき、次の6安全条件をすべて満たす配置だけを安全な無料盤面化とする。

1. 対応する配置枠が空いている。
2. 実際の時支払いが0である。
3. 既存人物との交代、捨て札、領域離脱を伴わない。
4. 配置する人物カード以外の手札、場、予約を消費しない。
5. 配置または配置時能力に公開情報から確定できる不利益がない。
6. 配置自体が合法で、対象や追加選択を未解決のまま残さない。

この比較だけでは、人物カードの手札から盤面への移動を消費カード枚数ではなく保持したカードの領域移動として扱う。安全な無料盤面化は`pass`を上回る。安全候補が複数あり既存優先順位で一意にならないときは、カード価値点を付けず`seeded_fallback`を使う。枠満員、交代、時1以上、追加消費、確定不利益、合法性不明、追加選択未解決の配置は対象外である。

公開interfaceは`resolve_safe_free_development(placements, context, legal_candidate_ids)`で、callerは完全な合法候補IDを明示し、既存優先順位を適用した後の比較不能な安全配置を`placements`へ渡す。完全合法集合には`pass`とすべての配置候補を含める。両branchともcontextは`decision_kind="normal_action"`、`phase="normal_action"`、`choice_kind="zero_cost_person_placement"`を要求する。

resolverが出す`selected_placement`、`pass_dominated`、`pass_dominated_by`、`placement_card_zone_transfer_counts_as_consumption`、`additional_card_consumption`は安全性証跡である。seeded validatorはこれらの組合せ、選択IDとの結合、6安全条件、追加消費0、領域移動が消費でないことを検査する。2配置resolverの結果をそのままvalidatorへ渡せる。一意の安全配置はseed抽選を行わず、`seeded_fallback_candidates`を持たない。

## 4. 継続と停止、評価境界

合法候補が完全、canonical IDがstable、許可された公開情報と自分の情報だけを使用、候補を選べば解決継続可能、card copy／instance／領域／予約／event／snapshotの整合性を保持できる、という5条件が満たされる場合だけ、比較不能を理由に停止せずseed抽選で継続できる。

合法候補の完全列挙不能、相手非公開情報または将来知識への依存、stable ID不足、既存ルールだけで合法性を確定不能、record integrityまたはhash破損のいずれかではfallbackせず停止する。全カード・全局面の完全自動合法性判定や対戦エンジンは作らない。

将来、seed抽選を含む対戦がcompletedになっても、`strategic_unresolved_count`または`seeded_fallback_count`が1以上なら独立balance標本へは加算しない。勝率、先後差、発動率、カード強度、カード採否の根拠に使わない。116の独立balance標本は0である。

## 5. RED→GREEN 34件

専用testを先に追加し、未実装module／未接続contractによるREDを確認してから最小builder／validatorを実装した。保存contract未作成、型検査不足、safe placementのbool数値受理を順にREDとして確認し、canonical JSONと検証を追加してGREENにした。最終reviewでrunner-up、producer→validator、合法集合と抽選部分集合、context型と結合、JSON enumを14件追加してRED→GREENを確認した。既存20件を保持した全34件は次のとおりである。

1. `test_seed_proof_uses_sorted_candidates_and_exact_sha256_modulo`
2. `test_mirror_labels_are_not_seed_context`
3. `test_unrelated_choice_does_not_shift_later_choice`
4. `test_seeded_resolution_rejects_missing_or_tampered_proof`
5. `test_seeded_resolution_rejects_unsorted_duplicate_or_incomplete_candidates`
6. `test_seeded_resolution_allows_established_107_114_fields`
7. `test_seeded_resolution_reports_malformed_proof_types`
8. `test_single_safe_free_placement_dominates_pass`
9. `test_safe_free_placement_rejects_each_excluded_condition`
10. `test_safe_free_placement_rejects_boolean_numeric_zero`
11. `test_multiple_safe_placements_use_seeded_fallback`
12. `test_placed_person_is_zone_transfer_not_consumption`
13. `test_contract_fixes_decision_kinds_modes_and_seed_algorithm`
14. `test_contract_fixes_continue_and_stop_conditions`
15. `test_contract_preserves_zero_artifact_and_population_boundaries`
16. `test_seeded_matches_are_excluded_from_balance_evidence`
17. `test_saved_contract_equals_builder_output`
18. `test_contract_builder_returns_isolated_mutable_collections`
19. `test_materialized_contract_requires_exact_canonical_serialization`
20. `test_contract_validator_rejects_malformed_decision_contract_type`
21. `test_seeded_resolution_requires_valid_runner_up_candidates`
22. `test_safe_resolver_emits_runner_ups_in_both_branches`
23. `test_two_placement_resolver_output_passes_seeded_validator`
24. `test_seeded_resolution_validates_safe_placement_evidence`
25. `test_safe_resolver_preserves_complete_legal_set_without_lottery_pass`
26. `test_safe_resolver_requires_explicit_valid_complete_legal_ids`
27. `test_seeded_resolution_requires_valid_lottery_subset`
28. `test_seeded_resolution_rejects_dominated_pass_even_with_matching_proof`
29. `test_seed_builder_requires_exact_typed_context`
30. `test_seeded_validator_rejects_typed_context_forgery`
31. `test_seeded_validator_binds_outer_decision_kind_to_seed_context`
32. `test_safe_resolver_requires_placement_context_in_both_branches`
33. `test_seeded_validator_requires_placement_context_for_safety_evidence`
34. `test_json_enum_values_return_errors_instead_of_type_errors`

総合検査には先に116正本、contract、tool、test、identity、成果物0、3 mode、9 seed field、SHA-256 modulo、6安全条件、balance除外、112／115、452／477／変更0、専用test数、validator CLIを接続した。本書とREADME未作成のREDを確認してから両方を追加した。最終review後のexact専用test数は34件である。

## 6. 維持した境界と117

- 112の未実施fixture 6件はevent空、winner `null`のまま変更しない。
- 115の4停止経路は116で再開しない。
- 116のfixture、completed、trace、event、snapshot、winner、独立balance標本はすべて0。
- 現行カタログ452、登録477、カード本文・数値・登録区分の変更は0件。
- 本編実装、カード内容、任意のカード価値点、対戦fixtureまたは結果を追加しない。

117では同じsource、同じseed、同じ40枚manifestから115の4経路を最初から再生する。たまご交換は`mandatory_choice`として記録し、比較不能なら判断単位のseed抽選を使う。安全な時0人物配置は`pass`より上位とし、複数候補ならseed抽選へ送る。新しい合法性不明または記録整合性破損だけは、その地点で停止して不足を記録する。4経路がcompletedになってもseed使用対戦の独立balance標本は0とする。
