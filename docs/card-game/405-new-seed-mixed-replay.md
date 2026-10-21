# 405 Bターン再開・R10の新応答候補を分離

[405計画](plans/2026-09-30-new-seed-mixed-replay-405.md)。最新保存済み404のremote HEAD `a78d0263732e202695b0c7157dc1c9d927cc2af0`・tree `e5d2174e500144c570e815d2eca850de5dab3bc6`・PR #259 Draft/open/未マージを取得し、state raw SHA256 `567fc388da16f10b7cc036e78dfb78cf7842d9b700e066aa68e9279d0000bdc2`と404の正準再生成を照合した。

[監査JSON](data/proxy-new-seed-mixed-audit-405-20260930.json) raw SHA256 `748be4ba85bcca28299e2f0b968005b27a257afbf4114b1d58a93ea1b254385a`。[保存state](data/proxy-new-seed-mixed-replay-405-20260930.json) raw SHA256 `b451e46e352cffacd92c16ac749c528d37d0acc846c71a436714f9b3bcff191d`。

| 経路 | 新event/snapshot | 最新境界 |
| --- | ---: | --- |
| 01-A | 10 | seq159、R10、Aのたまご交換。B開始時pass後のAコインをseed選択、空連鎖起動・解決を含む |
| 01-B | 2 | seq164、R10、B開始時応答の優先者A。E-final-timeの公開対象はA-040#1/E-first-date・A-033#1/I-c_coin2 |
| 02-B | 1 | seq160、R10、B開始時応答の優先者B。E-final-timeの公開対象はB-033#1/I-c_coin2 |
| 02-A | 7 | seq155、R10、Aのたまご交換 |

01-B/02-Bは`incomplete_legal_candidates`。91のE-final-timeはR10ならたまごでも条件可。時2の支払いと公開捨て札に対象があるため、166のR1〜R9除外を使えない。対象別response候補/stable ID、同名1ターン使用履歴、対象再検査→2枚ドロー→必須手札1枚山札下の接続が未完成であり、未完全集合へ116を適用していない。passと既存能力だけで候補完全と偽らず、2経路の最後の有効state/hashを保持した。比較不能だけを理由に停止したものではない。

応答の全候補を138で再生成し、次優先者にも元のresponse context・本人既知情報を保持して119/116で選択した。170の既定0pass境界は保持し、明示的に許可した開始窓の1pass後だけ空連鎖コイン起動を接続した。404の開始時なかま出所は実際の保存egg event seq/actorで確認する。seeded決定は連鎖中のpassも完全なdecision証拠として保存する。

R10の先手終了→最後の相手ターン、後手終了→そだち比較は01/06/64で既に確定した分岐。401の終了監査に既定互換の監査handler注入を追加した。R10 handlerは他の10条件・予約/trigger/効果/全履歴検査を保持し、ラウンドをR9へ偽装しない。合成検証で両先手の続行、後手の最終比較、A勝ち/B勝ち/同値、未知trigger・履歴不一致の拒否を確認した。保存対戦の最終比較には未到達であり、405はcompleted0・独立balance標本0である。

新event/snapshot各20。専用4件PASS（初回2件RED→GREEN、その後到達コインのdefault拒否/明示許可と完全seed証拠を追加）。正準JSON・全中間hash連鎖を確認。カード本文・数値・登録区分・過去state/hash・112未実施6件は保持。

検証詳細と全proxy/CI状態は保存時の追記を正本とする。406ではE-final-timeの対象別候補と効果を既存114/119の一般契約へ接続し、405の同state/hashから停止2経路を再開する。01-A/02-AのA交換も独立に進める。112未実施fixture・勝率評価・イラストへ飛ばない。

保存前検証: 専用405 4/4 PASS、401〜404 9/9 PASS（保存済みJSON正準再生成も一致）、170 2/2 PASS、`npm test` exit0、`git diff --check` exit0。全proxy discoveryは180秒上限でexit124となり、完了した4件にfailure/error表示はないが全回帰結果は未取得。`check-design-data.py --catalog` exit1は`119 total proxy test count`1件・`120 total proxy test count`2件の既知件数検査error（計3件）を返した。これを全体GREEN・CI成功とは扱わない。

最終レビュー: 新設R10 proof helperが入力履歴の未解決事項を空配列へ置き換え、元state hash/completenessを確認していなかったImportant指摘を修正した。7種の改変（game/continuation hash、complete flag、stop code、期限効果、未解決code、100到達履歴）を専用テストでRED再現→GREEN確認。元stateの完全性12検査と正確な境界を必須とし、未解決証拠を保持/拒否する。保存対戦には未到達のhelperなので、保存405 state/hashは変更していない。修正後400〜405の14/14 PASS、npm test再実行exit0。未修正Critical/Important、保留Minorはいずれも0。既知catalog件数error・全proxy未完了・CI未確認は維持。
