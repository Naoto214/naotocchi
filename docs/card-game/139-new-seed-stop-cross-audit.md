# 139 新seed停止点の横断監査（途中記録）

基準は138保存HEAD `81f18ff346d3d531cd2165a9749a2f403afab738`、tree `a047b25769582319a00c720d93ebddb5124f8f54`。138の保存JSON・停止state・hashを変更せず、現行stateに既存候補監査器を読み取り適用した。以下は新たな対戦eventではなく、再開実装前の診断である。

## 通常行動への到達3件

138は121の `audit_current_normal_action` を直接使う。121の `inventory_sources` は空盤面に `missing_exclusion_reason` を出すが、125は同じ場合の `no_board_source` を既に正本化している。したがって、138の当該停止を新しいゲーム裁定不足の証拠として扱わない。125の空source処理、127の盤上枚数条件、128の対象なしID、132の盤上能力分類を順に適用し、本人の手札と公開情報だけから次の候補を得た。

| 138の経路 | 保存済み最終event | 既存契約で得られた合法な通常行動候補 |
| --- | ---: | --- |
| `probe-01-a-first` | 4 | `candidate-place-companion-A-013#1`、`candidate-place-companion-A-015#1`、`pass` |
| `probe-01-b-first` | 4 | `candidate-place-companion-B-011#1`、`candidate-play-main-B-001#1-birth`、`pass` |
| `probe-02-b-first` | 4 | `candidate-play-main-B-001#1-birth`、`candidate-use_item-B-033#1`、`pass` |

01-Aでは手札のC-cat_friendの盤上起動能力を手札行動として採用しない。02-BのG-area-claimの盤上枚数不足は127が除外でき、I-c_coin2の対象なし通常行動IDは128が与える。ここまでの診断は完全な選択・遷移・完走の証明ではない。次の接続では、候補監査の12条件、107・114・116の比較、選んだ行動の発動・解決、およびeventとcontinuationの連鎖を別々に検証する。旧4経路や138の保存記録を書き換えない。

## 02-Aの開始時response

G-hit-blowは138で7種類の宣言候補から `partner` が選ばれ、event seq2のまま発動前に停止した。06は宣言・時の支払い・発動領域・反応・逆順解決の順を定め、87は山札公開後の一致／不一致の処理を定める。既存の120のresponse発動・解決handlerはE-first-dateの対象あり形だけで、138の宣言variantを持つG-hit-blowにそのまま接続できない。旧pilotには単独効果の実装があるが、現在のresponse連鎖記録の代用にはしない。宣言variantを発動linkへ保持し、解決時にだけ山札上を公開する形を別途TDDで証明する必要がある。発動・支払いeventをまだ追加しない。

全4経路ともR1交換でseeded fallbackを使用済みのため、後続が完了しても独立balance標本は0。カード本文・数値・登録区分の変更はない。この監査は138の全proxy結果（417件中416 PASS、117旧テスト既知FAIL 1件）を再実行した検証結果ではない。
