# 112 構造的入力不足6件の対象fixture

最終更新: 2026-09-18

状態: **111で分類した構造的入力不足6件について、現行452内の前提カードを持つ未実施fixtureを各1件、計6件へ固定した。6件はすべて`status: fixture`、event空、winner nullで、completed対戦・発動率0・カード強度の証拠には数えない。**

## 1. 固定した版と範囲

- 開始HEAD: `b22a2adc167ccea47f32085d47209d51e1cc44e8`、tree: `f703410913a0bef28e44017b49695f2b1066227d`。
- 開始時の最新main実ref: `ae0a1254c55ad42217890dd508750f4f63bd486d`。本編を作業ブランチへマージしていない。
- PR #259はDraft・open・未マージを維持する。
- 6件ともA/B各40枚、7種類、現行452のみ。元の101 fixtureにあるcard copy IDとinitial instance IDの80組を保持する。
- 112のfixture数は6、completed対戦数と独立した強度標本数は0。
- カード本文・数値・登録区分の変更は0件。現行452、登録477候補＝CARD463＋HOLD14を維持する。

機械可読な計画は[data/proxy-gap-fixture-plan-112-20260918.json](data/proxy-gap-fixture-plan-112-20260918.json)、生成済みfixtureは[data/proxy-gap-fixtures-112/](data/proxy-gap-fixtures-112/)、生成・検査は[tools/proxy_gap_fixture_builder.py](tools/proxy_gap_fixture_builder.py)、回帰テストは[tools/test_proxy_gap_fixture_builder.py](tools/test_proxy_gap_fixture_builder.py)を使う。

## 2. fixtureの構成

101のP97-05／06 `board-combination`を個体IDの土台にし、計画JSONで宣言した位置のcard IDだけを現行452内で差し替えた。差し替えていない位置のcard IDと、全位置のcard copy ID／initial instance IDは元fixtureと一致する。

| fixture | 群 | Aの主な前提 | Bの主な前提 |
|---|---|---|---|
| `fixture-112-g-jump-quest` | targeted-short | カブト①→②→③とジャンプクエスト。①→②、②→③を別々の時1のときおくりとして行える | 元fixtureを維持 |
| `fixture-112-m-mushroom-06` | targeted-short | キノコ①→⑥と、別現物のカワウソ2枚。なかま満員交代で盤面と捨て札へ分けられる補助なかまも用意 | 元fixtureを維持 |
| `fixture-112-m-sakura-05` | evolution-path | サクラ①→⑤を時4でときおくり。捨て札回収対象の`G-curling-ice` | 元fixtureを維持 |
| `fixture-112-m-dragon-08` | evolution-path | りゅう①→⑧を時7でときおくり。捨て札へ置くアクション2枚と、回収するなかまを用意 | 元fixtureを維持 |
| `fixture-112-m-penguin-07` | evolution-path | ペンギン①→⑦を時6でときおくり。セカイ変更用`W-city`と保護対象`C-bat` | りゅう①→⑥、準備カード、手札コストを使う既存の相手なかま除去経路 |
| `fixture-112-m-god-08` | evolution-path | かみさま①→⑧を時7でときおくり。予約対象`C-bat`と山札下へ置く手札を用意 | りゅう①→⑥、準備カード、手札コストを使う既存の相手なかま除去経路 |

ここで固定したのは、後続の実施で必要な経路を作れる初期順とカード在庫である。盤面・捨て札・予約の成立、対象の適正、支払い、期限、効果の適用はまだ発生していない。

## 3. 適正な段階経路

キノコ⑥を含む5件の高段階メインは、初手にあることを直接配置の許可とはしない。計画JSONに次の同種族ときおくりを明記し、段階差と時コストを検査する。

| 対象 | 経路 | 時 |
|---|---|---:|
| キノコ⑥ | キノコ①→⑥ | 5 |
| サクラ⑤ | サクラ①→⑤ | 4 |
| りゅう⑧ | りゅう①→⑧ | 7 |
| ペンギン⑦ | ペンギン①→⑦ | 6 |
| かみさま⑧ | かみさま①→⑧ | 7 |

ジャンプクエストは、カブト①→③の一度の多段階移動を2回と数えない。カブト①→②と②→③を、各時1・別々の通常行動として同じターンに行う計画だけを許す。

## 4. 未実施の境界

- fixtureのevent列は空で、そだち増加、回収、予約、置換、離脱防止はまだ記録していない。
- winnerはnull、rounds completedは0。勝敗・先後差・発動率・カード強度へ加算しない。
- キノコ⑥のカワウソ2枚は別card copyだが、盤面と捨て札へ実際に分かれた証拠は後続completed記録で作る。
- ペンギン⑦／かみさま⑧の相手除去カードも、fixtureにあるだけでは除去の発生や防御成功を意味しない。
- `current-452`だけを使い、新12、旧24、HOLD14、legacy4を混ぜない。登録477や発売枚数も変更しない。
- 対戦エンジン化、合法性の完全自動判定、カード効果の自動解決は行っていない。

## 5. 検査

専用検査は、6件と111の一対一対応、短期2／段階4、current-452限定、A/B各40枚・7種類、元fixtureとの全card copy／initial instance ID一致、宣言位置以外のcard ID一致、初手5枚、必要在庫の枚数、同種族前進と段階差時、ジャンプクエストの別々の2移動、キノコの別現物2枚、未実施状態、保存JSONの完全一致を確認する。

- RED: `proxy_gap_fixture_builder`未実装による`ModuleNotFoundError`を確認した。
- GREEN: 専用9テストを成功させた。
- 生成CLIはfixture 6、completed 0、error 0を返す。

```bash
cd docs/card-game/tools
python proxy_gap_fixture_builder.py --write
python proxy_gap_fixture_builder.py
python -m unittest test_proxy_gap_fixture_builder.py
```

## 6. 次の再開地点

113では111どおり、独立した初期順2組×先後鏡像＝4戦を通常意思決定の最初の1バッチとして実施し、終了後に停止して評価する。112の6 fixtureをcompleted記録へするチェックポイントはまだ割り当てず、この4戦の評価後に順序を決める。

対象fixtureを後で実施する時も、高段階メインの直接配置、必須前提不足、非公開情報参照、未解決裁定、validatorと保存JSONの不一致があれば、その記録を確定せず監査へ戻す。本文設計・全体監査→再現可能な大量プロキシ→非アート部分の凍結→最後にカード専用イラスト、の順を維持する。
