# 125 通常行動の空盤面・人物配置候補拡張と独立再開

124の4停止証拠のraw・現在state・両hashを再検証し、6 source familyの空盤面・空手札をそれぞれ`no_board_source`・`no_hand_source`という状態証拠で説明した。121の17 reason codeと10 stop code、12条件を読み取り専用で再利用し、117の保存済み人物配置ID grammarを後続契約に接続した。121・124の保存成果物を変更していない。4現在stateすべてで12条件を独立再計算し、候補集合完全を証明した。

107/114の安全な時0人物配置と比較不能時の116 seeded fallbackを適用し、117の一般配置handler、119のresponse-window handler、121/125の状態変更後再列挙、122の通常pass・終了申出handlerを用いて経路別に進めた。4件とも次のターン終了入口で、新しく発生したevent列を含む期限/誘発/そだち100到達履歴を123の現在stateへ再接続する証拠が不足し、`missing_current_turn_end_provenance`で真正停止した。終了処理は実行していない。

| 経路 | seq 124→125 | 結果 | 新decision | 新event | 新snapshot | 125人物配置 | 116 seed | balance算入 |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | ---: |
| order-01-a-first | 12→17 | 真正停止 | 5 | 5 | 6 | P-cat_ceo | 使用 | 0 |
| order-01-b-first | 10→17 | 真正停止 | 6 | 7 | 8 | P-cat_ceo | 使用 | 0 |
| order-02-a-first | 10→15 | 真正停止 | 5 | 5 | 6 | C-chameleon | 使用 | 0 |
| order-02-b-first | 10→15 | 真正停止 | 5 | 5 | 6 | C-chameleon | 未使用（124卵交換では使用） | 0 |

合計 planned 4・completed 0・rules-stop 4・decision 21・event 22・snapshot 26・winner 0・独立balance標本 0。各新stopには124 raw SHA、最終両hash、全新event/snapshot/decision、現在stateの候補監査を記録した。相手の非公開手札、双方の未公開山札順、未来の行動は判断に使用していない。カード本文/数値/登録区分と112等の保護対象は変更しない。全proxyの117旧テスト1件（期待190、実測263）は既知問題として分離する。

保存JSONはUTF-8 indent2 LF末尾改行1件とし、builder再生成bytesと直接照合する。次の一般契約では、125のイベントとsnapshotを124の検証済み履歴へ連結し、各現在stateの123終了6手順を独立再算定する必要がある。新しいカード効果/期限/100到達の解決不能な経路のみ真正停止し、他経路は独立継続する。
