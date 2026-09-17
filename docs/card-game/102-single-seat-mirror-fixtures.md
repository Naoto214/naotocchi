# 102 単独6件の先後鏡像fixture

最終更新: 2026-09-17

状態: **101の`single` 6件について、A/Bのデッキ順・初手・card copy ID・initial instance IDを一切入れ替えず、A後手／B先手だけを反転した6件を固定した。すべて未実施fixtureであり、対戦結果・発動率・強度には数えない。カード本文・数値・登録区分は変更しない。**

## 1. 固定した版と範囲

- 開始HEAD: `fa87fa517a0732aeea967f0c2d8dc5be00412426`、tree: `35c3f8e9ba9037713bfb719267df6dba457082a3`。
- 最新main実ref: `f23398e43eed952d49d5a2b805789a4c87b2b1bd`。本編を作業ブランチへマージしていない。
- PR #259はDraft・未マージ。開始HEADのRuntime smoke test run `35285571501` はsuccess。
- 現行452件、登録477候補＝CARD463＋HOLD14、現行アイテム26＝登録14＋未登録source12を維持する。今回の変更カードIDは0件。

機械可読な計画は[data/proxy-seat-mirror-plan-102-20260917.json](data/proxy-seat-mirror-plan-102-20260917.json)、完全な6記録は[data/proxy-fixtures-102](data/proxy-fixtures-102)、生成・検査は[tools/proxy_fixture_builder.py](tools/proxy_fixture_builder.py)、回帰テストは[tools/test_proxy_fixture_builder.py](tools/test_proxy_fixture_builder.py)に保存する。

## 2. 「鏡像」の変更範囲

| 項目 | 101単独入力 | 102鏡像入力 |
|---|---|---|
| `input.first_player` | A | B |
| Aの`seat` | first | second |
| Bの`seat` | second | first |
| A/Bのplayer ID | 維持 | 維持 |
| A/B各40枚の山札順 | 固定 | 完全一致 |
| A/B各5枚の初手 | 固定 | 完全一致 |
| card copy／initial instance ID | 各80 ID | 完全一致 |
| 焦点列 | A山札上 | 完全一致 |
| event／結果 | 空／winner null | 空／winner null |

AとBのデッキを交換する方式ではない。Aの焦点カード列を持つ同一入力が、先手から後手へ変わった時の比較候補を作る。目的文、match ID、設計版、`a-second-seat-mirror` stratumは鏡像記録を識別するために更新する。

## 3. 対応する6件

| 優先群 | 101 source | 102 mirror | Aの焦点列 |
|---|---|---|---|
| P97-01 | `fixture-101-p97-01-single` | `fixture-102-p97-01-single-a-second` | `E-first-date` |
| P97-02 | `fixture-101-p97-02-single` | `fixture-102-p97-02-single-a-second` | `G-mini-golf-physics` |
| P97-03 | `fixture-101-p97-03-single` | `fixture-102-p97-03-single-a-second` | `G-hit-blow` |
| P97-04 | `fixture-101-p97-04-single` | `fixture-102-p97-04-single-a-second` | `G-road-city` |
| P97-05 | `fixture-101-p97-05-single` | `fixture-102-p97-05-single-a-second` | `G-animal-shogi` |
| P97-06 | `fixture-101-p97-06-single` | `fixture-102-p97-06-single-a-second` | `G-breakout-classic` |

6件は現行452 IDだけを使う。101で未登録sourceを含むのはP97-04の`board-combination`だけであり、今回対象の`single`には含まれない。HOLD14、旧24、legacy4も入れない。

## 4. 決定論的な生成と検査

builderは101の18件を再生成し、manifestに列挙した6つの`single` sourceを複製する。各playerをIDで対応付け、山札配列と初手配列の完全一致を検査する。A/Bの配列順に依存せず、player identityを交換しない。

```bash
python docs/card-game/tools/proxy_fixture_builder.py \
  --mirror-manifest docs/card-game/data/proxy-seat-mirror-plan-102-20260917.json
python docs/card-game/tools/proxy_fixture_builder.py \
  --mirror-manifest docs/card-game/data/proxy-seat-mirror-plan-102-20260917.json --write
python docs/card-game/tools/test_proxy_fixture_builder.py
```

保存済み6 JSONと再生成結果のファイル名・全文が違えば失敗する。山札順または座席を故意に変えた回帰テストも、それぞれ専用エラーで拒否する。

## 5. RED→GREEN

先に鏡像生成・鏡像検査を要求する5テストを追加し、未実装関数の`ImportError`となるREDを確認した。その後、生成と検査を最小実装し、101の7テストを含む計12テストをGREENにした。

この12テストは、入力形式と鏡像不変条件のテストである。カード効果の自動解決、6組12戦の実施、先後差の測定ではない。

## 6. 今回確定していないこと

- 101先手6件または102後手6件を実際に対戦した結果
- 先手／後手による勝率、発動率、100到達ターンの差
- 選択、支払い、連鎖、予約、個体遷移を最後まで記録する運用の実用性
- 焦点札を初手へ置かない自然ドロー条件
- 個別カードの適正時、成果、同名制限、探索枚数
- 新12の正式登録、旧24・HOLD14・legacy4の復帰

## 7. 次の再開地点

101先手と102後手から同じP97群を1組選び、まず2戦の手動パイロットをcompleted形式へ記録する。選択・支払い・連鎖・予約・個体遷移・状態hash・結果を再現できるか確認し、記録上の不足があればschema／validatorを最小修正する。

最初の2戦を記録できてから、残る5組へ広げる。12戦の結果が揃う前に先後差やカード強度を結論づけず、同名2枚・盤面併用の実施も記録方式が安定した後に進める。

本文設計・全体監査→再現可能な大量プロキシ→非アート部分の凍結→最後にカード専用イラスト、の順を維持する。
