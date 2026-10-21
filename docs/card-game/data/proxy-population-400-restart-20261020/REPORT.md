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

## 8. 2026-10-21 追記：承認先の移転と証明ギャップの修復

本人指示（10-21）に従い、PR #408 を承認先にし、センサスで見つかった停止区分を「既存の独立監査が証明済みの事実を検証器へ接続する」方針で順に修復した。いずれも fail-closed を維持し、凍結468 source・manifest・seed・policy・停止原本・承認履歴は変更していない。診断実行は本番ではなく、400戦の完走数には算入しない。

| commit | 区分 | 修復内容 | 単体 | 関連 | 診断再実行 |
|---|---|---|---|---|---|
| `7a4d71f2` | 承認権威 | `PR=259`→`#408`（経路allowlist・ブランチ・公開refも同時に移動。本人ID・本文一致・編集禁止・取消検査・open/draft/未マージ・head一致・1回限り消費は不変。#259宛てrequestとコメントは拒否） | 5 | 70 PASS | — |
| `f74b3a89` | six-stage end proof | E-first-date解決のそだちを静的+5ではなく `first_date_effect.audit` の認定値で証明 | 3 | 44 PASS | 10行中7行完走、3行は別区分へ |
| `1641abe0` | timing typed application | M-antlion-06誘発判定を `effect_creation.audit`（474/67：予約生成＝適用）と474 not_applied証拠から認定 | 7 | 48 PASS | 9行中7行完走、E-final-time小区分1行は残存、1行は別区分へ |
| `54b18c5b` | I-bowtie batch capability | 開始連結のカタログ束縛descriptor（77節sha＋凍結rules断片）で解決時無選択ルートを証明 | 5 | 115 PASS | 2行ともステップ通過、turn_endの来歴行欠落へ進む |
| `80a62c49` | W-city predicate coverage | 窓内の応答手札プレイで生じた第2プレイ発生を、既存adapterで実境界に再収集し実受領で閉じる（未使用時の証明形状は不変） | 3 | 65 PASS | 6行中5行完走、turn-start窓の1行は `closed-group source reoffered` へ |
| `f5ba32ed` | I-bowtie 来歴行 | 凍結registry外のI-bowtie発動・ドローに、実受領（`board_group_effect.audit`）と1枚ドロー全差分監査（`draw_effects.audit`）で認定した来歴行を供給 | 2 | 58 PASS | 1行完走、1行は registry 区分へ |
| `a6da7466` | native final hash | 勝負窓内でのE-final-time解決後、凍結の勝負復帰が書き換えない406の最終hash欄を、復帰だけが差分であることを証明してから復帰後eventのhashに束縛 | 3 | 71 PASS | 2行とも完走、対照4行は対局内容一致 |
| `d0a233a8` | incarnation registry | 再入場後、465局所frameは現役射影済みの札図で渡されるため登録簿と一致しなかった。現役射影が一致し全記録が合意する場合だけ完全記録へ解決 | 2 | 59 PASS | 4行とも完走 |
| `8a81e169` | first-date 来歴の重複 | 保存停止履歴の診断（chain_resolutionの行が遮蔽されない経路）で、同一行の二重供給を誤って停止していた。同値行は受理し、矛盾行だけ停止 | 3+1 | 53 PASS | — |
| `3e0574c3` | second-card public source | 盤面群発動の履歴再生が窓のpriority actorで候補列挙していた。相手ターンのW-city第2プレイ群（後置き応答窓、priority=ターンプレイヤーB、発動者A）では凍結述語が `second-card public source differs` で停止。event自身が持つ発動者とoriginを既存adapterと同じ橋渡しで束縛（群originを持たないeventは旧経路のまま） | 2 | 57 PASS | 022-A 完走（work10/work12） |
| `76ed5b0b` | historical quick activation | 手札timing経路（`source_zone:'hand'`、`trigger_origin_event_seq`=相手のバッティング）で発動したG-air-hockeyは、設計上priority actorの通常在庫に無い。実origin遷移の `hand_timing.capture` と条件付き再実行監査を再利用して証明。origin遷移が履歴に無い・origin偽造・候補不在・差分改変は停止 | 2 | 46 PASS | 013-B・016-B 完走（work12） |
| `b3750727` | trigger ledger例外 | 到着群が開いたまま turn_end 境界に達すると（014-A：76でC-bat不適格閉鎖→両者pass→81 `open_turn_end_triggers`）、active経路が終了窓の自群観測を行わず、M-beetle-02 `own_turn_end` が観測・提示されずに `current predicate coverage incomplete` で停止、さらに部分segmentの網羅監査が `saved trigger ledger differs` でその停止を覆い隠していた。active経路も非active経路と同じ観測へ渡し、停止済みsegmentの監査失敗は停止理由を併記 | 1 | 41 PASS | 014-A 完走（work12、開始窓閉鎖と併せて） |
| `0a1f2edd` | closed-group source reoffered | turn-start窓は `closed_start`（C-chicken・開始装備）だけで通常在庫を閉じていたため、窓内の手札プレイで生じ逐次stepで辞退されたW-city第2プレイ群の発動源が通常候補として再提示され、閉鎖監査が正しく停止していた（012-B 243..247、014-A 191..194）。到着群・終了群と同じ `closed_native` を開始窓の到着行にも適用（開始行は従来どおり、pending行は閉じない） | 1 | 46 PASS | 014-A 完走、012-B は次区分（equipment start adapter）へ進み `93281ed2` で修復中 |
| `93281ed2` | equipment start adapter | 開始窓内の手札quick発動の履歴再生が凍結在庫だけで再列挙していたため、I-bowtieを準備済みの開始窓で凍結在庫自身が `equipment start activation/resolution adapter unavailable` を出していた（012-B、253後のturn_end検証）。実stepと同じ `closed_start` の下で再列挙・再発動（turn-start境界のみ） | 1 | 32 PASS | 012-B 完走（work13） |
| `157a05b3` | start effect processing origin | 開始窓内の到着群（W-city）が文脈originを動かした後、C-chickenの解決が「originが開始originと等しい」要求で停止。同ターン・turn-start窓・捕捉開始〜現在のorigin範囲に束縛（再開境界は捕捉開始originのまま） | 2 | 31 PASS | 031-B 完走 |
| `3b1948f2` | `'card_id'` KeyError | paid draw 発動の来歴行に card_id が無く、凍結 end_scope の (kind, card_id) 登録簿が KeyError | 1 | 19 PASS | 081-A は次区分へ |
| `60ce2c12` | archive execution boundaries | 到着群が開いたまま適格終了源なしでターンが替わる結果（277..280）をactive経路が観測せず、旧ターンの台帳が閉じない。ターン境界を含む結果を非active経路と同じ観測へ | 2 | 27 PASS | 028-A 完走 |
| `e022c53a` | incarnation zone（C-chicken） | 再入場後、凍結196のC-chicken解決が122検証器へ退役前身を含む全状態を渡す。R10最終比較と同じ登録簿束縛ビューを単一リンクのC-chicken解決にも適用 | 2 | 30 PASS | 081-A 完走 |
| `e9adca68` | reached cat target | 凍結 next_turn の開始誘発分類が、捨て札になかまがある きまぐれなねこ を拒否。文面hash束縛の開始source catalog（start_kind none）でその拒否時のみ分類 | 4 | 41 PASS | 034-B 完走 |
| `42d02877` | concealed response timing | 凍結の伏せ札応答窓が、現行層の paid draw / きまぐれなねこ 発動起点を知らない。両カード文はメイン除去を含まないため、文面hashを固定・再検証し、凍結の射影本体をそのまま適用（列挙済み起点で凍結関数と完全一致を試験） | 4 | 33 PASS | 032-B は次区分へ |
| `5df9538b`・`a416162f` | replacement origin | 同じ起点が face-up I-bond1 置換分類にも未登録。I-bond1は相手効果によるなかま枠→手札/捨て札だけを置換し、自分のコスト・山札移動を防がないため、凍結分類と同形の行を返す | 1+1 | 31・27 PASS | 023-B/101-A は次区分へ |
| `b1df7af2` | prepared coverage origin binding | 現行の prepared 監査が main/companion 発動起点を公開リンクへ束縛せず未証明扱い。同じ厳密束縛を適用（リンク効果経路は別途検査） | 2 | 30 PASS | 032-B 完走 |
| `c8da1007` | start source negative | 開始誘発源（C-chicken・I-bowtie）の否定証明が、登録済み通常手段の起点に main/companion 発動を含まない | 2 | 31 PASS | 023-B 完走 |
| `831c8fe6` | E-final-time timing verdict | 型付き適用証拠の無い E-final-time 解決で M-antlion-06 判定が停止。文面「そうしたなら」により適用＝target_valid_at_resolution。この受領値を条件付き判定として記録し、記録全体の受理時に既存の designated 全差分監査（受領を規則から再計算し全envelopeを束縛）が同じeventを検証済みであることを必須化（無ければ記録ごと停止） | 3 | 36 PASS | 006-A・101-A 完走 |
| `c64a889e` | duplicate physical copy identity | 凍結 next_turn は465の prepare/apply_choice を名前で取り込み、全状態から egg 交換frameを作る。再入場後は退役前身が残るため重複copyとして拒否。incarnation scope内で、未変更の465操作を登録簿束縛の現役ビューで実行し全カード表を復元（記録受理時の egg_choice_effect 監査が restore_game で導く形と同一） | 2 | 38 PASS | 042-A 完走 |
| `f306426a` | deferred timing application | positive window は解決結果フックで正規化前の生eventにも timing capture を残すため、同じ E-final-time 解決に trace に無い digest の義務が付く。その義務は、同一seqの trace event（同じ発生源・chain link・同じ target_valid 判定・designated 監査で検証済み）を通してのみ受理 | 4 | 18 PASS | 040-A 完走 |

完走済み対照行（group-001-A/003-B 等）は、修正前後で決定・イベント骨格・最終盤面が一致する（`play_digest`）。record全体のSHA-256はeditionとsource_versionsを含むため版間で一致しないが、これは証明情報の追加で、対局内容の変化ではない。

### 本人判断が必要な残件（既存証拠の再利用では閉じないもの）

- （解消）**group-012-B-first / group-014-A-first（W-city、turn-start窓の再提示）**：当初は裁定事項としたが、到着群・終了群の窓では同じ辞退済み発生を `closed_native` が既に閉じており、閉鎖監査が引用する「辞退した群の発動源は再提示されない」契約は開始窓だけが満たしていなかった。開始窓を他の窓と同じ閉鎖に揃えた（`0a1f2edd`）。証跡は `verification/city-turn-start-reoffer-trace-group-012-B-first.jsonl`。
- **group-005-A-first（pending source obligation）**：連鎖解決中（origin 163）に生じたM-antlion-06の発生が、連鎖が normal_action に戻った後も提示されず、順序監査が `ordinary processing before pending source obligation` で正しく停止している。`b3750727` 以降は覆い隠されていた本来の停止 `unfinished trigger occurrence at turn boundary`（逐次台帳のターン境界閉鎖）が併記される。欠けているのは実行駆動側の提示（在庫に発生を載せる）であり、追加すると対局の決定候補が変わる。証跡は `verification/pending-source-obligation-trace-group-005-A-first.jsonl`。
- （解消）**group-023-B-first / group-032-B-first（concealed companion / main ability timing）**：凍結 `preparation.response_inventory` と face-up置換分類が、現行層で追加した paid draw（M-antlion-02/08）と きまぐれなねこ の発動起点を知らなかった。両カード文はメイン除去も相手効果によるなかま移動も含まないため、文面section hashを固定・再検証した上で凍結の射影をそのまま適用（`42d02877`・`5df9538b`）。
- **group-068-A-first（R10・メイン不在の E-final-time）**：凍結の合法候補列挙（468 source）は前提文に `own main` を含むだけで「自分のメインが必要」として除外するが、文面は「自分のメインが⑧、**または**現在のラウンドがR10」で、R10・メイン不在でも発動できる。現行層のhand監査は文面どおり許可と判定し、列挙と食い違うので正しく停止している。直すと合法候補が増えてCPUの選択が変わるため、本人判断。証跡は `verification/final-time-r10-no-main-trace-group-068-A-first.jsonl`。
- （解消）**group-006-A-first（E-final-time を M-antlion-06 保持者が解決）**：当初は本人判断事項としたが、既存の designated 全差分監査が記録受理時に同じeventの受領を規則から再計算・全envelope束縛していることを確認し、その監査結果を必須の裏付けとして再利用した（`831c8fe6`）。受領キーからの推定ではなく、裏付けが無ければ記録ごと停止する。

調査は11区分をworkflow（区分ごとの調査＋3観点の反証＋統合）で始めたが、セッション上限で5区分の調査後に中断し、以後は直接の計装診断（`diag_*`：停止箇所のevent・文脈・ledger差分・覆い隠された例外のtraceback・述語監査の未証明理由を記録）で特定した。baselineで見えた19区分のうち、本人判断として残るのは pending source obligation（005-A・044-B・106-A・030-B）と R10・メイン不在の E-final-time 列挙（068-A）の2区分。各診断traceは `verification/*-trace-group-*` に保存した。

固定tree上の全400行再実行は、修復のたびに停止行を先頭へ置いて再開している。現在は HEAD `f306426a` で、固定treeで未完走の308行を2並列で実行中（1行2〜12分、約1日）。2026-10-21の再実行でbaselineの停止行のうち31行以上が完走に変わった（各 `*-e2e.json`）。baselineセンサス（凍結tree、4並列）は指示どおり継続している（コンテナ再起動で一度停止したため、完了行をそのまま残して中断4行だけを再実行する形で再開した）。

## 9. 未解決事項（10-20時点。10-21の進捗は §8）

1. 承認権威の移転（PR #259 → 新Draft PR）の採否と、その実装・テスト。
2. センサスで見つかった各証明境界の実装。各カード・各経路について、証明を追加する作業になる。条件緩和では解決しない。
3. 第9行の例外（pending source obligation）の原因調査。
4. センサスの残り行。
5. 本番400戦は逐次実行で、1試合およそ2〜7分（診断実測）。全行が完走すれば約15〜40時間かかる。
6. 固定400戦の文面は2026-10-14時点のルールである。10-19の表示限定改訂との意味的同一性は改訂文の宣言に基づく判断で、Python基盤で再証明したものではない。
