# 215 新seed盤上C-chicken能力解決

[215 TDD計画](plans/2026-09-25-new-seed-ability-resolution-215.md)。214の解決中連鎖から01-Aの盤上C-chicken効果を実行。山札上のカードを公開し、なかまでないため元位置に保持した。盤上の源は残し連鎖を閉じ、通常行動へ進む。他3経路の保存state/hashは保持。解決eventとsnapshotの前後hashを検査した。

新event/snapshot各1、decision0、completed0、独立balance標本0。カード本文・数値・登録区分変更0。専用2件PASS、canonical bytes一致。全proxy回帰とCI成功は未確認。
