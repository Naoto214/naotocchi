# 103 P97-03統制パイロット2戦

最終更新: 2026-09-18

状態: **P97-03「ヒット&ブロー」の101先手fixtureと102後手鏡像fixtureを使い、AだけがR1に焦点札を1回使う統制手順を2戦分のcompleted記録へ固定した。各戦41 eventと、初期状態を含む42 snapshotを保存した。これは記録経路の検証であり、勝率・先後差・カード強度の結論には数えない。カード本文・数値・登録区分の変更は0件。**

## 1. 固定した版とmain追従

- 開始HEAD: `72dc7de98f3966972b042fde75730078f91e4185`、tree: `d076c420e9838e0826bede7970c7d23f2796c9e1`。
- 保存直前の最新main実ref: `d8036775d35f21fc12c20d5bf450e93d3a2e8846`（PR #290）。本編を作業ブランチへマージしていない。
- PR #259はDraft・未マージ。開始HEADのRuntime smoke test run `35287039063` はsuccess。
- `f23398e`から最新mainまでは8ファイル変更。PR #289のアイテムシール・たまご・図鑑UIに続き、PR #290でたまごの購入・予約・取消を状態に応じた1操作へ整理した変更である。カード候補を読む`character-world-master.v1.js`、`games.js`、`item-system.js`、`movie-dialogue.js`、`world-environment.js`のblobは一致した。`script.js`だけが変わったが、現行452件、現行アイテム26、P97-03の定義には変更がない。

照合値は[data/proxy-main-followup-103-20260918.json](data/proxy-main-followup-103-20260918.json)へ保存した。

## 2. P97-03を選んだ理由

最初のパイロットでは、カードの発動、宣言、時支払い、山札公開、手札移動、そだち増加を1回の短い処理で記録できるP97-03を使う。

P97-01の`E-first-date`はこいびとが必要だが、固定デッキで最初のこいびとは16番目にあり、R10までの通常ドローでは手札へ来ない。焦点札だけを自然に発動させる最初の記録としては適さない。

P97-03ではAの初手に`G-hit-blow`（`A-001#1`）があり、R1通常ドローは`M-antlion-06`（`A-006#1`）、その次は`M-antlion-07`（`A-007#1`）。Aはカード種「メイン」を宣言して時1を払い、`A-007#1`を公開して手札へ加え、そだち+5を得る。

## 3. 統制手順

機械可読な計画は[data/proxy-pilot-plan-103-20260918.json](data/proxy-pilot-plan-103-20260918.json)に保存した。

1. 各ターン開始時に時をそのラウンド数へ更新し、山札の一番上を1枚引く。
2. AはR1の通常ドロー後、最初の行動機会にだけヒット&ブローを使い、「メイン」を宣言する。
3. Aは時1を払い、山札の次の`A-007#1`を公開して手札へ加え、そだち+5を適用する。使った`A-001#1`は捨て札へ置く。
4. そのほかの任意行動は両者とも行わず、各ターンを終了する。
5. R10の両ターン終了後にそだちを比較する。

これは固定した処理のtranscript materializerであり、任意のカード効果を解決する対戦エンジンではない。

## 4. 保存した2戦

| match | Aの座席 | event | snapshot | 最終そだち | 結果 |
|---|---:|---:|---:|---:|---|
| `completed-103-p97-03-single-a-first` | 先手 | 41 | 42 | A 25／B 20 | A勝利 |
| `completed-103-p97-03-single-a-second` | 後手 | 41 | 42 | A 25／B 20 | A勝利 |

完全な対戦記録は[data/proxy-pilots-103](data/proxy-pilots-103)、対応する状態列は[data/proxy-pilot-traces-103](data/proxy-pilot-traces-103)に保存した。各eventは直前・直後の状態hashを持ち、traceは初期状態1件と各event後の状態41件を持つ。JSONのキー順と空白に依存しないcanonical SHA-256を再計算し、次を検査する。

- snapshot自身のstateとhashの一致
- eventのbefore／after hashと隣接snapshotの一致
- `event_seq` 0〜41の連続
- 最終stateのそだちとcompleted resultの一致
- 先手1戦・後手1戦、焦点処理各1回
- 保存ファイルと決定論的な再生成結果の全文一致

## 5. 予約と個体遷移

この統制手順では予約も、領域を離れて戻るカードも実際に発生しない。そのため`reservations`と`instance_transitions`は空であり、要件を満たしたように見せるための架空記録は加えない。

予約の記録経路はP97-06、再登場による新個体IDの記録経路はP97-05を使って後続で個別に試す。

## 6. RED→GREEN

先にパイロット生成、焦点event、状態hash連続性、改ざん拒否、先後対、保存ファイル一致を要求するテストを書いた。

- 第1 RED: `proxy_pilot_trace`が存在せず`ModuleNotFoundError`。
- 第1 GREEN: 生成・検査を実装し5テスト成功。
- 第2 RED: 保存済みJSONの厳密比較関数がなく`ImportError`。
- 第2 GREEN: ファイル名と全文の一致検査を実装し6テスト成功。

生成・検査は[tools/proxy_pilot_trace.py](tools/proxy_pilot_trace.py)、回帰テストは[tools/test_proxy_pilot_trace.py](tools/test_proxy_pilot_trace.py)に保存した。

```bash
python docs/card-game/tools/proxy_pilot_trace.py
python docs/card-game/tools/proxy_pilot_trace.py --write
python docs/card-game/tools/test_proxy_pilot_trace.py
```

## 7. 今回確定していないこと

- 通常の意思決定を含む対戦でのP97-03の強度・発動率・勝率
- 先手／後手差。2戦ともAが焦点処理を行う統制記録であり、座席以外の戦略比較ではない
- 予約の生成・消費・期限、個体の離脱・再登場・旧予約の非移行
- 残るP97-01／02／04／05／06のcompleted記録
- 同名2枚、盤面併用、第0弾候補の実測
- 新12の正式登録、旧24・HOLD14・legacy4の復帰

## 8. 次の再開地点

まずP97-06の先後2 fixtureを使い、予約を実際に生成・消費または失効させる統制パイロットを記録する。その後P97-05で領域移動と再登場の新個体IDを記録し、98〜100で定めた予約・個体追跡がcompleted記録で再現できるか確認する。

この2経路を通した後に、通常の選択を含む対戦や残るP97群へ広げる。本文設計・全体監査→再現可能な大量プロキシ→非アート部分の凍結→最後にカード専用イラスト、の順を維持する。
