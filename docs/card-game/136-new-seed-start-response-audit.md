# 136 新seedの開始時response境界・横断監査

監査基準: 135保存HEAD `903793cc78a20ad87b22817b91241a41a301c688`、tree `695a2808f6536104425c7fb0d38380fc75dcb48f`。`data/proxy-independent-seed-probe-20260924.json` の4停止stateと01・02・06・64・114・119・120の正本・検査器を照合した。135の4停止artifactを変更・再生成せず、新しいdecision/event/snapshotを追加しない。

## 共通境界

01・02・64の開始順は、時の回復→通常ドロー→たまご追加ドローと山札下返却→適用済み開始時予約→開始時の誘発・反応→通常行動機会。135は交換直後に`phase=response_window`を記録しているが、既存119のphase adapterは117の`post_placement_response`（通常行動後、event seq 3、`window_kind=after_normal_action`）専用で、この開始時stateへ流用できない。4保存stateでは両者の盤上カード・準備枠・予約・捨て札が空で、初回ターン前の期限・盤上開始時誘発・適用済み予約はない。この事実を検証する一般的な開始時adapterと、開始時responseから通常行動へ戻る記録は未接続。

| 135経路 | 最初のactorの手札上の候補・条件 | 120の現行列挙 | 真正な不足 |
| --- | --- | --- | --- |
| `probe-01-a-first` | G-baseball-battingは自分が宣言したちから勝負中に限る。現局面は勝負なし。ほかは時・条件・種類により候補外。 | `response-pass`のみ | 開始時adapterと相手にもpriorityを渡す証拠連鎖。盤上・予約なしを毎stateで証明する必要あり。 |
| `probe-01-b-first` | E-final-timeは時2・メイン⑧またはR10・捨て札対象が必要。R1時1で対象なし。ほかも条件外。 | `response-pass`のみ | 同上。 |
| `probe-02-a-first` | G-hit-blow（A-001#1）は時1、山札が残り、発動時に7種類から1種を宣言する。候補は宣言variantごとに区別する必要がある。山札上の非公開カードを見て宣言を選ばない。 | `response-pass`のみ。G-hit-blowを`normal_action_not_response`で誤除外。 | 手札すぐつかうのresponse列挙、宣言variantのstable ID、116/119の選択・発動・解決との接続。 |
| `probe-02-b-first` | I-c_coin2（B-033#1）は時1のすぐつかうで対象なし。山札上の公開・分岐は解決時であり候補比較に使わない。 | `response-pass`のみ。I-c_coin2を`normal_action_not_response`で誤除外。 | 手札すぐつかうのresponse候補ID、選択・発動・解決との接続。 |

上表の120列挙結果は135の各stateをread-onlyで入力した診断であり、119が承認した開始時用adapterや合法候補証拠ではない。119の`candidate_set_complete=true`を新seedへ転用しない。`normal_action_opportunity`の114 templateがあることは、カード本文の「すぐつかう」をresponseから除外する根拠にならない。特に02の2経路をpass-onlyとして進めると合法候補の欠落になる。

したがって135共通の`unproved_post_egg_response_window`は**入口未接続を示す暫定停止**であり、4経路に同一の新しいゲーム裁定が不足するという意味ではない。01と02では必要な候補処理が違う。135の`stopped_rules_adjudication`ラベルを、新しい裁定の必要性や、02の`response-pass`が唯一の合法候補である証拠として引用しない。

相手の応答を検査するときは、そのactor本人の手札と公開盤面だけを用いる。現在のactorの候補選択に相手の非公開手札、山札順、公開前のコイン結果やヒット&ブローの当たりを使わない。全4経路でR1たまご交換のseeded fallbackが既に使われたため、仮に今後完走しても独立balance標本は0。

## 次の作業境界

1. 新しいゲーム裁定を置かず、01・02・06・64に従って「開始処理終了→開始時response→通常行動」のadapterを一般化し、保存state/hash・公開情報・開始時予約と誘発の完全性を検査する。
2. 114の7宣言variantを参考に、119のresponse専用IDと完全候補検査をカードcopyに過適合せず接続する。I-c_coin2もresponseに含め、他のすぐつかうカードの無条件一括除外を避ける。119が規定する具体IDはE-first-dateのsource＋target用だけで、宣言variantや対象なしカードへの同一形式をまだ定義していない。未証明の候補・支払い・解決は真正停止する。
3. その後、135の4保存state/hashから独立に再開する。過去の4経路・112 fixture・カード本文・数値・登録区分を変更しない。独立balance標本を算入しない。

この監査では対戦再開0・新規完走0・新規balance標本0。117旧テストの既知件数差（期待190、実測263）以外の検証結果を推測しない。
