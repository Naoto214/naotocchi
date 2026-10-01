# Resource Value Pilot Implementation Plan — 415

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 114正本を保持した別版パイロットを実装し、同一局面と同一初期入力で旧／新判断の影響を比較する。

**Architecture:** 可視viewと候補証跡を作るadapter、純粋な4成分比較器、116へ委譲する選択wrapperを分離する。shadowの予定110局面を先に検証し、同じ初期入力から旧／新の予定8軌跡を別runへ生成する。既存の候補・反応・解決・独立再生を再利用し、実際に未対応となった処理は真正停止として記録する。

**Tech Stack:** Python標準ライブラリ、unittest、既存proxy modules、JSON/raw SHA256、既存npm検査。新しい依存・cache・汎用対戦エンジンは追加しない。

**Spec:** [承認済み414詳細仕様](2026-10-01-normal-decision-resource-pilot-design.md)。実装者はこの計画と仕様の両方を読む。

## Global Constraints

- 旧方式識別：`legacy_107_114_116`。パイロット識別：`resource_value_pilot_v1`。
- 原本505 JSONと既存保存結果を変更しない。112の6fixtureを実施・補完しない。PR259 Draft/open/unmergedを維持する。
- 上位3項目は既存定義と値を変更しない。誕生への加点・強制は行わない。
- 比較不能という理由だけの早期停止は禁止する。合法性・証拠不整合を抽選で隠さない。
- 116のstrict recordに未知top-level keyを追加しない。contract versionを新policy IDに置き換えない。
- 新版の一般frontier抽選は`choice_kind=normal_action_resource_frontier`。mandatory／responseは既存contextを維持する。
- 結果を人間が確認するまで114正本の優先順位変更は保留する。
- 予定数・AST件数・途中PASSを実行完了件数へ読み替えない。全proxy成功には完全coverageと全worker終了が必要。

## Review Focus

1. 公開costだけが分かる相手裏向き準備札：card ID/本文をviewへ漏らさない（Task 3）。
2. 3候補で2候補だけ同値、残りと比較不能：部分tie-breakでfrontierを削らない（Task 1）。
3. 旧shadowの証拠を復元できない：予定母数から消さず、unsupportedとして残す（Task 4）。
4. 片方だけ途中停止：未到達のそだちを0や敗北で補完しない（Task 6）。
5. 旧choice kindと新choice kindの違い：seed context差を候補集合差と分けて報告する（Task 2/6）。

---

## Files and common interfaces

新規toolの各責務とtestは以下のTaskで固定する。既存107/114/116のtool、既存CLI/default、歴史的test、過去dataを編集しない。唯一の既存検査変更候補は`tools/check-design-data.py`の新artifact検査とcurrent AST inventory更新で、歴史的117/119/120の190/221/263は保持する。

`problem: dict`はpolicyに依存しない入力。次のkeyを持つ：`view_sha256`, `legal_candidate_ids`, `candidate_set_evidence`, `candidates`, `pairs`, `seed_context`。candidateは`candidate_id`, `avoid_loss_or_abort`, `maintain_or_prevent_100`, `certain_growth_difference`, `time_after_certain_resolution`, `payment_time`, `consumed_card_count`, `card_copy_id`を持つ。ID列は昇順一意、boolは数値として受け付けない。

`pairs`は上位3項目同順位のunordered pairを全列挙する。各entryは`left_id`, `right_id`, `view_sha256`, `kind`, `relations`, `reason`, `source_refs`、安全証明の場合のみ`safe_placement`を持つ。`relations`はhand/board/reservationsの3成分。時関係はcandidate数値から導く。kindは`ordinary`または`certified_safe_free_development`。source refsは検証済みsource manifestに結合する。canonical bytesはUTF-8・sort_keys・indent2・末尾newlineで保存し、内容hash用の空白なしcanonical serializationと区別する。

`frontier_report: dict`は`view_sha256`, `legal_candidate_ids`, `upper_priority_survivors`, `pair_results`, `excluded_candidates`, `frontier_ids`, `selection_basis`, `selected_candidate`を持つ。一意でなければselected null。構造不正はValueError。strategic incomparableは有効なpair結果であり例外ではない。

`selection_wrapper: dict`は`schema`, `policy_id`, `problem_sha256`, `view_sha256`, `frontier_report`, `selected_candidate`, `selection_basis`, `decision_record`を持つ。decision_recordはseededの時だけ116既存record、それ以外はnull。schemaは`naotocchi.card_game.resource_value_pilot_selection.v1`。全返却collectionは入力から分離する。

以下のtest例の小さな人工入力は比較器unit test用で、実対戦や112 fixtureの補完には使わない。Task 1のtest moduleで`problem_for(time_values, relations, *, upper_values=None, safe_placement=None)`を定義し、ここで固定した完全schemaを作る。candidate IDはa/b/c、copy IDはA-001#1/A-002#1/A-003#1、支払いは10−time、消費0、上位3項目は指定なしなら全0、view hashは固定有効SHA256、seed contextは116の型に従う。

### Task 1: 純粋な4成分比較器

**Files:** Create `tools/proxy_resource_value_comparison.py`; Test `tools/test_proxy_resource_value_comparison.py`（以下のtools pathはすべて`docs/card-game/`配下）。

**Interfaces:** Produces `compare_problem(problem: dict) -> dict`、`validate_problem(problem: dict) -> list[str]`。安全配置証明は既存`proxy_normal_decision_fallback_contract.validate_safe_free_placement`で条件検査する。

- [ ] **Step 1: failing testsを書く。**

```python
p = problem_for([10, 7], {'hand':'equal','board':'worse','reservations':'equal'})
assert compare_problem(p)['frontier_ids'] == ['a', 'b']  # passの時利得と盤面損失
p = problem_for([10, 7], {'hand':'equal','board':'better','reservations':'equal'})
assert compare_problem(p)['selected_candidate'] == 'a'  # 全成分優越
```

`test_upper_three_priorities_unchanged`、`test_all_equal_uses_existing_tie_break`、`test_partial_equality_does_not_shrink_incomparable_frontier`、`test_safe_free_dominance_is_only_against_pass`、`test_candidate_order_invariance`を追加する。後者は3候補の全順列でfrontier/選択一致、部分同値testは3候補が残ることをassert。`test_invalid_pair_and_numeric_types_rejected`はpair欠落/重複/逆向き矛盾/循環/bool時/不正relation/view hash相違がerrorになることをassert。

- [ ] **Step 2: REDを確認する。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_comparison.py' -v`。新module欠落または未実装関数で失敗するログを保存する。
- [ ] **Step 3: interfaceを実装する。** 上位3項目最大集合→全pair→優越graph→cycle検査→frontier→全pair同値時だけtie-break。時だけの先行除外を使わない。入力不正を検出し、証明済み安全配置対pass以外に例外を拡張しない。
- [ ] **Step 4: 同じcommandでGREENを確認する。** safe証拠の改変と入力/返却objectの改変漏れも検査する。
- [ ] **Step 5: scoped checkpointを保存する。** tool/test/RED/GREEN実測ログだけをcommitし、remote fresh確認・force=false更新・content/blob/tree一致を確認する。PRをReady化しない。

### Task 2: 選択wrapperと116接続

**Files:** Create `tools/proxy_resource_value_selection.py`; Test `tools/test_proxy_resource_value_selection.py`。

**Interfaces:** Consumes Task 1 `compare_problem`。Produces `select_problem(problem: dict) -> dict`、`validate_selection(wrapper: dict, problem: dict) -> list[str]`。既存116 `build_seed_proof(context, candidate_ids)`と`validate_seeded_resolution(decision)`を使う。

- [ ] **Step 1: failing testsを書く。** `test_seeded_frontier_delegates_to_116`では比較不能な2候補を選び、`decision_record.seeded_fallback_candidates == frontier_ids`、`strategic_unresolved is True`、116 validator errors空をassert。`test_wrapper_recomputes_frontier_before_accepting_selection`はfrontier/選択ID/seed/runner-up改変を拒否。`test_unique_selection_has_no_seed_record`は一意候補のrecord nullと新selection_basisをassert。`test_general_frontier_not_safe_context`は一般choice kindと安全専用fieldなしをassert。`test_choice_kind_difference_is_recorded`は候補同じでもcontext差を保存し、選択が必ず同じとはassertしない。
- [ ] **Step 2: RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_selection.py' -v`。
- [ ] **Step 3: interfaceを実装する。** wrapper hashと境界を結合し、116 recordには許可fieldだけを渡す。新selection_basisは414 §8の5値だけ。完全合法集合とfrontierを別々に検査する。
- [ ] **Step 4: GREEN確認。** 上記commandと既存`test_proxy_normal_decision_fallback_contract.py`を実行し、既存34件の挙動を保つ。構造不正からseeded resultを生成できないこともassert。
- [ ] **Step 5: scoped checkpointを保存し、remote一致確認。** 過去116 contract/tool/test変更0。

### Task 3: 可視view・候補証跡・入力境界

**Files:** Create `tools/proxy_resource_value_inputs.py`; Test `tools/test_proxy_resource_value_inputs.py`。

**Interfaces:** Produces `project_visible(continuation: dict, actor: str) -> dict`, `build_problem(view: dict, inventory: dict, evidence: dict, seed_context: dict) -> dict`, `validate_sources(manifest: dict, data_dir: Path) -> list[str]`。inventoryは既存候補器の候補IDs/詳細/完全性証跡、evidenceはcandidate scoreと全pair/source manifestを持つ。

- [ ] **Step 1: failing testsを書く。** `test_hidden_information_does_not_change_view_or_choice`は相手手札・山札順・相手裏向き準備札の非公開IDを変え、viewとTask 2出力が一致することをassert。`test_known_hand_and_public_cost_are_retained`は自手札と公開costが残ることをassert。`test_evidence_missing_is_not_incomparable`はpairの基礎証拠欠落をValueError、全証跡を持ち価値だけ未知なpairを有効incomparableとしてassert。`test_fresh_source_hash_and_return_mutation`は保存bytes変更を次回検出し返却object改変が漏れないことをassert。
- [ ] **Step 2: RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_inputs.py' -v`。
- [ ] **Step 3: interfaceを実装する。** viewは114 whitelistの境界を保ち、相手裏向き札の公開情報だけを投影する。full stateは比較器へ渡さない。比較根拠に任意点数を足さず、公開不利益・たまご維持利益・追加消費を根拠付きで残し、不明な優劣はincomparable。キャッシュなし。
- [ ] **Step 4: GREEN確認。** old input schema/公開情報検査との整合と、source refs/hashが証跡に一致することを確認する。
- [ ] **Step 5: scoped checkpointを保存する。** 検証済みsource raw hashesも新directoryへ保存し、505原本と112は不変確認。

### Task 4: 110通常局面のshadow比較

**Files:** Create `tools/proxy_resource_value_shadow.py`; Test `tools/test_proxy_resource_value_shadow.py`。Create new data directory `data/proxy-resource-value-pilot/shadow/`。

**Interfaces:** Consumes Tasks 1–3。Produces `load_observed_boundaries(data_dir: Path) -> list[dict]`, `legacy_select(boundary: dict, problem: dict) -> dict`, `compare_boundary(boundary: dict) -> dict`, `run_shadow(data_dir: Path, output_dir: Path) -> dict`。legacy_selectは保存traceと対応する既存選択器/証跡を再計算し、旧mode/理由/seedを返す。直接旧選択IDを正答として返すだけのadapterは禁止。

- [ ] **Step 1: failing testsを書く。** `test_planned_110_ids_exact_and_unique`は27/27/28/28の全予定IDをassert。`test_legacy_choice_reason_and_seed_match_saved_trace`は保存結果との一致と、旧再現不一致をpolicy効果として扱わないことをassert。`test_unsupported_boundary_is_retained_in_manifest`は証跡不足でunsupportedとなり予定母数110から消えないことをassert。`test_shadow_does_not_emit_match_events`は新event/decision0、入力bytes不変をassert。241は除外242採用、137→138のseq2handover保持もtestする。
- [ ] **Step 2: RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_shadow.py' -v`。
- [ ] **Step 3: interfaceを実装する。** 412観測JSONと同梱audit.pyの接続ルールから境界を復元する。audit.pyをimportして副作用writeすることは禁止。全合法集合を既存候補器と保存監査で再確認し、旧比較器`compare_candidates`と既存選択契約を呼ぶ。旧再現不備と新方式のunsupportedを区別する。CLI `python docs/card-game/tools/proxy_resource_value_shadow.py --data-dir docs/card-game/data --output <new-dir>`を追加。
- [ ] **Step 4: GREENとfresh shadowを実行する。** manifest/全110結果/対応不能理由/旧再現/新frontier/seed context差を保存する。対応可能件数や変化数は実測値を書き、予定110が全成功したと先に決めない。
- [ ] **Step 5: shadow checkpointを保存する。** READMEへ対応可能/unsupported/再現不備と未実施paired trajectoryを明記する。新しい裁定が不要なら既存契約で続行する。

### Task 5: 同一初期入力8軌跡のrun/replay adapter

**Files:** Create `tools/proxy_resource_value_trajectory.py`; Test `tools/test_proxy_resource_value_trajectory.py`。New `data/proxy-resource-value-pilot/trajectory/`。

**Interfaces:** Consumes Tasks 2–4。Produces `load_initial_routes(data_dir: Path) -> list[dict]`, `audit_opportunity(continuation: dict, public_history: dict) -> dict`, `apply_selected(continuation: dict, selection: dict, inputs: dict) -> tuple[dict, list[dict]]`, `run_route(initial: dict, policy_id: str) -> dict`, `validate_route(result: dict, initial: dict, policy_id: str) -> list[str]`, `run_paired(data_dir: Path, output_dir: Path) -> dict`。

- [ ] **Step 1: failing testsを書く。** `test_same_initial_manifest_two_policies_four_routes`は135probe（137応答ID設計のsource）の同一4入力×2policy、入力raw hashes一致、run ID別をassert。`test_legacy_replay_matches_saved_results`は旧版のcanonical選択/event/stateと過去保存結果一致を確認。`test_unsupported_new_action_is_structural_stop`は未対応の解決をwinner捏造せず停止することをassert。`test_independent_replay_rejects_event_snapshot_hash_tampering`は改変を拒否。`test_diverged_states_are_not_matched_by_round_only`、`test_mandatory_response_context_preserved`、`test_no_r11_after_terminal`を追加する。
- [ ] **Step 2: RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_trajectory.py' -v`。
- [ ] **Step 3: interfaceを実装する。** `data/proxy-independent-seed-probe-20260924.json`（135probe、137でID設計を承認した実入力、raw SHA256 `1a497209d56f605e474f136777c06a3260b731417ca7940bc361f72850457a6c`）と138 `verify_source_route`/`build_resume_state`から同じprefixを参照し、408最終stateから新runを開始しない。既存 `proxy_normal_action_candidate_completeness.audit_current_normal_action(state, continuation, public_history, candidate_table)`、そのvalidator、`proxy_normal_action_seeded_restart.transition(continuation, decision, inputs)`を基礎にする。拡張候補・反応・解決は現行保存済みcontractごとの既存handlerを呼び、TEXT_REGISTRY scopeを必要最小のcontext managerで復元する。新選択wrapperは正当なselected actionへ変換して実行し、古いpriority modeを新判断へ偽装しない。未対応handlerは`legality_not_confirmed`または`unsupported_resolution_adapter`を理由とする真正停止で、seedへ戻さない。
- [ ] **Step 4: GREENとfresh paired runを実行する。** CLI `python docs/card-game/tools/proxy_resource_value_trajectory.py --data-dir docs/card-game/data --output <new-dir>`で予定8 IDの結果を全保存。validate_routeは初期入力からchoiceを再検査し、同じ既存transitionを独立に再生する。最初の結果objectを検証の代用にしない。未知の候補・対象・効果への対応が必要ならその不足と正本根拠を記録し、一般化を過剰に拡張せず次の独立したRED→GREENで補う。
- [ ] **Step 5: trajectory checkpointを保存する。** 全8の完了/停止/未実施を実測で区別する。原本505・全過去結果・408二hash・112未実施を確認。全回帰前に復旧可能な保存を残す。

### Task 6: 指標と比較レポート

**Files:** Create `tools/proxy_resource_value_evaluation.py`; Test `tools/test_proxy_resource_value_evaluation.py`。New `data/proxy-resource-value-pilot/evaluation.json`と完了時番号の報告Markdown。

**Interfaces:** Consumes Tasks 4/5結果。Produces `evaluate_shadow(manifest: dict, results: list[dict]) -> dict`, `evaluate_trajectories(manifest: dict, routes: list[dict]) -> dict`, `build_evaluation(shadow: dict, paired: dict) -> dict`。rateは`{count, denominator, rate}`、母数0はrate null。

- [ ] **Step 1: failing testsを書く。** `test_counts_and_denominators_are_separate`はtrue stop/strategic unresolved/fallbackを別計上。`test_equal_tie_break_success_is_not_unresolved`は分子に加算しない。`test_one_side_stopped_is_missing_not_zero`は未到達そだちnull、winner未推定。`test_activation_resolution_not_double_play`は発動/解決/適用を別計上。`test_seed_context_and_candidate_changes_are_separate`、`test_shadow_not_counted_as_matches`、`test_seeded_routes_excluded_from_balance`を追加。
- [ ] **Step 2: RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_evaluation.py' -v`。
- [ ] **Step 3: interfaceを実装する。** 414 §10の全指標をpath/policy別に集計し、共通到達手番範囲と停止以後の欠測を別表示する。盤面形成の増加を採用条件やカード強度結論にしない。
- [ ] **Step 4: GREENと実測評価を生成する。** source raw hashes、全予定/実測ID、母数、差分、改善/悪化/不明点をJSON/Markdownへ保存する。
- [ ] **Step 5: 結果checkpointを保存する。** 114正本変更保留、112未実施、balance除外を明記。結果が出て初めて人間へ採用判断を求める。

### Task 7: 統合検査・回帰・remote照合

**Files:** Modify only `tools/check-design-data.py`とREADMEの新成果物欄。Create verification logs under new `data/proxy-resource-value-pilot/verification/`。既存`tools/run_proxy_regression_410.py`を変更せず使用する。

**Interfaces:** 各Taskのvalidatorと保存結果。新artifact参照、policy ID、114保護、505不変、予定/実測ID整合を検査する。

- [ ] **Step 1: 検査接続をREDにする。** 新artifact欠落、保存JSON改変、shadow/trajectory ID欠落を検出するtestを新`tools/test_proxy_resource_value_integration.py`へ追加。保護対象原本を実際に書き換えずtemporary copyで改変検出をassert。
- [ ] **Step 2: RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_resource_value_integration.py' -v`。
- [ ] **Step 3: 検査を接続する。** current AST inventoryは実装後に再計算、旧190/221/263とproxy_test_count263を保持。policy wrapper/seed/sources/coverage validatorを呼ぶ。
- [ ] **Step 4: GREENと必要検査を実行する。** `npm test`、`python docs/card-game/tools/check-design-data.py --catalog`、既定引数なし検査、`git diff --check`。その後、新しい予定manifestで`python docs/card-game/tools/run_proxy_regression_410.py <verification-dir>/full --workers 6`。全予定test ID=開始=終了、duplicate/missing/skip0、全worker exit0、全status passの場合だけ全回帰成功。REDログ、GREENログ、npm/catalog/design、runner manifest/worker logs/summaryを保存する。
- [ ] **Step 5: 最終checkpointを保存・検証する。** 保存直前remote HEAD/tree/PRをfresh確認、最新remoteを親にし、force=false。変更fileのremote content/blob/tree、全保護原本、408二raw SHA256、PR259 Draft/open/unmergedを再確認。長時間回帰が中断なら未完了summaryとcheckpointを残し、途中結果を合算しない。

## 実行順・保存と未承認事項

Task 1→2→3→4→5→6→7の順。shadow互換性が壊れたままpaired比較へ進めない。実際に新方式が到達する処理に不足があっても、最適戦略や強度判定のために架空の応答/盤面/結果を埋めない。既存契約で補える場合は確認せず修正と独立検証を行う。本当に新しい裁定が必要なら具体的な不足だけ確認する。

各checkpointの番号は実行時の最新remoteから採番し、計画中の未実施Taskを完了として記録しない。git pushが使えない場合は、従来のGitHub blob→tree→commit→ref更新で保存する。全回帰前の復旧checkpointを必須にする。

実行方法の推奨はNative（このセッションで主担当が逐次実装し、最後に独立レビュー）。7Taskが同じ証跡schemaと履歴adapterへ依存し、途中のinterface調整を一人が連続して扱いやすいため。Subagent-drivenを選ぶ場合は各Taskの新担当・新reviewerで検査する。どちらも原本保護と各TaskのRED→GREENを省略しない。

この計画は未実行。414仕様は承認済みだが、実装計画の書面確認と実行方法選択は次の段階。114正本化・Ready化・main mergeの承認は含まない。
