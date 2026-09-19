# 117 通常意思決定seed付き再開 設計仕様

更新日: 2026-09-19

## 1. 目的

115でR1たまご交換により停止した独立初期順2組×先後鏡像4経路を、116のfallback contractを使って同じsource、同じshuffle seed、同じA/B各40枚manifestから最初から再生する。

117は4経路を1バッチだけ実施する。各経路は、R10最終比較または既存の早期勝利まで整合して再生できた場合だけ`completed`とする。既存正本だけでは合法性を確定できない、合法候補を完全列挙できない、許可されない情報が必要、stable candidate IDがない場合は、その経路だけを停止して不足を保存する。1経路の停止を理由に他の経路を止めない。

seed抽選または戦略的未解決を含むcompleted記録は作成してよいが、独立balance標本、勝率、先後差、発動率、カード強度、採否の根拠へ加算しない。

## 2. 正本入力

117の入力は次へ固定する。

- 107のsource fixture: `data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json`
- 107の判断protocol: `data/proxy-decision-protocol-107-20260918.json`
- 114の候補表: `data/proxy-normal-decision-candidate-table-114-20260918.json`
- 114のhardening contract: `data/proxy-normal-decision-hardening-114-20260918.json`
- 115の全40枚manifest plan: `data/proxy-normal-decision-first-choice-plan-115-20260918.json`
- 115の停止audit: `data/proxy-normal-decision-first-choice-audit-115-20260918.json`
- 116のfallback contract: `data/proxy-normal-decision-fallback-contract-116-20260918.json`

115で保存したorder-01のA=50／B=100050、order-02のA=51／B=100051、全card copy ID、card ID、initial instance IDを変更しない。同じorderの先後鏡像は同じA/B順序を参照する。

112の未実施fixture 6件は変更せず、status `fixture`、event空、winner `null`を維持する。

## 3. 採用方式

固定判断planとreplay builderを採用する。

固定判断planは、各経路の入力参照と、各判断で必要な次の情報を機械可読に保存する。

- 判断を一意に識別するstable ID
- 判断種別とphase
- 判断前stateへの参照
- 完全合法候補と列挙根拠
- 選択方式
- 107／114の優先順位証拠、または116のseed／安全配置証拠
- 選択候補とrunner-up
- 支払い、対象、連鎖、公開情報
- その判断後も再生可能か、停止するなら不足理由

replay builderはplanにない戦略判断を行わない。planを初期状態から順に適用し、合法候補、支払い、領域移動、予約、個体、event、snapshot、hashを検査・再生成する固定トランスクリプトmaterializerとする。全カード・全局面を処理する対戦エンジンや完全自動合法性判定器にはしない。

Pythonへ暗黙の戦略選択を集約する方式と、検査器を持たない手書きJSON方式は採用しない。

## 4. 判断処理

### 4.1 必須選択

たまご追加ドロー後の山札下選択は`mandatory_choice`、phase `egg_exchange_choice`、choice kind `egg_exchange_bottom`として記録する。

判断前手札7枚のcard copy ID全件を昇順化した集合を、完全合法集合かつ`seeded_fallback_candidates`とする。116のexact 8-key seed contextとSHA-256 moduloを使い、seed材料、canonical serialization、digest、候補数、selected index、selected candidate、runner-upを保存する。fixture ID、match ID、先手、path名をseed材料へ追加しない。

117の最初のR1選択は次の既知結果を回帰検査へ固定する。

| path | 山札下へ置くcard copy | card ID |
|---|---|---|
| order-01 A先手 | `A-023` | `G-air-hockey` |
| order-01 B先手 | `B-022` | `W-deepsea` |
| order-02 A先手 | `A-007` | `M-antlion-07` |
| order-02 B先手 | `B-034` | `I-poop1` |

後続ターンにも同じmandatory choiceが発生する場合は、同じ規則を判断単位で適用する。

### 4.2 通常行動

通常行動では`pass`を常に完全合法集合へ含める。114の41 card ID候補表、既存の通常ちょうせん／交際進行候補、判断時点の自分の手札と公開盤面を照合し、候補のcard copy、対象、モードをstable candidate IDへ展開する。

114のstanding candidateはaction object内で`candidate_id="candidate-pass"`を使う一方、116のcanonical candidate IDは文字列`pass`を要求する。117のadapterは114の`candidate-pass`を116の`pass`へ一方向に正規化する。117の`legal_candidates`、`selected_candidate`、`runner_up_candidates`、seed proofでは`pass`だけを使い、`candidate-pass`を混在させない。114との照合証拠には元ID`candidate-pass`を残す。

自分の正当に知る情報と公開情報だけを使う。相手の手札、山札順、未公開選択、将来のドローや結果は候補選択へ使わない。

107／114の優先順位で一意な候補は`priority_unique`とする。上位4項目、手札／盤面／予約のPareto比較、完全同点時tie-breakのどこで決まったかを保存する。任意のカード価値点は追加しない。

### 4.3 安全な時0人物配置

116の6安全条件を満たし、既存優先順位適用後も比較不能な時0人物配置は`resolve_safe_free_development`へ渡す。

- `legal_candidates`には`pass`、すべての配置候補、callerが列挙したその他の合法行動を含める。
- `seeded_fallback_candidates`には比較不能な安全配置だけを含める。
- 劣位の`pass`を抽選へ入れない。
- 一意の安全配置は`safe_free_development`、複数の比較不能な安全配置は`seeded_fallback`とする。
- resolverが返す安全性証跡を変更せず判断記録へ保存し、validatorへ直接渡す。

R1たまご交換後も4経路すべてに時0人物が残ることを回帰検査する。

R1最初の通常行動は次の結果を回帰検査へ固定する。完全合法集合は表中の配置以外に、その時点で合法なstage 1メイン配置と`pass`を含む。lotteryは安全配置だけであり、`pass`と有料メイン配置を含まない。

| path | resolution | 選択する安全配置 |
|---|---|---|
| order-01 A先手 | `seeded_fallback` | `candidate-place-partner-A-017#1` |
| order-01 B先手 | `seeded_fallback` | `candidate-place-partner-B-017#1` |
| order-02 A先手 | `safe_free_development` | `candidate-place-companion-A-014#1` |
| order-02 B先手 | `seeded_fallback` | `candidate-place-companion-B-014#1` |

### 4.4 107判断traceと116 fallbackの接続schema

107の`legal_candidates`はaction object配列だったが、116は同名fieldへcanonical ID文字列配列を要求する。117では116を正本とし、次のfieldを分離する。

- `legal_candidates`: canonical candidate IDの昇順文字列配列。
- `legal_candidate_details`: 各canonical IDに対応するaction object配列。各objectの`candidate_id`は`legal_candidates`内のIDと一致する。
- `selected_candidate`: 選択したcanonical ID。
- `selected_action`: `selected_candidate`と一致するaction object。
- `runner_up_candidates`: 116の規則に従うcanonical ID配列。
- `runner_up_action`: 107互換の代表次点object。runner-upが空なら`null`、複数なら昇順先頭を使うが、完全な次点集合は`runner_up_candidates`を正本とする。

117 validatorはID集合とdetail集合の一対一対応、selected／runner-upの結合、`pass` detailのsource IDが114の`candidate-pass`であることを検査する。116 validatorは`legal_candidate_details`を許可された補助fieldとして受理するが、seed proofはID配列だけから再計算する。

## 5. 経路結果と成果物

4経路を独立に再生し、結果を次の2種類へ分ける。

### 5.1 completed経路

R10最終比較、または既存ルールによる早期勝利まで整合して再生できた経路だけ、completed match recordとdecision traceを保存する。

- record statusは`completed`
- winner、終了理由、最終そだち、完了roundを保存する
- traceは全判断、全eventと対応するsnapshot、連続hashを持つ
- mandatory choiceとnormal actionを区別する
- seed proof、安全配置証跡、priority証拠を判断記録へ残す

### 5.2 stopped経路

次のいずれかに該当した経路は、fixtureやcompleted recordへ偽装せず専用stop artifactへ保存する。

1. 合法候補を完全列挙できない。
2. 相手非公開情報または将来情報が必要である。
3. stable candidate IDを付けられない。
4. 既存ルールだけで合法性を確定できない。

stop artifactは少なくとも次を持つ。

- path ID、order ID、先手、actor、round、phase
- 最後に整合したevent seqとstate hash
- 判断前state
- 確認できた候補と不足している候補範囲
- stop reason code、正本参照、再開条件
- winner `null`
- completedや独立balance標本へ数えない明示

停止した経路の途中状態を勝敗、発動率、カード強度の根拠へ使わない。

### 5.3 検査失敗との区別

planが選んだ候補が保存stateに対して不整合、event／snapshot hashが不連続、card copy／instance／領域／予約参照が壊れる、canonical保存物がbuilderと一致しない場合は、正当なstop artifactに変換しない。materializationまたはvalidatorのエラーとして失敗させ、成果物を公開しない。

既存ルール上の判断不能と、実装・記録の破損を混同しない。

## 6. 評価

4経路共通evaluationへ次を保存する。

- planned route count
- completed route count
- stopped route count
- pathごとのstatusと終端理由
- legal candidate count
- selected action count
- turn／終端時のunused time
- 7カード種類別の使用数
- 予約の作成・消費・失効・最大同時保有数
- 再登場とinstance transition数
- そだち推移
- 判断不能箇所
- strategic unresolved count
- seeded fallback count
- independent balance sample count `0`

completed件数と独立balance標本数を分ける。seed抽選または戦略的未解決を含むcompleted経路も、勝率、先後差、発動率、カード強度、採否の根拠へ数えない。

## 7. 機械可読成果物

117では少なくとも次を保存する。

- `data/proxy-normal-decision-seeded-restart-plan-117-20260919.json`
- `data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json`
- completedがある場合の`data/proxy-matches-117/*.json`
- completedがある場合の`data/proxy-decision-traces-117/*.json`
- stoppedがある場合の`data/proxy-normal-decision-stops-117/*.json`
- `tools/proxy_normal_decision_seeded_restart.py`
- `tools/test_proxy_normal_decision_seeded_restart.py`
- `117-normal-decision-seeded-restart.md`

planとevaluationは常に保存する。completed／trace／stop directoryの期待ファイル一覧をevaluationへ明記し、余分なファイル、欠落、builderとの差異をvalidatorが拒否する。

## 8. テスト方針

テスト先行で進め、実際にREDを確認してから最小実装を行う。

専用テストは少なくとも次を検査する。

1. 115の2 order×A/B各40枚manifest、seed、card copy／card／initial instanceの完全一致。
2. 4経路が同じorderの同一manifestを先後鏡像で共有する。
3. R1たまご交換の7候補、4つの既知選択、seed proof再計算。
4. seed材料へfixture／match／先手／path名を混ぜない。
5. R1交換後の4経路に時0人物が残る。
6. 完全合法集合に`pass`を含め、安全配置lotteryから`pass`を除く。
7. 1経路の停止が他経路の再生を止めない。
8. completed recordとstop artifactの相互排他、winner境界。
9. decision、event、snapshot、hash、card copy、instance、領域、予約の連続性。
10. 非公開・未来情報を判断へ含めない。
11. strategic unresolved／seeded fallback集計と独立balance標本0。
12. 保存成果物とbuilder再生成結果の全文一致、余分・欠落ファイル拒否。
13. 112の6 fixture未変更、452／477／カード変更0 ID。

専用テスト、全`test_proxy_*.py`、117 CLI、`check-design-data.py`、`git diff --check`を最終gateとする。リポジトリ全体の`npm test`も保存HEADで確認する。

## 9. 範囲外

- 対戦エンジン、完全自動合法性判定
- 任意のカード価値点、強度推定による選択
- 4経路を超える大量対戦
- 112の6 fixtureのcompleted化
- 勝率、先後差、発動率、カード強度、採否の結論
- カード本文、数値、登録区分、発売枚数の変更
- 新12、旧24、HOLD14、legacy4、quick内部50、単独モード、めぐる等の母集団変更
- 本編実装、表情、カード専用イラスト、別PRの変更

## 10. 保存境界と次

117は4経路を1バッチだけ再生し、completed／stoppedの内訳と判断不能箇所を保存した時点で区切る。PR #259はDraft・open・未マージを維持する。

117の結果を確認する前に112の6 fixtureへ進まない。4経路が安定してcompletedになった場合でもseed使用対戦の独立balance標本は0とし、次の反復数や112の実施順は117の評価後に決める。
