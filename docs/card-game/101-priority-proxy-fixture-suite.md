# 101 優先6群の再現fixture第1組

最終更新: 2026-09-17

状態: **97の優先6群を「単独・同名2枚・盤面併用」の3条件、計18件の固定40枚デッキへ落とした。すべて未実施fixtureであり、対戦結果・発動率・強度には数えない。カード本文・数値・登録区分は変更しない。**

## 1. 固定した版と範囲

- 開始HEAD: `4118aacca706e527c962be28eaa8edd9a426d74f`、tree: `579e3518aa1468de300539c4055e36730b36d2ea`。
- 最新main実ref: `f23398e43eed952d49d5a2b805789a4c87b2b1bd`。本編を作業ブランチへマージしていない。
- PR #259はDraft・未マージ。開始HEADのRuntime smoke test run `35284418976` はsuccess。
- 現行452件、登録477候補＝CARD463＋HOLD14、現行アイテム26＝登録14＋未登録source12を維持する。今回の変更カードIDは0件。

機械可読な計画は[data/proxy-fixture-plan-101-20260917.json](data/proxy-fixture-plan-101-20260917.json)、完全な18記録は[data/proxy-fixtures-101](data/proxy-fixtures-101)、生成・検査は[tools/proxy_fixture_builder.py](tools/proxy_fixture_builder.py)、回帰テストは[tools/test_proxy_fixture_builder.py](tools/test_proxy_fixture_builder.py)に保存する。

## 2. fixtureの共通条件

- schema versionは100までの`naotocchi.card_game.proxy_match_record.v1`を維持する。
- A/B各40枚、7種類、全山札順、初手5枚、card copy 80 ID、initial instance 80 IDを固定する。
- 第1組はAを先手、Bを後手に固定する。先後差の比較結果を出したものではない。
- Bは18件で同じ対照デッキ順。Aだけ焦点カードを山札上へ移す。
- Aの焦点列は初手の先頭に置く。残る初手・山札順もJSONに固定する。
- `record.status`は`fixture`、eventは空、勝者はnull。実施済み対戦へ数えない。
- 初手に揃えたことは、必要な場・交際段階・準備・支払い・勝敗を既に満たす意味ではない。後続の手動対戦で条件成立までの負担を記録する。

98の形式検査例に入っていた未登録sourceの`I-c_dex`と`I-c_egg_normal`は標準土台から外し、登録済みの`I-poop1`と`I-sleepboost1`へ置き換えた。P97-04盤面併用だけは比較対象として`I-c_egg_normal`を1枚入れ、`unregistered-item-separate-stratum`を付ける。

## 3. 18件の焦点列

| 優先群 | 条件 | A山札上の焦点列 |
|---|---|---|
| P97-01 同名積重ね | 単独 | `E-first-date` |
| P97-01 | 同名2枚 | `E-first-date`×2 |
| P97-01 | 盤面併用 | `G-curling-ice`×2、`C-otter`、`W-countryside`、`I-star` |
| P97-02 盤面得点 | 単独 | `G-mini-golf-physics` |
| P97-02 | 同名2枚 | `C-otter`×2 |
| P97-02 | 盤面併用 | `W-jungle`、`C-otter`、`G-mini-golf-physics`、`I-star`、`I-naoto_lantern` |
| P97-03 時1補充＋そだち | 単独 | `G-hit-blow` |
| P97-03 | 同名2枚 | `G-hit-blow`×2 |
| P97-03 | 盤面併用 | `G-mini-golf-physics`、`W-countryside`、`C-otter`、`I-star`、`G-hit-blow` |
| P97-04 時1選択取得 | 単独 | `G-road-city` |
| P97-04 | 同名2枚 | `G-road-city`×2 |
| P97-04 | 盤面併用 | `G-road-city`、`G-air-hockey`、`G-animal-shogi`、`W-city`、`I-c_egg_normal` |
| P97-05 回収・再使用 | 単独 | `G-animal-shogi` |
| P97-05 | 同名2枚 | `G-animal-shogi`×2 |
| P97-05 | 盤面併用 | `G-jump-quest`、`M-mushroom-06`、`M-sakura-05`、`M-dragon-08`、`G-animal-shogi` |
| P97-06 予約負荷 | 単独 | `G-breakout-classic` |
| P97-06 | 同名2枚 | `G-breakout-classic`×2 |
| P97-06 | 盤面併用 | `M-penguin-07`、`M-god-08`、`G-stack-harvest`、`G-stack-snowman`、`G-takoyaki-grill` |

「盤面併用」は必要カードを初手へ集めた入力条件名であり、開始時から盤面へ配置済みという意味ではない。通常行動、人物共有1人、準備枠、時、交際段階、勝負等は現行ルールどおり必要になる。

## 4. 決定論的な生成

builderは98の未実施例を読み、次の順で18件を作る。

1. 標準土台から未登録source 2枚を登録済みアイテムへ置換する。
2. manifestの焦点列をA山札上へ移す。土台に同じIDがあれば位置を交換し、2枚目が必要なら追加で置き換える。
3. 初手を山札上5個体IDへ同期する。
4. `rules_commit`、`rules_tree`、試験群、条件、未登録stratumを記録する。
5. schema v1の意味検査後に完全JSONを書き出す。
6. 保存済み18 JSONを再生成結果と比較し、ファイル名または内容の差を拒否する。

```bash
python docs/card-game/tools/proxy_fixture_builder.py
python docs/card-game/tools/proxy_fixture_builder.py --write
python docs/card-game/tools/test_proxy_fixture_builder.py
```

通常の確認は第1コマンドを使う。`--write`はmanifestを変更した時だけ生成物を更新する。

## 5. RED→GREEN

最初にbuilder未実装の状態でテストを作り、`ModuleNotFoundError`となるREDを確認した。manifest・builderの最小実装後、18件生成、焦点列、schema v1受理、未登録stratum、欠落・順序違反、安定ファイル名の6テストをGREENにした。

続いて、保存済みJSONがbuilder出力と違う時に検出するテストを先に追加し、未実装関数の`ImportError`となるREDを確認した。再生成比較を追加し、最終7テストをGREENにした。

## 6. 今回確定していないこと

- 18件を実際に対戦した結果
- 発動率、勝率、100到達ターン、平均操作秒数、予約の同時最大数
- 先手Aと後手Aの差
- 初手に焦点札を置かない自然ドロー率
- 個別カードの適正時、成果、同名制限、探索枚数
- 新12の正式登録、旧24・HOLD14・legacy4の復帰

したがって、fixtureが妥当な形式であることと、カード強度が妥当であることを混同しない。

## 7. 次の再開地点

18件から各P97群の単独条件を1件ずつ、計6件を手動パイロット候補にする。実施前にA後手の鏡像入力も用意し、先後を区別する。少数の手動対戦で選択、支払い、連鎖、予約、個体遷移、結果をcompleted形式へ記録できるか確認してから母数を増やす。

本文設計・全体監査→再現可能な大量プロキシ→非アート部分の凍結→最後にカード専用イラスト、の順を維持する。
