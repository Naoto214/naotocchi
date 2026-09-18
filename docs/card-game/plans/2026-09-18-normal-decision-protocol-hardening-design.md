# Normal Decision Protocol Hardening Design

更新日: 2026-09-18

## 目的

113で停止した通常意思決定反復を再開する前に、次の3 blockerを解消する。

1. 対象デッキに含まれるカード種類の合法候補表が不足している。
2. 判断前状態のnested schemaと公開情報境界が107に一致していない。
3. 107の優先順位で、有料行動と`pass`を一意に比較できない。

チェックポイント114はprotocol hardeningだけを保存する。113でdeferredにした独立初期順2組×先後鏡像4戦は実施せず、fixture、completed記録、判断trace、勝敗を作らない。4戦の実施は115へ送る。

## 対象と不変条件

- sourceは`data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json`とする。
- A/B各40枚、7種類、card copy ID、initial instance IDを変更しない。
- A/Bの和集合41 card IDを手動候補表の対象とする。
- 112の未実施fixture 6件を変更しない。
- 113のfixture数、completed数、独立balance標本数0を変更しない。
- 現行452、登録477、カード本文、数値、登録区分を変更しない。
- 対戦エンジン、カード効果の自動解決、完全自動合法性判定は作らない。

## 成果物

- 正本文書: `114-normal-decision-protocol-hardening.md`
- machine-readable contract: `data/proxy-normal-decision-hardening-114-20260918.json`
- 対象41 IDの手動候補表: `data/proxy-normal-decision-candidate-table-114-20260918.json`
- builder／validator: `tools/proxy_normal_decision_hardening.py`
- 回帰テスト: `tools/test_proxy_normal_decision_hardening.py`
- `tools/check-design-data.py`への接続
- READMEの最新地点とロードマップ更新

新しい対戦fixture、completed record、trace、evaluationは114成果物に含めない。

## 手動合法候補表

各card IDについて、少なくとも次を固定する。

- `card_id`
- `card_type`
- `action_type`
- `timing`
- `base_time_cost`
- `prerequisites`
- `target_rule`
- `candidate_variants`
- `legal_when`
- `not_legal_when`
- `source_text_reference`

同じカードが複数の通常行動を持つ場合はaction entryを分ける。対象局面で候補を作らないカードも行を省略せず、通常行動候補にならない理由を`not_legal_when`へ記録する。`pass`はカード表とは別の常設候補として必須化する。

この表は対象41 IDに対する対戦前の手動裁定であり、カードプール全体の一般エンジンではない。validatorは41 IDの完全一致、7種類の包含、必須欄、未知欄、重複action entry、source fixtureとの集合一致を検査する。

## 判断前状態schema

`pre_decision_state`の許可keyを次の5件に限定する。

1. `hand`
2. `board`
3. `time`
4. `growth`
5. `reservations`

5件はすべて必須とし、`field`を拒否する。`board`は少なくとも`main`、`companions`、`partner`、`partner_stage`、`world`、`prepared`を持ち、未知keyを拒否する。

判断根拠として保存できる`public_information`の許可keyは次に限定する。

- `information_policy`
- `own_hand`
- `own_board`
- `opponent_board`
- `growth`
- `time`
- `discard`
- `reservations`

`information_policy`は`public_and_owner_known_only`固定とする。相手の手札、相手または自分の未公開山札順、未公開の予約内容、その他の未知keyを拒否する。候補選択はこのwhitelistに存在する実情報だけを参照し、記録者の将来知識を使わない。

## 107優先順位の比較contract

候補は上位から逐次比較し、差がついた時点で下位を参照しない。

1. 敗北・勝負途中終了の回避
2. 自分のそだち100維持・相手の100維持阻止
3. 確定そだち差
4. 時収支
5. 手札・盤面・予約価値

各候補は比較根拠とともに上記5段階の評価を持つ。未公開情報、将来の引き、相手の未知選択、確率的な期待値は「確定」評価へ含めない。

### 時収支

時収支は、その候補の支払いと同じ解決内で確定する増減を反映した`time_after_certain_resolution`で比較し、大きい方を上位とする。単に将来使えるかもしれない盤面価値で時支払いを相殺しない。

したがって、上位3項目が同じなら、時を支払わない`pass`が有料行動より上位になり得る。この保守的結果を114の正式contractとする。

### 手札・盤面・予約価値

時収支まで同じ候補だけを、`hand`、`board`、`reservations`の3成分で比較する。各成分の候補間比較は`better`、`equal`、`worse`、`incomparable`のいずれかとし、確認できる状態差と理由を併記する。

候補Xが候補Yに対して全成分で`better`または`equal`、かつ1成分以上で`better`ならXをPareto優越とする。相互に優越しない場合、または1成分でも`incomparable`なら、任意の総合点や暗黙のカード強度を導入せず`unresolved_canonical_text`で停止する。

### 完全同点時

5段階がすべて同値と確認できた場合だけ、107どおり次で決める。

1. 低い時支払い
2. 少ない消費カード枚数
3. 小さいcard copy ID

`incomparable`を同点として扱ってtie-breakへ送らない。

## validator境界

validatorは少なくとも次を拒否する。

- 41 IDの欠落、余分なID、重複entry
- 7種類の欠落
- `pass`の欠落
- `pre_decision_state.field`
- nested必須keyの欠落または未知key
- `opponent_hand`、`deck_order`などwhitelist外の情報
- 優先順位の並べ替え
- 上位差があるのに下位理由で選んだ記録
- `incomparable`を総合点またはtie-breakで解消した記録
- 時収支で将来価値を加点した記録
- 114にfixture、completed record、trace、winner、balance sampleを混入した成果物

114では実対戦をmaterializeしないため、判断record validatorの完全実装ではなく、schema contractと比較例を検査できる最小実装に留める。115で4戦を最初からmaterializeする際、このcontractを既存pilotへ接続する。

## テスト方針

実装前に次を要求する回帰テストを書き、未実装moduleまたは未実装contractによるREDを実際に確認する。

1. sourceから導いた41 IDと候補表が完全一致する。
2. 全7種類、全必須欄、常設`pass`を満たす。
3. `board` schemaを受理し、`field`と未知nested keyを拒否する。
4. 公開情報whitelistを受理し、相手手札、山札順、未知keyを拒否する。
5. 時収支までの辞書式比較と、有料行動に対する`pass`優越例を固定する。
6. 価値3成分のPareto優越と`incomparable`停止を固定する。
7. 完全同点時だけ3 tie-breakを順番どおり適用する。
8. 114の対戦・fixture・balance標本が0である。
9. 112・113、現行452、登録477の境界を維持する。
10. 保存JSONとbuilder再生成結果が一致する。

GREEN後に専用テスト、既存proxy回帰、`check-design-data.py`、保存一致、`git diff --check`を実行する。

## 却下した案

- 手札・盤面・予約へ任意の総合点を付ける案: 未測定のカード強度を判断規則へ埋め込むため採用しない。
- 全カードの完全自動合法性判定を作る案: 今回の対象と必要性を超え、対戦エンジン化するため採用しない。
- 3 blockerを仮裁定したまま4戦を作る案: 107の再現可能性と113の停止判断を壊すため採用しない。

## 114後の再開地点

114の保存・検証・Draft PR同期後、115で113の`deferred_batch`にある独立初期順2組をmaterializeし、各順序を先後鏡像にした4戦を最初から実施する。114以前の不完全な仮出力は再利用しない。
