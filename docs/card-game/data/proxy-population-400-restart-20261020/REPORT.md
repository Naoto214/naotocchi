# 固定400戦：停止原因の修復と再開判断（2026-10-20）

対象はPython基盤の固定200組×鏡像400戦だけ。JS版（PR #404/#406/#407）の対戦とは別物で、その結果を代わりに使っていない。本番400戦の実行・承認消費・supervisor起動・worker起動・retry・resumeは**どれも0件**。

## 1. 開始時の正本

- remote main: `db9ea8e8d86c632a68ed8ab4880968803f78a243` / tree `b24d11f8af167b57bcc5da674f07bcdec6db6e1d`
- 固定400戦系の最終commit: `0a9df8f09b5ad657730f29d14e2d357241dace8c`（history-fix回帰証跡）。それ以降の `docs/card-game` 変更は `f76c5866`（2026-10-19、01/02のたまご配置文言のみ）だけ。
- PR #259（design/card-pool-master-20260914）は**マージ済み・closed**。

### mainを起点にできない理由

`f76c5866` は `01-core-rules.md` と `02-main-system.md` を書き換えた。改訂文自体は「配置・表示だけで、ドロー・返却・たんじょう条件・効果・状態遷移は変更しない」としている。しかしPython基盤は凍結468 source anchor（`data/proxy-population-runtime-468/sources.json`、853ファイル）でルール文書のバイト一致を検査する。そのためmain上では `runtime source differs: 01-core-rules.md` で即停止する（診断で確認済み）。anchorを更新すると凍結sourceの変更になり禁止事項にあたる。そこで本ブランチは `0a9df8f0` から作成した。固定400戦は2026-10-14時点のルール文面に対する検証のままになる。

## 2. 引き継ぎ状態（GitHub証跡で確認）

| 試行 | 出力先 | 結果 | 停止原因 | 修正 |
|---|---|---|---|---|
| 第1回 2026-10-12 | `proxy-population-400-run-20261012` | 第1戦 incomplete（184step、R8 turn_end） | C-batの終了証明欠落 `unresolved_expiration`/`missing_growth_reach_history` | `66199f49`（positive終了証明） |
| 第2回 2026-10-13 | `proxy-population-400-rebound-run-20261013` | 第1戦 incomplete（245step、R10 normal_action） | `prior field-entry history not captured by conditional root`（再登場履歴ガード） | `542ab53b`（reentry guard） |
| （承認6159857990） | — | worker未起動 | 起動前のGitHub API読取失敗 | `873e8cd2`（bounded read） |
| 第3回 2026-10-14 | `proxy-population-400-bounded-read-run-20261014` | 第1戦 record_unverified（worker exit 1） | `KeyError: 'A-035#2'`（旧quick分類器が再入場後継IDを参照） | `2ec0c668`（history replay分離、1149テストPASS） |

3回とも別の原因。ただし第2回と第3回は、どちらも物理カード再入場（incarnation、`A-035` = I-sleepboost1）の経路で起きている。累計は**着手1・完走0・未完了1・未実施399**で、報告値と一致した。途中まで進んだ試行を完走扱いにはしていない。

## 3. 今回見つけた第4の停止原因と修正

`2ec0c668` の修正版で第1戦（group-001-A-first）を診断実行すると、R10最終比較で `RouteIntegrityStop: instance_zone_duplicate_or_missing` の例外になった。本番であればworkerが異常終了し、第4回の停止になっていたはずの経路である。

- 実証：失敗時の状態をダンプした（`diagnostics/zone-dump-group-001-A-first.json`）。Aのカード辞書には退役した前身 `A-035#1`（I-sleepboost1）が残り、ゾーンには現役の `A-035#2` だけがいる。重複も欠落もなく、現役80/全81キー。incarnation契約では正しい状態である。
- 原因：通常stepの検証器 `_verify_extended_step` は、incarnation scopeで「registryで証明した現役IDだけに射影する」adapterに包まれている。ところが `proxy_population_turn_boundary.replay` のR10最終比較だけは、旧122の `_verify_step` を直接呼んでいた。
- 修正（`aee9186d`）：`proxy_population_incarnation_runtime.py` のscope内に限り、`r10_final_comparison` 遷移で、かつ前身IDを保持している状態だけを対象にした。対象の状態では、先に次の3点を確認してから、旧検証器に現役ビューを渡す。
  - registry保存則（`life.check`）
  - カード辞書の不変
  - 全状態のhash鎖
- それ以外の呼出、再入場のない試合、既に射影済みの状態は、旧検証のまま変えていない。`turn_boundary.py`（凍結468）、ゲームルール、カード効果、policy、seed、manifestは変更していない。
- 途中で見つけた自分の誤り：初版adapterは、`verify()` が射影した後継IDだけの状態まで世代欠落と誤判定した（第1戦がturn_endで `missing incarnation metadata generation` 停止）。`retains_predecessor` 判定に直し、この実経路を再現するテストを追加した。

### TDD

- `verification/final-comparison-red.log`：修正前ソースで、正テストが本番と同じ `instance_zone_duplicate_or_missing` を再現。
- `verification/final-comparison-projected-red.log`：初版adapterで、射影状態テストが `missing incarnation metadata generation` で失敗。
- `verification/final-comparison-green.log`：7テストPASS。前身保持時の通過、scope外での旧検証維持、他遷移でのzone失敗維持、現役欠落と偽造退役メタデータの拒否、hash鎖改ざんの拒否、射影状態のpass-through、scope復元を確認。
- `verification/related.log`：関連14モジュール69テストPASS（凍結source・認証契約不変テストを含む）。
- 全回帰は `verification/regression-summary.json`（§6）。

## 4. 固定条件の照合（`verification/condition-check.json`）

- 7成果物（manifest/material/operation/edition/historical-registry/completion/sampling-journal）は、凍結commit `e40a2dd2` からblobが変わっていない。
- 200群・400行・実行順400・policy roots 200は不変。各群はA先攻とB先攻の鏡像になっている。policy版は mandatory_random_policy.v1 / normal 114_with_116 / response 119。
- 診断用の派生manifestは既存の `execution_binding.derive()` で作った。原本との差は `source_versions` だけで、他の全キーはcanonicalに一致する。
- Python識別子は固定値 `3.12.14 (main, Aug 25 2026, 14:00:49) [Clang 22.1.3 ]` に完全一致させた。入手元は python-build-standalone `20260825` の `cpython-3.12.14+20260825-x86_64-unknown-linux-gnu-install_only.tar.gz`（sha256 `cbdd2f0c…58f7e3`）。この環境の既定3.12.3では、edition検査が `Python identity differs` で必ず失敗する。
- 診断ツリーの `docs/card-game` tree `aa179ab3…` は、push済みブランチと一致している。

## 5. 診断実行（本番ではない・400戦の完走数に算入しない）

`diagnostics/diag_run.py.txt` は、`connected.reconstruct(bundle, match_id, 512)` を隔離された一時出力先で直接呼ぶ。承認・claim・supervisor・本番出力先には触れない。勝敗・そだち等の対戦結果は集計していない（JS版と同じく、固定400戦の代替結果にしないため）。

- 第1戦・第2戦（group-001の鏡像ペア）は**両方とも完走**した（241step/307event、191step/250event）。
- 2回の独立実行でrecordのSHA-256が一致した（`9eee19c7…`、`3f30a094…`）。tools指紋は実行の前後で不変。
- 実行順の先頭からのセンサスは `diagnostics/census.json`。このcommit時点で22行を終えた。内訳は完走8・境界停止13・例外1で、未実行378行は未知のまま扱う。

センサスで見つかった停止区分（未対応の証明境界はfail-closed）：

| 区分 | 例 |
|---|---|
| 応答sourceのpredicate coverage不足 | `A-020#1` = W-city（第3・4行） |
| typed application timing 証拠不足 | 第5・10・12行 |
| resolution choiceのbatch capability未証明 | I-bowtie（第8行） |
| 六段階終了証明不足 `unresolved_expiration`/`missing_growth_reach_history` | 第14・17・18行 |
| automatic output binding不一致 `native final hash differs` | 第11行 |
| **例外** `ValueError: ordinary processing before pending source obligation` | 第9行 group-005-A-first（本番ならworker異常終了） |

supervisorは最初の非完走行で停止する設計である。したがって、今の修正版で本番を起動すると **第1・2行は完走、第3行（group-002-B-first）でW-city境界により停止** する見込み。

## 6. 回帰

**215モジュール・1156テスト、全件PASS（全モジュールexit 0）。** 内訳は前回の214モジュール/1149テストに、今回の1モジュール/7テストを加えたもの。1モジュール1プロセスで、凍結ツリー（=ブランチ）上でPython 3.12.14を使って実行した。詳細は `verification/regression-summary.json` と `verification/regression-logs.tar.gz`。

- 初回は2モジュールが失敗した。原因はローカルcloneがshallowで、履歴commit `a5a475f0` が無かったこと（環境要因）。unshallow後に同モジュールを再実行した。初回ログは `verification/regression-shallow/` に残している。

## 7. 本人承認ゲート

既存規則（`plans/2026-10-10-external-approval-trust-decision.md`、`plans/2026-10-14-bounded-approval-reads.md`、`plans/2026-10-12-execution-rebinding.md`）では、次の手順が必要になる。

1. 新editionの証拠保存
2. edition capture
3. binding/派生manifestの公開
4. canonical requestの公開
5. 本人（Naoto214 / 323909980）がPR上で完全一致の文面をコメント
6. claim-only commit
7. supervisorを1回だけ起動

承認不要とする規則は存在しない。さらに `tools/proxy_population_external_approval.py` は `PR=259` を固定しており、PRが `open`・`draft`・未マージで、head が承認時のcommitと一致することを要求する。PR #259はマージ済みなので、**現行コードではどの本人承認でも起動ゲートが fail-closed になる**。承認の場所を変えるにはP13（承認権威）契約の変更が必要で、これは本人の判断事項である。本作業では変更していない。

以上から、本作業は正式実行の直前で停止した。新しいrequestの発行、本人コメントの代筆、承認消費は行っていない。

## 8. 未解決事項

1. 承認権威の移転（PR #259 → 新Draft PR）の採否と、その実装・テスト。
2. センサスで見つかった各証明境界の実装。各カード・各経路について、証明を追加する作業になる。条件緩和では解決しない。
3. 第9行の例外（pending source obligation）の原因調査。
4. センサスの残り行。
5. 本番400戦は逐次実行で、1試合およそ2〜7分（診断実測）。全行が完走すれば約15〜40時間かかる。
6. 固定400戦の文面は2026-10-14時点のルールである。10-19の表示限定改訂との意味的同一性は改訂文の宣言に基づく判断で、Python基盤で再証明したものではない。
