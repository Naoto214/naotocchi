# 327 新seed混合局面の横断監査

[327計画](plans/2026-09-28-new-seed-mixed-audit-327.md)。[326保存state](data/proxy-new-seed-mixed-replay-326-20260928.json)のraw/canonical・event/state/hashを照合し、[監査JSON](data/proxy-new-seed-mixed-audit-327-20260928.json)に4経路の候補と証明を保存した。

01-A・02-Aの開始時responseと01-Bの終了responseは、現手札・盤上・こいびとの本文と状態を照合して各局面で唯一の`response-pass`。02-Bは309の証明から326までのevent/snapshot/hash履歴をつなぎ、C-boxの「能力なし」とP-cliff_goatの発動タイミングを含む既存6段階完全性契約で必須ターン終了を証明した。

新event0、completed0、独立balance標本0。次は3件の唯一passと02-Bの証明済み必須終了を選択する。全proxy回帰・CI成功は未確認。
