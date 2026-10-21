# 150 新seedターン終了の履歴出所監査

[150 TDD計画](plans/2026-09-25-new-seed-turn-end-history-150.md)に従い、149保存JSONと135・138・141・145・147・148のraw SHAを照合して、3ターン終了経路の全event/snapshotを再構築した。135のgame hash、138以降のgame/continuation dual hashとseqを全境界で確認した。旧保存済みデータは変更していない。

| 経路 | 最終seq | 途中の成長 | 100到達 | 予約・未処理・期限付き効果 |
|---|---:|---|---:|---:|
| probe-01-a-first | 9 | 全snapshot A20／B20 | 0 | 0 |
| probe-01-b-first | 9 | 全snapshot A20／B20 | 0 | 0 |
| probe-02-b-first | 6 | 全snapshot A20／B20 | 0 | 0 |

C-chicken/C-batの配置履歴を72本文と突合し、発動のない配置eventを継続中の期限付き効果として扱わない。登録外のactionが現れたら停止する。3経路とも分類不能なeventはない。新decision/event/snapshot各0、completed0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で結果未確定。次は149の現在ターン終了候補と今回再構築した履歴から123/124の完全性を再評価する。
