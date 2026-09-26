# 252 新seed終了遷移

[252計画](plans/2026-09-26-new-seed-turn-end-replay-252.md)。251の六段階履歴証明を250保存state/hashへ突き合わせ、01-A・01-B・02-Aでターン終了と次プレイヤー開始時の2枚ドローを適用した。3経路は `egg_exchange_choice`、02-Bの `normal_action` は保存state/hashを保持。新event・snapshot各6、対戦完走0、独立balance標本0。

生成データ：[252 JSON](data/proxy-new-seed-turn-end-replay-252-20260926.json)。専用テストとcanonical bytesを確認。次は3経路のたまご交換と02-B通常行動候補の横断監査。全proxy回帰とCI成功は未確認。
