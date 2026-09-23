# 123 Turn-End Completeness Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 122の4停止stateを変更せず、既存01/06/64から終了処理の全sourceと不足証拠を独立再計算するprotocol-only契約を保存する。

**Architecture:** 122 stop raw/hashを検証してから、card ID単位の既存本文分類registryと共通6手順inventoryを生成する。builderとvalidatorは別関数にし、validatorは保存booleanを信用せずstate/本文registryから再生成・照合する。未解決sourceは契約停止として記録し、対戦を進めない。

**Tech Stack:** Python標準ライブラリ、unittest、GitHubのDraft PR #259。

**Spec:** `docs/card-game/plans/2026-09-23-turn-end-completeness-contract-design.md`

## Global Constraints

- 123はprotocol-only。122の4停止stateを再開せず、新decision/event/snapshot/winner/stopを生成しない。
- 既存正本の手順・本文を変更しない。120/121/122、112/116/117/119は読み取り専用。
- card ID分類にpath/order/copy IDを使わない。相手の非公開手札/未来情報は参照しない。
- 破損したraw/hash/seq/schema/mappingは全体エラー。合法性の未証明だけをcontract stopにする。
- JSONはUTF-8、indent 2、LF、末尾newline1件。保存bytesと再生成bytesを直接比較する。
- 全proxyの117旧テスト1件（190対263）は分離し、修正しない。

## Review Focus

1. 122 rawの1 byte変更や二重hash不一致は監査結果でなく例外。
2. 相手の非公開hand/deck順を入力から欠いても公開判定が変わらない。
3. 公開盤面の未知card IDや未知の期限を黙って0件にしない。
4. 保存boolean/stop code/根拠を改ざんしたらvalidatorが拒否。
5. 4停止点の盤面差やactor A/Bにかかわらず共通手順を同じ順で評価。

## File Map

- Create `docs/card-game/tools/proxy_turn_end_completeness.py`: 122入力検証、6手順inventory、独立validator、canonical CLI。
- Create `docs/card-game/tools/test_proxy_turn_end_completeness.py`: 全TaskのRED/GREENおよび故障注入。
- Create `docs/card-game/data/proxy-turn-end-completeness-contract-123-20260923.json`: 共通契約。
- Create `docs/card-game/data/proxy-turn-end-completeness-audit-123-20260923.json`: 4停止state監査。
- Create `docs/card-game/123-turn-end-completeness-contract.md`: 実測と境界。
- Modify `docs/card-game/README.md`: 123への参照のみ。
- Modify `docs/card-game/tools/check-design-data.py`: 123専用gateのみ追加。
- Update PR #259本文 after remote保存。

### Task 1: 122入力の完全一致

**Interfaces:** `load_inputs(data_dir: Path = DATA) -> dict[path_id, tuple[stop, raw]]`。122の4件をpath昇順で返し、`verify_source(stop, raw, expected_sha)`は例外かNone。

- [ ] **Step 1 RED:** テストで4 rawのSHAと両state hash、seq一致を要求し、copyしたraw末尾の1 byte変更、state hash変更、未知instance参照をそれぞれ拒否する。最初はmodule import失敗を確認する。
- [ ] **Step 2 GREEN:** `hashlib.sha256(raw).hexdigest()`、122保存ファイルの固定SHA表、`response_120.game_state_sha256`、`response_120.continuation_state_sha256`、`stop['game_state']==stop['continuation_state']['game_state']`、全領域instance mappingを確認する。122のprivate/unknown fieldsを監査にコピーしない。
- [ ] **Step 3:** 専用`python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_turn_end_completeness.py' -v`でGREEN、Task 1だけcommit。

### Task 2: 6手順のsource inventory

**Interfaces:** `enumerate_turn_end(stop: dict) -> dict`。返却schemaは`path_id, source_stop_sha256, last_valid_event_seq, game_state_sha256, continuation_state_sha256, stage_inventory, contract_stop_codes, completeness_checks, turn_end_set_complete`。stage_inventoryは順1〜6、各`stage, units, empty_reason, state_fields, source_references`。unitは`enumeration_unit_id, source_zone, source_instance_id, card_id, timing, disposition, evidence, source_references`。

- [ ] **Step 1 RED:** 4保存stateの`phase=turn_end`、response空chain/連続pass2、reservations空、pending/activation空、ねこ社長の過去誘発/カメレオンの継続を実stateで確認する。未知盤面card IDと非空予約が空扱いにならない故障注入を追加する。path文字列を変えてもsource分類が同じことを確認する。
- [ ] **Step 2 GREEN:** 06終了6手順を常に順序どおり作る。step1は119 response closure、step2は双方reservationsとdue根拠、step3は公開盤面card ID registry/trigger、step4は期限を表すstate evidence、step5は期限切れtrigger、step6はround/そだち/到達履歴を監査する。`P-cat_ceo`/`C-chameleon`のカード分類は本文参照付きのcard ID registry。保存stateに明示の期限/到達履歴がなく不存在の証拠も作れなければunknownとし該当contract stopを残す。非空の未対応sourceもunknown。ID材料は設計の6成分のcanonical serializationに固定する。
- [ ] **Step 3:** 専用テストGREEN。4件の`turn_end_set_complete`を期待真に固定しない。Task 2だけcommit。

### Task 3: 12条件をvalidatorで独立再計算

**Interfaces:** `validate_turn_end(audit: dict, stop: dict) -> list[str]`。`build_contract() -> dict`、`build_audits(inputs: dict) -> dict`。

- [ ] **Step 1 RED:** booleanを反転、stage順の入替、unit削除、stop code削除、card本文分類改ざん、未知key追加をそれぞれvalidation errorとする。`forbidden_information_used=[]`だけで通らないことを確認する。
- [ ] **Step 2 GREEN:** `validate_turn_end`は入力stopから`enumerate_turn_end`を再実行し、12条件の名前と導出値、全inventory/停止code/projectionを厳密比較する。辞書の未知keyと配列重複/ID衝突を拒否する。保存されたcomplete値を計算入力にしない。`build_contract`は6stage、12check、9stop、01/06/64/72/74参照、scope全件0を列挙する。
- [ ] **Step 3:** 専用テストGREEN、Task 3だけcommit。

### Task 4: JSONと報告、GitHub永続保存

**Interfaces:** `canonical_bytes(value: dict) -> bytes`、`check_outputs(data_dir: Path = DATA) -> list[str]`、CLI `--write`/`--check`。

- [ ] **Step 1 RED:** 保存JSON欠落で`--check`が失敗することを確認し、JSONの空白/CRLF/末尾改行変化を拒否するテストを追加。README/報告未整備で123 gateが失敗するテストを追加する。
- [ ] **Step 2 GREEN:** `json.dumps(...,ensure_ascii=False,indent=2).encode('utf-8')+b'\n'`で2 JSONを生成し、別プロセス`--check`でraw bytes比較。123報告に4経路の実測停止code、planned/completed/decision/event/snapshot/winner/独立標本すべて0、将来の対戦再開は別承認ではなく別checkpointであることを記す。README参照と123専用checker gateを追加し、既存119/120/121/122 gateの数を変えない。
- [ ] **Step 3:** 123/122/121/120/119専用test、121/122/123 canonical check、全proxy、`git diff --check`、保護raw SHAを確認する。全proxyの既知117旧失敗は名前と期待値を分離記録する。
- [ ] **Step 4:** 変更ファイルのみcommitし、Draft PR #259のbranchへ非forceで保存。remote HEAD/tree、2 JSON/Markdownの再取得blob SHA、Draft/open/unmerged、head workflow/statusを確認し、PR本文を実測値へ同期する。mainを更新しない。

## Self-review

Task 1がraw/両hashとmapping、Task 2が6手順・情報境界、Task 3が12条件と保存boolean非信頼、Task 4がcanonical bytes/保護/公開を扱う。Review Focus 5項目は各TaskのREDへ接続した。各TaskでRED→最小GREEN→commit。未確定の既存正本は推測で補わず明示contract stopとする。
