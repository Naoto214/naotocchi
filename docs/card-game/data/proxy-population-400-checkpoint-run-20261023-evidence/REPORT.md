# 固定400戦 本番（C案・第1世代）：400/400 完走（2026-10-23〜24）

本番出力先 `data/proxy-population-400-checkpoint-run-20261023/` は supervisor が書いた制御ファイル（`start.json`・`supervisor.json`・`request-NNNN.json`・`result-NNNN.json`）をそのまま保存した。行ごとの証拠（`attempt-NNNN/` の receipt・record・start）は、実行中に結果専用ブランチへ1行1コミットで保存済みで、手元のファイルとバイト単位で同一であることを確認した（§4）。PRブランチに同じ1.5 GBを重複して置かないため、この3種はPRブランチにはコミットしていない。本書は追記・修正のない別ディレクトリの記録である。

## 1. 承認と起動

- 本人承認：PR #408 コメント `6365642150`（Naoto214）。publication P `e8e7202ac717b534c81bf304ee3c7ead4c852869`、request v3 sha256 `39925d9cd17322c70ce7bcb9eb5f892ddba3aa98be6a88f5bf8ed1a0244b764d`。
- 正式ゲートで照合：本人・本文完全一致・未編集・未取消・未消費・PR Draft/open/未マージ・remote HEAD = P・tree 一致 → 合格。1回限りの消費を実施した。
- claim：`99237d9098b4ef5b26c336d4b9b09b8773d5a52c`（tree `00afddee95630313a41b98c39aaafdab0fe1ddb1`）。P の直接の子で、`data/proxy-population-approval-consumption/6365642150.json` の1ファイルだけを追加する。
- edition `7d181ce3`（tested `efa46a3a`、preflight_ready true）。manifest は原本と `source_versions` 以外同一（予定順400・seed 200・policy・root）。
- supervisor：2026-10-23T13:17:52Z に起動（`checkpoint_operator.run`、世代0、最大4並列）。`start.json` は launch_authorization_bound=true、errors=[]。
- 実行中、PRブランチの remote head は claim `99237d90` のまま動かしていない（各 worker が行ごとに照合）。

## 2. 結果

| 項目 | 値 |
|---|---|
| status | `completed_fixed_schedule` |
| 完走（completed） | **400 / 400** |
| 保存済み（結果ブランチ） | 400（`persisted_rows`） |
| 未保存の完走行 | 0 |
| 未実施 | 0 |
| 再利用行・再開世代 | 0（中断・resume・retry なし） |
| 所要時間 | 86,165.8 s（約23.9時間、2026-10-24T13:13:58Z 終了） |
| 結果ブランチ | `fixed400-results/fixed400-e8e7202ac717`、head `ca8017b7182a554aadc58e1e3dfe955d75b18b6a`（claim の上に400コミット、force-push・amend なし） |
| 勝敗の内訳 | A 194・B 173・引き分け 33 |

勝敗の数は記録をそのまま数えたもの。全体結論は supervisor の契約どおり `whole_set.allowed=false`・`conclusion=null`、独立 balance 標本0、policy promotion なし。

## 3. 結果ブランチの独立再検証（`ledger-verification.json`）

supervisor とは別のプロセスで、GitHub の結果ブランチ head `ca8017b7` を取り直し、`proxy_population_checkpoint_ledger.verify_ledger` で全400行を検証した（`scripts/post_verify.py`）。

- 400行すべて合格：hash 鎖（`previous_entry_sha256`）、各行の start record、承認 claim `99237d90` の束縛、manifest・edition・512 step 上限・attempt 名。
- 全400行の receipt が `execution_status=completed`。最終エントリ sha256 `713f2f061d165f19fd44b08ba3476aa902daae5b0a5c73035cf14f202944a456`。

## 4. 手元の証拠と結果ブランチの同一性（`attempt-results-identity.json`）

`attempt-NNNN/{receipt.json, record.json.gz, start.json}` の1200ファイルについて、手元のファイルの Git blob と結果ブランチ `rows/NNNN/` の blob を照合し、**1200/1200 が同一**だった。各ファイルの sha256 とサイズも記録している。

## 5. 再現性：診断400戦・baseline との一致（`production-comparison.json`）

試合内容の digest（決定列・イベント骨格・最終盤面・勝敗・停止。`scripts/play_digest.py`）を比較した。record 全体の sha256 は edition 束縛のフィールドを含むので tree ごとに異なる。

| 比較対象 | 一致 |
|---|---|
| 診断400戦 diag31（HEAD `44d54844`、`proxy-population-400-rediagnosis-20261022/`） | **400 / 400** |
| baseline census（凍結木 `c1966ae4`）で完走していた155行 | **155 / 155** |
| 本番第4回の第1試合（`proxy-population-400-final-run-20261023/attempt-0001`） | 一致（diag31 経由。予行時に直接比較済み） |

本番の結果は、別のプロセス・別の時刻に行った診断400戦と全行で同じ対局になった。

## 6. 変更していないもの

凍結468 source、正式カード452種類・効果・数値、正式ルール、CPU判断方式、固定 manifest・seed・policy、予定順序、過去の承認履歴と消費済み承認 `6356164698`、過去の停止記録、診断400戦の証拠。いずれも変更していない（claim は1ファイルの追加だけ。supervisor の `verify_protected` も Git blob で照合した）。main マージ・本番 Pages 更新はしていない。

## 7. ファイル

| ファイル | 内容 |
|---|---|
| `supervisor-run.log` | 起動・終了時刻と最終状態 |
| `ledger-verification.json` | §3 の結果（行ごとの entry sha256・勝敗・event 数） |
| `attempt-results-identity.json` | §4 の照合表 |
| `production-comparison.json` | §5 の行ごとの digest と一致判定 |
| `scripts/` | 起動スクリプト（`run_ckpt.py`）と検証スクリプト。作業領域で実行したため、diag31 と baseline の record は作業領域のものを読んでいる |
