# Board Combination Pilots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 101の`board-combination` 6 fixtureを、107の判断記録形式を持つA先手6件の固定completed記録へ接続し、P97-05のジャンプクエスト不成立を構造的入力不足として明示する。

**Architecture:** 109と同じく、source fixtureの40枚構成とcard copy／initial instance対応を保った決定論的transcript materializerを追加する。完全な対戦エンジンにはせず、計画JSONに固定した行動列だけを状態・event・判断traceへ反映し、出力と再生成結果を検査する。焦点効果の達成／未達と`structural_input_gaps`を、判断不能を表す`unresolved_decisions`から分離する。

**Tech Stack:** Python 3標準ライブラリ、JSON、`unittest`、既存proxy record schema／validator。

**Spec:** 承認済みチェックポイント110設計、および`docs/card-game/101-priority-proxy-fixture-suite.md`、`107-normal-decision-match-protocol.md`、`109-same-name-two-pilots.md`。

## Global Constraints

- 対象は101のA先手`board-combination` 6 fixtureだけとし、各対戦はR10最終比較までのcompleted記録にする。
- 40枚構成、card copy ID、initial instance IDの対応を維持し、必要な前提位置だけ交換する。
- P97-05はカード差し替えでジャンプクエストを強制せず、同一ターン2回のときおくりを作れない構造的入力不足として記録する。
- P97-04の`I-c_egg_normal`は未登録sourceの別stratumを維持し、現行452・登録477へ加算しない。
- 固定6戦は独立した勝率・先後差・発動率・カード強度の標本へ数えない。
- カード本文・数値・登録区分は変更しない。完全な合法性エンジンや対戦エンジンは作らない。

---

### Task 1: 回帰契約をREDで固定

**Files:**
- Create: `docs/card-game/tools/test_proxy_board_combination_pilots.py`

**Interfaces:**
- Consumes: `proxy-board-combination-plan-110-20260918.json`と101の6 fixture。
- Produces: `build_board_combination_suite`、`validate_board_combination_suite`、`validate_materialized_suite`、`write_board_combination_suite`に対する実行契約。

- [ ] 6 completed A先手戦、物理カード対応維持、焦点効果達成値、P97-05の構造的不足、P97-04別stratum、判断欄、hash連続、破損拒否、再生成一致を検査する7テストを書く。
- [ ] `python docs/card-game/tools/test_proxy_board_combination_pilots.py`を実行し、`ModuleNotFoundError: proxy_board_combination_pilots`でREDになることを確認する。

### Task 2: 計画と決定論的materializerを最小実装

**Files:**
- Create: `docs/card-game/data/proxy-board-combination-plan-110-20260918.json`
- Create: `docs/card-game/tools/proxy_board_combination_pilots.py`

**Interfaces:**
- Consumes: 101 fixture 6件、107 protocol、既存validator。
- Produces: record／trace／evaluationの辞書と検査エラー配列。

- [ ] 計画JSONへsource、出力先、位置交換、焦点カード、期待達成／未達、P97-05 gapを固定する。
- [ ] source fixtureから入力を派生し、固定行動をevent・snapshot・decisionへ変換するbuilderを実装する。
- [ ] `structural_input_gaps`、`focus_effects`、`unresolved_decisions`を分離した評価を実装する。
- [ ] suite、判断境界、P97-05 gap、P97-04別stratum、保存ファイル一致のvalidatorを実装する。
- [ ] 専用7テストを実行してGREENにする。

### Task 3: 6 completed記録を保存

**Files:**
- Create: `docs/card-game/data/proxy-matches-110/*.json`
- Create: `docs/card-game/data/proxy-decision-traces-110/*.json`
- Create: `docs/card-game/data/proxy-board-combination-evaluation-110-20260918.json`

**Interfaces:**
- Consumes: Task 2のmaterializer。
- Produces: 決定論的に再生成できる6 record、6 trace、評価1件。

- [ ] `python docs/card-game/tools/proxy_board_combination_pilots.py --write`で保存する。
- [ ] 通常実行で保存済み全文とbuilder出力が一致することを確認する。
- [ ] 既存76＋新規7のproxy testを実行する。

### Task 4: 正本・総合検査へ接続

**Files:**
- Create: `docs/card-game/110-board-combination-pilots.md`
- Modify: `docs/card-game/README.md`
- Modify: `docs/card-game/tools/check-design-data.py`

**Interfaces:**
- Consumes: 保存したrecord／trace／evaluationとテスト結果。
- Produces: チェックポイント110の人間可読正本と全体監査接続。

- [ ] 6群の経路、位置交換、結果、未達、解釈禁止、次の再開地点を110へ記録する。
- [ ] READMEの最新地点、索引、ロードマップを110へ更新する。
- [ ] `check-design-data.py`にファイル集合、物理カード対応、評価境界、P97-05 gap、P97-04別stratum、テスト数を追加する。
- [ ] `python docs/card-game/tools/check-design-data.py`を実行し、エラー0を確認する。

### Task 5: 保存前検証とDraft PR同期

**Files:**
- Modify: Draft PR #259 body（GitHub上のみ）。

**Interfaces:**
- Consumes: Task 1〜4の全変更。
- Produces: 作業ブランチの保存コミット、同期済みDraft PR、成功CI。

- [ ] 専用テスト、proxy全テスト、総合検査、materializer再生成一致、`git diff --check`、変更範囲を再実行・確認する。
- [ ] 変更を1コミットに保存し、作業ブランチへfast-forwardで反映する。
- [ ] PR本文の保存地点を110へ更新し、Draft・open・未マージを維持する。
- [ ] リモートHEAD/tree、変更ファイル、CI成功、PR状態を確認する。
