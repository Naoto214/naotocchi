# 132 盤上の能動起動能力と近接契約

131の4停止raw SHA・両state hashを固定入力として独立再開した。114の `normal_action_opportunity` と「on companion board」、72の「自分のターンに」「発動できる」を照合し、盤上から能動的に起動する能力を独立の `board_card_action` unitとして列挙する。受動・継続、既に過ぎた誘発、response専用能力は独立の通常行動候補へ追加しない。本文と114の登録が揃わない盤上源は停止する。C-cat_friendでは対象が自分の捨て札にある別名のなかま1枚であり、4保存stateとも対象が存在しないため、各経路で `required_target_absent` の除外unitを一件保存した。存在しない対象へcandidate IDを付けない。

合法な単一対象が存在し、1個体1ターン1回の未使用を履歴で証明できる場合は、127の既存 `candidate-{action_type}-{source_instance_id}-target-{target_instance_id}` によりstable ID化する。盤上sourceを手札sourceと混同せず、配置から続くevent seq・両state hashの連鎖で使用回数を証明する。証明できない場合は `missing_state_evidence` で停止する。到達していない複数対象や追加variantのIDを作らない。

131の現stateを横断監査し、能力除外後の02には `I-c_coin2` が残ること、passが進むと131保存の `C-cat_friend` 配置eventと盤上源がターン終了履歴に現れることを再開前に確認した。02の非公開山札上に依存する+5は確定成長に加算せず、131の本文根拠と107・114で有償行動対passを比較する。盤上C-cat_friendは自発起動であり自動ターン終了誘発ではなく、配置時の確定成長0・持続期限なしとして、123/124の履歴分類をこの再開内だけ拡張した。旧契約原本は変更しない。

| 経路 | 131→132 seq | 新decision／event／snapshot | 次の真正停止 |
| --- | ---: | ---: | --- |
| order-01-a-first | 59→74 | 9／15／16 | R6 Bの `I-poop1` 設置行動の確定効果分類不足 |
| order-01-b-first | 64→69 | 3／5／6 | R6 Bの同じ設置行動分類不足 |
| order-02-a-first | 92→113 | 15／21／22 | R10 Aの盤上 `P-desert_scorpion` 能力分類不足 |
| order-02-b-first | 87→112 | 17／25／26 | R10 Bターン終了の勝敗履歴・終了遷移契約不足 |

planned 4／completed 0／rules-stop 4、新decision 44／event 66／snapshot 70、winner 0／独立balance標本0。02-Bのターン終了監査は `contract_stop_codes: []` でも、`victory_history_sufficient` と `transition_handlers_proven` がfalseなので継続不能。旧123のR10未対応を成功扱いにしない。次は設置道具、別の盤上能力、R10終了を独立に横断監査する。129〜131を含む旧保存証拠、カード本文・数値・登録区分、112の未実施fixtureは変更しない。117旧テスト190対263は既知の独立問題として分離する。
