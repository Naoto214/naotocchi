# Response Window Seeded Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in Native mode. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 117の4停止経路を保存済みの同一state/hashから再開し、119のresponse-window契約を適用して、各経路をcompletedまたは設計済みの真正停止まで独立に進める。

**Architecture:** 新規`proxy_response_window_seeded_restart.py`を120専用adapterとして追加し、117再生成、119 contract／candidate audit、116 seed、114／107判断、既存record validatorを読み取り専用で合成する。source game hashとcontinuation hashを分離し、table-driven candidate enumerator、decision resolver、action handler registry、route-independent runnerを共通経路として使い、固定120 planからrecord／trace／stop／evaluationをmaterializeする。117・119・116・112の既存成果物とコードは変更しない。

**Tech Stack:** Python 3標準ライブラリ、`unittest`、既存proxy builder／validator、canonical JSON、SHA-256、Git。

**Spec:** `docs/card-game/plans/2026-09-22-response-window-seeded-restart-design.md`

## Global Constraints

- 作業branchは`design/card-pool-master-20260914`、PR #259はDraft・open・未マージを維持し、mainへマージしない。
- 117 stop 4件のraw SHA、state hash、event seq 3、card copy／instance／115 manifestを変更しない。
- 119の7成果物、116 fallback contract、117 plan／evaluation、112 fixture 6件を変更しない。
- 120は専用adapterと専用成果物だけを新設し、本編、表情、イラスト、別PR変更を混ぜない。
- 承認済み120設計仕様`plans/2026-09-22-response-window-seeded-restart-design.md`はread-onlyとし、raw SHA-256 `e400cd5d6f47dd3e194a5f35797bec56565d5706fe4e45118381e7ee4ef4ab44`を維持する。
- 既存正本にない裁定は追加せず、当該routeを未解決判断の直前で`stopped_rules_adjudication`にする。
- 再開後に1 routeへ局所化できるhash／instance／reference破損だけを`stopped_record_integrity`にする。
- protected input不一致、120 plan破損、plan exhaustion、未実装handler、余分な保存artifactは全体実装・入力エラーにする。
- `response-pass`を通常行動の`pass`／`candidate-pass`へ流用しない。
- response発動後は06どおり発動者本人が先に追加発動機会を得る。
- 相手の非公開手札、未公開山札順、future draw、future response choice、後続planの選択を判断へ使わない。
- 4 routeはcompletedでも117由来seedを含むため、独立balance標本は0固定とする。
- 現行452、登録477、カード本文・数値・登録区分、暫定名称「ときおくり」を変更しない。
- local sparse-excluded catalog/link/testおよび`tests/smoke-test.js`欠落は120の結果と分離する。
- 各Taskは失敗test→RED実確認→最小実装→専用GREEN→小commitの順で実施する。

## Review Focus

- source stateが正しくても117 raw bytesまたは119再生成結果が異なる入力は、`test_protected_or_regenerated_source_mismatch_is_global_error`でroute停止へ変換せず全体拒否する。
- passでgame hashが不変でもpriority／pass数が変わる状態は、`test_response_pass_keeps_game_hash_and_changes_continuation_hash`でcontinuation hashだけが進むことを固定する。
- activation後に相手へ即priorityを渡す誤実装は、`test_activation_retains_priority_with_activator_until_activator_passes`で拒否する。
- あるrouteの真正停止が残るrouteを中止する実装は、`test_route_local_stop_does_not_cancel_remaining_routes`で拒否する。
- protected input破損、未実装handler、plan exhaustionをstop artifactへ偽装する実装は、`test_global_failures_are_never_converted_to_route_stops`で拒否する。

---

## File Map

- Create `docs/card-game/tools/proxy_response_window_seeded_restart.py`: 120 input loader、protected-source verifier、dual-hash adapter、candidate／decision bridge、handler registry、route runner、validator、writer、CLI。
- Create `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`: 42件の専用回帰test。
- Create `docs/card-game/data/proxy-response-window-seeded-restart-plan-120-20260922.json`: 4 routeの固定step、source binding、terminalを保持するcanonical plan。
- Create `docs/card-game/data/proxy-response-window-seeded-restart-evaluation-120-20260922.json`: 保存outcomeから再計算した120集計。
- Create conditionally `docs/card-game/data/proxy-matches-120/`: completed routeのrecordだけを保存する。
- Create conditionally `docs/card-game/data/proxy-decision-traces-120/`: completed routeのtraceだけを保存する。
- Create conditionally `docs/card-game/data/proxy-response-window-stops-120/`: stopped routeのstop artifactだけを保存する。
- Create [`docs/card-game/120-response-window-seeded-restart.md`](../120-response-window-seeded-restart.md): 実測outcome、判断、停止、検証、次checkpoint境界。
- Modify `docs/card-game/tools/check-design-data.py`: `--checkpoint-120`限定検査と全体検査への120接続。
- Modify `docs/card-game/README.md`: 現在地と一覧を120へ更新する。
- Modify PR #259 body only after commits are remotely saved: 120 remote HEAD/tree、実測outcome、検証、保護境界を同期する。
- Do not modify any 112、116、117、119 existing file.

### Task 1: Protected input loaderとdual-hash resume adapter

**Files:**
- Create: `docs/card-game/tools/proxy_response_window_seeded_restart.py`
- Create: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`
- Read only: `docs/card-game/tools/proxy_normal_decision_seeded_restart.py`
- Read only: `docs/card-game/tools/proxy_response_window_contract.py`
- Read only: `docs/card-game/data/proxy-normal-decision-stops-117/*.json`
- Read only: `docs/card-game/plans/2026-09-22-response-window-seeded-restart-design.md`

**Interfaces:**
- Consumes: `build_seeded_restart_suite(plan, inputs)`, `load_inputs()` from 117; `build_checkpoint_119(inputs)`, `derive_response_context(stop)` from 119; `canonical_sha256(value)` from `proxy_record_validator.py`.
- Produces: `load_checkpoint_120_inputs(data_dir: Path = DATA) -> dict[str, object]`, `verify_protected_sources(inputs: dict[str, object], data_dir: Path = DATA) -> list[str]`, `build_resume_state(stop: dict[str, object]) -> dict[str, object]`, `game_state_sha256(state: dict[str, object]) -> str`, `continuation_state_sha256(state: dict[str, object]) -> str`.

- [ ] **Step 1: Write eight failing tests for exact protected inputs and resume hashes**

  Add these exact methods to `ResponseWindowSeededRestartTests`:

  - `test_protected_raw_sources_and_four_state_hashes_are_exact`
  - `test_checkpoint_117_regeneration_ends_at_saved_stop_state`
  - `test_checkpoint_119_regeneration_equals_saved_contract_and_audit`
  - `test_resume_state_preserves_source_state_phase_event_and_hash`
  - `test_dual_hash_adapter_keeps_source_hash_and_adds_continuation_hash`
  - `test_resume_adapter_does_not_mutate_117_stop_or_119_audit`
  - `test_protected_or_regenerated_source_mismatch_is_global_error`
  - `test_checkpoint_112_six_fixtures_remain_unplayed_and_byte_exact`

  The shared assertion for each route must include:

  ```python
  self.assertEqual(resume["source_event_seq"], 3)
  self.assertEqual(resume["game_state"]["phase"], "post_placement_response")
  self.assertEqual(resume["source_game_state_sha256"],
                   PROTECTED_STATE_SHA256[path_id])
  self.assertEqual(game_state_sha256(resume["game_state"]),
                   PROTECTED_STATE_SHA256[path_id])
  self.assertEqual(resume["response_context"]["phase"], "response_window")
  self.assertNotEqual(resume["continuation_state_sha256"],
                      resume["source_game_state_sha256"])
  ```

- [ ] **Step 2: Run the dedicated test file and confirm RED**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools \
    -p test_proxy_response_window_seeded_restart.py -v
  ```

  Expected: `ModuleNotFoundError: No module named 'proxy_response_window_seeded_restart'`.

- [ ] **Step 3: Implement the minimal loader, source verifier, and dual-hash adapter**

  Start the module with fixed schemas and paths:

  ```python
  SCHEMA = "naotocchi.card_game.proxy_response_window_seeded_restart.v1"
  PLAN_SCHEMA = "naotocchi.card_game.proxy_response_window_seeded_restart_plan.v1"
  EVALUATION_SCHEMA = "naotocchi.card_game.proxy_response_window_seeded_restart_evaluation.v1"
  CONTRACT_VERSION = "naotocchi.card_game.proxy_response_window_seeded_restart.v1"
  PATH_ORDER = (
      "order-01-a-first", "order-01-b-first",
      "order-02-a-first", "order-02-b-first",
  )
  DATA = Path(__file__).resolve().parent.parent / "data"
  DEFAULT_PLAN = DATA / "proxy-response-window-seeded-restart-plan-120-20260922.json"
  ```

  `load_checkpoint_120_inputs()` must load exact 107／114／115／116／117／119 inputs named in the design. `verify_protected_sources()` must compare the 20 approved raw SHA values, rebuild 117 and 119 in memory, and compare saved objects and canonical bytes before returning `[]`.

  Define the four route bindings directly from the approved design so neither filenames nor hashes are inferred:

  ```python
  PROTECTED_STOPS = {
      "order-01-a-first": ("stop-117-order-01-a-first.json",
          "c1f75fed4ea40c685740d78b67885ab21092f3d125a79b044474e2cbb26c3b92",
          "79c8ba24c4749d34436e5dbc36a89aac6f59bd682d02763715f68bd33068ff80"),
      "order-01-b-first": ("stop-117-order-01-b-first.json",
          "58b3fbce9d570b472dd6c91ee5ad1a043a2fd94864d6019deedfd3a78f3d2bcd",
          "468cb23491db85e53c2ede37c57c325b6620c82ca4cb7bbdeb6b7e7fd95de399"),
      "order-02-a-first": ("stop-117-order-02-a-first.json",
          "a4e1b35c03da7c8927e94b59740a16bbf8b78f69d165c516cf9c3a4652f8fc5c",
          "87df61c75bb6a304b684ab00444b321cb1e1b25ee95f6a3b8353af0beae804de"),
      "order-02-b-first": ("stop-117-order-02-b-first.json",
          "e66ae50ec54c3b568dcef30f75c9d2751346aa92a35e9748ac96dc0053b6e232",
          "d3969f6708ae9834295a88d07b2cd7f88da7889541f48175bae4715af61de240"),
  }
  ```

  Keep the remaining 16 raw SHA values in one `PROTECTED_RAW_SHA256` mapping copied exactly from design sections 4.1–4.3: the 116 contract, 117 plan/evaluation, seven 119 artifacts, and six 112 fixtures. The test must assert `len(PROTECTED_STOPS) == 4`, `len(PROTECTED_RAW_SHA256) == 16`, and compare every file's raw bytes before any route resumes.

  Implement resume state without rewriting the source phase:

  ```python
  def build_resume_state(stop):
      game_state = copy.deepcopy(stop["pre_decision_state"])
      response_context = derive_response_context(stop)
      continuation = {
          "game_state": game_state,
          "response_context": response_context,
          "activation_zone": [],
          "pending_triggers": [],
          "return_target": "normal_action_opportunity",
      }
      return {
          "source_event_seq": stop["last_valid_event_seq"],
          "source_game_state_sha256": stop["last_valid_state_sha256"],
          **continuation,
          "continuation_state_sha256": continuation_state_sha256(continuation),
      }
  ```

  Reuse 117's canonical source-state convention in `game_state_sha256`; do not invent a second source-state normalization. Hash the exact continuation object with `canonical_sha256`.

- [ ] **Step 4: Run the eight tests and confirm GREEN**

  Run the same discovery command from Step 2. Expected: 8 tests, all `ok`.

- [ ] **Step 5: Commit Task 1**

  ```bash
  git add docs/card-game/tools/proxy_response_window_seeded_restart.py \
          docs/card-game/tools/test_proxy_response_window_seeded_restart.py
  git commit -m "feat(card-game): bind checkpoint 120 resume sources"
  ```

### Task 2: Generic response opportunity enumeratorと最初のpass遷移

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`
- Read only: `docs/card-game/tools/proxy_response_window_contract.py`

**Interfaces:**
- Consumes: Task 1 `build_resume_state`; 119 `build_response_pass_detail`, `transition_response_window`, `build_response_seed_proof`.
- Produces: `enumerate_response_opportunity(continuation: dict[str, object], actor: str, candidate_table: dict[str, object]) -> dict[str, object]`, `resolve_response_choice(route: dict[str, object], opportunity: dict[str, object]) -> dict[str, object]`, `apply_response_pass(continuation: dict[str, object], decision: dict[str, object]) -> tuple[dict[str, object], dict[str, object]]`.

- [ ] **Step 1: Add seven failing response enumeration and pass tests**

  Add these exact methods:

  - `test_first_four_opportunities_equal_checkpoint_119_audit`
  - `test_first_four_resolution_modes_and_selected_candidates_are_exact`
  - `test_first_date_wins_by_certain_growth_before_time_comparison`
  - `test_response_enumerator_rejects_candidate_pass_and_pass_aliases`
  - `test_second_actor_opportunities_are_reenumerated_and_pass_only`
  - `test_response_enumerator_rejects_opponent_private_and_future_information`
  - `test_response_pass_keeps_game_hash_and_changes_continuation_hash`

  Assert the first selections exactly:

  ```python
  expected = {
      "order-01-a-first": (
          "priority_unique",
          "response-use-event-A-040#1-target-A-017#1",
      ),
      "order-01-b-first": ("response_unique", "response-pass"),
      "order-02-a-first": ("response_unique", "response-pass"),
      "order-02-b-first": ("response_unique", "response-pass"),
  }
  ```

- [ ] **Step 2: Run the seven new tests and confirm RED**

  Expected first failure: import error for `enumerate_response_opportunity` or `resolve_response_choice`.

- [ ] **Step 3: Implement a reusable response enumerator and resolver**

  The enumerator must operate on any current `priority_actor`, not only a 117 stop. Use exact family order:

  ```python
  RESPONSE_FAMILIES = (
      "pass", "hand_quick_use", "triggered_ability", "prepared_activation",
  )
  FORBIDDEN_RESPONSE_IDS = {"candidate-pass", "pass"}
  ```

  It must return exact keys:

  ```python
  {
      "actor": actor,
      "response_context": copy.deepcopy(context),
      "legal_candidate_ids": sorted(detail_by_id),
      "legal_candidate_details": list(sorted_details),
      "excluded_candidates": list(excluded_details),
      "inspected_information": copy.deepcopy(information_snapshot),
      "forbidden_information_used": [],
      "candidate_set_complete": True,
      "source_references": list(source_references),
  }
  ```

  For the first four opportunities, compare the projected result to the regenerated 119 audit before selection. For later opportunities, enumerate from the current owner-known and public state using the same family rules.

  `resolve_response_choice()` must implement:

  ```python
  if len(ids) == 1:
      mode = "response_unique"
  elif priority_comparison_is_unique(opportunity):
      mode = "priority_unique"
  else:
      mode = "response_seeded_fallback"
  ```

  The E-first-date comparison must record `reason_code="certain_growth_difference"`; it must not look at time after criterion 3 differs. `apply_response_pass()` must call 119's transition validator, increment response opportunity, preserve game hash, and recompute continuation hash.

- [ ] **Step 4: Run Task 1 and Task 2 tests and confirm 15 GREEN**

  Expected: 15 tests, all `ok`.

- [ ] **Step 5: Commit Task 2**

  ```bash
  git add docs/card-game/tools/proxy_response_window_seeded_restart.py \
          docs/card-game/tools/test_proxy_response_window_seeded_restart.py
  git commit -m "feat(card-game): resolve checkpoint 120 response choices"
  ```

### Task 3: Reusable activation lifecycleとE-first-date解決

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`
- Read only: `docs/card-game/01-core-rules.md`
- Read only: `docs/card-game/06-action-chain-checkpoint.md`
- Read only: `docs/card-game/91-event-21-card-text-draft.md`
- Read only: `docs/card-game/93-cross-type-boundary-audit.md`

**Interfaces:**
- Consumes: Task 2 response opportunity／choice／pass; 119 `transition_response_window`.
- Produces: `activate_response_candidate(continuation, decision) -> tuple[continuation, event]`, `resolve_chain(continuation, inputs) -> tuple[continuation, list[event]]`, `resolve_first_date(continuation, link, inputs) -> dict[str, object]`, `ACTION_HANDLERS: dict[tuple[str, str | None], Callable]`.

- [ ] **Step 1: Add seven failing lifecycle tests**

  Add these exact methods:

  - `test_activation_pays_time_moves_source_to_activation_zone_and_adds_link`
  - `test_activation_retains_priority_with_activator_until_activator_passes`
  - `test_two_passes_close_chain_and_resolve_last_link_first`
  - `test_first_date_resolution_rechecks_target_instance_and_stage_zero`
  - `test_first_date_draws_one_adds_five_growth_and_discards_source`
  - `test_first_date_invalid_target_skips_effect_but_finishes_card_destination`
  - `test_order_01_a_first_response_transcript_has_contiguous_seq_and_hashes`

  Fix the expected 120 event seq for `order-01-a-first`:

  ```python
  self.assertEqual(
      [event["seq"] for event in evidence["events"]],
      [4, 5, 6, 7],
  )
  self.assertEqual(evidence["events"][0]["action_type"], "activate_response")
  self.assertEqual(evidence["events"][1]["action_type"], "response_pass")
  self.assertEqual(evidence["events"][2]["action_type"], "response_pass")
  self.assertEqual(evidence["events"][3]["action_type"], "resolve_event")
  ```

- [ ] **Step 2: Run the seven lifecycle tests and confirm RED**

  Expected first failure: missing `activate_response_candidate`.

- [ ] **Step 3: Implement registry-driven activation and resolution**

  Define shared dispatch rather than route-specific `if path_id` logic:

  ```python
  ACTION_HANDLERS = {
      ("use_event", "E-first-date"): resolve_first_date,
  }
  ```

  `activate_response_candidate()` must validate actor priority, source hand membership, payment, target, instance identity, and candidate detail before mutation. Move `A-040#1` from hand to `activation_zone`, append a stable link, then use 119 transition behavior so A retains priority.

  `resolve_chain()` must reverse `chain_links`, dispatch by `(action_type, card_id)`, collect triggers for a later chain, and return to normal action only when chain／triggers／responses are empty.

  `resolve_first_date()` must implement only existing 91／93 behavior:

  ```python
  if target_is_current_stage_zero_partner:
      drawn = draw_top_card(game_state, "A")
      game_state["players"]["A"]["growth"] += 5
  move_activation_to_discard(game_state, activation_zone, "A-040#1")
  ```

  Do not use the known future draw in candidate comparison. The draw helper may inspect the deck only during resolution. If the target is no longer legal, skip the target-dependent draw／growth, still finish the action card's normal destination, and record the result from existing target rules.

- [ ] **Step 4: Run all 22 dedicated tests and confirm GREEN**

  Expected: 22 tests, all `ok`.

- [ ] **Step 5: Commit Task 3**

  ```bash
  git add docs/card-game/tools/proxy_response_window_seeded_restart.py \
          docs/card-game/tools/test_proxy_response_window_seeded_restart.py
  git commit -m "feat(card-game): resolve checkpoint 120 response chains"
  ```

### Task 4: Table-driven continuation kernelと固定120 plan

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`
- Create: `docs/card-game/data/proxy-response-window-seeded-restart-plan-120-20260922.json`
- Read only: 107／114／115／116 data and tools

**Interfaces:**
- Consumes: Tasks 1–3 resume／response APIs; 116 `build_seed_proof`, `validate_seeded_resolution`; 114 pre-decision／public-information validators.
- Produces: `enumerate_decision_opportunity(continuation, inputs) -> dict[str, object]`, `resolve_decision(opportunity, route_context) -> dict[str, object]`, `apply_decision(continuation, decision, inputs) -> tuple[continuation, list[event]]`, `build_adjudicated_plan_120(inputs) -> dict[str, object]`, `validate_restart_plan_120(plan, inputs) -> list[str]`, `replay_route_120(route, inputs) -> tuple[outcome, evidence]`.

- [ ] **Step 1: Add seven failing continuation and plan tests**

  Add these exact methods:

  - `test_decision_dispatch_separates_normal_mandatory_and_response_contracts`
  - `test_normal_and_mandatory_seeded_choices_use_116_without_modification`
  - `test_future_ambiguous_response_uses_119_seed_context_and_proof`
  - `test_unknown_action_handler_is_global_implementation_error`
  - `test_plan_exhaustion_is_global_implementation_error`
  - `test_continuation_choice_cannot_read_future_or_opponent_private_information`
  - `test_saved_120_plan_has_exact_schema_sources_steps_and_terminal_per_route`

  The plan test must assert the exact top-level and route keys from the design:

  ```python
  self.assertEqual(list(plan), [
      "schema", "checkpoint", "contract_version", "source_files",
      "protected_sha256", "route_order", "routes", "scope",
  ])
  self.assertEqual(plan["route_order"], list(PATH_ORDER))
  self.assertEqual([route["path_id"] for route in plan["routes"]],
                   list(PATH_ORDER))
  ```

- [ ] **Step 2: Run the seven tests and confirm RED**

  Expected first failures: missing continuation interfaces and missing plan JSON.

- [ ] **Step 3: Implement reusable decision dispatch and action handler registry**

  Define exact decision dispatch:

  ```python
  DECISION_RESOLVERS = {
      "normal_action": resolve_normal_decision,
      "mandatory_choice": resolve_mandatory_decision,
      "response_action": resolve_response_decision,
  }
  ```

  Define generic action handlers for every action family emitted by `enumerate_decision_opportunity()`. Shared handlers must cover zone movement and common lifecycle; card-specific effect handlers are keyed by `(action_type, card_id)` and contain only text already present in canonical docs. A plan step whose `handler_key` is absent must raise `ImplementationError(f"unimplemented action handler: {handler_key!r}")`.

  `enumerate_decision_opportunity()` must build legal candidates from the current state and 114 table, including all applicable normal actions or all 119 response families. `resolve_decision()` must apply priority order before fallback. It must call 116 for normal／mandatory fallback and 119 for response fallback without changing either contract.

  `build_adjudicated_plan_120()` must use the same `enumerate_decision_opportunity()` → `resolve_decision()` → `apply_decision()` path used by replay. It may terminate a route only through the three terminal definitions in the approved design; it must not use a separate route-specific resolver or embed a future choice that the current opportunity cannot derive.

- [ ] **Step 4: Audit and materialize the complete four-route plan without adding rulings**

  For each route, begin from Task 1's verified resume state. At every opportunity:

  1. enumerate the complete candidate set;
  2. compare it with 107／114／116 or 119;
  3. add the exact step with pre-state dual hashes, candidate details, selection evidence, payment, target, chain, public information, source references, and expected transition;
  4. apply the registered handler and validate the resulting state;
  5. continue until R10／early victory or one approved stop reason is reached.

  If canonical text cannot determine legality or resolution, add a `stopped_rules_adjudication` terminal at the pre-decision state using exactly one approved reason code. Do not create a new rule to continue. If the next action is canonical but lacks code, implement its reusable handler before adding the step; do not label it a rules stop. If the step list ends without a terminal, leave the plan invalid so the RED test remains visible.

  Save the audited plan with:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 \
    docs/card-game/tools/proxy_response_window_seeded_restart.py \
    --write-plan docs/card-game/data/proxy-response-window-seeded-restart-plan-120-20260922.json
  ```

  `--write-plan` must call `build_adjudicated_plan_120(inputs)` and only serialize its result after `validate_restart_plan_120()` returns `[]`; it must not infer missing decisions from hidden information.

- [ ] **Step 5: Run all 29 tests and confirm GREEN**

  Also run the 116 and 119 dedicated suites unchanged:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools \
    -p test_proxy_normal_decision_fallback_contract.py -v
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools \
    -p test_proxy_response_window_contract.py -v
  ```

  Expected: 120 dedicated 29 tests pass; 116 and 119 remain GREEN.

- [ ] **Step 6: Commit Task 4**

  ```bash
  git add docs/card-game/tools/proxy_response_window_seeded_restart.py \
          docs/card-game/tools/test_proxy_response_window_seeded_restart.py \
          docs/card-game/data/proxy-response-window-seeded-restart-plan-120-20260922.json
  git commit -m "feat(card-game): plan checkpoint 120 route continuation"
  ```

### Task 5: Terminal分類、経路独立性、record／trace／evaluation

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`

**Interfaces:**
- Consumes: Task 4 `replay_route_120`, validated 120 plan.
- Produces: `make_rules_stop(route_context, last_valid, reason_code, evidence) -> dict[str, object]`, `make_integrity_stop(route_context, last_valid, reason_code, detected) -> dict[str, object]`, `continue_routes_independently(plan, inputs) -> dict[str, object]`, `build_completed_record(route_context, evidence) -> dict[str, object]`, `build_decision_trace(route_context, evidence) -> dict[str, object]`, `build_evaluation_120(suite) -> dict[str, object]`.

- [ ] **Step 1: Add six failing terminal and isolation tests**

  Add these exact methods:

  - `test_rules_stop_preserves_last_valid_state_and_has_null_winner`
  - `test_integrity_stop_discards_broken_state_and_preserves_last_valid_state`
  - `test_global_failures_are_never_converted_to_route_stops`
  - `test_route_local_stop_does_not_cancel_remaining_routes`
  - `test_completed_requires_r10_final_comparison_or_early_victory`
  - `test_all_outcomes_have_zero_independent_balance_samples`

  Inject a synthetic local rules stop into route 1 and assert routes 2–4 still execute. Inject `ImplementationError`, protected-source mismatch, and plan exhaustion and assert the suite raises instead of creating stop artifacts.

- [ ] **Step 2: Run the six tests and confirm RED**

  Expected first failure: missing stop constructors or independent runner.

- [ ] **Step 3: Implement the exact three terminal classes**

  Use typed internal exceptions:

  ```python
  class RulesAdjudicationStop(Exception):
      def __init__(self, reason_code, evidence):
          super().__init__(reason_code)
          self.reason_code = reason_code
          self.evidence = copy.deepcopy(evidence)

  class RouteIntegrityStop(Exception):
      def __init__(self, reason_code, last_valid, detected):
          super().__init__(reason_code)
          self.reason_code = reason_code
          self.last_valid = copy.deepcopy(last_valid)
          self.detected = copy.deepcopy(detected)

  class ImplementationError(Exception):
      pass
  ```

  `continue_routes_independently()` catches only the first two inside the route loop. `ImplementationError`, protected-source errors, plan validation errors, and writer errors escape and fail the whole run.

  Rules stop reason enum must be exactly:

  ```python
  RULES_STOP_REASONS = {
      "incomplete_legal_candidates",
      "opponent_private_or_future_information_required",
      "missing_stable_candidate_identifier",
      "legality_not_confirmed",
      "canonical_rule_not_defined",
      "effect_resolution_not_defined",
  }
  ```

  Integrity stop must preserve the last fully validated snapshot and record the detected hash／instance／reference error without adopting the broken state. Completed construction must require an explicit validated `r10_final_comparison` or `early_victory_after_growth_100_maintenance` terminal.

  Exercise every approved integrity category as a subtest of `test_integrity_stop_discards_broken_state_and_preserves_last_valid_state` with exact internal reason codes:

  ```python
  INTEGRITY_STOP_REASONS = {
      "event_hash_discontinuity",
      "instance_zone_duplicate_or_missing",
      "decision_event_reference_mismatch",
      "dangling_chain_reservation_or_target",
      "sequence_discontinuity",
  }
  ```

  Exercise all six `RULES_STOP_REASONS` in the rules-stop test. `build_completed_record()` and `build_decision_trace()` must adapt the existing record envelope and call the existing record／decision／event／snapshot validators; do not define a second 120-only record format.

  Build evaluation only from outcomes and evidence; never trust cached plan counts. Set `planned_route_count=4` and `independent_balance_sample_count=0`.

- [ ] **Step 4: Run all 35 dedicated tests and confirm GREEN**

  Expected: 35 tests, all `ok`.

- [ ] **Step 5: Commit Task 5**

  ```bash
  git add docs/card-game/tools/proxy_response_window_seeded_restart.py \
          docs/card-game/tools/test_proxy_response_window_seeded_restart.py
  git commit -m "feat(card-game): isolate checkpoint 120 route terminals"
  ```

### Task 6: Strict materialization、saved artifacts、CLI

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`
- Create: `docs/card-game/data/proxy-response-window-seeded-restart-evaluation-120-20260922.json`
- Create conditionally: `docs/card-game/data/proxy-matches-120/*.json`
- Create conditionally: `docs/card-game/data/proxy-decision-traces-120/*.json`
- Create conditionally: `docs/card-game/data/proxy-response-window-stops-120/*.json`

**Interfaces:**
- Consumes: Task 5 suite／evaluation.
- Produces: `expected_artifacts_120(suite, data_dir) -> dict[Path, object]`, `write_checkpoint_120(suite, data_dir) -> None`, `validate_materialized_checkpoint_120(suite, data_dir) -> list[str]`, CLI `main(argv=None) -> int`.

- [ ] **Step 1: Add four failing materialization and CLI tests**

  Add these exact methods:

  - `test_saved_artifacts_equal_builder_output_and_canonical_bytes`
  - `test_writer_rejects_extra_or_wrong_directory_and_validator_rejects_missing`
  - `test_checkpoint_120_cli_reports_exact_outcomes_counts_and_zero_sample`
  - `test_builders_return_isolated_mutable_collections`

  Canonical bytes assertion:

  ```python
  expected = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
  self.assertEqual(path.read_bytes(), expected)
  ```

- [ ] **Step 2: Run the four tests and confirm RED**

  Expected first failure: missing materializer or missing saved evaluation.

- [ ] **Step 3: Implement strict manifests, canonical writer, validator, and CLI**

  `expected_artifacts_120()` must place each outcome in exactly one terminal directory:

  ```python
  if status == "completed":
      add_match_and_trace(path_id)
  elif status in {"stopped_rules_adjudication", "stopped_record_integrity"}:
      add_stop(path_id)
  else:
      raise ImplementationError(f"unsupported terminal status: {status}")
  ```

  Empty expected directories must not exist. Before writing, compare existing files under all three directories with the expected relative filenames and reject extras or files in the wrong terminal directory; absence of an expected file is allowed during first materialization. After writing, require the exact manifest, reject every missing artifact, and validate every raw byte against builder output.

  CLI options:

  ```text
  --plan PATH
  --data-dir PATH
  --write
  --write-plan PATH
  ```

  Normal `--write` must first validate protected inputs, plan, suite, and current manifests. JSON stdout must include `valid`, `planned_route_count`, `completed_route_count`, `stopped_rules_adjudication_count`, `stopped_record_integrity_count`, `independent_balance_sample_count`, route statuses, `written`, and `errors`.

- [ ] **Step 4: Materialize the audited 120 outputs and confirm 39 GREEN**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 \
    docs/card-game/tools/proxy_response_window_seeded_restart.py --write
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools \
    -p test_proxy_response_window_seeded_restart.py -v
  ```

  Expected: CLI `valid: true`; 39 tests pass; saved JSON equals builder output exactly.

- [ ] **Step 5: Commit Task 6**

  ```bash
  git add docs/card-game/tools/proxy_response_window_seeded_restart.py \
          docs/card-game/tools/test_proxy_response_window_seeded_restart.py \
          docs/card-game/data/proxy-response-window-seeded-restart-plan-120-20260922.json \
          docs/card-game/data/proxy-response-window-seeded-restart-evaluation-120-20260922.json \
          docs/card-game/data/proxy-matches-120 \
          docs/card-game/data/proxy-decision-traces-120 \
          docs/card-game/data/proxy-response-window-stops-120
  git commit -m "feat(card-game): materialize checkpoint 120 restart"
  ```

  If an expected directory is absent because its manifest is empty, omit that path from `git add`; do not create an empty directory.

### Task 7: 120正本、README、総合checker、全検証、GitHub保存

**Files:**
- Modify: `docs/card-game/tools/test_proxy_response_window_seeded_restart.py`
- Modify: `docs/card-game/tools/check-design-data.py` around existing `check_checkpoint_119()` and CLI dispatch
- Create: `docs/card-game/120-response-window-seeded-restart.md`
- Modify: `docs/card-game/README.md` current phase and numbered index
- External update: PR #259 body

**Interfaces:**
- Consumes: Task 6 saved artifacts and measured CLI output.
- Produces: `check_checkpoint_120() -> tuple[list[str], int, int]`, CLI `--checkpoint-120`, final 42-test suite, canonical numbered documentation.

- [ ] **Step 1: Add three failing documentation and checker tests**

  Add these exact methods:

  - `test_numbered_doc_records_exact_outcomes_sources_and_protected_boundaries`
  - `test_readme_points_to_120_and_keeps_112_116_117_119_history`
  - `test_check_design_data_reports_checkpoint_120_and_proxy_total_263`

  The checker test must run:

  ```python
  run = subprocess.run(
      [sys.executable, str(checker), "--checkpoint-120"],
      capture_output=True, text=True, check=False,
  )
  result = json.loads(run.stdout)
  self.assertEqual(result["checkpoint"], 120)
  self.assertEqual(result["checkpoint_120_test_count"], 42)
  self.assertEqual(result["proxy_test_count"], 263)
  self.assertEqual(result["errors"], [])
  ```

- [ ] **Step 2: Run the three tests and confirm RED**

  Expected failures: missing `120-response-window-seeded-restart.md`, README still points to 119, checker has no `--checkpoint-120` path.

- [ ] **Step 3: Implement checkpoint-120 checker before writing docs**

  Add `check_checkpoint_120()` beside `check_checkpoint_119()`. It must load the 120 module without requiring sparse-excluded catalog sources, rebuild suite/evaluation, validate exact materialized bytes, verify the approved design SHA, 20 protected raw SHA values, and 4 state hashes, verify 112's six unplayed fixtures, assert route count 4 and independent sample 0, assert exact actual terminal manifests, assert all decision／event／snapshot dual-hash chains, and count exactly 42 dedicated plus 263 total proxy tests.

  Add CLI output:

  ```python
  if "--checkpoint-120" in sys.argv:
      print(json.dumps({
          "checkpoint": 120,
          "checkpoint_120_test_count": checkpoint_120_test_count,
          "proxy_test_count": checkpoint_120_proxy_count,
          "errors": checkpoint_120_errors,
      }, ensure_ascii=False, indent=2))
      sys.exit(bool(checkpoint_120_errors))
  ```

  Run the checker now. Expected RED: numbered doc／README requirements only; protected and data validations already pass.

- [ ] **Step 4: Write the numbered doc and README from measured outputs**

  `120-response-window-seeded-restart.md` must record:

  - exact 4 route terminal statuses and reasons;
  - exact completed／rules-stop／integrity-stop／decision／event／snapshot／winner counts;
  - `order-01-a-first` first-date selection, payment, activator priority, passes, resolution, draw, growth, discard;
  - each route's final valid event seq and both hashes;
  - independent balance sample 0 and prohibited statistical uses;
  - 117／119／116／112 unchanged evidence;
  - TDD RED→GREEN counts and final verification results;
  - next checkpoint only from actual stopped/completed outcomes.

  Update README current phase to 120 and add the checkpoint-120 numbered-index entry linking to the numbered document. Preserve 119 as the response contract history, 117 as stopped history, 116 as fallback history, and 112 as unplayed fixtures.

- [ ] **Step 5: Run the 42 dedicated tests to GREEN and pass the checkpoint checker**

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools \
    -p test_proxy_response_window_seeded_restart.py -v
  PYTHONDONTWRITEBYTECODE=1 python3 \
    docs/card-game/tools/check-design-data.py --checkpoint-120
  ```

  Expected: 42 tests pass; checker `errors: []`; proxy test count 263.

- [ ] **Step 6: Commit Task 7 documentation and checker**

  ```bash
  git add docs/card-game/tools/test_proxy_response_window_seeded_restart.py \
          docs/card-game/tools/check-design-data.py \
          docs/card-game/120-response-window-seeded-restart.md \
          docs/card-game/README.md
  git commit -m "docs(card-game): save checkpoint 120 restart"
  ```

- [ ] **Step 7: Run final local verification**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p 'test_proxy_*.py' -v
  PYTHONDONTWRITEBYTECODE=1 python3 \
    docs/card-game/tools/proxy_response_window_seeded_restart.py
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py
  git diff --check
  npm test
  ```

  Record separately:

  - 120 dedicated result;
  - all proxy executed／pass／failure／setup-error counts;
  - 120 CLI result;
  - full checker result;
  - canonical bytes equality;
  - protected hashes;
  - `git diff --check`;
  - `npm test` success or sparse-excluded `tests/smoke-test.js` start failure.

  Do not attribute existing sparse catalog/link failures to 120 and do not count them as 120 success.

- [ ] **Step 8: Inspect final local identity and changed files**

  ```bash
  git status --short --branch
  git rev-parse HEAD HEAD^{tree}
  git diff --name-status <checkpoint-120-design-commit>..HEAD
  git log --oneline --decorate -10
  ```

  Expected changed scope: only approved 120 files, README, and `check-design-data.py`; no 112／116／117／119 existing file.

- [ ] **Step 9: Save to the existing remote branch without merging main**

  Use the repository's established GitHub connector save flow so the remote branch tree equals the local tree. Do not force-update main and do not mark PR ready.

  After saving, fetch and record remote HEAD/tree. If connector commit SHA differs from local due single-commit save, require exact tree equality.

- [ ] **Step 10: Update and re-fetch PR #259**

  Replace the PR body's current-save section with measured checkpoint-120 values: remote HEAD/tree, links, exact route outcomes/counts, first-date lifecycle, independent sample 0, protected sources, validation results, sparse exclusions, latest main, and next boundary.

  Re-fetch and assert:

  ```text
  draft = true
  state = open
  merged = false
  headRefName = design/card-pool-master-20260914
  ```

- [ ] **Step 11: Inspect GitHub workflow runs and commit status for the new remote HEAD**

  Fetch workflow runs and combined commit status for the new SHA. Report exact counts and conclusions. If both are 0, state that CI has not run; do not reuse an older success as checkpoint-120 CI.

## Plan Self-Review Checklist

- [x] Design sections 1–22 each map to a Task: sources/hashes Task 1; response Task 2; first-date Task 3; continuation/plan Task 4; terminals/evaluation Task 5; materialization Task 6; docs/checker/GitHub Task 7.
- [x] No unresolved placeholder marker or unspecified processing instruction remains.
- [x] Interface names are consistent: `load_checkpoint_120_inputs`, `verify_protected_sources`, `build_resume_state`, `enumerate_response_opportunity`, `resolve_response_choice`, `apply_response_pass`, `activate_response_candidate`, `resolve_chain`, `enumerate_decision_opportunity`, `resolve_decision`, `apply_decision`, `replay_route_120`, `continue_routes_independently`, `build_evaluation_120`, `write_checkpoint_120`, `validate_materialized_checkpoint_120`.
- [x] Tasks 2–6 resume matches; Task 1 only verifies sources. No Task changes 117 stop state before resume.
- [x] Existing 112、116、117、119 files are read-only and excluded from every `git add` list.
- [x] The approved 120 design is read-only and pinned by raw SHA-256.
- [x] 112の6 fixtureを実行する工程はなく、raw bytesとunplayed statusだけを検査する。
- [x] `response-pass` and normal `pass`／`candidate-pass` are distinct and aliases are rejected.
- [x] E-first-date activation keeps priority with A until A passes.
- [x] Opponent private and future information rejection appears in Tasks 2 and 4.
- [x] Saved JSON versus builder canonical raw bytes equality appears in Tasks 6 and 7.
- [x] Rules stop、record-integrity stop、global error have separate constructors, tests, and catch boundaries.
- [x] Existing canonical handlers and validators are reused before adding 120 adapters.
- [x] Card-specific code is registry-driven; no `path_id`-specific effect handler is introduced.
- [x] Existing canonical text ambiguity causes a route stop; missing code causes an implementation error.
- [x] Every Task has explicit RED command, minimal implementation, GREEN command, and small commit.
- [x] Final verification separates sparse-excluded failures and `tests/smoke-test.js` absence.
- [x] PR #259 remains Draft/open/unmerged and main is never merged.
