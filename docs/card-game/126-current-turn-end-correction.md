# 126 保存済み125の終了窓訂正、現在履歴の123再証明とR2再開

125の保存済み4 stopには`game_state.phase=turn_end`と`continuation_state.return_target=normal_action_opportunity`が同居していた。123の閉鎖条件ではこれは無効であり、125報告の「現在履歴provenance不足」だけを共通停止原因とみなすことはできない。125のraw・state/hash・plan・コードを変更せず、同じ124入力から125を独立再生し、122の終了申出response閉鎖処理に従って最終`response-pass`の`return_target=turn_end`を新126訂正証拠に記録した。最終event seqとdecisionは同一、訂正後のcontinuation hashは新たに計算しており、125の旧hashを正しい値として扱わない。

117〜122の保存履歴、124のevent、125の訂正後eventを初期stateから連結し、seqと前後の両hashを検査した。125配置・E-first-date等の既存本文分類と中間そだち推移を照合し、4経路とも期限付き効果・予約・100到達履歴なしを証明。現在stateの123終了6手順/12条件を独立再計算してから後攻のターン終了を処理した。次のR2開始で時2回復、通常1枚＋たまごなら追加1枚、卵交換を行い、現在stateの125候補を再列挙した。

| 経路 | seq 125→126 | R2判断入口の結果 | 新decision | 新event | 新snapshot | fallback | balance算入 |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: |
| order-01-a-first | 17→20 | 候補不完全 `missing_exclusion_reason` | 1 | 3 | 4 | 卵交換で使用 | 0 |
| order-01-b-first | 17→20 | 完全候補集合の選択証明不足 | 1 | 3 | 4 | 卵交換で使用 | 0 |
| order-02-a-first | 15→18 | 候補不完全 `missing_candidate_id_grammar` | 1 | 3 | 4 | 卵交換で使用 | 0 |
| order-02-b-first | 15→18 | 候補不完全 `missing_candidate_id_grammar` | 1 | 3 | 4 | 卵交換で使用 | 0 |

合計 planned 4、completed 0、真正停止4、decision 4、event 12、snapshot 16、winner 0、独立balance標本0。126の新stopは125 raw SHAと訂正前後のcontinuation hash、現在state/両hash、終了とR2開始の新event、123監査を保持する。候補不完全な3経路では選択を行っていない。候補が完全な1経路でも、R2の複数時0人物配置と有償birthを107/114/116で一意に比較できず、seeded fallbackを推測適用しない。

112・117・119・120・121・122・123・124・125の保存済み証拠、カード本文/数値/登録区分は読み取り専用。JSONはUTF-8 indent2 LF末尾改行1件で保存し、builder再生成bytesと直接比較する。117旧テスト1件の190対263差は既知の別件として維持する。
