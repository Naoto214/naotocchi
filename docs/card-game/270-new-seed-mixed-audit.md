# 270 新seed混合局面監査

[270計画](plans/2026-09-27-new-seed-mixed-audit-270.md)。[269保存state](data/proxy-new-seed-mixed-replay-269-20260927.json)のraw/canonicalとevent/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-270-20260927.json)へ4経路の候補を保存。

01-A・02-A：それぞれ手札全枚数の必須たまご交換候補を列挙。01-B：通常行動の合法候補は`candidate-place_world-B-022#1`、`candidate-play-main-B-001#1-birth`、`pass`の3件。02-B：連鎖中のBにとって`response-pass`のみ。手札のビーチバレーは自分のメインがなく、盤上のきまぐれなねこは自分の捨て札になかまがない。P-cliff_goatの異名セカイへの変更は発生せず、起動域のコインはAのカードである。

新event0、completed0、独立balance標本0。次は必須交換2件のseeded選択、通常行動3件の比較、Bの唯一passを選択・適用する。全proxy回帰・CI成功は未確認。
