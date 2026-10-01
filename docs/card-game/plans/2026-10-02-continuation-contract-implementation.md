# Continuation Contract Implementation Plan — 433

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 432承認設計の共通契約を実装し、旧/新8軌跡を同じ135入力から再実行する。
**Architecture:** 新envelopeが装着先・公開準備情報・使用回数を所有する。共有分類/系譜と候補・確定効果証拠を新しいopt-in runnerから使用する。既存431 runner/114/414と保存結果を維持する。
**Tech Stack:** Python標準ライブラリ、unittest、既存proxy handlers。
**Spec:** [432承認設計](2026-10-02-continuation-contract-design.md)

## Global Constraints

505原本・114正本・414設計・過去保存結果不変。112 fixtures未実行、独立balance0。PR259 Draft/open/unmerged、採用/Ready/merge禁止。inline実装、独立レビュー最後1回。ユーザーは中間工程の追加確認不要と明示しており、この計画保存から実装まで継続する。

## Review Focus

- 装着先・個体再登場・使用回数が旧payload/hashから脱落する問題（Task1/3）。
- 非公開準備カードと非公開山札から証拠が生成される問題（Task1/2/4）。
- メインの種族・段階・任意軽減を単なるカード別例外で済ませる問題（Task2）。
- 合法な未対応効果を候補集合から削る、上位3項目を無根拠に0にする問題（Task2/4）。
- 旧候補scope差とpolicy差の混同、historical再現の改変（Task4）。

### Task 1: 状態・公開view・hash共通契約

**Files:** Create `docs/card-game/tools/proxy_continuation_state.py`, `test_proxy_continuation_state.py`。
**Interfaces:** `create(continuation:dict)->dict`, `validate(envelope:dict)->None`, `state_hash(envelope:dict)->str`, `visible(envelope:dict,actor:str)->dict`, `advance(envelope:dict,continuation:dict,event_seq:int)->dict`, `detach_target(envelope:dict,target:str)->dict`。
- [x] 先に、runtime改変hash検出、相手非公開情報不変、装備の不正target/二重所在/参照欠落拒否、対象離脱で装備破棄、入力不変のテストを書く。
- [x] `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_continuation_state.py' -v`で未実装RED。
- [x] versioned envelopeと厳密なruntime検査を実装。旧continuationをhash対象へ完全包含し、public runtimeを選択viewへ含める。旧validatorを上書きしない。
- [x] 同command GREEN。状態/テストをcommit。

### Task 2: 共有分類・系譜・完全候補・確定効果証拠

**Files:** Create `proxy_continuation_rules.py`, `proxy_continuation_candidates.py`, `test_proxy_continuation_rules.py`（すべて同tools）。
**Interfaces:** `classification(card_id:str)->dict`, `main_transition(current:str|None,destination:str,variant:str,time:int,allowed:set)->dict`, `cost_options(envelope:dict,action:dict,base_cost:int)->list[dict]`; `audit(envelope:dict,history:dict)->dict`, `problem(envelope:dict,inventory:dict,context:dict)->dict`, `select(envelope:dict,inventory:dict,context:dict,policy:str)->dict`。
- [x] 種族/段階/コスト/許可カード、任意軽減使用履歴、mainありtime0のpass証明、完全候補/対象差、未知上位効果停止、非公開順序不変の失敗テストを書く。
- [x] `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_continuation_rules.py' -v`でRED。
- [x] 02/55/77本文と114 tableに結合する純粋ルールを実装。既存候補unit/target grammarと116/414選択を再利用。合法性とhandler coverageは分離し、unknownは明示停止。新view/hashに比較証拠を結合する。
- [x] 同command GREEN。Task1との組合せを検証しcommit。

### Task 3: 装備・通常行動・handler境界

**Files:** Create `proxy_continuation_actions.py`, `test_proxy_continuation_actions.py`。
**Interfaces:** `apply(envelope:dict,record:dict,inputs:dict)->tuple[dict,list[dict]]`, `response_inventory(envelope:dict,initial:dict,events:list)->dict`, `start_attachments(envelope:dict,actor:str)->list[dict]`。
- [x] 装備3対象/準備満杯/不正対象/時不足/入力不変、原子的支払と関係、配置後応答、開始条件・使用済み・たまご中も装備自身の能力、改変選択拒否の失敗テストを書く。
- [x] `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_continuation_actions.py' -v`でRED。
- [x] 新状態契約を消失させないadapterを実装。未知の誘発/発動解決/領域移動はstopとして明示。装備の付け替えやI-bond1置換を勝手に実装済み扱いにしない。
- [x] 同command GREEN、Task1/2と合わせて検証しcommit。

### Task 4: 同一初期入力runner・独立replay・比較と保存

**Files:** Create `proxy_continuation_runner.py`, `test_proxy_continuation_runner.py`; new `data/proxy-continuation-contract/` results/verification; READMEと新番号報告。
**Interfaces:** `run_route(initial:dict,policy:str)->dict`, `validate_route(result:dict,initial:dict,policy:str)->list[str]`, `run_paired(output:Path)->dict`。
- [x] 予定8ID/初期入力同一、全envelope hash、event/attachment改変拒否、停止と結果欠測、旧431結果不変、scope差とpolicy差分離の失敗テストを書く。
- [x] `python -m unittest discover -s docs/card-game/tools -p 'test_proxy_continuation_runner.py' -v`でRED。
- [x] 135から旧handlerを再利用して新契約の下でrunし、初期入力から独立再生。runtimeを無視する旧handlerへ非空runtimeを盲目的に渡さず、対応不能なboundaryを明示停止する。
- [x] 全新専用・既存resource97・npm test・catalog/設計検査・505/raw不変を実測。新8の全結果、旧との差と新policy比較を保存。全913の再実行が必要な既存engine変更は行わない。current test inventoryの検査が新数を要求する場合、現在値だけ更新し歴史190/221/263は維持。
- [x] 最後に独立レビュー1回。重要指摘をRED→GREENで修正して必要suiteを再実行。remote最新HEADへforce=false保存、tree/blob/PR照合。完走を保証せず、停止の不足coverageを明記。
