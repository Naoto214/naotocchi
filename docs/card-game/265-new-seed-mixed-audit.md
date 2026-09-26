# 265 新seed混合response監査

[265計画](plans/2026-09-27-new-seed-mixed-audit-265.md)。264の保存JSONのraw SHA、canonical bytes、4経路のgame/continuation hashを再検査した。01-A・02-Aのターン終了response、01-BのC-cat_friend配置後responseはそれぞれ`response-pass`のみ。C-cat_friendは適正な捨て札のなかまがなく、C-batは配置eventで誘発しない。盤上こいびとの発動条件も本文で照合した。

02-Bの開始responseは`response-pass`と手札の`I-c_coin2`による`response-use-item-A-033#1`の2候補。時1・すぐつかう・山札上公開の本文と山札の存在を確認した。`G-animal-shogi`は捨て札のなかま対象がなく、手札`C-box`の盤上能力は現在の源領域で使用できない。候補集合の完全性を保存した。

[生成JSON](data/proxy-new-seed-mixed-audit-265-20260926.json)。新event0、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用テストとcanonical bytes一致を確認。次は02-Bの時1コインとpassを既存優先順位契約で比較し、残り3経路の一意なpassを適用する。全proxy回帰とCI成功は未確認。
