# Checkpoint 122 Independent Normal Action Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 120の4停止経路を保存済みの同一state/hash/event seqから独立に再開し、121で証明した通常行動候補の完全性を各現在stateで再計算してから既存の選択・遷移契約を適用する。

**Architecture:** 122専用の再開builder/validatorを120の保存済み二重hash鎖・119のresponse処理に接続し、121の列挙器には固定4停止点から独立した現在state入力を追加する。選択は107/114/116、遷移は既存正本で確定するaction typeの共通handlerだけに限定し、未確定と整合性破損は経路別に停止する。保存済み120/121成果物は読み取り専用とする。

**Tech Stack:** Python 3.12標準ライブラリ、`unittest`、JSON、Markdown、既存`docs/card-game/tools`。

**Spec:** 承認済み再開設計（2026-09-23の会話、remote基準HEAD `8ff97ef0f683340274b6b20be5fc0a7b4dac8dc8`、tree `76e18bbb7275cc98d21cd9558c21d5cb1eb9b5bc`）、121設計 `docs/card-game/plans/2026-09-23-normal-action-candidate-completeness-contract-design.md`、107/114/116/119/120/121正本。

## Global Constraints

- 120の4 stop artifactを各々同じraw bytes、game state SHA-256、continuation state SHA-256、event seq 7/5/5/5から再開する。120、121、117、119、116、112の既存保存物を変更しない。112の6 fixtureは未実施のまま。
- 121の6 source family、12完全性条件、17 reason code、10 contract stop code、`public_and_owner_known_only`、canonical `pass`、119専用`response-pass`を維持する。保存booleanや保存済み4候補一覧を完全性の根拠にしない。
- 毎回の現在stateでsource/variant/target、evidence、stable IDを再列挙し、12条件すべてtrueかつstop codes空の場合だけ107/114の比較へ進む。比較不能の場合だけ116の前提を確認して適用する。状態遷移後は新stateから再列挙する。
- handlerはaction type、variant、既存正本の確認済み条件で分岐する。path ID、order ID、特定card copy/instance IDで合法性・選択・遷移を分岐しない。未対応・未定義の遷移は`effect_resolution_not_defined`または`canonical_rule_not_defined`のrules stopとする。
- 情報境界違反、候補不完全、未知のpredicate、stable ID不足では選択もfallbackも行わない。raw/schema/manifest/mapping等の固定source破損は入力全体の実装エラー、対戦進行後のevent/hash/instance/参照破損は該当経路のintegrity stopとする。
- stopまでのdecision/event/snapshotのみを新しい122成果物に保存する。winner、completed、独立balance標本は実際の既存終了条件を検証した場合だけ記録し、seeded fallback使用済みcompletedは独立balance標本に含めない。ループ上限超過をcompletedとしない。
- UTF-8、indent 2、LF、末尾newline 1件、固定key/array順のJSON。builder再生成bytesと保存bytesの直接比較を必須とする。
- 現行452、登録477、カード本文・数値・登録区分、「ときおくり」、既存schema/ID、PR #259 Draft/open/unmergedを維持する。main、本編、表情、イラスト、別PRは変更しない。
- 全proxyの既知117旧テスト1件は、期待`proxy_test_count=190`と現在の基準`263`の差によるもの。117保護対象を変更せず、122の成否と分けて記録する。

## Review Focus

- 120のterminal stateと122初回snapshotが同一でも、120末尾eventを122へ二重計上した場合を拒否する。Task 1で固定する。
- 121監査の`candidate_set_complete=true`を偽造しても、現在stateのsourceやtargetの欠落を独立再計算で拒否する。Task 2で固定する。
- `pass`のみの集合を116の「候補2件以上」のseed resolverへ誤投入しない。Task 3で固定する。
- birth直後のresponseから通常行動へ戻る際、保存済み古い候補を再利用しない。Task 5で固定する。
- 一経路に未知の遷移やhash破損が出ても、別経路の結果・event seqに影響させない。Task 6で固定する。

## File Map

- Modify `docs/card-game/tools/proxy_normal_action_candidate_completeness.py`: 既存121の保存audits/`--check`を変えず、任意の現在`normal_action` stateと公開履歴から同じ列挙・独立再計算を呼べる純粋関数を追加する。
- Modify `docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py`: 既存38件を保ち、新state/情報境界/boolean偽装の検査を追加する。
- Create `docs/card-game/tools/proxy_normal_action_seeded_restart.py`: 120停止点入力、121接続、107/114/116選択、確認済み遷移、119反応、経路別停止、122成果物builder/validator/CLI。
- Create `docs/card-game/tools/test_proxy_normal_action_seeded_restart.py`: 本計画のRED→GREENテストと4経路の独立検証。
- Create `docs/card-game/data/proxy-normal-action-seeded-restart-plan-122-20260923.json`: 4経路のsource参照、各機会の候補監査、判断・遷移・停止または終了予定。
- Create `docs/card-game/data/proxy-normal-action-seeded-restart-evaluation-122-20260923.json`: 実測件数と経路別status、balance除外。
- Create `docs/card-game/data/proxy-normal-action-stops-122/stop-122-<path>.json` only for newly stopped paths. Create completed records/traces only if a verified completion actually occurs; never pre-create them.
- Create `docs/card-game/122-normal-action-seeded-restart.md`; Modify `docs/card-game/README.md` and PR #259本文 only after implementation and verification.
- Read only `docs/card-game/data/proxy-response-window-stops-120/*.json`, 120 plan/evaluation, 121 contract/audit, 107/114/116/119正本、112 fixture、117/119記録、card本文。

## Interfaces and error boundary

`audit_current_normal_action(state: dict, continuation: dict, public_history: dict, candidate_table: dict) -> dict` は121の列挙・採否・12条件の独立計算結果を返す。`validate_current_normal_action(audit: dict, state: dict, continuation: dict, public_history: dict, candidate_table: dict) -> list[str]` は保存auditのbooleanとunitsを期待値の材料にせず再生成する。120入力向けの`build_audits`と保存121 JSONは変えない。公開履歴は保存済み過去steps＋今回の確定eventのみから作り、未来情報を渡さない。

122の`load_sources(data_dir: Path) -> dict`、`resume_from_120(stop: dict) -> dict`、`enumerate_opportunity(continuation: dict, history: dict, inputs: dict) -> dict`、`select_decision(opportunity: dict, route_context: dict) -> dict`、`transition(continuation: dict, decision: dict, inputs: dict) -> tuple[dict,list[dict]]`、`run_route(stop: dict, inputs: dict) -> dict`、`build_outputs(inputs: dict) -> dict`、`validate_outputs(outputs: dict, inputs: dict) -> list[str]` を接続する。122の自身のsnapshot、event、decisionは120の最後のsnapshotから追記する論理的な連続鎖だが、120の保存済みbytesは再保存しない。

122のrules stopは120の登録済み理由（`incomplete_legal_candidates`, `opponent_private_or_future_information_required`, `missing_stable_candidate_identifier`, `legality_not_confirmed`, `canonical_rule_not_defined`, `effect_resolution_not_defined`）と121のcontract stop evidenceを組み合わせ、最後の検証済みstateを残す。integrity stopは120登録済み整合性理由とdetected evidenceを持つ。固定sourceの破損、未知schemaや未登録reason、builder自体の矛盾は全体実装エラーとして保存しない。

### Task 1: 120保存済み停止点と122継続入口

**Files:** Create `docs/card-game/tools/proxy_normal_action_seeded_restart.py`; Create `docs/card-game/tools/test_proxy_normal_action_seeded_restart.py`.

**Interfaces:** `load_sources(data_dir: Path) -> dict`; `resume_from_120(stop: dict) -> dict`。120の`game_state_sha256`/`continuation_state_sha256`と121の`verify_source_artifact`を再利用する。

- [ ] **Step 1: RED testを書く。** `test_four_sources_bind_exact_raw_dual_hash_seq`は4 raw SHAを121の保護値、event seqを`[7,5,5,5]`と比較する。`test_resume_keeps_120_terminal_as_first_snapshot_without_new_event`はresume直後のstate/hashとseq同一、new decision/event 0をassertする。raw 1 byte、manifest、mapping、continuation payloadを変えた入力は全体実装エラーとし、original停止ファイルへ一切書かない。
- [ ] **Step 2: REDを実行する。** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_normal_action_seeded_restart.py' -v`。期待: moduleまたは入口未定義で失敗。
- [ ] **Step 3: 最小実装を書く。** 4 stopを独立にrawで読み、121 `verify_source_artifact`と120のsource manifest検査を呼ぶ。`copy.deepcopy(stop['continuation_state'])`に`last_event_seq=stop['last_valid_event_seq']`を付け、最初の122 snapshotを同じ両hashの境界として作る。新eventを作らない。
- [ ] **Step 4: 同じテストを再実行してGREENを確認する。** raw/state/continuation/mappingの改変負例もPASSにする。
- [ ] **Step 5: 2ファイルのみcommitする。** `git add docs/card-game/tools/proxy_normal_action_seeded_restart.py docs/card-game/tools/test_proxy_normal_action_seeded_restart.py && git commit -m "test(card-game): bind checkpoint 122 restart to saved stops"`。

### Task 2: 121を各現在stateへ適用する境界

**Files:** Modify `docs/card-game/tools/proxy_normal_action_candidate_completeness.py` and its test; Modify 122 module/test.

**Interfaces:** `audit_current_normal_action`、`validate_current_normal_action`、122 `enumerate_opportunity`。121の既存`inventory_sources`、`expand_units`、`adjudicate_units`、`derive_legal_candidates`、`recompute_completeness`を共通のstate projectionへ接続する。

- [ ] **Step 1: RED testを書く。** 120の4開始stateから4期待候補を同じ新入口で再導出する。turn flag、hand/board、公開履歴を一つずつ変え、期待auditが現stateへ追随することをassertする。保存`candidate_set_complete=true`のままsource/target/reasonを削った監査、相手の手札・山札順、未知key、未来情報の注入を拒否する。6 family、12 check、17 reason registry、10 stop registry、`pass`/`response-pass`分離を既存121とexact比較する。
- [ ] **Step 2: 両専用unittestを実行して新testのREDを確認する。** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_normal_action_candidate_completeness.py' -v`と122専用コマンド。
- [ ] **Step 3: 最小実装を書く。** 120 stop固定のsource integrity判定と、現在stateの許可情報projection/列挙を分ける。現在stateのhash、mapping、phase、actor、公開履歴sourceを検査し、列挙器へallowlist viewのみ渡す。12条件を元stateと114 templateから再計算し、stop codesが空のときだけtrueにする。既存121 `build_audits`のcanonical bytesを変えない。
- [ ] **Step 4: 両テストと`PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_action_candidate_completeness.py --check`でGREENを確認する。** 121の保存JSONが1 byteも変わらないことを確認する。
- [ ] **Step 5: 対象4ファイルだけcommitする。** `git add docs/card-game/tools/proxy_normal_action_candidate_completeness.py docs/card-game/tools/test_proxy_normal_action_candidate_completeness.py docs/card-game/tools/proxy_normal_action_seeded_restart.py docs/card-game/tools/test_proxy_normal_action_seeded_restart.py && git commit -m "feat(card-game): audit current normal action independently"`。

### Task 3: 完全集合からの107/114/116選択

**Files:** Modify 122 module/test.

**Interfaces:** `select_decision(opportunity, route_context) -> dict`。122が再計算済み`candidate_set_complete`と保存監査の一致を検査してから107/114/116の既存関数へ渡す。

- [ ] **Step 1: RED testを書く。** `[pass]`は一意選択で、runner-up空、seedなし。birth＋passは107/114の確定優先比較と根拠を評価し、一意にならない場合にだけ116の完全合法集合と適切な抽選部分集合でseed proofを生成する。`pass`を劣位と証明せず抽選から外す操作は拒否する。偽のtrue、候補重複、保存候補と現state監査の差、非公開・未来情報、stable ID不足ではdecision数0のrules stopとする。
- [ ] **Step 2: 122専用unittestで新testのREDを確認する。**
- [ ] **Step 3: 最小実装を書く。** 完全性guardを先頭に置き、1件の合法候補は`priority_unique`として直接構築する。2件以上は107/114比較を先に評価し、証明済みsafe free developmentだけ116の安全比較へ渡す。なお比較不能かつ116の5継続条件成立時に限り`build_seed_proof`と`validate_seeded_resolution`を使用する。107/114で優劣・安全性を証明できなければ、116の許可範囲内で全比較不能候補を扱うか、契約不足として停止する。seed材料にpath IDを入れない。
- [ ] **Step 4: 122専用unittestでGREENを確認する。** pass-onlyを既存120の「2候補必須」resolverへ通していないことを検査する。
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_seeded_restart.py docs/card-game/tools/test_proxy_normal_action_seeded_restart.py && git commit -m "feat(card-game): gate normal choice on verified candidates"`。

### Task 4: 既存正本で確定する遷移と119反応

**Files:** Modify 122 module/test.

**Interfaces:** `transition(continuation, decision, inputs) -> tuple[dict,list[dict]]`。通常`pass`、登録済み`play_main`/`birth`、119 response処理だけを正本・支払い・領域移動・誘発と結合して実装する。その他のadmitted候補は選択前にhandler coverageを検証する。

- [ ] **Step 1: RED testを書く。** `pass`で現在の通常行動機会が終わる既存ルールのphase/turn/終了処理を正本と照合し、処理不能なら支払い・event 0で`effect_resolution_not_defined`へ止める。birthではmain枠空、stage 1、時コスト、手札→盤面、支払い、個体対応、通常行動後の119 responseをテストする。時不足、盤面占有、対象消滅、誘発や開始・終了処理が正本から解けない状態でstateを変更しない。別card copyでも同じ`play_main`/`birth`規則を使う。
- [ ] **Step 2: 122専用unittestで新testのREDを確認する。**
- [ ] **Step 3: 最小実装を書く。** handler registryのkeyは`(action_type, candidate_variant)`のみ。事前の現在state/legal detail結合を再確認し、遷移結果を新objectに作ってからhash/zone整合性を検査し、成功時だけcommitする。119の`response-pass`と合法反応・chain処理は既存interfaceへ渡す。passに必要なturn/end handlerが正本と既存interfaceで未確定ならそこでrules stopを残し、実装者独自の裁定を作らない。
- [ ] **Step 4: 122専用unittestでGREENを確認する。** 未対応候補が選択された場合も、直前のstate/hashを保持した経路別rules stopにする。
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_seeded_restart.py docs/card-game/tools/test_proxy_normal_action_seeded_restart.py && git commit -m "feat(card-game): apply canonically supported normal transitions"`。

### Task 5: 新state再列挙と連続したdecision/event/snapshot

**Files:** Modify 122 module/test.

**Interfaces:** `run_route(stop, inputs) -> dict`。機会ごとにTask 2→3→4を呼び、responseも119に従い、120の最終event seqを起点に122の二重hash鎖を生成する。

- [ ] **Step 1: RED testを書く。** 各120 stopの最初の判断にTask 2再導出の候補集合を要求する。birth後またはpass後の新stateで再度auditを呼び、古い121候補リストを渡すと拒否する。各event seqが120末尾+1から連続し、snapshotは122入口1件＋新event数、decision/event参照と前後両hashが一致することを確認する。新stateで契約不足なら最後の検証済みstateのrules stopで終える。
- [ ] **Step 2: 122専用unittestで新testのREDを確認する。**
- [ ] **Step 3: 最小実装を書く。** 固定step配列を判断の代用にせず、各反復で現在continuationから列挙・validator再計算→比較→遷移→検証→次の機会へ進む。公開履歴は確認済みsteps/eventだけを蓄積する。既存R10比較か100維持の終了条件を証明できた時だけcompletedとwinnerを作る。iteration guardは記録付きrules stopまたは全体実装エラーとし、勝敗を捏造しない。
- [ ] **Step 4: 122専用unittestでGREENを確認する。** 120の既存decision 9/event 10/snapshot 14を二重に122の新規件数へ加算しない。
- [ ] **Step 5: 2ファイルをcommitする。** `git add docs/card-game/tools/proxy_normal_action_seeded_restart.py docs/card-game/tools/test_proxy_normal_action_seeded_restart.py && git commit -m "feat(card-game): re-enumerate every current state"`。

### Task 6: 4経路独立停止、成果物validator、canonical bytes

**Files:** Modify 122 module/test; Create 122 plan/evaluation JSON and必要な122 stopだけ。

**Interfaces:** `build_outputs(inputs) -> dict`; `validate_outputs(outputs, inputs) -> list[str]`; CLI `--write`/`--check`。保存122 plan/evaluation/stopsはbuilderから再現できる。

- [ ] **Step 1: RED testを書く。** 一経路だけ未知の合法性、未対応遷移、event hash/instance参照破損にしても他3経路を独立評価する。ただし入力sourceの生bytes/manifest破損は全体エラーとして保存しない。stopには理由、121 stop code/evidence、最終seq、両hash、winner null、非completed/非balanceを要求する。seed使用completedのbalance除外、無seed completedの終了条件検証をテストする。JSONのCRLF/空白/key順/末尾改行1 byte差を拒否する。
- [ ] **Step 2: 122専用unittestで新testのREDを確認する。**
- [ ] **Step 3: 最小実装を書く。** pathごとにdeep-copyし、rules/integrity stopと検証済みcompletedだけを独立に集計する。新artifactの固定schema/key順と122 IDを定義し、保存stopだけを専用directoryへ書く。`json.dumps(value,ensure_ascii=False,indent=2).encode('utf-8')+b'\n'`を唯一の保存serializerとする。`--check`はraw sourceとbuilder再生成の122各JSON bytesを直接比較する。
- [ ] **Step 4: `--write`後に別プロセス`--check`と122専用unittestでGREENを確認する。** path別のstatus/件数をそのまま記録し、completed 4などの結果をテストへ固定して誘導しない。
- [ ] **Step 5: 122新成果物だけcommitする。** `git add docs/card-game/tools/proxy_normal_action_seeded_restart.py docs/card-game/tools/test_proxy_normal_action_seeded_restart.py docs/card-game/data/proxy-normal-action-seeded-restart-plan-122-20260923.json docs/card-game/data/proxy-normal-action-seeded-restart-evaluation-122-20260923.json docs/card-game/data/proxy-normal-action-stops-122 && git commit -m "docs(card-game): record checkpoint 122 independent restart"`。stopが0件なら存在しないdirectoryを`git add`しない。

### Task 7: 正本報告、総合検査、remote保存

**Files:** Modify 122 module/test as needed; Create `docs/card-game/122-normal-action-seeded-restart.md`; Modify `docs/card-game/README.md`; Update PR #259本文 after save.

**Interfaces:** 既存`docs/card-game/tools/check-design-data.py`の対象checkpoint gateを、122専用validationと保存結果に接続する（必要になった場合のみ同fileとその対応testをFile Mapに追加し、変更理由を報告する）。

- [ ] **Step 1: RED testを書く。** `test_122_report_matches_saved_counts`は報告/READMEの経路別status、decision/event/snapshot/winner、独立標本が保存JSONと一致することを要求する。`test_protected_raw_files_unchanged`は112/116/117/119/120/121保護hashと121 builder `--check`を要求する。必要な総合gateが未接続ならその失敗もtestで固定する。
- [ ] **Step 2: 122専用testを実行して報告やgate未接続によるREDを確認する。**
- [ ] **Step 3: 保存物から実測値だけを122文書/READMEへ反映し、必要な122 gateのみ追加する。** 117旧testの190対263、sparse-excluded catalog、link入力不足、`tests/smoke-test.js`不足の既知エラーは別記録し、修正・122の失敗判定をしない。
- [ ] **Step 4: 122/121/120/119専用test、各`--check`、総合検査、全proxyを実行してGREEN範囲と既知別件を分けて報告する。** `git diff --name-only`とprotected hashesを検査する。
- [ ] **Step 5: 122文書とREADMEだけcommitし、PR #259のDraft branchへ保存する。** remote HEAD/treeと変更ファイル、122 JSON/Markdownのremote再取得bytes、PR Draft/open/unmerged、headのworkflow runs/commit statusesを確認する。CIがなければ成功と記さない。PR本文は実測値を同期しmainへマージしない。

## Self-review and approval boundary

- Task 1は保存同一性、Task 2は121の全条件と情報境界、Task 3は107/114/116選択、Task 4は正本準拠遷移と119、Task 5は新state再列挙、Task 6は経路別停止とcanonical bytes、Task 7は保護・報告・GitHub保存に対応する。
- Review Focusの5項目はTask 1/2/3/5/6の失敗testにそれぞれ存在する。`audit_current_normal_action`、`validate_current_normal_action`、`run_route`、`build_outputs`、`validate_outputs`の署名は各Taskの使用箇所と一致する。
- 本計画のGitHub保存とremote再取得を確認してから実装承認を求める。承認前にはTask 1のRED、対戦再開、122 JSON/新stop/対戦記録生成、README/PR本文更新を開始しない。
