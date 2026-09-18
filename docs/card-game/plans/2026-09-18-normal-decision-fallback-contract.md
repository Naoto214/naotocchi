# Normal Decision Fallback Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** たまご交換などの必須複数選択と安全な時0人物配置を、戦略的未解決を隠さず再現可能に処理するcheckpoint 116のfallback契約を保存する。

**Architecture:** Python標準ライブラリだけの独立builder／validatorに、判断単位のSHA-256選択器と安全な無料盤面化判定を置く。builderは両規則、停止条件、評価除外、成果物0をmachine-readable contractへ固定し、総合検査からcanonical再生成一致を確認する。116では対戦データを生成せず、117がこの公開interfaceを利用する。

**Tech Stack:** Python 3.12標準ライブラリ（`hashlib`、`json`、`pathlib`、`argparse`）、JSON、`unittest`。

**Spec:** `docs/card-game/plans/2026-09-18-normal-decision-fallback-contract-design.md`

## Global Constraints

- 116はprotocol checkpointであり、115の4経路を再開しない。
- 新規fixture、completed match、decision trace、event、snapshot、winner、独立balance標本はすべて0とする。
- 112の未実施fixture 6件と115の停止監査を変更しない。
- 現行カタログ452、登録履歴477、カード本文・数値・登録区分を変更しない。
- 相手の非公開情報、将来知識、任意のカード強度点を判断へ使わない。
- 対戦エンジン、カード効果自動解決、カードプール全体の完全自動合法性判定を作らない。
- seed材料は契約version、order ID、actor、actor turn index、round、phase、decision kind、choice kind、昇順candidate ID配列の9要素だけとする。
- seed serializationは`json.dumps(value, ensure_ascii=False, separators=(",", ":"))`、digestはSHA-256、indexはbig-endian digest整数の候補数剰余とする。
- seed抽選を含む将来のcompleted replayは、勝率、先後差、発動率、カード強度、独立balance標本へ数えない。

---

### Task 1: 判断単位SHA-256 selectorとseed証跡validator

**Files:**
- Create: `docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py`
- Create: `docs/card-game/tools/proxy_normal_decision_fallback_contract.py`

**Interfaces:**
- Consumes: `context: dict`。exact keysは`contract_version`、`order_id`、`actor`、`actor_turn_index`、`round`、`phase`、`decision_kind`、`choice_kind`。
- Produces: `canonical_candidate_ids(candidate_ids: list[str]) -> list[str]`。
- Produces: `build_seed_proof(context: dict, candidate_ids: list[str]) -> dict`。
- Produces: `validate_seeded_resolution(decision: dict) -> list[str]`。

- [ ] **Step 1: selectorの失敗テスト5件を書く**

  test moduleへ次のfixture helperとテストを追加する。

  ```python
  def seed_context():
      return {
          "contract_version": "naotocchi.card_game.proxy_normal_decision_fallback.v1",
          "order_id": "order-01",
          "actor": "A",
          "actor_turn_index": 1,
          "round": 1,
          "phase": "egg_exchange_choice",
          "decision_kind": "mandatory_choice",
          "choice_kind": "egg_exchange_bottom",
      }

  def seeded_decision():
      candidates = ["A-M-antlion-02-01", "A-P-cat_ceo-01", "A-G-air-hockey-01"]
      proof = build_seed_proof(seed_context(), candidates)
      return {
          "decision_kind": "mandatory_choice",
          "resolution_mode": "seeded_fallback",
          "strategic_unresolved": True,
          "reason_code": "strategic_unresolved_seeded_fallback",
          "legal_candidates": sorted(candidates),
          "candidate_set_complete": True,
          "candidate_set_evidence": {
              "source_ref": "115:path:order-01-a-first",
              "state_ref": "R1:egg_exchange_choice:A",
              "enumeration_rule": "all_card_copy_ids_in_hand_after_egg_draw",
          },
          "seed_context": seed_context(),
          "seed_proof": proof,
          "selected_candidate": proof["selected_candidate"],
      }
  ```

  追加するテスト名とassertionは次で固定する。

  - `test_seed_proof_uses_sorted_candidates_and_exact_sha256_modulo`: candidate順を逆にしてもproof完全一致、serializationを独立再計算したSHA-256、`int(digest, 16) % 3`、selected candidateをassertする。
  - `test_mirror_labels_are_not_seed_context`: `path_id`、`fixture_id`、`match_id`、`first_player`をcontextへ加えるとvalidatorが未知keyとして拒否し、これらを除いた同一contextではproofが同じことをassertする。
  - `test_unrelated_choice_does_not_shift_later_choice`: 同じcontextのproofを作る間に別contextの`build_seed_proof`を呼んでも、前後のproofが完全一致することをassertする。
  - `test_seeded_resolution_rejects_missing_or_tampered_proof`: `sha256`削除、digest改変、selected index改変、selected candidate改変をsubTestで各々拒否する。
  - `test_seeded_resolution_rejects_unsorted_duplicate_or_incomplete_candidates`: 未整列、重複、`candidate_set_complete=False`、evidence欠落、`strategic_unresolved=False`、reason code改変をsubTestで各々拒否する。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Expected: `ModuleNotFoundError: No module named 'proxy_normal_decision_fallback_contract'`。

- [ ] **Step 3: 最小selectorを実装する**

  moduleへ次の定数と中核処理を追加する。

  ```python
  CONTRACT_VERSION = "naotocchi.card_game.proxy_normal_decision_fallback.v1"
  SEED_CONTEXT_KEYS = (
      "contract_version", "order_id", "actor", "actor_turn_index", "round",
      "phase", "decision_kind", "choice_kind",
  )

  def canonical_candidate_ids(candidate_ids):
      if not isinstance(candidate_ids, list) or not candidate_ids:
          raise ValueError("candidate IDs must be a non-empty list")
      if any(not isinstance(value, str) or not value for value in candidate_ids):
          raise ValueError("candidate IDs must be non-empty strings")
      if len(set(candidate_ids)) != len(candidate_ids):
          raise ValueError("candidate IDs must be unique")
      return sorted(candidate_ids)

  def build_seed_proof(context, candidate_ids):
      if set(context) != set(SEED_CONTEXT_KEYS):
          raise ValueError("seed context keys differ")
      if context["contract_version"] != CONTRACT_VERSION:
          raise ValueError("fallback contract version differs")
      ordered = canonical_candidate_ids(candidate_ids)
      material = [context[key] for key in SEED_CONTEXT_KEYS] + [ordered]
      serialized = json.dumps(
          material, ensure_ascii=False, separators=(",", ":")
      )
      digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
      selected_index = int(digest, 16) % len(ordered)
      return {
          "algorithm": "sha256_modulo",
          "seed_material": material,
          "canonical_serialization": serialized,
          "sha256": digest,
          "canonical_candidate_ids": ordered,
          "candidate_count": len(ordered),
          "selected_index": selected_index,
          "selected_candidate": ordered[selected_index],
      }
  ```

  `validate_seeded_resolution`は必要なtop-level判断項目の存在、`mandatory_choice`または`normal_action`、`seeded_fallback`、`strategic_unresolved is True`、固定reason code、候補完全集合flag、evidenceのexact 3 keysを検査し、`build_seed_proof`の再計算結果との完全一致を要求する。107・114の判断前状態、公開情報、支払い、対象、連鎖などの既存top-level項目は併記を許可する。例外はerror文字列へ変換し、最初のerrorで処理を打ち切らない。

- [ ] **Step 4: Task 1をGREENにする**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Expected: 5 tests PASS。

- [ ] **Step 5: Task 1をコミットする**

  ```bash
  git add docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py docs/card-game/tools/proxy_normal_decision_fallback_contract.py
  git commit -m "test(card-game): define seeded decision fallback"
  ```

### Task 2: 安全な時0人物配置とpass比較

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_fallback_contract.py`

**Interfaces:**
- Consumes: placement dictのexact keys `candidate_id`、`card_copy_id`、`person_type`、`slot_empty`、`actual_time_cost`、`replacement_required`、`additional_card_consumption`、`certain_downside`、`legality`、`unresolved_required_choice`。
- Produces: `validate_safe_free_placement(placement: dict) -> list[str]`。
- Produces: `resolve_safe_free_development(placements: list[dict], context: dict) -> dict`。
- Uses: Task 1の`build_seed_proof(context, candidate_ids)`。

- [ ] **Step 1: 安全な無料盤面化の失敗テスト4件を書く**

  次のhelperを追加する。

  ```python
  def safe_placement(candidate_id="place:A-P-cat_ceo-01"):
      return {
          "candidate_id": candidate_id,
          "card_copy_id": candidate_id.split(":", 1)[1],
          "person_type": "partner",
          "slot_empty": True,
          "actual_time_cost": 0,
          "replacement_required": False,
          "additional_card_consumption": 0,
          "certain_downside": False,
          "legality": "confirmed",
          "unresolved_required_choice": False,
      }

  def placement_context():
      context = seed_context()
      context.update({
          "phase": "normal_action",
          "decision_kind": "normal_action",
          "choice_kind": "zero_cost_person_placement",
      })
      return context
  ```

  - `test_single_safe_free_placement_dominates_pass`: 1候補が`resolution_mode="safe_free_development"`、`strategic_unresolved=False`、selected candidateが配置、`pass_dominated=True`になることをassertする。
  - `test_safe_free_placement_rejects_each_excluded_condition`: `slot_empty=False`、時1、replacement true、追加消費1、certain downside true、legality unknown、unresolved choice true、person type mainを個別に拒否する。
  - `test_multiple_safe_placements_use_seeded_fallback`: `placement_context()`と2候補を使い、`resolution_mode="seeded_fallback"`、`strategic_unresolved=True`、固定reason code、`pass_dominated_by="safe_free_development"`、再計算可能なseed proofをassertする。
  - `test_placed_person_is_zone_transfer_not_consumption`: 成功結果が`placement_card_zone_transfer_counts_as_consumption=False`と`additional_card_consumption=0`を保持することをassertする。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Expected: `validate_safe_free_placement`または`resolve_safe_free_development`のImportErrorでFAIL。

- [ ] **Step 3: 最小の安全条件判定を実装する**

  ```python
  SAFE_PERSON_TYPES = {"companion", "partner"}

  def validate_safe_free_placement(placement):
      errors = []
      if placement.get("person_type") not in SAFE_PERSON_TYPES:
          errors.append("safe free placement must be companion or partner")
      if placement.get("slot_empty") is not True:
          errors.append("safe free placement requires an empty slot")
      if placement.get("actual_time_cost") != 0:
          errors.append("safe free placement requires actual time cost zero")
      if placement.get("replacement_required") is not False:
          errors.append("safe free placement cannot replace a person")
      if placement.get("additional_card_consumption") != 0:
          errors.append("safe free placement cannot consume another card")
      if placement.get("certain_downside") is not False:
          errors.append("safe free placement cannot have a certain downside")
      if placement.get("legality") != "confirmed":
          errors.append("safe free placement legality must be confirmed")
      if placement.get("unresolved_required_choice") is not False:
          errors.append("safe free placement cannot leave a required choice unresolved")
      return errors
  ```

  exact key検査とcandidate／copy IDの非空・一意性も追加する。`resolve_safe_free_development`は0件または不正候補を自動選択せずerrorを返す。1件ならsafe mode、複数なら全candidate IDをTask 1 selectorへ渡してseeded modeを返す。いずれも追加消費0と、配置カード自体は手札→盤面の領域移動であることを結果へ保存する。

- [ ] **Step 4: Task 2をGREENにする**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Expected: 12 tests PASS（Task 1 reviewの2件とTask 2 reviewのbool回帰1件を含む）。

- [ ] **Step 5: Task 2をコミットする**

  ```bash
  git add docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py docs/card-game/tools/proxy_normal_decision_fallback_contract.py
  git commit -m "feat(card-game): define safe free development fallback"
  ```

### Task 3: machine-readable contract、境界、canonical保存

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_fallback_contract.py`
- Create: `docs/card-game/data/proxy-normal-decision-fallback-contract-116-20260918.json`

**Interfaces:**
- Produces: `build_fallback_contract() -> dict`。
- Produces: `validate_fallback_contract(contract: dict) -> list[str]`。
- Produces: `load_json(path: Path) -> dict`、`write_json(value: dict, output_path: Path) -> None`、`validate_materialized(value: dict, output_path: Path) -> list[str]`。
- CLI: `python3 proxy_normal_decision_fallback_contract.py [--write] [--output PATH]`。

- [ ] **Step 1: contractと保存境界の失敗テスト5件を書く**

  - `test_contract_fixes_decision_kinds_modes_and_seed_algorithm`: checkpoint 116、schema v1、2 decision kinds、3 resolution modes、必須記録項目、9 seed fields、SHA-256 modulo、固定reason codeをassertする。
  - `test_contract_fixes_continue_and_stop_conditions`: 完全候補、stable ID、許可情報、継続可能、整合性をcontinue条件に持ち、不完全候補、非公開情報依存、識別子不足、合法性不明、整合性・hash破損をstop条件に持つことをassertする。
  - `test_contract_preserves_zero_artifact_and_population_boundaries`: fixture、completed、trace、event、snapshot、winner、independent sampleが0、112 fixture 6未実施、現行452、登録477、変更ID 0をassertする。
  - `test_seeded_matches_are_excluded_from_balance_evidence`: `strategic_unresolved_count`と`seeded_fallback_count`を必須集計とし、いずれか正なら独立balance、勝率、先後差、発動率、カード強度へ使用不可であることをassertする。該当flagを反転したcontractをvalidatorが拒否する。
  - `test_saved_contract_equals_builder_output`: canonical JSONとbuilder完全一致、一時pathへのwrite→read一致をassertする。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Expected: contract builder／validator／保存関数のImportErrorまたはcanonical JSON不在でFAIL。

- [ ] **Step 3: contract builder／validator／CLIを実装する**

  `build_fallback_contract`は次のtop-levelを返す。

  ```python
  {
      "schema": CONTRACT_VERSION,
      "checkpoint": 116,
      "status": "protocol_only_no_match_artifacts",
      "decision_contract": {
          "decision_kinds": ["normal_action", "mandatory_choice"],
          "resolution_modes": [
              "priority_unique", "safe_free_development", "seeded_fallback"
          ],
          "required_record_fields": [
              "decision_kind", "resolution_mode", "strategic_unresolved",
              "legal_candidates", "selected_candidate", "runner_up_candidates",
              "reason_code",
          ],
          "seeded_fallback_reason_code": "strategic_unresolved_seeded_fallback",
      },
      "seeded_fallback": seed_contract,
      "safe_free_development": safe_contract,
      "continuation_conditions": continuation_conditions,
      "stop_conditions": stop_conditions,
      "evaluation": evaluation_contract,
      "scope": {
          "fixture_count": 0,
          "completed_match_count": 0,
          "decision_trace_count": 0,
          "event_count": 0,
          "snapshot_count": 0,
          "winner_count": 0,
          "independent_balance_sample_count": 0,
      },
      "checkpoint_112": {
          "targeted_fixture_count": 6,
          "completed_in_116": 0,
          "status": "unchanged_unplayed",
      },
      "checkpoint_115": {
          "audited_path_count": 4,
          "resumed_in_116": 0,
          "status": "unchanged_stopped",
      },
      "population": {
          "current_catalog": 452,
          "registered_candidates": 477,
          "changed_card_text_numeric_or_registration_ids": 0,
      },
      "next_checkpoint": 117,
  }
  ```

  各contract部分はdesign specのliteral field名・条件を持つ定数から構築する。validatorはcanonical builderとの完全一致に加え、schema、mode、seed規則、評価除外、全scope 0、112・115・母集団境界を個別errorにする。JSONは`ensure_ascii=False`、indent 2、末尾改行で保存する。通常CLIは保存済みcanonicalとの一致を検査し、`--write`時だけ上書きする。

- [ ] **Step 4: canonical JSONを書き出してTask 3をGREENにする**

  Run: `cd docs/card-game/tools && python3 proxy_normal_decision_fallback_contract.py --write`

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Expected: 20 tests PASS、CLI出力の`valid`がtrue、contract JSONがbuilderと一致する。

- [ ] **Step 5: Task 3をコミットする**

  ```bash
  git add docs/card-game/tools/test_proxy_normal_decision_fallback_contract.py docs/card-game/tools/proxy_normal_decision_fallback_contract.py docs/card-game/data/proxy-normal-decision-fallback-contract-116-20260918.json
  git commit -m "docs(card-game): materialize decision fallback contract"
  ```

### Task 4: 116正本、総合検査、README接続

**Files:**
- Create: `docs/card-game/116-normal-decision-fallback-contract.md`
- Modify: `docs/card-game/tools/check-design-data.py`
- Modify: `docs/card-game/README.md`

**Interfaces:**
- Consumes: Task 1〜3のtool、20 tests、canonical contract。
- Produces: 116の番号付き正本、全体検査への恒久接続、117の再開地点。

- [ ] **Step 1: 総合検査の失敗条件を先に追加する**

  115 block直後へ、116の正本、contract、tool、testの存在checkを追加する。存在時はJSONとASTを読み、次を個別checkにする。

  ```python
  check(contract_116.get("checkpoint") == 116 and
        contract_116.get("status") == "protocol_only_no_match_artifacts",
        "116 fallback contract identity")
  check(contract_116.get("scope") == {
      "fixture_count": 0,
      "completed_match_count": 0,
      "decision_trace_count": 0,
      "event_count": 0,
      "snapshot_count": 0,
      "winner_count": 0,
      "independent_balance_sample_count": 0,
  }, "116 zero match artifacts")
  check(proxy_116_test_count == 20,
        "116 normal-decision fallback test count")
  ```

  さらにpublic functions集合、3 resolution modes、9 seed fields、SHA-256 modulo、6安全条件、seeded対戦のbalance除外、112の6件、115の4停止経路、452／477／変更0、validator CLI return code 0を検査する。正本には「seed抽選」「安全な無料盤面化」「対戦成果物はすべて0」「カード本文・数値・登録区分の変更は0件」「117」を必須文言として要求する。

- [ ] **Step 2: REDを確認する**

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Expected: 116正本文書とREADMEの116現在地が未存在のためerrorを返す。

- [ ] **Step 3: 116正本とREADMEを追加する**

  116正本へ、目的、判断種別、3 mode、seed材料9要素とSHA-256 modulo、安全条件6件、継続／停止条件、記録schema、評価除外、RED→GREEN 20件、成果物0、母集団不変、117再開を記録する。READMEの冒頭現在地、一覧表、継続手順を115から116へ更新し、117では同じsource・seed・40枚manifestから4経路を最初から再生するが、seed使用対戦は独立balance標本0とする。

- [ ] **Step 4: 専用・回帰・総合検査をGREENにする**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Run: `python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_*.py' -v`

  Run: `python3 docs/card-game/tools/proxy_normal_decision_fallback_contract.py`

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Run: `git diff --check`

  Expected: 専用20件と全proxy回帰がPASS、CLI valid true、総合検査error 0、diff check出力なし。

- [ ] **Step 5: Task 4をコミットする**

  ```bash
  git add docs/card-game/116-normal-decision-fallback-contract.md docs/card-game/README.md docs/card-game/tools/check-design-data.py
  git commit -m "docs(card-game): connect checkpoint 116 validation"
  ```

### Task 5: 最終検証、remote保存、Draft PR同期、CI確認

**Files:**
- Modify: Draft PR #259 body through GitHub CLI/API only。

**Interfaces:**
- Produces: checkpoint 116をremote作業branchへ保存し、PR #259をDraft・open・未マージで維持する。

- [ ] **Step 1: 差分と境界をfresh確認する**

  Run: `git status --short --branch`

  Run: `git diff origin/design/card-pool-master-20260914...HEAD --stat`

  Run: `git diff origin/design/card-pool-master-20260914...HEAD --name-only`

  Run: `git diff --check origin/design/card-pool-master-20260914...HEAD`

  変更対象が116のdesign／implementation plan、正本、contract、tool、test、README、`check-design-data.py`だけであり、fixture、match、trace、本編、表情、イラスト、別PR差分を含まないことを確認する。

- [ ] **Step 2: 全検査をfresh実行する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_fallback_contract.py -v`

  Run: `python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_*.py' -v`

  Run: `python3 docs/card-game/tools/proxy_normal_decision_fallback_contract.py`

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Run: `git diff --check origin/design/card-pool-master-20260914...HEAD`

  Expected: 専用20件と全proxy回帰PASS、canonical一致、総合検査error 0、diff check出力なし。

- [ ] **Step 3: 作業branchへpushしてPR本文を同期する**

  Run: `git push origin design/card-pool-master-20260914`

  PR本文へ、116の2規則、判断単位SHA-256、戦略的未解決の明示、安全な時0人物条件、対戦成果物0、117再開、現行452／登録477／変更0、検査件数を追記する。Draftを解除せず、PRをmergeしない。

- [ ] **Step 4: remote HEAD／tree、PR状態、CIを確認する**

  local HEADと`refs/heads/design/card-pool-master-20260914`、local treeとGitHub remote commit treeが一致することを確認する。PR #259がDraft=true、state=open、merged=falseであること、最新Runtime smokeがsuccessであること、`git status --short`が空であることを確認して区切る。

- [ ] **Step 5: checkpoint 116の終了報告を作る**

  HEAD、tree、変更ファイル、専用／全proxy／総合検査結果、PR状態、CI run、現行452、登録477、成果物0、カード変更0、次が117の4経路再開であることを報告する。seed抽選を含む将来のcompleted記録を強度標本へ数えない注意を明記する。
