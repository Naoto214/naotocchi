# 固定400戦：残る2件の正式裁定確認・条件付き修正・最終400戦再診断（2026-10-22）

対象はPython基盤の固定200組×鏡像400戦だけ。本番400戦の実行・承認消費・supervisor起動・worker起動は**どれも0件**。この文書と `verification/`・`diagnostics/` は新しい検証結果であり、`proxy-population-400-restart-20261020/` 以下の既存証拠（baselineセンサス、最終分類 `c2e418b9`、155試合の回帰一致、停止trace）は一切変更していない。

## 1. 開始時の正本

- PR #408 branch `claude/fixed400-restart-20261020`、前回報告HEAD `2f4d45a2`（tree `427111e9…`）。origin と一致を確認。
- remote main は `f69310c7`（#417）。固定400戦は凍結468 source anchor でルール文面のバイト一致を検査するため、main はこのブランチへ取り込んでいない（前回報告 §1 と同じ理由）。
- 前回の最終診断の基準 tree：`c2e418b9`（group-200-A-first のみ `d4595213`）。本人判断として残った7行：005-A・030-B・044-B・063-B・106-A・136-B（連鎖解決中の誘発提示）、068-A（R10・メイン不在の E-final-time）。

## 2. 正式裁定の確認

### 判断①：連鎖解決中に成立した誘発の提示

- `06-action-chain-checkpoint.md` 56行：「連鎖解決中に成立した誘発は、元の連鎖終了後の新しい連鎖へ。後続の誘発・反応もすべて終えるまで、次の通常行動へ進まない。」、74–75行【確定】「その場へ割り込まず、現在の連鎖終了後に新しい連鎖として処理。」
- `55-insect-three-lines-card-text-draft.md` M-antlion-06：「自分のターンに、「すぐつかう」でプレイした自分のカードの効果が適用された時、…発動できる。」
- 裁定：連鎖中に成立した M-antlion-06 の発生は、連鎖が空になった直後・次の通常行動の前に**提示すべき**。割り込みではない。6試合で順序監査が `ordinary processing before pending source obligation` で止めていたのは正しく、欠けていたのは実行側の提示だった。

### 判断②：R10・メイン不在の E-final-time

- `91-event-21-card-text-draft.md` E-final-time：「自分のメインが⑧、**または**現在のラウンドがR10の場合、自分の捨て札のメイン以外のカード1枚を対象として発動できる。…この名前のカードは1ターンに1回しか発動できない。」接続注記：「対象がない時は発動不可。…**R10ならたまごでも条件可**、延長は不可。」
- `01-core-rules.md` 201行「メイン不在時は不可。」は ちょうせん／勝負 の節の文で、イベントカード一般の条件ではない。`02-main-system.md` 21–22行はたまご中もメインを必要としない条件は成立しうるとしている。
- 裁定：独立条件「メイン⑧ or R10」は正式仕様と一致し、R10ならメイン不在でも使用可能。凍結列挙器（468 source `proxy_normal_action_candidate_completeness.py`）が前提文に `own main` を含むだけで `required_own_main_absent` を付けていたのが文面と食い違っていた。現行層のhand監査（`proxy_population_hand_predicates`）は文面どおり許可と判定しており、その食い違いで 068-A が正しく止まっていた。

いずれも新しい裁定を要さず、GitHub保存の仕様文面だけで確定できた。中断条件（正式ルール矛盾・証拠破壊・想定外の仕様変更）には当たらない。

## 3. 修正（現行層のみ、凍結ソース・カード文面・効果・policy・seed・manifest は不変）

| commit | 内容 | RED/GREEN |
|---|---|---|
| `0bbad6f1` | **判断②** `proxy_population_final_time_round.py`（新規）：凍結121 adjudicator を scope で包み、E-final-time・手札・`use_event`・唯一の除外理由が `required_own_main_absent`・R10・メイン不在、かつ section hash と前提文を再検証できた行だけ、その理由を外して凍結パイプラインへ戻す（単一対象ID文法→既存の quick-use 在庫で条件・同名1回・時2・捨て札対象を再確認）。`proxy_population_challenge_window.py` の connected scope 列に追加。 | `verification/final-time-round-ten-red.log`（no-op scope で 3 fail）／`-green.log`（8 OK）／`-related.log`（141 OK） |
| `9fc01f20` | **判断①** `proxy_population_trigger_window.py`：`normal_action` へ戻った step で窓を非活性にした後、台帳に pending/deferred の発生が残っていれば活性のまま保つ。発生は直前の step で既に観測済みなので二重観測は起きず、次の step で逐次台帳が提示する。 | — |
| `44d54844` | 同上のヘルパ `unresolved_occurrence()` 抽出とテスト `test_proxy_population_chain_resolution_offer.py` | `verification/chain-resolution-offer-red.log`（`2f4d45a2` の窓で 4 error）／`-green.log`（4 OK）／`-related.log`（89 OK、対象テスト一覧はログ末尾） |

守った制約：誘発の発生条件は変えていない（観測・分類は従来どおり `trigger_observation`／`timing_occurrence`）。連鎖解決中の割り込みは起きない（提示は `chain_status` が空に戻った後の step）。同じ発生は台帳の identity で一意で、二重提示は `ledger.observe` が拒否する。提示は `sequential.step` の在庫（現在述語監査つき）だけで、合法候補が0なら `close_ineligible_triggers` で閉じる。隠匿情報は読まない。

## 4. 7試合の再実行（`9fc01f20`、`verification/owner-targets-e2e.json`）

| 試合 | 前回 | 今回 | 連鎖解決中の発生（`verification/resolution-time-trigger-offers.json`） |
|---|---|---|---|
| group-005-A-first | 停止（pending source obligation） | 完走 181 step | M-antlion-06 origin 163 → event 165 で提示・ineligible（候補0） |
| group-030-B-first | 停止 | 完走 226 step | origin 142→144、186→187（いずれも ineligible） |
| group-044-B-first | 停止 | 完走 265 step | origin 234→235、326→328 |
| group-063-B-first | 停止 | 完走 231 step | origin 190→191、270/271→273、288→290 |
| group-106-A-first | 停止 | 完走 212 step | origin 179→181、216→217 |
| group-136-B-first | 停止 | 完走 218 step | origin 138→140、211→212 |
| group-068-A-first | 停止（normal payment operands differ） | 完走 188 step | — |

- 13件の解決中発生はすべて、連鎖が空になった直後の最初の機会に1回だけ提示され、現在述語監査で `current_condition_cost_or_target_absent`（合法候補0）として閉じた。発動・辞退の選択がプレイヤーに委ねられた例は無い。したがって6試合では**決定候補は増えず**、対局内容は旧記録の停止地点から先が新たに生成されただけである。
- 068-A の最初の分岐点：旧記録（213 event で停止）と新記録は 213 event まで完全一致。seq 215 の通常行動在庫に `candidate-use_event-B-039#1-target-B-036#1`（E-final-time、R10・メイン不在）が加わり、CPU は従来どおり M-antlion-04 のたんじょうを選んだ。E-final-time はその後 event 218 で反応として使用された（この経路は修正前から合法）。

## 5. 全400行の再診断（`44d54844`、tree `bddcfec6`、`diagnostics/final-classification-v2.json`）

| 区分 | 行数 |
|---|---|
| 正常完走 | **400** |
| 本人判断が必要 | 0 |
| 未証明 | 0 |
| 異常終了 | 0 |
| 未実行 | 0 |

- 400行すべてが同一の派生 manifest（bundle canonical sha `85a8a031…`）で、tools fingerprint は各行の前後で不変。1行あたり 233〜881 秒（平均 442 秒）、合計 49.2 CPU時間、4並列で 2026-10-22 08:47〜21:09 UTC。
- 各行の step 数・event 数・record sha・play digest は `final-classification-v2.json` の `rows` にある。

- 実行条件：元の固定 manifest（seed・policy・予定集合不変）から派生した診断 manifest（source version のみ異なる、`require_equivalent` 検査済み）、Python 3.12.14、4並列、`diag_run.py`（診断専用・本番宛先に触れない）。各行に tree HEAD・bundle canonical sha・record sha・play digest を記録。
- 分類の定義：正常完走＝診断実行が `completed`。本人判断＝停止理由が本人判断2区分の文言。未証明＝それ以外の検証停止（returned）。異常終了＝例外。未実行＝summary 無し。

## 6. 既存結果との比較（`diagnostics/final-classification-v2.json` の `comparison_*`、`baseline155`）

| 比較 | 結果 |
|---|---|
| 前回 executable 393 行 | 393行とも今回も完走し、play digest（決定列・event骨格・最終盤面）が**全行一致**。record sha は全行で異なるが、これは record が source version（edition）を含むためで、前回の比較（155行の record sha 変化・play 一致）と同じ性質 |
| 前回 本人判断 7 行 | 7行とも今回は完走。6行（判断①）は前回が例外停止で記録が無く、停止地点以降が新規生成。068-A は旧記録213 event まで完全一致で、以降が新規（§4） |
| 新しい停止・例外 | 0 |
| 決定・event・最終盤面の差 | 前回完走行では差なし。差が出たのは本人判断7行の停止地点以降だけで、いずれも §2 の裁定に沿った変化（判断①：合法候補0の提示と `close_ineligible_triggers` の挿入、判断②：R10・メイン不在での E-final-time 候補の追加） |

詳細は `diagnostics/previous-final-vs-v2-comparison.json`（行ごとの前回分類・今回分類・play 一致・最初の分岐点）。

## 7. 再現性・回帰

- 関連テスト：判断② 141件 OK、判断① 89件 OK（ログは `verification/`）。
- 155試合（凍結tree `c1966ae4` で完走した baseline 行）の play digest 一致：155/155（`baseline155.play_equal=155`、後退0）。
- 前回 executable 393 行の play digest 一致：393/393（後退0、`play_changed_rows=[]`）。

## 8. 最終 HEAD／tree と PR #408

- 診断に使った tree：HEAD `44d54844ad18730638db91f39ccddee33a929c45`（root tree `bddcfec6…`、`docs/card-game` tree `1a85150b…`）。これ以降のコミットは報告書・証拠ファイルの追加だけで、`tools/` は変えていない。
- PR #408（`claude/fixed400-restart-20261020`、Draft、未マージ）。今回のコミット：`0bbad6f1`（判断②）、`9fc01f20`（判断①）、`44d54844`（ヘルパ・テスト）、`ed514104`（7試合の証拠）、`e94ef94b`（報告書下書き）、および本報告書の確定コミット。
- main への取り込み、本番 GitHub Pages の更新、承認 request・消費、supervisor・worker の起動はいずれも 0。

## 9. 本番実行の可否

診断上は 400/400 が完走し、前回完走行に後退は無い。ただし本番起動は今回の作業に含めない。起動には、(1) この HEAD に対する本人承認、(2) 承認ゲート（PR #408 宛て）経由の起動、が別途必要である。診断実行は本番成果ではなく、固定400戦の完走数は引き続き 0 のまま（累計：着手1・完走0・未完了1・未実施399）。

本番400戦の正式実行・mainマージ・本番GitHub Pages更新は今回の作業に含めず、実行していない。承認ゲートは PR #408 宛てのまま、要求も消費もしていない。

## 10. 残る本人判断事項

- 検証基盤側に本人判断待ちの停止は残っていない（本人判断 0 行）。
- 残るのは実行判断のみ：本番400戦の正式実行（HEAD `44d54844` 以降の tools 不変の HEAD に対する承認）、main マージ、本番 GitHub Pages 更新。いずれも別承認。
- 今回の2修正は合法手の集合を変えうる修正（判断②は実際に R10・メイン不在の候補を追加）なので、本番実行前に本人がこの変更内容（§2・§3）を確認すること。
