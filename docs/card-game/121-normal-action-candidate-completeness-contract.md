# 121 通常行動候補の列挙・完全性契約

更新日: 2026-09-23

[承認済み設計](plans/2026-09-23-normal-action-candidate-completeness-contract-design.md)と[詳細TDD実装計画](plans/2026-09-23-normal-action-candidate-completeness-contract.md)に従い、120の4 stop artifactを読み取り専用の監査入力として扱う。121のstatusは`protocol_only_no_match_progress`。120の4経路は再開せず、選択、pass実行、時支払い、state変更、116 fallback、decision/event/snapshot/winner、新stop artifactは作成しない。

## 成果物

- [機械可読contract](data/proxy-normal-action-candidate-completeness-contract-121-20260923.json)：6 source family、12完全性条件、17 reason codeとevidence/正本参照、10 contract stop code、stable ID grammar。
- [4停止stateの監査](data/proxy-normal-action-candidate-completeness-audit-121-20260923.json)：全sourceのinventory、variant/targetのunit、admitted/excludedと全該当理由、候補集合、独立再計算した12条件。
- [builderとvalidator](tools/proxy_normal_action_candidate_completeness.py)および[専用テスト](tools/test_proxy_normal_action_candidate_completeness.py)。

| 120 stop path | unit数 | admitted candidate IDs | complete |
|---|---:|---|---|
| order-01-a-first | 16 | `pass` | true |
| order-01-b-first | 16 | `candidate-play-main-B-001#1-birth`, `pass` | true |
| order-02-a-first | 12 | `pass` | true |
| order-02-b-first | 14 | `candidate-play-main-B-001#1-birth`, `candidate-play-main-B-009#1-birth`, `pass` | true |

card-specificな盤面能力は既存本文で独立通常行動か確定したものだけregistryへ接続する。未分類の盤面能力、未登録candidate ID grammar、正本から確定できないpredicateは推測でexcludedにせず停止する。現在の4 stateに現れるC-chameleonの継続能力とP-cat_ceoの過去の開始時誘発は独立通常行動ではない。

## 検証

`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_normal_action_candidate_completeness.py' -q`、`PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_action_candidate_completeness.py --check`を実行する。`--check`はbuilder再生成bytesと保存JSON bytesを直接比較する。既存の120/119/116/112記録は変更しない。

次のチェックポイントで4経路を独立再開する場合は、120保存済みstate/hashから別の承認を得て開始する。121のcandidate auditは対戦進行や独立balance標本ではない。

## 実測検証（2026-09-23）

- 121専用38件PASS。119専用31件PASS、120専用42件PASS。
- 121 CLI `--write` →別プロセス`--check`で保存JSONと再生成bytes一致。総合`check-design-data.py`は121専用38件と既存120基準263件を分離し、errors 0。
- 全proxy 301件を実行し300件PASS、既存117テスト`test_population_and_checkpoint_112_boundaries_remain_unchanged`だけFAIL。このテストが総合checkerの現在の基準263件を旧基準190件と比較するためで、121候補の検証結果には加算しない。117のテストと保存済み記録は変更しない。
- 120 stopの4 raw SHA、両state hash、event seqは再照合済み。117/120 planの固定raw SHAを検査し、保存済みstepsから現在ターンの公開履歴の不在証拠を導出した。経路の再開・新たな対戦event生成は行っていない。
