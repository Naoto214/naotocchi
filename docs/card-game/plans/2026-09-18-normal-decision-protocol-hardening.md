# Normal Decision Protocol Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 113で停止した3 blockerを、対象41 card IDの手動候補表、厳密なnested schema、107順序を守る比較contractで解消する。

**Architecture:** 手動候補表を入力、Python標準ライブラリだけのbuilder／validatorを実行系とし、source fixtureから導いた41 IDとの完全一致を検査する。builderはschema・公開情報whitelist・比較規則・対戦数0をmachine-readable contractへ固定し、比較関数は上位優先、時収支、Pareto停止、完全同点時tie-breakだけを扱う。

**Tech Stack:** Python 3標準ライブラリ、JSON、`unittest`。

**Spec:** `docs/card-game/plans/2026-09-18-normal-decision-protocol-hardening-design.md`

## Global Constraints

- A/B各40枚、7種類、和集合41 card IDを変更しない。
- 114ではfixture、completed record、trace、winner、独立balance標本を作らない。
- 112の未実施fixture 6件、113の対戦数0、deferred 4戦を変更しない。
- 現行452、登録477、カード本文、数値、登録区分を変更しない。
- 対戦エンジン、効果自動解決、完全自動合法性判定を作らない。

---

### Task 1: 41 ID候補表とcoverage validator

**Files:**
- Create: `docs/card-game/tools/test_proxy_normal_decision_hardening.py`
- Create: `docs/card-game/data/proxy-normal-decision-candidate-table-114-20260918.json`
- Create: `docs/card-game/tools/proxy_normal_decision_hardening.py`

**Interfaces:**
- Consumes: `source_card_ids(source: dict) -> set[str]`で107 source fixtureのA/B和集合を導く。
- Produces: `validate_candidate_table(table: dict, source: dict) -> list[str]`で41 ID、7種類、必須欄、未知欄、重複actionを検査する。

- [ ] **Step 1: coverageの失敗テストを書く**

  `test_candidate_table_matches_source_union_of_41_ids`、`test_candidate_table_covers_all_seven_types_and_pass`、`test_candidate_table_rejects_missing_extra_and_duplicate_entries`を作る。sourceの和集合41 ID、type集合、常設`pass`、欠落・余分・重複拒否をassertする。

- [ ] **Step 2: REDを確認する**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: `ModuleNotFoundError: No module named 'proxy_normal_decision_hardening'`。

- [ ] **Step 3: 最小coverage実装と手動表を追加する**

  moduleへ`load_json`、`source_card_ids`、`validate_candidate_table`を追加する。候補表は`card_id`、`card_type`、`actions`を持ち、各actionに`action_type`、`timing`、`base_time_cost`、`prerequisites`、`target_rule`、`candidate_variants`、`legal_when`、`not_legal_when`、`source_text_reference`を必須化する。カードを通常行動として使わない局面も`actions`内の裁定で省略しない。

- [ ] **Step 4: coverageテストをGREENにする**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: Task 1の3テストがPASS。

### Task 2: nested schemaと公開情報whitelist

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_hardening.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_hardening.py`

**Interfaces:**
- Produces: `validate_pre_decision_state(state: dict) -> list[str]`。
- Produces: `validate_public_information(info: dict) -> list[str]`。

- [ ] **Step 1: strict schemaの失敗テストを書く**

  正しい`hand/board/time/growth/reservations`を受理し、`field`、board内未知key、必須key欠落を拒否するテストを書く。公開情報は8 keyだけを受理し、`opponent_hand`、`deck_order`、未知key、誤ったpolicyを拒否する。

- [ ] **Step 2: REDを確認する**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: 新しいvalidation関数が未定義でFAIL。

- [ ] **Step 3: exact-key validatorを実装する**

  set完全一致でtop-levelとboard nested keyを検査し、policyを`public_and_owner_known_only`へ固定する。whitelist外keyの名前をerrorへ含める。

- [ ] **Step 4: schemaテストをGREENにする**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: Task 1〜2がPASS。

### Task 3: 107優先順位比較contract

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_hardening.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_hardening.py`

**Interfaces:**
- Produces: `compare_candidates(left: dict, right: dict) -> dict`。結果は`winner`（`left`、`right`、`unresolved`）、`decided_at`、`reason`を返す。

- [ ] **Step 1: 比較規則の失敗テストを書く**

  上位3項目の辞書式比較、`time_after_certain_resolution`が大きいpassの優越、3成分Pareto優越、tradeoff／`incomparable`の`unresolved_canonical_text`停止、完全同点時の支払い→消費枚数→copy IDを別テストで固定する。

- [ ] **Step 2: REDを確認する**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: `compare_candidates`未定義または期待結果との差でFAIL。

- [ ] **Step 3: 最小比較関数を実装する**

  `avoid_loss_or_abort`、`maintain_or_prevent_100`、`certain_growth_difference`、`time_after_certain_resolution`を順に比較する。価値3成分は`better/equal/worse/incomparable`からPareto結果だけを返し、相互非優越を停止する。全同値時だけ`payment_time`、`consumed_card_count`、`card_copy_id`を昇順比較する。

- [ ] **Step 4: 比較テストをGREENにする**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: Task 1〜3がPASS。

### Task 4: machine-readable contractとscope boundary

**Files:**
- Modify: `docs/card-game/tools/test_proxy_normal_decision_hardening.py`
- Modify: `docs/card-game/tools/proxy_normal_decision_hardening.py`
- Create: `docs/card-game/data/proxy-normal-decision-hardening-114-20260918.json`

**Interfaces:**
- Produces: `build_hardening_contract(candidate_table: dict, source: dict, admission: dict) -> dict`。
- Produces: `validate_hardening_contract(contract: dict, candidate_table: dict, source: dict, admission: dict) -> list[str]`。
- Produces: `write_hardening_contract(contract: dict, output_path: Path) -> None`、`validate_materialized_contract(contract: dict, output_path: Path) -> list[str]`。

- [ ] **Step 1: contract保存と境界の失敗テストを書く**

  checkpoint 114、3 blocker解消、41 ID、7種類、fixture/completed/trace/balanceすべて0、deferred 4、112未実施6、現行452、登録477、保存一致を要求する。

- [ ] **Step 2: REDを確認する**

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: builder／保存関数未定義でFAIL。

- [ ] **Step 3: contract builder／validator／CLIを実装する**

  設計仕様のschema、whitelist、priority、comparison examples、scopeを定数から構築する。CLIはcanonical JSONを検査し、`--write`時だけ保存する。通常実行は検査結果と0件境界をJSONで表示する。

- [ ] **Step 4: contractを書き出しGREENにする**

  Run: `python3 docs/card-game/tools/proxy_normal_decision_hardening.py --write`

  Run: `python3 -m unittest docs/card-game/tools/test_proxy_normal_decision_hardening.py -v`

  Expected: 全専用テストPASS、保存一致。

### Task 5: 正本・総合検査・README接続

**Files:**
- Create: `docs/card-game/114-normal-decision-protocol-hardening.md`
- Modify: `docs/card-game/tools/check-design-data.py`
- Modify: `docs/card-game/README.md`

**Interfaces:**
- Consumes: Task 1〜4のcanonical JSONとvalidator CLI。
- Produces: 114の正本説明と総合検査への恒久接続。

- [ ] **Step 1: 総合検査の失敗条件を先に追加する**

  114の5成果物、41 ID、7種類、3 blocker解消、strict schema、priority順、fixture/completed/trace/balance 0、deferred 4、専用テスト件数、CLI成功、正本文言を要求するcheckを追加する。

- [ ] **Step 2: REDを確認する**

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Expected: 114正本文書とREADME更新が未存在または不足してFAIL。

- [ ] **Step 3: 正本文書とREADMEを最小更新する**

  114正本へ3 blockerの解決内容、対戦数0、115への4戦延期、カードプール不変を記録する。READMEの最新地点と次の再開地点を114→115へ更新する。

- [ ] **Step 4: 専用・回帰・総合検査をGREENにする**

  Run: `python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_*.py' -v`

  Run: `python3 docs/card-game/tools/check-design-data.py`

  Run: `git diff --check`

  Expected: 全件PASS、総合検査error 0、diff check出力なし。

### Task 6: 保存・Draft PR同期・CI確認

**Files:**
- Modify: Draft PR #259 body only through GitHub CLI/API.

**Interfaces:**
- Produces: 114を1コミットでremote branchへ保存し、Draft・open・未マージを維持する。

- [ ] **Step 1: 差分と境界を再確認する**

  `git status --short`、`git diff --stat`、`git diff --check`、専用テスト、proxy全テスト、総合検査を実行し、本編・表情・別PR差分がないことを確認する。

- [ ] **Step 2: 114を1コミットで保存する**

  `git add`は114成果物、2 plan、README、`check-design-data.py`だけを明示し、`git commit -m "docs(card-game): harden normal decision protocol"`、作業ブランチへpushする。

- [ ] **Step 3: PR本文を114へ同期する**

  114の3解決、対戦0、115で4戦、現行452／登録477不変、検査結果を追記し、Draft・open・未マージを維持する。

- [ ] **Step 4: remote保存とCIを確認する**

  local/remote HEAD、tree、変更ファイル、PR状態、最新CI成功、作業ツリーcleanを確認して区切る。
