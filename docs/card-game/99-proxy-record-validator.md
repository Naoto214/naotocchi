# 99 プロキシ記録validator第1段階

最終更新: 2026-09-17

状態: **98のschema v1に対し、開始入力・参照・状態hashを検査する標準ライブラリだけのvalidatorを追加した。カード効果は実行せず、再登場で生じる新個体の生成記録はまだ扱わない。カード本文・数値・登録区分は変更しない。**

## 1. 固定した版と範囲

- 開始HEAD: `98711f43a6c33e428598ffd39ff5c13080f68b4f`、tree: `e168c3e7a5bf497eed495f9702d8a4d0b9421cb6`。
- 最新main実ref: `f23398e43eed952d49d5a2b805789a4c87b2b1bd`。本編を作業ブランチへマージしていない。
- PR #259はDraft・未マージ。開始HEADのRuntime smoke test run `35242077397` はsuccess。
- 現行452件、登録477候補＝CARD463＋HOLD14、現行アイテム26＝登録14＋未登録source12を維持する。今回の変更カードIDは0件。

実装は[tools/proxy_record_validator.py](tools/proxy_record_validator.py)、回帰テストは[tools/test_proxy_record_validator.py](tools/test_proxy_record_validator.py)に保存する。

## 2. validatorが検査するもの

| 層 | 検査 |
|---|---|
| 版 | schema version、rules commit/treeの40桁小文字hex、カタログhashの64桁小文字hex |
| カタログ | 既存`check-design-data.py --catalog`がエラー0で、7種類452 IDであること |
| 対戦入力 | A/Bの2人、先後一致、各40枚、初手＝山札上5枚、80個体IDの全体一意 |
| カード | 全IDが現行452にあり、各デッキが7種類すべてを含むこと |
| 選択 | 宣言choice IDの一意性と、eventからの参照 |
| event | `seq`が1から連続、個体参照、連鎖の過去event参照、chain内のlink順 |
| 予約 | reservation IDの一意性、作成event、発生源・対象個体、作成／消費参照 |
| 状態hash | event前後のhashが64桁小文字hexであること |
| 結果 | statusの語彙、fixtureにeventがないこと、completedの勝者・理由 |

エラーは入力順によらず同じ条件で再確認できる文字列配列として返す。CLIは妥当なら`valid: true`、不正なら`valid: false`とエラー一覧を出し、不正時は終了コード1とする。

```bash
python docs/card-game/tools/proxy_record_validator.py \
  docs/card-game/data/proxy-match-record-example-20260917.json
```

## 3. 状態hashの正規化

`--hash-state`は、状態JSONを次の方法で正規化してSHA-256を返す。

1. objectのkeyを辞書順へ並べる。
2. 配列順は変えない。
3. JSONの区切りから空白を除く。
4. 日本語をUnicode escapeへ変えずUTF-8にする。
5. そのbyte列のSHA-256を小文字hexで出す。

これは同じ意味のobjectでkey順だけが違う場合に同じhashを得るための規約である。配列順は山札順や処理順を表すため変更しない。

```bash
python docs/card-game/tools/proxy_record_validator.py --hash-state state.json
```

## 4. RED→GREEN

最初にテストを作り、module未実装による失敗を確認してから最小実装を追加した。後続の入力欠落ケースもRED→GREENで加え、計8テストとした。

1. 98の未実施fixtureを受理する。
2. 初手が山札上5枚と違えば拒否する。
3. seatが欠けた入力を例外で停止せず拒否する。
4. 全体で重複する個体IDと7種類を欠くデッキを拒否する。
5. 現行452にないカードIDを拒否する。
6. commit/tree/catalog hashの形式不正を拒否する。
7. event連番、未来／自身への連鎖参照、未宣言choice、未登録予約、不正hashを拒否する。
8. objectのkey順が違っても状態hashが一致する。

保存前の実行結果は8テスト成功。98 fixtureもCLIで`valid: true`、エラー0となる。

## 5. 意図的に扱わないもの

- カード本文の発動条件、適正対象、支払い可能性、解決結果
- 勝率、発動率、100到達ターン、操作秒数、強度
- JSON Schema 2020-12の全keywordを実装する汎用validator
- 対戦エンジン、自動選択、自動デッキ作成
- HOLD・archive・legacyを現行452へ追加すること

特に、98の`instance_id`は開始時80枚を一意にするが、領域移動後に場へ戻ったカードを「新個体」として生成する履歴欄がv1にはない。現validatorはeventの個体参照を開始時80 IDへ限定するため、**再登場を含むcompleted記録にはまだ使用しない**。この不足を隠して「個体追跡が完成した」とは扱わない。

## 6. 次の再開地点

1. 物理カードを識別する不変IDと、場へ出るたび更新する個体IDを分けるschema拡張を設計する。
2. 旧個体→新個体の生成event、予約が旧個体だけを追うこと、領域ごとの参照可能性をvalidatorへRED→GREENで追加する。
3. その後にP97-01〜06の単独・同名2枚・盤面併用fixtureを作る。
4. 少数の手動対戦をcompleted形式で再現できることを確認してから母数を増やす。

本文設計・全体監査→再現可能な大量プロキシ→非アート部分の凍結→最後にカード専用イラスト、の順を維持する。
