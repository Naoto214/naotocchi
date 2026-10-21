# Normal Decision First-Choice Audit Design

更新日: 2026-09-18

## 目的

113でdeferredとし、114でprotocol hardening後に再開予定だった独立初期順2組×先後鏡像4経路へ、固定seedの初期順を初めて適用する。既存正本だけで選択を一意にできない場合は111・107・114の停止条件に従い、completed対戦を強行せず、最初の判断不能地点と後続の比較不能候補をチェックポイント115の監査記録へ保存する。

## 結論と範囲

115はcompleted対戦バッチではなく、**first-choice application audit**とする。

- Pythonの`random.Random(seed).shuffle`で、107 sourceのA/B各40枚を独立に並べ替える。
- order-01はA seed 50／B seed 100050、order-02はA seed 51／B seed 100051。
- 各orderでA先手とB先手を作るが、座席鏡像間でA/Bの40枚順、card copy ID、initial instance IDを変えない。
- 4経路とも、R1の通常行動へ入る前のたまご交換選択を既存protocolだけでは比較できないため停止する。
- fixture、completed record、decision trace、winner、独立balance標本は作らない。
- 114の比較規則を変更せず、任意の手札価値点や固定の山札下選択を追加しない。

## 固定shuffle

入力は`data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json`の各playerの`deck_order_top_to_bottom`とする。各playerについて配列をコピーし、対応seedを持つ新しい`random.Random` instanceで1回だけ`shuffle`する。

```python
cards = list(source_player["deck_order_top_to_bottom"])
random.Random(seed).shuffle(cards)
```

再現結果では、各playerの40 card copy IDとinitial instance IDの集合がsourceと完全一致し、重複・欠落・新規IDがないことを検査する。order-01とorder-02はA/Bとも異なる順序であること、同一orderの先後鏡像は順序が完全一致することを必須とする。

machine-readable planには、shuffleアルゴリズム名、Python runtime、seedに加え、再現結果の全40枚をcard copy ID／card ID／initial instance IDの対応付きで固定する。application auditには40枚順のSHA-256、初手5枚、R1通常ドロー、R1たまご追加ドローを記録する。完全なfixtureは保存しないが、builderがsourceから40枚順を再生成し、planの全40枚とauditのhash／先頭7枚を照合できるようにする。これにより、将来shuffle実装が変わっても115で採用した順序自体はplanから確認できる。

## 最初の停止地点

両者ともメイン不在で開始するため、R1ターン開始には次が起きる。

1. 時を1へ更新する。
2. 通常ドローを1枚行う。
3. メイン不在によるたまご追加ドローを1枚行う。
4. 手札から1枚を選び、山札の一番下へ置く。

107は「各通常行動機会」の候補比較を定めるが、4のたまご交換選択をdecision opportunityとして記録・比較する規則を定めていない。108は計画JSONの`egg_bottom`で値を先に固定しており、独立初期順に対する通常意思決定ではない。114も通常行動候補のhardeningだけで、手札から山札下へ置く複数候補の比較contractを持たない。

したがって4経路はすべて、最初の手札7枚が判明した時点で`egg_exchange_choice_unresolved`として停止する。山札下カードを恣意的に選び、その後の対戦をcompleted化しない。

## 二次的に確認できる通常行動blocker

たまご交換を任意に通過させた場合でも、少なくとも3経路では人物カードを1枚山札下へ置いても別の時0人物が残る。

- order-01 A先手: `P-cat_ceo`と`P-desert_scorpion`
- order-01 B先手: `C-bat`、`C-box`、`P-cat_ceo`
- order-02 B先手: `C-chameleon`と`P-cat_ceo`

時0人物配置と`pass`は、上位3項目と時収支が同じで、配置側は手札が減り盤面が増える。114の3成分Pareto比較では`hand=worse / board=better / reservations=equal`となり、tradeoffのため`unresolved_canonical_text`で停止する。

order-02 A先手では時0人物は`C-chameleon`1枚であり、たまご交換で山札下へ置けばこの二次blockerを避けられる。しかし、その山札下選択自体が未定義なので、4経路共通の最初の停止理由は変わらない。

二次blockerは、たまご交換を仮に裁定した対戦結果として扱わず、downstream evidenceとして監査JSONへ保存する。

## 成果物

- 正本文書: `115-normal-decision-first-choice-audit.md`
- machine-readable plan: `data/proxy-normal-decision-first-choice-plan-115-20260918.json`
- application audit: `data/proxy-normal-decision-first-choice-audit-115-20260918.json`
- builder／validator: `tools/proxy_normal_decision_first_choice_audit.py`
- 回帰テスト: `tools/test_proxy_normal_decision_first_choice_audit.py`
- `tools/check-design-data.py`への接続
- READMEとDraft PR #259本文の更新

`proxy-fixtures-115`、`proxy-matches-115`、`proxy-decision-traces-115`は作らない。

## audit schema

監査JSONは次を持つ。

- checkpoint、status、source、114 contract参照
- shuffle algorithmと2組のseed
- machine-readable planに固定した各order／playerの全40 card copy／card／initial instance ID
- 各order／playerのorder hashと先頭7 card copy／card／initial instance ID
- 4経路のfirst player、停止round／phase／actor
- 判断前の7枚手札と、山札下へ置ける全card copy ID
- `egg_exchange_choice_unresolved`の根拠
- downstream zero-cost-person-versus-pass evidence
- fixture／completed／trace／winner／independent sample各0
- 112の6 fixture未実施、現行452、登録477、変更ID 0

4経路はmatch recordではないため、`winner: null`を持つ疑似completed recordを作らない。監査項目として`winner_count: 0`を持つ。

## validator

validatorは少なくとも次を拒否する。

- `random.Random(seed).shuffle`以外の順序またはseed変更
- source 40枚からのcard copy／initial instance集合の欠落・重複・追加
- order間が同じ、または同一orderの先後鏡像で順序が異なる状態
- 初手5、通常ドロー、追加ドローと再生成順の不一致
- 山札下候補が7枚の手札全体と一致しない状態
- 4経路未満、停止phase／actor／reasonの改変
- completed、winner、balance sample、fixture、traceの混入
- 112 fixtureのcompleted化
- 現行452、登録477、カード本文・数値・登録区分の変更

## テスト方針

テストを先に追加し、未実装moduleによるREDを正しいtools working directoryで確認する。

1. 2 order×A/Bの固定seed再生成と40枚同一性。
2. order間の独立、鏡像間の同一順序。
3. planの全40枚、auditの先頭7枚とorder hashの保存一致。
4. 4経路すべてのR1 egg exchange停止。
5. 山札下候補が判断前手札7枚と完全一致。
6. 3経路の複数時0人物と、order-02 A先手の単一人物を区別。
7. downstream人物配置対passを結果へ数えない。
8. fixture／completed／trace／winner／独立標本0。
9. 112・現行452・登録477の境界維持。
10. seed、順序、停止理由、false completionの破損拒否。
11. 保存JSONとbuilder再生成結果の完全一致。

専用テストGREEN後、全proxy回帰、`check-design-data.py`、canonical再生成一致、`git diff --check`を実行する。

## 却下した案

### 1. 108の`egg_bottom`を流用する

固定線用の事前選択を独立初期順へ持ち込み、通常意思決定を実施したように見せるため採用しない。

### 2. 人物配置を盤面価値でpassより上とする

114が禁止した任意の総合点または暗黙のカード強度を直後に導入するため採用しない。

### 3. 4戦を完成させるため一時的な例外を置く

停止条件、再現可能性、公開情報限定の比較を壊すため採用しない。

## 115後の再開地点

116では対戦を増やさず、次の2点を整理する。

1. 通常行動外の複数選択、特にたまご交換の記録項目と比較規則。
2. 時0人物配置とpassの手札／盤面tradeoffを、任意のカード強度点なしで扱えるか。

両方が一意化するまで、115の4経路をcompletedへ戻さない。修正後は同じseedと同じsource 40枚から4戦を最初から再開する。
