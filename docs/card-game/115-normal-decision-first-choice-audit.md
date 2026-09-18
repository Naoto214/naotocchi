# 115 通常意思決定 first-choice application audit

更新日: 2026-09-18

## 結論

113で予約し、114でprotocolを補強した独立初期順2組へseed付きshuffleを適用した。order-01はA=50／B=100050、order-02はA=51／B=100051である。A/B各40枚の既存card copy ID／card ID／initial instance IDを順序だけ並べ替え、同一orderの先後鏡像は同じ順序を参照する。

適用結果は、**4経路すべてR1たまご交換で停止**した。通常行動前に手札7枚から山札下へ置く1枚を選ぶ必要があるが、107・114は通常行動候補の比較contractであり、この通常行動外の複数選択を比較する規則を持たない。恣意的な`egg_bottom`を置かず、`egg_exchange_choice_unresolved`として停止した。

115のfixture・completed・trace・winner・独立balance標本はすべて0である。4経路は対戦記録ではなく、勝率、先後差、発動率、カード強度へ数えない。

## 保存物

- 全40枚manifest plan: [data/proxy-normal-decision-first-choice-plan-115-20260918.json](data/proxy-normal-decision-first-choice-plan-115-20260918.json)
- application audit: [data/proxy-normal-decision-first-choice-audit-115-20260918.json](data/proxy-normal-decision-first-choice-audit-115-20260918.json)
- builder／validator: [tools/proxy_normal_decision_first_choice_audit.py](tools/proxy_normal_decision_first_choice_audit.py)
- 回帰テスト: [tools/test_proxy_normal_decision_first_choice_audit.py](tools/test_proxy_normal_decision_first_choice_audit.py) 10件
- 設計仕様: [plans/2026-09-18-normal-decision-first-choice-audit-design.md](plans/2026-09-18-normal-decision-first-choice-audit-design.md)
- 実装計画: [plans/2026-09-18-normal-decision-first-choice-audit.md](plans/2026-09-18-normal-decision-first-choice-audit.md)

`proxy-fixtures-115`、`proxy-matches-115`、`proxy-decision-traces-115`は作成していない。

## 1. 固定shuffleと全40枚manifest

入力は107のA先手fixtureにあるA/B各40枚とし、各playerで配列を複製してから対応seedを持つ新しい`random.Random` instanceへ`shuffle`を1回だけ適用した。

```python
shuffled = copy.deepcopy(cards)
random.Random(seed).shuffle(shuffled)
```

planにはmaterialize時の`CPython 3.12.14`、`MT19937`、アルゴリズム名、seed、全40枚のcard copy ID／card ID／initial instance IDを保存した。validatorはsourceとの集合完全一致、40枚、重複なし、order-01／02の相違、canonical再生成一致を検査する。seedだけに依存せず採用した全順序を残すため、将来runtime実装が変化しても115の順序をplanから確認できる。

| order | player | seed | 40枚順SHA-256 |
|---|---|---:|---|
| order-01 | A | 50 | `42eae32bda4c2675dca5ef9978977b53a62d85bbcfc8d15d4a120d2e074209fc` |
| order-01 | B | 100050 | `d8ace1a8b17ee4cadca017928042a8dc1d0fe1dac0456ea446894b267aba445e` |
| order-02 | A | 51 | `a6e47b6b40d47560ec4ecc77d58185e67bc86f115a14458a92149abf1410c6c2` |
| order-02 | B | 100051 | `14e4c7e41104baaadc32869befc7c9667cfcae16e31a97ee225ba5e4e931931e` |

## 2. 最初の7枚と停止地点

R1ターン開始は、時を1へ更新し、通常ドロー1枚、メイン不在のたまご追加ドロー1枚を行う。そのため初手5枚と合わせた7枚が、山札下選択直前の手札になる。

| order | first player | 判断前7枚のcard ID |
|---|---|---|
| order-01 | A | `G-air-hockey`、`P-cat_ceo`、`M-beetle-01`、`M-antlion-02`、`E-first-date`、`M-beetle-02`、`P-desert_scorpion` |
| order-01 | B | `C-bat`、`M-beetle-02`、`E-boss`、`C-box`、`M-antlion-01`、`W-deepsea`、`P-cat_ceo` |
| order-02 | A | `I-bowtie`、`M-antlion-07`、`E-fateful-transform`、`I-sleepboost1`、`M-antlion-02`、`C-chameleon`、`G-basketball-3d` |
| order-02 | B | `M-beetle-01`、`I-poop1`、`M-antlion-01`、`C-chameleon`、`I-bowtie`、`P-cat_ceo`、`G-basketball-3d` |

各経路は次を共通に持つ。

- round: 1
- phase: `egg_exchange_choice`
- actor: その経路のfirst player
- reason: `egg_exchange_choice_unresolved`
- bottom candidates: 判断前手札7枚のcard copy ID全件

108の固定線では事前planに`egg_bottom`を置いたが、それを新しい独立順へ流用すると選択を実施したように見える。115では山札下カードを選ばず、通常行動、event、snapshot、winnerを作っていない。

## 3. downstream evidence

たまご交換を仮に通過させた場合、先頭7枚の時0人物は次のとおりである。

| path | 時0人物 | 1枚を山札下へ置いた後の最小残数 | 分類 |
|---|---|---:|---|
| order-01 A先手 | `P-cat_ceo`、`P-desert_scorpion` | 1 | unavoidable |
| order-01 B先手 | `C-bat`、`C-box`、`P-cat_ceo` | 2 | unavoidable |
| order-02 A先手 | `C-chameleon` | 0 | unresolved egg choice次第 |
| order-02 B先手 | `C-chameleon`、`P-cat_ceo` | 1 | unavoidable |

少なくとも3経路では人物を1枚山札下へ置いても別の時0人物が残る。時0人物配置とpassは、敗北／途中終了回避、100維持／阻止、確定そだち差、時収支が同じで、配置側は`hand=worse / board=better / reservations=equal`となる。114のPareto規則ではtradeoffのため`unresolved_canonical_text`で停止する。

order-02 A先手は`C-chameleon`を山札下へ置けばこの二次blockerを避けられるが、その選択自体を比較する規則がない。downstream evidenceは仮の行動、発動0、対戦結果へ数えない。

## 4. RED→GREEN

最初に固定seed、先頭7枚、40枚同一性を要求する3テストを書き、新module不在の`ModuleNotFoundError`をREDとして確認した。最小shuffle／plan builder後に3件をGREENへした。

次に4停止経路、7候補、成果物0、false completion拒否の4テストを追加し、audit builder未定義のImportErrorをREDとして確認した。最小audit実装後に7件をGREENへした。

続いてdownstream evidence 2件を追加し、人物抽出関数未定義のImportErrorをREDとして確認した。114の実際の比較関数へ接続して9件をGREENへした。最後に保存一致1件を追加し、write／materialized検査未定義のImportErrorをREDとして確認してから、canonical plan／auditを書き出し10件をGREENへした。

総合検査には115の5成果物、seed、2 order×A/B×40枚、4停止経路、3 downstream blocker、成果物0、112・母集団境界、10テスト、CLI再生成一致を先に接続した。本書のmissingと、それに連鎖した`--catalog`失敗をREDとして確認してから本書とREADMEを追加した。

## 5. 維持した境界

- 112の対象fixture 6件はstatus `fixture`、event空、winner `null`の未実施を維持する。
- 115の4経路はfixtureでもcompleted recordでもなく、実施対戦数は0である。
- 現行452、登録477候補＝CARD463＋HOLD14を変更しない。
- 新12、旧24、HOLD14、legacy4、quick内部50、単独モード、めぐる等の区分を変更しない。
- カード本文・数値・登録区分の変更は0件。
- 対戦エンジン、完全自動合法性判定、任意のカード価値点を追加しない。
- 本編実装、表情、イラスト、別PRの変更を含めない。

## 次の再開地点

116では対戦を増やさず、通常行動外の複数選択、特にたまご交換の記録項目と比較規則を整理する。同時に、時0人物配置とpassの手札／盤面tradeoffを、任意のカード強度点なしで一意に扱えるか検討する。

両方が解消するまで115の4経路をcompletedへ戻さない。解消後は同じsource、同じ4 seed、同じ全40枚manifestから4戦を最初から再開する。
