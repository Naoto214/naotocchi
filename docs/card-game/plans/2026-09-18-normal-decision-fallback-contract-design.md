# Normal Decision Fallback Contract Design

更新日: 2026-09-18

## 目的

115で固定seedの独立初期順2組×先後鏡像4経路を適用したところ、全経路がR1のたまご交換で停止し、少なくとも3経路ではその後に時0人物配置と`pass`の比較不能が見込まれた。116では、この2種類の停止要因を恣意的なカード強度評価なしで再現可能に処理するfallback契約を固定する。

116はprotocol checkpointであり、対戦実施checkpointではない。115の4経路は再開せず、fixture、completed record、decision trace、event、snapshot、winner、独立balance標本を作らない。実対戦の再開は117へ送る。

## 結論と範囲

次の2規則を追加する。

1. たまご交換などの必須複数選択もdecision opportunityとして記録する。既存優先順位で一意にならず、合法候補を完全列挙できる場合は、選択が戦略的に未解決であることを保持したまま、判断ごとに独立したseed抽選で継続する。
2. 空き枠への安全な時0人物配置が定義済み条件をすべて満たす場合、その配置は`pass`より上位とする。複数の安全な配置が比較不能ならseed抽選で1件を選ぶ。

この契約はproxy対戦の意思決定手順であり、カードルール、カード本文、カード数値、登録区分を変更しない。カードプール全体の対戦エンジンや完全自動合法性判定は作らない。

## decision opportunityの拡張

判断記録の`decision_kind`は少なくとも次を区別する。

- `normal_action`: 107・114で扱う通常行動機会。
- `mandatory_choice`: ルールまたは解決中の効果により、複数の合法候補から必ず1件を選ぶ機会。

たまご追加ドロー後に手札から1枚を山札の一番下へ置く選択は`mandatory_choice`とする。判断前の手札、場、時、そだち、予約、公開情報、完全な合法候補、選択結果、次点または比較不能候補、理由、支払い、対象、連鎖を保存する。通常行動だけを記録対象とした107の範囲を拡張するが、107の優先順位と公開情報限定は維持する。

## 解決mode

各判断は次の`resolution_mode`のいずれかを持つ。

### `priority_unique`

107・114の既存優先順位、Pareto比較、完全同点時tie-breakによって一意に選べた場合に使う。`strategic_unresolved`は`false`とする。

### `safe_free_development`

後述する安全な無料盤面化により、時0人物配置が`pass`を上回った場合に使う。安全な配置候補が1件ならその候補を選び、`strategic_unresolved`は`false`とする。

安全な配置候補が複数あり、既存優先順位で一意にできない場合、`pass`に対する優越根拠は`safe_free_development`として記録するが、候補間の最終選択は`seeded_fallback`として記録する。1判断につき最終的な`resolution_mode`は1件だけとし、この場合は`seeded_fallback`を採用し、理由の中に安全な無料盤面化の候補集合であることを残す。

### `seeded_fallback`

合法候補を完全列挙できるが、既存優先順位で一意に比較できない場合に使う。`strategic_unresolved`は必ず`true`、`reason_code`は`strategic_unresolved_seeded_fallback`とする。

seed抽選は戦略的な優劣を追加しない。抽選結果は最適判断、カード強度、勝率、先後差の根拠にしない。

## 判断ごとに独立したseed抽選

候補は安定したcanonical candidate IDを持ち、そのIDの昇順で並べる。card copyを選ぶ候補ではcard copy IDをcanonical candidate IDとする。候補配列に重複を許さない。

seed材料は次の9要素だけで構成し、この順序のJSON配列として固定する。

- fallback契約version
- 固定初期順ID
- actor player ID
- actor turn index
- round
- phase
- `decision_kind`
- choice kind
- canonical candidate IDの昇順配列

Python表記では`json.dumps(seed_material, ensure_ascii=False, separators=(",", ":"))`に相当する空白なしUTF-8 JSONをcanonical serializationとする。文字列、整数、配列の型を変えず、object key順へ依存しない。candidate IDはUnicode code point順の文字列昇順とする。seed材料への要素追加、削除、並べ替えを認めない。

`seed_context`は先頭8要素のexact keysだけを持つ。versionは契約versionと完全一致する文字列、order ID・phase・choice kindは非空文字列、actorは`A`または`B`、actor turn index・roundはboolを除く1以上の整数、decision kindは`normal_action`または`mandatory_choice`で、外側のdecision kindと一致する。9要素目には完全集合ではなく`seeded_fallback_candidates`の昇順抽選部分集合を使う。

先後鏡像で同じplayerが同じ候補状態に到達した場合に同じ選択となるよう、fixture ID、match ID、先手player ID、経路名はseed材料へ含めない。player Aとplayer Bはactor player IDで区別する。

canonical serializationのUTF-8 bytesからSHA-256 digestを作り、digestをbig-endian unsigned integerとして解釈する。候補数を`N`としたとき、`selected_index = digest_integer mod N`とし、昇順候補配列の`selected_index`を選ぶ。対戦全体で順番に消費する疑似乱数列は使わない。これにより、別の判断を途中へ追加しても後続判断の抽選結果はずれない。

判断記録には次を保存し、validatorが再計算する。

- seed材料を構成する各field
- canonical serialization
- SHA-256 hexadecimal digest
- 昇順の候補配列
- 候補数
- selected index
- selected candidate

## 安全な時0人物配置

なかま／こいびとの通常配置と`pass`を比較するとき、次をすべて満たす配置だけを安全な無料盤面化とする。

1. 対応する配置枠が空いている。
2. その局面で実際の時支払いが0である。
3. 既存人物との交代、捨て札、領域離脱を伴わない。
4. 配置する人物カード以外の手札、場、予約を消費しない。
5. 配置または配置時能力に、公開情報から確定できる不利益がない。
6. 配置自体が合法で、対象や追加選択を未解決のまま残さない。

人物カードの手札から盤面への移動は、この比較に限り「消費カード枚数」ではなく、保持したカードの領域移動として扱う。上位4項目が同じなら、安全な無料盤面化は盤面利用可能性を増やし、追加の時・カード消費・確定不利益がないため、`pass`を上回る。

次は安全な無料盤面化から除外する。

- 枠が満員で交代または離脱が必要な配置
- 実支払いが1以上の配置
- 追加の手札、場、予約を支払う配置
- 配置時に強制される確定不利益がある配置
- 合法性、対象、強制効果を既存正本だけで確定できない配置

複数の安全な配置候補について既存優先順位で一意に決まらない場合、カード強度点を付けず`seeded_fallback`へ送る。

## 記録schema

fallback対象を含む各判断記録は、既存107・114項目に加えて少なくとも次を持つ。

- `decision_kind`
- `resolution_mode`
- `strategic_unresolved`
- `legal_candidates`
- `selected_candidate`
- `runner_up_candidates`
- `reason_code`
- seed抽選時の完全なseed証跡

`legal_candidates`はその判断で実際に合法な候補の完全集合でなければならない。安全配置resolverはこれを必須引数`legal_candidate_ids`として受け取り、`pass`とcallerが列挙した全合法行動を保存する。`placements`は既存優先順位適用後の比較不能な安全配置である。

seeded modeでは別fieldの`seeded_fallback_candidates`を必須とし、非空・一意・昇順で完全集合内、selected candidateを含む抽選部分集合を保存する。安全配置では安全な配置IDだけを含め、劣位の`pass`を抽選へ入れない。純粋なfallbackですべての合法候補が比較不能なら両集合は一致する。

必須の`runner_up_candidates`は一意な非空文字列IDの配列で、selected candidateを含まない。seeded modeでは抽選部分集合からselectedを除いた集合と一致する。一意の安全配置では比較で劣位になった`pass`を`["pass"]`として残し、他の合法行動の順位は追加しない。

安全配置resolverの両branchでは、contextのdecision kind・phaseを`normal_action`、choice kindを`zero_cost_person_placement`に固定する。seeded validatorはresolverのselected placementとpass優越・領域移動・追加消費0の安全性証跡を受理し、selected IDと安全条件の一致を検査する。

`seeded_fallback`以外ではseed証跡を持たない。`seeded_fallback`ではseed証跡、`strategic_unresolved: true`、固定reason codeのすべてを必須とする。

## 継続条件と停止条件

次をすべて満たす場合、戦略比較不能だけを理由に停止せずseed抽選で継続できる。

- 合法候補を完全に列挙できる。
- 各候補に安定したcanonical candidate IDがある。
- 公開情報と自分だけが知る情報の許可範囲を守っている。
- ルール上、いずれか1候補を選べば解決を継続できる。
- card copy、instance、領域、予約、event、snapshotの整合性を保持できる。

次の場合はfallbackせず、その地点で停止して不足を記録する。

- 合法候補を完全に列挙できない。
- 非公開の相手情報や将来知識を参照しなければ候補を作れない。
- 候補へ安定した識別子を付けられない。
- 既存ルールだけでは候補の合法性を確定できない。
- card copy、instance、予約、領域、event、snapshotまたはhashの整合性が壊れる。
- seed証跡を再計算できない、または保存結果と一致しない。

## completed記録と評価上の扱い

将来のcheckpointで、seed抽選を含む対戦も、ルール処理と記録整合性が最後まで成立すれば`completed` replay recordにできる。ただし「最適判断を再現した対戦」とは扱わない。

対戦単位で少なくとも次を集計する。

- `strategic_unresolved_count`
- `seeded_fallback_count`

どちらかが1以上の対戦は、独立balance標本へ加算しない。勝敗を保存しても、勝率、先後差、発動率、カード強度、カード採否の根拠には使わない。seed抽選の選択頻度や結果もカード評価へ使わない。117で4経路がcompletedになっても、独立balance標本は0を維持する。

## 116の成果物

- 正本文書: `116-normal-decision-fallback-contract.md`
- machine-readable contract: `data/proxy-normal-decision-fallback-contract-116-20260918.json`
- builder／validator: 既存命名規則に沿う最小tool
- 回帰テスト
- `tools/check-design-data.py`への接続
- READMEとDraft PR #259本文の更新

116では次を新規作成しない。

- 対戦fixture
- completed match record
- decision trace
- event、snapshot
- winner
- 独立balance標本

112の未実施fixture 6件、115の4経路監査、現行カタログ452、登録履歴477、カード本文・数値・登録区分を変更しない。

## validator境界

validatorは少なくとも次を拒否する。

- `decision_kind`または`resolution_mode`の未知値
- `seeded_fallback`なのに`strategic_unresolved`が`false`
- `seeded_fallback`なのにseed証跡または固定reason codeがない
- seed材料、SHA-256、候補順、候補数、selected index、selected candidateの不一致
- candidate IDの未整列、重複、欠落、余分な候補
- 不完全な合法候補集合に対するseed抽選
- 安全条件を1件でも満たさない配置を`safe_free_development`とする記録
- 複数の比較不能な安全配置からseedなしで1件を選ぶ記録
- seed使用対戦を独立balance標本へ加算する記録
- 116成果物へのfixture、completed record、trace、event、snapshot、winnerの混入
- 現行452、登録477、カード本文・数値・登録区分の変更

合法候補の完全性は、対象局面に対する既存の手動候補表と保存状態を照合する範囲で検査する。全カード、全局面の完全自動合法性判定へ拡張しない。

## テスト方針

実装前に回帰テストを追加し、未実装moduleまたは未接続contractによるREDを実際に確認する。少なくとも次を固定する。

1. mandatory choiceをdecision opportunityとして受理する。
2. card copy ID順の候補から、固定seed材料に対して同じSHA-256、index、選択結果を再現する。
3. fixture ID、match ID、先手情報をseed材料へ入れず、同一player・同一候補状態の鏡像で同じ結果となる。
4. 別判断の追加が後続判断の結果をずらさない。
5. seed証跡の欠落または改変を拒否する。
6. 未整列、重複、不完全な合法候補集合を拒否する。
7. `seeded_fallback`と`strategic_unresolved`、reason codeの組合せを検査する。
8. 安全な時0人物配置の全条件を満たす例だけを`pass`より上位にする。
9. 枠満員、交代、時支払い、追加消費、確定不利益、合法性不明の各例を拒否する。
10. 複数の安全配置候補をseed抽選へ送る。
11. seed使用記録の集計と独立balance標本0を検査する。
12. fixture、completed、trace、event、snapshot、winner各0を検査する。
13. 112・115、現行452、登録477の境界を維持する。
14. 保存JSONとbuilder再生成結果を一致させる。

専用テストGREEN後、全proxy回帰、`check-design-data.py`、canonical再生成一致、`git diff --check`を実行する。

## 却下した案

### 1. 比較不能時に常に小さいcard copy IDを選ぶ

107の小さいcard copy IDは完全同点時の最終tie-breakであり、戦略的に比較不能な候補を同点とみなす根拠にはならないため採用しない。

### 2. 対戦全体で1本のseed付き乱数列を消費する

途中に判断が追加されると以降の選択がすべてずれ、局所的な再現性と鏡像比較を損なうため採用しない。

### 3. 人物カードへ盤面価値点を付ける

未測定のカード強度を判断contractへ埋め込み、将来の強度評価を循環させるため採用しない。

### 4. seed抽選を通常の戦略判断としてbalance標本へ数える

選択が戦略的に未解決である事実を隠し、勝率やカード強度を過大に解釈させるため採用しない。

## 116後の再開地点

117では、115に固定したsource、A/B各40枚、2組の全40枚順、card copy ID、initial instance ID、先後鏡像を維持し、4経路を最初から再生する。たまご交換はmandatory choiceとして記録し、比較不能なら判断単位のseed抽選を使う。安全な時0人物配置は本契約で`pass`より上位とし、複数候補ならseed抽選する。

新たな合法性不明または記録整合性破損が出た場合だけ、その地点で停止して不足を記録する。4経路を完成できても独立balance標本は0とし、勝率、先後差、発動率、カード強度の結論へ使わない。
