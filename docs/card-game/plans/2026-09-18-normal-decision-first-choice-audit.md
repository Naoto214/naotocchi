# Normal Decision First-Choice Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固定seedで独立初期順2組を再現し、先後鏡像4経路が最初のR1たまご交換選択で停止する事実を、対戦成果物へ数えず機械可読監査として保存する。

**Architecture:** 113のorder seedと107 source fixtureを入力に、Python標準ライブラリだけのbuilder／validatorでA/B各40枚を並べ替える。採用した全40枚順はmachine-readable planへ固定し、application auditは先頭7枚、hash、4経路の停止地点、下流の時0人物対pass evidenceだけを保存する。fixture、completed record、decision trace、winner、独立balance標本は作らない。

**Tech Stack:** Python 3.12標準ライブラリ（`random.Random`、`hashlib`、`json`）、JSON、`unittest`。

**Spec:** `docs/card-game/plans/2026-09-18-normal-decision-first-choice-audit-design.md`

## Global Constraints

- sourceは`data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json`のA/B各40枚・7種類とする。
- order-01はA=50／B=100050、order-02はA=51／B=100051を使う。
- `random.Random(seed).shuffle`を各playerへ1回だけ適用し、card copy ID／card ID／initial instance IDを変更しない。
- 同一orderのA先手／B先手でA/Bの40枚順を変えない。
- 4経路はR1たまご交換の7候補が比較不能なため`egg_exchange_choice_unresolved`で停止する。
- fixture、completed record、decision trace、winner、独立balance標本を作らない。
- 112の未実施fixture 6件、現行452、登録477、カード本文・数値・登録区分を変更しない。
- 対戦エンジン、完全自動合法性判定、任意の手札価値点を追加しない。

---

### Task 1: 固定shuffle manifestとfirst-choice plan

**Files:**
- Create: `docs/card-game/tools/test_proxy_normal_decision_first_choice_audit.py`
- Create: `docs/card-game/tools/proxy_normal_decision_first_choice_audit.py`
- Create: `docs/card-game/data/proxy-normal-decision-first-choice-plan-115-20260918.json`

**Interfaces:**
- Consumes: 113 admission planの`orders`と107 source fixtureの`input.players[*].deck_order_top_to_bottom`。
- Produces: `shuffle_deck(cards: list[dict], seed: int) -> list[dict]`。
- Produces: `build_first_choice_plan(admission_plan: dict, source: dict) -> dict`。
- Produces: `validate_first_choice_plan(plan: dict, admission_plan: dict, source: dict) -> list[str]`。

- [ ] **Step 1: manifestの失敗テストを書く**

  次のliteral先頭7 card IDを期待値としてテストへ書く。

  ```python
  EXPECTED_TOP_SEVEN = {
      ("order-01", "A"): ["G-air-hockey", "P-cat_ceo", "M-beetle-01", "M-antlion-02", "E-first-date", "M-beetle-02", "P-desert_scorpion"],
      ("order-01", "B"): ["C-bat", "M-beetle-02", "E-boss", "C-box", "M-antlion-01", "W-deepsea", "P-cat_ceo"],
      ("order-02", "A"): ["I-bowtie", "M-antlion-07", "E-fateful-transform", "I-sleepboost1", "M-antlion-02", "C-chameleon", "G-basketball-3d"],
      ("order-02", "B"): ["M-beetle-01", "I-poop1", "M-antlion-01", "C-chameleon", "I-bowtie", "P-cat_ceo", "G-basketball-3d"],
  }
  ```

  `test_fixed_seed_shuffle_matches_literal_top_seven`、`test_shuffle_preserves_exact_copy_and_instance_sets`、`test_orders_are_distinct`を追加し、実moduleをimportする。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: `ModuleNotFoundError: No module named 'proxy_normal_decision_first_choice_audit'`。

- [ ] **Step 3: 最小shuffleとplan builderを実装する**

  ```python
  def shuffle_deck(cards, seed):
      shuffled = copy.deepcopy(cards)
      random.Random(seed).shuffle(shuffled)
      return shuffled
  ```

  planはschema、checkpoint 115、source／113 plan参照、`algorithm="random.Random(seed).shuffle"`、`python_runtime_at_materialization="CPython 3.12.14"`、orderごとのseed、A/B各40枚のcard copy ID／card ID／initial instance IDを持つ。validatorはcanonical builderとの完全一致に加え、source集合の欠落・重複・追加、order間同順を個別errorにする。

- [ ] **Step 4: planを書き出してTask 1をGREENにする**

  Run: `cd docs/card-game/tools && python3 proxy_normal_decision_first_choice_audit.py --write-plan`

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: Task 1の3テストがPASSし、planに4組×40枚が保存される。

### Task 2: 4経路のR1停止監査

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_first_choice_audit.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_first_choice_audit.py`
- Create: `docs/card-game/data/proxy-normal-decision-first-choice-audit-115-20260918.json`

**Interfaces:**
- Consumes: Task 1 planと114 hardening contract。
- Produces: `order_sha256(cards: list[dict]) -> str`。UTF-8 JSONのcompact canonical表現をSHA-256化する。
- Produces: `build_first_choice_audit(plan: dict, hardening: dict) -> dict`。
- Produces: `validate_first_choice_audit(audit: dict, plan: dict, hardening: dict) -> list[str]`。
- Produces: `write_json(value: dict, output_path: Path) -> None`、`validate_materialized(value: dict, output_path: Path, label: str) -> list[str]`。

- [ ] **Step 1: 停止地点とfalse completionの失敗テストを書く**

  `test_four_paths_stop_at_r1_egg_exchange`、`test_bottom_candidates_equal_all_seven_cards`、`test_scope_counts_remain_zero`、`test_validator_rejects_false_completion_and_changed_stop_reason`を追加する。各pathは`first_player`、`round=1`、`phase="egg_exchange_choice"`、`actor=first_player`、`reason="egg_exchange_choice_unresolved"`、`hand_before_choice` 7枚、`bottom_candidate_copy_ids` 7件を持つことをassertする。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: audit builder／validator未定義または監査JSON不在でFAIL。

- [ ] **Step 3: 最小audit builder／validatorを実装する**

  各orderにつき`A_first`と`B_first`を作り、同じ40枚manifestからfirst playerの先頭7枚を取得する。auditは`fixture_count`、`completed_match_count`、`trace_count`、`winner_count`、`independent_balance_sample_count`をすべて0とし、`counts_as_match=false`、`counts_as_activation_zero=false`、`counts_as_strength_evidence=false`を持つ。validatorは4経路、停止phase／actor／reason、7候補、114 contract参照、全scope 0をcanonical builderとの完全一致とは別に拒否する。

- [ ] **Step 4: auditを書き出してTask 2をGREENにする**

  Run: `cd docs/card-game/tools && python3 proxy_normal_decision_first_choice_audit.py --write`

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: Task 1〜2の7テストがPASSし、canonical auditが保存される。

### Task 3: downstream時0人物対pass evidence

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_first_choice_audit.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_first_choice_audit.py`
- Regenerate: `docs/card-game/data/proxy-normal-decision-first-choice-audit-115-20260918.json`

**Interfaces:**
- Produces: `zero_cost_people(cards: list[dict]) -> list[dict]`。card ID prefix `C-`／`P-`だけを返す。
- Auditの`downstream_evidence`は各first-player pathの先頭7枚人物、`minimum_remaining_after_one_bottom`、比較結果、対戦結果へ数えない理由を持つ。

- [ ] **Step 1: downstream evidenceの失敗テストを書く**

  `test_three_paths_retain_zero_cost_person_after_one_bottom`、`test_order_two_a_has_only_one_zero_cost_person`を追加する。literal期待値はorder-01 A=`P-cat_ceo/P-desert_scorpion`、order-01 B=`C-bat/C-box/P-cat_ceo`、order-02 B=`C-chameleon/P-cat_ceo`、order-02 A=`C-chameleon`とする。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: `downstream_evidence`または`zero_cost_people`不在でFAIL。

- [ ] **Step 3: evidenceを最小実装する**

  複数人物3経路は`minimum_remaining_after_one_bottom >= 1`、人物配置対passは`hand=worse/board=better/reservations=equal`、114比較結果は`unresolved_canonical_text`と記録する。order-02 Aは0まで減らせるが、先行するたまご選択が未定義であることだけを記録する。仮の山札下カード、行動選択、winnerは作らない。

- [ ] **Step 4: auditを再生成してTask 3をGREENにする**

  Run: `cd docs/card-game/tools && python3 proxy_normal_decision_first_choice_audit.py --write`

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: 全9テストがPASSする。

### Task 3.5: canonical保存一致

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_first_choice_audit.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_first_choice_audit.py`
- Regenerate: `docs/card-game/data/proxy-normal-decision-first-choice-plan-115-20260918.json`
- Regenerate: `docs/card-game/data/proxy-normal-decision-first-choice-audit-115-20260918.json`

**Interfaces:**
- Produces: `write_json(value: dict, output_path: Path) -> None`。
- Produces: `validate_materialized(value: dict, output_path: Path, label: str) -> list[str]`。

- [ ] **Step 1: 保存一致の失敗テストを書く**

  canonical plan／auditとbuilder出力の完全一致、および一時pathへのwrite→read一致を1テストで要求する。

- [ ] **Step 2: REDを確認する**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: write／materialized validation関数未定義のImportErrorでFAIL。

- [ ] **Step 3: 最小保存関数とCLIを実装する**

  JSONは`ensure_ascii=False`、indent 2、末尾改行で保存する。CLIは入力3件からplan／auditを再生成して検査し、`--write`時だけ両方を保存する。通常実行時は既存canonicalとの一致も検査する。

- [ ] **Step 4: canonical JSONを書き出してGREENにする**

  Run: `cd docs/card-game/tools && python3 proxy_normal_decision_first_choice_audit.py --write`

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Expected: 全10テストがPASSする。

### Task 4: 正本・総合検査・README接続

**Files:**
- Create: `docs/card-game/115-normal-decision-first-choice-audit.md`
- Modify: `docs/card-game/tools/check-design-data.py`
- Modify: `docs/card-game/README.md`

**Interfaces:**
- Consumes: Task 1〜3のcanonical plan、audit、validator CLI。
- Produces: 115の正本説明、総合検査への恒久接続、116の再開地点。

- [ ] **Step 1: 総合検査の失敗条件を先に追加する**

  115の5成果物、planの2 order×A/B×40枚、seed、4停止経路、3経路のdownstream blocker、scope全0、112未実施6、現行452、登録477、専用テスト10件、CLI成功、正本文言を要求するcheckを追加する。

- [ ] **Step 2: REDを確認する**

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Expected: 115正本文書またはREADMEの115現在地が未存在でerrorを返す。

- [ ] **Step 3: 正本文書とREADMEを最小更新する**

  115正本へ固定seed、全40枚manifest、4経路の最初の停止、downstream evidence、fixture／completed／trace／winner／標本0、カードプール不変を記録する。READMEは最新を115へ更新し、「4戦実施」を削除して116で非通常選択と時0人物対passを整理する再開地点へ置き換える。

- [ ] **Step 4: 専用・回帰・総合検査をGREENにする**

  Run: `cd docs/card-game/tools && python3 -m unittest test_proxy_normal_decision_first_choice_audit.py -v`

  Run: `python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_*.py' -v`

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Run: `git diff --check`

  Expected: 専用10件と全proxy回帰がPASS、総合検査error 0、diff check出力なし。

### Task 5: 保存・Draft PR同期・CI確認

**Files:**
- Modify: Draft PR #259 body only through GitHub API。

**Interfaces:**
- Produces: 115を作業branchへ保存し、PR #259をDraft・open・未マージで維持する。

- [ ] **Step 1: 差分と境界を再確認する**

  `git status --short`、`git diff --stat`、`git diff --check`、専用テスト、proxy全テスト、総合検査をfresh実行し、本編・表情・別PR差分、fixture／match／trace追加がないことを確認する。

- [ ] **Step 2: 115を1コミットで保存する**

  115成果物、design／implementation plan、README、`check-design-data.py`だけを明示してstageし、`git commit -m "docs(card-game): audit normal decision first choices"`で保存する。設計commit `61b9fca96e1b0826b8baa06dd7540c56c143a2b6`を含むbranchをpushする。

- [ ] **Step 3: PR本文を115へ同期する**

  固定seed、4経路停止、downstream evidence、対戦成果物0、116再開、現行452／登録477不変、検査件数を追記する。PRのDraft・open・未マージを維持する。

- [ ] **Step 4: remote保存とCIを確認する**

  local／remote HEAD、tree、変更ファイル、PR状態、最新Runtime smoke成功、作業ツリーcleanを確認して区切る。
