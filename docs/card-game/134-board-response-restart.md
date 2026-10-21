# 134 C-batの応答誘発分類と独立再開

[横断監査・設計とTDD計画](plans/2026-09-23-c-bat-response-classification-and-134-restart.md)に従い、133の01の2停止原本を読取専用入力として独立再開した。72のC-bat本文、06の反応機会、119の`triggered_ability`、114の通常行動候補表から、盤上C-batの能力を一般区分`response_triggered`に分類する。通常行動では`timing_not_normal_action`として除外し、通常行動のstable candidate IDを発行しない。条件成立時の応答窓は未到達であり、その列挙・ID・解決は追加していない。

| 経路 | 133→134 seq | 新decision／event／snapshot | 結果 |
| --- | ---: | ---: | --- |
| order-01-a-first | 105→126 | 14／21／22 | R10後攻終了、A勝利 |
| order-01-b-first | 113→126 | 8／13／14 | R10後攻終了、A勝利 |

予定2／完了2／真正停止0。新decision22・event34・snapshot36・winner2。133で完了した02の2経路と合わせて4経路すべて完了。4経路ともseeded fallbackを使用したため独立balance標本0。カード本文・数値・登録区分、126〜133の停止原本・state/hash、112の未実施fixtureは非変更。

133停止原本のraw SHA、開始game/continuation hash、最初のevent before hash、event seq連続性、両hashの連鎖、最終state/hashを照合した。生成JSONはcanonical bytes再生成との一致を検査する。初回の`missing_turn_start_source_proof`は132の公開`run_route`を迂回したwrapperの接続問題であり、公開runnerへ接続して解消した。これは新しいゲーム裁定を要しない。

修正後の専用テスト5件は成功し、`proxy_board_response_134.py --check`は一致。[全proxy回帰検証](134-proxy-regression-verification.md)で33ファイル・407件を完走し、406件PASS・既知117旧テスト1件FAIL・ERROR 0件を確認した。全件GREENやCI成功とは記録しない。

[保存計画](data/proxy-board-response-plan-134-20260923.json)、[評価](data/proxy-board-response-evaluation-134-20260923.json)、[2経路の結果](data/proxy-board-response-results-134/)、[実装](tools/proxy_board_response_134.py)、[専用テスト](tools/test_proxy_board_response_134.py)。117旧テストの期待190対実際263の差は別件。PR #259はDraft・open・未マージ、main未マージを維持する。
