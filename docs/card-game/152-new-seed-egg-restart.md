# 152 新seedR1たまご交換の再開

[152 TDD計画](plans/2026-09-25-new-seed-egg-restart-152.md)に沿い、151保存stateとraw SHAを検証し、現在の7枚手札から117既存のmandatory egg choiceを再計算した。116のseeded fallback証明を検査し、選ばれた現物を山札の一番下へ戻した。交換後は135/138と同じ開始時response入口に置き、候補はまだ推測しない。過去の保存済みstate/hashとカード本文は変更していない。

| 経路 | 開始seq | 新decision/event/snapshot | 最終seq | 現在地 |
|---|---:|---:|---:|---|
| probe-01-a-first | 11 | 各1 | 12 | 開始時response |
| probe-01-b-first | 11 | 各1 | 12 | 開始時response |
| probe-02-b-first | 8 | 各1 | 9 | 開始時response |

合計新decision/event/snapshot各3、completed0。全経路でseeded fallbackを使用するため、独立balance標本0。event seq、before/after game・continuation SHA、snapshot再計算、canonical bytesを検証。専用2件PASS、設計データerrors空。全proxyは実行中で結果未確定。カード本文・数値・登録区分変更0件。
