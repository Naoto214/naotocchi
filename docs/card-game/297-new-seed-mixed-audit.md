# 297 新seedたまご交換・開始時response横断監査

[297計画](plans/2026-09-27-new-seed-mixed-audit-297.md)。296保存state/event/hashのraw/canonicalを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-297-20260927.json)へ4経路の候補・除外証拠を保存した。

01-AのA側R5たまご交換は9候補、01-BのB側R5は8候補。02-A/02-BのB側開始時responseはいずれもresponse-passだけ。02-AのC-cat_friendは交換後の手札個体で、盤上源を要する能力として除外。02-Bの盤上C-cat_friendは捨て札になかま対象がなく、P-cliff_goatの異なるセカイ置換も成立していない。

新event0、completed0、独立balance標本0。次は必須たまご交換2経路と唯一response-pass2件を選択する。全proxy回帰・CI成功は未確認。
