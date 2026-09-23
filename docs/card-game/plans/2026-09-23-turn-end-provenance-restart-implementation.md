# 124 Turn-End Provenance Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 122の4停止点について保存済み117〜122履歴を独立に証明し、123完全性が成立した経路だけ既存正本による終了処理と次の判断へ進める。

**Architecture:** protected rawとhash/seq/source chainを入口にし、履歴effect分類registryから期限・100到達provenanceを再構成する。123の6手順に証拠を重ねた独立validatorが全条件を再計算する。routeごとのdeep copyを次stateへ渡し、各判断/遷移後に該当契約を再監査する。証明できない場合は当該経路だけstop。

**Tech Stack:** Python標準ライブラリ/unittest、既存117/120/122再生器、GitHub Draft PR #259。

**Spec:** `docs/card-game/plans/2026-09-23-turn-end-provenance-restart-design.md`

## Global Constraints

- 120〜123および112/116/117/119の保存済みartifactは読み取り専用。112未実施を維持する。
- 4経路/path/order/card copy専用handlerは作らない。既存正本以外の裁定を足さない。
- owner/public以外の情報を意思決定に使わない。rawのprivate field照合はintegrity用途のみに限定する。
- 123の保存booleanを信用しない。現在stateごとに6手順/12条件、121候補、119応答を再算定する。
- 不明なeffect/timing/期限/100維持/choiceは推測実行せず、当該経路のrules stop。
- seeded fallbackや統制経路を独立balance標本に加算しない。
- JSONはUTF-8 indent 2 LF 末尾newline1件、builder bytesと保存bytesの直接一致。
- 全proxyで既知117旧テストの190対263差は変更しない。

## Review Focus

1. 117/120/122のraw/source hash/seqを一箇所改変すれば全体errorで、routes stopへ吸収しない。
2. 任意の保存booleanをtrueへ変更しても123独立validatorで偽と判定する。
3. event列途中の100到達・減少を最終値だけで否定しない。未知effectはstop。
4. 通常終了後に時を0へ消去しない。後攻終了のみラウンド期限と次ラウンドを処理する。
5. 一経路の合法性不足・handler不足は他経路の再開を止めない。

## File Map

- Create `docs/card-game/tools/proxy_turn_end_provenance_restart.py`: source連続検証、効果registry、現stateの123再監査、独立route再開、JSON builder/validator。
- Create `docs/card-game/tools/test_proxy_turn_end_provenance_restart.py`: Task毎のRED/GREEN、故障注入。
- Create `docs/card-game/data/proxy-turn-end-provenance-restart-plan-124-20260923.json`: 入力参照・route別証拠・判断。
- Create `docs/card-game/data/proxy-turn-end-provenance-restart-evaluation-124-20260923.json`: 実測集計。
- Create `docs/card-game/data/proxy-turn-end-stops-124/stop-124-*.json`: 真正停止した経路だけ。
- Create `docs/card-game/124-turn-end-provenance-restart.md`: 実測報告。
- Modify `docs/card-game/tools/check-design-data.py`, `docs/card-game/README.md`: 124専用gate/index。
- Update PR #259本文 after GitHub保存。

### Task 1: protected source continuity

**Interfaces:** `load_sources(data_dir: Path = DATA) -> dict`、`validated_history(path: str, inputs: dict) -> dict`。routeの117初期stateから122 terminalまでseq/両hashの連続したsnapshotとaction listを返す。

- [ ] RED: `test_protected_raw_and_hash_chain`で117 builderの初期state/3 event、120全snapshot、122終端を順につなぎ、4経路のseqを9/7/7/7と照合。122 rawの1 byte、120中間hash、欠落eventをそれぞれ改変してerrorを確認する。module未定義の失敗を観測する。
- [ ] GREEN: 既存117/120/122 validatorと固定raw SHAを再利用する。saved planの122 eventはbefore/after SHAとsnapshotとを連鎖確認する。全snapshotのgame/continuation両hashを再計算し、source stopのraw/state/seqに接続する。private情報を選択の比較材料へ渡さない。
- [ ] 専用test GREEN後、Task 1だけcommit。

### Task 2: effect and growth provenance

**Interfaces:** `derive_provenance(history: dict, text_registry: dict) -> dict`。各event action/card IDのtiming分類、期限・予約のactive ledger、全snapshot growthとevent内の可能な増減、未知sourceを返す。

- [ ] RED: `test_r1_history_has_no_due_expiration_or_100_reach`で4経路の各eventを本文/handlerと照合。E-first-date即時+5のみを記録。未知action/card、途中で100→95となり最終値95の模擬handler、非空期限効果、instance mapping破損を空扱いしない。
- [ ] GREEN: event action registryは初期ドロー/たまご交換/時0人物配置/response activation/pass/E-first-date resolve/通常passに既存正本と既存handler参照を持たせる。配置時の盤面card IDはcard ID分類registryで解決し、本文が期限・予約を作る場合は別証拠がなければstop。100到達は全中間結果も含む既存handler由来のgrowth deltaから導出する。毎event後の保存stateと突き合わせる。未知action/cardは一般stop。
- [ ] 専用test GREEN後、Task 2だけcommit。

### Task 3: 123 current-state completeness adapter

**Interfaces:** `audit_current_turn_end(stop: dict, provenance: dict) -> dict`、`validate_current_turn_end(audit: dict, stop: dict, raw: bytes, provenance: dict) -> list[str]`。旧123保存JSONは変更しない。

- [ ] RED: 123の6stage/12checkを全4現stateで再計算するテスト。provenance/boolean/期限/board分類/target改ざんはvalidator拒否。未知効果やprivate根拠があればfalse/stop。保存された旧123 falseを入力にした場合でも再計算値のみ採用。
- [ ] GREEN: 123列挙器のstage/ID/registryを再利用し、完全履歴の空期限・growth reach証拠で以前未証明のstage 4〜6とprojection/情報境界を更新する。stage 1〜3も毎回現在stateから再列挙する。12件すべて真・stop code空の場合のみcomplete=true。validatorはraw/sourceを再検証し、auditを新規生成して完全比較する。
- [ ] 専用test GREEN後、Task 3だけcommit。

### Task 4: supported turn-end transition and independent continuation

**Interfaces:** `run_route(stop: dict, sources: dict) -> dict`、`run_all(inputs: dict) -> dict`。routeは他routeと共有可変stateを持たない。

- [ ] RED: 4件を各122同一state/hashから開始し、completeness trueの時だけ終了手順を一度適用する。時を消去しない、R1で勝者なし、actor交代、後攻ならラウンド進行。unknown期限/trigger/handlerを1 routeへ注入しても他3 routeが独立に進む。次判断は121/119/107/114/116を再呼出しし、証明不能なら当該route stop。
- [ ] GREEN: 01/06/64で証明された空終了手順とR1勝利なしを共通handlerとする。event/hash/snapshotを同時に作成し、ターン開始の時回復・1ドロー・たまご交換/予約/誘発を既存handlerで証明できる場合だけ進める。未対応判断は具体的な欠落と正本参照を付けたrules stop。状態変更ごとに適用契約を再実行する。4経路/instance IDをhandler条件にしない。
- [ ] 専用test GREEN後、Task 4だけcommit。

### Task 5: artifacts, independent validator, report and GitHub

**Interfaces:** `build_plan(inputs: dict) -> dict`、`build_evaluation(plan: dict) -> dict`、`canonical_bytes(value: dict) -> bytes`、CLI `--write`/`--check`。

- [ ] RED: 124 JSON欠落・1 byte変更・event seq/hash/decision参照の改ざん・completedとseeded/balanceの矛盾を失敗として固定。README/報告/124 gate未整備もREDを確認する。
- [ ] GREEN: plan/evaluation/stopを実際のroute結果から保存し、validatorは再生結果と全bytesを比較。各routeのevent/snapshot/decision、completed/stopped、fallback、balance可否を実測で文書化。124専用checkerを既存gateと別に追加し、旧117テストは修正しない。
- [ ] 124/123/122/121/120/119専用test、各canonical check、全proxy、protected SHA、`git diff --check`を確認。既知117旧testは別報告。
- [ ] 変更対象だけcommit、Draft PR #259へ非force保存、remote HEAD/treeと各重要成果物の再取得bytes、PR Draft/open/unmerged、HEADのworkflow/statusを確認。PR本文を実測値へ同期しmainにマージしない。

## Self-review

Task 1はsource integrity、Task 2は期限とgrowthの履歴、Task 3は123の独立完全性、Task 4は状態遷移後の再監査、Task 5はcanonical bytes/remote保存を担当。Review Focusの5条件は各TaskのREDにある。結果を事前にcompleted 4へ固定しない。正本外の裁定が必要なら該当判断を保留しユーザーへ確認する。
