# 331 新seed混合局面監査の補正

[331計画](plans/2026-09-28-new-seed-mixed-audit-correction-331.md)。[330監査](330-new-seed-mixed-audit.md)は02-AのP-anglerfishを盤上源分類のため投影状態から外した結果、こいびと枠が空いているものとしてP-desert_scorpion配置を合法候補に含めた。元の[329保存state](data/proxy-new-seed-mixed-replay-329-20260928.json)ではP-anglerfishが枠を占有しており、既存配置契約では当該候補は不適法。330のJSON・state/hashは変更せず、[補正JSON](data/proxy-new-seed-mixed-audit-correction-331-20260928.json)に除外理由と残る02-Aの2候補を保存した。

01-Aの4候補、01-Bの必須終了、02-Bのたまご交換10候補は330監査から継承。新event0、completed0、独立balance標本0。次は補正後候補を用いて選択する。全proxy回帰・CI成功は未確認。
