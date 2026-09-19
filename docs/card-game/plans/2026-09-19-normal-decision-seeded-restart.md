# Normal Decision Seeded Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 115で停止した2初期順×先後鏡像4経路を116のfallback contractで最初から再生し、経路ごとにcompleted recordまたは再開可能なstop artifactへ接続するcheckpoint 117を保存する。

**Architecture:** 117固有の固定判断planが完全合法候補、選択証拠、支払い、対象、停止指示を明示し、Python replay builderはplanにない戦略判断をせずstate、event、snapshot、hashを再生成する。107／114のaction objectと116のcanonical candidate IDは明示的なbridgeで分離し、各経路を独立再生する。completed、stopped、validator errorを相互に混同せず、seed使用経路の独立balance標本は常に0とする。

**Tech Stack:** Python 3.12標準ライブラリ（`argparse`、`copy`、`json`、`pathlib`）、JSON、`unittest`、既存の`proxy_record_validator.py`、114 hardening、115 manifest、116 fallback contract。

**Spec:** `docs/card-game/plans/2026-09-19-normal-decision-seeded-restart-design.md`

## Global Constraints

- 入力は107 source／protocol、114 candidate table／hardening、115 plan／audit、116 fallback contractへ固定する。
- order-01 A=50／B=100050、order-02 A=51／B=100051と、A/B各40枚のcard copy ID／card ID／initial instance IDを変更しない。
- 同じorderの先後鏡像は同じA/B manifestを参照し、各経路を初期状態から再生する。
- 1経路の正当な停止を理由に他の経路を止めない。
- `candidate-pass`は114照合時だけ保持し、117のcanonical candidate IDでは`pass`へ一方向に正規化する。
- `legal_candidates`は昇順ID文字列配列、`legal_candidate_details`は同じIDに一対一対応するaction object配列とする。
- seed材料は116のexact 9要素だけとし、fixture、match、先手、path名を加えない。
- 相手の手札、山札順、未公開選択、将来結果、任意のカード価値点を判断へ使わない。
- 対戦エンジン、完全自動合法性判定、4経路を超える対戦を作らない。
- 112の6 fixtureを変更せず、現行452、登録477、カード本文・数値・登録区分変更0 IDを維持する。
- seedまたは戦略的未解決を含むcompleted経路も独立balance、勝率、先後差、発動率、カード強度、採否根拠へ数えない。
- PR #259はDraft・open・未マージを維持し、本編、表情、イラスト、別PRの変更を混ぜない。

## Review Focus

- 114の`candidate-pass`と116の`pass`が同じdecision内へ混在した場合、validatorが拒否すること。
- candidate ID配列とdetail object配列の欠落、余分、重複、selected／runner-up不一致を例外なしで拒否すること。
- 同じorder／actor／turn／round／phase／choiceの先後鏡像が同じproofになり、path名を変えてもseedが変わらないこと。
- 1経路のlegitimate stopが残る3経路の再生や成果物manifestを壊さず、staleな余分ファイルも検出すること。
- 不明な正本裁定はstop artifactになる一方、hash、instance、plan不整合はvalidator errorとなりstopへ偽装されないこと。

---

### Task 1: 117 decision bridgeとR1 mandatory choice

**Files:**
- Create: `docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py`
- Create: `docs/card-game/tools/proxy_normal_decision_seeded_restart.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_fallback_contract.py`
- Modify: `docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py`

**Interfaces:**
- Consumes: `load_inputs(data_dir: Path = DATA) -> dict[str, dict]`。keysは`source`、`protocol`、`candidate_table`、`hardening`、`first_choice_plan`、`first_choice_audit`、`fallback_contract`。
- Produces: `build_route_skeletons(inputs: dict) -> list[dict]`。4件を`order-01-a-first`、`order-01-b-first`、`order-02-a-first`、`order-02-b-first`順で返す。
- Produces: `normalize_candidate_id(candidate_id: str) -> str`。`candidate-pass`だけを`pass`へ変換し、他は変更しない。
- Produces: `validate_decision_bridge(decision: dict) -> list[str]`。
- Produces: `build_mandatory_choice_decision(route: dict, actor: str, actor_turn_index: int, round_number: int, hand: list[dict]) -> dict`。
- Extends: 116 `validate_seeded_resolution`が`legal_candidate_details`を許可し、proof計算には使わない。

- [ ] **Step 1: bridgeとR1選択の失敗テスト5件を書く**

  次のテストを新規moduleへ追加する。

  ```python
  class SeededRestartTests(unittest.TestCase):
      @classmethod
      def setUpClass(cls):
          cls.inputs = load_inputs()

      def test_route_skeletons_preserve_exact_manifests_and_mirrors(self):
          routes = build_route_skeletons(self.inputs)
          self.assertEqual([row["path_id"] for row in routes], [
              "order-01-a-first", "order-01-b-first",
              "order-02-a-first", "order-02-b-first",
          ])
          for order_id in ("order-01", "order-02"):
              pair = [row for row in routes if row["order_id"] == order_id]
              self.assertEqual(pair[0]["players"], pair[1]["players"])
              for route in pair:
                  self.assertEqual({len(p["deck_order_top_to_bottom"])
                                    for p in route["players"]}, {40})
  ```

  残るテスト名とassertionを次に固定する。

  - `test_route_skeletons_preserve_exact_manifests_and_mirrors`: 上記に加え、115 planの各player manifestと`(card_copy_id, card_id, initial_instance_id)`完全一致をassertする。
  - `test_r1_mandatory_choices_match_four_known_seed_results`: 115 auditの7枚からdecisionを作り、A-023、B-022、A-007、B-034と各card IDをassertする。
  - `test_mirror_labels_do_not_change_seed_proof`: skeletonへ異なる`path_id`／`first_player`／`match_id`を持たせても、同じorder／actor contextと候補ならproof完全一致をassertする。
  - `test_pass_bridge_binds_ids_details_and_114_source`: `candidate-pass` detailがcanonical `pass`へ変換され、`legal_candidates=["pass"]`とdetailのIDが一致することをassertする。
  - `test_bridge_rejects_alias_mix_duplicate_or_unbound_details`: `candidate-pass`混在、duplicate ID、detail欠落、extra detail、selected mismatch、runner-up mismatchをsubTestで各々拒否し、JSON list／dictなどのmalformed IDでも例外を出さないことをassertする。

  既存116 testへ`test_seeded_validator_allows_bound_117_candidate_details`を追加し、正しい`legal_candidate_details`だけを許可する。未知の補助fieldは従来どおり拒否する。

- [ ] **Step 2: REDを確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_normal_decision_seeded_restart.py \
    test_proxy_normal_decision_fallback_contract.py -v
  ```

  Expected: `ModuleNotFoundError: No module named 'proxy_normal_decision_seeded_restart'`。

- [ ] **Step 3: 入力loader、route skeleton、bridgeを最小実装する**

  moduleへ次の定数と変換を追加する。

  ```python
  SCHEMA = "naotocchi.card_game.proxy_normal_decision_seeded_restart.v1"
  PATH_ORDER = (
      "order-01-a-first", "order-01-b-first",
      "order-02-a-first", "order-02-b-first",
  )

  def normalize_candidate_id(candidate_id):
      if not isinstance(candidate_id, str) or not candidate_id:
          raise ValueError("candidate_id must be a non-empty string")
      return "pass" if candidate_id == "candidate-pass" else candidate_id
  ```

  `build_route_skeletons`は115 planのorder別player manifestをdeep copyし、first playerだけをA／Bへ反転する。sourceのidentity集合との完全一致と40枚×2を検査する。

  `validate_decision_bridge`は次を検査する。

  - `legal_candidates`は非空、一意、昇順の文字列配列で`candidate-pass`を含まない。
  - `legal_candidate_details`はlist[dict]で、各`candidate_id`集合がID配列と一致する。
  - `pass` detailは`source_candidate_id="candidate-pass"`、`kind="pass"`、`action_type="pass"`を持つ。
  - selected ID／action、runner-up ID集合／代表actionが結合している。
  - malformed JSON型をerror listとして返す。

- [ ] **Step 4: mandatory choice builderと116補助field許可を実装する**

  ```python
  def build_mandatory_choice_decision(route, actor, actor_turn_index, round_number, hand):
      ids = sorted(card["card_copy_id"] for card in hand)
      context = {
          "contract_version": FALLBACK_VERSION,
          "order_id": route["order_id"],
          "actor": actor,
          "actor_turn_index": actor_turn_index,
          "round": round_number,
          "phase": "egg_exchange_choice",
          "decision_kind": "mandatory_choice",
          "choice_kind": "egg_exchange_bottom",
      }
      proof = build_seed_proof(context, ids)
      return {
          "decision_kind": "mandatory_choice",
          "resolution_mode": "seeded_fallback",
          "strategic_unresolved": True,
          "reason_code": "strategic_unresolved_seeded_fallback",
          "legal_candidates": ids,
          "legal_candidate_details": [
              {"candidate_id": card["card_copy_id"], "kind": "card_copy",
               "card_id": card["card_id"],
               "initial_instance_id": card["initial_instance_id"]}
              for card in sorted(hand, key=lambda row: row["card_copy_id"])
          ],
          "candidate_set_complete": True,
          "candidate_set_evidence": {
              "source_ref": "115.bottom_candidate_copy_ids",
              "state_ref": f"R{round_number}:egg_exchange_choice:{actor}",
              "enumeration_rule": "all card copies in hand after egg draw",
          },
          "seeded_fallback_candidates": ids,
          "seed_context": context,
          "seed_proof": proof,
          "selected_candidate": proof["selected_candidate"],
          "selected_action": next(row for row in hand
                                  if row["card_copy_id"] == proof["selected_candidate"]),
          "runner_up_candidates": [value for value in ids
                                   if value != proof["selected_candidate"]],
      }
  ```

  実装では`runner_up_action`も昇順先頭detailまたは`None`として追加し、116 validatorとbridge validatorの両方へ通す。

- [ ] **Step 5: Task 1をGREENにする**

  Run: Step 2と同じ。

  Expected: 117専用5件＋更新後116全件 PASS。

- [ ] **Step 6: Task 1をコミットする**

  ```bash
  git add docs/card-game/tools/proxy_normal_decision_seeded_restart.py \
    docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py \
    docs/card-game/tools/proxy_normal_decision_fallback_contract.py \
    docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py
  git commit -m "test(card-game): connect checkpoint 117 decision schema"
  ```

### Task 2: R1安全配置、state、経路別stop境界

**Files:**
- Modify: `docs/card-game/tools/proxy_normal_decision_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py`

**Interfaces:**
- Produces: `build_initial_state(route: dict) -> dict`。
- Produces: `build_r1_safe_placement_decision(route: dict, state: dict) -> dict`。
- Produces: `make_stop_artifact(route: dict, state: dict, stop: dict) -> dict`。
- Produces: `validate_stop_artifact(artifact: dict) -> list[str]`。
- Produces: `replay_routes_independently(route_specs: list[dict], inputs: dict) -> list[dict]`。
- Uses: 116 `resolve_safe_free_development(placements, context, legal_candidate_ids)`。

- [ ] **Step 1: state、安全配置、停止分離の失敗テスト5件を書く**

  - `test_initial_state_uses_manifest_top_five_and_unique_instances`: 各playerのhandがtop 5、deckが残35、全80 instance一意、round 0、growth 20、reservations空をassertする。
  - `test_r1_safe_placements_match_four_known_results`: R1 mandatory choice適用後、選択がA-017#1、B-017#1、A-014#1、B-014#1で、resolutionがseeded／seeded／safe／seededとなることをassertする。
  - `test_safe_placement_keeps_complete_legal_set_and_excludes_pass_from_lottery`: 4経路すべての`legal_candidates`に`pass`、stage 1が手札にあればbirth候補を含み、seeded 3経路のlotteryには安全配置だけを含むことをassertする。
  - `test_stop_artifact_is_winnerless_resumable_and_not_completed`: exact schema、winner null、last valid event/hash、pre-state、known candidates、missing scope、reason、source refs、resume condition、count flags falseをassertする。
  - `test_one_route_stop_does_not_cancel_other_routes`: synthetic 4 route specsの1件だけに合法性不明stopを置き、残る3件が次stepまで再生され、結果順と件数4を維持することをassertする。

- [ ] **Step 2: REDを確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_normal_decision_seeded_restart.py -v
  ```

  Expected: `build_initial_state`、`build_r1_safe_placement_decision`、`make_stop_artifact`のImportErrorまたはAttributeError。

- [ ] **Step 3: stateとcandidate detail helperを実装する**

  stateは108の固定transcriptと同じ意味を保ちつつ、114の正本schemaに合わせて`board`を使う。

  ```python
  def build_initial_state(route):
      players = {}
      cards = {}
      for source in route["players"]:
          instances = [row["initial_instance_id"]
                       for row in source["deck_order_top_to_bottom"]]
          for row in source["deck_order_top_to_bottom"]:
              cards[row["initial_instance_id"]] = copy.deepcopy(row)
          players[source["player_id"]] = {
              "time": 0, "growth": 20,
              "hand": instances[:5], "deck": instances[5:], "discard": [],
              "board": {"main": None, "companions": [], "partner": None,
                        "partner_stage": None, "world": None, "prepared": []},
              "reservations": [], "challenge_used": False,
              "person_placed": False, "relationship_progressed": False,
          }
      return {"round": 0, "turn_player": None, "phase": "before_match",
              "players": players, "cards": cards}
  ```

  R1 complete legal setは公開状態と114 candidate tableから次だけを明示列挙する。

  - 空き枠へ置けるhand内companion／partner。
  - 時1以下で置けるhand内stage 1 main。
  - prerequisitesがR1開始状態で満たされるその他card action。
  - canonical `pass`。

  prerequisites未成立のreaction、対象なし、時不足のactionを入れず、その除外根拠を`candidate_set_evidence`へ保存する。

- [ ] **Step 4: safe resolver接続とstop artifactを実装する**

  placement detailから116 exact placement dictを作り、完全合法IDを明示してresolverへ渡す。resolver結果へ`legal_candidate_details`、`selected_action`、`runner_up_action`を結合し、116 validatorと117 bridge validatorの両方へ通す。

  `make_stop_artifact`は次のtop-level exact keysを持つ。

  ```python
  STOP_KEYS = {
      "schema", "checkpoint", "status", "path_id", "order_id", "first_player",
      "actor", "round", "phase", "last_valid_event_seq", "last_valid_state_sha256",
      "pre_decision_state", "known_candidate_ids", "missing_candidate_scope",
      "stop_reason_code", "source_references", "resume_condition", "winner",
      "counts_as_completed_match", "counts_as_independent_balance_sample",
  }
  ```

  statusは`stopped_rules_adjudication`、winnerは`None`、2 count flagはfalseとする。hashまたはinstance不整合をstop reasonとして許可しない。

- [ ] **Step 5: Task 2をGREENにする**

  Run: Step 2と同じ。

  Expected: 117専用10件 PASS。

- [ ] **Step 6: Task 2をコミットする**

  ```bash
  git add docs/card-game/tools/proxy_normal_decision_seeded_restart.py \
    docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py
  git commit -m "feat(card-game): replay checkpoint 117 opening decisions"
  ```

### Task 3: 固定判断planと4経路replay

**Files:**
- Modify: `docs/card-game/tools/proxy_normal_decision_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py`
- Create: `docs/card-game/data/proxy-normal-decision-seeded-restart-plan-117-20260919.json`

**Interfaces:**
- Produces: `validate_restart_plan(plan: dict, inputs: dict) -> list[str]`。
- Produces: `replay_route(route_spec: dict, inputs: dict) -> dict`。completed時はkeys `status`、`record`、`trace`、`metrics`、stopped時はkeys `status`、`stop`、`metrics`だけを返す。
- Produces: `build_seeded_restart_suite(plan: dict, inputs: dict) -> dict`。
- Produces: `validate_seeded_restart_suite(suite: dict, plan: dict, inputs: dict) -> list[str]`。
- Reuses: `canonical_sha256`、`validate_record`、Task 1／2 interfaces、114 `validate_pre_decision_state`／`validate_public_information`。

- [ ] **Step 1: replayとoutcome境界の失敗テスト6件を書く**

  - `test_replay_links_each_decision_to_one_event_and_contiguous_snapshots`: decisionのevent seq、event before／after hash、snapshot seqとhashを全経路でassertする。
  - `test_real_batch_contains_exact_four_independent_terminal_outcomes`: path IDsがexact 4、各結果がcompleted xor stopped、合計4をassertする。
  - `test_completed_and_stop_artifacts_are_mutually_exclusive`: completedにはrecord／traceがありstopなし、stoppedにはstopがありrecord／trace／winnerなしをassertする。
  - `test_decisions_use_only_owner_known_and_public_information`: 107／114 whitelist、opponent hand／deck order／future fields不在を全decisionでassertする。
  - `test_invalid_selected_action_hash_or_instance_is_validator_error_not_stop`: plan selected ID改変、event hash改変、別copy instance参照を個別に行い、suite validatorがerrorを返しstop countを増やさないことをassertする。
  - `test_seeded_and_strategic_counts_force_independent_balance_zero`: mandatory choicesを含む全実対戦経路でseeded countが正、independent sample 0、除外理由をassertする。

- [ ] **Step 2: REDを確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_normal_decision_seeded_restart.py -v
  ```

  Expected: restart plan不在、または`replay_route`／suite builder未定義でFAIL。

- [ ] **Step 3: plan schemaとreplay primitiveを実装する**

  plan top-levelを次へ固定する。

  ```python
  {
      "schema": "naotocchi.card_game.proxy_normal_decision_seeded_restart_plan.v1",
      "checkpoint": 117,
      "source_files": {
          "source_fixture": "proxy-fixtures-107/fixture-107-normal-decision-a-first.json",
          "protocol": "proxy-decision-protocol-107-20260918.json",
          "candidate_table": "proxy-normal-decision-candidate-table-114-20260918.json",
          "hardening": "proxy-normal-decision-hardening-114-20260918.json",
          "first_choice_plan": "proxy-normal-decision-first-choice-plan-115-20260918.json",
          "first_choice_audit": "proxy-normal-decision-first-choice-audit-115-20260918.json",
          "fallback_contract": "proxy-normal-decision-fallback-contract-116-20260918.json",
      },
      "route_order": list(PATH_ORDER),
      "routes": [build_route_spec(path_id) for path_id in PATH_ORDER],
      "scope": {"planned_route_count": 4,
                "independent_balance_sample_count": 0,
                "automated_game_engine": False,
                "complete_legality_engine": False,
                "changes_card_text_numbers_or_registration": False},
  }
  ```

  各stepはexact keys `step_id`、`decision_kind`、`round`、`actor`、`phase`、`choice_kind`、`pre_state_sha256`、`legal_candidates`、`legal_candidate_details`、`resolution_mode`、`selected_candidate`、`runner_up_candidates`、`reason_code`、`payment`、`targets`、`chain`、`public_information`、`resolution_evidence`を持つ。stop terminalはTask 2 stop fields、completed terminalはR10または早期勝利の期待値を持つ。

  replay primitiveはplan stepを順に読み、次を行う。

  1. pre-state hash一致を確認する。
  2. bridge、116 seeded decision、114 pre-state／public infoを検査する。
  3. selected actionの支払い、対象、領域移動、予約、instance transitionを固定handlerで適用する。
  4. eventとsnapshotを1回だけ追加する。
  5. terminalまで進めるか、正当なstop directiveをstop artifactへ変換する。

  plan未定義actionへ推測handlerを足さない。正本から効果と合法性を一意に確認できるactionだけ、action type別の小さいfixed handlerとして追加する。

- [ ] **Step 4: 4実経路をplanへ順次記録する**

  各経路を初期状態から別々に進める。まずTask 1のR1 mandatory choice、次にTask 2のR1安全配置を記録する。その後は各通常行動機会で次を繰り返す。

  1. 114 table、01／02／06、該当カード本文を開き、その時点の合法候補を全列挙する。
  2. `pass`と全候補detailをplan stepへ書く。
  3. 107／114の優先順位で一意ならpriority証拠を保存する。
  4. safe-free対象なら116 resolver結果を保存する。
  5. 完全列挙できるが戦略的に一意でなければ116 seed proofを保存する。
  6. 合法性、完全性、stable ID、情報境界のどれかを満たせなければ、その経路だけstop terminalにして次経路へ進む。
  7. R10または早期勝利まで進めた経路だけcompleted terminalにする。

  replayが`plan exhausted at <path>/<round>/<actor>/<phase>`を返したら、その直前stateを確認して次stepを追加する。この診断は成果物のlegitimate stopとして保存しない。正本上の不足を特定した場合だけstop directiveを追加する。

- [ ] **Step 5: planとsuiteを自己検査する**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_decision_seeded_restart.py \
    --plan docs/card-game/data/proxy-normal-decision-seeded-restart-plan-117-20260919.json
  ```

  Expected: `valid: true`、`planned_route_count: 4`、`completed_route_count + stopped_route_count: 4`。各経路の実際の内訳はCLI出力と後続evaluationへ固定し、推測で先に決めない。

- [ ] **Step 6: Task 3をGREENにする**

  Run: Step 2と同じ。

  Expected: 117専用16件 PASS。

- [ ] **Step 7: Task 3をコミットする**

  ```bash
  git add docs/card-game/tools/proxy_normal_decision_seeded_restart.py \
    docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py \
    docs/card-game/data/proxy-normal-decision-seeded-restart-plan-117-20260919.json
  git commit -m "feat(card-game): replay checkpoint 117 decision routes"
  ```

### Task 4: canonical成果物、評価、正本文書、総合検査

**Files:**
- Modify: `docs/card-game/tools/proxy_normal_decision_seeded_restart.py`
- Modify: `docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py`
- Create: `docs/card-game/data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json`
- Create conditionally: `docs/card-game/data/proxy-matches-117/*.json`
- Create conditionally: `docs/card-game/data/proxy-decision-traces-117/*.json`
- Create conditionally: `docs/card-game/data/proxy-normal-decision-stops-117/*.json`
- Create: `docs/card-game/117-normal-decision-seeded-restart.md`
- Modify: `docs/card-game/README.md`
- Modify: `docs/card-game/tools/check-design-data.py`

**Interfaces:**
- Produces: `build_evaluation(suite: dict) -> dict`。
- Produces: `write_seeded_restart_suite(suite: dict, output_root: Path) -> None`。
- Produces: `validate_materialized_suite(suite: dict, output_root: Path) -> list[str]`。
- CLI: `python3 docs/card-game/tools/proxy_normal_decision_seeded_restart.py [--write] [--plan PATH] [--data-dir PATH]`。

- [ ] **Step 1: 保存・評価・境界の失敗テスト4件を書く**

  - `test_evaluation_matches_route_artifacts_and_excludes_balance`: completed／stopped、candidate、action、unused time、7種類使用、予約、再登場、growth、unresolved、strategic、seededをartifactから再集計して完全一致、independent sample 0をassertする。
  - `test_materialized_outputs_equal_builder_and_exact_manifest`: temporary directoryへwriteし、期待file manifest、全JSON、builder完全一致をassertする。
  - `test_materialized_validator_rejects_missing_extra_and_swapped_artifacts`: record欠落、余分stop、completedをstop directoryへ移動、winner付きstopを個別に拒否する。
  - `test_population_and_checkpoint_112_boundaries_remain_unchanged`: 112 fixture 6件がfixture／events空／winner null、現行452、登録477、変更0 IDをassertする。

- [ ] **Step 2: REDを確認する**

  Run:

  ```bash
  cd docs/card-game/tools
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    test_proxy_normal_decision_seeded_restart.py -v
  ```

  Expected: evaluation／write／materialized validator未定義、canonical JSON不在、または117文書不在でFAIL。

- [ ] **Step 3: evaluation、write、exact manifest validatorを実装する**

  evaluationは次を持つ。

  ```python
  {
      "schema": "naotocchi.card_game.proxy_normal_decision_seeded_restart_evaluation.v1",
      "checkpoint": 117,
      "planned_route_count": 4,
      "completed_route_count": completed,
      "stopped_route_count": stopped,
      "expected_files": {
          "completed_records": sorted(record_names),
          "decision_traces": sorted(trace_names),
          "stop_artifacts": sorted(stop_names),
      },
      "strategic_unresolved_count": strategic,
      "seeded_fallback_count": seeded,
      "independent_balance_sample_count": 0,
      "routes": route_metrics,
      "limits": [
          "seeded or strategically unresolved routes are not independent balance samples",
          "do not infer win rate, seat advantage, activation rate, card strength, or adoption",
      ],
  }
  ```

  writerは条件付きdirectoryを作り、該当artifactだけをcanonical indent 2＋末尾newlineで保存する。validatorは期待directoryのファイル名集合と内容を完全一致で検査し、前回runのstale fileも拒否する。`--write`前に既存directoryへ余分なJSONがある場合は黙って削除せずerrorで停止する。

- [ ] **Step 4: canonical成果物を生成して専用テストをGREENにする**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_decision_seeded_restart.py --write
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
    docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py -v
  ```

  Expected: CLI `valid: true`、117専用20件 PASS。実際のcompleted／stopped内訳、event／snapshot／decision数を記録する。

- [ ] **Step 5: 総合検査へ117要件を先に追加してREDを確認する**

  `check-design-data.py`へ次を追加する。

  - 117 spec／plan／numbered doc／tool／test／plan JSON／evaluation JSONの存在。
  - CLI成功とcanonical再生成一致。
  - expected file manifestとconditional directories。
  - exact 4 route、completed＋stopped=4、stop isolation。
  - R1 known bottom 4件、安全配置4件、pass normalization。
  - strategic／seeded集計、independent balance 0。
  - 112／452／477／変更0。
  - 専用test数20。

  Run: `PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py`

  Expected: `117-normal-decision-seeded-restart.md`またはREADMEの117 entryがないため117 missing errorでFAIL。

- [ ] **Step 6: numbered docとREADMEを書いてcheckerをGREENにする**

  `117-normal-decision-seeded-restart.md`へ次を記録する。

  - 4経路の入力、R1 mandatory choiceと安全配置のexact結果。
  - completed／stoppedの実数と各終端理由。
  - 各completedのwinner、event、snapshot、decision、seeded／strategic count。
  - 各stopのround、actor、phase、不足範囲、再開条件。
  - 評価集計、独立balance標本0、勝率等へ数えない境界。
  - RED→GREENの実測test数。
  - 112未変更、452／477／変更0 ID。
  - 次checkpointは117結果を評価してから決め、先に112へ進まない。

  README冒頭の現在地、一覧表へ117を追加し、末尾進捗を117の実結果へ更新する。completedでない経路を勝敗数や発動0へ数えない。

  Run: `PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py`

  Expected: `errors: []`。

- [ ] **Step 7: Task 4の全gateを実行する**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p test_proxy_normal_decision_seeded_restart.py -v
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p 'test_proxy_*.py' -v
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_decision_seeded_restart.py
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py
  git diff --check
  ```

  Expected: 専用20件 PASS、全proxyはbaseline 164＋117追加分と116追加1件の合計、CLI `valid: true`、checker `errors: []`、diff clean。実際の全proxy件数を117文書とREADMEへ記載する。

- [ ] **Step 8: Task 4をコミットする**

  ```bash
  git add docs/card-game/117-normal-decision-seeded-restart.md \
    docs/card-game/README.md docs/card-game/data \
    docs/card-game/tools/check-design-data.py \
    docs/card-game/tools/proxy_normal_decision_seeded_restart.py \
    docs/card-game/tools/test_proxy_normal_decision_seeded_restart.py
  git commit -m "docs(card-game): save checkpoint 117 seeded restart"
  ```

### Task 5: 独立review、最終検証、Draft PR保存

**Files:**
- Review only: checkpoint 117で変更した全tracked file。
- Modify only if review finds an in-scope defect; fixは元Task担当へ戻してTDDで行う。
- Remote update: existing `design/card-pool-master-20260914` and Draft PR #259 only。

**Interfaces:**
- Consumes: Task 1〜4のcommitsとspec。
- Produces: reviewed local HEAD/tree、remote HEAD/tree、同期したPR本文、CI確認結果。

- [ ] **Step 1: task reviewとwhole-branch reviewを行う**

  各Taskをspec compliance→code qualityの順にreviewする。最後に116保存HEADから117最終HEADまでを通しで確認する。特にReview Focus 5件、4経路の独立性、completed／stop／error境界、非公開情報、conditional file manifest、母集団境界を見る。

  Important以上の指摘は元Task担当へ戻し、失敗テスト→最小修正→focused GREEN→再reviewを1回ずつ行う。既存の正しいtestを削って予定件数へ合わせない。追加された有効test数は文書とcheckerへ同期する。

- [ ] **Step 2: 保存候補treeでfresh gateを実行する**

  Run:

  ```bash
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p test_proxy_normal_decision_seeded_restart.py -v
  PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
    -s docs/card-game/tools -p 'test_proxy_*.py' -v
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_decision_seeded_restart.py
  PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py
  npm test
  git diff --check
  git status --short
  git rev-parse HEAD
  git rev-parse HEAD^{tree}
  ```

  Expected: 全command exit 0、worktree clean。`npm test`の実pass件数、専用／proxy件数、HEAD、treeを報告へ記録する。

- [ ] **Step 3: remoteの競合がないことを確認して既存branchへ保存する**

  ```bash
  git fetch origin main design/card-pool-master-20260914
  git rev-parse origin/main
  git rev-parse origin/design/card-pool-master-20260914
  git log --oneline --left-right \
    origin/design/card-pool-master-20260914...HEAD
  git push origin HEAD:design/card-pool-master-20260914
  ```

  push前のremote headが開始時`8e7791446f7b9d5b68e39b4f88be13785319841e`から予期せず進んでいた場合は止め、force pushしない。HTTPS認証が使えない環境では、親agentがauthorized GitHub connectorでexact local treeをremote current headへfast-forward commitとして保存し、tree一致を確認する。

- [ ] **Step 4: PR #259本文と状態を同期する**

  PR本文の最新保存地点を117へ更新し、次を明記する。

  - remote HEAD／treeと117正本リンク。
  - 4経路のcompleted／stopped実数と終端概要。
  - mandatory choice／safe placement／pass bridge。
  - seed使用経路の独立balance標本0。
  - test、CLI、checker結果。
  - 452／477／カード変更0、112未変更。
  - 次の再開地点。

  PRがDraft=true、state=open、merged=falseであることを更新後に再取得して確認する。mainへマージしない。

- [ ] **Step 5: CIと最終状態を確認する**

  新remote HEADのRuntime smoke workflow runとcommit statusを複数回の短いbounded確認で取得する。新runがあれば完了まで確認し、run ID／status／conclusionを記録する。runが発生しなければ旧runを新HEAD成功として扱わず、`new-head workflow run/status: 0`を明記する。

  最後にlocal主branch、remote branch、PR headのHEAD/tree、変更ファイル、検査結果、PR Draft/open/unmerged、最新mainを確認し、117で区切る。作業worktreeはPR feedback用に保持する。
