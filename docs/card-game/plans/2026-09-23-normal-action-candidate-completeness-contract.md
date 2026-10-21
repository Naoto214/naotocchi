# Normal Action Candidate Completeness Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** checkpoint 121で、通常行動の全source／variant／targetの採否と完全性を保存stateの変更なしに再計算し、4つの120停止証拠についてprotocol-only監査を正本化する。

**Architecture:** 単一の121専用Python moduleで入力検証、許可情報のprojection、template駆動の列挙、採否、独立再計算を純粋関数の境界に分ける。4経路は同じ関数へ渡す読み取り専用入力とacceptance oracleに限定し、card-specificな条件は114 templateと既存正本への参照を持つregistry dataとして扱う。JSONは同一builderから生成し、独立validatorで再生成bytesまで照合する。

**Tech Stack:** Python 3.12標準ライブラリ（`unittest`, `json`, `hashlib`, `pathlib`, `copy`, `argparse`）、既存カードゲームPython検査器、JSON、Markdown。

**Spec:** `docs/card-game/plans/2026-09-23-normal-action-candidate-completeness-contract-design.md`（承認済みSHA-256 `f5756763c45f2056eb6ad0ac6b574d56f35465893cbdb2db5cd6d0cdd4329cfb`）。

## Global Constraints

- 121は`protocol_only_no_match_progress`。planned/completed/stopped match、decision/event/snapshot/winner、独立balance標本、新stop artifactは0。
- 120の4 stop artifact、117、119、116、112の保存済み証拠を読み取り専用とする。112 fixture 6件は未実施のまま。
- 6 familyを`standing_pass`, `hand_card_action`, `board_card_action`, `reservation_action`, `normal_challenge`, `relationship_progress`の順で必ず監査する。空familyも件数0、reason、正本参照、調査fieldを残す。
- `public_and_owner_known_only`。相手の非公開手札、双方の山札順、future情報、allowlist外keyを合法性へ渡さない。
- 通常行動pass IDは`pass`のみ。114の`candidate-pass`から一方向正規化し、119の`response-pass`を拒否する。
- 全unitのstable IDはfamily/zone/source instanceまたはsynthetic ID/action/variant/target IDs昇順から生成する。admittedだけcandidate IDを持つ。birth grammarは`candidate-play-main-{source_instance_id}-birth`。
- 12条件と空のstop codesからvalidatorが`candidate_set_complete`を独立導出し、保存booleanとの差を拒否する。17 reason codeは全該当理由をregistry順で記録し、10 stop codeで不確定性を明示する。
- JSONはUTF-8、indent 2、LF、末尾newline 1件、schema順。builder再生成bytesと保存bytesの完全一致を要する。
- 4経路専用合法性分岐、116 fallback、候補選択、pass実行、120再開、452件全体の汎用対戦エンジン化を禁止する。
- PR #259をDraft・open・未マージに保ち、main、本編、表情、イラスト、別PRを変更しない。

## Review Focus

- 候補集合が偶然期待値に一致しても、手札sourceを1件省略した入力を拒否する。Task 2の`test_inventory_rejects_missing_hand_source`。
- 相手手札と山札順がstop artifact内に存在しても、projection/evidenceへの漏出を拒否する。Task 2の`test_projection_rejects_private_and_future_fields`。
- targetの組合せを1件落とした候補監査を、合法候補のIDだけが一致しても拒否する。Task 3の`test_target_expansion_is_exhaustive`。
- 保存済みtrueを維持したままunitの除外理由を消す改変を、独立validatorが拒否する。Task 5の`test_validator_recomputes_reasons_and_twelve_checks`。
- 意味上同じJSONでも空白、key順、末尾改行が異なる保存物を拒否する。Task 6の`test_saved_bytes_equal_builder_bytes`。

## File Map

- Create `docs/card-game/tools/proxy_normal_action_candidate_completeness.py`: 読取、projection、inventory、template/variant/target展開、採否、stable IDs、12条件の独立validator、canonical serializer、CLI。
- Create `docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py`: 各TDDサイクルの正例・改変負例・4経路acceptance・保存bytes検査。
- Create `docs/card-game/data/proxy-normal-action-candidate-completeness-contract-121-20260923.json`: registry、schema、scope、保護hash。
- Create `docs/card-game/data/proxy-normal-action-candidate-completeness-audit-121-20260923.json`: 4経路の列挙証拠と12条件。
- Create `docs/card-game/121-normal-action-candidate-completeness-contract.md`: 実測結果と停止境界。
- Modify `docs/card-game/README.md`: 実装・検証後のみ121現在地を追記。
- Modify PR #259本文: 実装保存後にremoteの結果とscopeを同期。
- Read only `docs/card-game/data/proxy-response-window-stops-120/*.json`, 114 candidate table/hardening、107/114/116/119/120正本、card本文と参照正本、112 fixture、117・119の監査。

## Interface contract

`load_inputs(data_dir: Path = DATA) -> dict`は既存artifactと114 templateを読み、元bytesも保持する。`verify_source_artifact(stop: dict, raw: bytes, expected: dict) -> None`は入力破損を例外で止める。`project_normal_action_information(stop: dict) -> dict`は明示allowlistだけを新しいobjectへ写す。`inventory_sources(view: dict) -> list[dict]`は6 familyを固定順で返す。`expand_units(view: dict, inventory: list[dict], templates: dict) -> list[dict]`は全variant/targetを列挙する。`adjudicate_units(view: dict, units: list[dict], registry: dict) -> list[dict]`は採否と全reason/evidenceを返す。`derive_legal_candidates(units: list[dict]) -> tuple[list[str], list[dict]]`はcanonicalな候補を返す。`build_contract() -> dict`と`build_audits(inputs: dict) -> dict`は保存用objectを返す。`validate_contract(contract: dict) -> list[str]`と`validate_audit(audit: dict, inputs: dict) -> list[str]`は保存された結論に依存せず再列挙して差を返す。`canonical_bytes(value: dict) -> bytes`は唯一のserializerとする。契約停止は登録code付きの明示結果、raw/hash/schema/manifest/mapping破損は全体例外として分ける。

### Task 1: 固定入力、source integrity、protocol registry

**Files:** Create `docs/card-game/tools/proxy_normal_action_candidate_completeness.py`; Create `docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py`.

**Interfaces:** `load_inputs`, `verify_source_artifact`, `build_contract`, `validate_contract`。120 stopの4 pathとraw/state hash、seqは設計第4節を定数入力として照合する。

- [ ] **Step 1: 失敗テストを書く。** `test_four_stop_raw_state_hashes_and_sequences`は4件のraw SHA、game/continuation SHA、event seq、phaseを設計第4節の値とexact比較する。`test_corrupt_raw_bytes_or_mapping_is_global_error`は改行だけを変えたraw、state、mapping、manifest、schemaを個別に改変して全体例外を要求する。`test_contract_registry_exact`は6/17/10/12 registry、top-level 14 keysとversionをexact比較する。
- [ ] **Step 2: REDを実行する。** `cd docs/card-game/tools && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest test_proxy_normal_action_candidate_completeness.py -v`。期待: module未定義または3 test失敗。
- [ ] **Step 3: 最小実装を書く。** `PATH_ORDER`と設計第4節の固定値を宣言し、`hashlib.sha256(raw).hexdigest()`、既存120 hash規則、schema/manifest/mappingを照合する。contract registryには設計第7、9、12〜14節の完全なentryと各reasonのevidence field/正本参照を格納する。未知codeを受理しない。
- [ ] **Step 4: GREENを実行する。** 同じunittestコマンドで3 testをPASSにする。入力破損がrules stopとして保存されないことを確認する。
- [ ] **Step 5: 当該2ファイルのみcommitする。** `git add docs/card-game/tools/proxy_normal_action_candidate_completeness.py docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py && git commit -m "test(card-game): establish checkpoint 121 source integrity"`。

### Task 2: 情報projectionと6 familyのsource inventory

**Files:** Modify 上記moduleとtest。

**Interfaces:** `project_normal_action_information(stop) -> dict`; `inventory_sources(view) -> list[dict]`。viewはactor hand/board、双方のpublic board/discard/time/growth、公開prepared、適用済みreservation、公開history、現在turn flags、可視instance mappingだけを含む。

- [ ] **Step 1: 失敗テストを書く。** `test_projection_rejects_private_and_future_fields`で相手hand、双方deck order、future draw/response/action、未知keyをそれぞれ注入して拒否をassertする。`test_inventory_rejects_missing_hand_source`でactor手札の1件を監査から落として不一致をassertする。`test_all_six_families_including_empty_evidence`で全family順、0件familyのreason/reference/inspected fields、synthetic challenge/relationship各1件をassertする。
- [ ] **Step 2: 同じunittestを実行し新testがREDであることを記録する。**
- [ ] **Step 3: 許可keyの明示集合でdeep-copy projectionし、mappingはview内で現在可視のinstanceだけへ切り詰める。** inventoryはactor hand全件、boardのmain/companions/partner/world/prepared、適用済み予約、standing pass、synthetic各1件を構成し、空familyにも設計第7節の証拠を残す。validatorは保存inventoryとprojectionからの再収集をexact比較する。
- [ ] **Step 4: 同じunittestを実行しGREENにする。**
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_candidate_completeness.py docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py && git commit -m "feat(card-game): inventory normal action sources safely"`。

### Task 3: template、variant、targetの漏れない展開

**Files:** Modify 上記moduleとtest。

**Interfaces:** `expand_units(view, inventory, templates) -> list[dict]`。各unitのstable `enumeration_unit_id`はfamily/zone/source/action/variant/target昇順のみから生成する。

- [ ] **Step 1: 失敗テストを書く。** `test_template_missing_duplicate_and_reference_mismatch`で3状態を停止させる。`test_variant_expansion_includes_excluded_timing`で114の全action/variantが監査に残ることをassertする。`test_target_expansion_is_exhaustive`で合法targetの追加・除去と順番交換を与え、欠落と余剰を拒否し順番には依存しないことをassertする。`test_unit_id_stable_across_paths_and_permutations`で同内容のstateを異なるpath/orderで評価しID一致と衝突拒否をassertする。
- [ ] **Step 2: 同じunittestを実行し新testがREDであることを記録する。**
- [ ] **Step 3: 114 card IDの全templateを一意に結び、source referenceを確認する。** board action、reservation、challenge power/wisdom、関係0→1→2→3→結婚は正本参照を持つregistryに置く。target ruleごとに現時点で見えるtarget集合を生成し、unknown ruleは`unresolved_canonical_predicate`、不完全対象は`incomplete_target_expansion`で止める。ID serializationは各要素を長さ付きで符号化し、区切り文字による衝突を避ける。
- [ ] **Step 4: 同じunittestを実行しGREENにする。**
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_candidate_completeness.py docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py && git commit -m "feat(card-game): expand normal action units"`。

### Task 4: 採否、reason証拠、candidate ID

**Files:** Modify 上記moduleとtest。

**Interfaces:** `adjudicate_units(view, units, registry) -> list[dict]`; `derive_legal_candidates(units) -> tuple[list[str], list[dict]]`。17 reasonは設計第13節順、10 stopは第14節に限る。

- [ ] **Step 1: 失敗テストを書く。** `test_all_applicable_reasons_are_recorded_in_registry_order`で時不足とmain欠如など同時否定を作り全理由をassertする。`test_unknown_predicate_or_forbidden_evidence_stops`で推測excludedを禁止する。`test_canonical_pass_and_birth_ids`で`candidate-pass`入力から`pass`出力、`response-pass`拒否、birth grammar、未登録grammar/衝突停止をassertする。`test_admitted_excluded_are_exclusive`でadmittedのreasonとexcludedのcandidate IDを拒否する。
- [ ] **Step 2: 同じunittestで新testのREDを確認する。**
- [ ] **Step 3: 既存正本由来のpredicateをevidenceと参照付きで評価する。** falseを全件集めregistry順へ配置し、未解決を`unresolved_canonical_predicate`、情報違反を`forbidden_information_required`とする。全unitの採否を一意にし、admitted IDをgrammarから再生成する。`pass`を常にちょうど1件にし、出力を昇順にする。
- [ ] **Step 4: 同じunittestでGREENを確認する。**
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_candidate_completeness.py docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py && git commit -m "feat(card-game): adjudicate candidates and stable IDs"`。

### Task 5: 独立validatorと4停止stateのacceptance

**Files:** Modify 上記moduleとtest。

**Interfaces:** `build_audits(inputs) -> dict`; `validate_audit(audit, inputs) -> list[str]`。validatorは保存unit/check/booleanを参照して期待値を作らず、raw入力とregistryから別途再列挙する。

- [ ] **Step 1: 失敗テストを書く。** `test_four_stop_acceptance_or_contract_stop`で順に`[pass]`、`[candidate-play-main-B-001#1-birth, pass]`、`[pass]`、`[candidate-play-main-B-001#1-birth, candidate-play-main-B-009#1-birth, pass]`を再計算で確認し、再計算不能なら手書き補正なしで明示contract stopを要求する。`test_validator_recomputes_reasons_and_twelve_checks`でsource/variant/target/reason/ID/check/booleanの1箇所ずつ改変を拒否する。`test_stop_codes_and_zero_match_progress`で10 code以外、保存trueとstop併存、decision/event/snapshot/winner生成を拒否する。
- [ ] **Step 2: 同じunittestで新testのREDを確認する。**
- [ ] **Step 3: 設計第12節の12述語をraw sourceから個別に計算し、保存checksと逐一照合する。** 12 trueかつstop空の時だけtrue。4経路のoracleはtestにのみ置く。通常行動関数にはpath/order/copy IDによる合法性分岐を置かない。
- [ ] **Step 4: 同じunittestでGREENを確認する。** 正本でpredicateが解けなければ契約停止の内容を報告して計画内で裁定を作らない。
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_candidate_completeness.py docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py && git commit -m "feat(card-game): verify independent candidate completeness"`。

### Task 6: canonical JSON、統合検査、保存報告

**Files:** Modify 上記moduleとtest; Create 上記121 JSON 2件と`docs/card-game/121-normal-action-candidate-completeness-contract.md`; Modify `docs/card-game/README.md`。PR本文はremote保存と検証後に限る。

**Interfaces:** `canonical_bytes(value) -> bytes`; CLI `python3 proxy_normal_action_candidate_completeness.py --write`と`--check`。`--check`は保存bytesとbuilder再生成bytesを直接比較する。

- [ ] **Step 1: 失敗テストを書く。** `test_saved_bytes_equal_builder_bytes`で空白、key順、CRLF、末尾改行、UTF-8 bytesの改変をそれぞれ拒否する。`test_protected_artifacts_unchanged`で117/119/116/112/120の保護bytesと120の4 raw/state hashを実装前後で比較する。`test_protocol_only_scope_and_order`でcontractの14 key、auditの10 key/19 audit key、4 path順、0件scopeをassertする。
- [ ] **Step 2: 同じunittestで新testのREDを確認する。**
- [ ] **Step 3: `json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8') + b'\n'`を唯一のserializerにし、schemaのkey/array順を構築時・検査時に固定する。** `--write`で2 JSONを生成し、`--check`で再生成bytesと保存bytes、全保護境界を検査する。検査がGREENの場合のみ121報告とREADMEを実測値に合わせる。
- [ ] **Step 4: 専用test、CLI `--check`、既存カードゲーム関連検査を実行し出力を報告に記録する。** 既知のsparse-excluded catalog、link入力不足、`tests/smoke-test.js`不足は別件と明記し121の成否に混ぜない。`git diff --name-only`でFile Map外の変更を拒否する。
- [ ] **Step 5: 121成果物と報告/READMEだけcommitしてDraft PR #259へpushする。** remote HEAD/tree、PR Draft/open、workflow run/status、remoteから再取得した保存JSON bytesを確認する。その後PR本文を実測に同期し、121の4経路再開は次checkpointの別承認に残す。

## Self-review and handoff gate

- 設計第1〜18節をTask 1〜6へ対応づける。6 family、12条件、17 reason、10 stop、pass/response分離、情報境界、raw/hash保護、canonical bytes、0件scopeに欠落がないことを確認する。
- 5つのReview Focusそれぞれに所有taskの失敗テストがあることを確認する。関数名と引数の表記がInterface contractおよびtask間で一致することを確認する。
- 実装前に計画のみをGitHubへ保存しremote bytesを照合する。計画承認前はTask 1を開始しない。実装後も120の4経路は再開しない。
