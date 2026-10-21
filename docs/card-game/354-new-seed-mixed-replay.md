# 354 新seed混合4経路の効果・pass再生

[354計画](plans/2026-09-29-new-seed-mixed-replay-354.md)。[353選択](353-new-seed-mixed-choice.md)を[351保存state](data/proxy-new-seed-mixed-replay-351-20260929.json)へ適用し、[354保存state](data/proxy-new-seed-mixed-replay-354-20260929.json)に各event/snapshotと前後game/continuation hashを保存した。

01-Aは既存resolverでE-first-dateを解決し、A-012#1を1枚ドロー、そだち+5。A-017#1は交際段階0を維持し、使用カードは捨て札へ移動。01-Bは通常passでターン終了前response入口、02-A/Bは終了前response-passでターン終了入口へ。4経路でdecision/event/snapshot各4、completed0、独立balance標本0。

次は01-A通常行動候補、01-Bターン終了前response候補、02-A/Bの終了履歴を横断監査する。全proxy回帰とCI成功は未確認。
