# Population Contract Validator Implementation Plan — 459

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans。ユーザー指定どおりinline逐次TDD。以下は未着手チェックリストであり、今回は計画保存まで。

**Goal:** 承認済み200群/400戦protocolを機械検査し、証拠不足を適格へ昇格させない共通validatorを作る。

**Architecture:** protocol/manifestの構造とsource結合を純関数で検査し、別moduleで判断・対戦・群・全体を順次審査する。ルールadapter未対応は未証明とし、455〜457の証拠範囲を越える推論を禁止する。生成器/実行器は呼ばない。

**Tech Stack:** 既存Python標準ライブラリ、unittest、既存canonical/hash関数。追加依存なし。

**Spec:** `docs/card-game/459-approved-population-contract-and-validator-plan.md` および `docs/card-game/data/proxy-admission-contract-459/{contract.json,validator-spec.md}`。

## Global Constraints

- docs/card-gameのみ。454〜458、114・A初版・116・119・505・過去結果不変。新方式未採用。
- 予定200群/400戦は精度保証ではない。200 seed pair実生成、初期順固定、400戦実行は禁止。
- 入力生成許可と最終実行確認は別段階。実装完了は実行許可ではない。
- nullをfalse/0へ変換しない。除外と未証明の両方を保持。過去判断を遡及補完しない。
- テスト用の抽象メタデータは本番seed/カード初期順/対戦fixtureとして保存しない。
- 新比較意味論・ゲーム裁定が必要なら該当adapterを未証明のまま止め、具体的な分岐を確認する。

## Review Focus

- caller提供のverifiedラベル、偽source、path escapeで適格化しない（Task1/3）。
- 空集合/片側欠落/重複ID/未実施が全体成功にならない（Task2/5）。
- 正本由来の未発生証明とexecutorに記録がない状態を混同しない（Task3/4）。
- retryが除外を消したり200群を超える標本を作らない（Task4/5）。
- 部分適格の分母が予定400にすり替わらず、全体欄が保留される（Task5）。

## Task 1: 非実行protocol検査

**Files:** Create `docs/card-game/tools/proxy_population_contract.py`, `docs/card-game/tools/test_proxy_population_contract.py`。
**Interfaces:** `load_json(path: Path) -> dict`, `validate_protocol(contract: dict, root: Path) -> dict`。出力はvalidator仕様に従う。

- [ ] unittestで`test_approved_protocol_is_non_executable`を書く。459原契約のvalid=true、balance_admitted=None、executable=Falseと入力不変をassert。
- [ ] `test_protocol_mutations_rejected`で200→199/201、400→399/401、True/200.0、source hash変更、欠落/余剰key、false許可→true、null manifest→objectを各別caseにしvalid=falseをassert。`load_json`のduplicate key/NaNとpath escapeも拒否をassert。
- [ ] `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_population_contract.py' -v` を実行し期待assert理由でREDを保存。
- [ ] 正規JSON/schemaと保存459source anchorを検査する最小実装を書く。承認boolだけを信用せず、codeに固定した459契約artifact hashで信頼anchorを結合。参照在庫pathはdocs/card-game基準のdata/proxy-admission-design-458/deck-reference.jsonで解決できるテストを含める。歴史記録への書込み/乱数/engine呼出しなし。
- [ ] 同コマンドGREENとsource非変更を確認。必要なリファクタ後に再実行。

## Task 2: manifest純検査（生成しない）

**Files:** Task1の2ファイルを拡張。
**Interfaces:** `validate_manifest(manifest: dict, receipt: dict, contract: dict, root: Path) -> dict`。実manifestがない現在はvalid=false。内部で検査責務を分離し、抽象metadataによる単体テストを可能にする。

- [ ] `test_no_manifest_is_not_ready`でnull/空はvalid=false、balance_admitted=Noneをassert。
- [ ] `test_exact_membership_and_mirror`で抽象ID200群/400行（実seed/順序なし）に対する集合・先後検査をテスト。欠落/追加/重複、片側2回、owner交換、両側順序hash違い、偶奇実行順違いを拒否。部分検査PASSでもmanifest全体はvalid=falseとassert。
- [ ] `test_manifest_provenance_not_self_asserted`で自己申告時刻/承認、版欠落、歴史台帳欠落、seed bool/範囲外、現物重複、順序hashのみで内容なしを拒否。
- [ ] Task1コマンドREDを確認し、集合/型/参照/receiptの純検査を実装、GREENを確認。
- [ ] 全順再計算・生成来歴検証に必要な一般化loader/生成器のsource仕様が未固定なら該当gateを未証明とし、実manifest成功例を捏造しない。生成器の別設計/readiness作業として明記する。

## Task 3: 証拠認証と判断gate

**Files:** Create `docs/card-game/tools/proxy_population_admission.py`, `docs/card-game/tools/test_proxy_population_admission.py`。既存455〜457は変更しない。
**Interfaces:** `audit_judgment(record: dict, context: dict, sources: dict) -> dict`。未対応adapterをunprovedへ閉じる。詳細context/source schemaは正本からadapterごとに定義してから接続する。

- [ ] `test_disposition_preserves_all_reasons`で認証済み除外と別gate不足を同時に持つ抽象証拠のexcluded、exclusions/gaps両方非空をassert。
- [ ] `test_seeded_singleton_and_unresolved_or`で真正なsingleton+seededはexcluded、seeded=falseでもstrategic unresolved=trueはexcluded、どちらも欠落ならunprovedをassert。
- [ ] `test_forged_verified_and_unsupported_rule`で未認証source/自己申告verified/未対応ruleはunproved、認証済み改変はexcluded、全gate空はunprovedをassert。
- [ ] `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_population_admission.py' -v` でREDを記録。
- [ ] source/record hash認証とgate reduction、未対応adapterを最小実装。既存record fieldだけから完全合法集合や116陰性を推定しない。GREENを確認。
- [ ] 既存114/116/119から一意に検証できるadapterのみ、個別に誤った前提を拒否するテストRED→実装→GREENを繰り返す。唯一候補も全候補証拠を要求。根拠が正本にないadapterはunprovedで残し、新評価値を追加しない。

## Task 4: 対戦と機会義務・再生証拠

**Files:** Task3の2ファイルを拡張。必要なら新規 `docs/card-game/data/proxy-population-readiness/rule-obligations.json`（ルール根拠が確認できた後のみ）。
**Interfaces:** `audit_match(run: dict, manifest_row: dict, context: dict, sources: dict) -> dict`。

- [ ] `test_recorded_judgments_do_not_prove_coverage`で記録判断全部適格でも義務台帳/途中stateが欠ければmatch unprovedをassert。
- [ ] `test_executor_replay_is_not_rule_proof`で456一致、457連鎖一致だけではunprovedをassert。提供2値が一致しただけのcompare_replayedを真正再生としない。
- [ ] `test_automatic_and_terminal_obligations`で自動処理・pass後response・終了の未証明を残す。trigger不成立を記録欠落から推定しない。
- [ ] `test_attempts_preserve_exclusion_and_conflict`で同一入力/版の中断→検証済み完走を1行のまま扱う。116除外はretryで消えず、完走結果矛盾はexcluded、attempt増加は独立標本増加0をassert。
- [ ] Task3コマンドでRED→最小実装→GREEN。execution_statusとdispositionを別fieldに維持。
- [ ] 対象41ID/共通ルールを正本から棚卸しし、義務ID/trigger/期限/許可view/根拠sourceを設計する。実装器eventから逆算した一覧だけではcoverage verifiedにしない。不可避116陽性が証明されたら実行readinessを閉じ根拠を保存。裁定が分岐する項目は未証明として確認へ戻る。

## Task 5: 鏡像群・予定集合・診断レポート

**Files:** Task3の2ファイルを拡張。
**Interfaces:** `audit_group(group: dict, match_audits: list[dict], context: dict) -> dict`, `audit_population(contract: dict, manifest: dict, receipt: dict, runs: list[dict], context: dict, sources: dict) -> dict`。

- [ ] `test_group_reduction`で両側eligibleのみeligible、片側excludedはexcluded、残り不足はunproved。両側理由保持、片側を独立群として数えない。
- [ ] `test_full_set_gate_is_not_subset_gate`で400抽象行中1除外/1未証明/1未実施の各caseはwhole_set.allowed=falseかつcounts/rates/conclusion全null、適格部分だけdiagnostic_subset_onlyをassert。
- [ ] `test_no_vacuous_or_forged_success`で空集合・199群・401行・重複・事後lock・未承認・自己申告audit一覧を拒否/保留。audit_populationが各層を再検証することをassert。
- [ ] `test_diagnostic_denominators`で分母0率null、完全群と片側区別、116除外の勝者をbalance指標から除くことをassert。
- [ ] `test_pure_gate_all_eligible`で純粋なreducerの抽象条件全充足のみfinite_set_descriptionを許す。このテストを実際の400戦適格証明と報告しない。
- [ ] Task3コマンドRED→実装→GREEN。生runと過去sidecarを変更しないこともassert。

## Task 6: 結合検証・保存・承認境界

- [ ] 新規専用2suiteを実行。455/456/457の既存専用suiteを関連回帰として実行（ゲーム再実行を伴う入口は呼ばない）。実コマンド/件数/対象を保存。
- [ ] 意味のある実装完了点で設計データ検査・npm test、event/snapshot/hashに変更があれば該当state/continuation回帰も実行。全proxy回帰未実施を全回帰PASSとしない。
- [ ] 既存追跡blobの保護、変更がdocs/card-gameのみ、source fingerprint、原記録不変を確認。実際に検証できたgateと未対応gate一覧を保存。
- [ ] 実装完了時に独立レビュー1回。修正はinlineでTDD。checkpointは意味のある完了/判断境界に限定。
- [ ] PR259 Draft/open/unmergedとremote HEAD/tree一致、cleanを確認して保存する。
- [ ] 入力生成も新対戦も開始しない。未証明readinessと次の承認対象を提示。完全manifest保存後の最終実行確認を省略しない。
