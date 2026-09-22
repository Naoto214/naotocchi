# Response Window Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 117の4停止状態を一切進めず、保存stateからresponse contextと完全候補集合を再生成し、06準拠の遷移とresponse専用seed proofを検査できるcheckpoint 119を正本化する。

**Architecture:** 119固有moduleを、保存stateを変更しないphase adapter、最初のresponse opportunityだけを読むcandidate enumerator、純粋関数のtransition validator、synthetic入力専用のseed proofへ分ける。保存する2 JSONは同じbuilderから生成し、117 stop artifactは読み取り専用入力かつ生bytes固定、116 fallback contractは参照専用とする。119は選択、pass実行、カード発動、支払い、連鎖解決、event／snapshot生成を行わない。

**Tech Stack:** Python 3.12標準ライブラリ（`argparse`、`copy`、`hashlib`、`json`、`pathlib`）、JSON、`unittest`、既存の`proxy_normal_decision_seeded_restart.py`と`check-design-data.py`。

**Spec:** `docs/card-game/plans/2026-09-22-response-window-contract-design.md`

## Global Constraints

- checkpoint 119のstatusは`protocol_only_no_match_progress`とし、planned match、completed、stopped match、decision trace、event、snapshot、winner、独立balance標本はすべて0とする。
- 117の4 stop artifact、`pre_decision_state`、`last_valid_state_sha256`、event seq 3、card copy ID、instance ID、manifest、生bytesを変更しない。
- 保存stateの`phase="post_placement_response"`を維持し、adapterが別objectの`phase="response_window"`を導出する。保存stateを再hashしない。
- response passのcanonical IDは`response-pass`だけとし、`candidate-pass`と`pass`をresponse候補として拒否する。
- 監査対象は4経路それぞれの`response_opportunity_index=1`だけとする。候補選択、pass、発動、支払い、解決、ドロー、そだち増加を実行しない。
- `order-01-a-first`の合法候補は`response-pass`と`response-use-event-A-040#1-target-A-017#1`、残る3経路は`response-pass`だけとする。
- 完全性証拠はowner-known情報と公開された相手情報だけを使い、相手の非公開手札、未公開山札順、未来のドロー、未来の反応選択を拒否する。
- response遷移は06を変更せず、発動者本人が先に追加発動の機会を得て、その本人がpassした後に相手へpriorityを移す。
- response専用seed proofは119のcontract versionとexact 10 context keysを使い、候補配列を11要素目に置く。116のcontract、version、許可decision kindを変更しない。
- 112の未実施fixture 6件を実行・変更せず、status `fixture`、events空、winner null、completed 0、独立強度標本0を維持する。
- 現行452、登録477候補（CARD463＋HOLD14）、カード本文、数値、登録区分、発売枚数を変更しない。
- 現行語は暫定名称「ときおくり」。ID、schema、event種別、英語の機械識別子は変更せず、118の移行目的・対応表以外へ旧称を再導入しない。
- PR #259はDraft・open・未マージを維持し、本編、表情、イラスト、別PRの変更を混ぜない。

## Review Focus

- stop artifactのdict内容が同じでも改行・encoding・key順が変われば、生bytes SHA-256不一致として拒否すること。Task 4の`test_protected_source_bytes_and_state_hashes_are_exact`で固定する。
- `candidate_set_complete: true`なのにownerの1領域、相手の公開1領域、候補family、除外理由のいずれかが欠ければ拒否すること。Task 2の`test_candidate_completeness_requires_all_scanned_zones_families_and_reasons`で固定する。
- 相手手札やdeck、`future_draw`／`future_response_choice`を証拠へ混入した場合、候補内容が正しくても拒否すること。Task 2の`test_candidate_audit_rejects_opponent_private_and_future_information`で固定する。
- chainが空の発動後に相手へ即priorityを移す誤実装を拒否し、発動者本人を次のpriority actorにすること。Task 3の`test_activation_keeps_priority_with_activator_until_their_pass`で固定する。
- 保存JSONがbuilderと意味的に等しくてもcanonical UTF-8・indent 2・LF末尾newlineでなければ拒否すること。Task 4の`test_materialized_json_requires_exact_builder_bytes`で固定する。

---

## File Map

- Create `docs/card-game/tools/proxy_response_window_contract.py`: contract／audit builder、phase adapter、candidate enumerator、transition validator、response seed proof、canonical writer／CLI。
- Create `docs/card-game/tools/test_proxy_response_window_contract.py`: checkpoint 119専用のTDD・固定値・mutation・materialized回帰テスト。
- Create `docs/card-game/data/proxy-response-window-contract-119-20260922.json`: protocol、phase、候補ID、遷移、seed、scope、保護境界の機械可読正本。
- Create `docs/card-game/data/proxy-response-window-candidate-audit-119-20260922.json`: 4 stop artifactの最初のresponse opportunityに対する完全候補監査。
- Create `docs/card-game/119-response-window-contract.md`: 実装後の実測値、RED→GREEN、検証、次checkpoint境界。
- Modify `docs/card-game/tools/check-design-data.py`: 119の存在、再生成一致、固定hash、候補集合、遷移、seed、0件境界、全test件数を総合検査へ追加。
- Modify `docs/card-game/README.md`: 現在地、一覧、再開地点を119へ同期。
- Modify PR #259 body only after the implementation commits are pushed: 119のremote HEAD/tree、検証実測、0件境界、次checkpointを同期。
- Read only `docs/card-game/data/proxy-normal-decision-stops-117/*.json`, `proxy-normal-decision-fallback-contract-116-20260918.json`, `proxy-normal-decision-seeded-restart-plan-117-20260919.json`, `proxy-normal-decision-seeded-restart-evaluation-117-20260919.json`, 112の6 fixture。これらへwriteしない。

### Task 1: response contractとphase adapter

**Files:**
- Create: `docs/card-game/tools/test_proxy_response_window_contract.py`
- Create: `docs/card-game/tools/proxy_response_window_contract.py`

**Interfaces:**
- Produces: `load_inputs(data_dir: Path = DATA) -> dict[str, object]`。keysは`candidate_table`、`fallback_contract_116`、`restart_plan_117`、`restart_evaluation_117`、`stops_117`。
- Produces: `build_response_window_contract() -> dict[str, object]`。
- Produces: `validate_response_window_contract(contract: object) -> list[str]`。
- Produces: `derive_response_context(stop_artifact: dict[str, object]) -> dict[str, object]`。
- Produces: `validate_response_context(context: object, stop_artifact: object) -> list[str]`。
- Reuses read-only: `proxy_normal_decision_seeded_restart._stop_state_sha256` for verification only。phase adapterはこのhash関数へ変更後stateを渡さない。

- [ ] **Step 1: contractとadapterの失敗テスト6件を書く**

  `test_proxy_response_window_contract.py`へ次を追加する。

  ```python
  class ResponseWindowContractTests(unittest.TestCase):
      @classmethod
      def setUpClass(cls):
          cls.inputs = load_inputs()

      def test_four_stops_derive_exact_first_response_contexts(self):
          rows = [derive_response_context(row) for row in self.inputs["stops_117"]]
          self.assertEqual([row["priority_actor"] for row in rows], ["A", "B", "A", "B"])
          for row in rows:
              self.assertEqual(row, {
                  "source_phase": "post_placement_response",
                  "phase": "response_window",
                  "window_kind": "after_normal_action",
                  "origin_event_seq": 3,
                  "turn_player": row["priority_actor"],
                  "priority_actor": row["priority_actor"],
                  "chain_status": "empty",
                  "chain_links": [],
                  "consecutive_passes": 0,
                  "response_opportunity_index": 1,
                  "decision_kind": "response_action",
                  "choice_kind": "reaction_or_pass",
              })
  ```

  残るテスト名とassertionを固定する。

  - `test_contract_fixes_identity_phase_pass_families_and_scope`: schema、checkpoint 119、status、contract version、phase field、`response-pass`、禁止alias、3 candidate family、0件scopeをexact比較する。
  - `test_phase_adapter_does_not_mutate_or_rehash_saved_state`: deepcopy前後一致、保存hash一致、adapter objectが`pre_decision_state`外にあることをassertする。
  - `test_phase_adapter_rejects_wrong_source_phase_event_seq_turn_or_hash`: source phase、seq、turn player、state hashを1つずつ改変しerrorをassertする。
  - `test_contract_rejects_response_pass_aliases_and_scope_progress`: pass IDを`pass`／`candidate-pass`へ変更、event／decision／winner countを1へ変更して拒否をassertする。
  - `test_contract_keeps_116_version_and_decision_kinds_read_only`: build前後で116 objectがdeep-equal、生ファイルbytesが同じ、119 contract versionが116 versionと異なることをassertする。

- [ ] **Step 2: REDを実確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_response_window_contract.py -v
  ```

  Expected: `ModuleNotFoundError: No module named 'proxy_response_window_contract'`。

- [ ] **Step 3: 定数、loader、contract builderを最小実装する**

  module先頭を次で固定する。

  ```python
  CONTRACT_SCHEMA = "naotocchi.card_game.proxy_response_window_contract.v1"
  AUDIT_SCHEMA = "naotocchi.card_game.proxy_response_window_candidate_audit.v1"
  CONTRACT_VERSION = "naotocchi.card_game.proxy_response_window.v1"
  PATH_ORDER = (
      "order-01-a-first", "order-01-b-first",
      "order-02-a-first", "order-02-b-first",
  )
  RESPONSE_CONTEXT_KEYS = (
      "source_phase", "phase", "window_kind", "origin_event_seq",
      "turn_player", "priority_actor", "chain_status", "chain_links",
      "consecutive_passes", "response_opportunity_index",
      "decision_kind", "choice_kind",
  )
  RESPONSE_SEED_CONTEXT_KEYS = (
      "contract_version", "order_id", "actor", "actor_turn_index", "round",
      "origin_event_seq", "response_opportunity_index", "phase",
      "decision_kind", "choice_kind",
  )
  RESPONSE_PASS_ID = "response-pass"
  FORBIDDEN_RESPONSE_PASS_ALIASES = ("candidate-pass", "pass")
  ```

  `build_response_window_contract`のtop-level exact keysを`schema`、`checkpoint`、`status`、`contract_version`、`phase_adapter`、`candidate_contract`、`transition_contract`、`seeded_fallback`、`scope`、`checkpoint_boundaries`、`population`とする。`scope`は次のexact objectとする。

  ```python
  ZERO_SCOPE = {
      "planned_match_count": 0,
      "completed_match_count": 0,
      "stopped_match_count": 0,
      "decision_trace_count": 0,
      "event_count": 0,
      "snapshot_count": 0,
      "winner_count": 0,
      "independent_balance_sample_count": 0,
      "new_stop_artifact_count": 0,
  }
  ```

- [ ] **Step 4: phase adapterとstrict validatorを実装する**

  `derive_response_context`は117 stopの`phase`、`pre_decision_state.phase`、`last_valid_event_seq`、`last_valid_state_sha256`、`actor`、`turn_player`を検査し、入力をdeepcopyしても変更しない。`validate_response_context`はexact key順、boolをintとして受理しない数値型、`chain_links=[]`、`chain_status="empty"`、actor結合を検査する。

- [ ] **Step 5: Task 1をGREENにする**

  Run: Step 2と同じ。

  Expected: Task 1の6件PASS。

- [ ] **Step 6: Task 1を小さくコミットする**

  ```bash
  git add docs/card-game/tools/proxy_response_window_contract.py \
    docs/card-game/tools/test_proxy_response_window_contract.py
  git commit -m "test(card-game): define checkpoint 119 response contract"
  ```

### Task 2: 4 stop artifactのcandidate enumeratorとcandidate audit

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_contract.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_contract.py`

**Interfaces:**
- Produces: `build_response_pass_detail() -> dict[str, object]`。
- Produces: `enumerate_response_candidates(stop_artifact: dict[str, object], candidate_table: dict[str, object]) -> dict[str, object]`。
- Produces: `build_candidate_audit(inputs: dict[str, object]) -> dict[str, object]`。
- Produces: `validate_candidate_audit(audit: object, inputs: dict[str, object]) -> list[str]`。
- Candidate row exact keys: `path_id`、`source_stop_file`、`source_stop_sha256`、`source_state_sha256`、`response_context`、`inspected_information`、`checked_candidate_families`、`legal_candidate_ids`、`legal_candidate_details`、`excluded_candidates`、`forbidden_information_used`、`candidate_set_complete`。

- [ ] **Step 1: 候補集合と情報境界の失敗テスト7件を書く**

  ```python
  def test_four_first_opportunities_have_exact_candidate_sets(self):
      audit = build_candidate_audit(self.inputs)
      self.assertEqual(
          {row["path_id"]: row["legal_candidate_ids"] for row in audit["audits"]},
          {
              "order-01-a-first": [
                  "response-pass",
                  "response-use-event-A-040#1-target-A-017#1",
              ],
              "order-01-b-first": ["response-pass"],
              "order-02-a-first": ["response-pass"],
              "order-02-b-first": ["response-pass"],
          },
      )
  ```

  残るテストを次へ固定する。

  - `test_response_pass_detail_is_required_and_aliases_are_rejected`: pass detailが`candidate_family="pass"`、`action_type="response_pass"`、source null、targets空であり、alias混入を拒否する。
  - `test_first_date_detail_binds_copy_instance_target_time_stage_and_sources`: A-040、A-040#1、A-017#1、E-first-date、時1、残り時1、partner、交際0、91／93 B12をexact比較する。
  - `test_candidate_completeness_requires_all_scanned_zones_families_and_reasons`: ownerのhand／board／prepared／discard／time／reservations、相手publicのboard／prepared_public／discard／time／reservations、3 family、各owner hand cardの採用・除外証拠を1つずつ削って拒否する。
  - `test_normal_actions_never_enter_response_candidates`: birth、time_skip、transform、place_companion、place_partner、place_world、relationship_progress、attach_item、prepare_action、challengeを注入して拒否する。
  - `test_candidate_audit_rejects_opponent_private_and_future_information`: `opponent_hand`、`opponent_deck_order`、`future_draw`、`future_response_choice`をsubTestで注入し拒否する。
  - `test_candidate_ids_details_order_uniqueness_and_completeness_are_strict`: unsorted、duplicate、missing detail、extra detail、ID/detail不一致、`candidate_set_complete=False`を拒否する。

- [ ] **Step 2: REDを実確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_response_window_contract.py -v
  ```

  Expected: `build_candidate_audit`／`enumerate_response_candidates`未定義でFAIL。

- [ ] **Step 3: response passと情報snapshotを最小実装する**

  `build_response_pass_detail()`は次を返す。

  ```python
  {
      "candidate_id": "response-pass",
      "candidate_family": "pass",
      "action_type": "response_pass",
      "card_id": None,
      "card_copy_id": None,
      "source_instance_id": None,
      "target_instance_ids": [],
      "base_time_cost": 0,
      "source_references": [
          "01-core-rules.md#通常行動と反応【確定】",
          "06-action-chain-checkpoint.md#反応機会・パス【確定】",
      ],
  }
  ```

  `inspected_information`は`owner`と`opponent_public`だけを持つ。ownerはinstance IDとcard IDを結合したhand、board、prepared、discard、time、reservationsを保存し、opponent側はhandとdeckを保存しない。board内の裏向き準備札は内容を公開せず、公開済み識別子だけを`prepared_public`へ置く。

- [ ] **Step 4: 4状態限定enumeratorと完全性証拠を実装する**

  handの各cardについて114 action rowを読み、`use_event`／`use_play`の「すぐつかう」候補だけを現在response機会で評価する。今回の実状態は次のreason codeへ固定する。

  - main、companion、partner: `normal_action_not_response`。
  - `attach_item`: `attach_not_response`。
  - E-boss: `insufficient_time_and_condition_false`。
  - E-fateful-transform: `insufficient_time_and_no_main`。
  - G-basketball-3d: `no_own_main_target`。
  - E-first-date in `order-01-a-first`: `legal_response_candidate`。
  - boardのP-cat_ceo: `trigger_already_missed_and_egg_ability_disabled`。
  - boardのC-chameleon: `passive_not_activation`。
  - prepared空: `no_prepared_activation_present`。

  E-first-date detailは次のstable ID構成を使う。

  ```python
  candidate_id = (
      f"response-use-event-{source_instance_id}-target-{target_instance_id}"
  )
  detail = {
      "candidate_id": candidate_id,
      "candidate_family": "hand_quick_use",
      "action_type": "use_event",
      "card_id": "E-first-date",
      "card_copy_id": "A-040",
      "source_instance_id": "A-040#1",
      "target_instance_ids": ["A-017#1"],
      "target_card_ids": ["P-cat_ceo"],
      "target_zone": "partner",
      "base_time_cost": 1,
      "remaining_time_before_payment": 1,
      "relationship_stage": 0,
      "source_references": [
          "91-event-21-card-text-draft.md#E-first-date",
          "93-cross-type-boundary-audit.md#B12",
      ],
  }
  ```

  builderはhard-codeした候補配列を返すだけでなく、stop stateのA-040#1／A-017#1とcandidate tableのE-first-date rowを照合してからdetailを作る。いずれかが欠ければcomplete監査を作らず`ValueError`にする。

- [ ] **Step 5: strict audit validatorを実装してTask 2をGREENにする**

  validatorはtop-level exact keys `schema`、`checkpoint`、`status`、`audited_response_opportunity_count`、`selected_candidate_count`、`scope`、`audits`を要求する。`selected_candidate_count=0`、`scope=ZERO_SCOPE`、auditsのPATH_ORDER、candidate ID昇順とdetail一対一を検査する。

  Run: Step 2と同じ。

  Expected: Task 1＋2の13件PASS。

- [ ] **Step 6: Task 2を小さくコミットする**

  ```bash
  git add docs/card-game/tools/proxy_response_window_contract.py \
    docs/card-game/tools/test_proxy_response_window_contract.py
  git commit -m "feat(card-game): audit checkpoint 119 response candidates"
  ```

### Task 3: response transition validatorとresponse専用seed proof

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_contract.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_contract.py`

**Interfaces:**
- Produces: `transition_response_window(context: dict[str, object], action: dict[str, object]) -> dict[str, object]`。synthetic stateだけを受け、117 stopへ呼ばない。
- Produces: `validate_response_transition(before: object, action: object, after: object) -> list[str]`。
- Produces: `build_response_seed_proof(context: dict[str, object], candidate_ids: list[str]) -> dict[str, object]`。
- Produces: `validate_response_seed_proof(proof: object, context: object, candidate_ids: object) -> list[str]`。

- [ ] **Step 1: 06遷移とseedの失敗テスト8件を書く**

  - `test_empty_chain_first_pass_moves_priority_and_sets_one_pass`: A→B、`consecutive_passes=1`、window openをassertする。
  - `test_empty_chain_second_pass_closes_window_without_event`: Bの2回目passで`window_status="closed"`、`return_to="normal_action_opportunity"`、event／snapshotが存在しないことをassertする。
  - `test_activation_keeps_priority_with_activator_until_their_pass`: A発動後はA priority、chain building、passes 0、A pass後にB priority、passes 1をassertする。
  - `test_opponent_activation_after_pass_returns_priority_and_resets_passes`: A pass→B発動でAへpriorityを戻しpasses 0をassertする。
  - `test_two_passes_close_building_chain_and_resolve_reverse_order`: chain links `[link-1, link-2]`から`resolution_order=[link-2, link-1]`をassertする。
  - `test_resolution_trigger_opens_new_chain_before_normal_action`: pending triggerありなら`next_window_kind="after_chain_resolution_trigger"`、通常行動復帰falseをassertする。
  - `test_response_seed_proof_uses_exact_eleven_element_material`: exact 10 context値＋昇順ID配列、空白なしUTF-8 JSON、SHA-256、big-endian unsigned、modulo Nを再計算する。
  - `test_response_seed_rejects_116_context_shape_private_fields_and_real_stop_application`: 116の8-key context、余分なpath／future field、4 stop artifactを入力とする呼出しを拒否する。

- [ ] **Step 2: REDを実確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_response_window_contract.py -v
  ```

  Expected: transition／response seed関数未定義でFAIL。

- [ ] **Step 3: pure transition stateとvalidatorを最小実装する**

  synthetic transition contextのexact keysを次へ固定する。

  ```python
  TRANSITION_KEYS = {
      "window_status", "window_kind", "turn_player", "priority_actor",
      "chain_status", "chain_links", "consecutive_passes",
      "response_opportunity_index", "pending_triggers", "return_to",
      "resolution_order",
  }
  ```

  actionは`{"kind": "response_pass", "actor": "A"}`または`{"kind": "activate", "actor": "A", "link_id": "link-1"}`だけを許可する。chain空・pass 0からの最初の`activate`と、同じ発動者による連続追加発動では発動者をpriorityに保持する。building chainで相手のpass後に`activate`した場合は、先にpassした側へpriorityを戻して`consecutive_passes=0`とする。building chainの双方連続passだけが`resolution_order=list(reversed(chain_links))`を作る。pending triggerがあれば現chain終了後に新windowへ送り、空になるまで`return_to`を`None`とする。

- [ ] **Step 4: response seed proofを116から独立実装する**

  ```python
  material = [context[key] for key in RESPONSE_SEED_CONTEXT_KEYS] + [ordered_ids]
  serialized = json.dumps(material, ensure_ascii=False, separators=(",", ":"))
  digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
  selected_index = int(digest, 16) % len(ordered_ids)
  ```

  contextは`contract_version=CONTRACT_VERSION`、`phase="response_window"`、`decision_kind="response_action"`、`choice_kind="reaction_or_pass"`、actor A/B、integer fieldsはbool除外かつ1以上を要求する。proof keysは`algorithm`、`seed_material`、`canonical_serialization`、`sha256`、`canonical_candidate_ids`、`candidate_count`、`selected_index`、`selected_candidate`とする。4 stop監査へproofやselected candidateを追加しない。

- [ ] **Step 5: Task 3をGREENにする**

  Run: Step 2と同じ。

  Expected: Task 1〜3の21件PASS。

- [ ] **Step 6: Task 3を小さくコミットする**

  ```bash
  git add docs/card-game/tools/proxy_response_window_contract.py \
    docs/card-game/tools/test_proxy_response_window_contract.py
  git commit -m "feat(card-game): validate response priority and seed proof"
  ```

### Task 4: canonical JSON、保護hash、CLI

**Files:**
- Modify: `docs/card-game/tools/proxy_response_window_contract.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_contract.py`
- Create: `docs/card-game/data/proxy-response-window-contract-119-20260922.json`
- Create: `docs/card-game/data/proxy-response-window-candidate-audit-119-20260922.json`

**Interfaces:**
- Produces: `build_checkpoint_119(inputs: dict[str, object]) -> dict[str, dict[str, object]]` with keys `contract` and `candidate_audit`。
- Produces: `write_checkpoint_119(bundle: dict[str, object], data_dir: Path) -> None`。
- Produces: `validate_materialized_checkpoint_119(bundle: object, data_dir: Path) -> list[str]`。
- CLI: `python3 docs/card-game/tools/proxy_response_window_contract.py [--write] [--data-dir PATH]`。

- [ ] **Step 1: materialized成果物と保護境界の失敗テスト6件を書く**

  - `test_saved_contract_and_audit_equal_builder_output`: 保存2 JSONとbuilder resultのdeep type-strict一致をassertする。
  - `test_materialized_json_requires_exact_builder_bytes`: UTF-8、indent 2、LF末尾newlineのexact bytesをassertし、CRLF、末尾newline欠落、key順変更を拒否する。
  - `test_protected_source_bytes_and_state_hashes_are_exact`: 下記7生SHA-256と4 state hashをexact固定する。
  - `test_checkpoint_119_has_no_match_progress_artifacts`: 119用record／trace／stop directoryがなく、scope全0、audit selected 0をassertする。
  - `test_checkpoint_112_fixtures_remain_six_unplayed_records`: 6件、status fixture、events空、winner nullをassertする。
  - `test_builder_returns_isolated_mutable_collections`: 1回目buildのnested listを変更しても2回目buildが変わらないことをassertする。

  固定値は次とする。

  ```python
  PROTECTED_FILE_SHA256 = {
      "stop-117-order-01-a-first.json": "c1f75fed4ea40c685740d78b67885ab21092f3d125a79b044474e2cbb26c3b92",
      "stop-117-order-01-b-first.json": "58b3fbce9d570b472dd6c91ee5ad1a043a2fd94864d6019deedfd3a78f3d2bcd",
      "stop-117-order-02-a-first.json": "a4e1b35c03da7c8927e94b59740a16bbf8b78f69d165c516cf9c3a4652f8fc5c",
      "stop-117-order-02-b-first.json": "e66ae50ec54c3b568dcef30f75c9d2751346aa92a35e9748ac96dc0053b6e232",
      "proxy-normal-decision-fallback-contract-116-20260918.json": "8a7f41847339816d786d6c6055e290454cf8d5d84d6ccc22d6a32eb287cbfb6f",
      "proxy-normal-decision-seeded-restart-plan-117-20260919.json": "2502320582b2cf6b05731bd7d23e37e62a7437f1b4b48361fd8e591ba53583d2",
      "proxy-normal-decision-seeded-restart-evaluation-117-20260919.json": "de90629db36032ad2c6a6be0c804c60227383e5c2bdb218939dbbca2334268ff",
  }
  PROTECTED_STATE_SHA256 = {
      "order-01-a-first": "79c8ba24c4749d34436e5dbc36a89aac6f59bd682d02763715f68bd33068ff80",
      "order-01-b-first": "468cb23491db85e53c2ede37c57c325b6620c82ca4cb7bbdeb6b7e7fd95de399",
      "order-02-a-first": "87df61c75bb6a304b684ab00444b321cb1e1b25ee95f6a3b8353af0beae804de",
      "order-02-b-first": "d3969f6708ae9834295a88d07b2cd7f88da7889541f48175bae4715af61de240",
  }
  ```

- [ ] **Step 2: REDを実確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_response_window_contract.py -v
  ```

  Expected: 保存JSON不在、writer／materialized validator未定義でFAIL。

- [ ] **Step 3: bundle、canonical writer、materialized validator、CLIを実装する**

  writerは次の2 pathだけへwriteする。

  ```python
  OUTPUT_FILES = {
      "contract": "proxy-response-window-contract-119-20260922.json",
      "candidate_audit": "proxy-response-window-candidate-audit-119-20260922.json",
  }
  canonical = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
  ```

  `--write`前に全validatorと保護hash検査を通し、errorが1件でもあればwriteしない。CLI出力は`valid`、`status`、`audited_response_opportunity_count`、`legal_candidate_counts`、`scope`、`written`、`errors`を持つ。

- [ ] **Step 4: 2 JSONを生成してTask 4をGREENにする**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_response_window_contract.py --write
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    docs/card-game/tools/test_proxy_response_window_contract.py -v
  ```

  Expected: CLI `valid: true`、legal candidate counts `[2, 1, 1, 1]`、Task 1〜4の27件PASS。

- [ ] **Step 5: Task 4を小さくコミットする**

  ```bash
  git add docs/card-game/tools/proxy_response_window_contract.py \
    docs/card-game/tools/test_proxy_response_window_contract.py \
    docs/card-game/data/proxy-response-window-contract-119-20260922.json \
    docs/card-game/data/proxy-response-window-candidate-audit-119-20260922.json
  git commit -m "feat(card-game): materialize checkpoint 119 response contract"
  ```

### Task 5: 119正本文書、README、総合checker、PR本文

**Files:**
- Modify: `docs/card-game/tools/check-design-data.py`
- Modify: `docs/card-game/tools/test_proxy_response_window_contract.py`
- Create: `docs/card-game/119-response-window-contract.md`
- Modify: `docs/card-game/README.md`
- Remote update after push: Draft PR #259 body。

**Interfaces:**
- Extends: `check-design-data.py` resultの`proxy_test_count`と`errors`。
- Documentation contract: READMEの現在地リンク、一覧119行、末尾進捗、119本文の実測値はbuilder／test出力と一致する。

- [ ] **Step 1: docs／checker同期の失敗テスト4件とchecker項目を先に書く**

  専用testへ次を追加する。

  - `test_numbered_doc_records_protocol_only_counts_and_exact_candidates`。
  - `test_readme_points_to_119_without_claiming_match_resume`。
  - `test_tokiokuri_old_term_allowlist_remains_118_only`。
  - `test_check_design_data_reports_checkpoint_119_and_proxy_total`。

  `check-design-data.py`へ次を追加する。

  - design、implementation plan、tool、test、2 JSON、119本文の存在。
  - builder／saved JSONの完全一致と119 CLI成功。
  - 4 source stop filename、生SHA-256、state hash、phase、seq 3。
  - 4 context、候補集合 `[2,1,1,1]`、response-pass、E-first-date detail、candidate completeness。
  - forbidden pass aliases、通常行動除外、opponent private／future拒否。
  - 06 priority遷移とsynthetic seed proof再計算。
  - 119 scope全0、新stop 0、117 stopped 4は過去結果として保持。
  - 116 contract、117 plan／evaluation、112 fixture 6件の非変更。
  - 452／477／変更0 ID、118旧称allowlist維持。
  - 専用test実数と全`test_proxy_*.py`のAST実数。

- [ ] **Step 2: REDを実確認する**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    docs/card-game/tools/test_proxy_response_window_contract.py -v
  ```

  Expected: `119-response-window-contract.md`とREADME 119 entry不在でFAIL。既存190件を新しい全proxy件数として誤記しない。

- [ ] **Step 3: 119番号付き正本を書く**

  本文へ次を実測値で記録する。

  - 119 statusとscope全0、117 stopped 4を変更していないこと。
  - phase adapter exact 12 field。
  - 4経路のpriority actor、source stop／state hash、合法候補表。
  - E-first-dateのcopy／instance／target／時／交際0／91／93 B12。
  - 完全列挙範囲、情報境界、通常行動除外。
  - 06準拠のpriority／pass／chain／reverse resolution／post-resolution trigger。
  - response seed 10 keys＋候補配列、synthetic testのみ、116非変更。
  - RED→GREENの実測専用test件数、全proxy件数、CLI、checker、npm結果。
  - 次checkpointで同じstop state/hashから4経路を独立再開し、119では再開していないこと。

- [ ] **Step 4: READMEを119へ同期する**

  冒頭の現在地へ表示文言`119 response-window契約`、相対path`119-response-window-contract.md`のリンクを置き、一覧へ119行を追加する。末尾進捗は119をprotocol-onlyとし、次checkpointで4経路を同じstate/hashから再開、112へ先行しないと明記する。118の暫定名称境界を残す。

- [ ] **Step 5: docs／checkerをGREENにする**

  Run: Step 2と同じ。

  Expected: checker `errors: []`、専用31件PASS。全proxy実数をchecker出力から119本文とREADMEへ同期し、件数同期後に同じ2 commandを再実行する。

- [ ] **Step 6: Task 5を小さくコミットする**

  ```bash
  git add docs/card-game/119-response-window-contract.md \
    docs/card-game/README.md docs/card-game/tools/check-design-data.py \
    docs/card-game/tools/test_proxy_response_window_contract.py
  git commit -m "docs(card-game): save checkpoint 119 response contract"
  ```

- [ ] **Step 7: push後にPR #259本文を119へ同期する**

  PR本文の最新保存地点を119へ更新し、remote HEAD／tree、119正本リンク、候補集合、scope全0、117／116／112非変更、検証実測、次checkpointを記載する。`draft=true`、`state=open`、`merged=false`を更新後に再取得する。mainへマージしない。

### Task 6: 独立review、全検証、GitHub保存

**Files:**
- Review only: checkpoint 119で変更した全tracked file。
- Modify only if reviewがin-scope defectを示した場合。修正は該当Taskへ戻り、失敗テスト追加→RED→最小修正→focused GREEN→再reviewの順で行う。
- Remote update: existing `design/card-pool-master-20260914` and Draft PR #259 only。

**Interfaces:**
- Consumes: Task 1〜5のcommitsと119 design。
- Produces: reviewed local HEAD/tree、remote HEAD/tree、同期済みPR本文、new HEADのCI／commit status実確認。

- [ ] **Step 1: spec complianceとcode qualityを順にreviewする**

  design第1〜15節を1項目ずつTask／testへ対応づける。特にReview Focus 5件、119での対戦進行0、117生bytes、116 contract、112 fixture、発動者本人priority、private／future情報拒否、builder一致を確認する。

- [ ] **Step 2: 保存候補treeでfresh gateを実行する**

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p test_proxy_response_window_contract.py -v
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p 'test_proxy_*.py' -v
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_response_window_contract.py
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py
  sha256sum docs/card-game/data/proxy-normal-decision-stops-117/*.json \
    docs/card-game/data/proxy-normal-decision-fallback-contract-116-20260918.json \
    docs/card-game/data/proxy-normal-decision-seeded-restart-plan-117-20260919.json \
    docs/card-game/data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json
  npm test
  git diff --check
  git status --short
  git rev-parse HEAD
  git rev-parse HEAD^{tree}
  ```

  Expected: 全command exit 0、worktree clean。専用／全proxy／npmの実件数、CLI `valid: true`、checker `errors: []`、HEAD、treeを記録する。

- [ ] **Step 3: remote競合を確認して既存branchへfast-forward pushする**

  ```bash
  git fetch origin main design/card-pool-master-20260914
  git rev-parse origin/main
  git rev-parse origin/design/card-pool-master-20260914
  git log --oneline --left-right origin/design/card-pool-master-20260914...HEAD
  git push origin HEAD:design/card-pool-master-20260914
  ```

  remote branchが開始時`49b218af5bc25e0bd0ad7d956d9154d9208ee389`から予期せず進んでいた場合はpushせず停止する。force pushしない。最新mainに`docs/card-game/`差分が入っていれば、その差分を確認してから停止し、mainを作業branchへmergeしない。

- [ ] **Step 4: remote HEAD/tree、PR、CI、commit statusを実確認する**

  local HEAD、remote branch HEAD、PR head SHAを一致させ、treeも一致させる。PR #259がDraft・open・未マージであることを確認する。新remote HEADのworkflow runとcombined statusを取得し、runが0件なら旧runを119成功として数えず`new-head workflow run/status: 0`と記録する。runがあればterminal statusまで確認し、run ID／workflow／conclusionを記録する。

- [ ] **Step 5: checkpoint 119で停止する**

  変更ファイル、HEAD、tree、検査件数、remote一致、PR状態、CI状態を報告する。117の4経路の候補選択・pass・発動・支払い・解決・対戦再開を開始しない。112の6 fixtureへ進まない。

## Plan Self-Review Checklist

- [ ] design第1〜15節の各要件がTask 1〜6のいずれかへ割り当てられている。
- [ ] 曖昧な実装指示、未定の関数名、未定のJSON field名がない。
- [ ] `build_response_window_contract`、`derive_response_context`、`build_candidate_audit`、`transition_response_window`、`build_response_seed_proof`の名称と型がTask間で一致する。
- [ ] 119で候補選択、pass実行、カード発動、支払い、連鎖解決、ドロー、そだち増加を行うstepがない。
- [ ] 117の4 stop artifactを書き換えるwrite pathがない。
- [ ] 116 contractを書き換えるwrite pathがない。
- [ ] 112の6 fixtureを実行するstepがない。
- [ ] `response-pass`と通常行動用`candidate-pass`／`pass`を混同していない。
- [ ] 発動者本人が先に追加発動し、その本人のpass後に相手へ移る06のpriority順になっている。
- [ ] opponent private／future informationを拒否するmutation testがある。
- [ ] 保存JSONとbuilder再生成結果のexact bytes一致検査がある。
