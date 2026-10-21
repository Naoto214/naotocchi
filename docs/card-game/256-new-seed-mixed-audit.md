# 256 新seedresponse横断監査

[256計画](plans/2026-09-26-new-seed-mixed-audit-256.md)。255保存state/hashと直前盤面を照合し、01-Aの開始時responseは `response-activate-ability-A-015#1` と `response-pass` の2件、01-B・02-Aの開始時responseと02-Bのターン終了responseはそれぞれ `response-pass` のみと確認した。手札のメイン対象・盤上限定能力はカード本文で検証した。

生成データ：[256 JSON](data/proxy-new-seed-mixed-audit-256-20260926.json)。専用テストRED→GREEN、canonical bytes一致。新event0、対戦完走0、独立balance標本0。次に候補の選択を比較しstateへ適用する。全proxy回帰とCI成功は未確認。
