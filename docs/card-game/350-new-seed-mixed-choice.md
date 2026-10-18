# 350 新seed混合4経路の選択

[350計画](plans/2026-09-29-new-seed-mixed-choice-350.md)。[349監査](349-new-seed-mixed-audit.md)と[348保存state](data/proxy-new-seed-mixed-replay-348-20260928.json)のraw・正準JSON・各経路境界hashを再照合した。

01-A/Bは各唯一の`response-pass`。02-Bのメイン誕生1件、02-Aのメイン誕生・アイテム準備2件は、既存229のカード本文・支払い確認を通し、107/114優先比較で支払い後の時がpassより低いため両経路とも`pass`を選択した。選択前保存につき新event0、completed0、独立balance標本0。

次は348保存stateへ4件を適用し、event/snapshot/hashを検証する。01-AのE-first-dateはまだ起動域で未解決。全proxy回帰とCI成功は未確認。
