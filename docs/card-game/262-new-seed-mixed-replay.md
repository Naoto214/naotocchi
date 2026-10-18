# 262 新seedターン終了適用

[262計画](plans/2026-09-27-new-seed-mixed-replay-262.md)。261で証明した02-Bの終了履歴を260保存state/hashへ突き合わせ、終了と次プレイヤーの2枚ドローを適用。02-Bは次の `egg_exchange_choice`、01-A・01-B・02-Aの通常行動state/hashは保持した。

生成データ：[262 JSON](data/proxy-new-seed-mixed-replay-262-20260926.json)。新event/snapshot各2、対戦完走0、独立balance標本0。専用テストとcanonical bytes一致を確認。次は3経路の通常選択と02-Bたまご交換を進める。全proxy回帰とCI成功は未確認。
