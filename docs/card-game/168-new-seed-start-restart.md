# 168 新seed4経路の開始時response初回選択

[168 TDD計画](plans/2026-09-25-new-seed-start-restart-168.md)に従い、167の完全候補集合と165保存state/hashから初回response判断を記録した。

| 経路 | 判断 | 初回event | 次の入口 |
|---|---|---:|---|
| probe-01-a-first | C-chicken発動／passからseeded fallbackでpass | 1 | 相手のresponse候補 |
| probe-01-b-first | 唯一のpass | 1 | 相手のresponse候補 |
| probe-02-b-first | 唯一のpass | 1 | 相手のresponse候補 |
| probe-02-a-first | pass／I-c_coin2からseeded fallbackでitem選択 | 0 | item発動前 |

新decision4、event/snapshot各3、completed0、独立balance標本0。C-chickenは選択されなかったため効果を解決していない。候補IDは通常行動名前空間と分離。source raw SHA、完全候補再生成、seed proof、event seq、game/continuation hash連鎖とcanonical bytesを検査した。カード本文・数値・登録区分変更0。全proxy固定158 snapshotは458件中457 PASS／既知117旧テスト1 FAILで、168 HEAD全回帰は未実施。
