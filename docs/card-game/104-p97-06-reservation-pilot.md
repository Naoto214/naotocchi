# 104 P97-06予約の消費・失効パイロット

最終更新: 2026-09-18

状態: **P97-06「ブロックくずし」の101先手fixtureと102後手鏡像fixtureから、既存40枚の順序だけを変えた統制入力を作り、予約を実際に消費する1戦と、R10後に失効する1戦をcompleted形式へ固定した。消費側43 event・44 snapshot、失効側42 event・43 snapshot。これは予約記録経路の検証であり、勝率・先後差・カード強度の結論には数えない。カード本文・数値・登録区分の変更は0件。**

## 1. 固定した版

- 開始HEAD: `25d82135873d5f6ca9cac0ffa44fc9e3a69cb457`、tree: `98748feb521b90cc65e7e36e2ee4785cbd63fe2b`。
- 開始時に確認した最新main実ref: `d8036775d35f21fc12c20d5bf450e93d3a2e8846`。本編を作業ブランチへマージしていない。
- PR #259はDraft・未マージ。開始HEADのRuntime smoke test run `35291587326` はsuccess。
- 103までの現行452件、カード候補を読む本編source、P97-06のカード定義に変更がないことを確認した。

## 2. 元fixtureをそのまま使わない理由

P97-06の焦点札`G-breakout-classic`（ブロックくずし、`A-001#1`）はAの初手にある。一方、101・102の元`single` fixtureでは、Bの初手にもR10までの通常ドロー範囲にも準備できるカードがなく、適正対象を自然に作れない。

そこで各fixtureに既に含まれる`I-poop1`（トイレットペーパー、`B-034#1`、しかける・時1）と`B-005#1`の位置を交換した。これにより`B-034#1`をBの初手5枚目へ、`B-005#1`を34番目へ移した。

- 40枚のカード、card ID、copy ID、initial instance IDは一切増減・交換しない。
- 変更はBの山札順2位置だけで、Aの入力と先後は元fixtureを維持する。
- 101・102に保存済みのfixture自体は変更しない。
- 派生入力を通常の無作為対戦、発動率、デッキ強度へ数えない。

機械可読な計画は[data/proxy-reservation-plan-104-20260918.json](data/proxy-reservation-plan-104-20260918.json)に保存した。

## 3. 共通の統制手順

1. 各ターン開始時に時をそのラウンド数へ更新し、山札の一番上を1枚引く。
2. BはR1の行動機会に時1を払い、`B-034#1`を準備枠へ置く。
3. 指定したAのターンに、Aは時2を払い、`A-001#1`を使って準備中の`B-034#1`を対象にする。
4. 「Aの次のターン開始時」に対象を持ち主Bの手札へ戻す予約を1件作る。
5. 指定した設置とブロックくずし以外の任意行動は行わず、R10終了時にそだちを比較する。

このmaterializerは固定した2本のtranscriptを生成するものであり、任意のカード効果や意思決定を解決する一般対戦エンジンではない。

## 4. 消費と失効

| match | Aの座席 | 発動 | 期限 | 終端 | event / snapshot | 対象の最終位置 |
|---|---|---:|---:|---|---:|---|
| `completed-104-p97-06-single-a-first-consumed` | 先手 | A R2 | A R3開始 | `consumed`、残り0回 | 43 / 44 | Bの手札 |
| `completed-104-p97-06-single-a-second-expired` | 後手 | A R10 | A R11開始 | `expired`、残り1回 | Bの準備枠 |

消費側はA R3の通常ドロー後の開始処理で予約を実行し、追跡対象`B-034#1`がBの準備枠に残っていることを確認してBの手札へ戻す。予約は`reservations_consumed`へ記録し、状態を`consumed`、残り回数を0にする。

失効側はA R10に予約を作るが、R10の両ターン終了後に最終比較するためR11は作らない。過ぎた終了へ予約を遡及させず、予約を実行せずに`expired`とする。したがって対象はBの準備枠に残り、`reservations_consumed`は空、残り回数は1のままである。両戦とも最終そだちはA 20／B 20、引き分け、延長なし。

完全な記録は[data/proxy-pilots-104](data/proxy-pilots-104)、対応する状態列は[data/proxy-pilot-traces-104](data/proxy-pilot-traces-104)に保存した。

## 5. 検査する不変条件

- 派生前後で各initial instance IDからcard IDへの対応が完全一致する。
- 初手は山札上5枚と一致し、移動した位置は`B-005#1`と`B-034#1`だけである。
- 先手1戦・後手1戦、準備event各1回、焦点event各1回である。
- 焦点eventの支払いは時2、対象は`B-034#1`、予約作成eventとの参照が一致する。
- 消費側はA R3に実行eventが1件あり、失効側には実行eventもR11 eventもない。
- 全snapshotのcanonical SHA-256と、各eventのbefore／after hashが連続する。
- completed recordとtraceの予約終端、残り回数、最終そだちが一致する。
- 保存した4 JSONのファイル名と内容が決定論的な再生成結果に完全一致する。

## 6. 個体ID境界

この2戦では、初手から準備枠へ置く`B-034#1`は同じ場への配置個体であり、新個体を作らない。消費時の準備枠から手札への移動でも、その時点で新しい`#2`は発行しない。後にその現物を再びプレイして場へ出す時に、新個体IDを作る。

したがって今回の`instance_transitions`は空である。領域を離れた後の再登場と旧予約の非移行は、次のP97-05で実際に発生するcompleted記録へ接続する。

## 7. RED→GREEN

先に派生入力、2つの予約終端、支払い・対象、状態hash、改ざん拒否を要求するテストを書いた。

- 第1 RED: `proxy_reservation_pilot`が存在せず`ModuleNotFoundError`。
- 第1 GREEN: 生成・検査を実装し、7テスト中6成功。残る1件はテスト期待値が完全なmatch IDの`-expired`を欠いていたため修正した。
- 第2 RED: 保存済みJSONの厳密比較関数がなく`ImportError`。実装後も未生成ファイル4件を正しく拒否した。
- 第2 GREEN: 4 JSONを生成し、ファイル集合と全文一致を含む8テスト成功。

生成・検査は[tools/proxy_reservation_pilot.py](tools/proxy_reservation_pilot.py)、回帰テストは[tools/test_proxy_reservation_pilot.py](tools/test_proxy_reservation_pilot.py)に保存した。

```bash
python docs/card-game/tools/proxy_reservation_pilot.py
python docs/card-game/tools/proxy_reservation_pilot.py --write
python docs/card-game/tools/test_proxy_reservation_pilot.py
```

## 8. 今回確定していないこと

- 通常の意思決定を含む対戦でのP97-06の発動率・強度・勝率
- 先手／後手差。2戦は異なる予約終端を意図的に作った統制記録であり、戦略比較ではない
- 対象が期限前に移動した場合、複数予約、反応・連鎖を伴う予約の実測
- 再登場による新個体IDと、旧個体を追う予約の非移行
- 残るP97-01／02／04／05のcompleted記録、同名2枚、盤面併用
- 新12の正式登録、旧24・HOLD14・legacy4の復帰

## 9. 次の再開地点

P97-05で領域移動と再登場を実際に起こし、新個体IDの発行、旧個体に結び付いた情報・予約の非移行をcompleted記録とtraceへ通す。その後に通常の意思決定を含む対戦と残るP97群へ広げる。

本文設計・全体監査→再現可能な大量プロキシ→非アート部分の凍結→最後にカード専用イラスト、の順を維持する。
