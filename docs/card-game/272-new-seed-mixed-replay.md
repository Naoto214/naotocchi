# 272 新seed混合再生

[272計画](plans/2026-09-27-new-seed-mixed-replay-272.md)。[271選択](271-new-seed-mixed-choice.md)を269保存state/hashへ適用。[生成JSON](data/proxy-new-seed-mixed-replay-272-20260927.json)に各経路1件のevent、decision、snapshotと前後game/continuation hashを保存した。

01-A・02-Aは選ばれたカードを山札の下へ置き、開始時response入口。01-Bは通常passでターン終了前response入口。02-BはBの2回目のresponse-passで連鎖が`resolving`となり、Aのラッキーコインは起動域に保持。山札公開と効果は未解決。completed0、独立balance標本0。次は4経路のresponse候補と、02-Bのコイン効果解決入口を横断監査する。全proxy回帰・CI成功は未確認。
