# 445案A 公開確定結果・残存効果同値証明 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 114を維持する別版パイロットで、公開確定結果と残存要素の同値を証明し、証明不能なら116 seeded fallbackを維持する。

**Architecture:** 公開入力投影→確定prefixと残存台帳→依存閉包によるpair証明→414互換problem→既存frontier/116選択の順に接続する。全stateを読む実行器と、許可viewだけを読む証明器を分離し、証明内容は別wrapperで再計算検証する。既存114/414の意味・default選択を変えない。

**Tech Stack:** Python 3標準ライブラリ、既存unittest、canonical JSON/SHA-256、既存proxy実行・再生契約。

**Spec:** [承認済み445案A](2026-10-03-public-result-equivalence-design-445.md)。2026-10-03のユーザー承認を本計画に記録する。445保存文書の当時の「未承認」は履歴として変更しない。

## Global Constraints

- 対象は `docs/card-game/`。114・505・414・443/444/445保存結果と過去成果物を変更しない。main、他のフロントエンド/3Dへ触れない。
- policy `public_result_equivalence_pilot_v1`、wrapper schema `naotocchi.card_game.public_result_equivalence.v1`。明示opt-inのみ。policy_promoted=false、独立balance標本0、固定4組。
- 現物・対象・期限・回数・本文版・依存条件・逆方向の作用まで証明できた要素だけ相殺。同名別現物同値、alpha-renaming、有限先読み、価値点数、期待値、誕生優遇、新裁定なし。
- 未知≠0≠equal。捨て札・外部たまご・runtime残存効果・履歴/権利・相手公開変化・pass後のresponse/終了処理を脱落させない。
- 空台帳は完全列挙証拠が必要。unknownは比較不能、入力破損はerror、比較生成未対応は明示する。新方式の戦略的unknownをゲーム停止と混同しない。
- 414上位3項目、4成分同時比較、全frontier同値時だけtie-break、部分同値候補の縮約禁止。116限定安全配置証明は配置対passのpair全体にのみ適用。
- 72旧適用限界を241へ移さない。182=128+46+8と対照59を固定し、群ラベルを選択入力にしない。削減0でも規則を追加しない。
- 本保存446は実装計画のみ。以下は未実施の工程。実装完了・性能改善・採用の報告ではない。

## Review Focus

1. 同一盤面で公開捨て札/たまご所在だけ異なる入力：領域外能力への依存を失わない（Task 1/2）。
2. 同一効果量で対象/期限/残回数/発生順が異なる入力：相殺しない（Task 2/3）。
3. passが連続pass・終了response・期限処理へ進む入力：無操作へ丸めない（Task 2/4）。
4. 同一の未知記号・循環依存・共通worldから差分mainへの作用：閉包未証明をequalにしない（Task 3）。
5. 表面のselected IDは正常でも内側choice/action/source decisionが異なる入力：保存検証error、seedで救済しない（Task 4/5）。

---

## 基準と実装ファイル構成

計画基準HEAD `b165ab2269f9f603ed580539463c4477c7c2a7e3`、tree `55b673f162a4e6025846f181c664deae929f1ab7`。開始時PR259はDraft/open/unmerged。実装開始時にfresh再確認し、進んでいれば差分を読み最新remoteを基準にする。ローカルの計画用部分復元を完全checkoutと誤認しない。

以下のファイル名は新設予定。表の `tools/` はすべて `docs/card-game/tools/`。

|ファイル|責務|
|---|---|
|`tools/proxy_equivalence_inputs.py`|許可公開view、source binding、strict schema|
|`tools/proxy_equivalence_outcomes.py`|候補ごとの確定prefix、台帳、残存義務、完全性|
|`tools/proxy_equivalence_proofs.py`|identity一致、双方向依存閉包、相殺/残差証明|
|`tools/proxy_equivalence_selection.py`|414へ接続、116記録、別wrapper再検証|
|`tools/proxy_equivalence_evaluation.py`|313入力、群別集計、三方式比較、保存検証|
|`tools/proxy_equivalence_trajectory.py`|明示opt-inの新4runと独立再生、既存8runとの対照|
|`tools/test_proxy_equivalence_*.py`|上記6責務に対応する6テストモジュール|
|`tools/proxy_resource_value_trajectory.py`|Task 6だけで既存default不変の明示選択接続点を追加|
|`data/proxy-equivalence-pilot-447/`|実装後の追加成果物予定。番号が使用済みなら最新番号へ進め、過去を上書きしない|

既存の `proxy_resource_value_inputs.project_visible` は手札/盤面/捨て札/legacy予約等を投影するが、新契約が必要とするruntime効果と継続制御の完全な投影ではない。114 strict viewへfieldを足さず新入力層を作る。既存 `proxy_resource_value_comparison.compare_problem`、`proxy_resource_value_selection.select_problem`、116 validatorは変更せず使用する。

各TaskはRED→最小実装→GREEN。各TaskのGREENをローカルcommitに保存し、GitHub checkpointは共通証明基盤完成・比較完成・最終検証にまとめる。以下の `python -m unittest discover` はrepo rootから実行する。

### Task 1: 公開入力と証拠の完全性

**Files:** Create `tools/proxy_equivalence_inputs.py`, `tools/test_proxy_equivalence_inputs.py`（上記prefix）。

**Interfaces:** `project_equivalence_view(continuation: dict, actor: str, public_history: dict) -> dict`; `build_input(view: dict, inventory: dict, baseline_problem: dict, source_manifest: dict) -> dict`; `validate_input(value: dict) -> list[str]`。完全state/raw hashは外側audit envelopeだけ。下流はbuild_inputの結果のみ受け取る。

- [ ] **REDを書く。** `test_hidden_permutation_invariant` は相手手札/山札順/裏向き本文だけ入替え `assertEqual(view_before, view_after)`。`test_discard_egg_runtime_control_preserved` は公開現物、runtime payment/stat/conditional、予約、使用権利、priority/chain/return/連続pass/終了入口を各1fieldずつ変更し投影差を検出。未知schema/重複候補/候補detail不足/不正bool数値/参照切れは `assertRaises(ValueError)`。
- [ ] **RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_inputs.py' -v`。未実装API由来の失敗を保存。
- [ ] **最小実装。** fieldごとの公開根拠を01/06/64/114/116/119と既存継続契約へ結合。公開が既存契約で許可されないfieldを写さず、必要ならcoverageにunknownを残す。保存stateに存在することだけを公開根拠にしない。source_manifestは相対path/raw SHA、比較入力は許可view SHAへ結合。source検証は既存 `validate_sources` を再使用。
- [ ] **GREEN確認。** 同コマンドと既存 `test_proxy_resource_value_inputs.py` を実行。正当なunknownと欠落/不明fieldによる構造errorを別に検証。
- [ ] **Commit。** 新2ファイルのみを追加し `test: define public equivalence input boundary` を保存。

### Task 2: 公開確定prefixと完全な残存台帳

**Files:** Create `tools/proxy_equivalence_outcomes.py`, `tools/test_proxy_equivalence_outcomes.py`。

**Interfaces:** `derive_outcomes(equivalence_input: dict) -> list[dict]`; `validate_outcome(outcome: dict, equivalence_input: dict) -> list[str]`。candidate_id順、1候補1outcome。outcomeは445§11のcandidate_outcomeを具体化し、`boundary`, `atoms`, `dependencies`, `unknowns`, `coverage`, `certain_prefix_proofs`を必須とする。各atomはidentity/owner/controller/zone/source/target/text revision/value/lifetime/order/uses/dependency refsを型固定。適用しない属性もschemaで明示し、暗黙省略を同値根拠にしない。

- [ ] **REDを書く。** `test_same_instance_stays_identified` はcopy/instance/系譜とevent/effect IDの保持。`test_empty_requires_coverage` は未列挙を空扱いしない。`test_pass_keeps_pending_end_response` はpass後の優先権/終了/期限義務を保持。`test_unknown_reveal_stops_prefix` は未公開ドロー/めくり前で停止し未知義務を出す。`test_discard_and_egg_are_not_deleted` と `test_runtime_effects_not_legacy_reservations_only` はTask 1 viewから全残存要素が台帳へ出ることを検査。
- [ ] **RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_outcomes.py' -v`。
- [ ] **最小実装。** 行動種別/既存効果契約をkeyとする共通dispatchを作る。各handlerに読取field・更新field・正本refs・停止境界・完全性の根拠を登録。登録済みの公開確定prefixだけを記述し、任意response/未確定必須選択へ踏み込まない。既存engineを非公開state付きで仮実行して観測結果を証明に流用しない。未対応handlerは `generator_unsupported`、非公開結果/戦略的不明は別reason。候補・残存要素を削除しない。既存上位証拠との矛盾はerror。
- [ ] **GREEN確認。** 同コマンドとTask 1。合法な候補で生成未対応なら、baseline証拠を維持する保守的接続が可能なことをTask 4へ渡す。専用カードID/軌跡IDをdispatch keyにしない。
- [ ] **Commit。** 新2ファイルのみを `feat: derive public residual outcome ledgers` で保存。

### Task 3: 同一現物の依存閉包と相殺証明

**Files:** Create `tools/proxy_equivalence_proofs.py`, `tools/test_proxy_equivalence_proofs.py`。

**Interfaces:** `prove_pair(left: dict, right: dict, equivalence_input: dict) -> dict`; `validate_pair(proof: dict, left: dict, right: dict, equivalence_input: dict) -> list[str]`。戻り値は左右candidate_id、matched_atom_ids、dependency_closures、残差、unknowns、hand/board/reservations relations、global blockers、source refs。statusは445どおり `proved_equal / proved_relation / unknown`。

- [ ] **REDを書く。** `test_exact_identity_closed_dependencies_cancel` は完全一致要素だけmatched。`test_same_name_other_instance_not_equal` は同名別copy/再登場をunknown。`test_target_deadline_uses_order_mismatch` は各属性を一つずつ変え相殺拒否。`test_dependency_cycle_complete_vs_missing_edge` は完全一致閉包のみ相殺、未証明辺はunknown。`test_common_world_affects_residual_main` と `test_time_changes_hand_condition` は逆方向作用/時差依存を保持。`test_unknown_symbol_not_identity` は文字列一致だけで相殺しない。
- [ ] **RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_proofs.py' -v`。
- [ ] **最小実装。** source-boundの既存契約から完全依存を列挙できる型だけ証明。未対応本文・未知辺は閉包不完全。同一要素の多重度、意味ある順序を保持し、集合と契約済みの列だけcanonical整列。時差が存在しても必要な全依存の非干渉が証明されるまで他資源equalとしない。残差が空でもboundary差/未割当unknownがあれば優越・完全同値を許さない。新しい包含優越や推移的優越辺を作らない。
- [ ] **GREEN確認。** 同コマンド。左右反転でbetter/worseだけ反転、候補入力順に不変、証明digest改変/atom重複/証明内容改変が再計算で拒否されることを追加検査。
- [ ] **Commit。** 新2ファイルを `feat: prove identity-bound residual equivalence` で保存。ここを共通証明基盤のcheckpoint候補とする。

### Task 4: 414/116への別版接続

**Files:** Create `tools/proxy_equivalence_selection.py`, `tools/test_proxy_equivalence_selection.py`。

**Interfaces:** `select_equivalence(equivalence_input: dict, *, enable_proofs: bool = True) -> dict`; `validate_equivalence(wrapper: dict, equivalence_input: dict) -> list[str]`。wrapperは原problem/hash、証拠bundle/hash、outcomes/pairs、effective_problem、frontier_report、selected_candidate、decision_recordを持ち、Task 1–3から再計算する。

- [ ] **REDを書く。** `test_unknown_retains_seeded_frontier` はunknown残存でseed。`test_proved_equal_uses_existing_tiebreak`、`test_time_only_with_proved_noninterference`、`test_partial_equal_three_candidates_not_collapsed` は445§9の各分岐。`test_safe_free_certificate_not_transferred` は安全配置対passだけ既存証明を維持し、有料候補との比較へ伝播しない。`test_same_frontier_same_seed` はcontext/frontier同一で116記録一致。
- [ ] **RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_selection.py' -v`。
- [ ] **最小実装。** baselineの上位3項目/候補数値を変更せず、証明済み成分だけordinary pairへ接続。global blockerがあるordinary pairは全3非時間成分をincomparableとして優越を防ぐ（component別の詳細はproofへ残す）。116安全配置pairは既存validatorを通し、一般同値へ変換しない。generator未対応はbaselineの有効な証拠と明示unknownを保ち、414の保守的選択へ接続する。baselineと新証拠の矛盾はerror。`enable_proofs=False` はbaselineの414選択を完全再現する検査用対照であり、入力不正を握りつぶす設定ではない。
- [ ] **GREEN確認。** 同コマンドと既存comparison/selection/fallbackのテスト。`choice_kind=normal_action_resource_frontier` を維持しpolicy ID/hashをseedへ入れない。wrapper外selected・inner choice・selected_action・inventory descriptorの不一致、graph循環、unknown fieldはerror。新wrapper独自fieldを114/116 strict recordへ混入しない。
- [ ] **Commit。** 新2ファイルを `feat: connect equivalence proofs to opt-in seeded selection` で保存。

### Task 5: 313同一入力の再比較と群別監査

**Files:** Create `tools/proxy_equivalence_evaluation.py`, `tools/test_proxy_equivalence_evaluation.py`、上記追加dataディレクトリの `reproduce.py`, `manifest.json`, `shadow.json.gz`, `summary.json`。

**Interfaces:** `evaluate_saved(source_root: Path, output_dir: Path) -> dict`; `validate_saved(output_dir: Path, source_root: Path) -> list[str]`。CLI `python docs/card-game/tools/proxy_equivalence_evaluation.py --source-root . --output <new-directory>`。source loadingは既存 `proxy_completed_comparison.load_inputs` と444 `audit` の検証責務を再使用し、入力を再結合する。

- [ ] **REDを書く。** `test_manifest_313_and_groups_241_72` は313を欠落なく保持、241=128+46+8+59と72別表。`test_duplicate_source_decision_rejected` は(run_id,event_seq)/shadow ID重複拒否。`test_zero_reduction_is_valid` は改善0を正常結果。`test_group_label_not_selection_input`、`test_selected_action_binding_rejected`、`test_new_unsupported_row_not_dropped` を追加。
- [ ] **RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_evaluation.py' -v`。
- [ ] **最小実装。** 選択前snapshotからTask 1を作り、後の保存実軌跡を結果証明に使わない。114/414/445列を分離し、72は旧適用限界の理由をそのまま維持。generator unsupported・strategic unknown・boundary/dependency/identity差を別集計。証明改善pair数、frontier変更、fallback、選択差を別計数し、基準群8は独立表。旧方式の選択結果や群ラベルを証明入力に渡さない。
- [ ] **GREEN確認。** 同コマンドと444 audit/443 completed comparisonの関連テスト。313すべての非公開領域順序変更で許可view/証明/選択不変を検証（変更できた領域別件数を保存、過去626を自動転記しない）。新shadowを生成し、構造errorは修正、仕様が一意でない入力だけ理由を記録して他行を進める。
- [ ] **Commit。** 新コードと追加成果物のみを `feat: evaluate equivalence pilot across saved normal decisions` で保存。保存済み443/444の群数との整合と、未実測を0にしない集計を検査。

### Task 6: 実軌跡での別版パイロット比較

**Files:** Create `tools/proxy_equivalence_trajectory.py`, `tools/test_proxy_equivalence_trajectory.py`; Modify `tools/proxy_resource_value_trajectory.py` の `_normal_selection`, `run_route`, `validate_route` の明示接続点のみ。

**Interfaces:** 既存 `run_route(initial, policy_id)` / `validate_route(result, initial, policy_id)` はkeyword-only `normal_selector=None` を追加。指定できる組は新policy IDとTask 4選択adapterのみ。defaultは既存2policy、未知IDはerror。`_normal_selection` も同keywordを受け取り、run/validateから明示的に伝播する。adapter signatureは `select_normal(state: dict, initial: dict, history: dict) -> dict`、戻り値は既存 `apply_selected` が受け取るrecord形式。新moduleの `run_equivalence_routes(data_dir: Path, output_dir: Path) -> dict` が初期4経路を読み、adapterと独立再実行を渡す。process-global monkeypatchや候補/route別切替はしない。

- [ ] **REDを書く。** `test_default_two_policies_unchanged` は既存run API/default出力を維持。`test_new_policy_requires_explicit_selector`、`test_validation_replays_same_selector` はopt-inと再生のbinding。`test_new_route_preserves_end_and_effects` はresponse/mandatory/終了/残存効果が既存engineで処理され、NORMAL証明器の未知を実ゲーム停止にしない。4経路すべて同じpolicyを双方actorへ適用する。
- [ ] **RED確認。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_trajectory.py' -v`。
- [ ] **最小実装。** 既存新policy以外の意味/通常実行/response/mandatory契約は変更しない。Task 4 wrapperから実行用recordへのadapterでsource/view/choice/actionを再結合する。新4runを独立再生し、event/snapshot/hash/state完全一致を検証。停止する経路があっても他経路は独立続行。新裁定でしか解消できない停止は欠測として残す。
- [ ] **GREEN確認。** 同コマンドと既存trajectory/continuation結合テスト。旧114/414の8runを対照再実行し443に照合、新4runを別保存。三方式12run（対照旧8＋新4）、独立balance0と記す。shadowの241母数と実軌跡の可変decision母数を混ぜない。growth/盤面配置/予約とruntime effects/終了までの到達を同じ定義で集計し、形成上の利点維持を先に仮定しない。
- [ ] **Commit。** 接続差分と新成果物のみを `feat: replay separate equivalence pilot trajectories` で保存。旧結果byte差があるなら規則差とせずdefault互換性を調査する。

### Task 7: 節目検証・独立レビュー・GitHub保存

**Files:** 追加dataの `verification/`、新保存報告、`docs/card-game/README.md`の最新索引。既存成果物は書込先にしない。

- [ ] **専用/結合検証。** `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_equivalence_*.py' -v`、影響する既存inputs/comparison/selection/trajectory/audit/completed comparison/continuationテストを実行。成功数は実出力から記録。
- [ ] **全体検証。** 完全checkoutで `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_*.py' -v`、`npm test`、`python docs/card-game/tools/check-design-data.py`。全proxyのmodule/test件数・failure/errorを実測し、過去件数を目標数として固定しない。重い全回帰はここでまとめる。
- [ ] **二重生成。** Task 5/6の全成果物を空の別ディレクトリへ別processで2回生成、canonical JSON/圧縮mtimeを固定しpayloadの保存byte一致。各runの独立再生と別process全再生成は別の検証として記録。比較用入力とhash chain、保存stateを照合。
- [ ] **保護確認。** 実装前manifestと比較し114/505/414/443/444/445、既存fixtures・全過去dataのbyte一致を検査。既存engineの変更はTask 6の明示接続だけ、その他変更が必要なら共通責務と根拠を記録し、ルール変更へ広げない。
- [ ] **独立レビュー1回。** requesting-code-reviewスキルに従い、全差分と検証結果を読み取りレビューへ渡す。指摘は内容確認後、必要ならRED→修正→対象GREEN。重い再検証は影響した証拠だけ更新。未解決事項を隠さず、重要指摘を残したまま完了扱いしない。
- [ ] **永続保存。** fresh remote差分確認→許可pathだけcommit→同ブランチへnon-force保存→remote HEAD/tree/parentとPR259 Draft/open/unmergedをfresh確認。PR本文/コメント送信、merge、採用は行わない。

## 完了判定と判断境界

計画の完了はこの文書の保存・自己点検まで。実装工程の完了には、証明器・別版接続・313比較・新4軌跡と対照8・上記検証・独立レビュー・保存が必要。停止/欠測があれば未完了範囲を明記する。fallback削減0は有効な結果であり、追加スコアや意味論で改善させない。結果が出ても採用しない。

新しい裁定、複数の妥当な比較規則、カード本文/数値/登録区分、114/505/保護対象の変更が必要な地点だけ確認する。既存契約で一意の投影/接続/検証はまとめて進める。最終報告は128/46/8/59/72の区別、証明可能範囲・未対応理由、形成/成長とfallbackの実測、固定4組・balance0を含める。

## 計画自己点検

445§3–5→Task 1/2、§6–7→Task 3、§8–9→Task 4、§10–12→Task 5/6、§13→各RED/受入試験、§14の実装前境界→本446。Review Focusの5条件は各対応Taskへ配置済み。新APIは上記に統一し、歴史結果の再生成を独立標本と数えない。実装は本人がinlineで進め、最後に独立レビュー1回とする案。今回の承認は設計と計画作成までで、実装着手は計画確認後。
