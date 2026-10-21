# 114 通常意思決定protocol hardening

更新日: 2026-09-18

## 結論

113で通常意思決定4戦を止めた3 blockerを、対戦を増やさず解消した。

1. A/B各40枚の和集合41 card IDについて、通常行動・反応、時、前提、対象、候補分岐、合法／不成立条件、正本参照先を手動候補表へ固定した。
2. 判断前状態を`hand / board / time / growth / reservations`へ統一し、nested必須keyと公開情報whitelistをvalidatorへ固定した。
3. 107の優先順位を維持した候補比較、時収支、手札・盤面・予約のPareto比較、判断不能停止、完全同点時のtie-breakを一意化した。

114のfixture・completed・trace・独立balance標本はすべて0である。113で予定した独立初期順2組×先後鏡像4戦は115へdeferredとし、114では順序fixtureも仮の勝敗も作っていない。

## 保存物

- 手動候補表: [data/proxy-normal-decision-candidate-table-114-20260918.json](data/proxy-normal-decision-candidate-table-114-20260918.json)
- hardening contract: [data/proxy-normal-decision-hardening-114-20260918.json](data/proxy-normal-decision-hardening-114-20260918.json)
- builder／validator: [tools/proxy_normal_decision_hardening.py](tools/proxy_normal_decision_hardening.py)
- 回帰テスト: [tools/test_proxy_normal_decision_hardening.py](tools/test_proxy_normal_decision_hardening.py) 13件
- 設計仕様: [plans/2026-09-18-normal-decision-protocol-hardening-design.md](plans/2026-09-18-normal-decision-protocol-hardening-design.md)
- 実装計画: [plans/2026-09-18-normal-decision-protocol-hardening.md](plans/2026-09-18-normal-decision-protocol-hardening.md)

## 1. 対象41 IDの手動候補表

107のsource fixtureにあるA/B各40枚からcard IDの和集合を機械的に導き、41 IDとの完全一致を検査する。対象はメイン、なかま、こいびと、セカイ、あそび、あいてむ、できごとの7種類である。

各IDは次を省略せず持つ。

- action typeと使用タイミング
- 基本時コストまたはメインの段階差コスト
- 前提、対象、候補分岐
- legal when／not legal when
- 正本文の参照先

通常行動で使えない反応専用カードも表から除外せず、`reaction_only`等のtimingと、通常行動候補にならない条件を記録した。`pass`はカード外の常設候補として必須化した。

この表は対象41 IDの手動裁定であり、全452件の完全自動合法性判定ではない。カード効果を自動解決する対戦エンジンも追加していない。

既存候補器が扱っていた通常ちょうせん（ちから／ちえ）と交際進行は、カード表で置き換えず`preserved_existing_candidate_families`として維持する。41 ID表、既存2候補群、常設`pass`を合わせて115の列挙入力とする。

## 2. 判断前状態と公開情報

`pre_decision_state`の必須かつ許可されたkeyは次の5件だけとする。

- `hand`
- `board`
- `time`
- `growth`
- `reservations`

`board`は`main / companions / partner / partner_stage / world / prepared`だけを持つ。108由来の`field`、必須key欠落、未知keyは拒否する。

`public_information`は`information_policy / own_hand / own_board / opponent_board / growth / time / discard / reservations`だけを許可し、policyは`public_and_owner_known_only`固定とする。相手の手札、未公開山札順、未知keyは拒否する。候補選択に将来の引きや記録者だけが知る情報を用いない。

## 3. 候補比較

候補は107どおり次の順で比較し、上位で差がつけば下位を参照しない。

1. 敗北・勝負途中終了の回避
2. 自分のそだち100維持・相手の100維持阻止
3. 確定そだち差
4. 時収支
5. 手札・盤面・予約価値

時収支は、同じ解決内で確定する増減を含む`time_after_certain_resolution`の大きい方を上位とする。将来使えるかもしれない盤面価値を時へ換算しない。したがって上位3項目が同じなら、時を使わない`pass`が有料配置・有料使用より上位になり得る。

時収支まで同じ時だけ、手札、盤面、予約を`better / equal / worse / incomparable`で比較する。全成分で同等以上かつ1成分以上で上ならPareto優越とする。tradeoffまたは`incomparable`があれば任意の総合点を付けず、`unresolved_canonical_text`で停止する。

5段階がすべて同値と確認できた時だけ、低い時支払い、少ない消費枚数、小さいcard copy IDの順でtie-breakする。比較不能を同点扱いしてtie-breakへ送らない。

## 4. 113 blockerの解消状態

| 113 blocker | 114の解消 |
|---|---|
| `candidate-coverage-incomplete` | source由来41 ID・7種類との完全一致、常設pass、各IDの手動action裁定 |
| `pre-decision-schema-mismatch` | `board`を含むexact nested schema、公開情報whitelist、未知key拒否 |
| `priority-comparison-unresolved` | 上位順、確定時収支、Paretoだけの価値比較、判断不能停止、限定tie-break |

3件はprotocol上解消したが、4戦を実施して経路が安定したことまでは意味しない。115でこのcontractを既存materializerへ接続し、4戦を最初から作り直す。

## 5. RED→GREEN

先に12テストを追加し、新moduleがない`ModuleNotFoundError`をREDとして確認した。最小実装後、保存contractがない1件だけが失敗する状態を確認し、canonical contractを書き出して12件GREENにした。自己レビューで既存の通常ちょうせん／交際進行を機械可読に維持する13件目を追加し、key欠落のRED後にGREENへした。

総合検査にも114の成果物、41 ID、7種類、3 blocker解消、strict schema、比較順、対戦成果物0、deferred 4戦、112維持、母集団維持を先に接続した。正本文書未作成によるREDを確認してから本書とREADMEを追加した。

## 6. 維持した境界

- 112の対象fixture 6件はstatus `fixture`、event空、winner `null`の未実施を維持する。
- 113のfixture、completed、独立balance標本は0のまま、予定4戦はdeferredを維持する。
- 現行452、登録477候補＝CARD463＋HOLD14を変更しない。
- 新12、旧24、HOLD14、legacy4、未棚卸しsourceの区分を変更しない。
- カード本文・数値・登録区分の変更は0件。
- 本編実装、表情、イラスト、別PRの変更を含めない。

## 次の再開地点

115で113のdeferred batchにある独立初期順2組をmaterializeし、それぞれ先後鏡像にした4戦をこのcontractで最初から実施する。114以前の不完全な仮出力は再利用しない。

各判断で41 ID表、strict schema、公開情報whitelist、107比較順を適用する。判断不能になった場合は勝者やカード強度を推測せず、その箇所を保存して停止する。4戦が安定するまで、未実施112 fixture 6件や追加の強度標本へ進まない。
