# 132四停止点の横断監査・133設計／TDD計画

132保存HEAD `e80e5c73836f81b4b1201ed70f632e8ec156df11`、tree `0c71a63f216c2c0f82febb85a8f79cedb8d5550a`。132の停止raw SHA、両state hash、最終event seqを読取専用入力とする。以下は現在の保存stateからの監査であり、未到達盤面を想像しない。

| 経路 | 手番・state | 最終有効event | 合法候補・停止reason | 契約不足 |
| --- | --- | --- | --- | --- |
| order-01-a-first | R6 B normal_action、時A6/B6、そだち25/20、B手札I-poop1、準備空 | seq74 egg_exchange_bottom | B-001#1/B-009#1のbirth、B-034#1のset_item、pass。missing_next_normal_action_choice_proof | 伏せる有償配置の確定効果を107/114比較へ接続 |
| order-01-b-first | R6 B normal_action、時A5/B6、そだち25/20、同じB候補 | seq69 egg_exchange_bottom | 上と同じ4候補・同じreason | 同じ一般責務 |
| order-02-a-first | R10 A normal_action、時A10/B9、そだち20/20、A盤上P-desert_scorpion | seq113 response_pass | 未完成で合法集合未証明。incomplete_legal_candidates／unresolved_canonical_predicate | 盤上終了時誘発と通常行動候補の分類境界 |
| order-02-b-first | R10 B turn_end、時A9/B10、そだち20/20、予約/pending/activation空 | seq112 response_pass | 直前通常候補は装備7＋pass。終了処理はincomplete_turn_end_sources、stop codes空だが勝利履歴・遷移2条件false | R10先攻終了から後攻へ、後攻終了後に最終比較する処理 |

01共通: 77のしかける道具は時1で伏せ、06によれば設置自体は能力発動ではない。即時そだち0、確定時回復なしとして114の時収支を比較する。後日の反応価値は現時点の確定価値へ算入しない。特定copy IDで分岐せず114のset_itemテンプレート、参照先本文、合法性と支払を検証する。

02-A固有: 74本文は自分のターン終了時、あそび・あいてむ各1枚以上を表向きでプレイした場合の任意ドロー。通常行動候補へ列挙しない。終了時に当該ターンの公開履歴で条件を判定し、成立時に未実装の誘発処理を飛ばして進めない。伏せ配置、後日発動、装備能力発動を表向きのプレイに混ぜない。

02-B固有かつ02-Aの近接: B-firstはBがR10先攻であり、この停止点ではまだ最終比較しない。01・64の終了順、123/124の6手順と成長履歴を検証してR10 Aへ進む。R10後攻の全終了処理完了後だけ比較し、同値は引き分け、R11は作らない。100維持や未解決期限があれば停止する。原本の `round < 10` という実装制限を根拠なくtrueにせず、別の最終判定証明を作る。

TDD: (1) 132原本SHA・hash・seqを固定し、伏せ配置、誘発分類、R10先攻／後攻の独立REDテストを書く。(2) 三契約を旧正本へ接続しGREEN化する。(3) 同じ132保存stateから各経路を独立再開し、event・snapshotの両hash連鎖を逐次確認する。(4) 保存JSONをbytes単位で再生成、全設計データ・proxy検査、旧保護対象差分、GitHub PR状態を検証。117旧テスト190対263は別件。
