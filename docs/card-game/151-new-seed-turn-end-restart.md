# 151 新seedターン終了と次手番ドローの再開

[151 TDD計画](plans/2026-09-25-new-seed-turn-end-restart-151.md)に従い、150保存JSONをraw SHAと再生成で照合した。149の現在ターン終了盤上出所と150の保存済み全履歴を組み合わせ、123/124の6段階完全性を3経路それぞれの現在stateで再計算。全項目true、stop code空を確認してから、既存124のターン終了および次手番ドロー遷移を実行した。過去の保存済みstate/hashは変更していない。

| 経路 | 開始seq | 新event | 最終seq | 終点 |
|---|---:|---:|---:|---|
| probe-01-a-first | 9 | 2 | 11 | 次手番たまご交換選択 |
| probe-01-b-first | 9 | 2 | 11 | 次手番たまご交換選択 |
| probe-02-b-first | 6 | 2 | 8 | 次手番たまご交換選択 |

各経路で`turn_end_completed`、`turn_start_and_egg_draw`を記録した。ドローは保存済み40枚manifestと現在deck順の先頭2枚を使い、次手番の盤上・予約・誘発が空であることを確認した。新decision0、event/snapshot各6、completed0、独立balance標本0。カード本文・数値・登録区分変更0件。全event seq、game/continuation SHA連鎖、snapshot再計算とcanonical bytesを検査した。専用2件PASS、設計データerrors空。全proxyは実行中で結果未確定。
