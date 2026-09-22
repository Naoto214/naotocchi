# 119 response-window契約

更新日: 2026-09-22

## 1. 保存結果

チェックポイント119は`protocol_only_no_match_progress`で保存した。対戦は進めていない。

- planned 0・completed 0・stopped 0
- decision trace 0・event 0・snapshot 0・winner 0
- 独立balance標本0・新stop artifact 0
- 117のstopped 4は過去の保存結果として維持
- 112の未実施fixture 6件は未実施のまま維持
- カード本文・数値・登録区分の変更0 ID

119は117の4経路で候補を選択せず、pass、カード発動、支払い、連鎖解決、ドロー、そだち増加を実行していない。次checkpointは同じstop artifact、同じ保存state、同じstate hashから4経路を独立に再開する。

## 2. Phase adapter

117の`pre_decision_state.phase="post_placement_response"`は変更しない。adapterは保存state外の別objectとして次の12 fieldを導出する。

| field | 値 |
|---|---|
| `source_phase` | `post_placement_response` |
| `phase` | `response_window` |
| `window_kind` | `after_normal_action` |
| `origin_event_seq` | `3` |
| `turn_player` | 経路の先手 |
| `priority_actor` | 経路の先手 |
| `chain_status` | `empty` |
| `chain_links` | `[]` |
| `consecutive_passes` | `0` |
| `response_opportunity_index` | `1` |
| `decision_kind` | `response_action` |
| `choice_kind` | `reaction_or_pass` |

adapterはsource phase、event seq、turn player、actor、保存state hashを検査する。canonical phaseを導出しても、保存stateを変更または再hashしない。

## 3. Candidate IDと4経路監査

responseで何も発動しないcanonical IDは`response-pass`である。通常行動用の`candidate-pass`と117 decision bridgeの`pass`はresponse候補で拒否する。

| path | priority actor | source state SHA-256 | 完全合法候補 |
|---|---:|---|---|
| `order-01-a-first` | A | `79c8ba24c4749d34436e5dbc36a89aac6f59bd682d02763715f68bd33068ff80` | `response-pass`、`response-use-event-A-040#1-target-A-017#1` |
| `order-01-b-first` | B | `468cb23491db85e53c2ede37c57c325b6620c82ca4cb7bbdeb6b7e7fd95de399` | `response-pass` |
| `order-02-a-first` | A | `87df61c75bb6a304b684ab00444b321cb1e1b25ee95f6a3b8353af0beae804de` | `response-pass` |
| `order-02-b-first` | B | `d3969f6708ae9834295a88d07b2cd7f88da7889541f48175bae4715af61de240` | `response-pass` |

これは各priority actorの最初のresponse opportunityの候補監査であり、選択記録ではない。

### E-first-date

`order-01-a-first`の第2候補は次を一意に結合する。

- card ID: `E-first-date`
- card copy ID: `A-040`
- source instance ID: `A-040#1`
- target instance ID: `A-017#1`
- target card ID: `P-cat_ceo`
- target zone: `partner`
- base time cost: 1
- 支払い前の残り時: 1
- 交際段階: 0
- 根拠: [91 E-first-date](91-event-21-card-text-draft.md#e-first-date)、[93 B12](93-cross-type-boundary-audit.md#b12)

candidate tableの本文接続と実stateの現物・個体・対象を照合してdetailを作る。119では支払いも発動も行わない。

## 4. 完全列挙と情報境界

1回のresponse opportunityごとに、`response-pass`と次の3 familyを検査する。

1. `hand_quick_use`: 手札から現在合法に「すぐつかう」できるカード。
2. `triggered_ability`: 現在の機会に発動できる能力。
3. `prepared_activation`: 現在の機会に発動できるしかけた札。

ownerのhand、board、prepared、discard、time、reservationsと、相手の公開board、prepared public、discard、time、reservationsを監査証拠へ保存した。相手の非公開手札、未公開山札順、future draw、future response choiceは使用しない。

たんじょう、ときおくり、へんしん、なかま／こいびと／セカイ配置、交際進行、みにつける、しかける、ちょうせんはresponse候補へ含めない。採用候補と除外対象は現物・個体IDおよび理由codeで一対一に記録し、4件すべて`candidate_set_complete=true`とした。

## 5. 06準拠の遷移契約

- chainが空で1人目がpassすると`consecutive_passes=1`となり相手へpriorityを移す。
- 相手もpassするとresponse windowを閉じ、完了済み通常行動の後へ戻る。
- 合法な反応を発動するとchainへ追加し、`chain_status=building`、`consecutive_passes=0`とする。発動者本人が先に追加発動の機会を得る。
- 発動者本人がpassした後に相手へpriorityを移す。
- 先にpassした側の後で相手が発動した場合、先にpassした側へpriorityを戻し、pass数を0へ戻す。
- 双方連続passでchain構築を閉じ、最後に発動したlinkから逆順に解決する。
- 解決中に成立した誘発は現在chain終了後の新しいchainへ送る。
- 未処理誘発、chain、後続responseがある間は通常行動へ戻らない。

この遷移はsynthetic stateのunit testだけへ適用した。117の4 stateには適用していない。

## 6. Response専用seed proof

次checkpointの選択順は`response_unique`、既存優先順位で一意なら`priority_unique`、比較不能なら`response_seeded_fallback`とする。119では4停止状態へ選択を適用しない。

seed contextは次のexact 10 keysである。

1. `contract_version`
2. `order_id`
3. `actor`
4. `actor_turn_index`
5. `round`
6. `origin_event_seq`
7. `response_opportunity_index`
8. `phase`
9. `decision_kind`
10. `choice_kind`

この順の10値にcanonical candidate ID昇順配列を加えた11要素JSON配列を、空白なしUTF-8でserializeする。SHA-256 digestをbig-endian unsigned integerとして読み、候補数Nのmoduloでindexを得る。再現性はsynthetic testだけで確認し、116 contractのversionと許可decision kindは変更していない。

## 7. 機械可読成果物

- `data/proxy-response-window-contract-119-20260922.json`
- `data/proxy-response-window-candidate-audit-119-20260922.json`
- `tools/proxy_response_window_contract.py`
- `tools/test_proxy_response_window_contract.py`
- `plans/2026-09-22-response-window-contract-design.md`
- `plans/2026-09-22-response-window-contract.md`

保存JSONはbuilderのindent 2、UTF-8、LF末尾newline出力と生bytesで一致する。CLI実測は`valid=true`、監査4件、合法候補数`[2,1,1,1]`、scope全0である。

## 8. TDDと検証

各Taskで未実装interfaceまたは未保存文書によるREDを確認してから最小実装を加えた。専用31件はGREEN。AST集計は全proxy 221件である。リポジトリは`docs/card-game`だけのsparse checkoutであり、全proxy実行中の既存catalog/link検査と`npm test`のsparse-excluded file不足は119の失敗へ数えず、119へ修正を混ぜない。

保護した生ファイルは117 stop 4件、116 fallback contract、117 plan、117 evaluationである。4 state hash、117のplanned 4・completed 0・stopped 4・独立balance標本0、112 fixture 6件の`status=fixture`・event空・winner nullも再確認した。

## 9. 次checkpoint

119を正本化した次のcheckpointで、117の4経路を同じstop artifact、同じstate、同じhashから独立に再開する。119のcandidate auditを再生成してからresponse選択contractを適用し、新しいdecision、event、snapshot、hashを記録する。保存済みstop stateを手書きで変更しない。112の6 fixtureへ先行しない。
