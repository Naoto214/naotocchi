# 固定400戦：安全な中断復帰（C案）の実装・検証・実行時間（2026-10-23）

設計と契約の変更点は `plans/2026-10-23-fixed400-checkpoint-resume.md`。本書はその検証証跡の索引。**正式400戦は実行していない**（supervisor・worker・承認消費は0。承認 `6356164698` は消費済みのまま再利用しない）。main マージ・本番 Pages 更新もしていない。

## 1. 保護した過去の記録

- `data/proxy-population-400-final-run-20261023/`（第4回：第1試合 completed、第2試合は開始直後に消失）と `…-stop/STOP.md`、claim `data/proxy-population-approval-consumption/6356164698.json`、binding 公開 `609d525a`、edition `33cb2f85`、凍結468 source、診断400戦（`proxy-population-400-rediagnosis-20261022/`）はいずれも変更していない（`git diff` で差分0、`proxy_population_checkpoint_supervisor.verify_protected` が再開のたびに Git blob と照合）。

## 2. 実装

| ファイル | 役割 |
|---|---|
| `tools/proxy_population_checkpoint_ledger.py` | 行チェックポイント（`fixed400_row_checkpoint.v1`）の作成・再検証・hash 鎖。保存バイトから全束縛を再計算し、保存済みエントリを信用しない |
| `tools/proxy_population_results_store.py` | 結果ブランチ `fixed400-results/<attempt>` へ1行1コミットで追記・即 push。force・amend・削除なし。exact commit だけを読む |
| `tools/proxy_population_checkpoint_supervisor.py` | 起動／再開の事前確認（新承認・edition・manifest・台帳・順序・重複・未完了・保護原本）、最大4並列、予定順の厳密なチェックポイント、停止規則 |
| `tools/proxy_population_checkpoint_operator.py` | 世代0／世代n の request v3 作成、照合、消費、起動を既存ゲートの合成だけで提供 |
| `tools/proxy_population_external_approval.py` | request v3（v2＋`resume` 束縛）。本文形式・本人・未編集・未取消・未消費・1回限りの検査は不変 |
| `tools/proxy_population_launch_authorization.py`／`proxy_population_attempt_runner.py` | `resume` 束縛を worker まで通し、行ごとに v3 request を再導出して start.json と照合 |
| `tools/proxy_population_incarnation_runtime.py`／`proxy_population_start_obligations.py` | 出力同一のホットスポット修正（§4） |

## 3. 中断復帰テスト（`verification/checkpoint-resume-scenarios.log`、18件 OK）

| # | シナリオ | 結果 |
|---|---|---|
| 01 | 1試合完走後に次行が未完走で停止 | 行1だけが結果ブランチに1回保存。行3は投入されない |
| 02 | 試合途中でプロセス終了（returncode −9・部分ディレクトリ） | 行2は `record_unverified`、行1の保存は保持、停止 |
| 03 | コンテナ再起動相当（作業領域消失→新しい世代で再開） | 行1–2を再検証して再利用、行3から実行、400/400 完了。行3のエントリは行2に鎖で続く |
| 04 | 保存済み record の破損 | 再開計画が `checkpoint record bytes differ` で停止 |
| 05 | 証拠ファイルの欠落 | `evidence incomplete` で停止 |
| 06 | HEAD（edition）不一致 | `checkpoint entry differs` で停止（別 edition では再利用不可） |
| 07 | manifest（seed）不一致 | 停止 |
| 08 | 承認済み attempt の再利用：同じ attempt を世代0で再起動／承認後に結果ブランチが動いた | `results branch already exists`／`results branch head differs` で停止 |
| 09 | 同一試合の重複登録（台帳・ブランチ） | `verify_ledger` と `append_row` が拒否 |
| 10 | 保存処理途中での停止（commit/push 前に消失） | 行は `persist_failed`、再開計画はその行から再実行 |
| 11 | 永続保存先への書き込み失敗（push 失敗） | 停止・行は `persist_failed`・ローカル証拠は保持 |
| 12 | 正常な再開と最終結果の一致 | 中断→再開の400行と、無中断の400行で全行の決定列・イベント列・最終盤面 digest が一致 |
| 13 | 停止後に完走した後続行 | 順序外ではチェックポイントしない（`completed_not_saved`、再開時に再実行） |
| 14 | 保護原本の改変 | `protected path modified` で停止 |
| req | request v3 の形（並列数・世代・claim・ブランチ名・欠落） | 不正は全て拒否、v2 本文と digest が異なる |

関連テスト（`verification/checkpoint-related.log`）：既存 supervisor・worker・承認ゲート・preflight・incarnation・start catalog 等 18 モジュール 106 件 OK。

## 4. 実行時間（`verification/timing-comparison.json`、`verification/profile-group-001-A-first-80-steps.txt`）

__TIMING__

## 5. 既存400戦との互換性

__COMPAT__

## 6. 次の正式起動に必要な本人承認

設計書 §9 の手順。新 edition の preflight → binding 公開 P → `first_generation_request` → PR #408 への新コメント → claim → 起動。中断時は `next_generation_request` → 新コメント → claim → 起動。いずれも別承認。
