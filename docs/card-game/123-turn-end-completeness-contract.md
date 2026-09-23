# 123 ターン終了処理の完全性契約

122の4停止点を読み取り専用で横断監査し、[設計仕様](plans/2026-09-23-turn-end-completeness-contract-design.md)と[詳細TDD計画](plans/2026-09-23-turn-end-completeness-contract-implementation.md)に沿って、01・06・64のターン終了6手順を一般のsource inventoryとして正本化した。123はprotocol-onlyであり、対戦進行と新たな停止記録は0件。122停止artifactのraw bytes/state/hash/event seqを変更していない。

| 122の停止点 | 最終seq | 入口 | 監査結果 |
|---|---:|---|---|
| order-01-a-first | 9 | R1 A、partner P-cat_ceo、そだち25 | 共通契約不足 |
| order-01-b-first | 7 | R1 B、partner P-cat_ceo、そだち20 | 共通契約不足 |
| order-02-a-first | 7 | R1 A、companion C-chameleon、そだち20 | 共通契約不足 |
| order-02-b-first | 7 | R1 B、companion C-chameleon、そだち20 | 共通契約不足 |

全4件で、通常`pass`への119応答は空chainの双方`response-pass`で閉じ、turn_end入口、双方予約空、pending trigger空、activation zone空を保存stateで確認した。P-cat_ceoは交際開始時の能力、C-chameleonは継続補正で、既存本文から終了時の独立発動ではない。ここにpath/card copy固有handlerはない。

ただし122保存stateには、適用済み効果の期限についての網羅的なprovenanceと、そだち100への到達・中断履歴が独立fieldとして存在しない。存在しないことを空扱いせず、6手順のうち期限/期限切れ/維持勝利の根拠を`unresolved_expiration`、`missing_growth_reach_history`として全4件に残す。各auditの`turn_end_set_complete=false`は保存値ではなく12条件とstop codeから導出する。4件のturn_end transitionを実行してよいという結論にはしていない。

contract registryは6手順、12完全性条件、9 contract stop code、boardのcard ID単位の既存本文分類を含む。未知card ID、時刻不明の予約、未解決の誘発・期限は推測でexcluded/absentにせず停止する。相手の非公開手札と未来情報を参照しない。builderはraw SHA・両state hash・instance mappingを照合し、validatorが現在stateからauditを再生成して保存boolean/units/reasonsを再比較する。保存JSONはUTF-8、indent 2、LF、末尾newline1件で、別プロセス再生成bytesと直接比較する。

成果物は[契約JSON](data/proxy-turn-end-completeness-contract-123-20260923.json)、[4停止点監査JSON](data/proxy-turn-end-completeness-audit-123-20260923.json)、[builder/validator](tools/proxy_turn_end_completeness.py)、[専用テスト](tools/test_proxy_turn_end_completeness.py)。予定/完了/停止対戦、decision/event/snapshot/winner、独立balance標本、新stop artifactはすべて0。122の4経路の再開、ターン終了処理、次ターン開始、勝敗判定は123では行わない。

117旧テストの`proxy_test_count=190`対現行120基準263の期待値差は既知の別件であり、117保護対象を変更しない。検証の実測件数とGitHub HEAD/CIはこの本文に固定せず保存時の報告で区別する。

独立レビューを受け、123の保存artifact validatorは122 raw bytesを必須入力として照合し、情報境界と全source projectionを無条件にtrueとしない。将来のstateに期限・到達履歴が追加された場合も、正本化した証拠と入力integrity adapterを接続してから同じ6手順を再評価する。123の現行保存schemaに未定義のfieldを足しただけで完全性をtrueにはしない。
