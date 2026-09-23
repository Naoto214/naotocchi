# 122 通常行動候補契約を適用した独立再開

更新日: 2026-09-23

承認済み[詳細TDD実装計画](plans/2026-09-23-response-window-normal-action-seeded-restart-122.md)に従い、120の4 stop artifactを同じraw bytes、game/continuation両hash、最終event seq 7/5/5/5から独立再開した。121の保存済みbooleanは信頼せず、毎回の現在stateで6 source family、variant、target、採否、12条件を再計算する。候補集合が完全な時に限り107/114を適用し、一意に比較できず116の条件を満たす時だけseed fallbackを使った。通常`pass`と119専用`response-pass`を区別する。120の停止証拠を変更していない。

## 実測結果

- planned: 4
- completed: 0
- rules_stop: 4
- integrity_stop: 0
- decision: 8
- event: 8
- snapshot: 12
- winner: 0
- independent_balance_sample: 0

| path | 120最終seq→122最終seq | 122新event | statusと停止理由 |
|---|---:|---:|---|
| `order-01-a-first` | 7→9 | 2 | rules stop `effect_resolution_not_defined`: 通常`pass`への相手の反応後、終了時の予約・誘発・勝利判定を確定していない |
| `order-01-b-first` | 5→7 | 2 | rules stop `effect_resolution_not_defined`: 107/114の確定時収支比較で`pass`を選び、終了前反応後の終了処理が未確定 |
| `order-02-a-first` | 5→7 | 2 | rules stop `effect_resolution_not_defined`: 通常`pass`への相手の反応後、終了処理未確定 |
| `order-02-b-first` | 5→7 | 2 | rules stop `effect_resolution_not_defined`: 107/114の確定時収支比較で`pass`を選び、終了前反応後の終了処理が未確定 |

122新eventは各経路2件、判断も各2件。snapshotは各経路の120最終stateを入口1件として保存し、新eventごとに1件を追加した。したがって12件。たんじょう候補を持つ経路でも、107/114の「確定するそだち差→時収支」の比較で時を支払わない`pass`が一意に上位になり、116 seedは使っていない。4停止経路を勝率・先後差・カード強度の根拠へ数えない。

## 正本と停止境界

- [121のcandidate contract](121-normal-action-candidate-completeness-contract.md)を現在stateへ適用する純粋な入口を追加した。120固定4件の監査と保存済み121 JSONは変更せず、保存値`candidate_set_complete`と異なる監査を拒否する。
- 通常行動の選択は完全性を確認してから行う。候補が`pass`だけなら一意、birthと`pass`がある場合は107/114の確定優先項目を先に比較する。比較不能が証明され、116の継続条件を満たした候補部分集合だけをseedへ送る。今回の4経路では比較によって`pass`が確定しseedは使っていない。
- たんじょうhandlerは`play_main`/`birth`の共通処理であり、path ID、order ID、card copy ID別の裁定はない。既存カード本文の即時誘発が未対応の場合は支払い・盤面移動前に停止する。既存本文で独立した即時誘発がないと確認できた個体だけ共通handlerに通す。
- 通常`pass`は06の終了前反応機会として処理し、119のresponse windowで相手が`response-pass`するとターン終了処理入口へ進む。終了処理に必要な予約、誘発、期限、勝利、次のturnを確定するhandlerがないため、そこで状態を推測更新せず停止する。公開履歴は117/120の保存済みplanと122の確認済みevent IDから毎回再構築し、未対応の履歴種別は比較前に停止する。
- 正本にない述語またはstable候補文法の不足は121のcontract stop証拠付きでrules stopにする。event seq、decision/event参照、双方のhash、instanceの領域所在は遷移ごとに検査する。source raw/schema/manifest/mapping破損は保存用の経路停止に読み替えず入力エラーとする。

## 保存物と検証

- `data/proxy-normal-action-seeded-restart-plan-122-20260923.json`: 各経路の120参照、選択、121監査、122新event/snapshot、terminal。
- `data/proxy-normal-action-seeded-restart-evaluation-122-20260923.json`: 上記の件数と経路別状態。
- `data/proxy-normal-action-stops-122/`: 新しい4停止artifact。120の停止artifactは変更していない。
- `tools/proxy_normal_action_seeded_restart.py`、`tools/test_proxy_normal_action_seeded_restart.py`: 再生、独立検証、canonical bytes CLI。

`--write`と別プロセスの`--check`を実行し、UTF-8/indent 2/LF/末尾newlineの再生成bytes一致を要求する。121の`--check`も維持する。117/119/120/121の専用test、全proxyの結果を報告する際、117旧テストの`proxy_test_count=190`対現在の120基準263の既存失敗を122の失敗に混ぜない。sparse-excluded catalog、link入力不足、`tests/smoke-test.js`不足も別件として扱う。

122専用18件PASS。119専用31件、120専用42件、121専用38件PASS。`check-design-data.py --checkpoint-122`は専用18件、121と122の保存bytesを検査しerrors 0。既存の119/120 gateは122の新テストを旧集計へ混ぜず、元の221/263件を維持する。

全proxy 319件中318件PASS。残る1件は117旧テスト`test_population_and_checkpoint_112_boundaries_remain_unchanged`が現在の120基準263件と旧基準190件を比較する既知の失敗であり、117のテストと保存済み記録を変更していない。

次の作業では、122が真正停止した理由ごとに既存正本で不足箇所を監査する。新しい裁定を推測で追加せず、112の6 fixtureは未実施のまま維持する。PR #259はDraft・open・未マージとし、mainへマージしない。
