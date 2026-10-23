# 固定400戦：試合単位チェックポイントと安全な再開（C案）設計書（2026-10-23）

## 0. 背景と目的

2026-10-23 の本番第4回（承認 `6356164698`、claim `babd88f7`、edition `33cb2f85`）は、第1試合が完走した直後の第2試合開始時にコンテナが再起動し、supervisor・worker ともに消失した。従来契約は「途中で環境が消えたら停止、自動 resume・retry 不可」であり、完走済みの第1試合もコンテナ内にしか存在しなかったため、承認からやり直す以外の道が無かった（`data/proxy-population-400-final-run-20261023-stop/STOP.md`）。1試合約22分・直列400試合で約6日という所要時間では、この再起動が一度でも起きれば成果が失われる。

本設計は次の2点を解決する。

1. **試合単位のチェックポイント**：正常完走した試合ごとに、検証可能な証拠（受領書・記録・決定列／イベント列／最終盤面の要約・承認 attempt への束縛）を確定し、コンテナ外（GitHub の追記専用ブランチ）へ即時保存する。
2. **正式な再開契約**：環境が消えても、保存済み証拠を**再検証できた試合だけ**を再利用し、新しい本人承認のもとで未処理の試合から再開する。承認ゲートの各条件（本人確認・本文完全一致・未編集・未取消・未消費・1回限りの消費・HEAD/tree 一致）は一切緩めない。

あわせて、1試合の所要時間を短縮する（§6）。正式ルール・カード効果・CPU判断・凍結 manifest・seed・mandatory choice policy・対戦順序は変更しない。

## 1. 従来契約と新契約

| 項目 | 従来（v2、`proxy_population_batch_supervisor`） | 新契約（v3、`proxy_population_checkpoint_supervisor`） |
|---|---|---|
| 承認 request | `population_external_approval_request.v2`（launch、512 step、retry/resume 不可） | `population_external_approval_request.v3`。v2 の全項目に加えて `resume` 節（attempt ID・元 claim・再開世代・チェックポイント要約・結果保存先・並列数）を束縛 |
| 実行単位 | 1つの supervisor プロセスが400行を直列に実行 | 同じ。ただし行の worker を最大 `parallelism`（1〜4）並列で起動し、結果は予定順で記録 |
| 停止時 | 最初の未完走行で停止。再開不可。以後は新 edition・新承認で先頭から | 最初の未完走行で**新規投入を停止**。実行中の行は完了まで待って記録。保存済みの完走行は再開時に再利用 |
| 保存先 | supervisor の出力ディレクトリ（コンテナ内）。承認対象 HEAD を動かせないため、完了まで push 不可 | 完走行ごとに `refs/heads/fixed400-results/<attempt_id>` へ1コミット追記して push。PR ブランチ（承認対象 HEAD）は動かさない |
| 再開 | なし | 新しい本人承認（v3、再開世代 n）→ claim を PR HEAD の直接の子として保存 → 保存済み証拠の再検証 → 未処理行だけを予定順に実行 |
| `automatic_resume_allowed` / `automatic_retry_allowed` | False | False のまま。再開は常に本人承認付きの手動操作。同一行の自動再試行は無い |
| 過去の承認 | — | 消費済み承認（`6127373548`・`6162350238`・`6356164698` など）は再利用しない。v3 の request は digest が異なるため、旧コメント本文では承認できない |

**変更理由**：数日規模の直列実行で、環境消失が成果全体を無効にする構造を解消するため。**保持する安全条件**：承認ゲート（本人・本文・未編集・未取消・未消費・1回限り・PR Draft/open/未マージ・HEAD 完全一致）、worker ごとの承認再照合、edition の前後検証、1行1プロセス、凍結入力の不変、未完走行の不算入、fail-closed。**新たなリスクと対策**：(a) 保存済み証拠の改変・欠落 → 再開時に全行を再検証し、1行でも検証不能なら停止（§4）。(b) 同一試合の二重計上 → 台帳の schedule_index／match_id 一意性と hash 鎖で拒否。(c) 結果ブランチへの push 失敗 → その行は「完走・未保存」として停止し、再開時に再検証できなければ再実行する。(d) 並列化による順序逸脱 → 結果は schedule_index で記録し、再開計画は常に未処理 index の昇順。欠番は再実行対象になる。

## 2. 用語と識別子

- **attempt**：1つの本番試行。`attempt_id = 'fixed400-' + <最初の claim commit の先頭12桁>`。再開しても attempt_id は変わらない。
- **再開世代（resume_generation）**：最初の起動が 0、以後の再開で 1, 2, …。各世代は独自の作業ディレクトリ `docs/card-game/data/proxy-population-400-attempt-<id>/run-<nn>/` と独自の v3 request・承認・claim を持つ。
- **結果ブランチ**：`refs/heads/fixed400-results/<attempt_id>`。最初の claim commit を起点に、完走行ごとに1コミットを追記する（削除・改変なし）。
- **チェックポイント台帳**：結果ブランチ上の `docs/card-game/data/proxy-population-400-attempt-<id>/rows/NNNN/` に、行ごとの `receipt.json`・`record.json.gz`・`start.json`・`checkpoint.json` を置く。`checkpoint.json`（`fixed400_row_checkpoint.v1`）は次を確定する：attempt_id、schedule_index、match_id、group_id／mirror_side、実行順 digest（`execution_order` の sha256）、manifest sha256、policy_id、edition（commit・tree・sha256）、承認 claim（comment_id・commit・tree）、再開世代、receipt／record／compressed の sha256、決定列 digest・イベント列 digest・最終盤面 digest・勝敗、`completed: true`、直前エントリの sha256（hash 鎖）。

## 3. 保存の流れ（1行ごと）

1. supervisor が行 i の worker（`proxy_population_attempt_runner.run_after_external_approval`、1行1プロセス、従来どおり承認・edition・binding・行／出力先の束縛を自分で再照合）を起動する。
2. worker が `receipt.json`（`execution_status: completed`、独立再構成一致）と `record.json.gz` を書く。supervisor は従来と同じ束縛検査（receipt sha・record sha・bundle sha・match_id・completed）を行う。
3. supervisor が `checkpoint.json` を作り、行ディレクトリを結果ブランチの作業ツリーへコピーし、1コミット（親＝直前の結果コミット）として push する。push は非 force。リモートが先に進んでいれば（他者 push）停止する。
4. push 成功後にその行を「完走・保存済み」として supervisor の予定表に記録する。push に失敗した行は「完走・未保存（persist_failed）」とし、新規投入を止める。

## 4. 再開の流れと安全確認

再開は次の順で行い、どれか1つでも満たさなければ停止する（§5.1〜5.8 に対応）。

1. **新しい本人承認**：再開世代 n の v3 request（`resume.checkpoint_sha256` は再検証済み台帳の digest、`resume.results_ref` は結果ブランチの exact commit/tree）を作り、本文 `NAOTOCCHI POPULATION APPROVAL v1 / stage: launch / request-sha256: …` の新コメントを PR #408 に求める。既存の `verify_live`／`consume_live`／`audit_committed_consumption` をそのまま使う。claim は PR HEAD の直接の子として1ファイルだけ追加する（従来と同形）。
2. **HEAD・tree**：実行コードの edition は元 attempt と同一（`edition.verify` と `checkpoint.json.edition` の一致）。異なる edition での再開は不可（新 attempt になる）。
3. **manifest・seed・policy**：bundle の canonical sha256 が元 attempt の `manifest_sha256` と一致し、`execution_order` digest も一致する。
4. **保存済み完走記録の無欠落・無改変**：結果ブランチの exact commit を fetch し、tree が request と一致すること。各行について receipt／record の sha256、record の schema・match_id・bundle sha・`completed`・`connected_tools_sha256`（edition の tools hash）、決定列／イベント列／最終盤面 digest を再計算して `checkpoint.json` と一致すること。hash 鎖が連続すること。
5. **試合順序**：台帳の schedule_index が 1〜400 の範囲で一意、`execution_order[index-1]==match_id`。再開計画は未処理 index の昇順。
6. **二重計上の禁止**：同じ index または match_id の重複、既に台帳にある行の再実行要求、を拒否する。
7. **未完了行の不算入**：`completed` が true でない行、`result-NNNN.json` だけあって台帳に無い行、`interruption.json` のある行は、再利用せず再実行する。試合途中の状態は引き継がない。
8. **停止原本の保護**：元 attempt の claim 記録、最初の `start.json`、過去の本番ディレクトリ（`proxy-population-400-run-20261012`、`…-rebound-run-20261013`、`…-bounded-read-run-20261014`、`…-final-run-20261023`、`…-stop`）が Git 上の blob と一致すること。

## 5. 承認 request v3 の形

`target` は v2 の項目（manifest／receipt／binding／binding_receipt／original package receipt の sha256、old_edition、execution_order、`reconstruction_step_limit: 512`、`automatic_retry_allowed: false`、`automatic_resume_allowed: false`）に、次の `resume` を加える。

```
resume: {
  attempt_id, resume_generation,
  original_claim: {comment_id, commit, tree} | null (世代0),
  results_ref: {branch, commit, tree} | null (世代0),
  checkpoint_sha256, completed_rows, pending_schedule_indices_sha256,
  parallelism (1..4), owner_approved_manual_resume: true
}
```

`_validate_request` は v3 の形を検査する（世代0では original_claim／results_ref が null で completed_rows=0、世代≥1では全て必須）。本文（`approval_text`）の形式は不変。

## 6. 実行時間

第4回の実測：1行約22分＝承認再照合 約2分（うち旧 edition の歴史監査 65 s、preflight 25 s）＋対局再構成 約9分＋独立再構成による記録検証 約10分。

プロファイル（group-001-A-first、先頭80 step、cProfile）で見えた現行層のホットスポットと対応：

| 箇所 | 事象 | 対応 |
|---|---|---|
| `proxy_population_incarnation_runtime.active_cards` | state.validate のたびに全カード（約160枚）を2回ずつ canonical+sha256。80 step で 227 万回の digest | 同一物理カードの世代が1つだけの群では比較が自明（自分自身との比較）なので digest を省く。複数世代の群だけ従来どおり比較。出力は同一 |
| `proxy_population_start_obligations.catalog` | 呼び出しごとに catalog と全参照 section を読み直して hash 検査（80 step で 2680 回、11万回の `source_section`） | catalog は定数 `CATALOG_SHA` で固定されている。最初の検証成功後はプロセス内で結果を保持し、以後は固定 hash と一致した同じ内容を返す。edition の前後検証が別に走る |
| 行の並列実行 | 直列 | supervisor が最大4行を並列に起動（1行1プロセス・出力先独立・結果は予定順）。CPU 4 基の環境で約4倍 |

worker の承認再照合・独立再構成（記録検証）・edition 検証は省略しない。改善の前後比較は `data/proxy-population-400-attempt-design-20261023/verification/timing-comparison.json` に保存する。

## 7. 実装（ファイル）

- `tools/proxy_population_checkpoint_ledger.py`：行チェックポイントの作成・検証（hash 鎖・決定列／イベント列／最終盤面 digest・edition／manifest／順序束縛）。
- `tools/proxy_population_results_store.py`：結果ブランチの作業ツリー準備、行コミットの追記、push、exact commit の fetch と台帳読込。
- `tools/proxy_population_external_approval.py`：`resume_request()` と v3 検証を追加（v1／v2 は不変）。
- `tools/proxy_population_launch_authorization.py`／`proxy_population_attempt_runner.py`：`resume` 文脈を受け取り v3 request を再導出して照合（worker 側の照合内容は従来＋resume 節）。
- `tools/proxy_population_checkpoint_supervisor.py`：起動／再開の事前確認、並列投入、停止規則、保存。
- テスト：`test_proxy_population_checkpoint_ledger.py`、`test_proxy_population_results_store.py`、`test_proxy_population_checkpoint_supervisor.py`（中断復帰12シナリオ）、`test_proxy_population_resume_request.py`、`test_proxy_population_active_cards_equivalence.py`。

## 8. 今回の承認範囲と次の承認

今回は設計・実装・テスト・時間比較・証跡保存まで。**新契約での正式400戦の起動は別途本人承認**（新 edition の preflight → binding 公開 → v3 世代0 の request → 承認コメント → claim → 起動）。main マージ・本番 Pages 更新は行わない。

## 9. 次回の正式起動手順（新契約・別承認）

1. **tested commit T**：`proxy_population_current_preflight.REPORT` の参照先を新しい報告ファイル名に更新する1行だけの commit（Python 追加はこの commit より前に済ませておく。preflight は tested commit 以降の `.py` 追加を拒否する）。
2. **preflight 証拠 → edition E**：T の全 population/mandatory テスト、test-1A 接続実行、design 検査、独立レビューを `verification/` にだけ追加して commit。`require_operation_ready('launch')` が `preflight_ready: true` を返すこと。
3. **publication P**：E の直接の子として binding.json と manifest.json の2ファイルだけを追加して push（`proxy_population_execution_binding.build`）。
4. **request v3 世代0**：`proxy_population_checkpoint_operator.load_context(repo, P, <binding dir>)` → `first_generation_request(repo, context, <新しい出力先>, parallelism)`。`approval_text` を本人に提示し、PR #408 への新コメントを待つ。**P 以降、claim まで PR ブランチへ commit しない。**
5. **照合・消費・起動**：コメント ID を受けて `prevalidate` → `consume`（claim 1ファイルを P の直接の子として commit・push）→ `run`。結果ブランチ `fixed400-results/fixed400-<P先頭12桁>` が行ごとに伸びる。
6. **中断時**：`next_generation_request(repo, context, <新しい出力先>, {comment_id, commit, tree}=世代0の claim, generation=n, parallelism, workspace)` が結果ブランチを再検証して v3 世代 n の request を作る。本人の新コメント → `prevalidate` → `consume`（claim は現在の PR HEAD の直接の子）→ `run`。
7. **完了後**：結果ブランチを PR ブランチへマージ（履歴保持・改変なし）し、最終分類・再現性比較・報告書を追加する。main マージ・本番 Pages 更新は別承認。
