# 266 新seed混合response選択

[266計画](plans/2026-09-27-new-seed-mixed-choice-266.md)。265の完全候補と264の保存state/hashを再検証。01-A・01-B・02-Aは唯一の`response-pass`を選択。02-Bは`response-pass`と時1の手札`I-c_coin2`を比較した。山札公開結果が未確定のため確定そだち差では優劣を付けず、119のresponse専用seeded fallbackを適用すると`response-use-item-A-033#1`を選択した。カードの使用・効果解決はまだ実行していない。

[生成JSON](data/proxy-new-seed-mixed-choice-266-20260926.json)。新event0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用テストとcanonical bytesを検証。次に4経路の選択を264保存stateへ適用し、新局面を横断監査する。seeded fallback使用経路は完走後も独立balance標本へ含めない。全proxy回帰とCI成功は未確認。
