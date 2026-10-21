# 161 新seedターン終了response再開

[161 TDD計画](plans/2026-09-25-new-seed-end-response-restart-161.md)に従い、160保存stateのうち3経路の現在の`after_normal_action` responseを完全列挙した。C-chickenとC-batの盤上誘発条件は、今回の通常passでは成立しない。各機会の唯一の合法候補`response-pass`を選び、双方連続pass後にターン終了入口へ到達した。02-Aは160の入口を保持した。

| 経路 | 新decision/event/snapshot | 現在地 |
|---|---:|---|
| probe-01-a-first | 各1 | ターン終了入口 |
| probe-01-b-first | 各1 | ターン終了入口 |
| probe-02-b-first | 各1 | ターン終了入口 |
| probe-02-a-first | 0 | ターン終了入口を保持 |

160 raw SHA、再生成、event seq、game/continuation hash連鎖、最終state、canonical bytesを検査。新decision/event/snapshot各3、completed0、独立balance標本0。カード本文・数値・登録区分は変更0。4経路のターン終了履歴出所を次に監査する。全proxy回帰は固定158 snapshotで検査中のため、全件GREENとは扱わない。
