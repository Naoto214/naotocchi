# Normal Decision Admission Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 111で予定した通常意思決定4戦の実施前に107 protocolとの適合性を監査し、一意に裁定できない場合は111の停止条件に従ってfixture／completed記録を作らず不足を保存する。

**Architecture:** 107の機械可読protocol、108の既存判断記録形式、113候補順序の入力を比較するread-only admission auditを追加する。候補範囲、判断前状態schema、優先順位比較の三層を検査し、いずれかが不成立なら4戦をdeferredとして保存する。対戦やカード効果の実行は行わない。

**Tech Stack:** Python 3標準ライブラリ、JSON、`unittest`。

**Spec:** `docs/card-game/107-normal-decision-match-protocol.md`、`docs/card-game/111-structural-gap-disposition-and-repetition-scope.md`、`docs/card-game/112-targeted-structural-gap-fixtures.md`。

## Constraints

- 不完全な候補列挙から勝者・候補数・使用数を生成しない。
- 113のfixture、completed記録、判断traceは0件とする。
- 予定していた独立初期順2組×先後鏡像4戦はdeferredとして保持する。
- 112の6 fixtureを変更・実施しない。
- カード本文・数値・登録区分、現行452、登録477を変更しない。

### Task 1: REDで停止契約を固定

- [ ] 3 blocker、completed 0、deferred 4、112維持、破損拒否、保存一致の7テストを書く。
- [ ] 未実装moduleによるREDを確認する。

### Task 2: 入場監査を実装・保存

- [ ] 候補範囲、nested schema、優先順位の差分を計画JSONへ固定する。
- [ ] audit builder／validator／writerを実装する。
- [ ] audit JSONを保存し、専用7テストをGREENにする。

### Task 3: 正本・README・総合検査へ接続

- [ ] 113正本へ停止理由、破棄した無効出力、再開要件を記録する。
- [ ] READMEの最新地点とロードマップを113入場監査へ更新する。
- [ ] `check-design-data.py`へcompleted 0、3 blocker、112未実施を接続する。

### Task 4: 検証とDraft PR同期

- [ ] 専用・proxy全テスト、総合検査、保存一致、`git diff --check`を確認する。
- [ ] 1コミットでpushし、PR本文を113へ同期する。
- [ ] Draft・open・未マージ、リモートHEAD/tree、CI成功を確認する。
